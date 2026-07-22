const ROMAN_BLOCK_TO_NUMBER: Record<string, string> = {
  I: '1',
  II: '2',
  III: '3',
  IV: '4',
  V: '5',
  VI: '6',
  VII: '7',
  VIII: '8',
  IX: '9',
}

/** Canonical stored block label, e.g. "BLOCK 1". */
export function normalizeHostelBlock(input: string | null | undefined): string {
  const raw = input?.trim() ?? ''
  if (!raw) return ''

  const upper = raw.toUpperCase()
  const blockRoman = upper.match(/^BLOCK\s+([IVX]+)$/)
  if (blockRoman) {
    const num = ROMAN_BLOCK_TO_NUMBER[blockRoman[1]]
    return num ? `BLOCK ${num}` : upper
  }

  const blockNumeric = upper.match(/^BLOCK\s+(\d+)$/)
  if (blockNumeric) return `BLOCK ${Number(blockNumeric[1])}`

  if (/^[IVX]+$/.test(upper)) {
    const num = ROMAN_BLOCK_TO_NUMBER[upper]
    return num ? `BLOCK ${num}` : upper
  }

  if (/^\d+$/.test(upper)) return `BLOCK ${Number(upper)}`

  return upper
}

/** Display label for hostel block (stored value e.g. "BLOCK 1"). */
export function formatBlockLabel(block: string | null | undefined): string {
  const value = normalizeHostelBlock(block)
  if (!value) return '—'
  const numeric = value.match(/^BLOCK\s+(\d+)$/i)
  if (numeric) return `Block ${numeric[1]}`
  return value
}

/** Normalize block input from admin UI to stored assignment value. */
export function normalizeBlockValue(input: string): string {
  return normalizeHostelBlock(input)
}
