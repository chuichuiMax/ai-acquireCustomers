import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import { fixedSaveTargetOptions } from '../utils/image-design-logic.mjs'

const component = readFileSync(resolve(import.meta.dirname, '../components/image-design/SaveTargetSheet.vue'), 'utf8')
const scopes = [
  { scope: 'private', can_write_root: true, folders: [{ id: 'product', personal_folder: 'generated' }] },
  { scope: 'enterprise', can_write_root: false, folders: [{ id: 'shared', name: '生图图库', can_write: true }] }
]

test('both fixed paths carry actual gallery IDs and exact labels', () => {
  assert.deepEqual(fixedSaveTargetOptions(scopes).map(({ scope, gallery_id, label, disabled }) => ({ scope, gallery_id, label, disabled })), [
    { scope: 'private', gallery_id: 'product', label: '我的素材/AI生图图库', disabled: false },
    { scope: 'enterprise', gallery_id: 'shared', label: '企业共享 / 生图图库', disabled: false }
  ])
})

test('missing, nonwritable and ambiguous galleries are unavailable', () => {
  assert.ok(fixedSaveTargetOptions([]).every(option => option.disabled))
  assert.equal(fixedSaveTargetOptions([{ ...scopes[0], can_write_root: false }])[0].disabled, true)
  for (const folders of [[], [{ id: 'a', name: '生图图库' }], [
    { id: 'a', name: '生图图库', can_write: true }, { id: 'b', name: '生图图库', can_write: true }
  ], [{ id: 'a', name: '生图图库', parent_id: 'nested', can_write: true }]]) {
    assert.equal(fixedSaveTargetOptions([{ scope: 'enterprise', folders }])[1].disabled, true)
  }
  assert.equal(fixedSaveTargetOptions([{ ...scopes[1], error: '图库不可用' }])[1].hint, '图库不可用')
})

function pickerVm() {
  const script = component.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '').replace('export default', 'return')
  const definition = new Function('fixedSaveTargetOptions', script)(fixedSaveTargetOptions)
  const emitted = []
  const vm = { scopes, value: { scope: 'private', gallery_id: 'product' }, loading: false, error: '', $emit: (...args) => emitted.push(args) }
  for (const [name, method] of Object.entries(definition.methods)) vm[name] = method.bind(vm)
  for (const [name, getter] of Object.entries(definition.computed)) Object.defineProperty(vm, name, { get: getter.bind(vm) })
  return { vm, emitted }
}

test('native wheel confirmation commits the selected target and cancel preserves the value', () => {
  const { vm, emitted } = pickerVm()
  assert.equal(vm.selectedIndex, 0)
  vm.cancelSelection()
  assert.deepEqual(emitted, [['cancel']])
  assert.deepEqual(vm.value, { scope: 'private', gallery_id: 'product' })
  vm.confirmSelection({ detail: { value: '1' } })
  assert.deepEqual(emitted[1], ['confirm', { scope: 'enterprise', gallery_id: 'shared' }])
  vm.value = { scope: 'enterprise', gallery_id: 'shared' }
  assert.equal(vm.selectedIndex, 1)
})

test('selecting an unavailable option reports the reason without a confirm event', () => {
  const { vm, emitted } = pickerVm()
  vm.scopes = [scopes[0], { scope: 'enterprise', folders: [], error: '尚未配置' }]
  vm.confirmSelection({ detail: { value: '1' } })
  assert.deepEqual(emitted, [['unavailable', '尚未配置']])
  assert.deepEqual(vm.value, { scope: 'private', gallery_id: 'product' })
  vm.loading = true
  vm.confirmSelection({ detail: { value: '0' } })
  assert.equal(emitted.length, 1)
})

test('save path uses the native bottom selector with a trigger slot', () => {
  assert.match(component, /<picker mode="selector"/)
  assert.match(component, /:range="pickerLabels"/)
  assert.match(component, /@change="confirmSelection"/)
  assert.match(component, /@cancel="cancelSelection"/)
  assert.match(component, /<slot/)
  assert.doesNotMatch(component, /save-target-popover/)
})
