# Discere Visual System
## Image Retrieval, Diagram Rendering, Interactive Visuals, Generation, and Review

**Version:** 0.2  
**Status:** Normative  
**Applies to:** lessons, activities, questions, flashcards, feedback, source packs, and learner submissions

---

# 1. Purpose

Discere should usually show the learner what the explanation refers to. The system treats visuals as learning objects with purpose, provenance, and verification rather than decorative media.

A visual may provide:

- physical context
- spatial relationships
- change over time
- comparison
- exact topology
- scale
- an object for inspection
- an interactive model
- an analogy that would otherwise be difficult to picture

Every visual must answer a simple question:

> What will the learner understand, notice, predict, or do because this visual is here?

If the answer is vague, do not add the visual.

---

# 2. Visual classes

```ts
export type VisualClass =
  | "reference_image"
  | "verified_diagram"
  | "interactive_visual"
  | "generated_illustration"
  | "learner_submission";
```

## 2.1 Reference image

A photograph, scan, artwork, map, historical source, scientific image, or other real media retrieved from an attributable source.

Use for:

- real objects and equipment
- artworks and historical material
- locations
- organisms
- experiments
- microscopic or astronomical observations
- examples where texture, wear, arrangement, or real-world appearance matters

## 2.2 Verified diagram

A deterministic visual created from structured data.

Use for:

- circuits
- equations
- graphs
- flowcharts
- architecture diagrams
- timelines
- labelled geometry
- data visualisations
- process diagrams
- simple maps based on known coordinates

## 2.3 Interactive visual

A visual whose parameters or labels can be manipulated.

Use when changing, predicting, comparing, or testing a relationship is central to learning.

## 2.4 Generated illustration

A model-generated raster or vector-style image.

Use for:

- custom conceptual scenes
- analogies
- inaccessible or nonexistent viewpoints
- illustrative reconstructions clearly labelled as such
- combined scenes that cannot reasonably be retrieved

Do not use generated images as evidence that a real event, object, experiment, person, or place looked a certain way.

## 2.5 Learner submission

A photo, screenshot, scan, drawing, or digital-notepad image provided by the learner.

---

# 3. Selection policy

The Visual Director chooses a class in this order.

## 3.1 Interactive first when interaction teaches the relationship

Examples:

- changing resistance and watching current
- moving a point on a function
- changing an angle
- arranging a historical sequence
- tracing execution state

## 3.2 Deterministic when exactness matters

Examples:

- which nodes in a circuit are connected
- how probes are placed
- an equation graph
- a process order
- a software architecture

## 3.3 Reference image when reality matters

Examples:

- what a breadboard looks like
- a real resistor package
- a painting
- an anatomical specimen
- a machine component

## 3.4 Generated illustration when it adds something unavailable

Examples:

- a cutaway conceptual scene of water pressure used as a voltage analogy
- an imagined view inside a wire showing a simplified charge model
- a custom scene matching a learner’s chosen analogy

## 3.5 No visual

Allowed when:

- the task is purely verbal and visualisation would distract
- a suitable visual cannot be used legally or accurately
- the concept beat is a brief reflection or discussion

Store a `noVisualReason` of at least 20 characters for curated content.

---

# 4. Visual Brief

No visual is created, retrieved, or requested without a Visual Brief.

```ts
interface VisualBrief {
  id: string;
  version: 1;
  courseId?: string;
  conceptIds: string[];
  lessonBeatId?: string;
  learningPurpose: string;
  learnerAction: string;
  learnerLevel: string;
  visualClass: VisualClass;
  selectionReason: string;
  factsToShow: FactRequirement[];
  objects: ObjectRequirement[];
  relationships: RelationshipRequirement[];
  labels: LabelRequirement[];
  valuesAndUnits: ValueRequirement[];
  composition: CompositionRequirement;
  interaction?: InteractionRequirement;
  forbiddenElements: string[];
  sourceIds: string[];
  generationStyle?: string;
  verificationChecks: VerificationCheck[];
  altTextDraft: string;
  noVisualReason?: string;
}
```

## 4.1 Fact requirement

```ts
interface FactRequirement {
  id: string;
  statement: string;
  sourceIds: string[];
  importance: "required" | "supporting";
}
```

## 4.2 Object requirement

```ts
interface ObjectRequirement {
  id: string;
  name: string;
  quantity?: number;
  appearance?: string;
  state?: string;
  required: boolean;
}
```

## 4.3 Relationship requirement

```ts
interface RelationshipRequirement {
  subjectId: string;
  relation:
    | "connected_to"
    | "inside"
    | "above"
    | "below"
    | "before"
    | "after"
    | "parallel_with"
    | "series_with"
    | "points_to"
    | "flows_toward"
    | "larger_than"
    | "same_node_as";
  objectId: string;
  required: boolean;
}
```

