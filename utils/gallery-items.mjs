export function galleryItemList(data) {
  if (!data) return []
  if (Array.isArray(data)) return data
  const nested = data.data && !Array.isArray(data.data) ? data.data : data
  const list =
    (Array.isArray(data.items) && data.items) ||
    (Array.isArray(nested.items) && nested.items) ||
    (Array.isArray(data.records) && data.records) ||
    (Array.isArray(nested.records) && nested.records) ||
    []
  return list
}

export function galleryItemTotal(data, loadedCount) {
  const nested = data && data.data && !Array.isArray(data.data) ? data.data : data
  const total = Number((data && data.total) || (nested && nested.total) || (data && data.count) || 0)
  return total > 0 ? total : loadedCount
}

export function isGalleryItemUsed(item) {
  return Boolean(item && (item.in_use || item.used || item.is_used))
}

export function sortGalleryItems(items) {
  const list = Array.isArray(items) ? items.slice() : []
  return list.sort((left, right) => Number(isGalleryItemUsed(left)) - Number(isGalleryItemUsed(right)))
}

export async function loadAllGalleryItems(fetchPage, options = {}) {
  const pageSize = options.page_size || 100
  let page = 1
  let items = []
  const seen = {}
  while (page <= 30) {
    const data = await fetchPage({ page, page_size: pageSize })
    const batch = galleryItemList(data)
    let added = 0
    for (let index = 0; index < batch.length; index += 1) {
      const item = batch[index]
      const key = item && (item.id || item.asset_id)
      if (!key || seen[key]) continue
      seen[key] = true
      items.push(item)
      added += 1
    }
    const total = galleryItemTotal(data, items.length)
    if (!added || items.length >= total || (batch.length < pageSize && !(total > items.length))) break
    page += 1
  }
  return sortGalleryItems(items)
}
