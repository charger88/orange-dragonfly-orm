const SelectQuery = require('./../components/select-query')
const QueryClauseGroup = require('./../components/query-clause-group')
const QueryClause = require('./../components/query-clause')
const RawSQL = require('../components/raw-sql')
const { ORMHelpers } = require('..')

test('select-simple', () => {
  const data = ['ronald']
  const q = (new SelectQuery('users'))
    .whereAnd('username', data[0])
    .buildRawSQL()
  expect(q.sql).toBe('SELECT * FROM users WHERE users.username = ?')
  expect(q.params).toEqual(data)
})

test('select-empty-in', () => {
  const data = []
  const q = (new SelectQuery('users'))
    .whereAnd('username', data)
    .buildRawSQL()
  expect(q.sql).toBe('SELECT * FROM users WHERE 1 != 1')
  expect(q.params).toEqual(data)
})

test('select-distinct', () => {
  const q = (new SelectQuery('users'))
    .buildRawSQL([{
      'field': 'email',
      'distinct': true
    }])
  expect(q.sql).toBe('SELECT DISTINCT users.email FROM users')
})

test('select-distinct-alternate', () => {
  const q = (new SelectQuery('users'))
    .buildRawSQL(['email'], null, null, {}, true)
  expect(q.sql).toBe('SELECT DISTINCT users.email FROM users')
})

test('select-raw', () => {
  const q = (new SelectQuery('users'))
    .buildRawSQL([{
      'raw': '2 + 2'
    }])
  expect(q.sql).toBe('SELECT 2 + 2 FROM users')
})

test('select-total', () => {
  const data = ['ronald']
  const q = (new SelectQuery('users'))
    .whereAnd('username', data[0])
    .buildRawSQL([{
      'function': 'COUNT',
      'arguments': ['*'],
      'as': 'total',
    }])
  expect(q.sql).toBe('SELECT COUNT(users.*) as total FROM users WHERE users.username = ?')
  expect(q.params).toEqual(data)
})

test('select-where', () => {
  const data = ['ronald', 'george', true]
  const q = (new SelectQuery('users'))
    .whereGroup(wg => wg.andNot('username', data[0]).andNot('username', data[1]))
    .whereOr('admin', data[2])
    .buildRawSQL()
  expect(q.sql).toBe('SELECT * FROM users WHERE (users.username != ? AND users.username != ?) OR users.admin = ?')
  expect(q.params).toEqual(data)
})

test('select-where-2', () => {
  const data = ['ronald', 'president', 'Donald', true]
  const q = (new SelectQuery('users'))
    .whereGroup(wg => {
      wg
        .whereGroup(wg2 => {
          wg2.andNot('username', data[0])
          wg2.andNot('position', data[1])
        })
        .or('name', data[2])
    })
    .whereOr('admin', data[3])
    .buildRawSQL()
  expect(q.sql).toBe('SELECT * FROM users WHERE ((users.username != ? AND users.position != ?) OR users.name = ?) OR users.admin = ?')
  expect(q.params).toEqual(data)
})

test('select-in', () => {
  const data = ['richard', 'george.w']
  const q = (new SelectQuery('users'))
    .whereAnd('username', data)
    .buildRawSQL()
  expect(q.sql).toBe('SELECT * FROM users WHERE users.username IN (?, ?)')
  expect(q.params).toEqual([data[0], data[1]])
})

test('select-in-duplications', () => {
  const data = ['richard', 'george.w', 'george.w', 'george.w', 'richard']
  const q = (new SelectQuery('users'))
    .whereAnd('username', data)
    .buildRawSQL()
  expect(q.sql).toBe('SELECT * FROM users WHERE users.username IN (?, ?)')
  expect(q.params).toEqual([data[0], data[1]])
})

test('select-no-where-limit-offset', () => {
  const data = []
  const q = (new SelectQuery('users')).buildRawSQL('*', 10, 5)
  expect(q.sql).toBe('SELECT * FROM users LIMIT 10 OFFSET 5')
  expect(q.params).toEqual(data)
})

test('select-order', () => {
  const data = ['ronald']
  const q = (new SelectQuery('users'))
    .whereAnd('username', data[0])
    .buildRawSQL('*', null, 0, {'year': true, 'id': false})
  expect(q.sql).toBe('SELECT * FROM users WHERE users.username = ? ORDER BY users.year DESC, users.id ASC')
  expect(q.params).toEqual(data)
})

test('select-special-order', () => {
  const data = ['ronald']
  const q = (new SelectQuery('users'))
    .whereAnd('username', data[0])
    .buildRawSQL('*', null, 0, {
      '&^&^&^&': {
        'column': 'access_class',
        'values': ['a', 'b', 'c'],
        'desc': true
      },
      'XXXXX': {
        'column': 'another_table.t1',
        'values': ['test', 2],
        'desc': false
      },
      'id': false
    })
  expect(q.sql).toBe('SELECT * FROM users WHERE users.username = ? ORDER BY FIELD (users.access_class, ?, ?, ?) DESC, FIELD (another_table.t1, ?, ?) ASC, users.id ASC')
  expect(q.params).toEqual([...data, 'a', 'b', 'c', 'test', 2])
})

