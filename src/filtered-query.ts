import Helpers from './helpers'
import AbstractQuery from './abstract-query'
import QueryClauseGroup from './query-clause-group'
import type { IActiveRecordConstructor, OrderSpec, OrderFieldObject } from './types'

class FilteredQuery extends AbstractQuery {
  whereConditions: QueryClauseGroup

  constructor(table: string, item_class: IActiveRecordConstructor | null = null) {
    super(table, item_class)
    this.whereConditions = new QueryClauseGroup([], false, this.table)
  }

  whereOrNot(field: string, value: unknown): this {
    this.whereConditions.orNot(field, value)
    return this
  }

  whereAndNot(field: string, value: unknown): this {
    this.whereConditions.andNot(field, value)
    return this
  }

  whereOr(field: string, value: unknown): this {
    this.whereConditions.or(field, value)
    return this
  }

  whereAnd(field: string, value: unknown): this {
    this.whereConditions.and(field, value)
    return this
  }

  where(field: string, value: unknown, operator = '=', or = false): this {
    this.whereConditions.exp(field, value, operator, or)
    return this
  }

  whereGroup(callback: (group: QueryClauseGroup) => void, or = false): this {
    this.whereConditions.whereGroup(callback, or)
    return this
  }

  _buildWhereSQL(params: unknown[]): string {
    if (!this.whereConditions.clauses.length) {
      return ''
    }
    return `WHERE ${this.whereConditions.build(params, true)}`
  }

  static _getOrderDirection(value: boolean | string): string {
    if (typeof value === 'boolean') return value ? 'DESC' : 'ASC'
    if (typeof value === 'string' && ['asc', 'desc'].includes(value.toLowerCase())) return value.toLowerCase() === 'desc' ? 'DESC' : 'ASC'
    throw new Error(`Incorrect order value: (${typeof value}) "${value}"`)
  }

  _buildOrderSQL(order: OrderSpec | null | undefined, params: unknown[]): string {
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

  _buildLimitsSQL(limit: number | null, offset: number): string {
    let sql = ''
    if (limit !== null) {
      if (!Number.isInteger(limit)) throw new Error('Limit has to be integer')
      if (limit < 0) throw new Error("Limit can't be negative")
      sql += `LIMIT ${limit}`
    }
    if (offset) {
      if (!Number.isInteger(offset)) throw new Error('Offset has to be integer')
      if (offset < 0) throw new Error("Offset can't be negative")
      sql += ` OFFSET ${offset}`
    }
    return sql.trim()
  }
}

export default FilteredQuery
