const Helpers = require('./helpers')
const FilteredQuery = require('./filtered-query')
const QueryClause = require('./query-clause')

class SelectQuery extends FilteredQuery {

  joined_tables = []

  group_by = []

  /**
   * Joins table
   * @param join_type 'INNER', 'LEFT', 'RIGHT', 'FULL'
   * @param table_name
   * @param key
   * @param foreign_key
   * @param operator
   * @return {SelectQuery}
   */
  joinTable (join_type, table_name, key, foreign_key, operator = '=') {
    const table = Helpers.tableName(table_name)
    const jt = {join_type, table, 'condition': null}
    const a = {'type': 'field', 'value': Helpers.fieldName(key, this.table)}
    const b = {'type': 'field', 'value': Helpers.fieldName(foreign_key, table)}
    jt.clause = new QueryClause(a, b, operator)
    this.joined_tables.push(jt)
    return this
  }

  /**
   * Adds field for grouping
   * @param field_name
   * @return {SelectQuery}
   */
  groupBy (field_name) {
    this.group_by.push(field_name)
    return this
  }

  /**
   * Builds SQL of the "JOIN" part
   * @return {string}
   * @private
   */
  _buildJoinSQL () {
    if (!this.joined_tables.length) {
      return ''
    }
    return this.joined_tables.map(jt => {
      let jt_sql = ''
      if (jt.join_type) {
        if (['INNER', 'LEFT', 'RIGHT', 'FULL'].includes(jt.join_type.toUpperCase())) {
          jt_sql += jt.join_type.toUpperCase()
        }
      }
      jt_sql += ` JOIN ${Helpers.tableName(jt.table)} `
      if (jt.clause) {
        const p = []
        jt_sql += `ON ${jt.clause.build(p)} `
        if (p.length) throw new Error(`Some issue with JOIN expression occurred: ${JSON.stringify(p)}`)
      }
      return jt_sql
    }).join(' ')
  }

  /**
   * Builds SQL of the "GROUP BY" part
   * @return {string}
   * @private
   */
  _buildGroupSQL () {
    if (!this.group_by.length) return ''
    return `GROUP BY ${this.group_by.map(g => Helpers.fieldName(g, this.table)).join(', ')}`
  }

  /**
   * Builds SQL query
   * @param fields
   * @param limit
   * @param offset
   * @param order
   * @return {{sql: string, params: Array}}
   */
  buildRawSQL (fields = '*', limit = null, offset = 0, order = {}) {
    Helpers.tableName(this.table)
    const params = []
    const select_sql = Array.isArray(fields)
      ? fields.map(f => Helpers.fieldName(f, this.table, false, true)).join(', ')
      : '*'
    const table_sql = `FROM ${Helpers.tableName(this.table)}`
    const joins_sql = this._buildJoinSQL()
    const where_sql = this._buildWhereSQL(params)
    const group_sql = this._buildGroupSQL()
    const order_sql = this._buildOrderSQL(order)
    const limits_sql = this._buildLimitsSQL(limit, offset)
    let sql = `SELECT ${select_sql} ${table_sql} ${joins_sql} ${where_sql} ${group_sql} ${order_sql} ${limits_sql}`
    sql = this.constructor.cleanUpQuery(sql)
    return {sql, params}
  }

  /**
   * Loads data from the table
   * @param options
   * @return {Promise<Array<(ActiveRecord|array)>>}
   */
  async select (options = {}) {
    const fields = options.fields || '*';
    const query = this.buildRawSQL(
      fields,
      options.limit || null,
      options.offset || 0,
      options.order || {},
    )
    const res = await this.constructor.runRawSQL(query.sql, query.params)
    return (fields === '*') && this.item_class ? res.map(record => new this.item_class(record)) : res
  }

  /**
   * Loads one record (or returns NULL)
   * @param options
   * @return {Promise<(ActiveRecord|Array|null)>}
   */
  async selectOne (options = {}) {
    options = Object.assign({}, options)
    options['limit'] = 1
    const res = await this.select(options)
    return res.length === 1 ? res[0] : null
  }

  /**
   * Counts total number of records in DB
   * @return {Promise<number>}
   */
  async total () {
    const res = await this.select({
      'fields': [{
        'function': 'COUNT',
        'arguments': ['id'],
        'as': 'total',
      }]
    })
    return res[0]['total']
  }

}

module.exports = SelectQuery