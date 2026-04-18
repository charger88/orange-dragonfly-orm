export type FieldFunctionObject = {
  distinct?: boolean
  raw?: string
  function?: string
  arguments?: (string | number)[]
  field?: string | number
  as?: string
}

export type FullTextClauseFn = (operator: string, a: string, b: string) => string

export type ClauseOperand = {
  type?: string
  value?: unknown
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
