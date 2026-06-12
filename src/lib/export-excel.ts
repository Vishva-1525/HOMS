const SHEETJS_CDN =
  'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'

interface SheetJS {
  utils: {
    book_new: () => unknown
    aoa_to_sheet: (data: unknown[][]) => Record<string, unknown> & { '!cols'?: { wch: number }[] }
    book_append_sheet: (wb: unknown, ws: unknown, name: string) => void
  }
  writeFile: (wb: unknown, filename: string) => void
}

declare global {
  interface Window {
    XLSX?: SheetJS
  }
}

function loadSheetJS(): Promise<SheetJS> {
  if (window.XLSX) return Promise.resolve(window.XLSX)

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SHEETJS_CDN}"]`)
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.XLSX) resolve(window.XLSX)
        else reject(new Error('SheetJS failed to load'))
      })
      return
    }

    const script = document.createElement('script')
    script.src = SHEETJS_CDN
    script.async = true
    script.onload = () => {
      if (window.XLSX) resolve(window.XLSX)
      else reject(new Error('SheetJS failed to load'))
    }
    script.onerror = () => reject(new Error('Failed to load SheetJS from CDN'))
    document.head.appendChild(script)
  })
}

function autoFitColumns(headers: string[], rows: string[][]): { wch: number }[] {
  return headers.map((header, colIndex) => {
    const maxLen = Math.max(
      header.length,
      ...rows.map((row) => String(row[colIndex] ?? '').length),
    )
    return { wch: Math.min(maxLen + 2, 50) }
  })
}

export async function exportToExcel(
  headers: string[],
  rows: string[][],
  filename: string,
): Promise<void> {
  const XLSX = await loadSheetJS()
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])

  worksheet['!cols'] = autoFitColumns(headers, rows)

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Outpass Report')
  XLSX.writeFile(workbook, filename)
}
