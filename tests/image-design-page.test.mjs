import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const page = readFileSync(resolve(import.meta.dirname, '../pages/cover/cover.vue'), 'utf8')
const api = readFileSync(resolve(import.meta.dirname, '../apis/mp.js'), 'utf8')

test('image design keeps the confirmed three-stage top navigation', () => {
  assert.match(page, /label: '工作流'/)
  assert.match(page, /label: '图库'/)
  assert.match(page, /label: '生成结果'/)
})

test('folder selection saves a generation-library reference before filling its slot', () => {
  const method = page.match(/async confirmPicker\(\) \{([\s\S]*?)\r?\n    \},\r?\n    chooseUpload/)
  assert.ok(method)
  assert.match(method[1], /mpImageDesignApi\.addLibraryItem/)
  assert.match(method[1], /this\.setImageSlot\(this\.pickerSlot, saved\)/)
  assert.match(method[1], /this\.closePicker\(\)/)
})

test('local uploads use the dedicated image-design endpoint and immediately fill the current slot', () => {
  assert.match(page, /mpImageDesignApi\.uploadInput\(filePath, slot\)/)
  assert.match(page, /this\.setImageSlot\(slot, saved\)/)
  assert.match(api, /url: '\/api\/mp\/image-design\/uploads'/)
})

test('description changes invalidate AI polish and generation requires the refreshed result', () => {
  assert.match(page, /updateDraft\(\{ description, polished_prompt: '', polished_for: '' \}\)/)
  assert.match(page, /this\.activeDraft\.polished_for !== this\.activeDraft\.description/)
})

test('redesign style selection uses image-design options and sends description mode without a preset', () => {
  assert.doesNotMatch(page, /materials-logic\.mjs/)
  assert.match(page, /IMAGE_DESIGN_STYLE_OPTIONS/)
  assert.match(page, /@click="selectDesignStyle\(style\.value\)"/)
  assert.match(page, /normalizeImageDesignDrafts\(received\)/)
  assert.match(page, /style: imageDesignStyleForPayload\(this\.activeDraft\.style\)/)
})

test('drafts, jobs, result comparison, and photo-album download use the image-design contract', () => {
  assert.match(api, /\/api\/mp\/image-design\/drafts/)
  assert.match(api, /\/api\/mp\/image-design\/tasks/)
  assert.match(api, /\/api\/mp\/image-design\/results/)
  assert.match(page, /comparisonSources\(item\)/)
  assert.match(page, /uni\.saveImageToPhotosAlbum/)
})

test('the latest save path becomes the default for all workflow drafts', () => {
  const method = page.match(/async selectSaveFolder\(folder\) \{([\s\S]*?)\r?\n    \},\r?\n    validateGeneration/)
  assert.ok(method)
  assert.match(method[1], /Object\.keys\(this\.drafts\)/)
  assert.match(method[1], /save_target_id: folder\.id/)
})

test('save path uses a compact picker backed by writable PC gallery options', () => {
  assert.match(page, /<picker[^>]+:range="savePathLabels"/)
  assert.match(page, /@change="selectSavePathByIndex"/)
  assert.match(page, /savePathOptions\(this\.sourceFolders\)/)
  assert.doesNotMatch(page, /v-if="savePickerVisible"/)
})
