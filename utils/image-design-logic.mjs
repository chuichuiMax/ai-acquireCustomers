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

export function createImageDesignDrafts() {
  return {
    redesign: createDraft(),
    adapt: { ...createDraft(), reference: null, rough: null },
    transfer: {
      ...createDraft(),
      reference: null,
      target_space: '客厅',
      layout_type: TRANSFER_LAYOUTS[0],
      extra_element: TRANSFER_ELEMENTS[0]
    }
  }
}

function createDraft() {
  return {
    source: null,
    style: '',
    description: '',
    polished_prompt: '',
    polished_for: '',
    ratio: 'portrait',
    count: 2,
    quality: '1k',
    save_target_id: ''
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
  return { ...draft, style: nextStyle, polished_prompt: '', polished_for: '' }
}

export function normalizeImageDesignDrafts(received) {
  const initial = createImageDesignDrafts()
  const next = {}
  Object.keys(initial).forEach((key) => {
    next[key] = { ...initial[key], ...((received && received[key]) || {}) }
  })
  if (!isSupportedImageDesignStyle(next.redesign.style)) {
    next.redesign = { ...next.redesign, style: '', polished_prompt: '', polished_for: '' }
  }
  return next
}

export function requiredImageRoles(workflow) {
  if (workflow === 'adapt') return ['reference', 'rough']
  if (workflow === 'transfer') return ['reference']
  return ['source']
}

export function draftCanGenerate(workflow, draft) {
  if (!draft || !String(draft.description || '').trim()) return false
  if (!String(draft.polished_prompt || '').trim()) return false
  if (String(draft.polished_for || '') !== String(draft.description || '')) return false
  if (!draft.save_target_id || !draft.ratio || !draft.count || !draft.quality) return false
  if (workflow === 'redesign' && !isSupportedImageDesignStyle(draft.style)) return false
  return requiredImageRoles(workflow).every((role) => Boolean(draft[role]))
}

export function imageSourceLabel(role) {
  const labels = {
    reference: '案例图',
    rough: '毛坯图',
    source: '原房图',
    upload: '本地上传'
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
    description: String(draft.description || '').trim(),
    polished_prompt: String(draft.polished_prompt || '').trim(),
    ratio: draft.ratio,
    count: Number(draft.count),
    quality: draft.quality,
    save_target_id: draft.save_target_id,
    target_space: draft.target_space || undefined,
    layout_type: draft.layout_type || undefined,
    extra_element: draft.extra_element || undefined
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
