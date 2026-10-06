import assert from 'node:assert/strict'
import test from 'node:test'
import {
  aspectFillSourceRect,
  clearEdgeConnectedWhiteBackground,
  knockoutWhiteBackground,
  mergeCoverTemplates,
  overlayLooksOpaqueWhite,
  padWhiteTypeWithBlack,
  preserveOverlayAlpha,
  resolveTemplateOverlay,
  shouldPadWhiteType,
  sourceOver,
  templateOverlayPath,
  templatePreviewCardPath
} from '../utils/cover-overlay.mjs'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

test('template preview cards prefer preview urls over overlay endpoints', () => {
  assert.equal(
    templatePreviewCardPath({
      overlay_url: '/api/mp/content/hycanvas-templates/t1/overlay',
      preview_urls: ['/api/mp/content/hycanvas-templates/t1/preview']
    }),
    '/api/mp/content/hycanvas-templates/t1/preview'
  )
})

test('template overlay selection prefers explicit overlay media over template previews', () => {
  const path = templateOverlayPath({
    overlay_urls: ['', { file_url: '/templates/overlay.png' }],
    preview_urls: ['/templates/preview.png', '/templates/legacy-overlay.png']
  })

  assert.equal(path, '/templates/overlay.png')
})

test('template overlay selection uses a second preview as the legacy overlay fallback', () => {
  assert.equal(
    templateOverlayPath({ preview_urls: ['/templates/preview.png', '/templates/legacy-overlay.png'] }),
    '/templates/legacy-overlay.png'
  )
})

test('overlay resolver uses multiply only for the legacy second-preview overlay', () => {
  assert.deepEqual(
    resolveTemplateOverlay({
      overlay_url: '/templates/overlay.png',
      preview_urls: ['/templates/preview.png', '/templates/legacy-overlay.png']
    }),
    { path: '/templates/overlay.png', multiply: false }
  )
  assert.deepEqual(
    resolveTemplateOverlay({ preview_urls: ['/templates/preview.png', '/templates/legacy-overlay.png'] }),
    { path: '/templates/legacy-overlay.png', multiply: true }
  )
})

test('jpeg template previews use multiply so the cover photo stays visible', () => {
  assert.deepEqual(
    resolveTemplateOverlay({
      preview_urls: ['/preview.jpg'],
      preview_url: '/preview.jpg'
    }),
    { path: '/preview.jpg', multiply: true }
  )
})

test('overlay urls keep png alpha instead of a webp conversion', () => {
  assert.equal(
    preserveOverlayAlpha('https://cdn.example/overlay.png?x-oss-process=image/format,webp/resize,w_360'),
    'https://cdn.example/overlay.png?x-oss-process=image/'
  )
})

test('schema templates pick up overlay files from the cover-templates payload', () => {
  const merged = mergeCoverTemplates(
    [{ id: 'a', preview_urls: ['/preview.jpg'] }],
    [{ id: 'a', overlay_url: '/overlay.png' }]
  )
  assert.equal(resolveTemplateOverlay(merged[0]).path, '/overlay.png')
})

test('white template backgrounds are punched out so type stays solid', () => {
  const data = new Uint8ClampedArray([
    255, 255, 255, 255,
    230, 226, 218, 255,
    32, 32, 32, 255
  ])
  knockoutWhiteBackground(data)
  assert.equal(data[3], 0)
  assert.ok(data[7] > 200)
  assert.equal(data[11], 255)
  assert.equal(data[8], 32)
})

test('edge-connected white cleanup preserves isolated white template type', () => {
  const width = 5
  const height = 5
  const data = new Uint8ClampedArray(width * height * 4)
  for (let index = 0; index < data.length; index += 4) {
    data[index] = 255
    data[index + 1] = 255
    data[index + 2] = 255
    data[index + 3] = 255
  }
  const setPixel = (x, y, r, g, b) => {
    const index = (y * width + x) * 4
    data[index] = r
    data[index + 1] = g
    data[index + 2] = b
  }
  for (const point of [[1, 2], [2, 1], [3, 2], [2, 3]]) setPixel(point[0], point[1], 0, 0, 0)

  clearEdgeConnectedWhiteBackground(data, width, height)

  assert.equal(data[3], 0)
  assert.equal(data[(2 * width + 2) * 4 + 3], 255)
})

