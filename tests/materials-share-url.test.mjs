import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

test('share H5 URL removes one trailing slash from BASE_URL', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../pages/materials/materials.vue'), 'utf8')

  assert.match(page, /BASE_URL\.replace\(\/\\\/\$\/, ''\)/)
})
