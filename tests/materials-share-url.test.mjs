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

test('style sidebar stays within the space above the tab bar', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../pages/materials/materials.vue'), 'utf8')

  assert.match(page, /padding-bottom: calc\(52px \+ env\(safe-area-inset-bottom\)\);/)
  assert.match(page, /\.library-view \{\s+height: calc\(100vh - 52px - env\(safe-area-inset-bottom\)\);\s+min-height: 0;\s+display: flex;/)
  assert.match(page, /\.library-workspace \{\s+flex: 1;\s+min-height: 0;/)
})

test('WeChat prepares a mini-program card while enterprise WeChat keeps its link entry', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../pages/materials/materials.vue'), 'utf8')
  const wechatMethod = page.match(/async prepareWechatShare\(\) \{([\s\S]*?)\n    \},\n    async shareToWorkWechat/)

  assert.match(page, /prepareWechatShare/)
  assert.ok(wechatMethod)
  assert.doesNotMatch(wechatMethod[1], /setClipboardData/)
  assert.match(page, /shareToWorkWechat/)
})
