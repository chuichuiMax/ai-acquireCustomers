import { galleryStyle } from './materials-logic.mjs'

export function isEnterpriseCaseGallery(gallery, parent = null) {
  if (!gallery) return false
  const root = gallery.parent_id ? parent : gallery
  return (
    gallery.visibility === 'enterprise'
    && root?.visibility === 'enterprise'
    && (root.image_design_role === 'reference' || root.name === '案例图库')
  )
}

export function isCaseGalleryChild(gallery, galleries = []) {
  if (!gallery?.parent_id) return false
  const parent = galleries.find((item) => item.id === gallery.parent_id)
  return isEnterpriseCaseGallery(gallery, parent)
}

export function findCaseGalleryRoot(gallery, galleries = []) {
  if (!gallery) return null
  let current = gallery
  const rows = Array.isArray(galleries) ? galleries : []
  while (current) {
    if (isEnterpriseCaseGallery(current)) return current
    if (!current.parent_id) return null
    current = rows.find((item) => item.id === current.parent_id) || null
  }
  return null
}

export function isWithinCaseGallery(gallery, galleries = []) {
  return Boolean(findCaseGalleryRoot(gallery, galleries))
}

export function filterCaseGalleryChildren(children = [], designStyle = '', address = '') {
  const keyword = String(address || '').trim().toLowerCase()
  return (Array.isArray(children) ? children : []).filter((item) => {
    if (designStyle && designStyle !== '全部' && galleryStyle(item) !== designStyle) return false
    if (!keyword) return true
    const building = `${item.building_name || item.building || ''} ${item.name || ''}`.toLowerCase()
    return building.includes(keyword)
  })
}

export function filterCaseGalleryItems(items = [], designStyle = '') {
  if (!designStyle || designStyle === '全部') return items
  return items.filter((item) => {
    const style = item.design_style || item.style || item.style_name || ''
    return style === designStyle
  })
}
