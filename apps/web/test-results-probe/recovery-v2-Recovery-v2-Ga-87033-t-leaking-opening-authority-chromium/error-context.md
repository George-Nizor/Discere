# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: recovery-v2.spec.ts >> Recovery v2 Gate 2 >> persists and restores the first-half journey without leaking opening authority
- Location: e2e/recovery-v2.spec.ts:305:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForResponse: Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=f2e3]:
  - link "Skip to the main content" [ref=f2e4] [cursor=pointer]:
    - /url: "#stage"
  - navigation "Discere" [ref=f2e5]:
    - link "Discere home" [ref=f2e6] [cursor=pointer]:
      - /url: /
    - list [ref=f2e31]:
      - listitem [ref=f2e32]:
        - link "Home" [ref=f2e33] [cursor=pointer]:
          - /url: /
      - listitem [ref=f2e37]:
        - link "Courses" [ref=f2e38] [cursor=pointer]:
          - /url: /courses
      - listitem [ref=f2e41]:
        - link "Review" [ref=f2e42] [cursor=pointer]:
          - /url: /review
      - listitem [ref=f2e48]:
        - link "Notebook" [ref=f2e49] [cursor=pointer]:
          - /url: /courses/roman-empire/lessons/rise-of-the-roman-empire/notebook
      - listitem [ref=f2e53]:
        - link "Settings" [ref=f2e54] [cursor=pointer]:
          - /url: /settings
  - complementary "Archived course" [ref=f2e58]:
    - paragraph [ref=f2e62]:
      - strong [ref=f2e63]: Archived course.
      - text: It is kept from an earlier version of Discere so your history stays readable, but it is no longer in the library or updated.
    - link "Browse current courses" [ref=f2e64] [cursor=pointer]:
      - /url: /courses
  - generic [ref=f2e66]:
    - generic [ref=f2e67]:
      - generic [ref=f2e68]:
        - link "The Roman Empire" [ref=f2e69] [cursor=pointer]:
          - /url: /courses/roman-empire
        - generic [ref=f2e70]: From Republic to Empire
      - generic [ref=f2e71]:
        - button "Read this screen aloud" [ref=f2e72] [cursor=pointer]
        - button "View sources" [ref=f2e77] [cursor=pointer]
        - button "Open the tutor in the current Roman lesson" [ref=f2e80] [cursor=pointer]
        - progressbar "Lesson progress" [ref=f2e84]:
          - generic [ref=f2e85]: 3 / 8
    - main [ref=f2e88]:
      - generic [ref=f2e89]:
        - generic [ref=f2e90]:
          - heading "How far did Rome spread?" [level=1] [ref=f2e91]
          - paragraph [ref=f2e92]: Move through time, then answer the prompt.
        - strong [ref=f2e93]: 284 CE
        - paragraph [ref=f2e94]: 284 CE. Diocletian took power after the third-century crisis and reorganised imperial rule.
      - figure "117 CE extent Diocletian took power after the third-century crisis and reorganised imperial rule. The 117 CE boundary remains on the map for comparison." [ref=f2e95]:
        - img "The Roman Empire at its greatest extent under Trajan in 117 CE" [ref=f2e96]
        - generic [ref=f2e97]:
          - generic [ref=f2e98]: 117 CE extent
          - text: Diocletian took power after the third-century crisis and reorganised imperial rule. The 117 CE boundary remains on the map for comparison.
      - list "Roman Empire milestones" [ref=f2e99]:
        - listitem [ref=f2e100]:
          - button "27 BCE" [ref=f2e101] [cursor=pointer]
        - listitem [ref=f2e103]:
          - button "117 CE" [ref=f2e104] [cursor=pointer]
        - listitem [ref=f2e106]:
          - button "284 CE" [active] [pressed] [ref=f2e107] [cursor=pointer]
        - listitem [ref=f2e109]:
          - button "476 CE" [ref=f2e110] [cursor=pointer]
      - group [ref=f2e112]:
        - generic "Read the timeline as text" [ref=f2e113] [cursor=pointer]
      - generic [ref=f2e114]:
        - heading "What changed between 27 BCE and 117 CE?" [level=2] [ref=f2e117]
        - button "Answer" [ref=f2e118] [cursor=pointer]
    - generic [ref=f2e119]:
      - link "Back" [ref=f2e120] [cursor=pointer]:
        - /url: /courses/roman-empire/lessons/rise-of-the-roman-empire/reference/augustus
      - list "Lesson progress" [ref=f2e123]:
        - listitem [ref=f2e124]:
          - generic [ref=f2e125]: Step 1
        - listitem [ref=f2e126]:
          - generic [ref=f2e127]: Step 2
        - listitem [ref=f2e128]:
          - generic [ref=f2e129]: Step 3
        - listitem [ref=f2e130]:
          - generic [ref=f2e131]: Step 4
        - listitem [ref=f2e132]:
          - generic [ref=f2e133]: Step 5
        - listitem [ref=f2e134]:
          - generic [ref=f2e135]: Step 6
        - listitem [ref=f2e136]:
          - generic [ref=f2e137]: Step 7
        - listitem [ref=f2e138]:
          - generic [ref=f2e139]: Step 8
  - list
