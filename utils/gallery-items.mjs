function hasUsageValue(value) {
  if (value === true) return true
  if (typeof value === 'number') return value > 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized === 'true' || normalized === 'yes' || Number(normalized) > 0
  }
  return false
}

export function isGalleryItemUsed(item) {
  if (!item || typeof item !== 'object') return false
  return hasUsageValue(item.in_use) || hasUsageValue(item.is_used) ||
    hasUsageValue(item.usage_count) || hasUsageValue(item.used_count)
}

export async function loadAllGalleryItems(loadPage, pageSize = 100) {
  const items = []
  let page = 1
  let total = null

  while (page <= 1000) {
    const data = await loadPage({ page, page_size: pageSize }) || {}
    const pageItems = Array.isArray(data.items) ? data.items :
      (Array.isArray(data.gallery_items) ? data.gallery_items : [])
    const reportedTotal = Number(data.total)
    if (Number.isFinite(reportedTotal) && reportedTotal >= 0) total = reportedTotal

    items.push(...pageItems)
    if (total !== null && items.length >= total) return items.slice(0, total)
    if (!pageItems.length) return items
    if (total === null && pageItems.length < pageSize) return items
    page += 1
  }

  return items
}
