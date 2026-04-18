import Helpers from './helpers'
import QueryClause from './query-clause'
import type { ClauseOperand } from './types'

class QueryClauseGroup {
  clauses: Array<QueryClause | QueryClauseGroup>
  or_logic: boolean
  table: string | null

  constructor(clauses: Array<QueryClause | QueryClauseGroup>, or: boolean, table: string) {
    this.clauses = clauses
    this.or_logic = !!or
    this.table = Helpers.tableName(table)
  }

  and(field: string, value: unknown, operator = '='): this {
    return this.exp(field, value, operator, false)
  }

  andNot(field: string, value: unknown): this {
    return this.exp(field, value, '!=', false)
  }

  or(field: string, value: unknown, operator = '='): this {
    return this.exp(field, value, operator, true)
  }

  orNot(field: string, value: unknown): this {
    return this.exp(field, value, '!=', true)
  }

  exp(field: string, value: unknown, operator = '=', or = false): this {
    const a: ClauseOperand = { type: 'field', value: field }
    const b: ClauseOperand = { type: 'value', value: value }
    this._add(new QueryClause(a, b, operator, or, this.table))
    return this
  }

  fieldExp(field_a: string, field_b: string, operator = '='): this {
    const a: ClauseOperand = { type: 'field', value: field_a }
    const b: ClauseOperand = { type: 'field', value: field_b }
    this._add(new QueryClause(a, b, operator))
    return this
  }

  whereGroup(callback: (group: QueryClauseGroup) => void, or = false): this {
    const whereGroup = new (this.constructor as typeof QueryClauseGroup)([], or, this.table as string)
    callback.call(this, whereGroup)
    this._add(whereGroup)
    return this
  }

  _add(clause: QueryClause | QueryClauseGroup): this {
    this.clauses.push(clause)
    return this
  }

  addClause(clause: QueryClause | QueryClauseGroup): this {
    return this._add(clause)
  }

  build(params: unknown[], no_brackets?: boolean): string {
    let sql = ''
    if (!this.clauses.length) {
      return ''
    }
    for (const c of this.clauses) {
      if (sql.length) {
        sql += ` ${c.or_logic ? 'OR' : 'AND'} `
      }
      sql += c.build(params)
    }
    return no_brackets ? sql : `(${sql})`
  }
}

export default QueryClauseGroup
