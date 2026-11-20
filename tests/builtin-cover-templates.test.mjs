import assert from 'node:assert/strict'
import test from 'node:test'
import {
  BUILTIN_COVER_PRELOAD_COUNT,
  builtinCoverEmptyText,
  builtinCoverUncategorizedHint,
  filterBuiltinCoverTemplates,
  coverContentTypeNames,
  hasCoverTemplateCategories,
  nextTemplateBatchCount,
  sliceTemplateBatch,
  syncBuiltinCoverSelection,
  templateCoverCategoryName
} from '../utils/builtin-cover-templates.mjs'

test('coverContentTypeNames expands aliases that share a CT code', () => {
  const names = coverContentTypeNames('装修案例分享')
  assert.ok(names.includes('装修案例分享'))
  assert.ok(names.includes('案例分享'))
})

test('templateCoverCategoryName reads category_name and content-type categories', () => {
  assert.equal(templateCoverCategoryName({ category_name: '装修案例分享' }), '装修案例分享')
  assert.equal(
    templateCoverCategoryName({ categories: ['social', '小红书', '装修案例分享'] }),
    '装修案例分享'
  )
  assert.equal(templateCoverCategoryName({ categories: ['social', '小红书'] }), '')
})

test('filterBuiltinCoverTemplates matches PC category rules', () => {
  const templates = [
    { id: '1', zone: 'builtin', category_name: '装修案例分享', title: 'case-a' },
    { id: '2', zone: 'builtin', category_name: '案例分享', title: 'case-b' },
    { id: '3', zone: 'builtin', category_name: '通用封面', title: 'general' },
    { id: '4', zone: 'builtin', category_name: '装修避坑分享', title: 'pitfall' },
    { id: '5', zone: 'featured', category_name: '装修案例分享', title: 'featured' },
    { id: '6', zone: 'builtin', category_name: '', title: 'uncategorized' }
  ]
  const filtered = filterBuiltinCoverTemplates(templates, '装修案例分享')
  assert.deepEqual(
    filtered.map((item) => item.id),
    ['1', '2', '3']
  )
})

test('filterBuiltinCoverTemplates keeps all builtins when categories are missing', () => {
  const templates = [
    { id: '1', zone: 'builtin', title: 'a', categories: ['social', '小红书'] },
    { id: '2', zone: 'featured', title: 'b' },
    { id: '3', zone: 'builtin', title: 'c' }
  ]
  assert.equal(hasCoverTemplateCategories(templates), false)
  assert.deepEqual(
    filterBuiltinCoverTemplates(templates, '装修案例分享').map((item) => item.id),
    ['1', '3']
  )
  assert.equal(
    builtinCoverUncategorizedHint(templates, '装修案例分享'),
    '封面模板尚未配置内容类型分类，暂时显示全部内置封面'
  )
})

test('filterBuiltinCoverTemplates keeps all builtins when type name is empty', () => {
  const templates = [
    { id: '1', zone: 'builtin', category_name: '装修案例分享' },
    { id: '2', zone: 'featured', category_name: '通用' },
    { id: '3', zone: 'builtin', category_name: '装修避坑分享' }
  ]
  assert.deepEqual(
    filterBuiltinCoverTemplates(templates, '').map((item) => item.id),
    ['1', '3']
  )
})

test('builtinCoverEmptyText matches PC messaging', () => {
  const categorized = [
    { id: '1', zone: 'builtin', category_name: '装修避坑分享' },
    { id: '2', zone: 'featured', category_name: '装修案例分享' }
  ]
  assert.equal(
    builtinCoverEmptyText(categorized, '装修案例分享'),
    '当前内容类型暂无封面模板，请在「装修案例分享」或「通用」分类下保存模板'
  )
  assert.equal(
    builtinCoverEmptyText([{ id: '1', zone: 'builtin' }], '装修案例分享'),
    '暂无内置封面模板，请稍后再试或改用 AI 封面'
  )
})

test('syncBuiltinCoverSelection clears invalid ids and can auto-select first', () => {
  const list = [
    { id: 'a', zone: 'builtin' },
    { id: 'b', zone: 'builtin' }
  ]
  assert.equal(syncBuiltinCoverSelection('a', list), 'a')
  assert.equal(syncBuiltinCoverSelection('missing', list), '')
  assert.equal(syncBuiltinCoverSelection('missing', list, { autoSelectFirst: true }), 'a')
  assert.equal(syncBuiltinCoverSelection('', [], { autoSelectFirst: true }), '')
})

test('preload count stays at ten', () => {
  assert.equal(BUILTIN_COVER_PRELOAD_COUNT, 10)
})

test('template batches advance ten at a time', () => {
  const list = Array.from({ length: 25 }, (_, index) => ({ id: String(index + 1) }))
  assert.deepEqual(
    sliceTemplateBatch(list, 0, 10).map((item) => item.id),
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
  )
  assert.deepEqual(
    sliceTemplateBatch(list, 10, 10).map((item) => item.id),
    ['11', '12', '13', '14', '15', '16', '17', '18', '19', '20']
  )
  assert.equal(nextTemplateBatchCount(10, 25), 20)
  assert.equal(nextTemplateBatchCount(20, 25), 25)
  assert.equal(nextTemplateBatchCount(25, 25), 25)
})
