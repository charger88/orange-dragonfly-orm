const Helpers = require('./helpers')
const FilteredQuery = require('./filtered-query')
const QueryClauseGroup = require('./query-clause-group')
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
   * @param alias
   * @return {SelectQuery}
   */
  joinTable (join_type, table_name, key, foreign_key, operator = '=', alias = null) {
    const table = Helpers.tableName(table_name)
    const a = {'type': 'field', 'value': Helpers.fieldName(key, this.table)}
    const b = {'type': 'field', 'value': Helpers.fieldName(foreign_key, alias || table)}
    const clause = new QueryClauseGroup([new QueryClause(a, b, operator)], false, this.table)
    return this.joinTableCustom(join_type, table_name, clause, alias)
  }

  /**
   * Joins table
   * @param join_type 'INNER', 'LEFT', 'RIGHT', 'FULL'
   * @param table_name
   * @param {QueryClauseGroup} clause
   * @param alias
   * @return {SelectQuery}
   */
  joinTableCustom (join_type, table_name, clause, alias = null) {
    const table = Helpers.tableName(table_name)
    this.joined_tables.push({join_type, table, alias, clause})
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
  _buildJoinSQL (params) {
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
      jt_sql += ` JOIN ${Helpers.tableName(jt.table, true)} `
      if (jt.alias) {
        jt_sql += `${Helpers.tableName(jt.alias, true)} `
      }
      if (jt.clause) {
        jt_sql += `ON ${jt.clause.build(params, true)}`
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
    return `GROUP BY ${this.group_by.map(g => Helpers.fieldName(g, this.table, true)).join(', ')}`
  }

  /**
   * Builds SQL query
   * @param fields
   * @param limit
   * @param offset
   * @param order
   * @param distinct
   * @return {{sql: string, params: Array}}
   */
  buildRawSQL (fields = '*', limit = null, offset = 0, order = {}, distinct = false) {
    Helpers.tableName(this.table)
    const params = []
    let select_sql = Array.isArray(fields)
      ? fields.map(f => Helpers.fieldName(f, this.table, false, true)).join(', ')
      : '*'
    if (distinct) {
      select_sql = `DISTINCT ${select_sql}`
    }
    const table_sql = `FROM ${Helpers.tableName(this.table, true)}`
    const joins_sql = this._buildJoinSQL(params)
    const where_sql = this._buildWhereSQL(params)
    const group_sql = this._buildGroupSQL()
    const order_sql = this._buildOrderSQL(order, params)
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
      !!options.distinct
    )
    const res = await this.constructor.runRawSQL(query.sql, query.params)
    const return_objects = this.item_class && ((fields === '*') || (Array.isArray(fields) && (fields.length === 1) && (fields[0] === `${this.table}.*`)));
    return return_objects ? res.map(record => new this.item_class(record)) : res
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
  async total (id_key = null) {
    const res = await this.select({
      'fields': [{
        'function': 'COUNT',
        'arguments': [id_key ? id_key : (this.item_class ? this.item_class.id_key : 'id')],
        'as': 'total',
      }]
    })
    return res[0]['total']
  }

  /**
   * Returns if any records exist for the defined clauses
   * @return {Promise<boolean>}
   */
  async exists (id_key = null) {
    const res = await this.select({
      'fields': [id_key ? id_key : (this.item_class ? this.item_class.id_key : 'id')],
      'limit': 1
    })
    return !!res.length
  }

}

module.exports = SelectQuery