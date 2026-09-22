import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import * as logic from '../utils/image-design-logic.mjs'

const defaults = ['高级质感', '空间合理', '专业空间摄影构图']

function readyDraft() {
  const draft = {
    ...logic.createImageDesignDrafts().redesign,
    source: { id: 'source-1' }, style: '现代轻奢', description: '增加阅读角',
    save_target: { scope: 'private', gallery_id: 'folder-1' },
    polished_prompt: '润色后的要求', refinement_id: 'refinement-1'
  }
  draft.polished_for = logic.imageDesignDescription(draft)
  return draft
}

function createPage(api = {}) {
  const source = readFileSync(new URL('../pages/cover/cover.vue', import.meta.url), 'utf8')
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
    .replace(/^import[\s\S]*?from '[^']+'\r?$/gm, '')
    .replace('export default', 'const page =')
  const toasts = []
  const page = runInNewContext(`${script}\npage`, {
    ...logic, toggleTransferElementValue: logic.toggleTransferElement,
    TabBar: {}, ImageSourceSelector: {}, SaveTargetSheet: {}, internalPageMixin: {},
    mpImageDesignApi: api, mediaUrl: (url) => url, imageSourceLabel: logic.imageSourceLabel,
    errorMessage: (error) => error.message, uni: { showToast: ({ title }) => toasts.push(title) }
  })
  const instance = page.data()
  for (const [key, method] of Object.entries(page.methods)) instance[key] = method.bind(instance)
  for (const [key, getter] of Object.entries(page.computed)) Object.defineProperty(instance, key, { get: getter.bind(instance) })
  instance.scheduleDraftSave = () => {}
  return { instance, toasts }
}

test('all new workflows receive independent copies of the three default keywords', () => {
  const drafts = logic.createImageDesignDrafts()
  for (const draft of Object.values(drafts)) assert.deepEqual(draft.description_keywords, defaults)
  drafts.redesign.description_keywords.pop()
  assert.deepEqual(drafts.adapt.description_keywords, defaults)
  assert.deepEqual(drafts.transfer.description_keywords, defaults)
})

test('keywords and text form one canonical description for validation and task submission', () => {
  const draft = readyDraft()
  const expected = '高级质感、空间合理、专业空间摄影构图。增加阅读角'
  assert.equal(logic.imageDesignDescription(draft), expected)
  assert.equal(logic.buildImageDesignPayload('redesign', draft).description, expected)
  assert.equal(logic.draftCanGenerate('redesign', draft), true)
  assert.equal(logic.imageDesignDescription({ description_keywords: [' 木质 ', '木质', '', null], description: ' 阅读角 ' }), '木质。阅读角')
})

test('keyword edits invalidate polish and normal draft normalization does not restore deletions', () => {
  const edited = logic.updateImageDesignDraftKeywords(readyDraft(), ['空间合理', '暖色灯光'])
  assert.equal(edited.polished_prompt, '')
  assert.equal(edited.polished_for, '')
  assert.equal(edited.refinement_id, '')
  assert.equal(logic.draftCanGenerate('redesign', edited), false)
  const normalized = logic.normalizeImageDesignDrafts({ redesign: edited }).redesign
  assert.deepEqual(normalized.description_keywords, ['空间合理', '暖色灯光'])
  assert.equal(logic.updateImageDesignDraftKeywords(readyDraft(), defaults).refinement_id, 'refinement-1')
})

test('reopening restores defaults and custom text, invalidating only a changed description', () => {
  const { instance } = createPage()
  const edited = { ...readyDraft(), description_keywords: ['空间合理', '暖色灯光'] }
  edited.polished_for = logic.imageDesignDescription(edited)
  instance.applyDrafts(JSON.parse(JSON.stringify({ redesign: edited })))
  assert.deepEqual(instance.activeDraft.description_keywords, [...defaults, '暖色灯光'])
  assert.equal(instance.activeDraft.description, '增加阅读角')
  assert.equal(instance.activeDraft.refinement_id, '')
  instance.applyDrafts({ redesign: readyDraft() })
  assert.equal(instance.activeDraft.refinement_id, 'refinement-1')
})

test('legacy drafts gain defaults without losing text or retaining stale polish', () => {
  const { instance } = createPage()
  const legacy = readyDraft()
  delete legacy.description_keywords
  legacy.polished_for = legacy.description
  instance.applyDrafts({ redesign: legacy })
  assert.deepEqual(instance.activeDraft.description_keywords, defaults)
  assert.equal(instance.activeDraft.description, '增加阅读角')
  assert.equal(instance.activeDraft.refinement_id, '')
})

test('custom keyword controls reject blanks and duplicates, preserve edits, and isolate workflows', () => {
  const { instance, toasts } = createPage()
  instance.addDescriptionKeyword()
  instance.keywordInput = ' 高级质感 '
  instance.addDescriptionKeyword()
  assert.equal(toasts.length, 2)
  instance.keywordInput = ' 暖色灯光 '
  instance.addDescriptionKeyword()
  assert.deepEqual(instance.activeDraft.description_keywords, [...defaults, '暖色灯光'])
  assert.equal(instance.keywordInputVisible, false)
  instance.removeDescriptionKeyword('高级质感')
  instance.removeDescriptionKeyword('暖色灯光')
  assert.deepEqual(instance.activeDraft.description_keywords, defaults.slice(1))
  instance.selectWorkflow('adapt')
  assert.deepEqual(instance.activeDraft.description_keywords, defaults)
  instance.selectWorkflow('redesign')
  assert.deepEqual(instance.activeDraft.description_keywords, defaults.slice(1))
})

test('keyword-only prompts can be polished; removing every keyword and all text blocks generation', () => {
  const draft = { ...readyDraft(), description: '' }
  draft.polished_for = logic.imageDesignDescription(draft)
  assert.equal(logic.draftCanGenerate('redesign', draft), true)
  assert.equal(logic.draftCanGenerate('redesign', { ...draft, description_keywords: [] }), false)
})

test('polish sends exactly the task description and ignores a response after keyword editing', async () => {
  let finish
  let payload
  const { instance } = createPage({ polish: async (data) => {
    payload = data
    return new Promise((resolve) => { finish = resolve })
  } })
  instance.drafts.redesign = readyDraft()
  const expected = logic.buildImageDesignPayload('redesign', instance.activeDraft).description
  const pending = instance.polishDescription()
  assert.equal(payload.description, expected)
  instance.removeDescriptionKeyword('高级质感')
  finish({ polished_prompt: '已过时', refinement_id: 'refinement-old' })
  await pending
  assert.equal(instance.activeDraft.refinement_id, '')
  const current = instance.polishDescription()
  finish({ polished_prompt: '新润色', refinement_id: 'refinement-new' })
  await current
  assert.equal(instance.activeDraft.polished_for, payload.description)
  assert.equal(logic.buildImageDesignPayload('redesign', instance.activeDraft).description, payload.description)
  assert.equal(logic.draftCanGenerate('redesign', instance.activeDraft), true)
})

test('offline reopening restores deleted defaults from the local cached draft', async () => {
  const { instance } = createPage({ drafts: async () => { throw new Error('offline') } })
  instance.loadCachedDrafts = () => ({ redesign: { ...readyDraft(), description_keywords: ['暖色灯光'] } })
  await instance.loadRemoteDrafts()
  assert.deepEqual(instance.activeDraft.description_keywords, [...defaults, '暖色灯光'])
  assert.equal(instance.draftSyncIssue, true)
})
