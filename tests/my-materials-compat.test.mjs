import test from 'node:test'
import assert from 'node:assert/strict'
import { legacyFolderCount, legacyMaterialSources, mergeLegacyMaterialItems } from '../utils/my-materials-compat.mjs'

test('legacy folders use direct counts and keep unknown private-root counts unknown', () => {
  const sources = legacyMaterialSources([
    { id: 'rough-pc', name: '毛胚房图库', visibility: 'enterprise', count: 3, direct_count: 1 },
    { id: 'rough-child', parent_id: 'rough-pc', visibility: 'enterprise', count: 2, direct_count: 2 },
    { id: 'product', name: 'AI生图图库', visibility: 'private', direct_count: 4 },
    { id: 'generated-pc', name: 'AI生图图库', visibility: 'enterprise', direct_count: 5 },
    { id: 'other', name: '施工现场', visibility: 'private', direct_count: 6 }
  ])

  assert.equal(legacyFolderCount(sources.rough), 3)
  assert.equal(legacyFolderCount(sources.generated), 9)
  assert.equal(legacyFolderCount(sources.uploads), null)
  sources.uploads.find((item) => item.id === 'private-root').count = 2
  assert.equal(legacyFolderCount(sources.uploads), 8)
})

test('legacy items merge duplicated IDs in newest-first order', () => {
  const items = mergeLegacyMaterialItems([
    [{ id: 'a', created_at: '2026-01-01T00:00:00' }],
    [{ id: 'a', created_at: '2026-01-01T00:00:00' }, { id: 'b', created_at: '2026-02-01T00:00:00' }]
  ])
  assert.deepEqual(items.map((item) => item.id), ['b', 'a'])
})
