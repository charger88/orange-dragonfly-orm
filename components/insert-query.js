const Helpers = require('./helpers')
const AbstractQuery = require('./abstract-query')
const RawSQL = require('./raw-sql')

/**
 * INSERT query
 */
class InsertQuery extends AbstractQuery {

  /**
   * Builds SQL query
   * @param fields
   * @param values
   * @returns {{sql: string, params: Array}}
   */
  buildRawSQL (fields, values) {
    Helpers.tableName(this.table)
    const params = []
    const fields_sql = fields ? `(${fields.map(f => Helpers.fieldName(f)).join(', ')})` : ''
    const q_set_sql = []
    for (let values_set of values) {
      const q_set_sql_one = []
      for (const value of values_set) {
        if (value instanceof RawSQL) {
          q_set_sql_one.push(value.SQL)
        } else {
          q_set_sql_one.push('?')
          params.push(Helpers.prepareValue(value))
        }
      }
      q_set_sql.push(q_set_sql_one.join(', '))
    }
    let sql = `INSERT INTO ${Helpers.tableName(this.table)} ${fields_sql} VALUES (${q_set_sql.join('), (')})`
    sql = this.constructor.cleanUpQuery(sql)
    return {sql, params}
  }

  /**
   * Inserts one record
   * @param data
   * @returns {Promise<number>}
   */
  async insertOne (data) {
    const query = this.buildRawSQL(Object.keys(data), [Object.values(data)])
    const res = await this.constructor.runRawSQL(query.sql, query.params)
    return res.insertId
  }

  /**
   * Inserts multiple records
   * @param fields
   * @param values
   * @returns {Promise<number>}
   */
  async insertSet (fields, values) {
    const query = this.buildRawSQL(fields, values, true)
    const res = await this.constructor.runRawSQL(query.sql, query.params)
    return res.insertId
  }

}

module.exports = InsertQuery