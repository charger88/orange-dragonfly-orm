import Helpers from './helpers'
import FilteredQuery from './filtered-query'
import QueryClauseGroup from './query-clause-group'
import type { FieldFunctionObject, IActiveRecordConstructor, IActiveRecordInstance, JoinType, OrderSpec, SelectOptions, SelectFields } from './types'

const VALID_JOIN_TYPES: JoinType[] = ['INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS', 'LEFT OUTER', 'RIGHT OUTER', 'FULL OUTER']

type JoinedTable = {
  join_type: JoinType
  table: string
  alias: string | null
  clause: QueryClauseGroup
}

class SelectQuery<T extends IActiveRecordInstance = IActiveRecordInstance> extends FilteredQuery<T> {
  joined_tables: JoinedTable[]
  group_by: Array<string | number>

  constructor(table: string, item_class: IActiveRecordConstructor<T> | null = null) {
    super(table, item_class)
    this.joined_tables = []
    this.group_by = []
  }

  /**
   * Adds a JOIN with an auto-built ON clause from two field names.
   *
   * @param join_type - One of the {@link JoinType} values (e.g. `'INNER'`, `'LEFT'`, `'CROSS'`).
   * @param table_name - The table to join.
   * @param key - Field on the current table (left side of ON).
   * @param foreign_key - Field on the joined table (right side of ON).
   * @param operator - Comparison operator for the ON clause (default `'='`).
   * @param alias - Optional alias for the joined table.
   */
  joinTable(join_type: JoinType, table_name: string, key: string, foreign_key: string, operator = '=', alias: string | null = null): this {
    const table = Helpers.tableName(table_name)
    const a_field = String(Helpers.fieldName(key, this.table))
    const b_field = String(Helpers.fieldName(foreign_key, alias || table))
    const clause = new QueryClauseGroup([], false, this.table)
    clause.fieldExp(a_field, b_field, operator)
    return this.joinTableCustom(join_type, table_name, clause, alias)
  }

  /**
   * Adds a JOIN with a fully custom ON clause group.
   *
   * @param join_type - One of the {@link JoinType} values (e.g. `'INNER'`, `'LEFT'`, `'CROSS'`).
   * @param table_name - The table to join.
   * @param clause - A {@link QueryClauseGroup} that builds the ON expression.
   * @param alias - Optional alias for the joined table.
   */
  joinTableCustom(join_type: JoinType, table_name: string, clause: QueryClauseGroup, alias: string | null = null): this {
    if (!VALID_JOIN_TYPES.includes(join_type.toUpperCase() as JoinType)) {
      throw new Error(`Invalid join type: "${join_type}". Valid types: ${VALID_JOIN_TYPES.join(', ')}`)
    }
    const table = Helpers.tableName(table_name)
    this.joined_tables.push({ join_type: join_type.toUpperCase() as JoinType, table, alias, clause })
    return this
  }

  groupBy(field_name: string | number): this {
    this.group_by.push(field_name)
    return this
  }

  protected _buildJoinSQL(params: unknown[]): string {
    if (!this.joined_tables.length) {
      return ''
    }
    return this.joined_tables.map(jt => {
      let jt_sql = `${jt.join_type} JOIN ${Helpers.tableName(jt.table, true)} `
      if (jt.alias) {
        jt_sql += `${Helpers.tableName(jt.alias, true)} `
      }
      if (jt.clause) {
        const on_sql = jt.clause.build(params, true)
        if (on_sql) jt_sql += `ON ${on_sql}`
      }
      return jt_sql
    }).join(' ')
  }

  protected _buildGroupSQL(): string {
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
    const sql = [
      `SELECT ${select_sql}`,
      table_sql,
      joins_sql,
      where_sql,
      group_sql,
      order_sql,
      limits_sql,
    ].filter(Boolean).join(' ')
    return { sql, params }
  }

  /**
   * Executes the query and returns hydrated model instances.
   *
   * Always selects all columns (`*`). To retrieve specific columns as plain objects
   * use {@link selectColumns} instead.
   *
   */
  async select(options: SelectOptions = {}): Promise<T[]> {
    if (Object.hasOwn(options, 'fields')) {
      console.warn('SelectQuery.select(): the `fields` option is deprecated and ignored. Use selectColumns() to query specific columns.')
    }
    const query = this.buildRawSQL('*', options.limit ?? null, options.offset ?? 0, options.order ?? {}, !!options.distinct)
    const res = await (this.constructor as typeof SelectQuery).runRawSQL(query.sql, query.params) as Record<string, unknown>[]
    return this.item_class ? res.map(record => new this.item_class!(record)) : res as unknown as T[]
  }

  /**
   * Executes the query and returns the first hydrated model instance, or `null`.
   *
   * Always selects all columns (`*`). To retrieve specific columns as a plain object
   * use {@link selectRow} instead.
   */
  async selectOne(options: SelectOptions = {}): Promise<T | null> {
    const opts = structuredClone(options)
    opts.limit = 1
    const res = await this.select(opts)
    return res.length === 1 ? res[0] : null
  }

  /**
   * Executes the query selecting only the specified columns and returns plain objects.
   *
   * @param fields - Columns to include in the SELECT list.
   * @param options - Limit, offset, order, and distinct options.
   */
  async selectColumns(fields: SelectFields, options: SelectOptions = {}): Promise<Record<string, unknown>[]> {
    const query = this.buildRawSQL(fields, options.limit ?? null, options.offset ?? 0, options.order ?? {}, !!options.distinct)
    return await (this.constructor as typeof SelectQuery).runRawSQL(query.sql, query.params) as Record<string, unknown>[]
  }

  /**
   * Executes the query selecting only the specified columns and returns the first
   * plain object, or `null`.
   *
   * @param fields - Columns to include in the SELECT list.
   * @param options - Limit, offset, order, and distinct options.
   */
  async selectRow(fields: SelectFields, options: SelectOptions = {}): Promise<Record<string, unknown> | null> {
    const opts = structuredClone(options)
    opts.limit = 1
    const res = await this.selectColumns(fields, opts)
    return res.length === 1 ? res[0] : null
  }

  /**
   * Returns the `COUNT` of matching rows.
   *
   * @param id_key - Column to count (defaults to the model's `id_key` or `'id'`).
   *
   * @note When `groupBy()` has been applied this returns the count for the **first group**,
   * not the total number of rows. Wrap the query in a subquery if you need the total
   * group count.
   */
  async total(id_key: string | null = null): Promise<number> {
    const fields: SelectFields = [{
      function: 'COUNT',
      arguments: [id_key ?? (this.item_class ? this.item_class.id_key : 'id')],
      as: 'total',
    }]
    const query = this.buildRawSQL(fields)
    const res = await (this.constructor as typeof SelectQuery).runRawSQL(query.sql, query.params) as Record<string, unknown>[]
    return res[0]['total'] as number
  }

  async exists(id_key: string | null = null): Promise<boolean> {
    const fields: SelectFields = [id_key ?? (this.item_class ? this.item_class.id_key : 'id')]
    const query = this.buildRawSQL(fields, 1)
    const res = await (this.constructor as typeof SelectQuery).runRawSQL(query.sql, query.params) as Record<string, unknown>[]
    return !!res.length
  }
}

export default SelectQuery
