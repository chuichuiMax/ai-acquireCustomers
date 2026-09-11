import assert from 'node:assert/strict'
import test from 'node:test'

import * as materialsLogic from '../utils/materials-logic.mjs'

const {
  STYLE_OPTIONS,
  filterGalleriesByStyle,
  createSelectionState,
  toggleSelection,
  buildShareSnapshot,
  buildWechatSharePayload
} = materialsLogic

test('style options keep the agreed fixed order', () => {
  assert.deepEqual(STYLE_OPTIONS, [
    '全部',
    '复合写意',
    '写意木构',
    '江南印象',
    '东方古雅',
    '轻欧简美',
    '欧美香颂',
    '欧式田园',
    '异域风情',
    '新装饰主义',
    '北欧之光',
    '意境东方',
    '雅致现代',
    '工业再造',
    '优雅缤纷',
    '极简侘寂',
    '仿生未来',
    '复古风潮',
    '艺术室界'
  ])
})

test('gallery filtering only returns secondary galleries for one style', () => {
  const galleries = [
    { id: 'style-1', style: '复古风潮', parent_id: null },
    { id: 'case-1', name: '洋湖天序·三居式·复古写意', style: '复古风潮', parent_id: 'style-1' },
    { id: 'case-2', name: '现代案例', style: '雅致现代', parent_id: 'style-2' },
    { id: 'style-2', style: '雅致现代', parent_id: null },
    { id: 'case-3', name: '未来住宅', design_style: '仿生未来', parent_id: 'style-3' }
  ]

  assert.deepEqual(filterGalleriesByStyle(galleries, '复古风潮'), [galleries[1]])
  assert.deepEqual(filterGalleriesByStyle(galleries, '仿生未来'), [galleries[4]])
  assert.deepEqual(filterGalleriesByStyle(galleries, '全部'), [galleries[1], galleries[2], galleries[4]])
})

test('selection numbers follow click order and are limited to one gallery', () => {
  let selection = createSelectionState('case-1')
  selection = toggleSelection(selection, { id: 'img-2' })
  selection = toggleSelection(selection, { id: 'img-1' })
  assert.deepEqual(selection.orderedIds, ['img-2', 'img-1'])

  selection = toggleSelection(selection, { id: 'img-2' })
  assert.deepEqual(selection.orderedIds, ['img-1'])

  assert.throws(
    () => toggleSelection(selection, { id: 'img-3', galleryId: 'case-2' }),
    /同一个二级图库/
  )
})

test('share snapshot preserves gallery metadata and selected image order', () => {
  const gallery = {
    id: 'case-1',
    name: '洋湖天序·三居式·复古写意',
    building: '洋湖天序',
    area: '120㎡',
    style: '复古写意'
  }
  const items = [
    { id: 'img-1', file_name: '5NT09809', file_url: '/a.jpg' },
    { id: 'img-2', file_name: '5NT09819', file_url: '/b.jpg' }
  ]

  assert.deepEqual(buildShareSnapshot(gallery, items, ['img-2', 'img-1']), {
    galleryId: 'case-1',
    galleryName: gallery.name,
    card: { building: '洋湖天序', area: '120㎡', style: '复古写意' },
    images: [items[1], items[0]]
  })
})

test('wechat share payload uses a mini-program route and public cover', () => {
  const payload = buildWechatSharePayload({
    shareId: 'share-abc',
    galleryName: '客厅实景',
    coverUrl: 'https://cdn.example.com/share-abc-cover.jpg',
    images: [{ id: 'img-2', file_name: '客厅.png', file_url: '/private-image.jpg' }]
  })

  assert.deepEqual(payload, {
    title: '客厅实景 · 1 张实景图',
    imageUrl: 'https://cdn.example.com/share-abc-cover.jpg',
    path: '/pages/materials/shared-case?shareId=share-abc'
  })
})
