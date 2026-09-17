import assert from 'node:assert/strict'
import test from 'node:test'

import {
  galleryItemList,
  isGalleryItemUsed,
  loadAllGalleryItems,
  sortGalleryItems
} from '../utils/gallery-items.mjs'

test('unused gallery photos stay ahead of photos already in use', () => {
  const used = { id: 'used', in_use: true }
  const free = { id: 'free', in_use: false }
  assert.deepEqual(
    sortGalleryItems([used, free, { id: 'also-used', used: true }]).map((item) => item.id),
    ['free', 'used', 'also-used']
  )
  assert.equal(isGalleryItemUsed(used), true)
  assert.equal(isGalleryItemUsed(free), false)
})

test('gallery item lists accept nested backend payloads', () => {
  const rows = [{ id: '1' }]
  assert.deepEqual(galleryItemList({ items: rows }), rows)
  assert.deepEqual(galleryItemList({ data: { items: rows } }), rows)
})

test('gallery loader keeps requesting pages until every photo is in', async () => {
  const pages = {
    1: { items: Array.from({ length: 100 }, (_, index) => ({ id: `a${index}`, in_use: true })), total: 136 },
    2: { items: Array.from({ length: 36 }, (_, index) => ({ id: `b${index}`, in_use: false })), total: 136 }
  }
  const items = await loadAllGalleryItems(({ page }) => pages[page])
  assert.equal(items.length, 136)
  assert.equal(items[0].in_use, false)
  assert.equal(items[items.length - 1].in_use, true)
})

test('gallery loader skips duplicate pages when the backend ignores pagination', async () => {
  const firstPage = {
    items: Array.from({ length: 20 }, (_, index) => ({ id: `a${index}`, in_use: true })),
    total: 20
  }
  const items = await loadAllGalleryItems(() => firstPage)
  assert.equal(items.length, 20)
})
