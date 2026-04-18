import InsertQuery from './insert-query'
import SelectQuery from './select-query'
import UpdateQuery from './update-query'
import DeleteQuery from './delete-query'
import type Relation from './relation'
import type { IActiveRecordConstructor, IActiveRecordInstance, SelectOptions } from './types'

class ActiveRecord implements IActiveRecordInstance {
  static registered_models: Record<string, IActiveRecordConstructor> = {}

  data: Record<string, unknown>
  relations: Record<string, unknown>

  constructor(data?: Record<string, unknown>) {
    this.data = data ? Object.assign({}, data) : {}
    this.relations = {}
  }

  static registerModel(model_class: IActiveRecordConstructor): typeof ActiveRecord {
    this.registered_models[model_class.name] = model_class
    return this
  }

  static model(class_name: string): IActiveRecordConstructor {
    if (!Object.hasOwn(this.registered_models, class_name)) {
      throw new Error(`Model ${class_name} is not registered`)
    }
    return this.registered_models[class_name]
  }

  static get id_key(): string {
    return 'id'
  }

  static get special_fields(): string[] {
    return []
  }

  static get available_relations(): Record<string, Relation> {
    return {}
  }

  static get table(): string {
    const class_name = this.name
    let table_name = ''
    const uppercase_status: Array<RegExpMatchArray | null | boolean> = class_name.split('').map(x => x.match('[A-Z0-9]'))
    uppercase_status.push(true)
    for (let i = 0; i < class_name.length; i++) {
      if (i && uppercase_status[i] && !(uppercase_status[i - 1] && uppercase_status[i + 1])) {
        table_name += '_'
      }
      table_name += class_name[i]
    }
    return table_name.toLowerCase()
  }

  static insertQuery(): InsertQuery {
    return new InsertQuery(this.table, this as unknown as IActiveRecordConstructor)
  }

  static selectQuery(include_deleted = false): SelectQuery {
    return this._prepareFilteredQuery(new SelectQuery(this.table, this as unknown as IActiveRecordConstructor), include_deleted)
  }

  static updateQuery(include_deleted = false): UpdateQuery {
    return this._prepareFilteredQuery(new UpdateQuery(this.table, this as unknown as IActiveRecordConstructor), include_deleted)
  }

  static deleteQuery(include_deleted = false): DeleteQuery {
    return this._prepareFilteredQuery(new DeleteQuery(this.table, this as unknown as IActiveRecordConstructor), include_deleted)
  }

  static _prepareFilteredQuery(query: SelectQuery, include_deleted: boolean): SelectQuery
  static _prepareFilteredQuery(query: UpdateQuery, include_deleted: boolean): UpdateQuery
  static _prepareFilteredQuery(query: DeleteQuery, include_deleted: boolean): DeleteQuery
  static _prepareFilteredQuery(query: SelectQuery | UpdateQuery | DeleteQuery, include_deleted: boolean): SelectQuery | UpdateQuery | DeleteQuery {
    if (this.special_fields.includes('deleted_at') && !include_deleted) {
      query.whereAnd('deleted_at', null)
    }
    return query
  }

  async isUnique(fields: string[], ignore_null = false): Promise<boolean> {
    const q = (this.constructor as typeof ActiveRecord).selectQuery()
    for (const field of fields) {
      if ((this.data[field] === null) && ignore_null) {
        return true
      }
      q.whereAnd(field, this.data[field])
    }
    if (this.id) {
      q.whereAndNot((this.constructor as typeof ActiveRecord).id_key, this.id)
    }
    return !(await q.selectOne())
  }

  static async loadRelations(objects: IActiveRecordInstance[], relations: string[] | null = null): Promise<IActiveRecordInstance[]> {
    const sub_relations: Record<string, string[]> = {}
    if (relations === null) {
      relations = Object.keys(this.available_relations)
    } else {
      for (const rel_name of relations) {
        if (rel_name.includes(':')) {
          const parts = rel_name.split(':')
          if (!Object.hasOwn(sub_relations, parts[0])) {
            sub_relations[parts[0]] = []
          }
          sub_relations[parts[0]].push(parts.slice(1).join(':'))
        }
      }
      relations = relations.filter(r => !r.includes(':'))
    }
    for (const rel_name of relations) {
      if (!Object.hasOwn(this.available_relations, rel_name)) {
        throw new Error(`Relation ${rel_name} does not exist in model ${this.name}`)
      }
    }
    await Promise.all(relations.map(async rel_name => {
      const res = await this.available_relations[rel_name].selectForMultiple(objects)
      if (Object.hasOwn(sub_relations, rel_name)) {
        const nested = Object.values(res)
          .reduce((a: IActiveRecordInstance[], c) => a.concat(Array.isArray(c) ? c : [c as IActiveRecordInstance]), [])
          .filter((r): r is IActiveRecordInstance => r !== null)
        await this.available_relations[rel_name].b!.loadRelations(nested, sub_relations[rel_name])
      }
      for (const object of objects) {
        object.relations[rel_name] = res[object.id as string | number]
      }
    }))
    return objects
  }

