export const IMAGE_DESIGN_WORKFLOWS = Object.freeze([
  Object.freeze({ key: 'redesign', label: '原房换装', description: '上传原房实拍图，保留原始结构进行软装焕新。' }),
  Object.freeze({ key: 'adapt', label: '户型适配', description: '参考效果图改造毛坯房，保留户型框架。' }),
  Object.freeze({ key: 'transfer', label: '跨空间迁移', description: '将参考图的设计语言迁移到指定目标空间。' })
])

export const IMAGE_RATIOS = Object.freeze([
  Object.freeze({ key: 'portrait', label: '竖图 3:4', pixels: '1080×1440' }),
  Object.freeze({ key: 'landscape', label: '横图 4:3', pixels: '1440×1080' }),
  Object.freeze({ key: 'square', label: '方图 1:1', pixels: '1024×1024' })
])

export const IMAGE_COUNTS = Object.freeze([2, 4])
export const IMAGE_QUALITIES = Object.freeze([
  Object.freeze({ key: '1k', label: '1K 标清' }),
  Object.freeze({ key: '2k', label: '2K 高清' })
])

export const DESCRIPTION_STYLE_VALUE = 'description_prompt'
export const IMAGE_DESIGN_STYLE_OPTIONS = Object.freeze([
  Object.freeze({ value: '现代轻奢', label: '现代轻奢' }),
  Object.freeze({ value: '意式极简', label: '意式极简' }),
  Object.freeze({ value: '新中式', label: '新中式' }),
  Object.freeze({ value: '现代法式', label: '现代法式' }),
  Object.freeze({ value: '极简奶油风', label: '极简奶油风' }),
  Object.freeze({ value: '现代简约', label: '现代简约' }),
  Object.freeze({ value: '侘寂风', label: '侘寂风' }),
  Object.freeze({ value: '南洋复古风', label: '南洋复古风' }),
  Object.freeze({ value: '美式现代', label: '美式现代' }),
  Object.freeze({ value: '日式极简禅风', label: '日式极简禅风' }),
  Object.freeze({ value: DESCRIPTION_STYLE_VALUE, label: '使用补充描述作为风格提示词' })
])

export const TARGET_SPACES = Object.freeze([
  '客厅', '餐厅', '厨房', '主卧', '次卧/儿童房', '书房', '主卫', '公卫',
  '阳台', '玄关', '衣帽间', '茶室', '影音室', '酒窖', '健身房', '长辈房', '客房'
])

// The product decision is to reuse this set for every target space in the first release.
export const TRANSFER_LAYOUTS = Object.freeze(['一字型沙发墙', 'L 型沙发 + 单人椅', '沙发对坐式', '无主沙发自由布局'])
export const TRANSFER_ELEMENTS = Object.freeze([
  '落地窗旁休闲躺椅', '沙发后长条书桌/吧台', '电视墙满墙收纳柜',
  '开放式层板展示架', '地毯划分沙发区', '壁炉居中'
])
export const MAX_TRANSFER_ELEMENTS = 2
export const DEFAULT_DESCRIPTION_KEYWORDS = Object.freeze(['高级质感', '空间合理', '专业空间摄影构图'])

export function createImageDesignDrafts() {
  return {
    redesign: createDraft(),
    adapt: { ...createDraft(), reference: null, rough: null },
    transfer: {
      ...createDraft(),
      reference: null,
      target_space: '客厅',
      layout_type: TRANSFER_LAYOUTS[0],
      extra_element: [TRANSFER_ELEMENTS[0]]
    }
  }
}

function createDraft() {
  return {
    source: null,
    style: '',
    description: '',
    description_keywords: [...DEFAULT_DESCRIPTION_KEYWORDS],
    polished_prompt: '',
    polished_for: '',
    refinement_id: '',
    ratio: 'portrait',
    count: 2,
    quality: '1k',
    save_target: null
  }
}

export function isSupportedImageDesignStyle(style) {
  return IMAGE_DESIGN_STYLE_OPTIONS.some((option) => option.value === style)
}

export function imageDesignStyleForPayload(style) {
  if (style === DESCRIPTION_STYLE_VALUE) return undefined
  return isSupportedImageDesignStyle(style) ? style : undefined
}

