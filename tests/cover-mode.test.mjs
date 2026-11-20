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
  assert.match(page, /v-for="item in visibleBuiltinCoverTemplates"/)
  assert.match(page, /loadMoreBuiltinCoverImages/)
  assert.match(page, /@scrolltolower="loadMoreBuiltinCoverImages"/)
  assert.match(page, /selectCoverTemplate\(item\.id\)/)
  assert.match(page, /选择封面模板 \*/)
  assert.match(page, /aiCoverPromptCatalog/)
})

test('builtin templates load after content type step without blocking first-screen schema', () => {
  const loadSchema = page.match(/async loadSchema\(\) \{([\s\S]*?)\r?\n    \},\r?\n    applyHycanvasTemplates/)
  assert.ok(loadSchema)
  assert.doesNotMatch(loadSchema[1], /await this\.loadHycanvasTemplates/)
  assert.match(page, /ensureCoverTemplatesLoaded/)
  assert.match(page, /mpContentApi\.hycanvasTemplates\(\)/)
  assert.match(page, /filterBuiltinCoverTemplates/)
  assert.match(page, /builtinCoverEmptyText/)
  assert.match(page, /syncBuiltinCoverSelection/)
  assert.match(page, /builtinCoverEmptyHint/)
  assert.match(page, /preloadBuiltinCoverTemplates/)
  assert.match(page, /BUILTIN_COVER_PRELOAD_COUNT/)

  const selectContentType = page.match(/async selectContentType\(typeCode\) \{([\s\S]*?)\r?\n    \},\r?\n    async prepareDirectProduction/)
  assert.ok(selectContentType)
  assert.match(selectContentType[1], /preloadBuiltinCoverTemplates/)
  assert.doesNotMatch(selectContentType[1], /ensureCoverTemplatesLoaded\(\)/)

  const setCoverMode = page.match(/async setCoverMode\(mode\) \{([\s\S]*?)\r?\n    \},\r?\n    selectAiCoverPrompt/)
  assert.ok(setCoverMode)
  assert.match(setCoverMode[1], /ensureCoverTemplatesLoaded/)

  const apply = page.match(/applyHycanvasTemplates\(templates\) \{([\s\S]*?)\r?\n    \},\r?\n    matchFrameArea/)
  assert.ok(apply)
  assert.doesNotMatch(apply[1], /prepareTemplateThumbnails/)
})

test('cover mode still submits ai or builtin to compile payload', () => {
  assert.match(page, /coverMode === 'builtin' && !this\.coverTemplateId/)
  assert.match(page, /payload\.cover_mode = this\.coverMode === 'ai' \? 'ai' : 'builtin'/)
  assert.match(page, /if \(this\.coverMode !== 'builtin'\)/)
})
