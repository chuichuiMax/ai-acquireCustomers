import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { resolve } from 'node:path'

const page = readFileSync(resolve(import.meta.dirname, '../pages/generate/generate.vue'), 'utf8')

test('generate page defaults to AI cover without builtin template UI', () => {
  assert.doesNotMatch(page, /封面方式/)
  assert.doesNotMatch(page, /内置封面/)
  assert.doesNotMatch(page, /小红书封面模板 \*/)
  assert.match(page, /coverMode: 'ai'/)
  assert.match(page, /使用智能生成封面/)
  assert.match(page, /只使用上方选择的封面原图，不叠加模板/)
  assert.match(page, /payload\.cover_mode/)
})

test('AI cover mode skips template overlay composite', () => {
  assert.match(page, /if \(this\.coverMode !== 'builtin'\)/)
  assert.match(page, /payload\.cover_mode === 'builtin' \? this\.coverTemplateId/)
  assert.match(page, /: null/)
  assert.doesNotMatch(
    page,
    /v-for="item in schema\.hycanvas_templates"/
  )
  assert.doesNotMatch(page, /loadHycanvasTemplates/)
})

test('AI cover mode does not require Xiaohongshu cover template', () => {
  assert.match(page, /coverMode === 'builtin' && !this\.coverTemplateId/)
  assert.match(page, /payload\.cover_mode = this\.coverMode === 'ai' \? 'ai' : 'builtin'/)
})
