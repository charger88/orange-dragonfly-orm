/**
 * Relation
 */
class Relation {

  mode = null
  a = null
  a_key = null
  b = null
  b_key = null
  class_via = null
  via_a_key = null
  via_b_key = null

  /**
   * @param mode
   * @param a
   * @param b
   * @param a_key
   * @param b_key
   */
  constructor (mode, a, b, a_key=null, b_key=null) {
    this.mode = mode
    this.a = a
    this.b = b
    this.a_key = a_key
    this.b_key = b_key
  }

  /**
   * Defines child relation.
   * It means that record of child_class has field referencing to object of this_class
   * @param this_class
   * @param child_class
   * @param a_key
   * @param b_key
   * @return {Relation}
   */
  static child(this_class, child_class, a_key=null, b_key=null) {
    return new this('child', this_class, child_class, a_key, b_key)
  }

  /**
   * Defines children relation.
   * It means that multiple records of child_class has field referencing to object of this_class
   * @param this_class
   * @param child_class
   * @param a_key
   * @param b_key
   * @return {Relation}
   */
  static children(this_class, child_class, a_key=null, b_key=null) {
    return new this('children', this_class, child_class, a_key, b_key)
  }

  /**
   * Defines parent relation.
   * It means that record of this_class has field referencing to object of child_class
   * @param this_class
   * @param parent_class
   * @param a_key
   * @param b_key
   * @return {Relation}
   */
  static parent(this_class, parent_class, a_key=null, b_key=null) {
    return new this('parent', this_class, parent_class, a_key, b_key)
  }

  /**
   * Defines independent relation.
   * It means that class_a and class_b are connected via class_via table
   * @param class_a
   * @param class_b
   * @param class_via
   * @param via_a_key
   * @param via_b_key
   * @param a_key
   * @param b_key
   * @return {Relation}
   */
  static independent(class_a, class_b, class_via, via_a_key=null, via_b_key=null, a_key=null, b_key=null) {
    const obj = new this('independent', class_a, class_b, a_key, b_key)
    obj.class_via = class_via
    obj.via_a_key = via_a_key
    obj.via_b_key = via_b_key
    return obj
  }

  /**
   * Returns relations' data for multiple objects
   * @param objects
   * @return {Promise<*>}
   */
  async selectForMultiple(objects) {
    return await (this.mode === 'independent' ? this._getIndependentData(objects) : this._getData(objects))
  }

  /**
   * Returns relation data for object
   * @param object
   * @return {Promise<*>}
   */
  async selectForOne(object) {
    if (!object.id) throw new Error('Relation can\'t be loaded for not-saved object')
    const data = await this.selectForMultiple([object])
    return data[object.id]
  }

  /**
   * Key generated based on relation configuration
   * @return {*}
   * @private
   */
  get _a_key_by_mode() {
    if (this.a_key) {
      return this.a_key
    }
    return ['parent'].includes(this.mode) ? `${this.b.table}_id` : this.a.id_key
  }

  /**
   * Key generated based on relation configuration
   * @return {*}
   * @private
   */
  get _b_key_by_mode() {
    if (this.b_key) {
      return this.b_key
    }
    return ['child', 'children'].includes(this.mode) ? `${this.a.table}_id` : this.b.id_key
  }

  /**
   * @param objects
   * @return {Promise<object>}
   */
  async _getIndependentData(objects) {
    const relation_a = this.constructor.children(this.a, this.class_via, this.a_key, this.via_a_key)
    const via_data = await relation_a.selectForMultiple(objects)
    const relation_b = this.constructor.parent(this.class_via, this.b, this.via_b_key, this.b_key)
    const b_data = await relation_b.selectForMultiple(Object.values(via_data).reduce((a, c) => a.concat(c), []))
    return this.constructor._getIndependentDataResult(via_data, b_data, objects)
  }

  /**
   * @param via_data
   * @param b_data
   * @param objects
   * @return object
   */
  static _getIndependentDataResult(via_data, b_data, objects){
    const res = {}
    for (let obj of objects) {
      res[obj.id] = []
    }
    for (let v_key of Object.keys(via_data)) {
      for (let via_obj of via_data[v_key]) {
        if (b_data[via_obj.id]) {
          res[v_key].push(b_data[via_obj.id])
        }
      }
    }
    return res
  }

  /**
   * @param objects
   * @return {Promise<void>}
   * @private
   */
  async _getData(objects) {
    const data = await this._getDataBuildQuery(objects.map(obj => obj.data[this._a_key_by_mode])).select()
    return this._getDataResult(data, objects)
  }

  /**
   * @param ids
   * @return {FilteredQuery}
   */
  _getDataBuildQuery(ids) {
    return this.b.selectQuery().whereAnd(this._b_key_by_mode, ids)
  }

  /**
   * @param data
   * @param objects
   * @private
   */
  _getDataResult(data, objects) {
    const array_mode = ['children'].includes(this.mode)
    const data2 = {}
    for (let r of data) {
      if (array_mode) {
        if (!data2.hasOwnProperty(r.data[this._b_key_by_mode])) {
          data2[r.data[this._b_key_by_mode]] = []
        }
        data2[r.data[this._b_key_by_mode]].push(r)
      } else {
        data2[r.data[this._b_key_by_mode]] = r
      }
    }
    const res = {}
    for (let obj of objects) {
      res[obj.id] = data2.hasOwnProperty(obj.data[this._a_key_by_mode])
        ? data2[obj.data[this._a_key_by_mode]]
        : (array_mode ? [] : null)
    }
    return res
  }

}

module.exports = Relation