export function updateImageDesignDraftStyle(draft = {}, style) {
  const nextStyle = isSupportedImageDesignStyle(style) ? style : ''
  if (draft.style === nextStyle) return draft
  return clearStalePolish({ ...draft, style: nextStyle })
}

export function updateImageDesignDraftDescription(draft = {}, description) {
  const nextDescription = String(description || '')
  if (draft.description === nextDescription) return draft
  return clearStalePolish({ ...draft, description: nextDescription })
}

export function normalizeDescriptionKeywords(keywords) {
  return [...new Set((Array.isArray(keywords) ? keywords : [])
    .filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean))]
}

export function imageDesignDescription(draft = {}) {
  const keywords = normalizeDescriptionKeywords(draft.description_keywords).join('、')
  const description = String(draft.description || '').trim()
  return [keywords, description].filter(Boolean).join('。')
}

export function updateImageDesignDraftKeywords(draft = {}, keywords) {
  const next = { ...draft, description_keywords: normalizeDescriptionKeywords(keywords) }
  return imageDesignDescription(next) === imageDesignDescription(draft) ? next : clearStalePolish(next)
}

export function restoreImageDesignDraftKeywords(draft = {}) {
  return updateImageDesignDraftKeywords(draft, DEFAULT_DESCRIPTION_KEYWORDS)
}

export function updateImageDesignDraftImage(draft = {}, role, image) {
  if (!requiredImageRoles('redesign').concat(['reference', 'rough']).includes(role)) return draft
  if (draft[role] === image) return draft
  return clearStalePolish({ ...draft, [role]: image || null })
}

export function normalizeTransferElements(value) {
  const values = Array.isArray(value) ? value : (value ? [value] : [])
  return [...new Set(values.filter((item) => TRANSFER_ELEMENTS.includes(item)))].slice(0, MAX_TRANSFER_ELEMENTS)
}

export function toggleTransferElement(value, element) {
  const current = normalizeTransferElements(value)
  if (!TRANSFER_ELEMENTS.includes(element)) return current
  if (current.includes(element)) return current.filter((item) => item !== element)
  if (current.length >= MAX_TRANSFER_ELEMENTS) return current
  return [...current, element]
}

function clearStalePolish(draft) {
  return { ...draft, polished_prompt: '', polished_for: '', refinement_id: '' }
}

export function normalizeImageDesignDrafts(received, scopes = []) {
  const initial = createImageDesignDrafts()
  const next = {}
  Object.keys(initial).forEach((key) => {
    next[key] = { ...initial[key], ...((received && received[key]) || {}) }
    next[key].description_keywords = normalizeDescriptionKeywords(next[key].description_keywords)
    if (next[key].polished_for !== imageDesignDescription(next[key])) next[key] = clearStalePolish(next[key])
    if (key === 'transfer') next[key].extra_element = normalizeTransferElements(next[key].extra_element)
    next[key].save_target = normalizeSaveTarget(next[key].save_target) || migrateLegacySaveTarget(next[key], scopes)
    delete next[key].save_target_id
  })
  if (!isSupportedImageDesignStyle(next.redesign.style)) {
    next.redesign = clearStalePolish({ ...next.redesign, style: '' })
  }
  return next
}

export function requiredImageRoles(workflow) {
  if (workflow === 'adapt') return ['reference', 'rough']
  if (workflow === 'transfer') return ['reference']
  return ['source']
}

export function draftCanGenerate(workflow, draft) {
  if (!draft || !imageDesignDescription(draft) || imageDesignDescription(draft).length > 3000) return false
  if (!String(draft.polished_prompt || '').trim()) return false
  if (String(draft.polished_for || '') !== imageDesignDescription(draft)) return false
  if (!normalizeSaveTarget(draft.save_target) || !String(draft.refinement_id || '').trim()) return false
  if (!draft.ratio || !draft.count || !draft.quality) return false
  if (workflow === 'redesign' && !isSupportedImageDesignStyle(draft.style)) return false
  return requiredImageRoles(workflow).every((role) => Boolean(draft[role]))
}

export function imageSourceLabel(role) {
  const labels = {
    reference: '案例图',
    rough: '毛坯图',
    source: '原房图',
    upload: '本地上传',
    generated: '生成图片'
  }
  return labels[role] || '图库图片'
}

