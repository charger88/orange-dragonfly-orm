import AbstractDB from '../src/abstract-db'
import { OrangeDatabaseQueryError } from '../src/errors'

type TestResult = {
  ok: boolean
}

class TestDB extends AbstractDB {
  queryCalls = 0
  connectCalls = 0
  shouldFailQueries = 0
  connected = true

  async connect() {
    this.connectCalls++
    this.connected = true
    this.connection = {
      beginTransaction(callback) {
        callback(null)
      },
      commit(callback) {
        callback(null)
      },
      rollback(callback) {
        callback(null)
      },
      query: (_sql, _params, callback) => {
        this.queryCalls++
        if (this.shouldFailQueries > 0) {
          this.shouldFailQueries--
          callback(new Error('connection lost'))
          return
        }
        callback(null, { ok: true } satisfies TestResult)
      },
    }
    return this.connection
  }

  async isConnected(): Promise<boolean> {
    return this.connected
  }

  async disconnect(): Promise<void> {
    this.connected = false
    this.connection = null
  }
}

test('abstract-db-q-does-not-auto-retry', async() => {
  const db = new TestDB({})
  db.shouldFailQueries = 1

  await expect(db.q('SELECT 1')).rejects.toThrow('DB Query problem')
  expect(db.queryCalls).toBe(1)
})

test('abstract-db-q-error-preserves-cause', async() => {
  const db = new TestDB({})
  db.shouldFailQueries = 1

  try {
    await db.q('SELECT 1')
    throw new Error('should have thrown')
  } catch (e) {
    expect(e).toBeInstanceOf(OrangeDatabaseQueryError)
    expect((e as OrangeDatabaseQueryError).cause).toBeInstanceOf(Error)
    expect(((e as OrangeDatabaseQueryError).cause as Error).message).toBe('connection lost')
  }
})

test('abstract-db-get-connection-reconnects-when-disconnected', async() => {
  const db = new TestDB({})
  await db.connect()
  db.connected = false

  const result = await db.q('SELECT 1') as TestResult

  expect(result).toEqual({ ok: true })
  expect(db.queryCalls).toBe(1)
  expect(db.connectCalls).toBe(2)
})
