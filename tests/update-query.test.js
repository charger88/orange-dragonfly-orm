const RawSQL = require('../components/raw-sql')
const UpdateQuery = require('./../components/update-query')

test('update-simple', () => {
  const data = [false, '12345678', 'admin']
  const q = (new UpdateQuery('users')).whereAnd('username', data[2]).buildRawSQL(
    {
      'admin': data[0],
      'password': data[1],
    }
  )
  expect(q.sql).toBe('UPDATE users SET users.admin = ?, users.password = ? WHERE users.username = ?')
  expect(q.params).toEqual(Object.values(data))
})

test('update-with-raw-sql', () => {
  const data = [false, 'admin']
  const q = (new UpdateQuery('users')).whereAnd('username', data[1]).buildRawSQL(
    {
      'admin': data[0],
      'password': new RawSQL('UNIX_TIMESTAMP()')
    }
  )
  expect(q.sql).toBe('UPDATE users SET users.admin = ?, users.password = UNIX_TIMESTAMP() WHERE users.username = ?')
  expect(q.params).toEqual(Object.values(data))
})
