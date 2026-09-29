import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const componentPath = resolve(import.meta.dirname, '../components/image-design/SaveTargetSheet.vue')
import { fixedSaveTargetOptions } from '../utils/image-design-logic.mjs'

test('fixed options save only to the PC personal-material root', () => {
  const options = fixedSaveTargetOptions([
    { scope: 'private', can_write_root: true, folders: [{ id: 'uncategorized', name: '未分类' }] },
    { scope: 'enterprise', can_write_root: true, folders: [{ id: 'case', name: '案例图库' }, { id: 'generated', name: '生图图库' }] }
  ])
  assert.deepEqual(options.map(({ scope, gallery_id, label, disabled }) => ({ scope, gallery_id, label, disabled })), [
    { scope: 'private', gallery_id: null, label: '我的素材', disabled: false }
  ])
})

test('the personal root must be explicitly writable', () => {
  assert.equal(fixedSaveTargetOptions([])[0].disabled, true)
  assert.equal(fixedSaveTargetOptions([{ scope: 'private', can_write_root: false, folders: [] }])[0].disabled, true)
  assert.equal(fixedSaveTargetOptions([{ scope: 'enterprise', can_write_root: true, folders: [] }])[0].disabled, true)
})

test('dropdown refuses disabled selections and immediately emits only a fixed target', () => {
  const component = readFileSync(componentPath, 'utf8')
  const script = component.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '').replace('export default', 'return')
  const definition = new Function('fixedSaveTargetOptions', script)(fixedSaveTargetOptions)
  const emitted = []
  const vm = { scopes: [{ scope: 'private', can_write_root: false, folders: [] }], value: null, $emit: (...args) => emitted.push(args) }
  for (const [name, method] of Object.entries(definition.methods)) vm[name] = method.bind(vm)
  for (const [name, getter] of Object.entries(definition.computed)) Object.defineProperty(vm, name, { get: getter.bind(vm) })
  vm.selectOption(vm.options[0])
  assert.deepEqual(emitted, [])
  vm.scopes = [{ scope: 'private', can_write_root: true, folders: [] }]
  vm.selectOption(vm.options[0])
  assert.deepEqual(emitted, [['confirm', { scope: 'private', gallery_id: null }]])
})

test('save target picker is an inline dropdown without a full-screen selection page', () => {
  const component = readFileSync(componentPath, 'utf8')
  assert.match(component, /class="save-target-popover"/)
  assert.match(component, /class="save-target-backdrop" @click="close"/)
  assert.doesNotMatch(component, /class="save-target-layer"/)
  assert.doesNotMatch(component, /选择保存位置<\/text>/)
  assert.doesNotMatch(component, /<button[^>]*>确定<\/button>/)
})