export function imageFileUrl(item) {
  return item && (
    item.thumbnail_file_url || item.thumb_url || item.thumbnail_url || item.image_url || item.file_url || item.url || item.path || ''
  )
}

export function normalizeImageDesignLibraryItem(item = {}, fallback = {}) {
  return {
    id: item.id || item.library_item_id || item.image_design_library_item_id || fallback.id || '',
    source_item_id: item.source_item_id || item.material_library_item_id || item.library_item_id || fallback.source_item_id || '',
    asset_id: item.asset_id || fallback.asset_id || '',
    file_url: imageFileUrl(item) || fallback.file_url || '',
    thumbnail_file_url: item.thumbnail_file_url || item.thumb_url || fallback.thumbnail_file_url || '',
    file_name: item.file_name || item.name || fallback.file_name || '图片素材',
    source_role: item.source_role || fallback.source_role || '',
    recognized_roles: Array.isArray(item.recognized_roles) ? item.recognized_roles : [],
    created_at: item.created_at || fallback.created_at || ''
  }
}

export function uniqueFolders(rawFolders = []) {
  const known = new Set()
  return rawFolders
    .filter((folder) => folder && folder.id)
    .filter((folder) => {
      if (known.has(folder.id)) return false
      known.add(folder.id)
      return true
    })
    .sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''), 'zh-CN'))
}

export function normalizeSaveTarget(value) {
  if (!value || !['private', 'enterprise'].includes(value.scope)) return null
  return { scope: value.scope, gallery_id: value.gallery_id || null }
}

export function fixedSaveTargetOptions(scopes = []) {
  const personal = scopes.find((scope) => scope.scope === 'private')
  const enterprise = scopes.find((scope) => scope.scope === 'enterprise')
  const folders = (enterprise?.folders || []).filter((folder) => folder.id && folder.name === '生图图库' && !folder.parent_id)
  const gallery = folders.length === 1 ? folders[0] : null
  return [
    { scope: 'private', gallery_id: null, label: '我的素材/AI生图图库', disabled: personal?.can_write_root !== true, hint: '直接保存到我的素材一级位置' },
    { scope: 'enterprise', gallery_id: gallery?.id || null, label: '企业共享 / 生图图库', disabled: !gallery,
      hint: gallery ? '保存到企业图库中的生图图库' : (enterprise?.error || '企业生图图库不可用，请联系管理员') }
  ]
}

export function imageDesignLibraryDate(value) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
}

export function saveTargetLabel(target, scopes = []) {
  const normalized = normalizeSaveTarget(target)
  if (!normalized) return ''
  const scope = scopes.find((item) => item && item.scope === normalized.scope)
  if (!scope) return ''
  if (!normalized.gallery_id) return scope.label || ''
  const folder = (scope.folders || []).find((item) => item && item.id === normalized.gallery_id)
  return folder ? `${scope.label || ''} / ${folder.path || folder.name || ''}` : ''
}

export function migrateLegacySaveTarget(draft = {}, scopes = []) {
  const legacyId = draft.save_target_id
  if (!legacyId) return null
  for (const scope of scopes) {
    if ((scope.folders || []).some((folder) => folder && folder.id === legacyId)) return { scope: scope.scope, gallery_id: legacyId }
  }
  return null
}

const IMAGE_SOURCE_ENTRY_DEFINITIONS = Object.freeze({
  reference: Object.freeze({ key: 'reference', label: '案例图库', badge: '企业', visibility: 'enterprise', includeDescendants: false }),
  rough: Object.freeze({ key: 'rough', label: '毛坯图库', badge: '企业', visibility: 'enterprise', includeDescendants: false }),
  'my-materials': Object.freeze({ key: 'my-materials', label: '我的素材', badge: '个人', visibility: 'private', pickerMode: 'personal-folders' }),
  uncategorized: Object.freeze({ key: 'uncategorized', label: '未分类', badge: '个人', visibility: 'private', includeDescendants: false })
})

export function personalMaterialFolders(rawFolders = []) {
  return uniqueFolders(rawFolders).filter((item) => !item.parent_id && (item.visibility || 'private') === 'private')
}

