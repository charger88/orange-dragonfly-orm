import Helpers from './helpers'
import QueryClause from './query-clause'
import type { ClauseOperand } from './types'

class QueryClauseGroup {
  clauses: Array<QueryClause | QueryClauseGroup>
  or_logic: boolean
  table: string

  constructor(clauses: Array<QueryClause | QueryClauseGroup>, or: boolean, table: string) {
    this.clauses = clauses
    this.or_logic = !!or
    this.table = Helpers.tableName(table)
  }

  /**
   * Appends an AND equality condition: `… AND field = value`.
   * Shorthand for `exp(field, value, '=', false)`.
   */
  and(field: string, value: unknown, operator = '='): this {
    return this.exp(field, value, operator, false)
  }

  /**
   * Appends an AND NOT condition: `… AND field != value`.
   * Shorthand for `exp(field, value, '!=', false)`.
   */
  andNot(field: string, value: unknown): this {
    return this.exp(field, value, '!=', false)
  }

  /**
   * Appends an OR equality condition: `… OR field = value`.
   * Shorthand for `exp(field, value, '=', true)`.
   */
  or(field: string, value: unknown, operator = '='): this {
    return this.exp(field, value, operator, true)
  }

  /**
   * Appends an OR NOT condition: `… OR field != value`.
   * Shorthand for `exp(field, value, '!=', true)`.
   */
  orNot(field: string, value: unknown): this {
    return this.exp(field, value, '!=', true)
  }

  /**
   * Appends a WHERE condition with explicit operator and AND/OR logic.
   * The `and` / `or` / `andNot` / `orNot` methods are all wrappers around this one.
   *
   * @param field - Column name (optionally qualified as `table.column`).
   * @param value - Bound parameter value.
   * @param operator - SQL comparison operator (default `'='`).
   * @param or - When `true` the clause is joined with `OR`; otherwise `AND`.
   */
  exp(field: string, value: unknown, operator = '=', or = false): this {
    const a: ClauseOperand = { type: 'field', value: field }
    const b: ClauseOperand = { type: 'value', value: value }
    this.addClause(new QueryClause(a, b, operator, or, this.table))
    return this
  }

  fieldExp(field_a: string, field_b: string, operator = '='): this {
    const a: ClauseOperand = { type: 'field', value: field_a }
    const b: ClauseOperand = { type: 'field', value: field_b }
    this.addClause(new QueryClause(a, b, operator))
    return this
  }

  whereGroup(callback: (group: QueryClauseGroup) => void, or = false): this {
    const whereGroup = new (this.constructor as typeof QueryClauseGroup)([], or, this.table as string)
    callback(whereGroup)
    this.addClause(whereGroup)
    return this
  }

  addClause(clause: QueryClause | QueryClauseGroup): this {
    this.clauses.push(clause)
    return this
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
