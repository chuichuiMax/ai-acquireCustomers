import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeContentList } from '../utils/records.mjs'

test('content history accepts several backend list shapes', () => {
  const rows = [{ id: '1', service_entry: '装修家居' }]
  assert.deepEqual(normalizeContentList({ items: rows }), rows)
  assert.deepEqual(normalizeContentList({ tasks: rows }), rows)
  assert.deepEqual(normalizeContentList({ data: { contents: rows } }), rows)
  assert.deepEqual(normalizeContentList(rows), rows)
})
