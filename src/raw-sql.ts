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
