export function createImageSelection() {
  return []
}

export function toggleImageSelection(selectedIds, imageId) {
  const current = Array.isArray(selectedIds) ? selectedIds : []
  return current.includes(imageId)
    ? current.filter((id) => id !== imageId)
    : [...current, imageId]
}

export function uploadDateKey(value) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  const shanghai = new Date(parsed.getTime() + 8 * 60 * 60 * 1000)
  const year = shanghai.getUTCFullYear()
  const month = String(shanghai.getUTCMonth() + 1).padStart(2, '0')
  const day = String(shanghai.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatUploadTime(value) {
  const date = uploadDateKey(value)
  if (!date) return '-'
  const shanghai = new Date(new Date(value).getTime() + 8 * 60 * 60 * 1000)
  const hour = String(shanghai.getUTCHours()).padStart(2, '0')
  const minute = String(shanghai.getUTCMinutes()).padStart(2, '0')
  return `${date.replace(/-/g, '')} ${hour}:${minute}`
}

export function nextDateRangeSelection(start, end, picked) {
  if (!start || end) return { start: picked, end: '' }
  return picked < start
    ? { start: picked, end: start }
    : { start, end: picked }
}

export function visiblePrivateGalleries(galleries) {
  return sortedPrivateGalleries((Array.isArray(galleries) ? galleries : []).filter((gallery) => !gallery?.parent_id))
}

export function privateChildGalleries(galleries, parentId) {
  return sortedPrivateGalleries(
    (Array.isArray(galleries) ? galleries : []).filter((gallery) => gallery?.parent_id === parentId)
  )
}

function sortedPrivateGalleries(galleries) {
  const folders = galleries.filter((gallery) => gallery && (gallery.visibility || 'private') === 'private')
  return folders.sort((left, right) => {
    if (Boolean(left.is_system) !== Boolean(right.is_system)) return left.is_system ? 1 : -1
    return String(left.name || '').localeCompare(String(right.name || ''), 'zh-CN')
  })
}
