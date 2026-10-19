import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function pngDimensions(filePath) {
  const buffer = readFileSync(filePath)
  assert.deepEqual([...buffer.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

test('materials page exposes WeChat native-share lifecycle instead of an H5 web view', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../pages/materials/materials.vue'), 'utf8')

  assert.match(page, /:open-type="canStartShare \? 'share' : ''"/)
  assert.match(page, /onShareAppMessage\(\)/)
  assert.doesNotMatch(page, /<web-view/)
})

test('gallery request errors are distinct from an empty gallery list', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../pages/materials/materials.vue'), 'utf8')

  assert.match(page, /v-else-if="galleriesError"/)
  assert.match(page, /案例加载失败/)
})

test('case page requests enterprise galleries and enterprise gallery items only', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../pages/materials/materials.vue'), 'utf8')

  assert.match(page, /mpContentApi\.galleries\('enterprise'\)/)
  assert.match(page, /mpContentApi\.galleryItems\(galleryId, 'enterprise'\)/)
})

test('materials views share the space above the tab bar', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../pages/materials/materials.vue'), 'utf8')

  assert.match(page, /\.page \{\s+min-height: 100vh;\s+padding-bottom: calc\(52px \+ env\(safe-area-inset-bottom\)\);/)
  assert.match(page, /\.library-view \{\s+height: calc\(100vh - 52px - env\(safe-area-inset-bottom\)\);\s+min-height: 0;\s+display: flex;/)
  assert.match(page, /\.library-workspace \{\s+flex: 1;\s+min-height: 0;/)
})


test('materials share controls use the supplied bundled image assets', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../pages/materials/materials.vue'), 'utf8')
  const expectedAssets = [
    { path: '/static/share-icons/case-share.png', dimensions: { width: 200, height: 200 } },
    { path: '/static/share-icons/wechat.png', dimensions: { width: 202, height: 200 } },
    { path: '/static/share-icons/wecom.png', dimensions: { width: 240, height: 200 } }
  ]

  for (const asset of expectedAssets) {
    assert.match(page, new RegExp(asset.path.replaceAll('.', '\\.'), 'u'))
    const filePath = resolve(import.meta.dirname, '..', `.${asset.path}`)
    assert.equal(existsSync(filePath), true, `${asset.path} is missing`)
    assert.deepEqual(pngDimensions(filePath), asset.dimensions)
  }
})

test('materials share fab keeps a generous hit area while centering a smaller icon and label', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../pages/materials/materials.vue'), 'utf8')

  assert.match(
    page,
    /<view v-if="selectedIds\.length" class="share-fab" @click="openShareSheet">\s*<image class="share-fab-icon" src="\/static\/share-icons\/case-share\.png" mode="aspectFit" \/>\s*<text class="share-label">分享<\/text>\s*<\/view>/
  )
  assert.match(page, /\.share-fab \{[\s\S]*?width: 68px;[\s\S]*?height: 68px;[\s\S]*?flex-direction: column;/)
  assert.match(page, /\.share-fab-icon \{\s+width: 30px;\s+height: 30px;/)
  assert.match(page, /\.share-label \{\s+margin-top: 2px;[\s\S]*?font-size: 11px;/)
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
