import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  buildFilterSummaryLines,
  buildExportFilename,
  buildReportTitle,
} from '@/utils/report-export/build-meta'
import { formatGeneratedTimestamp } from '@/utils/report-export/formatters'
import {
  REPORT_EXPORT_HEADERS,
  buildExportTableBody,
} from '@/utils/report-export/report-columns'
import type { ReportExportOptions } from '@/utils/report-export/types'

const COLLEGE_NAME = 'Sri Venkateswara College of Engineering'
const BRAND_BLUE: [number, number, number] = [26, 92, 160]

export function exportReportToPdf(options: ReportExportOptions): string {
  const { rows, filters } = options
  const generatedAt = options.generatedAt ?? new Date()
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a3',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 10
  let cursorY = 14

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...BRAND_BLUE)
  doc.text(COLLEGE_NAME, pageWidth / 2, cursorY, { align: 'center' })
  cursorY += 7

  doc.setFontSize(11)
  doc.setTextColor(30, 41, 59)
  doc.text(buildReportTitle(filters), pageWidth / 2, cursorY, { align: 'center' })
  cursorY += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  doc.text(`Generated on: ${formatGeneratedTimestamp(generatedAt)}`, marginX, cursorY)
  cursorY += 5

  for (const line of buildFilterSummaryLines(filters)) {
    doc.text(line, marginX, cursorY)
    cursorY += 4.5
  }

  cursorY += 2

  const tableBody = buildExportTableBody(rows).map((row) =>
    row.map((cell) => String(cell)),
  )

  autoTable(doc, {
    head: [REPORT_EXPORT_HEADERS.map(String)],
    body: tableBody,
    startY: cursorY,
    margin: { left: marginX, right: marginX, top: cursorY, bottom: 16 },
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: BRAND_BLUE,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  })

  const totalPages = doc.getNumberOfPages()
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text(`Page ${page} of ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' })
    doc.text(`Generated on: ${formatGeneratedTimestamp(generatedAt)}`, marginX, pageHeight - 8)
  }

  const filename = buildExportFilename(filters, 'pdf')
  doc.save(filename)
  return filename
}
