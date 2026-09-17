import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')

test('the mini-program no longer registers the retired bio editor page', () => {
  const pages = JSON.parse(readFileSync(resolve(root, 'pages.json'), 'utf8'))

  assert.equal(pages.pages.some(({ path }) => path === 'pages/mine/bio'), false)
})

test('the profile page does not render retired bio or logo-banner cards', () => {
  const page = readFileSync(resolve(root, 'pages/mine/mine.vue'), 'utf8')

  assert.doesNotMatch(page, /点击填写简介/)
  assert.doesNotMatch(page, /class="banner"/)
})
