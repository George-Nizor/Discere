import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { setDefaultAutoSelectFamilyAttemptTimeout } from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

// Node abandons a healthy IPv4 connection after 250 ms of happy-eyeballs racing, which is shorter
// than the round trip to Wikimedia from a NAT-ed or WSL network. Give the first family longer.
setDefaultAutoSelectFamilyAttemptTimeout(5000);

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";

// Wikimedia rejects anonymous clients, so identify the tool, the workspace and the purpose.
const USER_AGENT = "Discere/0.1 (local learning workspace; authoring-time image retrieval)";

// Course assets are committed, so keep every file small enough that the repository stays cheap to clone.
const MAX_ASSET_BYTES = 600_000;

// Tried in descending order so we keep the sharpest render that still fits the size budget.
const THUMBNAIL_WIDTHS = [1200, 1000, 800, 640] as const;

const SEARCH_RESULT_LIMIT = 10;

interface ImageRequest {
  readonly id: string;
  readonly title: string;
  readonly purpose: string;
}

/**
 * Reviewed shortlist per course. Titles are pinned rather than searched at run time so that a
 * rebuild fetches the exact files an author already licence-checked by eye.
 */
const COURSE_REQUESTS: Record<string, readonly ImageRequest[]> = {
  "roman-empire": [
    {
      id: "roman-empire-extent-117ce",
      title: "File:Roman Empire Trajan 117AD.png",
      purpose: "Map of the Roman Empire at its greatest extent, around 117 CE",
    },
    {
      id: "colosseum-rome",
      title: "File:Colosseum in Rome, Italy - April 2007.jpg",
      purpose: "Exterior photograph of the Colosseum in Rome",
    },
    {
      id: "via-appia-roman-road",
      title: "File:Appian Way.jpg",
      purpose: "Surviving Roman road: the paved Via Appia outside Rome",
    },
    {
      id: "augustus-of-prima-porta",
      title: "File:Statue-Augustus.jpg",
      purpose: "Portrait statue of Augustus, the Augustus of Prima Porta",
    },
  ],
};

interface ProvenanceRecord {
  readonly id: string;
  readonly fileName: string;
  readonly purpose: string;
  readonly commonsTitle: string;
  readonly landingPageUrl: string;
  readonly assetUrl: string;
  readonly creator: string;
  readonly licenceShortName: string;
  readonly licenceUrl: string;
  readonly attribution: string;
  readonly originalWidth: number;
  readonly originalHeight: number;
  readonly retrievedAt: string;
  readonly sha256: string;
  readonly mimeType: string;
}

interface CommonsImageInfo {
  readonly title: string;
  readonly landingPageUrl: string;
  readonly originalUrl: string;
  readonly originalMime: string;
  readonly originalWidth: number;
  readonly originalHeight: number;
  readonly thumbnailUrl: string | null;
  readonly thumbnailMime: string | null;
  readonly licenceShortName: string;
  readonly licenceMachineId: string;
  readonly licenceUrl: string;
  readonly creator: string;
  readonly objectName: string;
}

interface LicenceDecision {
  readonly accepted: boolean;
  readonly reason: string;
}

// Commons machine-readable licence identifiers we are willing to redistribute inside a course.
const ACCEPTED_LICENCE_IDS: readonly RegExp[] = [
  /^pd(-.+)?$/,
  /^cc-?pd(-.+)?$/,
  /^cc-?zero$/,
  /^cc0(-\d+(\.\d+)?)?$/,
  /^cc-by(-sa)?(-\d+(\.\d+)?)?(-[a-z]{2,3}(-[a-z]+)?)?$/,
];

// Fallback for older file pages that carry only a human-readable licence label.
const ACCEPTED_LICENCE_NAMES: readonly RegExp[] = [
  /^public domain\b/i,
  /^cc0\b/i,
  /^cc[ -]by(-sa)?([ -]\d|$)/i,
];

function toRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

function readNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readRecord(record: Record<string, unknown>, key: string): Record<string, unknown> | null {
  return toRecord(record[key]);
}

function readArray(record: Record<string, unknown>, key: string): readonly unknown[] | null {
  const value = record[key];
  return Array.isArray(value) ? value : null;
}

function isMissingFileError(error: unknown): boolean {
  const record = toRecord(error);
  return record !== null && readString(record, "code") === "ENOENT";
}

/**
 * Commons returns author and credit fields as HTML fragments, but provenance has to stay plain text
 * so it can be rendered in any surface without trusting the markup.
 */
