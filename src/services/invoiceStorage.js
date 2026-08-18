const STORAGE_KEY = 'gst-invoice-app'
const SEQUENCE_KEY = 'gst-invoice-number-sequence'

function safeParse(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export function loadInvoices() {
  if (typeof window === 'undefined') return []
  const saved = window.localStorage.getItem(STORAGE_KEY)
  const parsed = safeParse(saved)
  return Array.isArray(parsed) ? parsed : []
}

export function persistInvoices(invoices) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices))
}

export function getCurrentInvoiceSequence() {
  if (typeof window === 'undefined') return 0
  const stored = Number(window.localStorage.getItem(SEQUENCE_KEY) || 0)
  return Number.isFinite(stored) ? stored : 0
}

export function peekNextInvoiceNumber(invoices = []) {
  if (typeof window === 'undefined') return ''
  const currentSequence = getCurrentInvoiceSequence()
  const highestSequence = invoices
    .map((invoice) => {
      const match = String(invoice.invoiceNumber).match(/(\d+)$/)
      return match ? Number(match[1]) : 0
    })
    .reduce((max, value) => Math.max(max, value), 0)
  const nextSequence = Math.max(currentSequence, highestSequence) + 1
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `INV-${year}${month}-${String(nextSequence).padStart(4, '0')}`
}

export function generateInvoiceNumber(invoices = []) {
  if (typeof window === 'undefined') return ''
  const nextNumber = peekNextInvoiceNumber(invoices)
  const nextSequence = Number(nextNumber.match(/(\d+)$/)?.[1] || 0)
  window.localStorage.setItem(SEQUENCE_KEY, String(nextSequence))
  return nextNumber
}