  static async find(id: unknown, include_deleted = false): Promise<IActiveRecordInstance | null> {
    return await this.selectQuery(include_deleted).whereAnd(this.id_key, id).selectOne() as IActiveRecordInstance | null
  }

  static async all(include_deleted = false): Promise<IActiveRecordInstance[]> {
    return await this.selectQuery(include_deleted).select() as IActiveRecordInstance[]
  }

  get id(): unknown {
    return Object.hasOwn(this.data, (this.constructor as typeof ActiveRecord).id_key)
      ? this.data[(this.constructor as typeof ActiveRecord).id_key]
      : null
  }

  set id(value: unknown) {
    this.data[(this.constructor as typeof ActiveRecord).id_key] = value
  }

  _get_relation_object(name: string): Relation {
    if (!Object.hasOwn((this.constructor as typeof ActiveRecord).available_relations, name)) {
      throw new Error(`Relation "${name}" is not defined in class "${(this.constructor as typeof ActiveRecord).name}"`)
    }
    return (this.constructor as typeof ActiveRecord).available_relations[name]
  }

  async rel(name: string, reload = false): Promise<unknown> {
    if (reload || !Object.hasOwn(this.relations, name)) {
      this.relations[name] = await this._get_relation_object(name).selectForOne(this)
    }
    return this.relations[name]
  }

  async custom_rel_query(name: string, custom_specify_function: ((query: SelectQuery) => void) | null = null, custom_select_params: SelectOptions | null = null): Promise<unknown> {
    const rel_obj = this._get_relation_object(name).clone()
    if (custom_specify_function) rel_obj.specify(custom_specify_function, true)
    if (custom_select_params) rel_obj.params(custom_select_params, true)
    return await rel_obj.selectForOne(this)
  }

  resetRelations(relation: string | null = null): this {
    if (relation === null) {
      this.relations = {}
    } else if (Object.hasOwn(this.relations, relation)) {
      delete this.relations[relation]
    }
    return this
  }

  async _preSave(_is_new = false): Promise<void> {}

  async save(data: Record<string, unknown> | null = null): Promise<this> {
    if (data) {
      this.data = Object.assign(this.data, data)
    }
    Object.keys(this.data).filter(k => (k[0] === ':')).forEach(k => {
      delete this.data[k]
    })
    const cls = this.constructor as typeof ActiveRecord
    if (cls.special_fields.includes('updated_at')) {
      this.data['updated_at'] = cls._now()
    }
    if (cls.special_fields.includes('created_at') && !this.id) {
      this.data['created_at'] = cls._now()
    }
    if (cls.special_fields.includes('deleted_at') && !this.id) {
      this.data['deleted_at'] = null
    }
    const is_new = !this.id
    await this._preSave(is_new)
    const saveData = Object.assign({}, this.data)
    if (Object.hasOwn(saveData, cls.id_key)) {
      delete saveData[cls.id_key]
    }
    if (!is_new) {
      await cls.updateQuery().whereAnd(cls.id_key, this.id).update(saveData)
    } else {
      this.id = await cls.insertQuery().insertOne(saveData)
    }
    await this._postSave(is_new)
    return this
  }

  async _postSave(_is_new = false): Promise<void> {}

  async _preRemove(): Promise<void> {}

  async remove(hard?: boolean): Promise<this> {
    await this._preRemove()
    const cls = this.constructor as typeof ActiveRecord
    if (this.id) {
      if (hard || !cls.special_fields.includes('deleted_at')) {
        await cls.deleteQuery()
          .whereAnd(cls.id_key, this.id)
          .remove()
      } else {
        await cls.updateQuery()
          .whereAnd(cls.id_key, this.id)
          .update({ 'deleted_at': cls._now() })
      }
    }
    await this._postRemove()
    this.id = null
    return this
  }

  async _postRemove(): Promise<void> {}

  static _now(): number {
    return Math.floor((new Date()).getTime() / 1000)
  }

  toString(): string {
    return JSON.stringify(this.data)
  }
}

export default ActiveRecord
