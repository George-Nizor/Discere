## 7.4 Circuit renderer

### Scope

The prototype supports safe introductory DC circuits:

- cell or battery source
- resistor
- LED
- switch
- lamp
- potentiometer at a conceptual level
- ammeter
- voltmeter
- wire
- junction
- ground reference where useful

### Circuit specification

```ts
interface CircuitSpec {
  id: string;
  nodes: CircuitNode[];
  components: CircuitComponent[];
  measurements: MeasurementMarker[];
  layoutHints: CircuitLayoutHint[];
  showConventionalCurrent?: boolean;
  showElectronDirection?: boolean;
  valuesVisible: boolean;
  title?: string;
}
```

### Validation

- all component terminal references exist
- no duplicate component IDs
- supported terminal counts
- no impossible meter placement in verified examples
- source voltage and component values use supported units
- topology classification agrees with declared series or parallel relationships
- LED polarity markers are consistent
- current arrows form a plausible closed-path representation when shown

### Layout

Use orthogonal wires and clear junction dots. Crossing wires without a junction must be visually distinct. Keep labels outside components when possible.

### Simulation

For supported resistor-only DC networks, calculate node or branch values with a deterministic solver. A full SPICE dependency is optional for the prototype. The source data and expected results must be test fixtures.

Do not simulate unsupported components and imply accuracy. Mark conceptual components accordingly.

## 7.5 Breadboard renderer

Represent:

- terminal strips
- row connectivity
- power rails
- centre gap
- selected jumper wires and components

The renderer must visually distinguish connected holes and disconnected groups. The first course includes a connectivity-highlight interaction.

## 7.6 Graph renderer

Supports:

- x/y axes
- units
- line and scatter plots
- interactive point or parameter changes
- accessible data table
- range validation

Never truncate an axis in a way that misleads without showing the break clearly.

## 7.7 Equation renderer

Use KaTeX. Keep source LaTeX or expression text. Provide spoken alt text for common expressions.

## 7.8 Flowchart and argument map

Use structured nodes and edges. Mermaid may be used for static authoring previews, but the learner-facing renderer should support accessible node text and interaction without unsafe arbitrary directives.

## 7.9 Timeline

Use exact dates or ranges. Uncertain dates must display uncertainty. Prevent automatic spacing from implying equal time intervals when they are not equal.

---

# 8. Interactive visual system

## 8.1 State model

Interactive visuals separate:

- immutable authored spec
- learner-controlled parameters
- derived values
- interaction history
- submission state

## 8.2 Parameter explorer

```ts
interface ParameterDefinition {
  id: string;
  label: string;
  unit?: string;
  min: number;
  max: number;
  step: number;
  initial: number;
  learnerEditable: boolean;
}
```

Derived values are calculated by reviewed functions, never by evaluating model-generated expressions directly.

## 8.3 Meaningful interactions

Record actions that indicate engagement, such as:

- changed a parameter across a threshold
- inspected a target
- made a prediction
- placed a probe
- corrected a label

Do not award XP for raw click count or slider movement count.

## 8.4 Prediction before reveal

Where useful, ask the learner to predict before animating the result. The learner can skip prediction in accessibility or Direct mode.

## 8.5 Accessibility

Every interaction must have a keyboard and text alternative. A slider visual includes a numeric input. A drag-label task includes a select-based fallback.

---

# 9. Generated image system

## 9.1 Role

Generated images are complementary. They are useful for custom scenes and conceptual illustrations. They are weaker for exact text, topology, numeric values, and evidence.

## 9.2 Generation request

The application converts a validated Visual Brief into a generation request. The request should be concise enough to follow and explicit enough to review.

```ts
interface ImageGenerationRequest {
  visualBriefId: string;
  learningPurpose: string;
  scene: string;
  requiredObjects: string[];
  requiredRelationships: string[];
  forbiddenElements: string[];
  composition: string;
  style: string;
  embeddedTextPolicy: "none" | "noncritical_only";
  postOverlayLabels: string[];
  aspectRatio: "1:1" | "4:3" | "16:9" | "portrait";
  verificationChecks: string[];
}
```

## 9.3 Image generation system prompt

Store in the host adapter or `prompts/image-generation.md`.

```text
Create one educational illustration from the approved Discere
Visual Brief.

The image has one learning purpose. Include every required object and preserve
the specified relationships. Do not add decorative scientific, technical,
historical, or symbolic elements. Do not add labels, equations, measurements,
legends, watermarks, interface panels, titles, or explanatory text unless the
brief explicitly allows noncritical text. Exact labels will be applied by the
application after generation.

Treat the scene as an illustration. Do not make it appear to be documentary
photography or source evidence when the subject is reconstructed, imagined,
microscopic, historical, or otherwise unavailable.

Use a clear composition with the teaching subject easy to inspect. Avoid
cinematic lighting, dramatic depth of field, poster composition, excessive
background detail, glowing effects, and generic futuristic styling unless the
lesson specifically requires them.

Do not invent components or connections for visual interest. Where scale is
not defined, avoid cues that claim exact scale. Follow all forbidden-element
rules.

The output will be reviewed against the Visual Brief. Generate only the image.
```

## 9.4 Style direction

Default educational illustration style:

