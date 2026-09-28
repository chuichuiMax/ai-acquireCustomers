import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createImageSelection,
  formatUploadTime,
  nextDateRangeSelection,
  privateChildGalleries,
  toggleImageSelection,
  uploadDateKey,
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

test('upload time and date filter use the same Beijing calendar day at midnight', () => {
  const before = '2026-09-13T15:59:00Z'
  const after = '2026-09-13T16:01:00Z'

  assert.equal(uploadDateKey(before), '2026-09-13')
  assert.equal(uploadDateKey(after), '2026-09-14')
  assert.equal(formatUploadTime(after), '20260914 00:01')
  assert.equal(formatUploadTime(null), '-')
})

test('date range accepts either tap order and starts a new range after completion', () => {
  const first = nextDateRangeSelection('', '', '2026-09-15')
  const backward = nextDateRangeSelection(first.start, first.end, '2026-09-13')
  const next = nextDateRangeSelection(backward.start, backward.end, '2026-10-01')

  assert.deepEqual(backward, { start: '2026-09-13', end: '2026-09-15' })
  assert.deepEqual(next, { start: '2026-10-01', end: '' })
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