```

# Test source

```ts
  64  |     id: ReferenceQuestionId;
  65  |     draft: unknown;
  66  |     submittedResponse: unknown;
  67  |     status: "editing" | "submitted" | "revealed";
  68  |     result: "correct" | "partly_correct" | "incorrect" | "ungradable" | null;
  69  |     feedback: string | null;
  70  |     mode: "coach" | "assisted" | "direct" | "exam" | null;
  71  |     hints: Array<{ level: number; text: string }>;
  72  |     revealedAnswer: unknown;
  73  |   };
  74  | }
  75  | 
  76  | type EssayEvidenceId =
  77  |   | "augustus-27-bce"
  78  |   | "extent-117-ce"
  79  |   | "third-century-crisis"
  80  |   | "tetrarchy-284-ce"
  81  |   | "constantinople-330-ce"
  82  |   | "western-deposition-476-ce";
  83  | 
  84  | interface ReferenceEssayView {
  85  |   content: {
  86  |     id: "transformation";
  87  |     prompt: string;
  88  |     instruction: string;
  89  |     minWords: number;
  90  |     maxWords: number;
  91  |     rubric: Array<{ id: string; label: string; description: string }>;
  92  |     evidence: Array<{ id: EssayEvidenceId; date: string; title: string; summary: string }>;
  93  |   };
  94  |   progress: {
  95  |     draft: string;
  96  |     claimPlan: string;
  97  |     evidencePlan: EssayEvidenceId[];
  98  |     complicationPlan: string;
  99  |     status: "editing" | "submitted";
  100 |     mode: "coach" | "assisted" | "direct" | "exam" | null;
  101 |     sourcesOpened: boolean;
  102 |     submissions: Array<{
  103 |       revision: number;
  104 |       wordCount: number;
  105 |       summary: string;
  106 |       nextStep: string;
  107 |       dimensions: Array<{
  108 |         id: string;
  109 |         label: string;
  110 |         status: "met" | "developing" | "missing";
  111 |         comment: string;
  112 |         excerpt: string | null;
  113 |       }>;
  114 |       usedEvidenceIds: EssayEvidenceId[];
  115 |     }>;
  116 |     finished: boolean;
  117 |   };
  118 | }
  119 | 
  120 | interface ReferenceProgress {
  121 |   version: 4;
  122 |   activeBeat: "opening" | "augustus" | "expansion" | "questions" | "essay" | "recall" | "complete";
  123 |   activeQuestionId: ReferenceQuestionId | null;
  124 |   assessmentFinished: boolean;
  125 |   updatedAt: string | null;
  126 |   opening: {
  127 |     order: TurningPointId[];
  128 |     submittedOrder: TurningPointId[] | null;
  129 |     status: "editing" | "checked" | "skipped";
  130 |     wasCorrect: boolean | null;
  131 |   };
  132 |   augustus: { completed: boolean };
  133 |   expansion: {
  134 |     milestoneId: "27-bce" | "117-ce" | "284-ce" | "476-ce";
  135 |     answerOpen: boolean;
  136 |     answer: string;
  137 |     saved: boolean;
  138 |     completed: boolean;
  139 |   };
  140 |   questions: ReferenceQuestionView[];
  141 |   essay: ReferenceEssayView;
  142 | }
  143 | 
  144 | async function readProgress(page: Page): Promise<ReferenceProgress> {
  145 |   const response = await page.request.get(PROGRESS_API);
  146 |   expect(response.ok()).toBeTruthy();
  147 |   return (await response.json()) as ReferenceProgress;
  148 | }
  149 | 
  150 | async function requestReferenceAction(
  151 |   page: Page,
  152 |   data: Record<string, unknown>,
  153 | ): Promise<ReferenceProgress> {
  154 |   const response = await page.request.put(PROGRESS_API, { data });
  155 |   expect(response.ok()).toBeTruthy();
  156 |   return (await response.json()) as ReferenceProgress;
  157 | }
  158 | 
  159 | async function performReferenceAction(
  160 |   page: Page,
  161 |   action: string,
  162 |   perform: () => Promise<void>,
  163 | ): Promise<ReferenceProgress> {
> 164 |   const responsePromise = page.waitForResponse((response) => {
      |                                ^ Error: page.waitForResponse: Test timeout of 30000ms exceeded.
  165 |     if (new URL(response.url()).pathname !== PROGRESS_API) return false;
  166 |     if (response.request().method() !== "PUT") return false;
  167 |     try {
  168 |       const body = response.request().postDataJSON() as { action?: unknown };
  169 |       return body.action === action;
  170 |     } catch {
  171 |       return false;
  172 |     }
  173 |   });
  174 |   await perform();
  175 |   const response = await responsePromise;
  176 |   expect(response.ok()).toBeTruthy();
  177 |   return (await response.json()) as ReferenceProgress;
  178 | }
  179 | 
  180 | async function expectOpeningOrder(page: Page, order: readonly TurningPointId[]): Promise<void> {
  181 |   for (const [index, id] of order.entries()) {
  182 |     const point = TURNING_POINTS[id];
  183 |     await expect(
  184 |       page.getByRole("button", {
  185 |         name: `${point.title}, ${point.date}, position ${index + 1} of ${order.length}`,
  186 |       }),
  187 |     ).toBeVisible();
  188 |   }
  189 | }
  190 | 
  191 | function adjacentWrongMove(order: readonly TurningPointId[]): {
  192 |   movedId: TurningPointId;
  193 |   next: TurningPointId[];
  194 | } {
  195 |   const correct = ["augustus", "extent", "division", "deposition"];
  196 |   for (let index = 0; index < order.length - 1; index += 1) {
  197 |     const next = [...order];
  198 |     const left = next[index];
  199 |     const right = next[index + 1];
  200 |     if (!left || !right) continue;
  201 |     next[index] = right;
  202 |     next[index + 1] = left;
  203 |     if (next.join(",") !== correct.join(",")) return { movedId: right, next };
  204 |   }
  205 |   throw new Error("No adjacent wrong-order move was available.");
  206 | }
  207 | 
  208 | async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  209 |   await expect
  210 |     .poll(() =>
  211 |       page.evaluate(
  212 |         () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  213 |       ),
  214 |     )
  215 |     .toBeLessThanOrEqual(1);
  216 | }
  217 | 
  218 | async function expectVisibleLessonImagesLoaded(page: Page): Promise<void> {
  219 |   const visibleImages = page.locator("#stage img:visible");
  220 |   await expect
  221 |     .poll(async () =>
  222 |       visibleImages.evaluateAll((images) =>
  223 |         images
  224 |           .filter((image) => !(image as HTMLImageElement).complete || image.clientWidth === 0)
  225 |           .map(
  226 |             (image) => (image as HTMLImageElement).currentSrc || (image as HTMLImageElement).src,
  227 |           ),
  228 |       ),
  229 |     )
  230 |     .toEqual([]);
  231 |   const brokenImages = await visibleImages.evaluateAll((images) =>
  232 |     images
  233 |       .filter((image) => (image as HTMLImageElement).naturalWidth <= 0)
  234 |       .map((image) => (image as HTMLImageElement).currentSrc || (image as HTMLImageElement).src),
  235 |   );
  236 |   expect(brokenImages).toEqual([]);
  237 | }
  238 | 
  239 | async function expectMinimumTarget(control: Locator, size: number): Promise<void> {
  240 |   const box = await control.boundingBox();
  241 |   expect(box).not.toBeNull();
  242 |   expect(box?.width ?? 0).toBeGreaterThanOrEqual(size);
  243 |   expect(box?.height ?? 0).toBeGreaterThanOrEqual(size);
  244 | }
  245 | 
  246 | async function captureQuestionScreen(
  247 |   page: Page,
  248 |   name: (typeof QUESTION_SCREENS)[number]["name"],
  249 | ): Promise<void> {
  250 |   mkdirSync(OUTPUT, { recursive: true });
  251 |   for (const viewport of VIEWPORTS) {
  252 |     await page.setViewportSize({ width: viewport.width, height: viewport.height });
  253 |     await page.waitForLoadState("networkidle");
  254 |     await page.evaluate(() => window.scrollTo(0, 0));
  255 |     expect(await page.evaluate(() => window.scrollY)).toBe(0);
  256 |     await expect(page.locator("#stage")).toBeVisible();
  257 |     await expectVisibleLessonImagesLoaded(page);
  258 |     await page.screenshot({
  259 |       animations: "disabled",
  260 |       fullPage: false,
  261 |       path: join(OUTPUT, `${name}-${viewport.label}.png`),
  262 |     });
  263 |   }
  264 |   await page.setViewportSize({ width: 1440, height: 900 });
```