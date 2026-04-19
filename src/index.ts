import AbstractDB from './abstract-db'
import type { DBConfig, DBConnection } from './abstract-db'
import AbstractQuery from './abstract-query'
import FilteredQuery from './filtered-query'
import InsertQuery from './insert-query'
import SelectQuery from './select-query'
import UpdateQuery from './update-query'
import DeleteQuery from './delete-query'
import ActiveRecord from './active-record'
import RawSQL from './raw-sql'
import Relation from './relation'
import QueryClauseGroup from './query-clause-group'
import QueryClause from './query-clause'
import ORMHelpers from './helpers'
import { OrangeDatabaseError, OrangeDatabaseInputError, OrangeDatabaseQueryError, OrangeDatabaseUnexpectedResultError } from './errors'
import type { JoinType } from './types'

const transaction = async <T>(functionality: () => Promise<T>): Promise<T> => {
  return await AbstractQuery.db.transaction(functionality)
}

export { AbstractDB, AbstractQuery, FilteredQuery, InsertQuery, SelectQuery, UpdateQuery, DeleteQuery, ActiveRecord, RawSQL, Relation, QueryClauseGroup, QueryClause, ORMHelpers, transaction, OrangeDatabaseError, OrangeDatabaseInputError, OrangeDatabaseQueryError, OrangeDatabaseUnexpectedResultError }
export type { JoinType, DBConfig, DBConnection }
