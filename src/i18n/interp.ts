// Replaces {placeholders} in a translation template with values.
// Unknown keys render as empty string so a missing variable doesn't print "{x}"
// to the user.
export function interp(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => {
    const v = vars[k];
    return v == null ? "" : String(v);
  });
}
