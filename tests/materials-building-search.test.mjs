import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { filterCaseGalleryChildren } from '../utils/case-gallery.mjs'
import { createSelectionState, galleryStyle, MATERIAL_LIBRARY_STYLE_OPTIONS } from '../utils/materials-logic.mjs'

const source = readFileSync(new URL('../pages/materials/materials.vue', import.meta.url), 'utf8')
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace(/^import[\s\S]*?from ['"][^'"]+['"]\s*$/gm, '')
  .replace('export default', 'return')
const page = new Function(
  'TabBar', 'CaseBuildingSearch', 'internalPageMixin', 'MATERIAL_LIBRARY_STYLE_OPTIONS',
  'createSelectionState', 'galleryStyle', 'filterCaseGalleryChildren', 'mpContentApi', script
)(
  {}, {}, {}, MATERIAL_LIBRARY_STYLE_OPTIONS, createSelectionState, galleryStyle, filterCaseGalleryChildren,
  { galleryItems: async () => ({ items: [{ id: 'photo' }] }) }
)

function viewModel() {
  return {
    ...page.data(),
    galleries: [
      { id: 'root', design_style: '雅致现代' },
      { id: 'other-root', design_style: '写意木构' },
      { id: 'a', parent_id: 'root', building_name: '万科松湖天地', name: '案例甲', design_style: '雅致现代' },
      { id: 'legacy', parent_id: 'root', name: '万科森林公园-189㎡' },
      { id: 'b', parent_id: 'other-root', building_name: '万科森林公园', name: '案例乙', design_style: '写意木构' },
      { id: 'c', parent_id: 'root', building_name: '龙湖', name: '龙湖-雅致现代', design_style: '雅致现代' }
    ],
    invalidateShareSnapshot() {}
  }
}

function visibleIds(vm) {
  return page.computed.visibleGalleries.call(vm).map(item => item.id)
}

test('case page wires the shared building search above the scrollable gallery workspace', () => {
  assert.match(source, /import CaseBuildingSearch from ['"]\.\.\/\.\.\/components\/case-building-search\.vue['"]/)
  assert.match(source, /<case-building-search\s+:value="buildingQuery"\s+@input="buildingQuery = \$event"\s*\/>/)
  assert.ok(source.indexOf('<case-building-search') < source.indexOf('<view class="library-workspace">'))
  assert.match(source, /未找到匹配的案例/)
})

test('building search matches metadata and legacy folder names and excludes root folders', () => {
  const vm = viewModel()
  assert.equal(vm.buildingQuery, '')
  vm.buildingQuery = '万科'
  assert.deepEqual(visibleIds(vm), ['a', 'legacy', 'b'])
  vm.buildingQuery = '森林'
  assert.deepEqual(visibleIds(vm), ['legacy', 'b'])
})

test('building and style filters combine while preserving inherited parent styles', () => {
  const vm = viewModel()
  vm.buildingQuery = '万科'
  page.methods.selectStyle.call(vm, '雅致现代')
  assert.equal(vm.buildingQuery, '万科')
  assert.deepEqual(visibleIds(vm), ['a', 'legacy'])
  page.methods.selectStyle.call(vm, '写意木构')
  assert.deepEqual(visibleIds(vm), ['b'])
  page.methods.selectStyle.call(vm, '全部')
  assert.deepEqual(visibleIds(vm), ['a', 'legacy', 'b'])
})

test('clearing the query restores the current style and surrounding spaces are ignored', () => {
  const vm = viewModel()
  vm.selectedStyle = '雅致现代'
  vm.buildingQuery = '  松湖  '
  assert.deepEqual(visibleIds(vm), ['a'])
  vm.buildingQuery = ''
  assert.deepEqual(visibleIds(vm), ['a', 'legacy', 'c'])
  vm.buildingQuery = '   '
  assert.deepEqual(visibleIds(vm), ['a', 'legacy', 'c'])
  vm.buildingQuery = '不存在的楼盘'
  assert.deepEqual(visibleIds(vm), [])
})

test('opening a case and returning preserves both filters and the matching folder list', async () => {
  const vm = viewModel()
  vm.buildingQuery = '万科'
  vm.selectedStyle = '雅致现代'
  await page.methods.openGallery.call(vm, 'a')
  assert.equal(page.computed.activeGallery.call(vm).id, 'a')
  assert.deepEqual(vm.items, [{ id: 'photo', galleryId: 'a' }])
  page.methods.closeGallery.call(vm)
  assert.equal(vm.activeGalleryId, '')
  assert.equal(vm.buildingQuery, '万科')
  assert.equal(vm.selectedStyle, '雅致现代')
  assert.deepEqual(visibleIds(vm), ['a', 'legacy'])
})
