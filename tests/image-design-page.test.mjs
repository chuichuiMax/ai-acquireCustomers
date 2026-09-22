import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const page = readFileSync(resolve(import.meta.dirname, '../pages/cover/cover.vue'), 'utf8')
const api = readFileSync(resolve(import.meta.dirname, '../apis/mp.js'), 'utf8')
const sourceSelectorPath = resolve(import.meta.dirname, '../components/image-source-selector.vue')

test('image design keeps the confirmed three-stage top navigation', () => {
  assert.match(page, /label: '生成图片'/)
  assert.match(page, /label: '图库管理'/)
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
  assert.match(page, /updateImageDesignDraftDescription\(this\.activeDraft, description\)/)
  assert.match(page, /this\.activeDraft\.polished_for !== description/)
  assert.match(page, /!this\.activeDraft\.refinement_id/)
})

test('redesign style selection uses image-design options and sends description mode without a preset', () => {
  assert.doesNotMatch(page, /materials-logic\.mjs/)
  assert.match(page, /IMAGE_DESIGN_STYLE_OPTIONS/)
  assert.match(page, /@click="selectDesignStyle\(style\.value\)"/)
  assert.match(page, /normalizeImageDesignDrafts\(received, this\.saveTargetScopes\)/)
  assert.match(page, /style: imageDesignStyleForPayload\(this\.activeDraft\.style\)/)
})

test('drafts, jobs, result comparison, and photo-album download use the image-design contract', () => {
  assert.match(api, /\/api\/mp\/image-design\/drafts/)
  assert.match(api, /\/api\/mp\/image-design\/tasks/)
  assert.match(api, /\/api\/mp\/image-design\/results/)
  assert.match(page, /comparisonSources\(item\)/)
  assert.match(page, /uni\.saveImageToPhotosAlbum/)
})

test('completed tasks refresh both generated results and the image-design gallery', () => {
  const method = page.match(/async refreshTasks\(\) \{([\s\S]*?)\r?\n    \},\r?\n    async retryTask/)
  assert.ok(method)
  assert.match(method[1], /this\.loadResults\(\)/)
  assert.match(method[1], /this\.loadDesignLibrary\(\)/)
})

test('the latest save target becomes the default for all workflow drafts', () => {
  const method = page.match(/async confirmSaveTarget\(target\) \{([\s\S]*?)\r?\n    \},\r?\n    validateGeneration/)
  assert.ok(method)
  assert.match(method[1], /Object\.keys\(this\.drafts\)/)
  assert.match(method[1], /save_target: normalizeSaveTarget\(target\)/)
})

test('transfer addon choices support multiple selections with a two-item cap', () => {
  assert.match(page, /activeDraft\.extra_element\.includes\(element\)/)
  assert.match(page, /toggleTransferElement\(element\)/)
  assert.match(page, /最多选择两个附加元素/)
  assert.match(page, /extra_element: this\.workflow === 'transfer' \? normalizeTransferElements\(this\.activeDraft\.extra_element\) : undefined/)
})

test('save path uses the API-backed fixed choices and validates the canonical target', () => {
  assert.match(api, /url: '\/api\/mp\/image-design\/save-targets'/)
  assert.match(page, /<save-target-sheet[^>]+:scopes="saveTargetScopes"/)
  assert.match(page, /@confirm="confirmSaveTarget"/)
  assert.match(page, /isWritableSaveTarget\(target\)/)
  assert.doesNotMatch(page, /save_target_id/)
})

test('source selector keeps yellow folders with enterprise and personal badges', () => {
  assert.equal(existsSync(sourceSelectorPath), true)
  const sourceSelector = readFileSync(sourceSelectorPath, 'utf8')
  assert.match(sourceSelector, /background:\s*#ffc238/i)
  assert.match(sourceSelector, /entry\.badge/)
  assert.match(sourceSelector, /选择图库/)
  assert.match(sourceSelector, /上传照片/)
  assert.match(page, /<image-source-selector/)
})

test('gallery item requests paginate only the current folder', () => {
  assert.match(api, /include_descendants/)
  assert.match(page, /@scrolltolower="loadMoreFolderItems"/)
  assert.match(page, /mergeGalleryItems/)
  assert.match(page, /include_descendants: false/)
})

test('image picker shows child galleries and supports nested navigation for every source scope', () => {
  assert.match(page, /pickerFolders/)
  assert.match(page, /selectPickerFolder\(folder\)/)
  assert.match(page, /pickerFolderStack/)
  assert.match(page, /childFolders\(this\.sourceFolders, folder\.id\)/)
  assert.match(page, /pickerFolderStack\.length > 1/)
})

test('reference image selection lets personal materials choose a private gallery before images', () => {
  assert.match(page, /entry\.pickerMode === 'personal-folders'/)
  assert.match(page, /selectPersonalFolder\(folder\)/)
  assert.match(page, /pickerPersonalFolders/)
  assert.match(page, /@click="backPicker"/)
})

test('source gallery failures are distinct from missing gallery configuration', () => {
  assert.match(page, /sourceFolderErrors: \{ private: false, enterprise: false \}/)
  assert.match(page, /我的素材加载失败，请重新加载/)
  assert.match(page, /企业图库加载失败，请重新加载/)
  assert.match(page, /Promise\.allSettled/)
  assert.match(page, /@click="loadSourceFolders"/)
})

test('image picker distinguishes request failures from a genuinely empty folder', () => {
  assert.match(page, /folderItemsError/)
  assert.match(page, /图库加载失败/)
  assert.match(page, /该图库暂无图片或子图库/)
  assert.match(page, /retryFolderItems/)
  assert.match(page, /@click="retryFolderItems"/)
})
