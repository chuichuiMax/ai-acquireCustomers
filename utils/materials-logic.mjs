export const STYLE_OPTIONS = [
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
]

const MATERIAL_LIBRARY_HIDDEN_STYLES = new Set([
  '东方古雅',
  '欧式田园',
  '异域风情',
  '工业再造',
  '仿生未来'
])

export const MATERIAL_LIBRARY_STYLE_OPTIONS = STYLE_OPTIONS.filter(
  (style) => !MATERIAL_LIBRARY_HIDDEN_STYLES.has(style)
)

export function galleryStyle(gallery) {
  return gallery?.style || gallery?.style_name || gallery?.design_style || ''
}

export function filterGalleriesByStyle(galleries = [], style = '全部') {
  return galleries.filter((gallery) => {
    if (!gallery.parent_id) return false
    return style === '全部' || galleryStyle(gallery) === style
  })
}

export function groupGalleryItemsIntoRows(items = [], columns = 2) {
  const rows = []
  for (let index = 0; index < items.length; index += columns) {
    rows.push(items.slice(index, index + columns))
  }
  return rows
}

export function galleryCoverPath(gallery) {
  return gallery?.cover_thumbnail_file_url || gallery?.cover_file_url || ''
}

export function formatArea(value) {
  const text = String(value ?? '').trim()
  if (!text) return ''
  const normalized = text.replace(/\s*(?:㎡|m(?:²|2))\s*$/i, '').trim()
  return normalized ? `${normalized}㎡` : ''
}

export function createSelectionState(galleryId = '') {
  return { galleryId, orderedIds: [] }
}

export function toggleSelection(state, item) {
  const itemGalleryId = item.galleryId || state.galleryId
  if (state.galleryId && itemGalleryId && itemGalleryId !== state.galleryId) {
    throw new Error('只能选择同一个二级图库中的图片')
  }

  const orderedIds = state.orderedIds.includes(item.id)
    ? state.orderedIds.filter((id) => id !== item.id)
    : [...state.orderedIds, item.id]

  return {
    galleryId: state.galleryId || itemGalleryId || '',
    orderedIds
  }
}

export function buildShareSnapshot(gallery, items, orderedIds) {
  const itemMap = new Map(items.map((item) => [item.id, item]))
  return {
    galleryId: gallery.id,
    galleryName: gallery.name,
    card: {
      building: gallery.building,
      area: gallery.area,
      style: gallery.style
    },
    images: orderedIds.map((id) => itemMap.get(id)).filter(Boolean)
  }
}

export function buildWechatSharePayload(snapshot) {
  const first = snapshot?.images?.[0]
  if (!snapshot?.shareId || !first) return null

  const imageCount = snapshot.images.length
  return {
    title: snapshot.title || `${snapshot.galleryName || '素材图库'} · ${imageCount} 张实景图`,
    imageUrl: snapshot.coverLocalPath || snapshot.coverUrl || first.public_url || first.file_url || first.url || first.path || '',
    path: `/pages/materials/shared-case?shareId=${encodeURIComponent(snapshot.shareId)}`
  }
}

export function buildSharedCaseImages(rawImages = [], toPublicUrl = (url) => url) {
  return rawImages
    .map((image) => {
      const originalPath = image.url || image.file_url || image.public_url || image.path || ''
      const displayPath = image.webp_url || image.display_url || originalPath
      return {
        id: image.id,
        name: image.file_name || image.filename || image.name || '',
        displayUrl: toPublicUrl(displayPath),
        previewUrl: toPublicUrl(originalPath || displayPath)
      }
    })
    .filter((image) => Boolean(image.displayUrl))
}
