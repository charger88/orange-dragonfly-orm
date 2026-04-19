import mysql, { type Connection, type ConnectionOptions } from 'mysql2'

import AbstractDB from '../src/abstract-db.js'

type MySQLDriverConfig = Pick<
  ConnectionOptions,
  'host' | 'port' | 'user' | 'password' | 'database' | 'debug'
> & {
  connect_timeout?: number
}

type DriverConnection = {
  connect(callback: (err: Error | null) => void): void
  beginTransaction(callback: (err: Error | null, result?: unknown) => void): void
  commit(callback: (err: Error | null, result?: unknown) => void): void
  rollback(callback: (err?: Error | null, result?: unknown) => void): void
  query(sql: string, params: unknown[], callback: (err: Error | null, res?: unknown) => void): void
  destroy(): void
  state: Connection['state']
}

class MySQLDriver extends AbstractDB {
  override connect(): Promise<DriverConnection> {
    return new Promise((resolve, reject) => {
      const config = this.config as MySQLDriverConfig

      const connection = mysql.createConnection({
        host: config.host,
        port: config.port ?? 3306,
        user: config.user,
        password: config.password,
        database: config.database,
        connectTimeout: config.connect_timeout ?? 5000,
      }) as unknown as DriverConnection

      this.connection = connection
      connection.connect(err => {
        if (err) {
          reject(err)
        } else {
          resolve(connection)
        }
      })
    })
  }

  override async isConnected(): Promise<boolean> {
    const connection = this.connection as DriverConnection | null
    return !!connection && connection.state !== 'disconnected'
  }

  override async disconnect(): Promise<void> {
    const connection = this.connection as DriverConnection | null
    if (connection) {
      try {
        connection.destroy()
      } catch {
        // Ignore connection cleanup errors in the example driver.
      } finally {
        this.connection = null
      }
    }
  }
}

export default MySQLDriver
