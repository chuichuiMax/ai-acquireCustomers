import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  buildRequirementListSharePath,
  isRequirementGuestPageOptions,
  isRequirementListGuestLaunch,
  mergeRequirementLaunchOptions,
  parseRequirementGuestQuery
} from '../utils/requirement-list-share.mjs'

const root = resolve(import.meta.dirname, '..')

test('share path opens guest fill page with staff and form type', () => {
  assert.equal(
    buildRequirementListSharePath({ typeId: 'decorated', staffCode: 'A10086' }),
    '/pages/mine/requirement-list-fill?share=1&type=decorated&staff=A10086'
  )
})

test('guest launch is detected from WeChat share options.path', () => {
  assert.equal(
    isRequirementListGuestLaunch({
      path: 'pages/mine/requirement-list-fill?share=1&type=rough&staff=E001'
    }),
    true
  )
  assert.equal(isRequirementListGuestLaunch({ path: 'pages/mine/requirement-list' }), false)
})

test('requirement list page shares fill path instead of employee hub', () => {
  const page = readFileSync(resolve(root, 'pages/mine/requirement-list.vue'), 'utf8')
  assert.match(page, /buildRequirementListSharePath/)
  assert.match(page, /prepareShare/)
  assert.match(page, /buildRequirementListSharePath/)
})

test('guest fill uses public submit API', () => {
  const fill = readFileSync(resolve(root, 'pages/mine/requirement-list-fill.vue'), 'utf8')
  const api = readFileSync(resolve(root, 'apis/mp.js'), 'utf8')
  assert.match(fill, /guestShare/)
  assert.match(fill, /createShared/)
  assert.match(fill, /submitter_nickname/)
  assert.match(fill, /getPhoneNumber\|agreePrivacyAuthorization/)
  assert.match(api, /requirement-lists\/public/)
  assert.match(api, /visitor-sessions/)
})

test('App allows guest requirement fill without employee login', () => {
  const app = readFileSync(resolve(root, 'App.vue'), 'utf8')
  assert.match(app, /isRequirementListGuestLaunch/)
})

test('parseRequirementGuestQuery reads staff from nested launch query', () => {
  const query = parseRequirementGuestQuery({
    path: 'pages/mine/requirement-list-fill?share=1&staff=XY99&type=renovation'
  })
  assert.equal(query.share, true)
  assert.equal(query.staff, 'XY99')
  assert.equal(query.type, 'renovation')
})

test('guest page options only need share flag', () => {
  assert.equal(isRequirementGuestPageOptions({ share: '1', type: 'rough' }), true)
  assert.equal(isRequirementGuestPageOptions({ type: 'rough' }), false)
})

test('guest launch accepts share fill route before page query is visible on App', () => {
  globalThis.getCurrentPages = () => [{
    route: 'pages/mine/requirement-list-fill',
    options: { share: '1', staff: 'E002', type: 'decorated' }
  }]
  assert.equal(isRequirementListGuestLaunch({ scene: 1007, path: 'pages/mine/requirement-list-fill' }), true)
  const merged = mergeRequirementLaunchOptions({ path: 'pages/mine/requirement-list-fill' })
  assert.equal(parseRequirementGuestQuery(merged).staff, 'E002')
  delete globalThis.getCurrentPages
})

test('share path is empty without employee code', () => {
  assert.equal(buildRequirementListSharePath({ typeId: 'rough', staffCode: '' }), '')
})
