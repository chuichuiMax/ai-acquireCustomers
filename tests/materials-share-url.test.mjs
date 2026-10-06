import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import * as materialsLogic from '../utils/materials-logic.mjs'

function pngDimensions(filePath) {
  const buffer = readFileSync(filePath)
  assert.deepEqual([...buffer.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

test('materials page exposes WeChat native-share lifecycle instead of an H5 web view', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../pages/materials/materials.vue'), 'utf8')

  assert.match(page, /:open-type="shareSnapshot \? 'share' : ''"/)
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

test('WeChat prepares a mini-program card and enterprise WeChat keeps a safe fallback', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../pages/materials/materials.vue'), 'utf8')
  const prepareMethod = page.match(/async prepareShareForSheet\(\) \{([\s\S]*?)\r?\n    \},\r?\n    async prepareWechatShare/)
  const wechatMethod = page.match(/async prepareWechatShare\(selectionKey\) \{([\s\S]*?)\r?\n    \},\r?\n    shareToWechat/)

  assert.match(page, /prepareWechatShare/)
  assert.ok(prepareMethod)
  assert.ok(wechatMethod)
  assert.doesNotMatch(wechatMethod[1], /setClipboardData/)
  assert.match(wechatMethod[1], /share\.card_cover_url/)
  assert.match(wechatMethod[1], /coverUrl: cardCoverUrl/)
  assert.match(prepareMethod[1], /this\.shareSnapshot = null/)
  assert.match(prepareMethod[1], /this\.hideWechatShareMenu\(\)/)
  assert.doesNotMatch(page, /uni\.downloadFile/)
  assert.match(page, /shareToWorkWechat/)
  assert.match(page, /:open-type="isWorkWechatHost\(\) && shareSnapshot \? 'share' : ''"/)
  assert.match(page, /this\.shareSnapshot\?\.shareUrl/)
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

test('share sheet always shows both channels and enables native sharing when the card is ready', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../pages/materials/materials.vue'), 'utf8')
  const openSheet = page.match(/openShareSheet\(\) \{([\s\S]*?)\r?\n    \},\r?\n    currentShareSelectionKey/)

  assert.ok(openSheet)
  assert.match(openSheet[1], /this\.shareSheetVisible = true/)
  assert.doesNotMatch(openSheet[1], /await/)
  assert.match(page, /<view class="share-options">/)
  assert.doesNotMatch(page, /正在准备分享|share-preparing|v-else-if="shareSnapshot"/)
  assert.match(page, /:open-type="shareSnapshot \? 'share' : ''"/)
  assert.doesNotMatch(page, />发送到微信<\/button>/)
  assert.doesNotMatch(page, /native-share-button/)
})

test('enterprise WeChat fallback reuses the prepared link and closes the share sheet', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../pages/materials/materials.vue'), 'utf8')
  const enterpriseMethod = page.match(/async shareToWorkWechat\(\) \{([\s\S]*?)\r?\n    \}\r?\n  \}/)

  assert.ok(enterpriseMethod)
  assert.match(enterpriseMethod[1], /this\.shareSnapshot\?\.shareUrl/)
  assert.match(enterpriseMethod[1], /await this\.prepareShareForSheet\(\)/)
  assert.match(enterpriseMethod[1], /this\.shareSheetVisible = false/)
})

function sharePage(createShare) {
  const source = readFileSync(resolve(import.meta.dirname, '../pages/materials/materials.vue'), 'utf8')
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
    .replace(/^import[\s\S]*?from ['"][^'"]+['"]\s*$/gm, '')
    .replace('export default', 'component =')
  const context = {
    ...materialsLogic, TabBar: {}, internalPageMixin: {}, component: null,
    mpContentApi: { createShare }, publicMediaUrl: (url) => url,
    errorMessage: (error) => error.message, clearTimeout, setTimeout,
    uni: { hideShareMenu() {}, showToast() {}, downloadFile() { throw new Error('Unexpected cover download') } }
  }
  runInNewContext(script, context)
  const page = { ...context.component.data(), activeGallery: { id: 'gallery', name: '案例' }, activeGalleryId: 'gallery' }
  page.items = [{ id: 'one' }, { id: 'two' }]
  page.selectedIds = ['one']
  for (const [name, method] of Object.entries(context.component.methods)) page[name] = method.bind(page)
  return page
}

test('opening the channel panel is synchronous even while the share API is pending', async () => {
  let complete
  let requests = 0
  const page = sharePage(() => {
    requests += 1
    return new Promise((resolve) => { complete = resolve })
  })
  assert.equal(page.openShareSheet(), undefined)
  assert.equal(page.shareSheetVisible, true)
  assert.equal(page.shareSnapshot, null)
  page.closeShareSheet()
  page.openShareSheet()
  assert.equal(page.shareSheetVisible, true)
  assert.equal(requests, 1)
  complete({ share: { id: 'token', title: '案例', card_cover_url: 'https://example.test/cover.jpg' } })
  assert.equal(await page.prepareShareForSheet(), true)
  assert.equal(page.shareSnapshot.coverUrl, 'https://example.test/cover.jpg')
  assert.equal(page.shareSnapshot.coverLocalPath, undefined)
  assert.equal(page.shareSnapshot.shareId, 'token')
})

test('changing selection during preparation never exposes the previous selection card', async () => {
  const pending = []
  const page = sharePage((ids) => new Promise((resolve) => pending.push({ ids, resolve })))
  page.openShareSheet()
  page.selectedIds = ['two']
  page.invalidateShareSnapshot()
  const latest = page.prepareShareForSheet()
  pending[0].resolve({ share: { id: 'old', card_cover_url: 'https://example.test/old.jpg' } })
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(page.shareSnapshot, null)
  assert.equal(pending.length, 2)
  assert.equal(pending[1].ids.join(','), 'two')
  pending[1].resolve({ share: { id: 'new', card_cover_url: 'https://example.test/new.jpg' } })
  assert.equal(await latest, true)
  assert.equal(page.shareSnapshot.shareId, 'new')
  assert.equal(page.shareSnapshot.images[0].id, 'two')
})

test('a failed background request leaves the channels visible and can be retried', async () => {
  let requests = 0
  const page = sharePage(async () => {
    requests += 1
    if (requests === 1) throw new Error('网络异常')
    return { share: { id: 'retry', card_cover_url: 'https://example.test/cover.jpg' } }
  })
  page.openShareSheet()
  assert.equal(await page.prepareShareForSheet(), false)
  assert.equal(page.shareSheetVisible, true)
  assert.equal(page.sharePrepareError, '网络异常')
  assert.equal(page.shareSnapshot, null)
  assert.equal(await page.prepareShareForSheet(), true)
  assert.equal(page.shareSnapshot.shareId, 'retry')
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
