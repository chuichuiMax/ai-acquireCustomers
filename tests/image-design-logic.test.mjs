import assert from 'node:assert/strict'
import test from 'node:test'
import * as imageDesignLogic from '../utils/image-design-logic.mjs'
import {
  buildImageDesignPayload,
  childFolders,
  createImageDesignDrafts,
  DESCRIPTION_STYLE_VALUE,
  draftCanGenerate,
  IMAGE_DESIGN_STYLE_OPTIONS,
  normalizeTransferElements,
  imageDesignStyleForPayload,
  isSupportedImageDesignStyle,
  normalizeImageDesignDrafts,
  normalizeSaveTarget,
  requiredImageRoles,
  saveTargetLabel,
  savePathOptions,
  saveableFolders,
  updateImageDesignDraftStyle,
  uniqueFolders
} from '../utils/image-design-logic.mjs'

test('transfer drafts normalize legacy addon values and cap selections at two', () => {
  assert.deepEqual(normalizeTransferElements('落地窗旁休闲躺椅'), ['落地窗旁休闲躺椅'])
  assert.deepEqual(normalizeTransferElements([
    '落地窗旁休闲躺椅', '壁炉居中', '电视墙满墙收纳柜', '未知元素'
  ]), ['落地窗旁休闲躺椅', '壁炉居中'])
  assert.deepEqual(normalizeImageDesignDrafts({ transfer: { extra_element: '壁炉居中' } }).transfer.extra_element, ['壁炉居中'])
})

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
    polished_for: '增加阅读角',
    refinement_id: 'ref-1'
  }

  assert.deepEqual(updateImageDesignDraftStyle(draft, '新中式'), {
    ...draft,
    style: '新中式',
    polished_prompt: '',
    polished_for: '',
    refinement_id: ''
  })
  assert.deepEqual(updateImageDesignDraftStyle(draft, '现代轻奢'), draft)
})

