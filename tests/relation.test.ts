import ActiveRecord from '../src/active-record'
import Relation from '../src/relation'

class Brand extends ActiveRecord {
  static get available_relations() {
    return {
      'car-models': Relation.children(this as any, this.model('CarModel') as any),
      'car-models-not-empty': Relation.children(this as any, this.model('CarModel') as any).specify(query => query.where('model_name', '', '!=')),
      'sub-divisions': Relation.children(this as any, this as any, null, 'parent_brand_id'),
      'parent-division': Relation.parent(this as any, this as any, 'parent_brand_id'),
    }
  }
}

class CarModel extends ActiveRecord {
  static get available_relations() {
    return {
      'brand': Relation.parent(this as any, this.model('Brand') as any),
      'available-body-styles': Relation.independent(this as any, this.model('BodyStyle') as any, this.model('AvailableBodyStyle') as any),
    }
  }
}

class BodyStyle extends ActiveRecord {}

class AvailableBodyStyle extends ActiveRecord {}

ActiveRecord
  .registerModel(Brand as any)
  .registerModel(CarModel as any)
  .registerModel(BodyStyle as any)
  .registerModel(AvailableBodyStyle as any)

test('relation-children', () => {
  const data = [7]
  const rel = Brand.available_relations['car-models']
  expect(rel._a_key_by_mode).toBe('id')
  expect(rel._b_key_by_mode).toBe('brand_id')
  const q = rel._getDataBuildQuery(data).buildRawSQL()
  expect(q.sql).toBe('SELECT * FROM car_model WHERE car_model.brand_id IN (?)')
  expect(q.params).toEqual(data)
})

test('relation-children-with-condition', () => {
  const data = [7]
  const rel = Brand.available_relations['car-models-not-empty']
  expect(rel._a_key_by_mode).toBe('id')
  expect(rel._b_key_by_mode).toBe('brand_id')
  const q = rel._getDataBuildQuery(data).buildRawSQL()
  expect(q.sql).toBe('SELECT * FROM car_model WHERE car_model.brand_id IN (?) AND car_model.model_name != ?')
  expect(q.params).toEqual([...data, ''])
})

test('relation-children-with-condition-custom-merge', () => {
  const data = [7]
  const rel = Brand.available_relations['car-models-not-empty']
  expect(rel._a_key_by_mode).toBe('id')
  expect(rel._b_key_by_mode).toBe('brand_id')
  rel.specify(q => q.where('id', 0, '>'), true)
  const q = rel._getDataBuildQuery(data).buildRawSQL()
  expect(q.sql).toBe('SELECT * FROM car_model WHERE car_model.brand_id IN (?) AND car_model.model_name != ? AND car_model.id > ?')
  expect(q.params).toEqual([...data, '', 0])
})

test('relation-children-with-condition-custom-replace', () => {
  const data = [7]
  const rel = Brand.available_relations['car-models-not-empty']
  expect(rel._a_key_by_mode).toBe('id')
  expect(rel._b_key_by_mode).toBe('brand_id')
  rel.specify(q => q.where('id', 0, '>'))
  const q = rel._getDataBuildQuery(data).buildRawSQL()
  expect(q.sql).toBe('SELECT * FROM car_model WHERE car_model.brand_id IN (?) AND car_model.id > ?')
  expect(q.params).toEqual(data.concat([0]))
})

test('relation-children-same-table', () => {
  const data = [7]
  const rel = Brand.available_relations['sub-divisions']
  expect(rel._a_key_by_mode).toBe('id')
  expect(rel._b_key_by_mode).toBe('parent_brand_id')
  const q = rel._getDataBuildQuery(data).buildRawSQL()
  expect(q.sql).toBe('SELECT * FROM brand WHERE brand.parent_brand_id IN (?)')
  expect(q.params).toEqual(data)
})

test('relation-parent', () => {
  const data = [5]
  const rel = CarModel.available_relations['brand']
  expect(rel._a_key_by_mode).toBe('brand_id')
  expect(rel._b_key_by_mode).toBe('id')
  const q = rel._getDataBuildQuery(data).buildRawSQL()
  expect(q.sql).toBe('SELECT * FROM brand WHERE brand.id IN (?)')
  expect(q.params).toEqual(data)
})

