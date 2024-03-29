const InsertQuery = require('./insert-query')
const SelectQuery = require('./select-query')
const UpdateQuery = require('./update-query')
const DeleteQuery = require('./delete-query')

/**
 * Active record base model class
 */
class ActiveRecord {

  static registered_models = {}

  data = null
  relations = {}

  /**
   * @param data
   */
  constructor (data) {
    this.data = data ? Object.assign({}, data) : {}
  }

  /**
   * Registers models for dealing with javascript-dependencies
   * @param model_class
   * @returns this
   */
  static registerModel (model_class) {
    this.registered_models[model_class.name] = model_class
    return this
  }

  /**
   * Returns class of the registered model by class name
   * @param class_name
   * @returns {*}
   */
  static model (class_name) {
    if (!this.registered_models.hasOwnProperty(class_name)) {
      throw new Error(`Model ${class_name} is not registered`)
    }
    return this.registered_models[class_name]
  }

  /**
   * Column name of the primary key ("id" is default)
   * @returns {string}
   */
  static get id_key () {
    return 'id'
  }

  /**
   * List of special fields available for the table, such as
   * - created_at (field is being set as current time when method "save" is being invoked for new object)
   * - updated_at (field is being set as current time when method "save" is being invoked)
   * - deleted_at (implements soft delete)
   * @returns {Array}
   */
  static get special_fields () {
    return []
  }

  /**
   * Available relations for the class. See "Relation" class
   * @returns {{}}
   */
  static get available_relations () {
    return {}
  }

  /**
   * Name of the table. By default is snake-cased version of camel-cased class name
   * Example: for "MyModelClass" method will return "my_model_class"
   * @returns {string}
   */
  static get table () {
    const class_name = this.name
    let table_name = ''
    let uppercase_status = class_name.split('').map(x => x.match('[A-Z0-9]'))
    uppercase_status.push(true) // For last character
    for (let i = 0; i < class_name.length; i++) {
      if (i && uppercase_status[i] && !(uppercase_status[i - 1] && uppercase_status[i + 1])) {
        table_name += '_'
      }
      table_name += class_name[i]
    }
    return table_name.toLowerCase()
  }

  /**
   * Returns initialized insert query object for the table
   * See InsertQuery
   * @returns {InsertQuery}
   */
  static insertQuery () {
    return new InsertQuery(this.table, this)
  }

  /**
   * Returns initialized select query object for the table
   * See SelectQuery
   * @returns {SelectQuery}
   */
  static selectQuery (include_deleted = false) {
    return this._prepareFilteredQuery(new SelectQuery(this.table, this), include_deleted)
  }

  /**
   * Returns initialized update query object for the table
   * See UpdateQuery
   * @returns {UpdateQuery}
   */
  static updateQuery (include_deleted = false) {
    return this._prepareFilteredQuery(new UpdateQuery(this.table, this), include_deleted)
  }

  /**
   * Returns initialized delete query object for the table
   * See DeleteQuery
   * @returns {DeleteQuery}
   */
  static deleteQuery (include_deleted = false) {
    return this._prepareFilteredQuery(new DeleteQuery(this.table, this), include_deleted)
  }

  /**
   * Prepares select, update or delete query for supporting soft-delete
   * @param query
   * @param include_deleted
   * @returns {*}
   */
  static _prepareFilteredQuery (query, include_deleted) {
    if (this.special_fields.includes('deleted_at') && !include_deleted) {
      query.whereAnd('deleted_at', null)
    }
    return query
  }

  /**
   * Returns is object has unique values
   * @param fields
   * @param ignore_null
   * @returns {Promise<boolean>}
   */
  async isUnique (fields, ignore_null = false) {
    const q = this.constructor.selectQuery()
    for (let field of fields) {
      if ((this.data[field] === null) && ignore_null) {
        return true
      }
      q.whereAnd(field, this.data[field])
    }
    this.id && q.whereAndNot(this.constructor.id_key, this.id)
    return !(await q.selectOne())
  }

  /**
   * Loads relations for list of objects
   * @param objects
   * @param relations Provide array of relations' names or null (for all relations)
   * @returns {Promise<Array>}
   */
  static async loadRelations (objects, relations=null) {
    let sub_relations = {}
    if (relations === null){
      relations = Object.keys(this.available_relations)
    } else {
      for (let rel_name of relations) {
        if (rel_name.includes(':')) {
          rel_name = rel_name.split(':')
          if (!sub_relations.hasOwnProperty(rel_name[0])) {
            sub_relations[rel_name[0]] = []
          }
          sub_relations[rel_name[0]].push(rel_name.slice(1).join(':'))
        }
      }
      relations = relations.filter(r => {
        return !r.includes(':')
      })
    }
    for (let rel_name of relations) {
      if (!this.available_relations.hasOwnProperty(rel_name)) {
        throw new Error(`Relation ${rel_name} does not exist in model ${this.name}`)
      }
      const res = await this.available_relations[rel_name].selectForMultiple(objects)
      if (sub_relations.hasOwnProperty(rel_name)) {
        await this.available_relations[rel_name].b.loadRelations(Object.values(res).reduce((a,c) => a.concat(Array.isArray(c) ? c : [c]), []).filter(r => r !== null), sub_relations[rel_name])
      }
      for (let object of objects) {
        object.relations[rel_name] = res[object.id]
      }
    }
    return objects
  }

