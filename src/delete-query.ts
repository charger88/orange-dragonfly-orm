import Helpers from './helpers'
import FilteredQuery from './filtered-query'
import type { IActiveRecordConstructor, OrderSpec, DeleteOptions } from './types'

class DeleteQuery extends FilteredQuery {
  constructor(table: string, item_class: IActiveRecordConstructor | null = null) {
    super(table, item_class)
  }

  buildRawSQL(limit: number | null = null, offset = 0, order: OrderSpec = {}): { sql: string; params: unknown[] } {
    const params: unknown[] = []
    const table_sql = `FROM ${Helpers.tableName(this.table, true)}`
    const where_sql = this._buildWhereSQL(params)
    const order_sql = this._buildOrderSQL(order, params)
    const limits_sql = this._buildLimitsSQL(limit, offset)
    let sql = `DELETE ${table_sql} ${where_sql} ${order_sql} ${limits_sql}`
    sql = (this.constructor as typeof DeleteQuery).cleanUpQuery(sql)
    return { sql, params }
  }

  async remove(options: DeleteOptions = {}): Promise<number> {
    const query = this.buildRawSQL(
      options.limit || null,
      options.offset || 0,
      options.order || {},
    )
    const res = await (this.constructor as typeof DeleteQuery).runRawSQL(query.sql, query.params) as Record<string, unknown>
    return res.affectedRows as number
  }
}

export default DeleteQuery
