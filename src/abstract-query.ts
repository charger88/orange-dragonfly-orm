import Helpers from './helpers'
import AbstractDB from './abstract-db'
import type { IActiveRecordConstructor } from './types'

class AbstractQuery {
  protected static db_object: AbstractDB | null = null

  table: string
  item_class: IActiveRecordConstructor | null

  constructor(table: string, item_class: IActiveRecordConstructor | null = null) {
    this.table = Helpers.tableName(table)
    this.item_class = item_class
  }

  static get db(): AbstractDB {
    if (this.db_object === null) {
      throw new Error('Database object should be registered for AbstractQuery via AbstractQuery.registerDB(db) method.')
    }
    return this.db_object
  }

  static registerDB(db: AbstractDB): void {
    this.db_object = db
  }

  static releaseDB(): void {
    if (this.db_object) {
      this.db_object.disconnect()
      this.db_object = null
    }
  }

  static async runRawSQL(sql: string, params?: unknown[]): Promise<unknown> {
    return await this.db.q(sql, params)
  }

  static cleanUpQuery(sql: string): string {
    return sql.replace(/\s+/g, ' ').trim()
  }
}

export default AbstractQuery
