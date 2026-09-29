const ROUGH_NAMES = new Set(['毛坯房图库', '毛胚房图库', '毛坯图库'])

export function legacyMaterialSources(galleries = []) {
  const rows = Array.isArray(galleries) ? galleries : []
  const byId = new Map(rows.map((row) => [row.id, row]))
  const sources = { rough: [], generated: [], uploads: [] }
  for (const row of rows) {
    let root = row
    const visited = new Set()
    while (root?.parent_id && byId.has(root.parent_id) && !visited.has(root.id)) {
      visited.add(root.id)
      root = byId.get(root.parent_id)
    }
    const scope = row.visibility || root?.visibility || 'private'
    let folder = ''
    if (root?.image_design_role === 'rough' || ROUGH_NAMES.has(root?.name)) folder = 'rough'
    else if (root?.name === '生图图库' || root?.name === 'AI生图图库' || (scope === 'private' && root?.id === 'product')) folder = 'generated'
    else if (scope === 'private' || root?.name === '我的上传') folder = 'uploads'
    if (folder) {
      const reportedCount = Number(row.direct_count ?? row.count)
      sources[folder].push({ id: row.id, scope, count: Number.isFinite(reportedCount) ? reportedCount : null })
    }
  }
  if (!sources.uploads.some((item) => item.id === 'private-root' && item.scope === 'private')) {
    sources.uploads.push({ id: 'private-root', scope: 'private', count: null })
  }
  return sources
}

export function legacyFolderCount(sources = []) {
  if (!sources.length || sources.some((source) => source.count === null)) return null
  return sources.reduce((sum, source) => sum + source.count, 0)
}

export function mergeLegacyMaterialItems(groups = []) {
  const byId = new Map()
  for (const group of groups) {
    for (const item of group || []) if (item?.id) byId.set(item.id, item)
  }
  return [...byId.values()].sort((a, b) => {
    const byDate = String(b.created_at || '').localeCompare(String(a.created_at || ''))
    return byDate || String(b.id).localeCompare(String(a.id))
  })
}