test('select-order-strings', () => {
  const data = ['ronald']
  const q = (new SelectQuery('users'))
    .whereAnd('username', data[0])
    .buildRawSQL('*', null, 0, {'year': 'desc', 'id': 'asc'})
  expect(q.sql).toBe('SELECT * FROM users WHERE users.username = ? ORDER BY users.year DESC, users.id ASC')
  expect(q.params).toEqual(data)
})

test('select-group', () => {
  const data = []
  const q = (new SelectQuery('users'))
    .groupBy('home_state')
    .buildRawSQL(['home_state', {'function': 'COUNT', 'arguments': ['id']}], null, 0, {'2': true})
  expect(q.sql).toBe('SELECT users.home_state, COUNT(users.id) FROM users GROUP BY users.home_state ORDER BY 2 DESC')
  expect(q.params).toEqual(data)
})

test('select-group-by-number', () => {
  const data = []
  const q = (new SelectQuery('users'))
    .groupBy(1)
    .buildRawSQL(['home_state', {'function': 'COUNT', 'arguments': ['id']}], null, 0, {'2': true})
  expect(q.sql).toBe('SELECT users.home_state, COUNT(users.id) FROM users GROUP BY 1 ORDER BY 2 DESC')
  expect(q.params).toEqual(data)
})

test('select-join-order', () => {
  const data = [true, 'spouse']
  const q = (new SelectQuery('users'))
    .joinTable('LEFT', 'relatives', `id`, 'user_id')
    .whereAnd('admin', data[0])
    .whereAnd('relatives.relation', data[1])
    .buildRawSQL(['name', 'relatives.name'], null, 0, {'year': true, 'relatives.id': false})
  expect(q.sql).toBe('SELECT users.name, relatives.name FROM users LEFT JOIN relatives ON users.id = relatives.user_id WHERE users.admin = ? AND relatives.relation = ? ORDER BY users.year DESC, relatives.id ASC')
  expect(q.params).toEqual(data)
})

test('select-join-alias', () => {
  const data = [true, 'spouse']
  const q = (new SelectQuery('users'))
    .joinTable('LEFT', 'relatives', `id`, 'user_id', '=', 'my_table')
    .whereAnd('admin', data[0])
    .whereAnd('relatives.relation', data[1])
    .buildRawSQL(['name', 'relatives.name'])
  expect(q.sql).toBe('SELECT users.name, relatives.name FROM users LEFT JOIN relatives my_table ON users.id = my_table.user_id WHERE users.admin = ? AND relatives.relation = ?')
  expect(q.params).toEqual(data)
})

test('select-join-multiple', () => {
  const SOME_VALUE = 5
  const data = [true, 'spouse']
  const table = 'users'
  const c1 = new QueryClause({'type': 'field', 'value': `${table}.id`}, {'type': 'field', 'value': `relatives.user_id`}, '=', false, table)
  const c2 = new QueryClause({'type': 'field', 'value': `${table}.status`}, {'type': 'value', 'value': SOME_VALUE}, '=', false, table)
  const q = (new SelectQuery(table))
    .joinTableCustom('LEFT', 'relatives', new QueryClauseGroup([c1, c2], false, table), 'my_table')
    .whereAnd('admin', data[0])
    .whereAnd('relatives.relation', data[1])
    .buildRawSQL(['name', 'relatives.name'])
  expect(q.sql).toBe('SELECT users.name, relatives.name FROM users LEFT JOIN relatives my_table ON users.id = relatives.user_id AND users.status = ? WHERE users.admin = ? AND relatives.relation = ?')
  expect(q.params).toEqual([SOME_VALUE].concat(data))
})

test('select-with-raw-sql', () => {
  const data = ['ronald']
  const q = (new SelectQuery('users'))
    .whereAnd('password', new RawSQL('UNIX_TIMESTAMP()'))
    .whereAnd(new RawSQL('MD5(users.username)'), data[0])
    .buildRawSQL()
  expect(q.sql).toBe('SELECT * FROM users WHERE users.password = UNIX_TIMESTAMP() AND MD5(users.username) = ?')
  expect(q.params).toEqual(data)
})

test('select-with-escape-character', () => {
  ORMHelpers.RESERVED_WORDS = ['LIMIT']
  ORMHelpers.ESCAPE_CHAR = '`'
  const data = ['ronald']
  const q = (new SelectQuery('users'))
    .whereAnd('limit', data[0])
    .buildRawSQL()
  expect(q.sql).toBe('SELECT * FROM users WHERE users.`limit` = ?')
  expect(q.params).toEqual(data)
  ORMHelpers.RESERVED_WORDS = []
  ORMHelpers.ESCAPE_CHAR = ''
})

test('select-with-escape-character-for-table', () => {
  ORMHelpers.RESERVED_WORDS = ['LIMIT']
  ORMHelpers.ESCAPE_CHAR = '`'
  const data = ['ronald']
  const q = (new SelectQuery('limit'))
    .whereAnd('test_value', data[0])
    .buildRawSQL()
  expect(q.sql).toBe('SELECT * FROM `limit` WHERE `limit`.test_value = ?')
  expect(q.params).toEqual(data)
  ORMHelpers.RESERVED_WORDS = []
  ORMHelpers.ESCAPE_CHAR = ''
})