import Helpers from './helpers'
import FilteredQuery from './filtered-query'
import QueryClauseGroup from './query-clause-group'
import type { FieldFunctionObject, IActiveRecordConstructor, IActiveRecordInstance, OrderSpec, SelectOptions, SelectFields } from './types'

type JoinedTable = {
  join_type: string | null
  table: string
  alias: string | null
  clause: QueryClauseGroup
}

class SelectQuery extends FilteredQuery {
  joined_tables: JoinedTable[]
  group_by: Array<string | number>

  constructor(table: string, item_class: IActiveRecordConstructor | null = null) {
    super(table, item_class)
    this.joined_tables = []
    this.group_by = []
  }

  joinTable(join_type: string, table_name: string, key: string, foreign_key: string, operator = '=', alias: string | null = null): this {
    const table = Helpers.tableName(table_name)
    const a_field = String(Helpers.fieldName(key, this.table))
    const b_field = String(Helpers.fieldName(foreign_key, alias || table))
    const clause = new QueryClauseGroup([], false, this.table)
    clause.fieldExp(a_field, b_field, operator)
    return this.joinTableCustom(join_type, table_name, clause, alias)
  }

  joinTableCustom(join_type: string, table_name: string, clause: QueryClauseGroup, alias: string | null = null): this {
    const table = Helpers.tableName(table_name)
    this.joined_tables.push({ join_type, table, alias, clause })
    return this
  }

  groupBy(field_name: string | number): this {
    this.group_by.push(field_name)
    return this
  }

  _buildJoinSQL(params: unknown[]): string {
    if (!this.joined_tables.length) {
      return ''
    }
    return this.joined_tables.map(jt => {
      let jt_sql = ''
      if (jt.join_type) {
        if (['INNER', 'LEFT', 'RIGHT', 'FULL'].includes(jt.join_type.toUpperCase())) {
          jt_sql += jt.join_type.toUpperCase()
        }
      }
      jt_sql += ` JOIN ${Helpers.tableName(jt.table, true)} `
      if (jt.alias) {
        jt_sql += `${Helpers.tableName(jt.alias, true)} `
      }
      if (jt.clause) {
        jt_sql += `ON ${jt.clause.build(params, true)}`
      }
      return jt_sql
    }).join(' ')
  }

  _buildGroupSQL(): string {
    if (!this.group_by.length) return ''
    return `GROUP BY ${this.group_by.map(g => Helpers.fieldName(g, this.table, true)).join(', ')}`
  }

  buildRawSQL(fields: SelectFields = '*', limit: number | null = null, offset = 0, order: OrderSpec = {}, distinct = false): { sql: string; params: unknown[] } {
    const params: unknown[] = []
    let select_sql = Array.isArray(fields)
      ? fields.map(f => String(Helpers.fieldName(f as string | number | FieldFunctionObject, this.table, false, true))).join(', ')
      : '*'
    if (distinct) {
      select_sql = `DISTINCT ${select_sql}`
    }
    const table_sql = `FROM ${Helpers.tableName(this.table, true)}`
    const joins_sql = this._buildJoinSQL(params)
    const where_sql = this._buildWhereSQL(params)
    const group_sql = this._buildGroupSQL()
    const order_sql = this._buildOrderSQL(order, params)
    const limits_sql = this._buildLimitsSQL(limit, offset)
    let sql = `SELECT ${select_sql} ${table_sql} ${joins_sql} ${where_sql} ${group_sql} ${order_sql} ${limits_sql}`
    sql = (this.constructor as typeof SelectQuery).cleanUpQuery(sql)
    return { sql, params }
  }

  async select(options: SelectOptions = {}): Promise<IActiveRecordInstance[] | Record<string, unknown>[]> {
    const fields = options.fields || '*'
    const query = this.buildRawSQL(
      fields,
      options.limit || null,
      options.offset || 0,
      options.order || {},
      !!options.distinct,
    )
    const res = await (this.constructor as typeof SelectQuery).runRawSQL(query.sql, query.params) as Record<string, unknown>[]
    const return_objects = this.item_class && (
      (fields === '*') ||
      (Array.isArray(fields) && (fields.length === 1) && (fields[0] === `${this.table}.*`))
    )
    return return_objects ? res.map(record => new this.item_class!(record)) : res
  }

  async selectOne(options: SelectOptions = {}): Promise<IActiveRecordInstance | Record<string, unknown> | null> {
    const opts = Object.assign({}, options)
    opts.limit = 1
    const res = await this.select(opts)
    return res.length === 1 ? res[0] : null
  }

  async total(id_key: string | null = null): Promise<number> {
    const res = await this.select({
      fields: [{
        function: 'COUNT',
        arguments: [id_key ? id_key : (this.item_class ? this.item_class.id_key : 'id')],
        as: 'total',
      }],
    }) as Array<Record<string, unknown>>
    return res[0]['total'] as number
  }

  async exists(id_key: string | null = null): Promise<boolean> {
    const res = await this.select({
      fields: [id_key ? id_key : (this.item_class ? this.item_class.id_key : 'id')],
      limit: 1,
    })
    return !!res.length
  }
}

export default SelectQuery
