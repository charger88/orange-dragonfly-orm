import DeleteQuery from '../src/delete-query'
import { normalizeSQL } from './test-helpers'

test('delete-simple', () => {
  const data = ['hillary']
  const q = (new DeleteQuery('users'))
    .whereAnd('username', data[0])
    .buildRawSQL()
  expect(normalizeSQL(q.sql)).toBe('DELETE FROM users WHERE users.username = ?')
  expect(q.params).toEqual(data)
})
