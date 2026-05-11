export const normalizeDisplayNameValue = (value?: string | null): string =>
  typeof value === "string" ? value.trim() : "";

export const resolveDisplayNameValue = (
  ...values: Array<string | null | undefined>
): string | null => {
  for (const value of values) {
    const cleaned = normalizeDisplayNameValue(value);
    if (cleaned) return cleaned;
  }
  return null;
};
