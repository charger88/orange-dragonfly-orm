import type { FieldFunctionObject, FullTextClauseFn } from './types'

class Helpers {
  private static _RESERVED_WORDS: string[] | undefined
  private static _NAME_ESCAPE_CHAR: string | undefined
  private static _FULL_TEXT_CLAUSE_FN: FullTextClauseFn | null | undefined

  static get RESERVED_WORDS(): string[] {
    return this._RESERVED_WORDS || []
  }

  static set RESERVED_WORDS(value: string[]) {
    this._RESERVED_WORDS = value.map(v => v.toUpperCase())
  }

  static get ESCAPE_CHAR(): string {
    return this._NAME_ESCAPE_CHAR || ''
  }

  static set ESCAPE_CHAR(value: string) {
    this._NAME_ESCAPE_CHAR = value
  }

  static get FULL_TEXT_CLAUSE_FN(): FullTextClauseFn | null {
    return this._FULL_TEXT_CLAUSE_FN || null
  }

  static set FULL_TEXT_CLAUSE_FN(value: FullTextClauseFn | null) {
    this._FULL_TEXT_CLAUSE_FN = value
  }

  static tableName(table: string, allow_escape = false): string {
    if (allow_escape && this.ESCAPE_CHAR) {
      if (table.startsWith(this.ESCAPE_CHAR)) {
        table = table.slice(1)
      }
      if (table.endsWith(this.ESCAPE_CHAR)) {
        table = table.slice(0, -1)
      }
    }
    if (!table.match('^([A-Za-z0-9\\_]+)$')) {
      throw new Error(`Incorrect table name: "${table}". This library only allows latin letters, digits and underscores in table name.`)
    }
    if (allow_escape && this.RESERVED_WORDS.includes(table.toUpperCase())) {
      table = `${this.ESCAPE_CHAR}${table}${this.ESCAPE_CHAR}`
    }
    return table
  }

  static functionName(function_name: string): string {
    if (!function_name.match('^([A-Za-z0-9\\_]+)$')) {
      throw new Error(`Incorrect function name: "${function_name}"`)
    }
    return function_name
  }

  static fieldName(
    field: string | number | FieldFunctionObject,
    table: string | null = null,
    allow_number = false,
    allow_function = false,
  ): string | number {
    let f: string | number | FieldFunctionObject = field

    if (allow_number) {
      if (typeof f === 'number' && Number.isInteger(f)) {
        return f
      }
      if (typeof f === 'string' && f.match('^([0-9]+)$')) {
        return parseInt(f, 10)
      }
    }

    if (typeof f === 'number' && Number.isInteger(f)) {
      f = f.toString()
    }

    if (allow_function && typeof f === 'object') {
      const fieldObj = f
      let v = ''
      const $distinct = (fieldObj.distinct) ? 'DISTINCT ' : ''
      if ('raw' in fieldObj && fieldObj.raw !== undefined) {
        v = fieldObj.raw
      } else if ('function' in fieldObj && fieldObj.function !== undefined) {
        v += this.functionName(fieldObj.function)
        if ('arguments' in fieldObj && fieldObj.arguments !== undefined) {
          v += `(${fieldObj.arguments.map(fa => this.fieldName(fa, table)).join(', ')})`
        } else if ('field' in fieldObj && fieldObj.field !== undefined) {
          v += `(${$distinct}${this.fieldName(fieldObj.field, table)})`
        }
      } else if ('field' in fieldObj && fieldObj.field !== undefined) {
        v += `${$distinct}${this.fieldName(fieldObj.field, table)}`
      } else {
        throw new Error('Incorrect field - object is provided, but "function" and "field" are missing.')
      }
      if ('as' in fieldObj && fieldObj.as !== undefined) {
        v += ` as ${this.fieldName(fieldObj.as)}`
      }
      return v
    }

    const fieldStr = f as string
    let resolvedTable = table
    let resolvedField = fieldStr

    if (fieldStr.includes('.')) {
      const parts = fieldStr.split('.')
      if (parts.length > 2) {
        throw new Error(`Incorrect field name: "${fieldStr}". Too many dots.`)
      }
      resolvedTable = parts[0]
      resolvedField = parts[1]
    }

    if (resolvedTable !== null) {
      resolvedTable = this.tableName(resolvedTable, true)
    }

    if (!resolvedField.match('^([A-Za-z0-9\\_\\*]+)$')) {
      throw new Error(`Incorrect field name: "${resolvedField}". This library only allows latin letters, digits and underscores in fields/columns name.`)
    }

    if (resolvedField && this.RESERVED_WORDS.includes(resolvedField.toUpperCase())) {
      resolvedField = `${this.ESCAPE_CHAR}${resolvedField}${this.ESCAPE_CHAR}`
    }

    return resolvedTable ? `${resolvedTable}.${resolvedField}` : resolvedField
  }

  static prepareValue(v: unknown): unknown {
    return (v !== null) && ((typeof v) === 'object') ? JSON.stringify(v) : v
  }
}

export default Helpers
