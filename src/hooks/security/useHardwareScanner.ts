/**
 * @deprecated Prefer HardwareScannerCapture — kept only so older imports do not break.
 * Hardware scanning now uses a focused React input (see HardwareScannerCapture).
 */
export function useHardwareScanner(_options: {
  enabled: boolean
  onScan: (raw: string) => void
}) {
  // no-op: SecurityScanPage uses HardwareScannerCapture instead
}
