import Helpers from './helpers'
import FilteredQuery from './filtered-query'
import RawSQL from './raw-sql'
import type { IActiveRecordConstructor, OrderSpec, UpdateOptions } from './types'

class UpdateQuery extends FilteredQuery {
  constructor(table: string, item_class: IActiveRecordConstructor | null = null) {
    super(table, item_class)
  }

  _buildUpdateSQL(data: Record<string, unknown>, params: unknown[]): string {
    return Object.keys(data).map(field => {
      if (data[field] instanceof RawSQL) {
        return `${Helpers.fieldName(field, this.table)} = ${(data[field] as RawSQL).SQL}`
      }
      params.push(Helpers.prepareValue(data[field]))
      return `${Helpers.fieldName(field, this.table)} = ?`
    }).join(', ')
  }

  buildRawSQL(data: Record<string, unknown>, limit: number | null = null, offset = 0, order: OrderSpec = {}): { sql: string; params: unknown[] } {
    const params: unknown[] = []
    const table_sql = `${Helpers.tableName(this.table, true)}`
    const update_sql = this._buildUpdateSQL(data, params)
    const where_sql = this._buildWhereSQL(params)
    const order_sql = this._buildOrderSQL(order, params)
    const limits_sql = this._buildLimitsSQL(limit, offset)
    let sql = `UPDATE ${table_sql} SET ${update_sql} ${where_sql} ${order_sql} ${limits_sql}`
    sql = (this.constructor as typeof UpdateQuery).cleanUpQuery(sql)
    return { sql, params }
  }

  async update(data: Record<string, unknown>, options: UpdateOptions = {}): Promise<number> {
    const query = this.buildRawSQL(
      data,
      options.limit || null,
      options.offset || 0,
      options.order || {},
    )
    const res = await (this.constructor as typeof UpdateQuery).runRawSQL(query.sql, query.params) as Record<string, unknown>
    return res.affectedRows as number
  }
}

export default UpdateQuery
