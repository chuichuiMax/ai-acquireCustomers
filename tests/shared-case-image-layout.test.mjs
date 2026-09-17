import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

test('shared-case renders every image at its source aspect ratio', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../pages/materials/shared-case.vue'), 'utf8')
  const heroStyle = page.match(/\.hero-wrap\s*\{([^}]*)\}/)
  const imageItemStyle = page.match(/\.image-item\s*\{([^}]*)\}/)

  assert.match(page, /class="cover-image"[\s\S]*?mode="widthFix"/)
  assert.match(page, /class="case-image"[\s\S]*?mode="widthFix"/)
  assert.ok(heroStyle)
  assert.ok(imageItemStyle)
  assert.doesNotMatch(heroStyle[1], /height:\s*220px/)
  assert.doesNotMatch(imageItemStyle[1], /height:\s*205px/)
})
