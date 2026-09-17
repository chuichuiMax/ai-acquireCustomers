import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildImageDesignPayload,
  createImageDesignDrafts,
  DESCRIPTION_STYLE_VALUE,
  draftCanGenerate,
  IMAGE_DESIGN_STYLE_OPTIONS,
  imageDesignStyleForPayload,
  isSupportedImageDesignStyle,
  normalizeImageDesignDrafts,
  requiredImageRoles,
  saveableFolders,
  updateImageDesignDraftStyle,
  uniqueFolders
} from '../utils/image-design-logic.mjs'

test('image design keeps its own preset styles and recognizes description mode', () => {
  assert.deepEqual(IMAGE_DESIGN_STYLE_OPTIONS, [
    { value: '现代轻奢', label: '现代轻奢' },
    { value: '意式极简', label: '意式极简' },
    { value: '新中式', label: '新中式' },
    { value: '现代法式', label: '现代法式' },
    { value: '极简奶油风', label: '极简奶油风' },
    { value: '现代简约', label: '现代简约' },
    { value: '侘寂风', label: '侘寂风' },
    { value: '南洋复古风', label: '南洋复古风' },
    { value: '美式现代', label: '美式现代' },
    { value: '日式极简禅风', label: '日式极简禅风' },
    { value: DESCRIPTION_STYLE_VALUE, label: '使用补充描述作为风格提示词' }
  ])
  assert.equal(isSupportedImageDesignStyle('雅致现代'), false)
  assert.equal(isSupportedImageDesignStyle(DESCRIPTION_STYLE_VALUE), true)
})

test('retired redesign styles are cleared with their stale polished prompt when restoring a draft', () => {
  const drafts = normalizeImageDesignDrafts({
    redesign: {
      source: { id: 'source-1' },
      style: '雅致现代',
      description: '增加阅读角',
      polished_prompt: '雅致现代阅读角方案',
      polished_for: '增加阅读角'
    }
  })

  assert.deepEqual(drafts.redesign, {
    ...createImageDesignDrafts().redesign,
    source: { id: 'source-1' },
    description: '增加阅读角'
  })
})

test('changing a redesign style clears its AI polish while reselecting it keeps the result', () => {
  const draft = {
    ...createImageDesignDrafts().redesign,
    style: '现代轻奢',
    polished_prompt: '现代轻奢的温暖客厅',
    polished_for: '增加阅读角'
  }

  assert.deepEqual(updateImageDesignDraftStyle(draft, '新中式'), {
    ...draft,
    style: '新中式',
    polished_prompt: '',
    polished_for: ''
  })
  assert.deepEqual(updateImageDesignDraftStyle(draft, '现代轻奢'), draft)
})

test('description style mode omits a preset style from the task payload', () => {
  const draft = {
    ...createImageDesignDrafts().redesign,
    source: { id: 'source-1' },
    style: DESCRIPTION_STYLE_VALUE,
    description: '奶油色墙面与圆角木质家具',
    polished_prompt: '保留原房结构，使用奶油色墙面与圆角木质家具',
    polished_for: '奶油色墙面与圆角木质家具',
    save_target_id: 'folder-1'
  }

  assert.equal(draftCanGenerate('redesign', draft), true)
  assert.equal(imageDesignStyleForPayload(draft.style), undefined)
  assert.equal(buildImageDesignPayload('redesign', draft).style, undefined)
})

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
    style: '现代轻奢',
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
