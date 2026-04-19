/**
 * Base error class for all orange-dragonfly-orm database errors.
 * Thrown for configuration issues (e.g. missing DB registration) and
 * other ORM-level problems not directly tied to query execution.
 */
export class OrangeDatabaseError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'OrangeDatabaseError'
  }
}

/**
 * Thrown when caller-supplied input is invalid before any query is built or executed.
 * Examples: negative LIMIT, OFFSET without LIMIT, PK field passed to `save()`.
 */
export class OrangeDatabaseInputError extends OrangeDatabaseError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'OrangeDatabaseInputError'
  }
}

/**
 * Thrown when a query fails at the driver level.
 *
 * The original driver error is preserved as `cause` so the full stack
 * trace of the underlying failure is accessible via `error.cause`.
 *
 * @example
 * try {
 *   await query.select()
 * } catch (e) {
 *   if (e instanceof OrangeDatabaseQueryError) {
 *     console.error('Query failed:', e.message)
 *     console.error('Driver cause:', e.cause)
 *   }
 * }
 */
export class OrangeDatabaseQueryError extends OrangeDatabaseError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'OrangeDatabaseQueryError'
  }
}

/**
 * Thrown when a driver result object does not have the expected shape.
 *
 * Each query method documents which properties it expects on the driver result
 * (e.g. `insertId`, `affectedRows`). If a driver implementation omits them,
 * this error is thrown rather than silently returning `undefined` cast to a type.
 */
export class OrangeDatabaseUnexpectedResultError extends OrangeDatabaseError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'OrangeDatabaseUnexpectedResultError'
  }
}