export function childFolders(rawFolders = [], parentId = '') {
  return uniqueFolders(rawFolders).filter((item) => (item.parent_id || '') === (parentId || ''))
}

export function imageSourceEntries(slot, rawFolders = []) {
  const folders = uniqueFolders(rawFolders)
  const keys = slot === 'source'
    ? ['reference', 'rough', 'uncategorized']
    : slot === 'reference'
      ? ['reference', 'my-materials']
      : ['rough', 'my-materials']

  return keys.map((key) => {
    const definition = IMAGE_SOURCE_ENTRY_DEFINITIONS[key]
    const personalFolders = key === 'my-materials' ? personalMaterialFolders(folders) : []
    const folder = key === 'uncategorized'
      ? folders.find((item) => item.id === 'uncategorized' && (item.visibility || 'private') === 'private')
      : folders.find((item) => !item.parent_id && item.visibility === 'enterprise' && item.image_design_role === key)
    return {
      ...definition,
      folder: folder || null,
      folderId: folder ? folder.id : '',
      folders: personalFolders,
      disabled: key === 'my-materials' ? !personalFolders.length : !folder,
      sourceRole: key === 'uncategorized'
        ? (slot === 'source' ? 'source' : slot)
        : key === 'my-materials'
          ? slot
          : key
    }
  })
}

export function mergeGalleryItems(current = [], incoming = []) {
  const known = new Set()
  return [...current, ...incoming].filter((item) => {
    if (!item || !item.id || known.has(item.id)) return false
    known.add(item.id)
    return true
  })
}

export function isPublicSaveFolder(folder) {
  if (!folder || (folder.visibility || '') === 'private') return false
  if (folder.is_public || folder.can_save_generated) return true
  return /公共|public/i.test(String(folder.name || ''))
}

export function isPrivateSaveFolder(folder) {
  return Boolean(folder) && (folder.visibility || 'private') === 'private'
}

export function saveableFolders(rawFolders = []) {
  return uniqueFolders(rawFolders).filter((folder) => isPrivateSaveFolder(folder) || isPublicSaveFolder(folder))
}

export function savePathOptions(rawFolders = []) {
  return uniqueFolders(rawFolders)
    .filter((folder) => folder.can_manage === true)
    .map((folder) => {
      const visibility = folder.visibility || 'private'
      const name = folder.name || '未命名图库'
      return {
        id: folder.id,
        name,
        visibility,
        label: `${visibility === 'enterprise' ? '企业图库' : '我的素材'} / ${name}`
      }
    })
}

export function buildImageDesignPayload(workflow, draft) {
  const images = requiredImageRoles(workflow).map((role) => ({
    role,
    library_item_id: draft[role].id,
    source_item_id: draft[role].source_item_id || undefined,
    asset_id: draft[role].asset_id || undefined
  }))

  return {
    workflow,
    images,
    style: imageDesignStyleForPayload(draft.style),
    description: imageDesignDescription(draft),
    polished_prompt: String(draft.polished_prompt || '').trim(),
    ratio: draft.ratio,
    count: Number(draft.count),
    quality: draft.quality,
    save_target: normalizeSaveTarget(draft.save_target),
    refinement_id: String(draft.refinement_id || '').trim(),
    target_space: draft.target_space || undefined,
    layout_type: draft.layout_type || undefined,
    extra_element: workflow === 'transfer' ? normalizeTransferElements(draft.extra_element) : undefined
  }
}

export function comparisonSources(result = {}) {
  const workflow = result.workflow || result.workflow_type || ''
  const generated = result.file_url || result.image_url || result.url || ''
  const source = result.source_image || result.source || result.original_image || {}
  const reference = result.reference_image || result.reference || {}
  const rough = result.rough_image || result.rough || {}

  if (workflow === 'adapt') {
    return [
      { label: '参考效果图', url: imageFileUrl(reference) || result.reference_file_url || '' },
      { label: '毛坯实拍图', url: imageFileUrl(rough) || result.rough_file_url || '' },
      { label: '效果图', url: generated }
    ]
  }

  return [
    { label: workflow === 'transfer' ? '参考效果图' : '原图', url: imageFileUrl(reference) || imageFileUrl(source) || result.source_file_url || '' },
    { label: '效果图', url: generated }
  ]
}
