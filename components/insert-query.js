const Helpers = require('./helpers')
const AbstractQuery = require('./abstract-query')

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
    let params = []
    const fields_sql = fields ? `(${fields.map(f => Helpers.fieldName(f)).join(', ')})` : ''
    let q_set_sql = []
    for (let values_set of values) {
      params = params.concat(values_set.map(Helpers.prepareValue))
      q_set_sql.push(values_set.map(() => '?').join(', '))
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