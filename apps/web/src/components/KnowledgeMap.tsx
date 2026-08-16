import type { ConceptProgress } from "@discere/contracts";
const titles: Record<string, string> = { "electric-charge": "Charge", "closed-circuit": "Closed path", voltage: "Voltage", current: "Current", resistance: "Resistance", "ohms-law": "Ohm's law" };
export function KnowledgeMap({ progress }: { progress: ConceptProgress[] }) {
  return <aside className="knowledge-map" aria-label="Knowledge map"><p className="eyebrow">Workshop map</p><ol>{progress.map((item, index) => <li key={item.conceptId} className={`concept-node ${item.state}`}><span className="node-index">{index + 1}</span><div><strong>{titles[item.conceptId] ?? item.conceptId}</strong><small>{item.state.replace("_", " ")} · {Math.round(item.mastery * 100)}%</small></div></li>)}</ol></aside>;
}
