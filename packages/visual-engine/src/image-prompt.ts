import type { VisualBrief } from "@discere/contracts";

export function createImageGenerationPrompt(brief: VisualBrief): string {
  const objects = brief.objects.map((item) => `- ${item.name}: ${item.description}`).join("\n");
  const relationships = brief.relationships.map((item) => `- ${item.subjectId} ${item.relation} ${item.objectId}`).join("\n");
  const forbidden = brief.forbiddenElements.map((item) => `- ${item}`).join("\n");
  return [
    `Create one educational illustration for this learning purpose: ${brief.learningPurpose}`,
    "",
    "Required objects:",
    objects,
    "",
    "Spatial and functional relationships:",
    relationships || "- Preserve the relationships stated in the required facts.",
    "",
    "Facts the picture must preserve:",
    ...brief.facts.map((fact) => `- ${fact}`),
    "",
    "Do not include:",
    forbidden || "- Decorative objects that could change the technical meaning.",
    "",
    "Do not draw labels, equations, values, arrows, or legends inside the pixels. The application adds exact text as an overlay.",
    "Use a clear educational composition with enough empty space for those overlays.",
  ].join("\n");
}
