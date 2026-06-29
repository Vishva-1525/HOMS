/** Display label for hostel block (stored value is numeric e.g. "1"). */
export function formatBlockLabel(block: string | null | undefined): string {
  const value = block?.trim()
  if (!value) return '—'
  if (/^block\s/i.test(value)) return value
  return `Block ${value}`
}

/** Normalize block input from admin UI to stored assignment value. */
export function normalizeBlockValue(input: string): string {
  return input.trim().replace(/^block\s*/i, '')
}
