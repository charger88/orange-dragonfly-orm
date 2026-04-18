type DBConfig = Record<string, unknown>

type DBConnection = {
  beginTransaction(callback: (err: Error | null, result?: unknown) => void): void
  commit(callback: (err: Error | null, result?: unknown) => void): void
  rollback(callback: (err?: Error | null, result?: unknown) => void): void
  query(sql: string, params: unknown[], callback: (err: Error | null, res?: unknown) => void): void
}

abstract class AbstractDB {
  config: DBConfig | null
  connection: DBConnection | null

  constructor(config: DBConfig) {
    this.config = config
    this.connection = null
  }

  abstract connect(): Promise<DBConnection>

  async isConnected(): Promise<boolean> {
    return true
  }

  abstract disconnect(): void

  async reconnect(): Promise<DBConnection> {
    this.disconnect()
    return await this.connect()
  }

  async transaction(functionality: () => Promise<unknown>): Promise<unknown> {
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

  beginTransaction(): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.getConnection().then(c => {
        c.beginTransaction((err, result) => err ? reject(err) : resolve(result))
      }).catch(reject)
    })
  }

  commitTransaction(): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.getConnection().then(c => {
        c.commit((err, result) => err ? c.rollback(() => reject(err)) : resolve(result))
      }).catch(reject)
    })
  }

  rollbackTransaction(): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.getConnection().then(c => {
        c.rollback((err, result) => err ? reject(err) : resolve(result))
      }).catch(reject)
    })
  }

  q(sql: string, params?: unknown[]): Promise<unknown> {
    if (this.config?.['debug']) {
      console.debug(sql, params)
    }
    return new Promise((resolve, reject) => {
      this.getConnection().then(c => {
        c.query(sql, params || [], (err, res) => {
          if (err) {
            reject(new Error(`DB Query problem: ${err}`))
          } else {
            resolve(res)
          }
        })
      }).catch(reject)
    })
  }

  async getConnection(): Promise<DBConnection> {
    if (this.connection === null) {
      return await this.connect()
    }
    if (!(await this.isConnected())) {
      return await this.reconnect()
    }
    return this.connection
  }
}

export default AbstractDB
