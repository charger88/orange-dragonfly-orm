import type DeleteQuery from './delete-query'
import type InsertQuery from './insert-query'
import type QueryClauseGroup from './query-clause-group'
import type Relation from './relation'
import type SelectQuery from './select-query'
import type UpdateQuery from './update-query'

export type FieldFunctionObject = {
  distinct?: boolean
  /**
   * Injects a raw SQL fragment directly into the SELECT field list with no sanitization or escaping.
   * @warning Must only contain developer-authored SQL — never user-supplied data.
   * Use parameterized `?` placeholders via the query's `where*` methods for any runtime values.
   */
  raw?: string
  function?: string
  arguments?: (string | number)[]
  field?: string | number
  as?: string
}

/**
 * Valid JOIN types for {@link SelectQuery.joinTable} and {@link SelectQuery.joinTableCustom}.
 *
 * - `INNER` — rows matching in both tables (default equi-join)
 * - `LEFT` / `LEFT OUTER` — all rows from the left table, matched rows from the right (NULL if no match)
 * - `RIGHT` / `RIGHT OUTER` — all rows from the right table, matched rows from the left (NULL if no match)
 * - `FULL` / `FULL OUTER` — all rows from both tables (NULL where no match on either side)
 * - `CROSS` — cartesian product; produces every combination of rows; ON clause is optional
 */
export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS' | 'LEFT OUTER' | 'RIGHT OUTER' | 'FULL OUTER'

export type WhereOperator = '=' | '!=' | '<>' | '>' | '<' | '>=' | '<=' |
  'LIKE' | 'NOT LIKE' | 'MATCH' | 'NOT MATCH' | 'IN' | 'NOT IN' | 'IS' | 'IS NOT' | '&' | '|'

export type FullTextClauseFn = (operator: string, a: string, b: string) => string

export type ClauseOperand = {
  type?: 'field' | 'value'
  value?: unknown
}

export interface IActiveRecordInstance {
  data: Record<string, unknown>
  id: number | null
  relations: Record<string, unknown>
  isUnique(fields: string[], ignore_null?: boolean): Promise<boolean>
  rel(name: string, reload?: boolean): Promise<unknown>
  custom_rel_query(name: string, custom_specify_function?: ((query: SelectQuery) => void) | null, custom_select_params?: SelectOptions | null): Promise<unknown>
  resetRelations(relation?: string | null): this
  save(data?: Record<string, unknown> | null): Promise<this>
  remove(hard?: boolean): Promise<this>
  toString(): string
}

/**
 * Public SelectQuery surface returned by `IActiveRecordConstructor.selectQuery`.
 * Used as the return type of `IActiveRecordConstructor.selectQuery` to avoid
 * a circular dependency between `types.ts` and `select-query.ts`.
 * At runtime the returned object is always a full `SelectQuery` instance.
 */
export interface IQueryBuilder<T extends IActiveRecordInstance = IActiveRecordInstance> {
  whereOrNot(field: string, value: unknown): this
  whereAndNot(field: string, value: unknown): this
  whereOr(field: string, value: unknown): this
  whereAnd(field: string, value: unknown): this
  where(field: string, value: unknown, operator?: WhereOperator, or?: boolean): this
  whereGroup(callback: (group: QueryClauseGroup) => void, or?: boolean): this
  joinTable(join_type: JoinType, table_name: string, key: string, foreign_key: string, operator?: string, alias?: string | null): this
  joinTableCustom(join_type: JoinType, table_name: string, clause: QueryClauseGroup, alias?: string | null): this
  groupBy(field_name: string | number): this
  buildRawSQL(fields?: SelectFields, limit?: number | null, offset?: number, order?: OrderSpec, distinct?: boolean): { sql: string; params: unknown[] }
  select(options?: SelectOptions): Promise<T[]>
  selectOne(options?: SelectOptions): Promise<T | null>
  selectColumns(fields: SelectFields, options?: SelectOptions): Promise<Record<string, unknown>[]>
  selectRow(fields: SelectFields, options?: SelectOptions): Promise<Record<string, unknown> | null>
  total(id_key?: string | null): Promise<number>
  exists(id_key?: string | null): Promise<boolean>
}

export interface IActiveRecordConstructor<T extends IActiveRecordInstance = IActiveRecordInstance> {
  new(data?: Record<string, unknown>): T
  readonly id_key: string
  readonly table: string
  readonly name: string
  readonly special_fields: string[]
  readonly available_relations: Record<string, Relation>
  registerModel(model_class: IActiveRecordConstructor): IActiveRecordConstructor
  model(class_name: string): IActiveRecordConstructor
  resetRegisteredModels(): void
  insertQuery(): InsertQuery
  selectQuery(include_deleted?: boolean): IQueryBuilder<T>
  updateQuery(include_deleted?: boolean): UpdateQuery
  deleteQuery(include_deleted?: boolean): DeleteQuery
  loadRelations(objects: T[], relations?: string[] | null): Promise<T[]>
  find(id: unknown, include_deleted?: boolean): Promise<T | null>
  all(include_deleted?: boolean): Promise<T[]>
}

export type OrderFieldObject = {
  column: string
  values: unknown[]
  desc: boolean | string
}

export type OrderSpec = Record<string, boolean | string | OrderFieldObject>

export type SelectFields = '*' | Array<string | number | FieldFunctionObject>

export type SelectOptions = {
  /** @deprecated Pass columns as the first argument to `selectColumns()` or `selectRow()` instead. */
  fields?: SelectFields
  limit?: number | null
  offset?: number
  order?: OrderSpec
  distinct?: boolean
}

export type UpdateOptions = {
  limit?: number | null
  offset?: number
  order?: OrderSpec
}

export type DeleteOptions = {
  limit?: number | null
  offset?: number
  order?: OrderSpec
}

export type RelationMode = 'child' | 'children' | 'parent' | 'independent'
