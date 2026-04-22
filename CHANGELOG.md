# Changelog

All notable changes to this project will be documented in this file.

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
