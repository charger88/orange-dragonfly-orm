/** Collapses runs of whitespace to single spaces and trims the result. */
export function normalizeSQL(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim()
}
