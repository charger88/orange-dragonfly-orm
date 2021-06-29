const Helpers = require('./helpers')
const AbstractQuery = require('./abstract-query')
const QueryClauseGroup = require('./query-clause-group')

/**
 * Abstract class for queries with filters (where, limit, etc.) - SELECT, QUERY, DELETE
 * @abstract
 */
class FilteredQuery extends AbstractQuery {

  whereConditions = null

  /**
   *
   * @param table
   * @param item_class Active Record class which represents table's record
   */
  constructor (table, item_class = null) {
    super(table, item_class)
    this.whereConditions = new QueryClauseGroup([], false, this.table)
  }

  /**
   * Adds "OR (field != ?)" clause into "WHERE" part
   * @param field
   * @param value
   * @return {FilteredQuery}
   */
  whereOrNot (field, value) {
    this.whereConditions.orNot(field, value)
    return this
  }

  /**
   * Adds "AND (field != ?)" clause into "WHERE" part
   * @param field
   * @param value
   * @return {FilteredQuery}
   */
  whereAndNot (field, value) {
    this.whereConditions.andNot(field, value)
    return this
  }

  /**
   * Adds "OR (field = ?)" clause into "WHERE" part
   * @param field
   * @param value
   * @return {FilteredQuery}
   */
  whereOr (field, value) {
    this.whereConditions.or(field, value)
    return this
  }

  /**
   * Adds "AND (field = ?)" clause into "WHERE" part
   * @param field
   * @param value
   * @return {FilteredQuery}
   */
  whereAnd (field, value) {
    this.whereConditions.and(field, value)
    return this
  }

  /**
   * Adds clause (by default AND (field = ?)) into "WHERE" part
   * @param field
   * @param value
   * @param operator
   * @param or
   * @return {FilteredQuery}
   */
  where (field, value, operator = '=', or = false) {
    this.whereConditions.exp(field, value, operator, or, this.table)
    return this
  }

  /**
   * Creates new clause group in "WHERE" part
   * @param callback
   * @param or
   * @return {FilteredQuery}
   */
  whereGroup (callback, or = false) {
    this.whereConditions.whereGroup(callback, or)
    return this
  }

  /**
   * Builds SQL of the "WHERE" part
   * @param params
   * @return {string}
   * @private
   */
  _buildWhereSQL (params) {
    if (!this.whereConditions.clauses.length) {
      return ''
    }
    return `WHERE ${this.whereConditions.build(params, true)}`
  }

  /**
   * Returns order direction
   * @param {boolean|string} value Order direction (true for "DESC", false for "ASC")
   * @return {string}
   * @private
   */
  static _getOrderDirection(value) {
    if (typeof value === 'boolean') return value ? 'DESC' : 'ASC';
    if ((typeof value === 'string') && ['asc', 'desc'].includes(value.toLowerCase())) return value.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    throw new Error(`Incorrect order value: (${typeof value}) "value"`);
  }

  /**
   * Builds SQL of the "WHERE" part
   * @param order Object like {"timestamp": true, "id": false} which means "ORDER BY timestamp DESC, id ASC"
   * @return {string}
   * @private
   */
  _buildOrderSQL (order) {
    if (!order) return ''
    const fields = Object.keys(order)
    if (!fields.length) return ''
    const sql = fields
      .map(f => `${Helpers.fieldName(f, this.table, true)} ${this.constructor._getOrderDirection(order[f])}`)
      .join(', ')
    return `ORDER BY ${sql}`
  }

  /**
   * Builds SQL of the "LIMIT ? OFFSET ?" part
   * @param limit
   * @param offset
   * @return {string}
   * @private
   */
  _buildLimitsSQL (limit, offset) {
    let sql = ''
    if (limit !== null) {
      if (!Number.isInteger(limit)) throw new Error('Limit has to be integer')
      if (limit < 0) throw new Error('Limit can\'t be negative')
      sql += `LIMIT ${limit}`
    }
    if (offset) {
      if (!Number.isInteger(offset)) throw new Error('Offset has to be integer')
      if (offset < 0) throw new Error('Offset can\'t be negative')
      sql += ` OFFSET ${offset}`
    }
    return sql.trim()
  }

}

module.exports = FilteredQuery