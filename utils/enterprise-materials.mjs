const ROUGH_GALLERY_NAMES = new Set(['毛坯房图库', '毛胚房图库', '毛坯图库'])

export function isEnterpriseRoughGallery(gallery = {}) {
  if ((gallery.visibility || '') !== 'enterprise') return false
  if (gallery.parent_id) return false
  if (gallery.image_design_role === 'rough') return true
  return ROUGH_GALLERY_NAMES.has(String(gallery.name || '').trim())
}

export function filterEnterpriseRoughGalleries(galleries = []) {
  return (Array.isArray(galleries) ? galleries : []).filter(isEnterpriseRoughGallery)
}

export function materialItemOwnerUid(item = {}) {
  return String(item.owner_uid || item.uploaded_by || '').trim()
}

/** 企业毛坯房图库：仅允许删除本人上传（与后端 can_manage 一致）。 */
export function canDeleteEnterpriseRoughItem(item = {}, currentUid = '') {
  const uid = String(currentUid || '').trim()
  if (!uid) return false
  return materialItemOwnerUid(item) === uid
}

export function canSelectMaterialItemForDelete(item = {}, { scope = 'private', currentUid = '' } = {}) {
  if (!item) return false
  if (scope === 'enterprise') {
    return canDeleteEnterpriseRoughItem(item, currentUid)
  }
  return Boolean(item.can_manage)
}
