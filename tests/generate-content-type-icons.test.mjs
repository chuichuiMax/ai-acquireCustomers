import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const expectedIcons = {
  工艺施工展示: '/static/content-type-icons/construction.png',
  装修报价清单: '/static/content-type-icons/quote.png',
  装修案例分享: '/static/content-type-icons/case.png',
  装修知识科普: '/static/content-type-icons/knowledge.png',
  人设自荐: '/static/content-type-icons/persona.png',
  好评笔记: '/static/content-type-icons/review.png'
}

let contentTypeIcon
try {
  ({ contentTypeIcon } = await import('../utils/generate-content-type-icons.mjs'))
} catch {
  contentTypeIcon = null
}

test('each generate content type resolves to its supplied icon asset', () => {
  assert.equal(typeof contentTypeIcon, 'function')

  for (const [name, expectedPath] of Object.entries(expectedIcons)) {
    assert.equal(contentTypeIcon({ name }), expectedPath)
  }
})

test('every mapped generate content icon is bundled in static assets', () => {
  assert.equal(typeof contentTypeIcon, 'function')

  for (const name of Object.keys(expectedIcons)) {
    const iconPath = contentTypeIcon({ name })
    assert.equal(existsSync(resolve(import.meta.dirname, '..', `.${iconPath}`)), true, `${name} icon is missing`)
  }
})
