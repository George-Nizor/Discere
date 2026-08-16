export function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function formatNumber(value: number, maximumFractionDigits = 3): string {
  return new Intl.NumberFormat("en-AU", { maximumFractionDigits, useGrouping: false }).format(value);
}
