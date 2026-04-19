import Helpers from './helpers'
import AbstractQuery from './abstract-query'
import RawSQL from './raw-sql'
import { OrangeDatabaseUnexpectedResultError } from './errors'
import type { IActiveRecordConstructor } from './types'

class InsertQuery extends AbstractQuery {
  constructor(table: string, item_class: IActiveRecordConstructor | null = null) {
    super(table, item_class)
  }

  buildRawSQL(fields: string[] | null, values: unknown[][]): { sql: string; params: unknown[] } {
    if (values.length === 0) {
      throw new Error('insertSet requires at least one row of values')
    }
    if (fields !== null) {
      for (let i = 0; i < values.length; i++) {
        if (values[i].length !== fields.length) {
          throw new Error(`Row ${i} has ${values[i].length} value(s) but ${fields.length} field(s) were declared`)
        }
      }
    }
    const params: unknown[] = []
    const fields_sql = fields ? `(${fields.map(f => Helpers.fieldName(f)).join(', ')})` : ''
    const q_set_sql: string[] = []
    for (const values_set of values) {
      const q_set_sql_one: string[] = []
      for (const value of values_set) {
        if (value instanceof RawSQL) {
          q_set_sql_one.push(value.SQL)
        } else {
          q_set_sql_one.push('?')
          params.push(Helpers.prepareValue(value))
        }
      }
      q_set_sql.push(q_set_sql_one.join(', '))
    }
    const sql = `INSERT INTO ${Helpers.tableName(this.table, true)} ${fields_sql} VALUES (${q_set_sql.join('), (')})`
    return { sql, params }
  }

  /**
   * Inserts a single row and returns the new record's ID.
   *
   * @returns The `insertId` from the driver result object.
   * @note The return type is `number` which covers integer auto-increment PKs (MySQL
   * `AUTO_INCREMENT`, SQLite `ROWID`, etc.). For drivers that return a string or
   * object for generated keys (e.g. PostgreSQL `RETURNING`), cast the result as needed.
   * The actual shape of the driver result is driver-defined; this method trusts the
   * driver to expose an `insertId` property.
   */
  async insertOne(data: Record<string, unknown>): Promise<number> {
    const query = this.buildRawSQL(Object.keys(data), [Object.values(data)])
    const res = await (this.constructor as typeof InsertQuery).runRawSQL(query.sql, query.params) as Record<string, unknown>
    if (!Object.hasOwn(res, 'insertId')) {
      throw new OrangeDatabaseUnexpectedResultError('Driver result does not contain "insertId"')
    }
    return res.insertId as number
  }

  /**
   * Inserts multiple rows in a single statement and returns the first inserted ID.
   *
   * @param fields - Column names; must match the length of every row in `values`.
   * @param values - Array of value rows; must be non-empty and each row must have
   *   the same number of elements as `fields`.
   * @returns The `insertId` of the first inserted row from the driver result.
   * @note Same driver result shape assumption as {@link insertOne}.
   * @throws When `values` is empty or any row's length does not match `fields.length`.
   */
  async insertSet(fields: string[], values: unknown[][]): Promise<number> {
    const query = this.buildRawSQL(fields, values)
    const res = await (this.constructor as typeof InsertQuery).runRawSQL(query.sql, query.params) as Record<string, unknown>
    if (!Object.hasOwn(res, 'insertId')) {
      throw new OrangeDatabaseUnexpectedResultError('Driver result does not contain "insertId"')
    }
    return res.insertId as number
  }
}

export default InsertQuery
