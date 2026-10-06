import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { resolve } from 'node:path'

const page = readFileSync(resolve(import.meta.dirname, '../pages/manage/manage.vue'), 'utf8')

test('manage list drops strategy fields and shows title/body with ellipsis', () => {
  assert.doesNotMatch(page, /创作手法/)
  assert.doesNotMatch(page, /内容公式/)
  assert.doesNotMatch(page, /viral_title_formula/)
  assert.match(page, /爆款标题/)
  assert.match(page, /正文/)
  assert.match(page, /listTitle\(item\)/)
  assert.match(page, /listBody\(item\)/)
  assert.match(page, /value ellipsis/)
})

test('manage list resolves production status via shared helper', () => {
  assert.match(page, /resolveProductionStatusLabel/)
  assert.match(page, /if \(label === '失败'\) return 'is-failed'/)
  assert.match(page, /if \(label === '已审核'\) return 'is-reviewed'/)
  assert.match(page, /canView\(item\)[\s\S]*displayStatus\(item\) === '已审核'/)
})
