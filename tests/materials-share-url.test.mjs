import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

test('materials page exposes WeChat native-share lifecycle instead of an H5 web view', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../pages/materials/materials.vue'), 'utf8')

  assert.match(page, /open-type="share"/)
  assert.match(page, /onShareAppMessage\(\)/)
  assert.doesNotMatch(page, /<web-view/)
})

test('gallery request errors are distinct from an empty gallery list', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../pages/materials/materials.vue'), 'utf8')

  assert.match(page, /v-else-if="galleriesError"/)
  assert.match(page, /素材库加载失败/)
})

test('materials views share the space above the tab bar', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../pages/materials/materials.vue'), 'utf8')

  assert.match(page, /\.page \{\s+min-height: 100vh;\s+padding-bottom: calc\(52px \+ env\(safe-area-inset-bottom\)\);/)
  assert.match(page, /\.library-view \{\s+height: calc\(100vh - 52px - env\(safe-area-inset-bottom\)\);\s+min-height: 0;\s+display: flex;/)
  assert.match(page, /\.library-workspace \{\s+flex: 1;\s+min-height: 0;/)
})

test('WeChat prepares a mini-program card while enterprise WeChat keeps its link entry', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../pages/materials/materials.vue'), 'utf8')
  const wechatMethod = page.match(/async prepareWechatShare\(\) \{([\s\S]*?)\r?\n    \},\r?\n    async shareToWorkWechat/)

  assert.match(page, /prepareWechatShare/)
  assert.ok(wechatMethod)
  assert.doesNotMatch(wechatMethod[1], /setClipboardData/)
  assert.match(page, /shareToWorkWechat/)
})

test('a native share without a snapshot never falls back to the internal materials page', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../pages/materials/materials.vue'), 'utf8')

  assert.doesNotMatch(page, /path:\s*'\/pages\/materials\/materials'/)
  assert.match(page, /uni\.hideShareMenu/)
})

test('the public shared-case page hides WeChat native home navigation', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../pages/materials/shared-case.vue'), 'utf8')

  assert.match(page, /onShow\(\)\s*\{[\s\S]*?uni\.hideHomeButton/)
})

test('gallery detail shows only the selected folder name below the native title', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../pages/materials/materials.vue'), 'utf8')
  const detailHeader = page.match(/<view class="detail-heading">([\s\S]*?)<\/view>\s*\n\s*<view class="photo-content">/)

  assert.ok(detailHeader)
  assert.match(detailHeader[1], /\{\{ activeGallery\.name \}\}/)
  assert.doesNotMatch(detailHeader[1], /<text class="title">素材库<\/text>/)
})

test('gallery detail renders fixed two-item rows instead of one wrapping flex grid', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../pages/materials/materials.vue'), 'utf8')

  assert.match(page, /v-for="row in photoRows"/)
  assert.match(page, /class="photo-row"/)
  assert.match(page, /\.photo-row \{\s+overflow: hidden;/)
  assert.doesNotMatch(page, /\.photo-grid \{\s+display: flex;/)
})

test('gallery detail uses native page scrolling so its final image row is not clipped by an inner scroll view', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../pages/materials/materials.vue'), 'utf8')
  const photoContent = page.match(/\.photo-content \{([\s\S]*?)\n\}/)

  assert.match(page, /<view class="photo-content">/)
  assert.doesNotMatch(page, /<scroll-view class="photo-content"/)
  assert.match(
    page,
    /\.detail-view \{\s+min-height: calc\(100vh - 52px - env\(safe-area-inset-bottom\)\);/
  )
  assert.ok(photoContent)
  assert.match(photoContent[1], /padding: 18px 14px 120px;/)
  assert.doesNotMatch(photoContent[1], /height: 0;/)
  assert.doesNotMatch(photoContent[1], /flex: 1;/)
})
