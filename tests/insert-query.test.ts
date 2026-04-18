import RawSQL from '../src/raw-sql'
import InsertQuery from '../src/insert-query'

test('insert-simple', () => {
  const data: Record<string, unknown> = { 'username': 'admin', 'password': 'qwerty', 'admin': true }
  const q = (new InsertQuery('users')).buildRawSQL(Object.keys(data), [Object.values(data)])
  expect(q.sql).toBe('INSERT INTO users (username, password, admin) VALUES (?, ?, ?)')
  expect(q.params).toEqual(Object.values(data))
})

test('insert-multiple', () => {
  const fields = ['username', 'password', 'admin']
  const values: unknown[][] = [
    ['ronald', '********', false],
    ['george', '********', false],
    ['george.w', '********', false],
    ['donald', '********', true],
  ]
  const q = (new InsertQuery('users')).buildRawSQL(fields, values)
  expect(q.sql).toBe('INSERT INTO users (username, password, admin) VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?), (?, ?, ?)')
  expect(q.params).toEqual(values.reduce((a: unknown[], c) => a.concat(c), []))
})

test('insert-with-raw-sql', () => {
  const data: Record<string, unknown> = { 'username': 'admin', 'password': new RawSQL('UNIX_TIMESTAMP()'), 'admin': true }
  const q = (new InsertQuery('users')).buildRawSQL(Object.keys(data), [Object.values(data)])
  expect(q.sql).toBe('INSERT INTO users (username, password, admin) VALUES (?, UNIX_TIMESTAMP(), ?)')
  expect(q.params).toEqual([data.username, data.admin])
})
