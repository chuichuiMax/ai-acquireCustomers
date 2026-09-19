import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { resolveTemplateOverlay, templateOverlayPath } from '../utils/cover-overlay.mjs'

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

test('generate preview composites overlay on canvas without mix-blend-mode', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../pages/generate/generate.vue'), 'utf8')
  assert.match(page, /xhsCompositeCanvas/)
  assert.match(page, /drawCoverComposite/)
  assert.match(page, /aspectFillSourceRect/)
  assert.match(page, /knockoutWhiteBackground/)
  assert.match(page, /globalCompositeOperation = 'source-over'/)
  assert.doesNotMatch(page, /mix-blend-mode/)
  assert.doesNotMatch(page, /overlayUsesMultiply/)
})
