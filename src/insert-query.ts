import Helpers from './helpers'
import AbstractQuery from './abstract-query'
import RawSQL from './raw-sql'
import type { IActiveRecordConstructor } from './types'

class InsertQuery extends AbstractQuery {
  constructor(table: string, item_class: IActiveRecordConstructor | null = null) {
    super(table, item_class)
  }

  buildRawSQL(fields: string[] | null, values: unknown[][]): { sql: string; params: unknown[] } {
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
    let sql = `INSERT INTO ${Helpers.tableName(this.table, true)} ${fields_sql} VALUES (${q_set_sql.join('), (')})`
    sql = (this.constructor as typeof InsertQuery).cleanUpQuery(sql)
    return { sql, params }
  }

  async insertOne(data: Record<string, unknown>): Promise<number> {
    const query = this.buildRawSQL(Object.keys(data), [Object.values(data)])
    const res = await (this.constructor as typeof InsertQuery).runRawSQL(query.sql, query.params) as Record<string, unknown>
    return res.insertId as number
  }

  async insertSet(fields: string[], values: unknown[][]): Promise<number> {
    const query = this.buildRawSQL(fields, values)
    const res = await (this.constructor as typeof InsertQuery).runRawSQL(query.sql, query.params) as Record<string, unknown>
    return res.insertId as number
  }
}

export default InsertQuery
