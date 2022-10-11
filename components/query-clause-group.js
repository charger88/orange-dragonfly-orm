const Helpers = require('./helpers')
const QueryClause = require('./query-clause')

/**
 * Group of clauses (wrapped with brackets)
 */
class QueryClauseGroup {

  clauses = []
  or_logic = false
  table = null

  /**
   * @param clauses
   * @param or
   * @param table
   */
  constructor (clauses, or, table) {
    this.clauses = clauses
    this.or_logic = !!or
    this.table = Helpers.tableName(table)
  }

  /**
   * Adds "AND (field = ?)" clause
   * @param field
   * @param value
   * @param operator
   * @return {*}
   */
  and (field, value, operator = '=') {
    return this.exp(field, value, operator, false)
  }

  /**
   * Adds "AND (field != ?)" clause
   * @param field
   * @param value
   * @return {*}
   */
  andNot (field, value) {
    return this.exp(field, value, '!=', false)
  }

  /**
   * Adds "OR (field = ?)" clause
   * @param field
   * @param value
   * @param operator
   * @return {*}
   */
  or (field, value, operator = '=') {
    return this.exp(field, value, operator, true)
  }

  /**
   * Adds "OR (field != ?)" clause
   * @param field
   * @param value
   * @return {*}
   */
  orNot (field, value) {
    return this.exp(field, value, '!=', true)
  }

  /**
   * Adds clause
   * @param field
   * @param value
   * @param operator
   * @param or
   * @return {QueryClauseGroup}
   */
  exp (field, value, operator='=', or=false) {
    const a = {'type': 'field', 'value': field}
    const b = {'type': 'value', 'value': value}
    this._add(new QueryClause(a, b, operator, or, this.table))
    return this
  }

  /**
   * Creates new clause group
   * @param callback Like (cg => { cg.or(...).or(...) })
   * @param or
   * @return {QueryClauseGroup}
   */
  whereGroup (callback, or=false) {
    const whereGroup = new this.constructor([], or, this.table)
    callback.call(this, whereGroup)
    this._add(whereGroup)
    return this
  }

  /**
   * @param clause
   * @return {QueryClause}
   * @private
   */
  _add (clause) {
    this.clauses.push(clause)
    return this
  }

  /**
   * @param clause
   * @return {QueryClause}
   * @private
   */
  addClause (clause) {
    return this._add(clause)
  }

  /**
   * Builds SQL of the clause group
   * @param params
   * @param no_brackets
   * @return {string}
   */
  build (params, no_brackets) {
    let sql = ''
    if (!this.clauses.length) {
      return ''
    }
    for (let c of this.clauses) {
      if (sql.length) {
        sql += ` ${c.or_logic ? 'OR' : 'AND'} `
      }
      sql += c.build(params)
    }
    return no_brackets ? sql : `(${sql})`
  }

}

module.exports = QueryClauseGroup