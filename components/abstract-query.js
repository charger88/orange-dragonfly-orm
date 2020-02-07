const Helpers = require('./helpers')

/**
 * Abstract SQL query
 */
class AbstractQuery {

  static db_object = null

  table = null
  item_class = null

  /**
   * @param table name
   * @param item_class Active Record class which represents table's record
   */
  constructor (table, item_class = null) {
    this.table = Helpers.tableName(table)
    this.item_class = item_class
  }

  /**
   * Returns DB Driver's object
   * @return {*}
   */
  static get db () {
    if (this.db_object === null) {
      throw new Error('Database object should be registered for AbstractQuery via AbstractQuery.registerDB(db) method.')
    }
    return this.db_object
  }

  /**
   * Registers DB Driver's object
   * @param db
   */
  static registerDB (db) {
    this.db_object = db
  }

  /**
   * Unregisters DB object and disconnects it
   */
  static releaseDB () {
    if (this.db_object) {
      this.db_object.disconnect()
      this.db_object = null
    }
  }

  /**
   * Runs SQL query
   * @param sql
   * @param params
   * @return {Promise<any>}
   */
  static async runRawSQL (sql, params) {
    return await this.db.q(sql, params)
  }

  /**
   * Removes unnecessary spaces from the query
   * @param sql
   * @return {string}
   */
  static cleanUpQuery (sql) {
    while (sql.includes('  ')) {
      sql = sql.replace('  ', ' ')
    }
    return sql.trim()
  }

}

module.exports = AbstractQuery