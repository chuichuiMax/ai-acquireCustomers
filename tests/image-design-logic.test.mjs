import assert from 'node:assert/strict'
import test from 'node:test'
import * as imageDesignLogic from '../utils/image-design-logic.mjs'
import {
  buildImageDesignPayload,
  childFolders,
  createImageDesignDrafts,
  DESCRIPTION_STYLE_VALUE,
  draftCanGenerate,
  IMAGE_COUNTS,
  IMAGE_DESIGN_STYLE_OPTIONS,
  normalizeTransferElements,
  imageDesignStyleForPayload,
  isSupportedImageDesignStyle,
  normalizeImageDesignDrafts,
  normalizeImageSourceFolders,
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

test('every workflow image slot lists all visible first-level personal and enterprise galleries', () => {
  assert.equal(typeof imageDesignLogic.imageSourceEntries, 'function')
  const { imageSourceEntries } = imageDesignLogic
  const galleries = [
    { id: 'case-root', name: '案例图库', visibility: 'enterprise', image_design_role: 'reference' },
    { id: 'rough-root', name: '毛坯图库', visibility: 'enterprise', image_design_role: 'rough' },
    { id: 'shared-root', name: '其他共享图库', visibility: 'enterprise' },
    { id: 'case-child', name: '案例子图库', visibility: 'enterprise', image_design_role: 'reference', parent_id: 'case-root' },
    { id: 'uncategorized', name: '未分类', visibility: 'private', is_system: true },
    { id: 'personal-root', name: '我的客厅', visibility: 'private' },
    { id: 'personal-child', name: '卧室', visibility: 'private', parent_id: 'personal-root' },
    { id: 'storage-root', name: '存储根', visibility: 'internal' }
  ]

  const expectedIds = ['case-root', 'personal-root', 'rough-root', 'shared-root', 'uncategorized']
  for (const slot of ['source', 'reference', 'rough']) {
    const entries = imageSourceEntries(slot, galleries)
    assert.deepEqual(entries.map((item) => item.folderId).sort(), expectedIds)
    assert(entries.every((item) => item.sourceRole === slot))
    assert(entries.every((item) => item.folder.id === item.folderId))
    assert.deepEqual(entries.map((item) => item.scopeLabel), [
      '我的素材', '我的素材', '企业共享', '企业共享', '企业共享'
    ])
    assert.deepEqual(entries.map((item) => item.badge), ['个人', '个人', '企业', '企业', '企业'])
  }
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

test('an empty gallery response produces no fake folder entries', () => {
  assert.equal(typeof imageDesignLogic.imageSourceEntries, 'function')
  const { imageSourceEntries } = imageDesignLogic
  assert.deepEqual(imageSourceEntries('reference', []), [])
})

test('image source folders match current PC galleries even with a legacy MP response', () => {
  const folders = normalizeImageSourceFolders([
    { id: 'background', name: '背景', visibility: 'private', is_system: true },
    { id: 'scene', name: '场景', visibility: 'private', is_system: true },
    { id: 'people', name: '人物', visibility: 'private', is_system: true },
    { id: 'decoration', name: '装饰', visibility: 'private', is_system: true },
    { id: 'brand', name: '品牌', visibility: 'private', is_system: true },
    { id: 'old-child', name: '旧子图库', visibility: 'private', parent_id: 'scene' },
    { id: 'product', name: '产品商品', visibility: 'private', is_system: true },
    { id: 'uncategorized', name: '未分类', visibility: 'private', is_system: true },
    { id: 'mine', name: '自建图库', visibility: 'private', is_system: false },
    { id: 'mine-child', name: '自建子图库', visibility: 'private', parent_id: 'mine' },
    { id: 'shared', name: '企业图库', visibility: 'enterprise' }
  ])

  assert.deepEqual(folders.map((folder) => folder.id).sort(),
    ['product', 'uncategorized', 'mine', 'mine-child', 'shared'].sort())
  assert.equal(folders.find((folder) => folder.id === 'product').name, 'AI生图图库')
  assert.equal(folders.find((folder) => folder.id === 'uncategorized').name, '我的图库')
  assert.deepEqual(imageDesignLogic.imageSourceEntries('rough', folders).map((entry) => entry.folderId).sort(),
    ['product', 'uncategorized', 'mine', 'shared'].sort())
  assert.deepEqual(childFolders(folders, 'mine').map((folder) => folder.id), ['mine-child'])
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

test('all image design workflows can submit one image while keeping two as the default', () => {
  assert.deepEqual(IMAGE_COUNTS, [1, 2, 4])
  const drafts = createImageDesignDrafts()
  const images = {
    redesign: { source: { id: 'source' } },
    adapt: { reference: { id: 'reference' }, rough: { id: 'rough' } },
    transfer: { reference: { id: 'reference' } }
  }
  for (const workflow of ['redesign', 'adapt', 'transfer']) {
    assert.equal(drafts[workflow].count, 2)
    assert.equal(buildImageDesignPayload(workflow, { ...drafts[workflow], ...images[workflow], count: 1 }).count, 1)
  }
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

test('legacy private root drafts resolve to the actual personal generated gallery', () => {
  const scopes = [{ scope: 'private', can_write_root: true, folders: [{ id: 'actual-generated', personal_folder: 'generated' }] }]
  const drafts = normalizeImageDesignDrafts({ redesign: { save_target: { scope: 'private', gallery_id: null } } }, scopes)
  assert.deepEqual(drafts.redesign.save_target, { scope: 'private', gallery_id: 'actual-generated' })
  assert.deepEqual(normalizeImageDesignDrafts(drafts, scopes).redesign.save_target, drafts.redesign.save_target)
})

test('legacy enterprise save targets are cleared after personal gallery migration', () => {
  const scopes = [{ scope: 'private', label: '我的素材', can_write_root: true, folders: [] }]
  const drafts = normalizeImageDesignDrafts({ redesign: { save_target_id: 'legacy-folder' }, adapt: { save_target_id: 'missing' } }, scopes)
  assert.equal(drafts.redesign.save_target, null)
  assert.equal(drafts.adapt.save_target, null)
  assert.equal('save_target_id' in drafts.redesign, false)
  assert.equal(saveTargetLabel(drafts.redesign.save_target, scopes), '')
  assert.equal(normalizeSaveTarget({ scope: 'invalid', gallery_id: 'x' }), null)
})

test('enterprise drafts retain their actual target across all three workflows', () => {
  const scopes = [{ scope: 'enterprise', folders: [{ id: 'shared-real', name: '生图图库', can_write: true }] }]
  const received = Object.fromEntries(['redesign', 'adapt', 'transfer'].map(workflow => [workflow, { save_target: { scope: 'enterprise', gallery_id: 'shared-real' } }]))
  const drafts = normalizeImageDesignDrafts(received, scopes)
  for (const draft of Object.values(drafts)) assert.deepEqual(draft.save_target, { scope: 'enterprise', gallery_id: 'shared-real' })
  const unavailable = normalizeImageDesignDrafts(received, [{ scope: 'enterprise', folders: [], error: '重复图库' }])
  for (const draft of Object.values(unavailable)) assert.equal(draft.save_target, null)
})

test('explicit legacy private-root resolves to the real AI gallery', () => {
  const scopes = [{ scope: 'private', can_write_root: true, folders: [{ id: 'ai-real', personal_folder: 'generated' }] }]
  const drafts = normalizeImageDesignDrafts({ transfer: { save_target: { scope: 'private', gallery_id: 'private-root' } } }, scopes)
  assert.deepEqual(drafts.transfer.save_target, { scope: 'private', gallery_id: 'ai-real' })
})
