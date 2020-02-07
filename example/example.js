const ORM = require('./../index')
const MySQLDriver = require('./mysql-driver')

class Brand extends ORM.ActiveRecord {
  static get available_relations () {
    return {
      'models': ORM.Relation.children(this, this.model('CarModel'))
    }
  }
}

class CarModel extends ORM.ActiveRecord {
  static get available_relations () {
    return {
      'brand': ORM.Relation.parent(this, this.model('Brand')),
      'colors': ORM.Relation.independent(this, this.model('Color'), this.model('CarModelColor'))
    }
  }
}

class Color extends ORM.ActiveRecord {}

class CarModelColor extends ORM.ActiveRecord {}

ORM.ActiveRecord
  .registerModel(Brand)
  .registerModel(CarModel)
  .registerModel(Color)
  .registerModel(CarModelColor)

const run = async () => {
  const brands = await Brand.all()
  // You can load relations for list of objects, it will require less queries that loading it for each object
  await Brand.loadRelations(brands, ['models'])
  for (let brand of brands) {
    console.log(`Models of ${brand.data['brand_name']}:`)
    for (let model of await brand.rel('models')) {
      console.log(`* ${model.data['model_name']}: ${(await model.rel('colors')).map(c => c.data['color_name']).join(', ')}`)
    }
  }
  console.log(`Total models is DB: ${await CarModel.selectQuery().total()}`)
  return true
}

if (process.argv.length === 6) {
  ORM.AbstractQuery.registerDB(new MySQLDriver({
    'host': process.argv[2],
    'user': process.argv[3],
    'password': process.argv[4],
    'database': process.argv[5],
    'debug': true
  }))
  run()
    .then(res => console.log(`Done: ${res}`))
    .catch(e => console.error(e))
    .finally(() => ORM.AbstractQuery.releaseDB())
} else {
  console.warn('Script should be called as\nnode example.js {host} {user} {password} {database}')
}