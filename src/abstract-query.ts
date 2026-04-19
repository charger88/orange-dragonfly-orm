import Helpers from './helpers'
import AbstractDB from './abstract-db'
import { OrangeDatabaseError } from './errors'
import type { IActiveRecordConstructor } from './types'

class AbstractQuery {
  /**
   * The single registered database adapter for the entire process.
   *
   * **Known limitation**: this is a static (process-wide) singleton. Only one
   * `AbstractDB` instance can be active at a time, shared by all query classes.
   * Multi-database or multi-tenant scenarios are not supported without subclassing
   * `AbstractQuery` and overriding this property per subclass.
   *
   * Register via {@link registerDB}; release via {@link releaseDB}.
   */
  protected static db_object: AbstractDB | null = null

  table: string
  item_class: IActiveRecordConstructor | null

  constructor(table: string, item_class: IActiveRecordConstructor | null = null) {
    this.table = Helpers.tableName(table)
    this.item_class = item_class
  }

  static get db(): AbstractDB {
    if (this.db_object === null) {
      throw new OrangeDatabaseError('Database object should be registered for AbstractQuery via AbstractQuery.registerDB(db) method.')
    }
    return this.db_object
  }

  static registerDB(db: AbstractDB): void {
    this.db_object = db
  }

  static async releaseDB(): Promise<void> {
    if (this.db_object) {
      await this.db_object.disconnect()
      this.db_object = null
    }
  }

  static async runRawSQL(sql: string, params?: unknown[]): Promise<unknown> {
    return await this.db.q(sql, params)
  }
}

export default AbstractQuery
