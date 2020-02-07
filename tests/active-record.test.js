const ActiveRecord = require('./../components/active-record')

class SimpleActiveRecord extends ActiveRecord {

}

class SpecialIDActiveRecord extends ActiveRecord {

  static get id_key () {
    return 'special_id'
  }

}

class SoftDeleteActiveRecord extends ActiveRecord {

  static get special_fields () {
    return ['deleted_at']
  }

}

test('table-name', () => {
  expect(SimpleActiveRecord.table).toBe('simple_active_record')
  expect(SpecialIDActiveRecord.table).toBe('special_id_active_record')
})

test('active-record-simple-empty', () => {
  const sar = new SimpleActiveRecord()
  expect(sar.id).toEqual(null)
  expect(sar.data).toEqual({})
})

test('active-record-simple-set-it', () => {
  const sar = new SimpleActiveRecord()
  sar.id = 12345
  expect(sar.id).toBe(12345)
  expect(sar.data).toEqual({'id': 12345})
})

test('active-record-simple-create-data', () => {
  const data = {
    'id': 56789,
    'name': 'Donald',
    'admin': true,
  }
  const sar = new SimpleActiveRecord(data)
  expect(sar.id).toBe(data['id'])
  expect(sar.data).toEqual(data)
})

test('active-record-special-id-empty', () => {
  const sar = new SpecialIDActiveRecord()
  expect(sar.id).toEqual(null)
  expect(sar.data).toEqual({})
})

test('active-record-special-id-set-it', () => {
  const sar = new SpecialIDActiveRecord()
  sar.id = 12345
  expect(sar.id).toBe(12345)
  expect(sar.data).toEqual({'special_id': 12345})
})

test('active-record-special-id-create-data', () => {
  const data = {
    'special_id': 56789,
    'name': 'Donald',
    'admin': true,
  }
  const sar = new SpecialIDActiveRecord(data)
  expect(sar.id).toBe(data['special_id'])
  expect(sar.data).toEqual(data)
})

test('active-record-now', () => {
  const before = Math.floor(Date.now() / 1000)
  const now = SimpleActiveRecord._now()
  const after = Math.ceil(Date.now() / 1000)
  expect(now).toBeGreaterThanOrEqual(before)
  expect(now).toBeLessThanOrEqual(after)
})

test('active-record-query-methods', () => {
  expect(SimpleActiveRecord.insertQuery().constructor.name).toBe('InsertQuery')
  expect(SimpleActiveRecord.selectQuery().constructor.name).toBe('SelectQuery')
  expect(SimpleActiveRecord.updateQuery().constructor.name).toBe('UpdateQuery')
  expect(SimpleActiveRecord.deleteQuery().constructor.name).toBe('DeleteQuery')
})

test('active-record-simple-insert', () => {
  const q = SimpleActiveRecord.insertQuery().buildRawSQL(['name'], [['Donald']])
  expect(q.sql).toBe('INSERT INTO simple_active_record (name) VALUES (?)')
})

test('active-record-simple-select', () => {
  const q = SimpleActiveRecord.selectQuery().buildRawSQL()
  expect(q.sql).toBe('SELECT * FROM simple_active_record')
})

test('active-record-special-select', () => {
  let q = SoftDeleteActiveRecord.selectQuery(true).buildRawSQL()
  expect(q.sql).toBe('SELECT * FROM soft_delete_active_record')
  q = SoftDeleteActiveRecord.selectQuery().buildRawSQL()
  expect(q.sql).toBe('SELECT * FROM soft_delete_active_record WHERE soft_delete_active_record.deleted_at IS NULL')
})

test('active-record-simple-update', () => {
  const q = SimpleActiveRecord.updateQuery().buildRawSQL({'some_field': 1})
  expect(q.sql).toBe('UPDATE simple_active_record SET simple_active_record.some_field = ?')
})

test('active-record-special-update', () => {
  let q = SoftDeleteActiveRecord.updateQuery(true).buildRawSQL({'some_field': 1})
  expect(q.sql).toBe('UPDATE soft_delete_active_record SET soft_delete_active_record.some_field = ?')
  q = SoftDeleteActiveRecord.updateQuery().buildRawSQL({'some_field': 1})
  expect(q.sql).toBe('UPDATE soft_delete_active_record SET soft_delete_active_record.some_field = ? WHERE soft_delete_active_record.deleted_at IS NULL')
})

test('active-record-simple-delete', () => {
  const q = SimpleActiveRecord.deleteQuery().buildRawSQL()
  expect(q.sql).toBe('DELETE FROM simple_active_record')
})

test('active-record-special-delete', () => {
  let q = SoftDeleteActiveRecord.deleteQuery(true).buildRawSQL()
  expect(q.sql).toBe('DELETE FROM soft_delete_active_record')
  q = SoftDeleteActiveRecord.deleteQuery().buildRawSQL()
  expect(q.sql).toBe('DELETE FROM soft_delete_active_record WHERE soft_delete_active_record.deleted_at IS NULL')
})
