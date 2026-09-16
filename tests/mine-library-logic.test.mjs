import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createImageSelection,
  privateChildGalleries,
  toggleImageSelection,
  visiblePrivateGalleries
} from '../utils/mine-library-logic.mjs'

test('my uploads excludes enterprise folders and puts unclassified after named private folders', () => {
  const folders = visiblePrivateGalleries([
    { id: 'enterprise', name: '企业案例', visibility: 'enterprise', parent_id: null },
    { id: 'uncategorized', name: '未分类', visibility: 'private', parent_id: null, is_system: true },
    { id: 'featured', name: '我的精选', visibility: 'private', parent_id: null }
  ])

  assert.deepEqual(folders.map((folder) => folder.id), ['featured', 'uncategorized'])
})

test('editing selection adds a picture once and removes it when tapped again', () => {
  const selected = createImageSelection()
  const afterSelect = toggleImageSelection(selected, 'work-1')
  const afterUnselect = toggleImageSelection(afterSelect, 'work-1')

  assert.deepEqual(afterSelect, ['work-1'])
  assert.deepEqual(afterUnselect, [])
})

test('opening a private parent exposes only its private child folders', () => {
  const children = privateChildGalleries(
    [
      { id: 'child-private', name: '客厅', visibility: 'private', parent_id: 'featured' },
      { id: 'child-enterprise', name: '企业客厅', visibility: 'enterprise', parent_id: 'featured' },
      { id: 'other', name: '其他', visibility: 'private', parent_id: 'other-root' }
    ],
    'featured'
  )

  assert.deepEqual(children.map((folder) => folder.id), ['child-private'])
})
