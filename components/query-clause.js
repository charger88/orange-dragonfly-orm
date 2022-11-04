const Helpers = require('./helpers')
const RawSQL = require('./raw-sql')

/**
 * SQL clause (like "id = 1")
 */
class QueryClause {

  a = null
  b = null
  operator = null
  or_logic = false
  table = null

  /**
   * @param a
   * @param b
   * @param operator
   * @param or
   * @param table
   */
  constructor (a, b, operator, or, table) {
    this.a = a || {}
    this.b = b || {}
    this.operator = operator
    this.or_logic = !!or
    this.table = table
  }

  /**
   * Builds SQL of the clause's operand
   * @param operand
   * @param params
   * @return {*}
   */
  buildOperand (operand, params) {
    if (operand.value instanceof RawSQL) {
      return operand.value.SQL
    }
    if (operand.type === 'field') {
      let table = this.table
      let value = operand.value
      if (value.includes('.')) {
        const op_value = value.split('.', 2)
        table = op_value[0]
        value = op_value[1]
      }
      if (!value.match('^([A-Za-z0-9\\_]+)$')) {
        throw new Error(`Incorrect field name: "${value}"`)
      }
      return Helpers.fieldName(value, table)
    } else {
      if (operand.value === null) {
        return 'NULL'
      } else if (Array.isArray(operand.value)) {
        const q = [... new Set(operand.value)].map(v => {
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

  /**
   * Builds SQL of the clause
   * @param params
   * @return {string}
   */
  build (params) {
    let expression
    let a = this.buildOperand(this.a, params)
    let b = this.buildOperand(this.b, params)
    let operator = this.operator
    if (b === 'NULL') {
      if (['=', 'IS'].includes(operator)) {
        operator = 'IS'
      } else if (['!=', '<>', 'IS NOT'].includes(operator)) {
        operator = 'IS NOT'
      } else {
        throw new Error(`Null value is incompatible with operator "${operator}"`)
      }
    } else if (b.startsWith('(') && b.endsWith(')')) {
      if (['=', 'IN'].includes(operator)) {
        operator = 'IN'
      } else if (['!=', '<>', 'NOT IN'].includes(operator)) {
        operator = 'NOT IN'
      } else {
        throw new Error(`Array value is incompatible with operator "${operator}"`)
      }
    }
    if (!['IN', 'NOT IN', 'IS', 'IS NOT', '=', '!=', '<>', '>', '<', '>=', '<=', 'LIKE', '&', '|'].includes(operator)) {
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
    expression = `${a} ${operator} ${b}`
    return expression
  }

}

module.exports = QueryClause