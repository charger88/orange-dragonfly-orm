import Helpers from './helpers'
import AbstractQuery from './abstract-query'
import QueryClauseGroup from './query-clause-group'
import { OrangeDatabaseInputError } from './errors'
import type { IActiveRecordConstructor, OrderSpec, OrderFieldObject } from './types'

class FilteredQuery extends AbstractQuery {
  whereConditions: QueryClauseGroup

  constructor(table: string, item_class: IActiveRecordConstructor | null = null) {
    super(table, item_class)
    this.whereConditions = new QueryClauseGroup([], false, this.table)
  }

  /**
   * Appends an OR NOT condition: `… OR field != value`.
   * Shorthand for `where(field, value, '!=', true)`.
   */
  whereOrNot(field: string, value: unknown): this {
    this.whereConditions.orNot(field, value)
    return this
  }

  /**
   * Appends an AND NOT condition: `… AND field != value`.
   * Shorthand for `where(field, value, '!=', false)`.
   */
  whereAndNot(field: string, value: unknown): this {
    this.whereConditions.andNot(field, value)
    return this
  }

  /**
   * Appends an OR equality condition: `… OR field = value`.
   * Shorthand for `where(field, value, '=', true)`.
   */
  whereOr(field: string, value: unknown): this {
    this.whereConditions.or(field, value)
    return this
  }

  /**
   * Appends an AND equality condition: `… AND field = value`.
   * Shorthand for `where(field, value, '=', false)`.
   */
  whereAnd(field: string, value: unknown): this {
    this.whereConditions.and(field, value)
    return this
  }

  /**
   * Appends a WHERE condition with explicit operator and AND/OR logic.
   * All the `whereAnd` / `whereOr` / `whereAndNot` / `whereOrNot` methods are
   * convenience wrappers around this one.
   *
   * @param field - Column name (optionally qualified as `table.column`).
   * @param value - Bound parameter value. Arrays produce `IN (…)` / `NOT IN (…)`;
   *   `null` produces `IS NULL` / `IS NOT NULL`; a {@link RawSQL} instance is
   *   injected verbatim (no parameterization).
   * @param operator - SQL comparison operator (default `'='`).
   * @param or - When `true` the clause is joined with `OR`; otherwise `AND`.
   */
  where(field: string, value: unknown, operator = '=', or = false): this {
    this.whereConditions.exp(field, value, operator, or)
    return this
  }

  /**
   * Appends a grouped sub-expression: `… AND (…)` or `… OR (…)`.
   * The `callback` receives a new {@link QueryClauseGroup} to build the inner expression.
   *
   * @param callback - Builder function that receives the inner group.
   * @param or - When `true` the group is joined with `OR`; otherwise `AND`.
   */
  whereGroup(callback: (group: QueryClauseGroup) => void, or = false): this {
    this.whereConditions.whereGroup(callback, or)
    return this
  }

  protected _buildWhereSQL(params: unknown[]): string {
    if (!this.whereConditions.clauses.length) {
      return ''
    }
    return `WHERE ${this.whereConditions.build(params, true)}`
  }

  protected static _getOrderDirection(value: boolean | string): string {
    if (typeof value === 'boolean') return value ? 'DESC' : 'ASC'
    if (typeof value === 'string' && ['asc', 'desc'].includes(value.toLowerCase())) return value.toLowerCase() === 'desc' ? 'DESC' : 'ASC'
    throw new Error(`Incorrect order value: (${typeof value}) "${value}"`)
  }

  protected _buildOrderSQL(order: OrderSpec | null | undefined, params: unknown[]): string {
    if (!order) return ''
    const fields = Object.keys(order)
    if (!fields.length) return ''
    const sql = fields
      .map(f => {
        const orderVal = order[f]
        if (typeof orderVal === 'object') {
          const orderObj = orderVal as OrderFieldObject
          if (!orderObj.column || !orderObj.values) {
            throw new Error('Incorrect order object')
          }
          params.push(...orderObj.values.map(v => Helpers.prepareValue(v)))
          return `FIELD (${Helpers.fieldName(orderObj.column, this.table, true)}, ${orderObj.values.map(() => '?').join(', ')}) ${(this.constructor as typeof FilteredQuery)._getOrderDirection(orderObj.desc as boolean | string)}`
        } else {
          return `${Helpers.fieldName(f, this.table, true)} ${(this.constructor as typeof FilteredQuery)._getOrderDirection(orderVal)}`
        }
      })
      .join(', ')
    return `ORDER BY ${sql}`
  }

  protected _buildLimitsSQL(limit: number | null, offset: number): string {
    let sql = ''
    if (limit !== null) {
      if (!Number.isInteger(limit)) throw new OrangeDatabaseInputError('Limit has to be integer')
      if (limit < 0) throw new OrangeDatabaseInputError("Limit can't be negative")
      sql += `LIMIT ${limit}`
    }
    if (offset) {
      if (limit === null) throw new OrangeDatabaseInputError('Offset requires a limit')
      if (!Number.isInteger(offset)) throw new OrangeDatabaseInputError('Offset has to be integer')
      if (offset < 0) throw new OrangeDatabaseInputError("Offset can't be negative")
      sql += ` OFFSET ${offset}`
    }
    return sql.trim()
  }
}

export default FilteredQuery
