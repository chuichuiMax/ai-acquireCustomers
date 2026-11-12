import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const pages = JSON.parse(readFileSync(resolve(root, 'pages.json'), 'utf8'))
const mine = readFileSync(resolve(root, 'pages/mine/mine.vue'), 'utf8')
const leads = readFileSync(resolve(root, 'pages/mine/leads.vue'), 'utf8')
const requirement = readFileSync(resolve(root, 'pages/mine/requirement-list.vue'), 'utf8')

test('mine page lists customer leads and requirement list as separate entries', () => {
  assert.match(mine, /我的客资/)
  assert.match(mine, /需求清单/)
  assert.match(mine, /\/pages\/mine\/leads/)
  assert.match(mine, /\/pages\/mine\/requirement-list/)
  assert.doesNotMatch(mine, /customer-assets/)
})

test('customer leads page uses the mp customer-leads API like the PC list', () => {
  assert.match(leads, /mpLeadApi\.list/)
  assert.match(leads, /mpLeadApi\.follow/)
  assert.doesNotMatch(leads, /requirementListUrl/)
})

test('requirement list uses native questionnaire fill like the prototype', () => {
  assert.match(requirement, /requirement-list-fill/)
  assert.match(requirement, /需求清单记录/)
  assert.match(requirement, /mpRequirementListApi/)
  assert.match(requirement, /buildRequirementListSharePath/)
  const fill = readFileSync(resolve(root, 'pages/mine/requirement-list-fill.vue'), 'utf8')
  assert.match(fill, /QUESTIONS/)
  assert.match(fill, /openPreview/)
  assert.match(fill, /stepIndex/)
  assert.doesNotMatch(fill, /<web-view/)
})

test('pages.json registers leads and requirement list without a hub page', () => {
  const paths = pages.pages.map((item) => item.path)
  assert.equal(paths.includes('pages/mine/customer-assets'), false)
  assert.equal(paths.includes('pages/mine/requirement-list'), true)
  const leadsPage = pages.pages.find((item) => item.path === 'pages/mine/leads')
  assert.equal(leadsPage.style.navigationBarTitleText, '我的客资')
})
