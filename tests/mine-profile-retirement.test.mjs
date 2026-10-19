import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')

test('the mini-program no longer registers the retired bio editor page', () => {
  const pages = JSON.parse(readFileSync(resolve(root, 'pages.json'), 'utf8'))

  assert.equal(pages.pages.some(({ path }) => path === 'pages/mine/bio'), false)
})

test('the profile page does not render retired bio editor', () => {
  const page = readFileSync(resolve(root, 'pages/mine/mine.vue'), 'utf8')

  assert.doesNotMatch(page, /点击填写简介/)
  assert.match(page, /我的素材/)
  assert.match(page, /企业共享/)
  assert.doesNotMatch(page, /brand-banner/)
  assert.doesNotMatch(page, /生产记录/)
})
