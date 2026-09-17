function firstMediaPath(...values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      const nested = firstMediaPath(...value)
      if (nested) return nested
      continue
    }
    if (value && typeof value === 'object') {
      const nested = firstMediaPath(value.url, value.file_url, value.preview_url)
      if (nested) return nested
      continue
    }
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

export function templateOverlayPath(template) {
  if (!template || typeof template !== 'object') return ''
  const previews = Array.isArray(template.preview_urls) ? template.preview_urls : []
  return firstMediaPath(
    template.overlay_url,
    template.overlay_file_url,
    template.overlay_urls,
    template.mask_url,
    template.transparent_url,
    template.layer_url,
    template.layer_urls,
    previews.length > 1 ? previews.slice(1) : '',
    previews,
    template.preview_url
  )
}
