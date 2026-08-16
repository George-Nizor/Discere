## 13.12 Fault-finding challenge

A deterministic breadboard or schematic containing one controlled fault. The answer authority stores the fault separately from learner-visible data.

---

# 14. Visual authoring lab

Create a development route for visual authoring.

Features:

- Visual Brief editor
- renderer selection
- live SVG preview
- source-image search results
- attribution editor
- generated-image upload
- label overlay editor
- verification checklist
- model-review response paste/import
- human review controls
- alt-text preview
- responsive preview
- save as content fixture

The lab should clearly separate the original asset from derived annotated versions.

---

# 15. Testing

## 15.1 Schema tests

Every example Visual Brief and renderer spec validates.

## 15.2 Snapshot tests

Use SVG snapshots for stable layouts. Avoid snapshots that break from irrelevant random IDs.

## 15.3 Circuit fixtures

Include known:

- single-resistor circuit
- two resistors in series
- two resistors in parallel
- open switch
- reversed LED representation
- voltmeter placement
- ammeter placement
- wire crossing without junction
- junction connection

## 15.4 Property tests

Where practical:

- parameter inputs remain within bounds
- derived Ohm’s law values remain consistent
- normalised label positions remain between 0 and 1
- identical specs produce identical output

## 15.5 Retrieval tests

Mock external providers. Test missing licence, unavailable original, duplicate asset, changed metadata, and timeout.

## 15.6 Review tests

A visual cannot be marked curated when a must-pass check fails or remains uncertain.

## 15.7 Accessibility tests

- SVG title/description
- focus order
- keyboard alternatives
- sufficient label contrast
- colour-independent resistor information
- screen-reader current-state announcements

---

# 16. Acceptance criteria

- [ ] Every visual has a Visual Brief.
- [ ] The class selection order is implemented.
- [ ] Generated illustration is never the default for exact technical content.
- [ ] Retrieved images retain landing-page and licence records.
- [ ] Curated retrieved images have verified attribution.
- [ ] Circuit diagrams come from structured topology.
- [ ] Exact labels are rendered by the application.
- [ ] Generated images are registered with prompt and file hash.
- [ ] Generated images are marked illustrative.
- [ ] Visual review checks every requirement explicitly.
- [ ] Failed must-pass checks prevent curated publication.
- [ ] Every visual has short alt text.
- [ ] Dense visuals have a long description or data alternative.
- [ ] Interactive visuals have keyboard and text alternatives.
- [ ] All required seed electronics visuals are present and reviewed.
- [ ] The Visual Authoring Lab supports end-to-end inspection.
