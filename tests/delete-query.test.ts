import DeleteQuery from '../src/delete-query'

test('delete-simple', () => {
  const data = ['hillary']
  const q = (new DeleteQuery('users'))
    .whereAnd('username', data[0])
    .buildRawSQL()
  expect(q.sql).toBe('DELETE FROM users WHERE users.username = ?')
  expect(q.params).toEqual(data)
})
