import type { VisualBrief } from "@discere/contracts";

export interface VisualBriefIssue { code: string; message: string; }

export function inspectVisualBrief(brief: VisualBrief): VisualBriefIssue[] {
  const issues: VisualBriefIssue[] = [];
  const objectIds = new Set(brief.objects.map((item) => item.id));
  for (const relation of brief.relationships) {
    if (!objectIds.has(relation.subjectId)) issues.push({ code: "RELATION_SUBJECT_MISSING", message: `Unknown subject '${relation.subjectId}'.` });
    if (!objectIds.has(relation.objectId)) issues.push({ code: "RELATION_OBJECT_MISSING", message: `Unknown object '${relation.objectId}'.` });
  }
  for (const label of brief.labels) {
    if (!objectIds.has(label.targetObjectId)) issues.push({ code: "LABEL_TARGET_MISSING", message: `Unknown label target '${label.targetObjectId}'.` });
    if (label.exact && !label.renderAsOverlay && brief.visualClass === "generated_illustration") {
      issues.push({ code: "GENERATED_EXACT_TEXT", message: `Exact label '${label.text}' should be rendered as an overlay.` });
    }
  }
  if (brief.visualClass === "generated_illustration" && brief.verificationChecks.length === 0) {
    issues.push({ code: "REVIEW_REQUIRED", message: "Generated illustrations require verification checks." });
  }
  if (brief.visualClass !== "learner_submission" && brief.altTextDraft.trim().length < 20) {
    issues.push({ code: "ALT_TEXT_SHORT", message: "Alt text must explain the useful visual content." });
  }
  return issues;
}
