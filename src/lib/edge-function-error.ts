/**
 * supabase-js returns `data: null` for non-2xx edge function responses; the JSON
 * body is only reachable through `error.context` (a fetch Response).
 */
export async function edgeFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  const context = (error as { context?: unknown } | null)?.context
  if (context instanceof Response) {
    try {
      const body = (await context.clone().json()) as { error?: unknown; message?: unknown }
      if (typeof body.error === 'string' && body.error.trim()) return body.error
      if (typeof body.message === 'string' && body.message.trim()) return body.message
    } catch {
      // body was not JSON
    }
  }

  if (error instanceof Error && error.message && !/non-2xx/i.test(error.message)) {
    return error.message
  }
  return fallback
}
