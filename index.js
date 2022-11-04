const AbstractDB = require('./components/abstract-db')
const AbstractQuery = require('./components/abstract-query')
const InsertQuery = require('./components/insert-query')
const SelectQuery = require('./components/select-query')
const UpdateQuery = require('./components/update-query')
const DeleteQuery = require('./components/delete-query')
const ActiveRecord = require('./components/active-record')
const RawSQL = require('./components/raw-sql')
const Relation = require('./components/relation')
const QueryClauseGroup = require('./components/query-clause-group')
const QueryClause = require('./components/query-clause')
const ORMHelpers = require('./components/helpers')

const transaction = async (functionality) => {
  return await AbstractQuery.db.transaction(functionality)
}

module.exports = {
  AbstractDB, AbstractQuery, InsertQuery, SelectQuery, UpdateQuery, DeleteQuery, ActiveRecord, RawSQL, Relation, QueryClauseGroup, QueryClause, ORMHelpers, transaction
}