test('source-over keeps opaque type on top of the cover photo', () => {
  const base = new Uint8ClampedArray([10, 20, 30, 255])
  const overlay = new Uint8ClampedArray([255, 255, 255, 255])
  sourceOver(base, overlay)
  assert.equal(base[0], 255)
  assert.equal(base[3], 255)
})

test('opaque white overlay corners are detected and cover photos are cropped with aspect fill', () => {
  assert.equal(
    overlayLooksOpaqueWhite([
      { r: 255, g: 255, b: 255, a: 255 },
      { r: 252, g: 252, b: 250, a: 255 },
      { r: 255, g: 255, b: 255, a: 255 },
      { r: 254, g: 254, b: 254, a: 255 }
    ]),
    true
  )
  assert.equal(
    overlayLooksOpaqueWhite([
      { r: 255, g: 255, b: 255, a: 0 },
      { r: 255, g: 255, b: 255, a: 0 },
      { r: 12, g: 12, b: 12, a: 255 },
      { r: 255, g: 255, b: 255, a: 0 }
    ]),
    false
  )
  const rect = aspectFillSourceRect(2000, 1000, 100, 100)
  assert.equal(Math.round(rect.sx), 500)
  assert.equal(Math.round(rect.sw), 1000)
})

test('white type overlays get a black backing instead of being punched out', () => {
  const data = new Uint8ClampedArray(4 * 5 * 5)
  data[2 * 5 * 4 + 2 * 4] = 255
  data[2 * 5 * 4 + 2 * 4 + 1] = 255
  data[2 * 5 * 4 + 2 * 4 + 2] = 255
  data[2 * 5 * 4 + 2 * 4 + 3] = 255
  const corners = [
    { r: 0, g: 0, b: 0, a: 0 },
    { r: 0, g: 0, b: 0, a: 0 },
    { r: 0, g: 0, b: 0, a: 0 },
    { r: 0, g: 0, b: 0, a: 0 }
  ]
  assert.equal(shouldPadWhiteType(data, corners), true)
  padWhiteTypeWithBlack(data, 5, 5, 1)
  assert.equal(data[2 * 5 * 4 + 2 * 4], 255)
  assert.equal(data[2 * 5 * 4 + 1 * 4], 0)
  assert.equal(data[2 * 5 * 4 + 1 * 4 + 3], 255)
})

test('generate preview composites overlay on canvas without mix-blend-mode', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../pages/generate/generate.vue'), 'utf8')
  assert.match(page, /xhsCompositeCanvas/)
  assert.match(page, /drawCoverComposite/)
  assert.match(page, /aspectFillSourceRect/)
  assert.match(page, /knockoutWhiteBackground/)
  assert.match(page, /clearEdgeConnectedWhiteBackground/)
  assert.match(page, /templateThumbCanvas/)
  assert.match(page, /prepareTemplateThumbnails/)
  assert.match(page, /canvasToTempFilePath/)
  assert.match(page, /padWhiteTypeWithBlack/)
  assert.match(page, /templateCardSrc/)
  assert.match(page, /templateHasDedicatedOverlay/)
  assert.match(page, /if \(this\.templateHasDedicatedOverlay\) \{[\s\S]*?ctx\.drawImage\(overlayImage, 0, 0, width, height\)/)
  assert.match(page, /previewPhotoLocal/)
  assert.match(page, /previewError/)
  assert.match(page, /handleCoverPreviewImageError/)
  assert.match(page, /@error="handleCoverPreviewImageError"/)
  assert.match(page, /<view class="tpl-preview">[\s\S]*?:src="templateCardSrc\(item\)"[\s\S]*?mode="aspectFit"/)
  assert.match(page, /\.tpl-preview\s*\{[\s\S]*?background:\s*#d9d9d9/)
  assert.doesNotMatch(page, /class="tpl-thumb"/)
  assert.doesNotMatch(page, /thumbUrl\(item\.preview_urls/)
  assert.match(page, /globalCompositeOperation = 'source-over'/)
  assert.doesNotMatch(page, /mix-blend-mode/)
  assert.doesNotMatch(page, /overlayUsesMultiply/)
})
