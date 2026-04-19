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

export type FullTextClauseFn = (operator: string, a: string, b: string) => string

export type ClauseOperand = {
  type?: 'field' | 'value'
  value?: unknown
}

/**
 * Minimal interface for a query builder that supports WHERE clauses.
 * Used as the return type of `IActiveRecordConstructor.selectQuery` to avoid
 * a circular dependency between `types.ts` and `select-query.ts`.
 * At runtime the returned object is always a full `SelectQuery` instance.
 */
export interface IQueryBuilder {
  whereAnd(field: string, value: unknown): this
}

export interface IActiveRecordInstance {
  data: Record<string, unknown>
  id: unknown
  relations: Record<string, unknown>
}

export interface IActiveRecordConstructor {
  new(data?: Record<string, unknown>): IActiveRecordInstance
  readonly id_key: string
  readonly table: string
  readonly name: string
  selectQuery(include_deleted?: boolean): IQueryBuilder
  loadRelations(objects: IActiveRecordInstance[], relations?: string[] | null): Promise<IActiveRecordInstance[]>
}

export type OrderFieldObject = {
  column: string
  values: unknown[]
  desc: boolean | string
}

export type OrderSpec = Record<string, boolean | string | OrderFieldObject>

export type SelectFields = '*' | Array<string | number | FieldFunctionObject>

export type SelectOptions = {
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