export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#0*39;|&#x0*27;|&apos;/gi, "'")
    .replace(/&quot;|&#0*34;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function evaluateLicence(machineId: string, shortName: string): LicenceDecision {
  const normalisedId = machineId.trim().toLowerCase();
  const normalisedName = shortName.trim();
  if (
    normalisedId.length > 0 &&
    ACCEPTED_LICENCE_IDS.some((pattern) => pattern.test(normalisedId))
  ) {
    return {
      accepted: true,
      reason: `licence identifier "${normalisedId}" is public domain or CC BY/BY-SA`,
    };
  }
  if (
    normalisedId.length === 0 &&
    ACCEPTED_LICENCE_NAMES.some((pattern) => pattern.test(normalisedName))
  ) {
    return {
      accepted: true,
      reason: `licence name "${normalisedName}" is public domain or CC BY/BY-SA`,
    };
  }
  const described = normalisedId.length > 0 ? normalisedId : normalisedName;
  return {
    accepted: false,
    reason: `licence "${described.length > 0 ? described : "unknown"}" is not public domain, CC0, CC BY or CC BY-SA`,
  };
}

async function callCommonsApi(
  parameters: Record<string, string>,
): Promise<Record<string, unknown>> {
  const url = new URL(COMMONS_API);
  url.search = new URLSearchParams({ format: "json", ...parameters }).toString();
  const response = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!response.ok) {
    throw new Error(
      `Commons API responded ${response.status} ${response.statusText} for ${url.href}`,
    );
  }
  const payload: unknown = await response.json();
  const record = toRecord(payload);
  if (record === null)
    throw new Error(`Commons API returned an unexpected payload for ${url.href}`);
  const apiError = readRecord(record, "error");
  if (apiError !== null) {
    throw new Error(`Commons API error: ${readString(apiError, "info") ?? "unknown error"}`);
  }
  return record;
}

/**
 * Commons appends campaign-tracking parameters to the URLs it hands back. Provenance should point at
 * the stable asset address, so drop the query string before downloading or recording it.
 */
function canonicalUrl(url: string): string {
  const parsed = new URL(url);
  parsed.search = "";
  return parsed.href;
}

function readExtMetadata(imageInfo: Record<string, unknown>, key: string): string {
  const extmetadata = readRecord(imageInfo, "extmetadata");
  if (extmetadata === null) return "";
  const entry = readRecord(extmetadata, key);
  if (entry === null) return "";
  return readString(entry, "value") ?? "";
}

async function fetchImageInfo(
  title: string,
  thumbnailWidth: number | null,
): Promise<CommonsImageInfo> {
  const payload = await callCommonsApi({
    action: "query",
    prop: "imageinfo",
    iiprop: "url|extmetadata|size|mime",
    titles: title,
    // Commons renders the thumbnail server-side, which also rasterises SVG maps into PNG for us.
    ...(thumbnailWidth === null ? {} : { iiurlwidth: String(thumbnailWidth) }),
  });
  const query = readRecord(payload, "query");
  const pages = query === null ? null : readRecord(query, "pages");
  if (pages === null) throw new Error(`No page data returned for ${title}`);
  const page = toRecord(Object.values(pages)[0] ?? null);
  if (page === null) throw new Error(`No page data returned for ${title}`);
  if ("missing" in page) throw new Error(`Commons has no file named ${title}`);

  const imageInfoList = readArray(page, "imageinfo");
  const imageInfo = imageInfoList === null ? null : toRecord(imageInfoList[0] ?? null);
  if (imageInfo === null) throw new Error(`No image information returned for ${title}`);

  const originalUrl = readString(imageInfo, "url");
  const landingPageUrl = readString(imageInfo, "descriptionurl");
  if (originalUrl === null || landingPageUrl === null) {
    throw new Error(`Commons omitted the asset or landing page URL for ${title}`);
  }

  const thumbnailUrl = readString(imageInfo, "thumburl");
  return {
    title: readString(page, "title") ?? title,
    landingPageUrl: canonicalUrl(landingPageUrl),
    originalUrl: canonicalUrl(originalUrl),
    originalMime: readString(imageInfo, "mime") ?? "application/octet-stream",
    originalWidth: readNumber(imageInfo, "width") ?? 0,
    originalHeight: readNumber(imageInfo, "height") ?? 0,
    thumbnailUrl: thumbnailUrl === null ? null : canonicalUrl(thumbnailUrl),
    thumbnailMime: readString(imageInfo, "thumbmime"),
    licenceShortName: stripHtml(readExtMetadata(imageInfo, "LicenseShortName")),
    licenceMachineId: stripHtml(readExtMetadata(imageInfo, "License")),
    licenceUrl: stripHtml(readExtMetadata(imageInfo, "LicenseUrl")),
    creator: stripHtml(readExtMetadata(imageInfo, "Artist")),
    objectName: stripHtml(readExtMetadata(imageInfo, "ObjectName")),
  };
}

