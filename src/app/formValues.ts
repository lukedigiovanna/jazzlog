/** Read a trimmed text value; absent fields retain the existing empty-string behavior. */
export function formValue(data: FormData, name: string): string {
  return String(data.get(name) ?? "").trim();
}
