import assert from 'node:assert/strict'
import test from 'node:test'
import { templateOverlayPath } from '../utils/cover-overlay.mjs'

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