async function searchCommons(query: string): Promise<readonly string[]> {
  const payload = await callCommonsApi({
    action: "query",
    list: "search",
    srsearch: query,
    srnamespace: "6",
    srlimit: String(SEARCH_RESULT_LIMIT),
  });
  const queryResult = readRecord(payload, "query");
  const results = queryResult === null ? null : readArray(queryResult, "search");
  if (results === null) return [];
  const titles: string[] = [];
  for (const result of results) {
    const record = toRecord(result);
    const title = record === null ? null : readString(record, "title");
    if (title !== null) titles.push(title);
  }
  return titles;
}

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};

function extensionForMime(mimeType: string, fallbackUrl: string): string {
  const known = EXTENSION_BY_MIME[mimeType.toLowerCase()];
  if (known !== undefined) return known;
  const fromUrl = path.extname(new URL(fallbackUrl).pathname).toLowerCase();
  if (fromUrl.length > 1) return fromUrl;
  throw new Error(`Cannot determine a file extension for media type ${mimeType}`);
}

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, index) => bytes[index] === byte);
}

/**
 * Magic-byte check: the API can hand back an error page or a truncated body, and a course must never
 * ship a file that only looks like an image because of its extension.
 */
export function detectImageFormat(bytes: Uint8Array): string | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return "image/gif";
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes.subarray(8), [0x57, 0x45, 0x42, 0x50])
  ) {
    return "image/webp";
  }
  const head = new TextDecoder().decode(bytes.subarray(0, 512)).trimStart();
  if (head.startsWith("<?xml") || head.startsWith("<svg")) return "image/svg+xml";
  return null;
}

