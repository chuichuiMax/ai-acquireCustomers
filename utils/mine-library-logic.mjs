export function createImageSelection() {
  return []
}

export function toggleImageSelection(selectedIds, imageId) {
  const current = Array.isArray(selectedIds) ? selectedIds : []
  return current.includes(imageId)
    ? current.filter((id) => id !== imageId)
    : [...current, imageId]
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
