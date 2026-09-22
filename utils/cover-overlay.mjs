export function firstOverlayPath(...values) {
  const paths = collectOverlayPaths(values)
  const png = paths.find(isPngPath)
  return png || paths[0] || ''
}

export function isPngPath(path) {
  return /\.png(?:\?|#|$)/i.test(String(path || ''))
}

export function preserveOverlayAlpha(url) {
  if (!url) return ''
  const cleaned = String(url)
    .replace(/\/format,webp(?=\/|$)/gi, '')
    .replace(/\/format\/webp(?=\/|$)/gi, '')
    .replace(/\/resize,w_\d+(?=\/|$)/gi, '')
    .replace(/\/quality,q_\d+(?=\/|$)/gi, '')
    .replace(/([?&])format=webp&?/gi, '$1')
    .replace(/[?&]$/, '')
  return cleaned.replace(/([?&]x-oss-process=image)(?=&|$)/i, '$1/')
}

function collectOverlayPaths(values, paths) {
  const list = paths || []
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    if (Array.isArray(value) && value.length) {
      collectOverlayPaths(value, list)
    } else if (value && typeof value === 'object') {
      collectOverlayPaths(
        [
          value.overlay_url,
          value.overlay_file_url,
          value.overlay_image_url,
          value.overlay_png_url,
          value.foreground_url,
          value.transparent_url,
          value.png_url,
          value.url,
          value.file_url
        ],
        list
      )
    } else if (typeof value === 'string' && value.trim()) {
      list.push(value.trim())
    }
  }
  return list
}

function dedicatedOverlayPath(template) {
  return firstOverlayPath(
    template.overlay_url,
    template.overlay_file_url,
    template.overlay_image_url,
    template.overlay_png_url,
    template.overlay_urls,
    template.foreground_url,
    template.png_url,
    template.mask_url,
    template.transparent_url,
    template.layer_url,
    template.layer_urls
  )
}

function previewOverlayPath(template) {
  return firstOverlayPath(template.preview_urls, template.preview_url, template.cover_url, template.file_url)
}

export function templateOverlayPath(template) {
  const resolved = resolveTemplateOverlay(template)
  return resolved.path
}

export function resolveTemplateOverlay(template) {
  if (!template) return { path: '', multiply: false }
  const dedicated = dedicatedOverlayPath(template)
  if (dedicated) return { path: dedicated, multiply: false }

  const previews = Array.isArray(template.preview_urls) ? template.preview_urls : []
  const legacyOverlay = previews.length > 1 ? firstOverlayPath(...previews.slice(1)) : ''
  if (legacyOverlay) return { path: legacyOverlay, multiply: true }

  const preview = previewOverlayPath(template)
  if (preview) return { path: preview, multiply: !isPngPath(preview) }
  return { path: '', multiply: false }
}

export function mergeCoverTemplates(schemaTemplates, extraTemplates) {
  const base = Array.isArray(schemaTemplates) ? schemaTemplates.slice() : []
  const extras = Array.isArray(extraTemplates) ? extraTemplates : []
  if (!extras.length) return base
  const byId = {}
  for (let index = 0; index < extras.length; index += 1) {
    const item = extras[index]
    if (item && item.id != null) byId[String(item.id)] = item
  }
  return base.map((item) => {
    const extra = item && item.id != null ? byId[String(item.id)] : null
    return extra ? Object.assign({}, item, extra) : item
  })
}

export function extraTemplateList(data) {
  if (!data) return []
  if (Array.isArray(data)) return data
  const nested = data.data && !Array.isArray(data.data) ? data.data : data
  return (
    (Array.isArray(data.templates) && data.templates) ||
    (Array.isArray(data.hycanvas_templates) && data.hycanvas_templates) ||
    (Array.isArray(data.items) && data.items) ||
    (Array.isArray(nested.templates) && nested.templates) ||
    (Array.isArray(nested.hycanvas_templates) && nested.hycanvas_templates) ||
    (Array.isArray(nested.items) && nested.items) ||
    []
  )
}

export function aspectFillSourceRect(imageWidth, imageHeight, destWidth, destHeight) {
  if (!imageWidth || !imageHeight || !destWidth || !destHeight) {
    return { sx: 0, sy: 0, sw: imageWidth || 0, sh: imageHeight || 0 }
  }
  const scale = Math.max(destWidth / imageWidth, destHeight / imageHeight)
  const sw = destWidth / scale
  const sh = destHeight / scale
  return {
    sx: (imageWidth - sw) / 2,
    sy: (imageHeight - sh) / 2,
    sw,
    sh
  }
}

export function overlayLooksOpaqueWhite(pixels) {
  if (!pixels || !pixels.length) return false
  let white = 0
  for (let index = 0; index < pixels.length; index += 1) {
    const pixel = pixels[index]
    if (!pixel) continue
    if (pixel.a > 250 && pixel.r > 245 && pixel.g > 245 && pixel.b > 245) white += 1
  }
  return white >= Math.max(1, pixels.length - 1)
}

export function sampleOverlayCorners(data, width, height) {
  if (!data || !width || !height) return []
  const at = (x, y) => {
    const index = (y * width + x) * 4
    return { r: data[index], g: data[index + 1], b: data[index + 2], a: data[index + 3] }
  }
  const right = Math.max(0, width - 3)
  const bottom = Math.max(0, height - 3)
  return [at(2, 2), at(right, 2), at(2, bottom), at(right, bottom)]
}

export function knockoutWhiteBackground(data) {
  if (!data || !data.length) return data
  for (let index = 0; index < data.length; index += 4) {
    const r = data[index]
    const g = data[index + 1]
    const b = data[index + 2]
    const a = data[index + 3]
    if (!a) continue
    const dist = (255 - r + (255 - g) + (255 - b)) / 3
    if (dist < 5) {
      data[index + 3] = 0
      continue
    }
    if (dist < 20) {
      data[index + 3] = Math.round(((dist - 5) / 15) * a)
    } else {
      data[index + 3] = 255
    }
    if (data[index + 3] > 40 && dist < 70) {
      const lift = (70 - dist) / 70
      data[index] = Math.min(255, Math.round(r + (255 - r) * lift * 0.7))
      data[index + 1] = Math.min(255, Math.round(g + (255 - g) * lift * 0.7))
      data[index + 2] = Math.min(255, Math.round(b + (255 - b) * lift * 0.7))
    }
  }
  return data
}

export function sourceOver(base, overlay) {
  if (!base || !overlay) return base
  const length = Math.min(base.length, overlay.length)
  for (let index = 0; index < length; index += 4) {
    const oa = overlay[index + 3] / 255
    if (!oa) continue
    const ia = 1 - oa
    base[index] = Math.round(overlay[index] * oa + base[index] * ia)
    base[index + 1] = Math.round(overlay[index + 1] * oa + base[index + 1] * ia)
    base[index + 2] = Math.round(overlay[index + 2] * oa + base[index + 2] * ia)
    base[index + 3] = 255
  }
  return base
}
