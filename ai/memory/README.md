# AI Memory System

## Purpose

Persistent context storage for AI agents. Memory files allow agents to maintain
state across runs — tracking what was previously analyzed, what changed, and
what trends are emerging.

## File Format

Each memory file is a JSON document with:

```json
{
  "agent": "code_review",
  "timestamp": "2026-07-12T09:00:00Z",
  "type": "snapshot",
  "data": { ... }
}
```

## Types

- `snapshot` — Full scan results at a point in time
- `delta` — Changes since the last snapshot
- `trend` — Aggregate data across multiple runs

## Retention

The cleanup agent retains the most recent files (configurable via
`automation_config.json > memory > max_context_files`, default: 10).
