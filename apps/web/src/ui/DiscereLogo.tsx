import full from "../brand/discere.svg?raw";
import medium from "../brand/discere-24.svg?raw";
import small from "../brand/discere-16.svg?raw";

/**
 * The Discere app logo: the open book from the Instrumenta icon library (brand v2), copied in at
 * the size tier that suits the size. Used on the title card and in the top bar; everywhere else
 * Bonehead is the face of the app.
 */
export function DiscereLogo({ size = 96, className }: { size?: number; className?: string }) {
  const markup = size <= 16 ? small : size <= 24 ? medium : full;
  return (
    <span
      className={`discere-logo ${className ?? ""}`}
      style={{ width: size, height: size, display: "inline-grid" }}
      // Copied verbatim from the brand library; no user input.
      // biome-ignore lint/security/noDangerouslySetInnerHtml: fixed brand asset.
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
