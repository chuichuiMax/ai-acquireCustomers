import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import * as logic from '../utils/image-design-logic.mjs'
import { transferSpaces } from './fixtures/image-design-profiles.mjs'

function createPage(api = {}) {
  const source = readFileSync(new URL('../pages/cover/cover.vue', import.meta.url), 'utf8')
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
    .replace(/^import[\s\S]*?from '[^']+'\r?$/gm, '')
    .replace('export default', 'const page =')
  const page = runInNewContext(`${script}\npage`, {
    ...logic, toggleTransferElementValue: logic.toggleTransferElement,
    TabBar: {}, ImageSourceSelector: {}, SaveTargetSheet: {}, internalPageMixin: {},
    mpImageDesignApi: api, mediaUrl: url => url, errorMessage: error => error.message,
    uni: { showToast: () => {} }
  })
  const instance = page.data()
  for (const [key, method] of Object.entries(page.methods)) instance[key] = method.bind(instance)
  for (const [key, getter] of Object.entries(page.computed)) Object.defineProperty(instance, key, { get: getter.bind(instance) })
  instance.scheduleDraftSave = () => {}
  instance.workflow = 'transfer'
  return instance
}

function readyDraft(space = 'living_room') {
  const draft = logic.normalizeImageDesignDrafts({ transfer: {
    ...logic.createImageDesignDrafts().transfer, target_space: space,
    reference: { id: 'reference' }, save_target: { scope: 'private', gallery_id: 'generated' }
  } }, [], transferSpaces).transfer
  return { ...draft, polished_prompt: '已润色', polished_for: logic.imageDesignDescription(draft), refinement_id: 'idr_transfer' }
}

test('space selection changes the visible options, resets selections and invalidates polish', async () => {
  const page = createPage({ profiles: async () => ({ version: 1, spaces: transferSpaces }) })
  await page.loadTransferProfiles()
  page.drafts.transfer = { ...readyDraft(), extra_element: ['fireplace'] }
  page.selectTransferSpace('master_bedroom')
  assert.deepEqual(page.transferLayouts.map(item => item.id), ['bed_center', 'bed_window'])
  assert.deepEqual(page.transferElements.map(item => item.id), ['bedside_bench', 'vanity', 'tv_wall'])
  assert.equal(page.activeDraft.layout_type, 'bed_center')
  assert.deepEqual(page.activeDraft.extra_element, [])
  assert.equal(page.activeDraft.refinement_id, '')
  page.toggleTransferElement('bedside_bench')
  page.toggleTransferElement('vanity')
  page.toggleTransferElement('tv_wall')
  assert.deepEqual(page.activeDraft.extra_element, ['bedside_bench', 'vanity', 'tv_wall'])
  page.toggleTransferElement('vanity')
  assert.deepEqual(page.activeDraft.extra_element, ['bedside_bench', 'tv_wall'])
  page.selectTransferSpace('kitchen')
  assert.equal(page.activeDraft.layout_type, 'island')
  assert.deepEqual(page.activeDraft.extra_element, [])
  assert.deepEqual(page.transferElements.map(item => item.id), ['high_cabinet', 'breakfast_bar'])
})

test('legacy drafts migrate within their target space and preserve unrelated inputs', () => {
  const draft = { ...readyDraft(), target_space: '主卧', layout_type: '一字型沙发墙', extra_element: '壁炉居中' }
  const migrated = logic.normalizeImageDesignDrafts({ transfer: draft }, [], transferSpaces).transfer
  assert.equal(migrated.target_space, 'master_bedroom')
  assert.equal(migrated.layout_type, 'bed_center')
  assert.deepEqual(migrated.extra_element, [])
  assert.equal(migrated.refinement_id, '')
  assert.deepEqual(migrated.reference, draft.reference)
  assert.deepEqual(migrated.save_target, draft.save_target)
  const valid = readyDraft('master_bedroom')
  valid.extra_element = ['bedside_bench']
  assert.equal(logic.normalizeImageDesignDrafts({ transfer: valid }, [], transferSpaces).transfer.refinement_id, valid.refinement_id)
})

