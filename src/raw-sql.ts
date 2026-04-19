/**
 * Wraps a raw SQL fragment that is injected verbatim into a query with **no
 * sanitization or parameterization**.
 *
 * Use this only for developer-authored SQL expressions (e.g. `UNIX_TIMESTAMP()`,
 * window function fragments). It must **never** be constructed from user-supplied
 * data — doing so opens a SQL injection vulnerability.
 *
 * For runtime values, use the query's parameterized `where*` / `buildRawSQL`
 * methods with `?` placeholders instead.
 */
class RawSQL {
  private _sql: string

  constructor(sql: string) {
    this._sql = sql
  }

  get SQL(): string {
    return this._sql
  }
}

export default RawSQL
