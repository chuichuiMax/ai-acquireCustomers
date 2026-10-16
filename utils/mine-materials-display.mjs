export const MY_MATERIALS_ROUGH_NOTICE =
  '提示：毛坯房图库上传的照片数量为考核上传数量的图库；'

export const STANDARD_MATERIAL_FOLDER_ORDER = Object.freeze([
  'rough',
  'generated',
  'uploads',
  'works',
  'video'
])

export const STANDARD_MATERIAL_FOLDER_LABELS = Object.freeze({
  rough: '毛坯房图库',
  generated: '生图图库',
  uploads: '我的上传',
  works: '我的作品',
  video: '生图视频'
})

export function displayMaterialFolderName(folder = {}) {
  const key = folder.id
  if (key && STANDARD_MATERIAL_FOLDER_LABELS[key]) return STANDARD_MATERIAL_FOLDER_LABELS[key]
  if (key === 'generated' && (folder.name === 'AI生图图库' || folder.name === '生图图库')) {
    return '生图图库'
  }
  return folder.name || ''
}

export function sortMaterialFolders(folders = []) {
  const order = new Map(STANDARD_MATERIAL_FOLDER_ORDER.map((id, index) => [id, index]))
  return [...folders].sort((left, right) => {
    const leftIndex = order.has(left.id) ? order.get(left.id) : 999
    const rightIndex = order.has(right.id) ? order.get(right.id) : 999
    return leftIndex - rightIndex || String(left.name || '').localeCompare(String(right.name || ''), 'zh-CN')
  })
}

export function withStandardMaterialFolders(folders = []) {
  const sorted = sortMaterialFolders(folders)
  if (!sorted.some((folder) => folder.id === 'video')) {
    sorted.push({
      id: 'video',
      name: STANDARD_MATERIAL_FOLDER_LABELS.video,
      count: 0,
      can_upload: false,
      placeholder: true
    })
  }
  return sorted
}
