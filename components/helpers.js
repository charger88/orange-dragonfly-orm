class Helpers {

  /**
   * Validates table name
   * @param table
   * @returns {*}
   */
  static tableName (table) {
    if (!table.match('^([A-Za-z0-9\\_]+)$')) {
      throw new Error(`Incorrect table name: "${table}". This library only allows latin letters, digits and underscores in table name.`)
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
      if (field.hasOwnProperty('function')) {
        let v = this.functionName(field['function'])
        if (field.hasOwnProperty('arguments')) {
          v += `(${field['arguments'].map(f => this.fieldName(f, table)).join(', ')})`
        }
        if (field.hasOwnProperty('as')) {
          v += ` as ${this.fieldName(field['as'])}`
        }
        return v
      } else {
        throw new Error('Incorrect field - object is provided, but "function" is missing.')
      }
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
      this.tableName(table)
    }
    if (!field.match('^([A-Za-z0-9\\_\*]+)$')) {
      throw new Error(`Incorrect field name: "${field}". This library only allows latin letters, digits and underscores in fields/columns name.`)
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