test('relation-parent-same-table', () => {
  const data = [5]
  const rel = Brand.available_relations['parent-division']
  expect(rel._a_key_by_mode).toBe('parent_brand_id')
  expect(rel._b_key_by_mode).toBe('id')
  const q = rel._getDataBuildQuery(data).buildRawSQL()
  expect(q.sql).toBe('SELECT * FROM brand WHERE brand.id IN (?)')
  expect(q.params).toEqual(data)
})

test('relation-get-data-result', () => {
  const brands = [
    new Brand({ 'id': 1 }),
    new Brand({ 'id': 2 }),
  ]
  const models = [
    new CarModel({ 'id': 1, 'brand_id': 1 }),
    new CarModel({ 'id': 2, 'brand_id': 2 }),
    new CarModel({ 'id': 3, 'brand_id': 1 }),
    new CarModel({ 'id': 4, 'brand_id': 2 }),
    new CarModel({ 'id': 5, 'brand_id': 1 }),
  ]
  const res = Brand.available_relations['car-models']._getDataResult(models, brands) as Record<number, CarModel[]>
  expect(Object.keys(res).length).toBe(2)
  expect(res[1].length).toBe(3)
  expect(res[2].length).toBe(2)
  expect(res[1]).toEqual([models[0], models[2], models[4]])
  expect(res[2]).toEqual([models[1], models[3]])
})

test('relation-get-independent-data-result', () => {
  const models = [
    new CarModel({ 'id': 1, 'brand_id': 1 }),
    new CarModel({ 'id': 2, 'brand_id': 2 }),
    new CarModel({ 'id': 3, 'brand_id': 2 }),
  ]
  const styles = [
    new BodyStyle({ 'id': 1, 'doors': 2 }),
    new BodyStyle({ 'id': 2, 'doors': 3 }),
    new BodyStyle({ 'id': 3, 'doors': 4 }),
    new BodyStyle({ 'id': 4, 'doors': 5 }),
  ]
  const available = [
    new BodyStyle({ 'id': 1, 'body_style_id': 1, 'car_model_id': 1 }),
    new BodyStyle({ 'id': 2, 'body_style_id': 2, 'car_model_id': 1 }),
    new BodyStyle({ 'id': 3, 'body_style_id': 3, 'car_model_id': 1 }),
    new BodyStyle({ 'id': 4, 'body_style_id': 3, 'car_model_id': 2 }),
    new BodyStyle({ 'id': 5, 'body_style_id': 4, 'car_model_id': 2 }),
  ]
  const res = Relation._getIndependentDataResult(
    {
      '1': [available[0], available[1], available[2]],
      '2': [available[3], available[4]],
    },
    {
      '1': styles[0],
      '2': styles[1],
      '3': styles[2],
      '4': styles[2],
      '5': styles[3],
    },
    models,
  ) as Record<number, BodyStyle[]>
  expect(res[1]).toEqual([styles[0], styles[1], styles[2]])
  expect(res[2]).toEqual([styles[2], styles[3]])
  expect(res[3]).toEqual([])
})

test('relation-clone', () => {
  const rel = CarModel.available_relations['brand']
  expect(rel._a_key_by_mode).toBe('brand_id')
  expect(rel._b_key_by_mode).toBe('id')
  const cloned = rel.clone()
  expect(cloned._a_key_by_mode).toBe('brand_id')
  expect(cloned._b_key_by_mode).toBe('id')
  cloned.specify(q => q.where('id', 0, '>')).params({ 'limit': 45 })
  expect(rel.specify_functions.length).toBe(0)
  expect(cloned.specify_functions.length).toBe(1)
  expect(rel.select_params).toEqual({})
  expect(cloned.select_params).toEqual({ 'limit': 45 })
})

test('relation-clone-independent-preserves-via-configuration', () => {
  const rel = CarModel.available_relations['available-body-styles']
  const cloned = rel.clone()

  expect(cloned.class_via).toBe(rel.class_via)
  expect(cloned.via_a_key).toBe(rel.via_a_key)
  expect(cloned.via_b_key).toBe(rel.via_b_key)
})
