import SelectQuery from './select-query'
import { OrangeDatabaseError } from './errors'
import type { IActiveRecordConstructor, IActiveRecordInstance, RelationMode, SelectOptions } from './types'

type RelationResult = Record<string | number, IActiveRecordInstance | IActiveRecordInstance[] | null>

class Relation {
  mode: RelationMode
  a: IActiveRecordConstructor
  a_key: string | null
  b: IActiveRecordConstructor
  b_key: string | null
  class_via: IActiveRecordConstructor | null
  via_a_key: string | null
  via_b_key: string | null
  specify_functions: Array<(query: SelectQuery) => void>
  select_params: SelectOptions

  constructor(mode: RelationMode, a: IActiveRecordConstructor, b: IActiveRecordConstructor, a_key: string | null = null, b_key: string | null = null) {
    this.mode = mode
    this.a = a
    this.b = b
    this.a_key = a_key
    this.b_key = b_key
    this.class_via = null
    this.via_a_key = null
    this.via_b_key = null
    this.specify_functions = []
    this.select_params = {}
  }

  clone(): Relation {
    const rel_obj = new (this.constructor as typeof Relation)(this.mode, this.a, this.b, this.a_key, this.b_key)
    rel_obj.class_via = this.class_via
    rel_obj.via_a_key = this.via_a_key
    rel_obj.via_b_key = this.via_b_key
    rel_obj.specify_functions = [...this.specify_functions]
    rel_obj.select_params = structuredClone(this.select_params)
    return rel_obj
  }

  /**
   * Declares a **has-one-child** relation: `this_class` owns exactly one `child_class` record.
   * The FK (`b_key`) lives on the child table and points back to `this_class`.
   * `selectForOne` / `loadRelations` return a **single** `IActiveRecordInstance | null`.
   *
   * Use this when a parent can have at most one child (e.g. User → Profile).
   * For one-to-many, use {@link Relation.children}.
   *
   * @param a_key - FK on `this_class` side (defaults to `this_class.id_key`).
   * @param b_key - FK on `child_class` side (defaults to `${this_class.table}_id`).
   */
  static child(this_class: IActiveRecordConstructor, child_class: IActiveRecordConstructor, a_key: string | null = null, b_key: string | null = null): Relation {
    return new this('child', this_class, child_class, a_key, b_key)
  }

  /**
   * Declares a **has-many-children** relation: `this_class` owns multiple `child_class` records.
   * The FK (`b_key`) lives on the child table and points back to `this_class`.
   * `selectForOne` / `loadRelations` return an **array** `IActiveRecordInstance[]` (empty if none).
   *
   * Use this for one-to-many (e.g. Brand → [CarModel, …]).
   * For a guaranteed single child, use {@link Relation.child}.
   *
   * @param a_key - FK on `this_class` side (defaults to `this_class.id_key`).
   * @param b_key - FK on `child_class` side (defaults to `${this_class.table}_id`).
   */
  static children(this_class: IActiveRecordConstructor, child_class: IActiveRecordConstructor, a_key: string | null = null, b_key: string | null = null): Relation {
    return new this('children', this_class, child_class, a_key, b_key)
  }

  /**
   * Declares a **belongs-to** relation: `this_class` holds the FK that references `parent_class`.
   * `selectForOne` / `loadRelations` return a **single** `IActiveRecordInstance | null`.
   *
   * @param a_key - FK on `this_class` side (defaults to `${parent_class.table}_id`).
   * @param b_key - PK on `parent_class` side (defaults to `parent_class.id_key`).
   */
  static parent(this_class: IActiveRecordConstructor, parent_class: IActiveRecordConstructor, a_key: string | null = null, b_key: string | null = null): Relation {
    return new this('parent', this_class, parent_class, a_key, b_key)
  }

  /**
   * Declares a **many-to-many** relation via a join table (`class_via`).
   * `selectForOne` / `loadRelations` return an **array** `IActiveRecordInstance[]`.
   *
   * Internally composes two relations:
   * 1. `children(class_a → class_via)` using `a_key` / `via_a_key`
   * 2. `parent(class_via → class_b)` using `via_b_key` / `b_key`
   *
   * @param via_a_key - FK on `class_via` pointing to `class_a` (defaults to `${class_a.table}_id`).
   * @param via_b_key - FK on `class_via` pointing to `class_b` (defaults to `${class_b.table}_id`).
   * @param a_key - PK on `class_a` side (defaults to `class_a.id_key`).
   * @param b_key - PK on `class_b` side (defaults to `class_b.id_key`).
   */
  static independent(class_a: IActiveRecordConstructor, class_b: IActiveRecordConstructor, class_via: IActiveRecordConstructor, via_a_key: string | null = null, via_b_key: string | null = null, a_key: string | null = null, b_key: string | null = null): Relation {
    const obj = new this('independent', class_a, class_b, a_key, b_key)
    obj.class_via = class_via
    obj.via_a_key = via_a_key
    obj.via_b_key = via_b_key
    return obj
  }