test('all bedroom addon IDs survive normalization and generation payloads', () => {
  const draft = { ...readyDraft('master_bedroom'), extra_element: ['bedside_bench', 'vanity', 'tv_wall'] }
  const normalized = logic.normalizeImageDesignDrafts({ transfer: draft }, [], transferSpaces).transfer
  assert.equal(logic.draftCanGenerate('transfer', normalized, transferSpaces), true)
  const payload = logic.buildImageDesignPayload('transfer', normalized, transferSpaces)
  assert.equal(payload.target_space, 'master_bedroom')
  assert.equal(payload.layout_type, 'bed_center')
  assert.deepEqual(payload.extra_element, ['bedside_bench', 'vanity', 'tv_wall'])
  assert.equal(logic.draftCanGenerate('transfer', { ...draft, layout_type: 'sofa_wall' }, transferSpaces), false)
  assert.equal(logic.draftCanGenerate('transfer', { ...draft, extra_element: ['fireplace'] }, transferSpaces), false)
})

test('failed profile loads preserve drafts, block transfer actions, and support retry', async () => {
  let fail = true
  const page = createPage({ profiles: async () => {
    if (fail) throw new Error('网络失败')
    return { version: 1, spaces: transferSpaces }
  } })
  page.drafts.transfer = readyDraft('master_bedroom')
  const previous = page.drafts.transfer
  await page.loadTransferProfiles()
  assert.ok(page.transferProfilesError)
  assert.equal(page.drafts.transfer, previous)
  assert.ok(page.transferSelectionError())
  assert.equal(logic.draftCanGenerate('transfer', previous, []), false)
  fail = false
  await page.loadTransferProfiles()
  assert.equal(page.transferProfilesError, '')
  assert.equal(page.transferSelectionError(), '')
})

test('polish and generation share space IDs and ignore responses after changing space', async () => {
  let resolvePolish
  let polishedPayload
  const page = createPage({
    profiles: async () => ({ version: 1, spaces: transferSpaces }),
    polish: payload => { polishedPayload = payload; return new Promise(resolve => { resolvePolish = resolve }) }
  })
  await page.loadTransferProfiles()
  page.drafts.transfer = { ...readyDraft('master_bedroom'), extra_element: ['bedside_bench'] }
  const expected = logic.buildImageDesignPayload('transfer', page.activeDraft, transferSpaces)
  const pending = page.polishDescription()
  assert.equal(polishedPayload.target_space, expected.target_space)
  assert.equal(polishedPayload.layout_type, expected.layout_type)
  assert.deepEqual(polishedPayload.extra_element, expected.extra_element)
  page.selectTransferSpace('kitchen')
  resolvePolish({ polished_prompt: '旧卧室方案', refinement_id: 'idr_old' })
  await pending
  assert.equal(page.activeDraft.refinement_id, '')
})

test('the page completes the transfer flow and blocks generation after changing space', async () => {
  let polishPayload
  const tasks = []
  const page = createPage({
    profiles: async () => ({ version: 1, spaces: transferSpaces }),
    polish: async payload => { polishPayload = payload; return { polished_prompt: '卧室方案', refinement_id: 'idr_bedroom' } },
    createTask: async payload => { tasks.push(payload); return { task: { id: 'idj_bedroom', status: 'queued' } } }
  })
  page.persistDraftsNow = async () => {}
  page.loadResults = async () => {}
  page.startTaskPolling = () => {}
  page.isWritableSaveTarget = () => true
  await page.loadTransferProfiles()
  page.drafts.transfer = { ...readyDraft(), polished_prompt: '', refinement_id: '' }
  page.selectTransferSpace('master_bedroom')
  page.toggleTransferElement('bedside_bench')
  page.toggleTransferElement('vanity')
  page.toggleTransferElement('tv_wall')
  await page.polishDescription()
  await page.generateImages()
  assert.equal(tasks.length, 1)
  assert.equal(tasks[0].target_space, polishPayload.target_space)
  assert.equal(tasks[0].layout_type, polishPayload.layout_type)
  assert.deepEqual(tasks[0].extra_element, polishPayload.extra_element)
  assert.deepEqual(tasks[0].extra_element, ['bedside_bench', 'vanity', 'tv_wall'])
  assert.equal(tasks[0].refinement_id, 'idr_bedroom')
  assert.equal(page.activeTab, 'results')
  assert.ok(page.tasks.idj_bedroom)
  page.selectTransferSpace('kitchen')
  await page.generateImages()
  assert.equal(tasks.length, 1)
})
