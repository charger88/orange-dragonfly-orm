import InsertQuery from './insert-query'
import SelectQuery from './select-query'
import UpdateQuery from './update-query'
import DeleteQuery from './delete-query'
import type Relation from './relation'
import { OrangeDatabaseInputError } from './errors'
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

  /** Clears all registered models. Useful for test isolation. */
  static resetRegisteredModels(): void {
    this.registered_models = {}
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

  /**
   * Derives the table name from the class name by converting CamelCase to snake_case.
   * Consecutive uppercase runs are kept together (e.g. `HTMLParser` → `html_parser`).
   *
   * **Minification warning**: this getter relies on `this.name`, which bundlers/minifiers
   * may shorten to a single character or empty string. If you bundle application code that
   * subclasses `ActiveRecord`, ensure your bundler preserves class names (e.g. tsup/esbuild
   * `keepNames: true`), or override this getter in each model to return a literal string.
   */
  static get table(): string {
    const class_name = this.name
    let table_name = ''
    const is_upper = class_name.split('').map(x => /[A-Z0-9]/.test(x))
    is_upper.push(true)
    for (let i = 0; i < class_name.length; i++) {
      if (i && is_upper[i] && !(is_upper[i - 1] && is_upper[i + 1])) {
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

  protected static _prepareFilteredQuery(query: SelectQuery, include_deleted: boolean): SelectQuery
  protected static _prepareFilteredQuery(query: UpdateQuery, include_deleted: boolean): UpdateQuery
  protected static _prepareFilteredQuery(query: DeleteQuery, include_deleted: boolean): DeleteQuery
  protected static _prepareFilteredQuery(query: SelectQuery | UpdateQuery | DeleteQuery, include_deleted: boolean): SelectQuery | UpdateQuery | DeleteQuery {
    if (this.special_fields.includes('deleted_at') && !include_deleted) {
      query.whereAnd('deleted_at', null)
    }
    return query
  }

  /**
   * Returns `true` when no other record in the table has the same values for `fields`.
   * The current record (by `id_key`) is excluded from the check when it has an id set.
   *
   * @note `id = 0` is treated as unsaved (no id), so records with PK 0 are **not** excluded
   * from the uniqueness check. This is consistent with `save()` treating id 0 as a new record.
   *
   * @param fields - Column names that together must be unique.
   * @param ignore_null - When `true`, returns `true` immediately if any of the given
   *   fields is `null` on this instance (treat null as always-unique).
   */
  async isUnique(fields: string[], ignore_null = false): Promise<boolean> {
    const q = this._cls.selectQuery()
    for (const field of fields) {
      if ((this.data[field] === null) && ignore_null) {
        return true
      }
      q.whereAnd(field, this.data[field])
    }
    if (this.id) {
      q.whereAndNot(this._cls.id_key, this.id)
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

  /**
   * The record's primary key value, taken from `this.data[id_key]`.
   *
   * Returns `null` when the key is absent from `data`.
   *
   * **Convention**: a falsy id (including `0`) is treated as "unsaved" throughout
   * the library. `save()` will INSERT rather than UPDATE, `remove()` will no-op,
   * and relation loading (for non-`parent` modes) will throw. Do not use `0` as a
   * real primary key value if you rely on these lifecycle methods.
   */
  get id(): unknown {
    return Object.hasOwn(this.data, this._cls.id_key)
      ? this.data[this._cls.id_key]
      : null
  }

  set id(value: unknown) {
    this.data[this._cls.id_key] = value
  }

  private get _cls(): typeof ActiveRecord {
    return this.constructor as typeof ActiveRecord
  }

  protected _get_relation_object(name: string): Relation {
    if (!Object.hasOwn(this._cls.available_relations, name)) {
      throw new Error(`Relation "${name}" is not defined in class "${this._cls.name}"`)
    }
    return this._cls.available_relations[name]
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

  protected async _preSave(_is_new = false): Promise<void> {}

  /**
   * Persists the record. Inserts if `this.id` is falsy; updates otherwise.
   *
   * @param data - Optional fields to merge into `this.data` before saving.
   * Keys prefixed with `':'` are treated as transient/virtual fields and are
   * stripped before the database write (they are never persisted).
   *
   * Auto-managed fields (when listed in `special_fields`):
   * - `updated_at` — set to the current Unix timestamp on every save.
   * - `created_at` — set to the current Unix timestamp on insert only.
   * - `deleted_at` — initialized to `null` on insert.
   *
   * These fields are written to `this.data` **before** the DB call. If the DB write
   * fails the instance retains the updated timestamps, so the in-memory state may be
   * ahead of the database until the next successful save. This is intentional — it
   * keeps the pre-save hook's view of `this.data` consistent with what will be sent.
   *
   * Lifecycle hooks are called in order: `_preSave` → DB write → `_postSave`.
   *
   * @note `id = 0` is treated as falsy — a record with PK 0 is always INSERTed,
   * never UPDATEd. Avoid using 0 as a real primary key if you rely on `save()`.
   */
  async save(data: Record<string, unknown> | null = null): Promise<this> {
    const cls = this._cls
    if (data && Object.hasOwn(data, cls.id_key)) {
      if (!this.id || data[cls.id_key] !== this.id) {
        throw new OrangeDatabaseInputError(`Field "${cls.id_key}" must not be passed to save() — it is managed automatically`)
      }
    }
    if (data) {
      this.data = Object.assign(this.data, data)
    }
    const is_new = !this.id
    await this._preSave(is_new)
    Object.keys(this.data).filter(k => (k[0] === ':')).forEach(k => {
      delete this.data[k]
    })
    if (cls.special_fields.includes('updated_at')) {
      this.data['updated_at'] = cls._now()
    }
    if (cls.special_fields.includes('created_at') && is_new) {
      this.data['created_at'] = cls._now()
    }
    if (cls.special_fields.includes('deleted_at') && is_new) {
      this.data['deleted_at'] = null
    }
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

  protected async _postSave(_is_new = false): Promise<void> {}

  protected async _preRemove(): Promise<void> {}

  /**
   * Deletes or soft-deletes the record.
   *
   * - **Soft delete** (default when `deleted_at` is in `special_fields`): sets
   *   `deleted_at` to the current Unix timestamp.
   * - **Hard delete**: issues a `DELETE` statement. Forced when `hard = true` or
   *   when `deleted_at` is not in `special_fields`.
   *
   * @note If `this.id` is falsy (including `0`) the method is a no-op — no DB
   * query is executed. After a successful remove, `this.id` is set to `null`.
   */
  async remove(hard?: boolean): Promise<this> {
    await this._preRemove()
    const cls = this._cls
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

  protected async _postRemove(): Promise<void> {}

  /**
   * Returns the current time as a **Unix timestamp in seconds** (integer).
   * Auto-managed date fields (`created_at`, `updated_at`, `deleted_at`) are stored
   * as integers, not datetime strings. Map your database columns accordingly (e.g. `INT`).
   */
  protected static _now(): number {
    return Math.floor((new Date()).getTime() / 1000)
  }

  toString(): string {
    return JSON.stringify(this.data)
  }
}

export default ActiveRecord
