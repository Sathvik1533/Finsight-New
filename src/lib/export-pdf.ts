/**
 * PDF Export — CA-ready GST expense report
 * Runs entirely in the browser via jsPDF (no server required).
 */

import jsPDF from 'jspdf'

interface Transaction {
  id: string
  merchant: string
  category: string
  amount: number
  date: string
  gst_head?: string | null
  gst_rate?: string | null
  itc_eligible?: boolean
}

interface ExportOptions {
  transactions: Transaction[]
  totalSpend: string
  topCategory: string
  days: number
  userName?: string
}

const INR = (n: number) =>
  `Rs. ${n.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`

export function exportExpenseReport(opts: ExportOptions): void {
  const { transactions, totalSpend, topCategory, days, userName } = opts
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const W = 210
  const MARGIN = 16
  const COL = W - MARGIN * 2
  let y = MARGIN

  // ── Brand bar ────────────────────────────────────────────────────────────────
  doc.setFillColor(240, 180, 41)          // #f0b429
  doc.rect(0, 0, W, 18, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(7, 13, 18)            // #070d12
  doc.text('FinSight', MARGIN, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('AI-Powered Expense Intelligence', MARGIN + 26, 12)

  y = 26

  // ── Report heading ────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(10, 10, 10)
  doc.text(`GST Expense Report — Last ${days} Days`, MARGIN, y)
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  const generated = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  doc.text(`Generated: ${generated}${userName ? `  •  Prepared for: ${userName}` : ''}`, MARGIN, y)
  y += 10

  // ── Summary box ───────────────────────────────────────────────────────────────
  doc.setFillColor(245, 250, 248)
  doc.roundedRect(MARGIN, y, COL, 22, 3, 3, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(30, 30, 30)

  const itcTotal = transactions
    .filter((t) => t.itc_eligible)
    .reduce((s, t) => s + t.amount, 0)

  const summaryItems = [
    { label: 'Total Spend', value: totalSpend },
    { label: 'Transactions', value: transactions.length.toString() },
    { label: 'Top Category', value: topCategory },
    { label: 'ITC Eligible', value: INR(itcTotal) },
  ]
  const colW = COL / summaryItems.length
  summaryItems.forEach(({ label, value }, i) => {
    const x = MARGIN + i * colW + 4
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(120, 120, 120)
    doc.text(label.toUpperCase(), x, y + 7)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(0, 140, 110)
    doc.text(value, x, y + 14)
  })
  y += 28

  // ── GST Category Breakdown ────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(30, 30, 30)
  doc.text('GST Category Breakdown', MARGIN, y)
  y += 5

  const gstGroups: Record<string, { total: number; rate: string; itc: boolean }> = {}
  transactions.forEach((t) => {
    const head = t.gst_head ?? 'Miscellaneous'
    if (!gstGroups[head]) {
      gstGroups[head] = { total: 0, rate: t.gst_rate ?? '—', itc: t.itc_eligible ?? false }
    }
    gstGroups[head].total += t.amount
  })

  // Table header
  doc.setFillColor(230, 248, 244)
  doc.rect(MARGIN, y, COL, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(0, 100, 80)
  doc.text('GST Head',       MARGIN + 2, y + 5)
  doc.text('GST Rate',       MARGIN + 80, y + 5)
  doc.text('ITC',            MARGIN + 110, y + 5)
  doc.text('Amount',         MARGIN + 140, y + 5)
  y += 9

  Object.entries(gstGroups).forEach(([head, { total, rate, itc }], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(252, 252, 252)
      doc.rect(MARGIN, y - 2, COL, 7, 'F')
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(40, 40, 40)
    doc.text(head,             MARGIN + 2, y + 3)
    doc.text(rate,             MARGIN + 80, y + 3)
    doc.setTextColor(itc ? 0 : 180, itc ? 140 : 60, itc ? 110 : 60)
    doc.text(itc ? 'Yes' : 'No', MARGIN + 110, y + 3)
    doc.setTextColor(40, 40, 40)
    doc.text(INR(total),       MARGIN + 140, y + 3)
    y += 7
  })
  y += 6

  // ── Transaction Detail ────────────────────────────────────────────────────────
  if (y > 240) { doc.addPage(); y = MARGIN }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(30, 30, 30)
  doc.text('Transaction Detail', MARGIN, y)
  y += 5

  // Header row
  doc.setFillColor(230, 248, 244)
  doc.rect(MARGIN, y, COL, 7, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(0, 100, 80)
  doc.text('Date',      MARGIN + 2,   y + 5)
  doc.text('Merchant',  MARGIN + 28,  y + 5)
  doc.text('Category',  MARGIN + 80,  y + 5)
  doc.text('GST Head',  MARGIN + 120, y + 5)
  doc.text('Amount',    MARGIN + 162, y + 5)
  y += 9

  transactions.forEach((t, i) => {
    if (y > 272) { doc.addPage(); y = MARGIN }
    if (i % 2 === 0) {
      doc.setFillColor(252, 252, 252)
      doc.rect(MARGIN, y - 2, COL, 7, 'F')
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(60, 60, 60)
    doc.text(t.date,                         MARGIN + 2,   y + 3)
    doc.text(t.merchant.slice(0, 22),        MARGIN + 28,  y + 3)
    doc.text(t.category.slice(0, 20),        MARGIN + 80,  y + 3)
    doc.text((t.gst_head ?? '—').slice(0, 18), MARGIN + 120, y + 3)
    doc.text(INR(t.amount),                  MARGIN + 162, y + 3)
    y += 7
  })

  // ── Footer ────────────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(160, 160, 160)
    doc.text(
      `FinSight AI  •  Generated ${generated}  •  Page ${p} of ${pageCount}`,
      MARGIN,
      295
    )
    doc.text('This report is auto-generated. Verify with a CA for official GST filing.', MARGIN, 299)
  }

  const filename = `finsight-expense-report-${days}d-${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}