test('description style mode omits a preset style from the task payload', () => {
  const draft = {
    ...createImageDesignDrafts().redesign,
    source: { id: 'source-1' },
    style: DESCRIPTION_STYLE_VALUE,
    description: '奶油色墙面与圆角木质家具',
    description_keywords: [],
    polished_prompt: '保留原房结构，使用奶油色墙面与圆角木质家具',
    polished_for: '奶油色墙面与圆角木质家具',
    refinement_id: 'ref-1',
    save_target: { scope: 'private', gallery_id: 'folder-1' }
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
    description_keywords: [],
    polished_prompt: '保留采光，优化空间陈设',
    polished_for: '保留采光',
    refinement_id: 'ref-1',
    save_target: { scope: 'private', gallery_id: 'folder-1' }
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
    description_keywords: [],
    polished_for: '增加阅读角',
    refinement_id: 'ref-1',
    save_target: { scope: 'private', gallery_id: 'folder-1' }
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

test('save path options keep concrete writable gallery ids and PC scope prefixes', () => {
  const options = savePathOptions([
    { id: 'private-child', name: '洋湖天序', visibility: 'private', can_manage: true },
    { id: 'enterprise-child', name: '品牌案例', visibility: 'enterprise', can_manage: true },
    { id: 'enterprise-readonly', name: '只读共享', visibility: 'enterprise', can_manage: false }
  ])

  assert.deepEqual(options, [
    { id: 'enterprise-child', name: '品牌案例', visibility: 'enterprise', label: '企业图库 / 品牌案例' },
    { id: 'private-child', name: '洋湖天序', visibility: 'private', label: '我的素材 / 洋湖天序' }
  ])
})

test('each workflow slot uses the confirmed enterprise and personal material entries', () => {
  assert.equal(typeof imageDesignLogic.imageSourceEntries, 'function')
  const { imageSourceEntries } = imageDesignLogic
  const galleries = [
    { id: 'case-root', name: '可重命名的案例库', visibility: 'enterprise', image_design_role: 'reference' },
    { id: 'rough-root', name: '可重命名的毛坯库', visibility: 'enterprise', image_design_role: 'rough' },
    { id: 'case-child', name: '案例子图库', visibility: 'enterprise', image_design_role: 'reference', parent_id: 'case-root' },
    { id: 'uncategorized', name: '未分类', visibility: 'private', is_system: true },
    { id: 'personal-root', name: '我的客厅', visibility: 'private' },
    { id: 'personal-child', name: '卧室', visibility: 'private', parent_id: 'personal-root' }
  ]

  assert.deepEqual(imageSourceEntries('source', galleries).map((item) => [item.key, item.folderId, item.badge]), [
    ['reference', 'case-root', '企业'],
    ['rough', 'rough-root', '企业'],
    ['uncategorized', 'uncategorized', '个人']
  ])
  assert.equal(imageSourceEntries('source', galleries)[2].sourceRole, 'source')
  const referenceEntries = imageSourceEntries('reference', galleries)
  assert.deepEqual(referenceEntries.map((item) => [item.key, item.label, item.badge]), [
    ['reference', '案例图库', '企业'],
    ['my-materials', '我的素材', '个人']
  ])
  assert.equal(referenceEntries[1].pickerMode, 'personal-folders')
  assert.equal(referenceEntries[1].disabled, false)
  assert.deepEqual(referenceEntries[1].folders.map((item) => item.id).sort(), ['personal-root', 'uncategorized'])
  assert.equal(referenceEntries[1].sourceRole, 'reference')
  const roughEntries = imageSourceEntries('rough', galleries)
  assert.deepEqual(roughEntries.map((item) => item.key), ['rough', 'my-materials'])
  assert.equal(roughEntries[1].pickerMode, 'personal-folders')
  assert.deepEqual(roughEntries[1].folders.map((item) => item.id).sort(), ['personal-root', 'uncategorized'])
  assert.equal(roughEntries[1].sourceRole, 'rough')
})

test('image-design picker preserves each gallery level instead of flattening descendants', () => {
  const folders = [
    { id: 'root', name: '案例图库', visibility: 'enterprise' },
    { id: 'child-a', name: '项目 A', visibility: 'enterprise', parent_id: 'root' },
    { id: 'child-b', name: '项目 B', visibility: 'enterprise', parent_id: 'root' },
    { id: 'grandchild', name: '客厅', visibility: 'enterprise', parent_id: 'child-a' },
    { id: 'other-root-child', name: '其他', visibility: 'enterprise', parent_id: 'other-root' }
  ]
  assert.deepEqual(childFolders(folders, 'root').map((item) => item.id), ['child-a', 'child-b'])
  assert.deepEqual(childFolders(folders, 'child-a').map((item) => item.id), ['grandchild'])
})

test('missing configured galleries stay visible but disabled', () => {
  assert.equal(typeof imageDesignLogic.imageSourceEntries, 'function')
  const { imageSourceEntries } = imageDesignLogic
  const entries = imageSourceEntries('reference', [])
  assert.deepEqual(entries.map((item) => [item.label, item.disabled]), [
    ['案例图库', true],
    ['我的素材', true]
  ])
})

test('gallery pagination appends new images without duplicating existing ids', () => {
  assert.equal(typeof imageDesignLogic.mergeGalleryItems, 'function')
  const { mergeGalleryItems } = imageDesignLogic
  assert.deepEqual(mergeGalleryItems(
    [{ id: 'old-1' }, { id: 'same' }],
    [{ id: 'same', name: '重复项' }, { id: 'new-1' }, null]
  ), [{ id: 'old-1' }, { id: 'same' }, { id: 'new-1' }])
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
    save_target: { scope: 'enterprise', gallery_id: 'target' },
    refinement_id: 'ref-1'
  }
  const payload = buildImageDesignPayload('adapt', draft)
  assert.equal(payload.images[0].role, 'reference')
  assert.equal(payload.images[1].asset_id, 'rough-asset')
  assert.equal(payload.count, 4)
  assert.equal(payload.ratio, 'landscape')
  assert.deepEqual(payload.save_target, { scope: 'enterprise', gallery_id: 'target' })
  assert.equal(payload.refinement_id, 'ref-1')
  assert.equal('save_target_id' in payload, false)
})

test('a generation payload sends transfer addons as an array', () => {
  const draft = {
    ...createImageDesignDrafts().transfer,
    reference: { id: 'design-ref' },
    description: '保留开窗',
    polished_prompt: '保留开窗，增加休闲元素',
    polished_for: '保留开窗',
    save_target: { scope: 'private', gallery_id: 'target' },
    refinement_id: 'ref-1',
    extra_element: ['落地窗旁休闲躺椅', '壁炉居中']
  }
  assert.deepEqual(buildImageDesignPayload('transfer', draft).extra_element, ['落地窗旁休闲躺椅', '壁炉居中'])
})

test('legacy folder ids migrate only after their writable scope is available', () => {
  const scopes = [{ scope: 'enterprise', label: '企业共享', can_write_root: true, folders: [{ id: 'legacy-folder', name: '案例', path: '项目 / 案例' }] }]
  const drafts = normalizeImageDesignDrafts({ redesign: { save_target_id: 'legacy-folder' }, adapt: { save_target_id: 'missing' } }, scopes)
  assert.deepEqual(drafts.redesign.save_target, { scope: 'enterprise', gallery_id: 'legacy-folder' })
  assert.equal(drafts.adapt.save_target, null)
  assert.equal('save_target_id' in drafts.redesign, false)
  assert.equal(saveTargetLabel(drafts.redesign.save_target, scopes), '企业共享 / 项目 / 案例')
  assert.equal(normalizeSaveTarget({ scope: 'invalid', gallery_id: 'x' }), null)
})
