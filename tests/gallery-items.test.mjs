import assert from 'node:assert/strict'
import test from 'node:test'
import { isGalleryItemUsed, loadAllGalleryItems } from '../utils/gallery-items.mjs'

test('gallery item usage accepts both boolean and count fields', () => {
  assert.equal(isGalleryItemUsed({ in_use: true }), true)
  assert.equal(isGalleryItemUsed({ is_used: true }), true)
  assert.equal(isGalleryItemUsed({ usage_count: 2 }), true)
  assert.equal(isGalleryItemUsed({ used_count: '1' }), true)
  assert.equal(isGalleryItemUsed({ in_use: false, usage_count: 0 }), false)
})

test('gallery item loader requests each page until the reported total is loaded', async () => {
  const calls = []
  const items = await loadAllGalleryItems(async (params) => {
    calls.push(params)
    if (params.page === 1) return { items: [{ id: 'one' }, { id: 'two' }], total: 3 }
    return { items: [{ id: 'three' }], total: 3 }
  })

  assert.deepEqual(calls, [{ page: 1, page_size: 100 }, { page: 2, page_size: 100 }])
  assert.deepEqual(items.map((item) => item.id), ['one', 'two', 'three'])
})
