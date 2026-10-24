import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import {
  AI_COVER_SMART_RANDOM_VARIANT,
  findAiCoverPromptOption,
  isAiCoverSmartRandomVariant
} from '../utils/ai-cover-prompt-catalog.mjs'

test('smart random variant matches PC catalog semantics', () => {
  assert.equal(AI_COVER_SMART_RANDOM_VARIANT, 'smart-random')
  assert.equal(isAiCoverSmartRandomVariant('smart-random'), true)
  assert.equal(isAiCoverSmartRandomVariant('p9'), false)
  assert.equal(isAiCoverSmartRandomVariant(''), true)
})

test('findAiCoverPromptOption resolves catalog rows by variant', () => {
  const prompts = [{ variant: 'p9', slot_index: 2, title: '提示词九' }]
  assert.deepEqual(findAiCoverPromptOption('p9', prompts), prompts[0])
  assert.equal(findAiCoverPromptOption('p10', prompts), null)
})

test('generate page loads AI cover catalog and submits prompt controls', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../pages/generate/generate.vue'), 'utf8')
  const mpApi = readFileSync(resolve(import.meta.dirname, '../apis/mp.js'), 'utf8')

  assert.match(page, /选择封面模板 \*/)
  assert.match(page, /loadAiCoverPromptCatalog/)
  assert.match(page, /selectAiCoverPrompt/)
  assert.match(page, /ai_cover_prompt_random/)
  assert.match(page, /ai_cover_prompt_variant/)
  assert.match(page, /featured_cover_template_index/)
  assert.match(mpApi, /listAiCoverPrompts/)
  assert.match(mpApi, /\/api\/mp\/content\/ai-cover-prompts/)
})
