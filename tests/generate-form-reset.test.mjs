import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const page = readFileSync(resolve(import.meta.dirname, '../pages/generate/generate.vue'), 'utf8')

test('generate page clears business variables and gallery when switching content type', () => {
  const selectContentType = page.match(/selectContentType\(typeCode\) \{([\s\S]*?)\r?\n    \},\r?\n    async prepareDirectProduction/)
  assert.ok(selectContentType)
  assert.match(selectContentType[1], /shouldClearDraft/)
  assert.match(selectContentType[1], /this\.contentTypeCode = typeCode/)
  assert.match(selectContentType[1], /resetProductionFormState\(\)/)

  const backToTypeStep = page.match(/backToTypeStep\(\) \{([\s\S]*?)\r?\n    \},\r?\n    isQuoteField/)
  assert.ok(backToTypeStep)
  assert.match(backToTypeStep[1], /resetProductionFormState\(\)/)
})

test('returning from generation clears draft form and cover selection', () => {
  assert.match(page, /pendingDraftReset/)
  assert.match(page, /this\.pendingDraftReset = true/)
  const onShow = page.match(/async onShow\(\) \{([\s\S]*?)\r?\n  \},\r?\n  watch:/)
  assert.ok(onShow)
  assert.match(onShow[1], /pendingDraftReset/)
  assert.match(onShow[1], /resetProductionFormState\(\)/)

  const reset = page.match(/resetProductionFormState\(\) \{([\s\S]*?)\r?\n    \},\r?\n    async selectContentType/)
  assert.ok(reset)
  assert.match(reset[1], /clearCover\(\)/)
  assert.match(reset[1], /closeGallery\(\)/)
  assert.match(reset[1], /photos = \[\]/)
})
