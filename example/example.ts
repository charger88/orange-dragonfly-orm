import { AbstractQuery, ActiveRecord, Relation } from '../src/index.js'
import MySQLDriver from './mysql-driver.js'

class Brand extends ActiveRecord {
  static override get available_relations() {
    return {
      models: Relation.children(this, this.model('CarModel')),
    }
  }
}

class CarModel extends ActiveRecord {
  static override get available_relations() {
    return {
      brand: Relation.parent(this, this.model('Brand')),
      colors: Relation.independent(this, this.model('Color'), this.model('CarModelColor')),
    }
  }
}

class Color extends ActiveRecord {}

class CarModelColor extends ActiveRecord {}

ActiveRecord
  .registerModel(Brand)
  .registerModel(CarModel)
  .registerModel(Color)
  .registerModel(CarModelColor)

const run = async(): Promise<boolean> => {
  const brands = await Brand.all() as Brand[]

  // Loading relations in batch requires fewer queries than loading each one individually.
  await Brand.loadRelations(brands, ['models'])

  for (const brand of brands) {
    console.log(`Models of ${brand.data['brand_name']}:`)

    const models = await brand.rel('models') as CarModel[]
    for (const model of models) {
      const colors = await model.rel('colors') as Color[]
      const colorNames = colors.map(color => color.data['color_name']).join(', ')
      console.log(`* ${model.data['model_name']}: ${colorNames}`)
    }
  }

  if (await CarModel.selectQuery().exists()) {
    console.log(`Total models in DB: ${await CarModel.selectQuery().total()}`)
  }

  try {
    await AbstractQuery.db.transaction(async() => {
      await new Brand({ brand_name: 'Mercury' }).save()
      console.log(`Brands number inside the transaction: ${(await Brand.all()).length}`)
      throw new Error('Oops')
    })
  } catch {
    // Ignore the demo error so the rollback example can continue.
  } finally {
    console.log(`Brands number outside of the transaction after rollback: ${(await Brand.all()).length}`)
  }

  return true
}

const args = process.argv.slice(2)

if (args.length === 4) {
  const [host, user, password, database] = args

  AbstractQuery.registerDB(new MySQLDriver({
    host,
    user,
    password,
    database,
    debug: true,
  }))

  run()
    .then(result => console.log(`Done: ${result}`))
    .catch(error => console.error(error))
    .finally(() => AbstractQuery.releaseDB())
} else {
  console.warn('Script should be called as\nnpx tsx example.ts {host} {user} {password} {database}')
}
