/**
 * Raw SQL code
 */
class RawSQL {
  constructor(sql) {
    this._sql = sql
  }

  get SQL () {
    return this._sql
  }
}

module.exports = RawSQL