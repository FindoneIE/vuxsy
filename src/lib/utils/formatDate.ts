export function formatDate(d: string | Date) {
  const date = new Date(d)
  return date.toISOString()
}
