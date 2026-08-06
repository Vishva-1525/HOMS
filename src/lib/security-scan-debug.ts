/**
 * Temporary stage logging for gate-scan diagnostics.
 * Set ENABLED to false (or delete call sites) after hardware/camera verification.
 */
const ENABLED = true

export function scanDebug(stage: string, detail?: unknown): void {
  if (!ENABLED) return
  if (detail !== undefined) {
    console.info(`[HOMS scan] ${stage}`, detail)
    return
  }
  console.info(`[HOMS scan] ${stage}`)
}
