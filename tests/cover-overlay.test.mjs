import assert from 'node:assert/strict'
import test from 'node:test'
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