  async selectForMultiple(objects: IActiveRecordInstance[]): Promise<RelationResult> {
    return await (this.mode === 'independent' ? this._getIndependentData(objects) : this._getData(objects))
  }

  /**
   * Loads the relation for a single object.
   *
   * @note Records with `id` equal to `null` or `undefined` are considered unsaved.
   * For `child`, `children`, and `independent` relation modes, loading an unsaved
   * record throws because there is no primary key to query against.
   * `id = 0` is treated the same as `null` / `undefined` here — a record with PK 0
   * is considered unsaved by this library's convention.
   * The `parent` mode is exempt: the FK lives on the current record, not the DB,
   * so it can be resolved even before the record is persisted.
   */
  async selectForOne(object: IActiveRecordInstance): Promise<IActiveRecordInstance | IActiveRecordInstance[] | null> {
    if (!object.id && this.mode !== 'parent') throw new Error("This type of relation can't be loaded for not-saved object")
    const data = await this.selectForMultiple([object])
    const key = object.id as string | number
    if (!Object.hasOwn(data, key)) {
      return (this.mode === 'children' || this.mode === 'independent') ? [] : null
    }
    return data[key]
  }

  protected get _a_key_by_mode(): string {
    if (this.a_key) {
      return this.a_key
    }
    return this.mode === 'parent' ? `${this.b.table}_id` : this.a.id_key
  }

  protected get _b_key_by_mode(): string {
    if (this.b_key) {
      return this.b_key
    }
    return (this.mode === 'child' || this.mode === 'children') ? `${this.a.table}_id` : this.b.id_key
  }

  protected async _getIndependentData(objects: IActiveRecordInstance[]): Promise<RelationResult> {
    const relation_a = (this.constructor as typeof Relation).children(this.a, this.class_via!, this.a_key, this.via_a_key)
    const via_data = await relation_a.selectForMultiple(objects) as Record<string | number, IActiveRecordInstance[]>
    const relation_b = (this.constructor as typeof Relation).parent(this.class_via!, this.b, this.via_b_key, this.b_key)
    const b_data = await relation_b.selectForMultiple(
      Object.values(via_data).reduce((a: IActiveRecordInstance[], c) => a.concat(c), []),
    ) as Record<string | number, IActiveRecordInstance>
    return (this.constructor as typeof Relation)._getIndependentDataResult(via_data, b_data, objects)
  }

  protected static _getIndependentDataResult(
    via_data: Record<string | number, IActiveRecordInstance[]>,
    b_data: Record<string | number, IActiveRecordInstance>,
    objects: IActiveRecordInstance[],
  ): RelationResult {
    const res: RelationResult = {}
    for (const obj of objects) {
      res[obj.id as string | number] = []
    }
    for (const v_key of Object.keys(via_data)) {
      for (const via_obj of via_data[v_key]) {
        if (b_data[via_obj.id as string | number]) {
          (res[v_key] as IActiveRecordInstance[]).push(b_data[via_obj.id as string | number])
        }
      }
    }
    return res
  }

  protected async _getData(objects: IActiveRecordInstance[]): Promise<RelationResult> {
    const ids = objects.map(obj => obj.data[this._a_key_by_mode])
    for (const id of ids) {
      if (id === undefined) {
        throw new OrangeDatabaseError(`Relation field "${this._a_key_by_mode}" is missing from object data`)
      }
    }
    const data = await this._getDataBuildQuery(ids).select(this.select_params) as IActiveRecordInstance[]
    return this._getDataResult(data, objects)
  }

  protected _getDataBuildQuery(ids: unknown[]): SelectQuery {
    const q = (this.b.selectQuery() as unknown as SelectQuery).whereAnd(this._b_key_by_mode, ids)
    for (const sf of this.specify_functions) {
      sf(q)
    }
    return q
  }

  protected _getDataResult(data: IActiveRecordInstance[], objects: IActiveRecordInstance[]): RelationResult {
    const array_mode = this.mode === 'children'
    const data2: Record<string | number, IActiveRecordInstance | IActiveRecordInstance[]> = {}
    for (const r of data) {
      const key = r.data[this._b_key_by_mode] as string | number
      if (array_mode) {
        if (!Object.hasOwn(data2, key)) {
          data2[key] = []
        }
        (data2[key] as IActiveRecordInstance[]).push(r)
      } else {
        if (!Object.hasOwn(data2, key)) {
          data2[key] = r
        }
      }
    }
    const res: RelationResult = {}
    for (const obj of objects) {
      const a_val = obj.data[this._a_key_by_mode] as string | number
      res[obj.id as string | number] = Object.hasOwn(data2, a_val)
        ? data2[a_val]
        : (array_mode ? [] : null)
    }
    return res
  }

  specify(callback: (query: SelectQuery) => void, merge = false): this {
    this.specify_functions = merge ? this.specify_functions.concat(callback) : [callback]
    return this
  }

  params(params: SelectOptions, merge = false): this {
    this.select_params = merge ? Object.assign(this.select_params, params) : params
    return this
  }
}

export default Relation
