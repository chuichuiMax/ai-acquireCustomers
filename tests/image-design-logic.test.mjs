import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildImageDesignPayload,
  createImageDesignDrafts,
  draftCanGenerate,
  requiredImageRoles,
  saveableFolders,
  uniqueFolders
} from '../utils/image-design-logic.mjs'

test('each image-design workflow validates its own required images', () => {
  assert.deepEqual(requiredImageRoles('redesign'), ['source'])
  assert.deepEqual(requiredImageRoles('adapt'), ['reference', 'rough'])
  assert.deepEqual(requiredImageRoles('transfer'), ['reference'])

  const drafts = createImageDesignDrafts()
  const draft = {
    ...drafts.adapt,
    reference: { id: 'reference' },
    rough: { id: 'rough' },
    description: '保留采光',
    polished_prompt: '保留采光，优化空间陈设',
    polished_for: '保留采光',
    save_target_id: 'folder-1'
  }
  assert.equal(draftCanGenerate('adapt', draft), true)
  assert.equal(draftCanGenerate('redesign', { ...draft, source: draft.reference, style: '' }), false)
})

test('editing a description invalidates the polished prompt until it is refreshed', () => {
  const draft = createImageDesignDrafts().redesign
  const ready = {
    ...draft,
    source: { id: 'source-1' },
    style: '雅致现代',
    description: '增加阅读角',
    polished_prompt: '保留原始结构，增加阅读角',
    polished_for: '增加阅读角',
    save_target_id: 'folder-1'
  }
  assert.equal(draftCanGenerate('redesign', ready), true)
  assert.equal(draftCanGenerate('redesign', { ...ready, description: '增加阅读角与落地灯' }), false)
})

test('folder lists are deduplicated and only private or public folders can save results', () => {
  const folders = [
    { id: 'p-1', name: '我的客厅', visibility: 'private' },
    { id: 'p-1', name: '重复', visibility: 'private' },
    { id: 'e-1', name: '公共的库', visibility: 'enterprise' },
    { id: 'e-2', name: '企业项目', visibility: 'enterprise' }
  ]
  assert.deepEqual(uniqueFolders(folders).map((item) => item.id), ['e-1', 'e-2', 'p-1'])
  assert.deepEqual(saveableFolders(folders).map((item) => item.id), ['e-1', 'p-1'])
})

test('a generation payload preserves role mapping and selected image settings', () => {
  const draft = {
    ...createImageDesignDrafts().adapt,
    reference: { id: 'design-ref', source_item_id: 'ref-source' },
    rough: { id: 'design-rough', asset_id: 'rough-asset' },
    description: '保留开窗',
    polished_prompt: '保留开窗，参考图的材质与比例',
    ratio: 'landscape',
    count: 4,
    quality: '2k',
    save_target_id: 'target',
  }
  const payload = buildImageDesignPayload('adapt', draft)
  assert.equal(payload.images[0].role, 'reference')
  assert.equal(payload.images[1].asset_id, 'rough-asset')
  assert.equal(payload.count, 4)
  assert.equal(payload.ratio, 'landscape')
})
