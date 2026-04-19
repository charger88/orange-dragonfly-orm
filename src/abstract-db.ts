import { OrangeDatabaseQueryError } from './errors'

export type DBConfig = {
  /**
   * When `true`, every executed SQL statement and its bound parameters are logged
   * via `console.debug`. When a function is provided it is called instead, receiving
   * the SQL string and parameters array — use this to route query logs into your
   * application's logging system.
   *
   * @example
   * // Boolean — use console.debug
   * { debug: true }
   *
   * // Function — use your own logger
   * { debug: (sql, params) => logger.trace({ sql, params }) }
   */
  debug?: boolean | ((sql: string, params: unknown[]) => void)
  [key: string]: unknown
}

export type DBConnection = {
  beginTransaction(callback: (err: Error | null, result?: unknown) => void): void
  commit(callback: (err: Error | null, result?: unknown) => void): void
  rollback(callback: (err?: Error | null, result?: unknown) => void): void
  query(sql: string, params: unknown[], callback: (err: Error | null, res?: unknown) => void): void
}

abstract class AbstractDB {
  config: DBConfig
  connection: DBConnection | null

  constructor(config: DBConfig) {
    this.config = config
    this.connection = null
  }

  /**
   * Opens a new connection to the database and stores it in `this.connection`.
   * Implementations **must** assign the resulting connection to `this.connection`
   * before resolving — `getConnection` relies on this to avoid repeated connects.
   */
  abstract connect(): Promise<DBConnection>

  /**
   * Returns `true` when the current `this.connection` is still alive.
   * Override in subclasses that can detect a dropped connection (e.g. by checking
   * driver connection state). The default implementation always returns `true`.
   */
  async isConnected(): Promise<boolean> {
    return true
  }

  /**
   * Closes and cleans up the current connection.
   * Called by `reconnect` and `AbstractQuery.releaseDB`.
   * Implementations should set `this.connection = null` after closing.
   */
  abstract disconnect(): Promise<void>

  /**
   * Closes the current connection and opens a fresh one.
   * Called automatically by `getConnection` when `isConnected` returns `false`.
   */
  async reconnect(): Promise<DBConnection> {
    await this.disconnect()
    this.connection = await this.connect()
    return this.connection
  }

  /**
   * Executes `functionality` inside a database transaction.
   * Commits on success, rolls back on any thrown error (re-throwing it after rollback).
   *
   * @param functionality - An async callback containing the operations to run transactionally.
   * @returns The value returned by `functionality`.
   */
  async transaction<T>(functionality: () => Promise<T>): Promise<T> {
    await this.beginTransaction()
    try {
      const res = await functionality()
      await this.commitTransaction()
      return res
    } catch (e) {
      await this.rollbackTransaction()
      throw e
    }
  }

  /**
   * Sends a BEGIN / START TRANSACTION command to the driver.
   * Prefer using {@link transaction} over calling this directly.
   */
  beginTransaction(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.getConnection().then(c => {
        c.beginTransaction(err => err ? reject(err) : resolve())
      }).catch(reject)
    })
  }

  /**
   * Sends a COMMIT command to the driver.
   * If the commit itself fails, a rollback is attempted before the error is re-thrown.
   * Rollback errors during this recovery path are suppressed — the original commit
   * error takes precedence.
   * Prefer using {@link transaction} over calling this directly.
   */
  commitTransaction(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.getConnection().then(c => {
        c.commit(err => {
          if (err) {
            // Delegate rollback through the overridable method so subclass logic is honoured.
            // Rollback errors are suppressed — the original commit error takes precedence.
            this.rollbackTransaction().catch(() => null).then(() => reject(err))
          } else {
            resolve()
          }
        })
      }).catch(reject)
    })
  }

  /**
   * Sends a ROLLBACK command to the driver.
   * Prefer using {@link transaction} over calling this directly.
   */
  rollbackTransaction(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.getConnection().then(c => {
        c.rollback(err => err ? reject(err) : resolve())
      }).catch(reject)
    })
  }

  /**
   * Executes a raw SQL query with positional `?` parameters.
   * Logs the SQL and params to `console.debug` when `config.debug` is truthy.
   *
   * @param sql - The SQL string, using `?` as a positional placeholder.
   * @param params - Values bound to each `?` placeholder in order.
   * @returns The raw result object from the driver (shape depends on the driver implementation).
   * @throws {OrangeDatabaseQueryError} when the driver reports a query error, with the
   *   original driver error preserved as `cause`.
   */
  q(sql: string, params?: unknown[]): Promise<unknown> {
    const debug = this.config['debug']
    if (debug) {
      if (typeof debug === 'function') {
        debug(sql, params ?? [])
      } else {
        console.debug(sql, params)
      }
    }
    return new Promise((resolve, reject) => {
      this.getConnection().then(c => {
        c.query(sql, params || [], (err, res) => {
          if (err) {
            reject(new OrangeDatabaseQueryError('DB Query problem', { cause: err }))
          } else {
            resolve(res)
          }
        })
      }).catch(reject)
    })
  }

  /**
   * Returns an active connection, opening or reopening one if necessary.
   *
   * - If `this.connection` is `null`, calls `connect()` and stores the result.
   * - If `isConnected()` returns `false`, calls `reconnect()` and stores the result.
   * - Otherwise returns the existing `this.connection`.
   */
  async getConnection(): Promise<DBConnection> {
    if (this.connection === null) {
      this.connection = await this.connect()
      return this.connection
    }
    if (!(await this.isConnected())) {
      return await this.reconnect()
    }
    return this.connection
  }
}

export default AbstractDB
