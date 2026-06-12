interface SupabaseErrorLike {
  message: string
  code?: string
}

export function isNoRowsError(error: SupabaseErrorLike): boolean {
  return (
    error.code === 'PGRST116' ||
    error.message.includes('Cannot coerce the result to a single JSON object') ||
    error.message.includes('JSON object requested, multiple (or no) rows returned')
  )
}

export function formatSupabaseError(error: SupabaseErrorLike, noRowsMessage: string): string {
  if (isNoRowsError(error)) return noRowsMessage
  return error.message
}
