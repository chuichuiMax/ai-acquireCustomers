import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import {
  filterCaseGalleryChildren,
  filterCaseGalleryItems,
  findCaseGalleryRoot,
  isEnterpriseCaseGallery,
  isWithinCaseGallery
} from '../utils/case-gallery.mjs'

test('enterprise case gallery root is detected', () => {
  const root = {
    id: 'case-root',
    visibility: 'enterprise',
    image_design_role: 'reference',
    name: '案例图库'
  }
  assert.equal(isEnterpriseCaseGallery(root), true)
  assert.equal(isEnterpriseCaseGallery({ id: 'rough', visibility: 'enterprise', image_design_role: 'rough' }), false)
})

test('filterCaseGalleryChildren respects design style', () => {
  const children = [
    { id: 'a', design_style: '雅致现代', parent_id: 'case-root' },
    { id: 'b', design_style: '复古风潮', parent_id: 'case-root' }
  ]
  assert.equal(filterCaseGalleryChildren(children, '全部').length, 2)
  assert.deepEqual(filterCaseGalleryChildren(children, '复古风潮').map((row) => row.id), ['b'])
})

test('findCaseGalleryRoot walks parent chain', () => {
  const galleries = [
    { id: 'case-root', visibility: 'enterprise', image_design_role: 'reference', name: '案例图库' },
    { id: 'child', parent_id: 'case-root', visibility: 'enterprise', design_style: '雅致现代' }
  ]
  assert.equal(findCaseGalleryRoot(galleries[1], galleries)?.id, 'case-root')
  assert.equal(isWithinCaseGallery(galleries[1], galleries), true)
})

test('filterCaseGalleryItems by item design_style', () => {
  const items = [
    { id: '1', design_style: '雅致现代' },
    { id: '2', style: '复古风潮' }
  ]
  assert.deepEqual(filterCaseGalleryItems(items, '复古风潮').map((row) => row.id), ['2'])
})

test('cover and generate pages embed case style filter in gallery picker', () => {
  const cover = readFileSync(new URL('../pages/cover/cover.vue', import.meta.url), 'utf8')
  const generate = readFileSync(new URL('../pages/generate/generate.vue', import.meta.url), 'utf8')
  assert.match(cover, /case-style-filter/)
  assert.match(cover, /pickerCaseGalleryRoot/)
  assert.match(generate, /case-style-filter/)
  assert.match(generate, /caseGalleryBrowseActive/)
})