async function downloadBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!response.ok) {
    throw new Error(`Download failed with ${response.status} ${response.statusText} for ${url}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function buildAttribution(info: CommonsImageInfo): string {
  const work = info.objectName.length > 0 ? info.objectName : info.title.replace(/^File:/, "");
  const creator = info.creator.length > 0 ? info.creator : "Unknown author";
  const licence = info.licenceShortName.length > 0 ? info.licenceShortName : "see licence page";
  return `"${work}" by ${creator}, ${licence}, via Wikimedia Commons (${info.landingPageUrl})`;
}

interface DownloadedAsset {
  readonly bytes: Uint8Array;
  readonly assetUrl: string;
  readonly mimeType: string;
}

async function downloadWithinBudget(
  request: ImageRequest,
  info: CommonsImageInfo,
): Promise<DownloadedAsset> {
  let current = info;
  let lastAssetUrl = "";
  for (const [index, width] of THUMBNAIL_WIDTHS.entries()) {
    // The caller already fetched the first width, so only re-query when stepping down.
    if (index > 0) current = await fetchImageInfo(request.title, width);
    const assetUrl = current.thumbnailUrl ?? current.originalUrl;
    // Commons snaps thumbnails to standard bucket widths, so neighbouring requests can resolve to
    // the same render; skip re-downloading bytes we have already weighed.
    if (assetUrl === lastAssetUrl) continue;
    lastAssetUrl = assetUrl;
    const mimeType =
      current.thumbnailUrl !== null
        ? (current.thumbnailMime ?? current.originalMime)
        : current.originalMime;
    const bytes = await downloadBytes(assetUrl);
    if (bytes.byteLength <= MAX_ASSET_BYTES) {
      console.log(`    downloaded ${bytes.byteLength} bytes from ${assetUrl}`);
      return { bytes, assetUrl, mimeType };
    }
    console.log(
      `    ${bytes.byteLength} bytes exceeds the ${MAX_ASSET_BYTES} byte budget, requesting a narrower render`,
    );
  }
  throw new Error(
    `Could not fetch ${request.title} under ${MAX_ASSET_BYTES} bytes at any offered width`,
  );
}

async function readProvenance(filePath: string): Promise<readonly ProvenanceRecord[]> {
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) return [];
    throw error;
  }
  const parsed = toRecord(JSON.parse(raw) as unknown);
  const images = parsed === null ? null : readArray(parsed, "images");
  if (images === null) return [];
  const records: ProvenanceRecord[] = [];
  for (const entry of images) {
    const record = toRecord(entry);
    if (record === null) continue;
    const id = readString(record, "id");
    const fileName = readString(record, "fileName");
    const sha256 = readString(record, "sha256");
    if (id === null || fileName === null || sha256 === null) continue;
    records.push(record as unknown as ProvenanceRecord);
  }
  return records;
}

async function fileMatchesHash(filePath: string, sha256: string): Promise<boolean> {
  try {
    const bytes = await readFile(filePath);
    return hashBytes(new Uint8Array(bytes)) === sha256;
  } catch (error) {
    if (isMissingFileError(error)) return false;
    throw error;
  }
}

async function retrieveOne(
  request: ImageRequest,
  assetsDirectory: string,
  existing: ProvenanceRecord | undefined,
): Promise<ProvenanceRecord> {
  console.log(`  ${request.id}: ${request.title}`);

  if (existing !== undefined) {
    const existingPath = path.join(assetsDirectory, existing.fileName);
    if (
      existing.commonsTitle === request.title &&
      (await fileMatchesHash(existingPath, existing.sha256))
    ) {
      console.log(`    already present with a matching hash, skipping download`);
      return existing;
    }
  }

  const info = await fetchImageInfo(request.title, THUMBNAIL_WIDTHS[0]);
  const decision = evaluateLicence(info.licenceMachineId, info.licenceShortName);
  if (!decision.accepted) {
    throw new Error(`Rejected ${request.title}: ${decision.reason}`);
  }
  console.log(`    accepted: ${decision.reason}`);

  const asset = await downloadWithinBudget(request, info);
  const detected = detectImageFormat(asset.bytes);
  if (detected === null) {
    throw new Error(`Downloaded bytes for ${request.title} are not a recognised image format`);
  }
  const fileName = `${request.id}${extensionForMime(detected, asset.assetUrl)}`;
  const filePath = path.join(assetsDirectory, fileName);
  await writeFile(filePath, asset.bytes);
  console.log(`    wrote ${path.relative(process.cwd(), filePath)} (${detected})`);

  return {
    id: request.id,
    fileName,
    purpose: request.purpose,
    commonsTitle: info.title,
    landingPageUrl: info.landingPageUrl,
    assetUrl: asset.assetUrl,
    creator: info.creator.length > 0 ? info.creator : "Unknown author",
    licenceShortName: info.licenceShortName,
    licenceUrl: info.licenceUrl,
    attribution: buildAttribution(info),
    originalWidth: info.originalWidth,
    originalHeight: info.originalHeight,
    retrievedAt: new Date().toISOString().slice(0, 10),
    sha256: hashBytes(asset.bytes),
    mimeType: detected,
  };
}

function slugify(title: string): string {
  return title
    .replace(/^File:/, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function resolveSearchRequest(query: string): Promise<ImageRequest> {
  console.log(`Searching Wikimedia Commons for "${query}"`);
  const titles = await searchCommons(query);
  if (titles.length === 0) throw new Error(`No Commons files matched "${query}"`);
  for (const title of titles) {
    const info = await fetchImageInfo(title, null);
    const decision = evaluateLicence(info.licenceMachineId, info.licenceShortName);
    if (decision.accepted) {
      console.log(`  selected ${title} (${decision.reason})`);
      return { id: slugify(title), title, purpose: `Search result for "${query}"` };
    }
    console.log(`  skipped ${title}: ${decision.reason}`);
  }
  throw new Error(`No acceptably licensed Commons file matched "${query}"`);
}

interface Options {
  readonly courseId: string;
  readonly query: string | null;
}

function parseArguments(argv: readonly string[]): Options {
  const [courseId, ...rest] = argv;
  if (courseId === undefined || courseId.startsWith("-")) {
    throw new Error('Usage: tsx scripts/retrieve-images.ts <courseId> [--query "search terms"]');
  }
  let query: string | null = null;
  for (let index = 0; index < rest.length; index += 1) {
    const flag = rest[index] ?? "";
    if (flag === "--query") {
      const value = rest[index + 1];
      if (value === undefined) throw new Error("--query requires a search string");
      query = value;
      index += 1;
      continue;
    }
    if (flag.startsWith("--query=")) {
      query = flag.slice("--query=".length);
      continue;
    }
    throw new Error(`Unrecognised argument: ${flag}`);
  }
  return { courseId, query };
}

async function main(): Promise<void> {
  const options = parseArguments(process.argv.slice(2));
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const assetsDirectory = path.join(root, "content", options.courseId, "assets");
  const provenancePath = path.join(assetsDirectory, "provenance.json");

  const requests =
    options.query !== null
      ? [await resolveSearchRequest(options.query)]
      : (COURSE_REQUESTS[options.courseId] ?? []);
  if (requests.length === 0) {
    throw new Error(
      `No image requests are configured for course "${options.courseId}"; pass --query to search Commons instead`,
    );
  }

  await mkdir(assetsDirectory, { recursive: true });
  const previous = await readProvenance(provenancePath);
  const byId = new Map(previous.map((record) => [record.id, record]));

  console.log(`Retrieving ${requests.length} image(s) for course "${options.courseId}"`);
  for (const request of requests) {
    byId.set(request.id, await retrieveOne(request, assetsDirectory, byId.get(request.id)));
  }

  const images = [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
  const document = {
    course: options.courseId,
    source: "Wikimedia Commons",
    note: "Every asset is public domain, CC0, CC BY or CC BY-SA; display the attribution string with the image.",
    images,
  };
  await writeFile(provenancePath, `${JSON.stringify(document, null, 2)}\n`);
  console.log(
    `Wrote provenance for ${images.length} image(s) to ${path.relative(process.cwd(), provenancePath)}`,
  );
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
