import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const internalPages = [
  'pages/generate/generate.vue',
  'pages/generate/locked.vue',
  'pages/generate/result.vue',
  'pages/manage/manage.vue',
  'pages/cover/cover.vue',
  'pages/materials/materials.vue',
  'pages/mine/mine.vue',
  'pages/mine/bio.vue',
  'pages/home/home.vue'
]

for (const pagePath of internalPages) {
  test(`${pagePath} waits for the shared internal access guard before rendering`, () => {
    const page = readFileSync(resolve(import.meta.dirname, '..', pagePath), 'utf8')

    assert.match(page, /internalPageMixin/)
    assert.match(page, /internalAccessGranted/)
    assert.match(page, /await this\.ensureInternalAccess\(\)/)
  })
}
