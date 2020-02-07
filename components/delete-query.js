const Helpers = require('./helpers')
const FilteredQuery = require('./filtered-query')

/**
 * DELETE query
 */
class DeleteQuery extends FilteredQuery {

  /**
   * Builds SQL query
   * @param limit
   * @param offset
   * @param order
   * @returns {{sql: string, params: Array}}
   */
  buildRawSQL (limit = null, offset = 0, order = {}) {
    const params = []
    const table_sql = `FROM ${Helpers.tableName(this.table)}`
    const where_sql = this._buildWhereSQL(params)
    const order_sql = this._buildOrderSQL(order)
    const limits_sql = this._buildLimitsSQL(limit, offset)
    let sql = `DELETE ${table_sql} ${where_sql} ${order_sql} ${limits_sql}`
    sql = this.constructor.cleanUpQuery(sql)
    return {sql, params}
  }

  /**
   * Removes records
   * @param options
   * @returns {Promise<number>}
   */
  async remove (options = {}) {
    const query = this.buildRawSQL(
      options.limit || null,
      options.offset || 0,
      options.order || {}
    )
    const res = await this.constructor.runRawSQL(query.sql, query.params)
    return res.affectedRows
  }

}

module.exports = DeleteQuery