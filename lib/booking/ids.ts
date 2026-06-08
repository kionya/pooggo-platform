export function parseHospitalIds(sp: { hospital?: string; hospitals?: string }): string[] {
  const raw: string[] = [];
  if (sp.hospital) raw.push(sp.hospital);
  if (sp.hospitals) raw.push(...sp.hospitals.split(","));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raw) {
    const id = r.trim();
    if (id && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out.slice(0, 3);
}
