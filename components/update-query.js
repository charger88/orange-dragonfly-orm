const Helpers = require('./helpers')
const FilteredQuery = require('./filtered-query')
const RawSQL = require('./raw-sql')

/**
 * UPDATE query
 */
class UpdateQuery extends FilteredQuery {

  /**
   * Builds list of fields part of the update query
   * @param data
   * @param params
   * @returns {string}
   */
  _buildUpdateSQL (data, params) {
    return Object.keys(data).map(field => {
      if (data[field] instanceof RawSQL) {
        return `${Helpers.fieldName(field, this.table)} = ${data[field].SQL}`
      }
      params.push(Helpers.prepareValue(data[field]))
      return `${Helpers.fieldName(field, this.table)} = ?`
    }).join(', ')
  }

  /**
   * Builds SQL query
   * @param data
   * @param limit
   * @param offset
   * @param order
   * @returns {{sql: string, params: Array}}
   */
  buildRawSQL (data, limit = null, offset = 0, order = {}) {
    const params = []
    const table_sql = `${Helpers.tableName(this.table, true)}`
    const update_sql = this._buildUpdateSQL(data, params)
    const where_sql = this._buildWhereSQL(params)
    const order_sql = this._buildOrderSQL(order, params)
    const limits_sql = this._buildLimitsSQL(limit, offset)
    let sql = `UPDATE ${table_sql} SET ${update_sql} ${where_sql} ${order_sql} ${limits_sql}`
    sql = this.constructor.cleanUpQuery(sql)
    return {sql, params}
  }

  /**
   * Runs update query
   * @param data Optional parameters are: limit, offset, order
   * @param options
   * @returns {Promise<number>}
   */
  async update (data, options = {}) {
    const query = this.buildRawSQL(
      data,
      options.limit || null,
      options.offset || 0,
      options.order || {}
    )
    const res = await this.constructor.runRawSQL(query.sql, query.params)
    return res.affectedRows
  }

}

module.exports = UpdateQuery