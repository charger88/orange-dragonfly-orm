import ActiveRecord from '../src/active-record'
import type { DeleteOptions, FieldFunctionObject, IActiveRecordConstructor, IActiveRecordInstance, IQueryBuilder, OrderSpec, SelectFields, SelectOptions, UpdateOptions } from '../src'
import { normalizeSQL } from './test-helpers'

class SimpleActiveRecord extends ActiveRecord {}

class SpecialIDActiveRecord extends ActiveRecord {
  static get id_key(): string {
    return 'special_id'
  }
}

class SoftDeleteActiveRecord extends ActiveRecord {
  static get special_fields(): string[] {
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
  expect(sar.data).toEqual({ 'id': 12345 })
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
  expect(sar.data).toEqual({ 'special_id': 12345 })
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
  const now = (SimpleActiveRecord as any)._now()
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

test('active-record-constructor-select-query-interface', () => {
  const model: IActiveRecordConstructor<SimpleActiveRecord> = SimpleActiveRecord
  const selectOptions: SelectOptions = { limit: 1, order: { id: 'desc' } }
  const selectFields: SelectFields = ['id', 'name']
  const q = model.selectQuery()
  q
    .whereAndNot('id', 0)
    .whereOr('name', 'Donald')
    .whereOrNot('status', 'archived')
    .where('score', 1, '>')
    .whereGroup(group => group.and('rank', [1, 2]))
    .joinTable('LEFT', 'related_records', 'id', 'simple_active_record_id')
    .groupBy('name')
    .buildRawSQL(selectFields, selectOptions.limit, selectOptions.offset, selectOptions.order)
  const select: IQueryBuilder<SimpleActiveRecord>['select'] = q.select
  const selectOne: IQueryBuilder<SimpleActiveRecord>['selectOne'] = q.selectOne
  const selectColumns: IQueryBuilder<SimpleActiveRecord>['selectColumns'] = q.selectColumns
  const selectRow: IQueryBuilder<SimpleActiveRecord>['selectRow'] = q.selectRow
  const total: IQueryBuilder<SimpleActiveRecord>['total'] = q.total
  const exists: IQueryBuilder<SimpleActiveRecord>['exists'] = q.exists
  expect([select, selectOne, selectColumns, selectRow, total, exists].every(fn => typeof fn === 'function')).toBe(true)
})

test('active-record-constructor-static-interface', () => {
  const model: IActiveRecordConstructor<SimpleActiveRecord> = SimpleActiveRecord
  const order: OrderSpec = { id: 'desc' }
  const field: FieldFunctionObject = { function: 'COUNT', arguments: ['*'], as: 'total' }
  const updateOptions: UpdateOptions = { limit: 1, order }
  const deleteOptions: DeleteOptions = { limit: 1, order }
  const insert = model.insertQuery().buildRawSQL(['name'], [['Donald']])
  const update = model.updateQuery().whereAnd('id', 1).buildRawSQL({ name: 'Duck' }, updateOptions.limit, updateOptions.offset, updateOptions.order)
  const remove = model.deleteQuery().whereAnd('id', 1).buildRawSQL(deleteOptions.limit, deleteOptions.offset, deleteOptions.order)
  const all: IActiveRecordConstructor<SimpleActiveRecord>['all'] = model.all
  const find: IActiveRecordConstructor<SimpleActiveRecord>['find'] = model.find
  const loadRelations: IActiveRecordConstructor<SimpleActiveRecord>['loadRelations'] = model.loadRelations
  expect(normalizeSQL(insert.sql)).toBe('INSERT INTO simple_active_record (name) VALUES (?)')
  expect(normalizeSQL(update.sql)).toBe('UPDATE simple_active_record SET simple_active_record.name = ? WHERE simple_active_record.id = ? ORDER BY simple_active_record.id DESC LIMIT 1')
  expect(normalizeSQL(remove.sql)).toBe('DELETE FROM simple_active_record WHERE simple_active_record.id = ? ORDER BY simple_active_record.id DESC LIMIT 1')
  expect(field.as).toBe('total')
  expect([all, find, loadRelations].every(fn => typeof fn === 'function')).toBe(true)
})

test('active-record-instance-interface', () => {
  const record: IActiveRecordInstance = new SimpleActiveRecord({ id: 1 })
  const rel: IActiveRecordInstance['rel'] = record.rel
  const customRelQuery: IActiveRecordInstance['custom_rel_query'] = record.custom_rel_query
  const resetRelations: IActiveRecordInstance['resetRelations'] = record.resetRelations
  const save: IActiveRecordInstance['save'] = record.save
  const remove: IActiveRecordInstance['remove'] = record.remove
  const isUnique: IActiveRecordInstance['isUnique'] = record.isUnique
  expect(record.id).toBe(1)
  expect([rel, customRelQuery, resetRelations, save, remove, isUnique].every(fn => typeof fn === 'function')).toBe(true)
})

test('active-record-simple-insert', () => {
  const q = SimpleActiveRecord.insertQuery().buildRawSQL(['name'], [['Donald']])
  expect(normalizeSQL(q.sql)).toBe('INSERT INTO simple_active_record (name) VALUES (?)')
})

test('active-record-simple-select', () => {
  const q = SimpleActiveRecord.selectQuery().buildRawSQL()
  expect(normalizeSQL(q.sql)).toBe('SELECT * FROM simple_active_record')
})

test('active-record-special-select', () => {
  let q = SoftDeleteActiveRecord.selectQuery(true).buildRawSQL()
  expect(normalizeSQL(q.sql)).toBe('SELECT * FROM soft_delete_active_record')
  q = SoftDeleteActiveRecord.selectQuery().buildRawSQL()
  expect(normalizeSQL(q.sql)).toBe('SELECT * FROM soft_delete_active_record WHERE soft_delete_active_record.deleted_at IS NULL')
})

test('active-record-simple-update', () => {
  const q = SimpleActiveRecord.updateQuery().buildRawSQL({ 'some_field': 1 })
  expect(normalizeSQL(q.sql)).toBe('UPDATE simple_active_record SET simple_active_record.some_field = ?')
})

test('active-record-special-update', () => {
  let q = SoftDeleteActiveRecord.updateQuery(true).buildRawSQL({ 'some_field': 1 })
  expect(normalizeSQL(q.sql)).toBe('UPDATE soft_delete_active_record SET soft_delete_active_record.some_field = ?')
  q = SoftDeleteActiveRecord.updateQuery().buildRawSQL({ 'some_field': 1 })
  expect(normalizeSQL(q.sql)).toBe('UPDATE soft_delete_active_record SET soft_delete_active_record.some_field = ? WHERE soft_delete_active_record.deleted_at IS NULL')
})

test('active-record-simple-delete', () => {
  const q = SimpleActiveRecord.deleteQuery().buildRawSQL()
  expect(normalizeSQL(q.sql)).toBe('DELETE FROM simple_active_record')
})

test('active-record-special-delete', () => {
  let q = SoftDeleteActiveRecord.deleteQuery(true).buildRawSQL()
  expect(normalizeSQL(q.sql)).toBe('DELETE FROM soft_delete_active_record')
  q = SoftDeleteActiveRecord.deleteQuery().buildRawSQL()
  expect(normalizeSQL(q.sql)).toBe('DELETE FROM soft_delete_active_record WHERE soft_delete_active_record.deleted_at IS NULL')
})
