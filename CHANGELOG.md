# Changelog

All notable changes to this project will be documented in this file.

## [0.9.0] - 6/21/2026

### Added

- `SelectQuery.selectColumns(fields, options?)` — executes a query with a specific column list and returns plain `Record<string, unknown>[]`. Use this wherever column-level control is needed instead of hydrated model instances.
- `SelectQuery.selectRow(fields, options?)` — same as `selectColumns` but returns the first row as `Record<string, unknown> | null`.
- `OrangeDatabaseUsageError` — new error class for incorrect API usage (e.g. calling a removed or renamed method), distinct from `OrangeDatabaseInputError` which covers bad data values.

### Changed

- `ActiveRecord.id` is now typed as `number | null` instead of `unknown`. The setter likewise accepts only `number | null`. String IDs are no longer permitted.
- `SelectQuery.select()` now returns `Promise<T[]>` (always hydrated model instances, always `SELECT *`). Passing a `fields` key at runtime throws `OrangeDatabaseUsageError` with a message directing callers to `selectColumns()`.
- `SelectQuery.selectOne()` now returns `Promise<T | null>` for the same reasons.
- `SelectOptions` no longer has a `fields` property. Pass fields as the first argument to `selectColumns()` / `selectRow()` / `buildRawSQL()` directly.

## [0.8.1] - 4/22/2026

### Fixed

- Restored the original save lifecycle behavior so auto-managed date fields are prepared before `_preSave()` runs.
- Stopped mutating caller-supplied nested data by deep-cloning record data, relation select params, and `selectOne()` options before internal changes.

## [0.8.0] - 4/20/2026

### Added

- Full TypeScript support with strict type checking
- Dual-format package output (ESM + CommonJS) with TypeScript declarations

### Changed

- Minor bug fixes, logic improvements, etc.
