import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { imageDesignLibraryDate, normalizeImageDesignLibraryItem, mergeGalleryItems } from '../utils/image-design-logic.mjs'

const page = readFileSync(new URL('../pages/cover/cover.vue', import.meta.url), 'utf8')
function loader(api) {
  const method = page.match(/async loadDesignLibrary\(reset = true\) \{[\s\S]*?\n    \},(?=\n    loadMoreDesignLibrary)/)[0]
  return new Function('mpImageDesignApi', 'normalizeImageDesignLibraryItem', 'mergeGalleryItems', `return ({${method}}).loadDesignLibrary`)(api, normalizeImageDesignLibraryItem, mergeGalleryItems)
}
function state() { return { libraryRequestId: 0, libraryPage: 0, libraryHasMore: false, designLibrary: [] } }

test('library paginates beyond 100 images and retries the same failed page', async () => {
  let fail = true
  const requests = []
  const load = loader({ library: async ({ page, page_size }) => {
    requests.push(page)
    assert.equal(page_size, 30)
    if (page === 2 && fail) { fail = false; throw new Error('offline') }
    return { items: Array.from({ length: page === 4 ? 11 : 30 }, (_, i) => ({ id: String((page - 1) * 30 + i) })), total: 101 }
  } })
  const vm = state()
  await load.call(vm)
  await load.call(vm, false)
  assert.equal(vm.libraryMoreError, true)
  assert.equal(vm.designLibrary.length, 30)
  await load.call(vm, false); await load.call(vm, false); await load.call(vm, false)
  assert.deepEqual(requests, [1, 2, 2, 3, 4])
  assert.equal(vm.designLibrary.length, 101)
  assert.equal(vm.libraryHasMore, false)
})

test('a late page cannot overwrite a refreshed library', async () => {
  let resolveOld
  const load = loader({ library: () => new Promise((resolve) => { resolveOld = resolve }) })
  const vm = state()
  const old = load.call(vm)
  await loader({ library: async () => ({ items: [{ id: 'new' }], total: 1 }) }).call(vm)
  resolveOld({ items: [{ id: 'old' }], total: 1 }); await old
  assert.equal(vm.designLibrary[0].id, 'new')
})

test('recognition comes from role records, never from a generated source label', () => {
  assert.deepEqual(normalizeImageDesignLibraryItem({ source_role: 'generated' }).recognized_roles, [])
  assert.deepEqual(normalizeImageDesignLibraryItem({ recognized_roles: ['style_reference'] }).recognized_roles, ['style_reference'])
  assert.equal(imageDesignLibraryDate('2026-09-10T12:00:00'), '20260910')
  assert.equal(imageDesignLibraryDate('invalid'), '')
})
