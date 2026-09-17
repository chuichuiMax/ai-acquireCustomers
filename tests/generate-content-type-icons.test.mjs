import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
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

function pngDimensions(filePath) {
  const buffer = readFileSync(filePath)
  assert.deepEqual([...buffer.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
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

test('supplied content type icons are 200px square PNGs for the 26px card display', () => {
  for (const name of Object.keys(expectedIcons)) {
    const iconPath = contentTypeIcon({ name })
    const filePath = resolve(import.meta.dirname, '..', `.${iconPath}`)
    assert.deepEqual(pngDimensions(filePath), { width: 200, height: 200 }, `${name} icon dimensions`)
  }
})