Extend the relation enum through reviewed code changes. Do not accept arbitrary runtime relation strings in curated content.

## 4.4 Label requirement

```ts
interface LabelRequirement {
  id: string;
  text: string;
  targetObjectId: string;
  placement: "inside" | "above" | "below" | "left" | "right" | "callout";
  exact: boolean;
  renderAsOverlay: boolean;
}
```

Exact labels should normally be rendered by the application as SVG or HTML overlays. Generated-image text is unreliable.

## 4.5 Verification check

```ts
interface VerificationCheck {
  id: string;
  description: string;
  method:
    | "schema"
    | "deterministic"
    | "source_compare"
    | "vision_review"
    | "human_review";
  severity: "must_pass" | "warning";
}
```

---

# 5. Visual Director prompt

Store in `prompts/visual-director.md`.

```text
You are the Visual Director for Discere.

Your job is to choose and specify the visual that will teach the supplied
concept most effectively. The learner should understand, notice, predict, or
do something because the visual exists.

Consider the options in this order:
1. an interactive visual when manipulation teaches the relationship
2. a deterministic diagram when exact structure, values, labels, or topology
   matter
3. a retrieved real image when real appearance or source evidence matters
4. a generated illustration when the required view cannot reasonably be found
   or a custom analogy materially improves the lesson
5. no visual when a visual would add no learning value

Do not choose image generation merely because it is available. Do not use a
generated image as evidence of how a real event, person, object, place,
experiment, or artwork looked.

Produce a structured Visual Brief. State the learning purpose, learner action,
facts, required objects, exact relationships, labels, values, forbidden
elements, sources, composition, alt text, and verification checks.

When exact text is required, mark it for application overlay. When exact
technical content is required, choose a deterministic renderer. Do not invent
objects for visual richness. Do not include decorative equations, circuit
parts, scientific instruments, arrows, labels, or symbols.

Follow the Discere writing contract. Return only the requested
schema. Do not include hidden reasoning.
```

---

# 6. Reference image retrieval

## 6.1 Source adapters

Build adapters behind a common interface.

```ts
interface ImageSearchProvider {
  id: string;
  search(query: ImageSearchQuery): Promise<ImageSearchResult[]>;
  resolve(result: ImageSearchResult): Promise<ResolvedImageRecord>;
}
```

Suggested adapters:

- Wikimedia Commons
- Openverse
- NASA image sources where relevant
- Europeana where relevant
- configured official or institutional domains
- local curated asset library

The default prototype may implement Wikimedia Commons and local assets first. Openverse can follow if its API and licence fields are handled reliably.

## 6.2 Search query construction

The Visual Director produces:

- exact subject terms
- synonyms
- desired viewpoint
- required physical details
- exclusions
- preferred source domains

Do not send the entire learner conversation to an image service.

## 6.3 Search result record

```ts
interface ImageSearchResult {
  providerId: string;
  externalId: string;
  title: string;
  thumbnailUrl: string;
  landingPageUrl: string;
  creator?: string;
  licence?: string;
  sourceDomain: string;
  width?: number;
  height?: number;
  metadataCompleteness: number;
}
```

## 6.4 Resolve before use

A thumbnail result is not sufficient. Resolve the original landing page and metadata before registering the asset.

Store:

- landing page
- creator
- licence identifier and URL where available
- attribution string
- original dimensions
- original asset URL where permitted
- retrieval timestamp
- provider response snapshot or selected metadata

## 6.5 Licence handling

Licence metadata can be wrong or incomplete. The authoring UI must support:

- `verified`
- `unverified`
- `restricted`
- `unknown`

Only `verified` assets may enter the bundled curated course. The prototype should prefer public-domain or permissively licensed material.

Do not redistribute a source file in exports unless its licence permits redistribution. Linking with attribution may still be allowed.

## 6.6 Source comparison

For technical reference images, compare the visible content with the Visual Brief. A retrieved image may be real and still be unsuitable or misleading.

## 6.7 Caching

Cache thumbnails and approved local copies when permitted. Record a content hash. If the remote asset changes, retain the reviewed version or require re-review.

---

# 7. Deterministic diagram system

## 7.1 General rule

The diagram is generated from structured data. The data is the source of truth. The SVG is a rendering.

## 7.2 Renderer interface

```ts
interface VisualRenderer<TSpec> {
  id: string;
  version: string;
  schema: z.ZodType<TSpec>;
  render(spec: TSpec, options: RenderOptions): Promise<RenderedVisual>;
  verify(spec: TSpec, output: RenderedVisual): Promise<CheckResult[]>;
}
```

## 7.3 SVG requirements

- deterministic output for identical input and renderer version
- viewBox set
- semantic groups with IDs
- text remains selectable where practical
- no external scripts
- no event handlers embedded in stored SVG
- accessible title and description
- responsive scaling
- export to PNG for external use
