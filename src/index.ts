import AbstractDB from './abstract-db'
import AbstractQuery from './abstract-query'
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

const transaction = async(functionality: () => Promise<unknown>): Promise<unknown> => {
  return await AbstractQuery.db.transaction(functionality)
}

export { AbstractDB, AbstractQuery, InsertQuery, SelectQuery, UpdateQuery, DeleteQuery, ActiveRecord, RawSQL, Relation, QueryClauseGroup, QueryClause, ORMHelpers, transaction }
