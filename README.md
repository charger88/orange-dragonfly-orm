# Orange Dragonfly DB

One day Orange Dragonfly will become a NodeJS framework. For now I'm starting to publish its components.

This library is created to work with database and it also implements Active record pattern.

## Installation

```bash
npm i orange-dragonfly-orm
npm i orange-dragonfly-orm-mysql # Or some other driver
```

## How it works

### Simple example which explains the idea

Include libraries

```javascript
// This is how you include the library
const ORM = require("orange-dragonfly-orm")
// This is how you include MySQL driver 
const MySQLDriver = require("orange-dragonfly-orm-mysql")
// Just loading config
const config = require('./your-config.json')
```

Active records classes should be defined:

```javascript
// Extend class for having generic features for records of the table "brand"
class Brand extends ORM.ActiveRecord {
  // Specifying relations
  static get available_relations () {
    return {
      // This makes records from table "car_models" with "brand_id" available for calling as "await brand_object.rel('models')" 
      'models': ORM.Relation.children(this, this.model('CarModel'))
    }
  }
}

// Extend class for having generic features for records of the table "car_model" 
class CarModel extends ORM.ActiveRecord {}
```

Database connector should be registered:

```javascript
// This is the way how you provide information about DB to ORM library
ORM.AbstractQuery.registerDB(new MySQLDriver(config))
// Models should be registered, so they can be accessed via ActiveRecord.model(class_name_string)
// The main case when you need it is structure with separate file per model class (it can be some issues with dependencies)   
ORM.ActiveRecord
  .registerModel(Brand)
  .registerModel(CarModel)
```

This is how we work with the data:

```javascript
const run = async () => {
  // Loading all records from table "brand"
  const brands = await Brand.all()
  // Iterate brands and load related models
  for (let brand of brands) {
    console.log(`Models of ${brand.data['brand_name']}: ${await brand.rel('models')}`)
  }
  return true
}
```

Library is supposed to be used inside `async` functions:

```javascript
run()
  .then(res => console.log(`Done: ${res}`))
  .catch(e => console.error(e))
  .finally(() => ORM.AbstractQuery.releaseDB()) // If you need to close connection, close it
```

You can also find a bit more in `example/example.js` and in `tests` folder.
