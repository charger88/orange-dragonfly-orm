const RawSQL = require('../components/raw-sql')
const InsertQuery = require('./../components/insert-query')

test('insert-simple', () => {
  const data = {'username': 'admin', 'password': 'qwerty', 'admin': true}
  const q = (new InsertQuery('users')).buildRawSQL(Object.keys(data), [Object.values(data)])
  expect(q.sql).toBe('INSERT INTO users (username, password, admin) VALUES (?, ?, ?)')
  expect(q.params).toEqual(Object.values(data))
})

test('insert-multiple', () => {
  const fields = ['username', 'password', 'admin']
  const values = [
    ['ronald', '********', false],
    ['george', '********', false],
    ['george.w', '********', false],
    ['donald', '********', true]]
  const q = (new InsertQuery('users')).buildRawSQL(fields, values)
  expect(q.sql).toBe('INSERT INTO users (username, password, admin) VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?), (?, ?, ?)')
  expect(q.params).toEqual(values.reduce((a, c) => a.concat(c), []))
})

test('insert-with-raw-sql', () => {
  const data = {'username': 'admin', 'password': new RawSQL('UNIX_TIMESTAMP()'), 'admin': true}
  const q = (new InsertQuery('users')).buildRawSQL(Object.keys(data), [Object.values(data)])
  expect(q.sql).toBe('INSERT INTO users (username, password, admin) VALUES (?, UNIX_TIMESTAMP(), ?)')
  expect(q.params).toEqual([data.username, data.admin])
})