import Helpers from './helpers'
import RawSQL from './raw-sql'
import type { ClauseOperand } from './types'

class QueryClause {
  a: ClauseOperand
  b: ClauseOperand
  operator: string
  or_logic: boolean
  table: string | null

  constructor(a: ClauseOperand | null, b: ClauseOperand | null, operator: string, or?: boolean, table?: string | null) {
    this.a = a || {}
    this.b = b || {}
    this.operator = operator
    this.or_logic = !!or
    this.table = table || null
  }

  protected buildOperand(operand: ClauseOperand, params: unknown[]): string {
    if (operand.value instanceof RawSQL) {
      return operand.value.SQL
    }
    if (operand.type === 'field') {
      let table = this.table
      let value = operand.value as string
      if (value.includes('.')) {
        const op_value = value.split('.', 2)
        table = op_value[0]
        value = op_value[1]
      }
      if (Helpers.ESCAPE_CHAR) {
        if (value.startsWith(Helpers.ESCAPE_CHAR) && value.endsWith(Helpers.ESCAPE_CHAR)) {
          value = value.slice(1, -1)
        }
      }
      if (!value.match('^([A-Za-z0-9\\_]+)$')) {
        throw new Error(`Incorrect field name: "${value}"`)
      }
      return String(Helpers.fieldName(value, table))
    } else {
      if (operand.value === null || operand.value === undefined) {
        return 'NULL'
      } else if (Array.isArray(operand.value)) {
        const q = [...new Set(operand.value)].map(v => {
          params.push(v)
          return '?'
        }).join(', ')
        return `(${q})`
      } else {
        params.push(operand.value)
        return '?'
      }
    }
  }

  build(params: unknown[]): string {
    let expression: string
    let new_params: unknown[] = []
    let a = this.buildOperand(this.a, new_params)
    let b = this.buildOperand(this.b, new_params)
    let operator = this.operator
    const b_is_raw = this.b.value instanceof RawSQL
    if (!b_is_raw && b === 'NULL') {
      if (['=', 'IS'].includes(operator)) {
        operator = 'IS'
      } else if (['!=', '<>', 'IS NOT'].includes(operator)) {
        operator = 'IS NOT'
      } else {
        throw new Error(`Null value is incompatible with operator "${operator}"`)
      }
    } else if (!b_is_raw && b.startsWith('(') && b.endsWith(')')) {
      if (['=', 'IN'].includes(operator)) {
        operator = 'IN'
      } else if (['!=', '<>', 'NOT IN'].includes(operator)) {
        operator = 'NOT IN'
      } else {
        throw new Error(`Array value is incompatible with operator "${operator}"`)
      }
    }
    if (!['IN', 'NOT IN', 'IS', 'IS NOT', '=', '!=', '<>', '>', '<', '>=', '<=', 'LIKE', 'NOT LIKE', 'MATCH', 'NOT MATCH', '&', '|'].includes(operator)) {
      throw new Error(`Incorrect operator "${operator}"`)
    }
    if (b === '()') {
      if (operator === 'IN') {
        a = '1'
        b = '1'
        operator = '!='
      } else if (operator === 'NOT IN') {
        a = '1'
        b = '1'
        operator = '='
      }
    }
    if (['MATCH', 'NOT MATCH'].includes(operator)) {
      if (Helpers.FULL_TEXT_CLAUSE_FN) {
        expression = Helpers.FULL_TEXT_CLAUSE_FN(operator, a, b)
        // Falls through to params.push(...new_params) to include the bound value
      } else {
        // No FULL_TEXT_CLAUSE_FN configured — fall back to LIKE/NOT LIKE.
        const like_operator = operator === 'MATCH' ? 'LIKE' : 'NOT LIKE'
        new_params = []
        this.buildOperand(this.a, new_params)
        new_params.push(`%${this.b.value}%`)
        expression = `${a} ${like_operator} ?`
      }
    } else {
      expression = `${a} ${operator} ${b}`
    }
    params.push(...new_params)
    return expression
  }
}

export default QueryClause
