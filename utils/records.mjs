export function normalizeContentList(data) {
  if (!data) return []
  if (Array.isArray(data)) return data
  const nested = data.data && !Array.isArray(data.data) ? data.data : data
  const list =
    (Array.isArray(data.data) && data.data) ||
    nested.items ||
    nested.contents ||
    nested.tasks ||
    nested.records ||
    nested.results ||
    nested.list
  return Array.isArray(list) ? list : []
}
