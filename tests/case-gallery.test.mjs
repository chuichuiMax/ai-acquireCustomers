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

test('filterCaseGalleryChildren matches building name and folder title', () => {
  const children = [
    { id: 'a', building_name: '洋湖天序', name: '洋湖天序·三居式·复古写意', design_style: '复古风潮' },
    { id: 'b', building_name: '龙湖', name: '龙湖·三居式·写意木构', design_style: '写意木构' }
  ]
  assert.deepEqual(filterCaseGalleryChildren(children, '全部', '洋湖').map((row) => row.id), ['a'])
  assert.deepEqual(filterCaseGalleryChildren(children, '写意木构', '龙湖').map((row) => row.id), ['b'])
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

test('cover and generate share the case picker workspace and building search', () => {
  const cover = readFileSync(new URL('../pages/cover/cover.vue', import.meta.url), 'utf8')
  const generate = readFileSync(new URL('../pages/generate/generate.vue', import.meta.url), 'utf8')
  const workspace = readFileSync(new URL('../components/case-gallery-picker-workspace.vue', import.meta.url), 'utf8')
  assert.match(cover, /case-gallery-picker-workspace/)
  assert.match(generate, /case-gallery-picker-workspace/)
  assert.match(workspace, /case-style-sidebar/)
  assert.match(workspace, /case-gallery-folder-grid/)
  assert.match(workspace, /case-building-search/)
})

test('case picker components avoid WXSS rules rejected by WeChat', () => {
  const grid = readFileSync(new URL('../components/case-gallery-folder-grid.vue', import.meta.url), 'utf8')
  const sidebar = readFileSync(new URL('../components/case-style-sidebar.vue', import.meta.url), 'utf8')
  for (const source of [grid, sidebar]) {
    assert.doesNotMatch(source, /clip-path/)
    assert.doesNotMatch(source, /mix-blend-mode/)
    assert.doesNotMatch(source, /--folder-back-color/)
    assert.doesNotMatch(source, /::before|::after/)
  }
})