- clean editorial illustration
- realistic enough to recognise objects
- simplified enough to inspect relationships
- neutral lighting
- uncluttered background
- high contrast between teaching elements
- no “AI glow”
- no fake holographic overlays

The style may change for art, history, or subject-specific requirements. The factual brief remains authoritative.

## 9.5 Label overlay

After image registration:

1. display image in an overlay editor
2. place exact labels, arrows, or callouts as HTML/SVG
3. store positions as normalised coordinates
4. allow responsive repositioning rules
5. include labels in accessible description

Do not burn exact labels permanently into the original raster unless exporting a derived copy.

## 9.6 Generation records

Store:

- provider/host used
- request text
- Visual Brief version
- generation date
- original file hash
- transformations
- review result
- reviewer

Do not store or claim a model name when the host does not expose it reliably.

---

# 10. Visual review

## 10.1 Review prompt

Store in `prompts/visual-reviewer.md`.

```text
Review the supplied visual against the Discere Visual Brief.

For each verification check, report:
- pass, fail, or uncertain
- the visible evidence
- the location in the image or diagram
- any contradiction, omission, unreadable detail, or invented element

Check required objects, counts, states, connections, spatial relationships,
directions, values, units, and forbidden elements. Treat generated text inside
an image as unreliable and transcribe it exactly before judging it.

Do not infer an invisible connection or object. Do not excuse an error because
the image is attractive. Mark uncertainty when resolution or viewpoint is
insufficient.

Return only the requested review schema. Do not include hidden reasoning.
```

## 10.2 Review schema

```ts
interface VisualReview {
  id: string;
  visualId: string;
  visualBriefVersion: number;
  reviewerType: "deterministic" | "model" | "human";
  checks: Array<{
    checkId: string;
    result: "pass" | "fail" | "uncertain";
    evidence: string;
    region?: NormalisedRegion;
  }>;
  extraElements: string[];
  missingElements: string[];
  unreadableText: string[];
  overall: "pass" | "revise" | "reject";
  confidence: number;
  notes?: string;
}
```

## 10.3 Publish rule

A generated illustration can enter curated content only when:

- every must-pass check passes
- no forbidden element is present
- required labels are added as overlays
- alt text is reviewed
- a human approves the final asset

Source-backed generated courses may use automatically reviewed illustrations with a visible `Illustrative` label.

## 10.4 Diagram review

Deterministic diagrams receive automated checks. A human still reviews legibility and instructional usefulness before bundling.

---

# 11. Learner-facing status and provenance

The visual toolbar should remain quiet. Use a small source/status control.

Possible labels:

- `Verified diagram`
- `Interactive model`
- `Source image`
- `Illustrative image`
- `Your submission`

Opening the control shows:

- what the visual is intended to show
- source and attribution
- whether it is generated
- review status
- limitations
- download/export options where allowed

Avoid long disclaimers on the main lesson stage.

---

# 12. Alt text and descriptions

## 12.1 Short alt text

Describe the teaching content, not every decorative pixel. Include key relationships and values.

Example:

> Series circuit with a 9 V battery and two 100 Ω resistors connected in one loop. An ammeter is placed in the loop after the battery.

## 12.2 Long description

Provide a collapsible structured description for dense diagrams. Use ordered relationships and data tables where relevant.

## 12.3 Interactive alternatives

Every interactive visual needs:

- textual current state
- keyboard controls
- numeric input alternative
- accessible result announcement
- nonvisual question path

---

# 13. Seed electronics visual specifications

## 13.1 Charge-flow interactive

Purpose: distinguish a complete path from an open path and show that current occurs throughout a simple series loop.

Requirements:

- battery, switch, resistor/lamp, closed wire loop
- toggle switch
- conventional-current markers appear only when closed
- markers move uniformly around the loop for conceptual illustration
- visible note that markers are a simplified model, not literal spacing of electrons

## 13.2 Circuit symbols sheet

Deterministic SVG with one component per row and exact labels applied by the renderer. No generated imagery.

## 13.3 Series circuit

- one battery
- two resistors
- one loop
- junction count checked
- optional voltage labels
- no parallel branch

## 13.4 Parallel circuit

- one source
- two branches
- one resistor per branch
- clear junction dots
- branch paths visually distinct

## 13.5 Ohm’s law explorer

- voltage and resistance controls
- current calculated exactly
- graph optional after first interaction
- learner predicts before changing a value in Coach mode

## 13.6 Resistor colour bands

Use deterministic band positions and colour values. Include a colour-vision-friendly text table. Do not rely on colour alone.

## 13.7 Breadboard diagram

Show internal connectivity on demand. A learner can click a hole and see all electrically connected holes.

## 13.8 Breadboard photograph

Retrieved, attributable, high-resolution top-down or slight-angle image with rows visible. Use overlay callouts for rails, terminal strips, and centre gap.

## 13.9 Voltmeter placement

Show probes across the component. Verify that the meter is not inserted in series.

## 13.10 Ammeter placement

Show the circuit opened and the meter inserted in series. Include a safety note in adjacent prose, not embedded into the diagram.

## 13.11 LED polarity

Show anode, cathode, flat edge, and schematic symbol. State that physical package cues can vary and the datasheet is authoritative.
