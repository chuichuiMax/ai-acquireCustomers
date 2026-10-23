import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { resolve } from 'node:path'

const page = readFileSync(resolve(import.meta.dirname, '../pages/generate/generate.vue'), 'utf8')

test('generate page offers builtin and AI cover modes like PC content studio', () => {
  assert.match(page, /封面方式/)
  assert.match(page, /内置封面/)
  assert.match(page, /AI 封面/)
  assert.match(page, /setCoverMode\('builtin'\)/)
  assert.match(page, /setCoverMode\('ai'\)/)
  assert.match(page, /小红书封面模板 \*/)
  assert.match(page, /v-for="item in builtinCoverTemplates"/)
  assert.match(page, /selectCoverTemplate\(item\.id\)/)
  assert.match(page, /使用智能生成封面/)
})

test('builtin templates load after content type step without blocking first-screen schema', () => {
  const loadSchema = page.match(/async loadSchema\(\) \{([\s\S]*?)\r?\n    \},\r?\n    applyHycanvasTemplates/)
  assert.ok(loadSchema)
  assert.doesNotMatch(loadSchema[1], /await this\.loadHycanvasTemplates/)
  assert.match(page, /ensureCoverTemplatesLoaded/)
  assert.match(page, /this\.loadHycanvasTemplates\(this\.serviceEntry\)/)
  assert.match(page, /this\.loadCoverTemplateExtras\(this\.serviceEntry\)/)
})

test('cover mode still submits ai or builtin to compile payload', () => {
  assert.match(page, /coverMode === 'builtin' && !this\.coverTemplateId/)
  assert.match(page, /payload\.cover_mode = this\.coverMode === 'ai' \? 'ai' : 'builtin'/)
  assert.match(page, /if \(this\.coverMode !== 'builtin'\)/)
})
