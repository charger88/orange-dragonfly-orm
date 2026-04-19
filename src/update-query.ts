import Helpers from './helpers'
import FilteredQuery from './filtered-query'
import RawSQL from './raw-sql'
import { OrangeDatabaseError, OrangeDatabaseUnexpectedResultError } from './errors'
import type { IActiveRecordConstructor, OrderSpec, UpdateOptions } from './types'

class UpdateQuery extends FilteredQuery {
  constructor(table: string, item_class: IActiveRecordConstructor | null = null) {
    super(table, item_class)
  }

  protected _buildUpdateSQL(data: Record<string, unknown>, params: unknown[]): string {
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
    const sql = [
      `UPDATE ${table_sql} SET ${update_sql}`,
      where_sql,
      order_sql,
      limits_sql,
    ].filter(Boolean).join(' ')
    return { sql, params }
  }

  /**
   * Executes the UPDATE and returns the number of affected rows.
   *
   * @returns `affectedRows` from the driver result object.
   * @note The actual shape of the driver result is driver-defined; this method
   * trusts the driver to expose an `affectedRows` property.
   */
  async update(data: Record<string, unknown>, options: UpdateOptions = {}): Promise<number> {
    if (Object.keys(data).length === 0) {
      throw new OrangeDatabaseError('update() called with empty data — no fields to set')
    }
    const query = this.buildRawSQL(
      data,
      options.limit ?? null,
      options.offset ?? 0,
      options.order ?? {},
    )
    const res = await (this.constructor as typeof UpdateQuery).runRawSQL(query.sql, query.params) as Record<string, unknown>
    if (!Object.hasOwn(res, 'affectedRows')) {
      throw new OrangeDatabaseUnexpectedResultError('Driver result does not contain "affectedRows"')
    }
    return res.affectedRows as number
  }
}

export default UpdateQuery
