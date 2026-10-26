/** Human-friendly order number: PREFIX-YYMMDD-XXXX (no ambiguous characters). */
export function makeOrderNumber(prefix: string, date = new Date(), rand: () => number = Math.random) {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  const code = Array.from({ length: 4 }, () => alphabet[Math.floor(rand() * alphabet.length)]).join('')
  const yy = String(date.getFullYear()).slice(2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${prefix}-${yy}${mm}${dd}-${code}`
}
