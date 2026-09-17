import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  aspectFillSourceRect,
  knockoutWhiteBackground,
  mergeCoverTemplates,
  overlayLooksOpaqueWhite,
  preserveOverlayAlpha,
  resolveTemplateOverlay,
  sourceOver,
  templateOverlayPath
} from '../utils/cover-overlay.mjs'

test('cover overlay prefers transparent overlay files over the template preview', () => {
  assert.deepEqual(
    resolveTemplateOverlay({
      overlay_url: '/overlay.png',
      preview_urls: ['/preview.jpg'],
      preview_url: '/preview.jpg'
    }),
    { path: '/overlay.png', multiply: false }
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

test('png overlays keep source-over compositing like PC', () => {
  assert.deepEqual(
    resolveTemplateOverlay({
      preview_urls: ['/preview.png']
    }),
    { path: '/preview.png', multiply: false }
  )
  assert.equal(templateOverlayPath({ preview_urls: ['/preview.jpg', '/overlay.png'] }), '/overlay.png')
})

test('cover overlay prefers a png in the preview list', () => {
  assert.equal(
    templateOverlayPath({
      preview_urls: ['/preview.jpg', '/overlay.png']
    }),
    '/overlay.png'
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

test('generate preview composites the cover photo under the template overlay', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../pages/generate/generate.vue'), 'utf8')
  assert.match(page, /xhsCompositeCanvas/)
  assert.match(page, /drawCoverComposite/)
  assert.match(page, /knockoutWhiteBackground/)
  assert.match(page, /sourceOver/)
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

test('source-over keeps opaque type on top of the cover photo', () => {
  const base = new Uint8ClampedArray([10, 20, 30, 255])
  const overlay = new Uint8ClampedArray([255, 255, 255, 255])
  sourceOver(base, overlay)
  assert.equal(base[0], 255)
  assert.equal(base[3], 255)
})

test('opaque white overlay corners are detected so the photo can show through', () => {
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
