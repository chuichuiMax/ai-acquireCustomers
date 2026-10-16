import test from 'node:test'
import assert from 'node:assert/strict'
import {
  displayMaterialFolderName,
  sortMaterialFolders,
  withStandardMaterialFolders
} from '../utils/mine-materials-display.mjs'

test('displayMaterialFolderName maps generated gallery label', () => {
  assert.equal(displayMaterialFolderName({ id: 'generated', name: 'AI生图图库' }), '生图图库')
  assert.equal(displayMaterialFolderName({ id: 'rough', name: '毛坯房图库' }), '毛坯房图库')
})

test('withStandardMaterialFolders keeps PC order and adds video placeholder', () => {
  const folders = withStandardMaterialFolders([
    { id: 'works', name: '我的作品', count: 1 },
    { id: 'uploads', name: '我的上传', count: 2 },
    { id: 'generated', name: 'AI生图图库', count: 3 }
  ])
  assert.deepEqual(folders.map((folder) => folder.id), ['generated', 'uploads', 'works', 'video'])
  assert.equal(folders[3].placeholder, true)
  assert.equal(sortMaterialFolders(folders)[0].id, 'generated')
})