  /**
   * Looks for an object by id, returns
   * @param id
   * @param include_deleted
   * @returns {Promise<ActiveRecord>}
   */
  static async find (id, include_deleted = false) {
    return await this.selectQuery(include_deleted).whereAnd(this.id_key, id).selectOne()
  }

  /**
   * Returns all records of the tables
   * @param include_deleted
   * @returns {Promise<Array>}
   */
  static async all (include_deleted = false) {
    return await this.selectQuery(include_deleted).select()
  }

  /**
   * Primary key's value of the object
   * @returns {(number|null)}
   */
  get id () {
    return this.data.hasOwnProperty(this.constructor.id_key) ? this.data[this.constructor.id_key] : null
  }

  /**
   * Primary key's value of the object
   * @param value
   */
  set id (value) {
    this.data[this.constructor.id_key] = value
  }

  /**
   * Returns relation object
   * @param name
   * @return {*}
   * @private
   */
  _get_relation_object (name) {
    if (!this.constructor.available_relations.hasOwnProperty(name)) {
      throw new Error(`Relation "${name}" is not defined in class "${this.constructor.name}"`)
    }
    return this.constructor.available_relations[name]
  }

  /**
   * Returns value of relation described in "available_relations" (model object, null or array of objects)
   * @param name
   * @param reload
   * @returns {Promise<*>}
   */
  async rel (name, reload = false) {
    if (reload || !this.relations.hasOwnProperty(name)) {
      this.relations[name] = await (this._get_relation_object(name)).selectForOne(this)
    }
    return this.relations[name]
  }

  /**
   * Returns value of relation described in "available_relations" (model object, null or array of objects)
   * @param name
   * @param {function} custom_specify_function Query modification (where conditions, etc.)
   * @param {object} custom_select_params Select parameters (order, limit, offset)
   * @returns {Promise<*>}
   */
  async custom_rel_query (name, custom_specify_function = null, custom_select_params = null) {
    const rel_obj = this._get_relation_object(name).clone()
    if (custom_specify_function) rel_obj.specify(custom_specify_function, true)
    if (custom_select_params) rel_obj.params(custom_select_params, true)
    return await rel_obj.selectForOne(this)
  }

  /**
   * Resets all loaded relations for the object
   * @param relation
   * @returns {ActiveRecord}
   */
  resetRelations (relation = null) {
    if (relation === null) {
      this.relations = {}
    } else if (this.relations.hasOwnProperty(relation)) {
      delete this.relations[relation]
    }
    return this
  }

  /**
   * Callback before saving the object
   * @param {boolean} is_new Shows if method creates object or updates the existing one
   * @returns {Promise<void>}
   * @private
   */
  async _preSave (is_new = false) {}

  /**
   * Saves object
   * @param data
   * @returns {Promise<ActiveRecord>}
   */
  async save (data = null) {
    if (data) {
      this.data = Object.assign(this.data, data)
    }
    Object.keys(this.data).filter(k => (k[0] === ':')).forEach(k => {
      delete this.data[k]
    })
    if (this.constructor.special_fields.includes('updated_at')) {
      this.data['updated_at'] = this.constructor._now()
    }
    if (this.constructor.special_fields.includes('created_at') && !this.id) {
      this.data['created_at'] = this.constructor._now()
    }
    if (this.constructor.special_fields.includes('deleted_at') && !this.id) {
      this.data['deleted_at'] = null
    }
	const is_new = !this.id
    await this._preSave(is_new)
    data = Object.assign({}, this.data)
    if (data.hasOwnProperty(this.constructor.id_key)) {
      delete data[this.constructor.id_key]
    }
    if (!is_new) {
      await this.constructor.updateQuery().whereAnd(this.constructor.id_key, this.id).update(data)
    } else {
      this.id = await this.constructor.insertQuery().insertOne(data)
    }
    await this._postSave(is_new)
    return this
  }

  /**
   * Callback after saving the object
   * @param {boolean} is_new Shows if method creates object or updates the existing one
   * @returns {Promise<void>}
   * @private
   */
  async _postSave (is_new = false) {}

  /**
   * Callback before deleting the object
   * @returns {Promise<void>}
   * @private
   */
  async _preRemove () {}

  /**
   * Deletes object
   * @returns {Promise<ActiveRecord>}
   */
  async remove (hard) {
    await this._preRemove()
    if (this.id) {
      if (hard || !this.constructor.special_fields.includes('deleted_at')) {
        await this.constructor.deleteQuery()
          .whereAnd(this.constructor.id_key, this.id)
          .remove()
      } else {
        await this.constructor.updateQuery()
          .whereAnd(this.constructor.id_key, this.id)
          .update({'deleted_at': this.constructor._now()})
      }
    }
    await this._postRemove()
    this.id = null
    return this
  }

  /**
   * Callback after deleting the object
   * @returns {Promise<void>}
   * @private
   */
  async _postRemove () {}

  /**
   * Returns timestamp
   * @returns {number}
   * @private
   */
  static _now () {
    return Math.floor((new Date()).getTime() / 1000)
  }

  /**
   * Converts object to string
   * @returns {string}
   */
  toString() {
    return JSON.stringify(this.data)
  }

}

module.exports = ActiveRecord