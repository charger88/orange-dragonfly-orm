class Helpers {
  static get RESERVED_WORDS() {
    return this._RESERVED_WORDS || []
  }

  static set RESERVED_WORDS(value) {
    this._RESERVED_WORDS = value.map(v => v.toUpperCase())
  }

  static get ESCAPE_CHAR() {
    return this._NAME_ESCAPE_CHAR || ''
  }

  static set ESCAPE_CHAR(value) {
    this._NAME_ESCAPE_CHAR = value
  }

  /**
   * Validates table name
   * @param table
   * @param allow_escape
   * @returns {*}
   */
  static tableName (table, allow_escape = false) {
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

  /**
   * Validates SQL function name
   * @param function_name
   * @returns {*}
   */
  static functionName (function_name) {
    if (!function_name.match('^([A-Za-z0-9\\_]+)$')) {
      throw new Error(`Incorrect function name: "${function_name}"`)
    }
    return function_name
  }

  /**
   * Validates field (column) name
   * @param field
   * @param table
   * @param allow_number
   * @param allow_function
   * @returns {*}
   */
  static fieldName (field, table = null, allow_number = false, allow_function = false) {
    if (Number.isInteger(field)) {
      field = field.toString()
    }
    if (allow_function && (typeof field === 'object')) {
      let v = ""
      const $distinct = field.hasOwnProperty('distinct') && field['distinct'] ? 'DISTINCT ' : ''
      if (field.hasOwnProperty('raw')) {
        v = field['raw']
      } else if (field.hasOwnProperty('function')) {
        v += this.functionName(field['function'])
        if (field.hasOwnProperty('arguments')) {
          v += `(${field['arguments'].map(f => this.fieldName(f, table)).join(', ')})`
        } else if (field.hasOwnProperty('field')) {
          v += `(${$distinct}${this.fieldName(field['field'], table)})`
        }
      } else if (field.hasOwnProperty('field')) {
        v += `${$distinct}${this.fieldName(field['field'], table)}`
      } else {
        throw new Error('Incorrect field - object is provided, but "function" and "field" are missing.')
      }
      if (field.hasOwnProperty('as')) {
        v += ` as ${this.fieldName(field['as'])}`
      }
      return v
    }
    if (allow_number) {
      if ((typeof field === 'number') || ((typeof field === 'string') && field.match('^([0-9]+)$'))) {
        return parseInt(field)
      }
    }
    if (field.includes('.')) {
      field = field.split('.')
      if (field.length > 2) {
        throw new Error(`Incorrect field name: "${field}". Too many dots.`)
      }
      table = field[0]
      field = field[1]
    }
    if (table !== null) {
      table = this.tableName(table, true)
    }
    if (!field.match('^([A-Za-z0-9\\_\*]+)$')) {
      throw new Error(`Incorrect field name: "${field}". This library only allows latin letters, digits and underscores in fields/columns name.`)
    }
    if (field && this.RESERVED_WORDS.includes(field.toUpperCase())) {
      field = `${this.ESCAPE_CHAR}${field}${this.ESCAPE_CHAR}`
    }
    return table ? `${table}.${field}` : field
  }

  /**
   * Converts non-scalar value into JSON-encoded string
   * @param v
   * @returns {string}
   */
  static prepareValue (v) {
    return (v !== null) && ((typeof v) === 'object') ? JSON.stringify(v) : v
  }

}

module.exports = Helpers