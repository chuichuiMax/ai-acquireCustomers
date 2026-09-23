import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const componentPath = resolve(import.meta.dirname, '../components/image-design/SaveTargetSheet.vue')
import { fixedSaveTargetOptions } from '../utils/image-design-logic.mjs'

test('fixed options never expose arbitrary folders or the enterprise root', () => {
  const options = fixedSaveTargetOptions([
    { scope: 'private', can_write_root: true, folders: [{ id: 'uncategorized', name: '未分类' }] },
    { scope: 'enterprise', can_write_root: true, folders: [{ id: 'case', name: '案例图库' }, { id: 'generated', name: '生图图库' }] }
  ])
  assert.deepEqual(options.map(({ scope, gallery_id, label, disabled }) => ({ scope, gallery_id, label, disabled })), [
    { scope: 'private', gallery_id: null, label: '我的素材/AI生图图库', disabled: false },
    { scope: 'enterprise', gallery_id: 'generated', label: '企业共享 / 生图图库', disabled: false }
  ])
})

test('missing, duplicate or nested generated galleries cannot become a root fallback', () => {
  for (const folders of [[], [{ id: 'g', name: '生图图库', parent_id: 'p' }], [{ id: 'a', name: '生图图库' }, { id: 'b', name: '生图图库' }]]) {
    const options = fixedSaveTargetOptions([{ scope: 'enterprise', can_write_root: true, folders }])
    assert(options.every((option) => option.disabled))
  }
})

test('dropdown refuses disabled selections and immediately emits only a fixed target', () => {
  const component = readFileSync(componentPath, 'utf8')
  const script = component.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '').replace('export default', 'return')
  const definition = new Function('fixedSaveTargetOptions', script)(fixedSaveTargetOptions)
  const emitted = []
  const vm = { scopes: [{ scope: 'private', can_write_root: true }], value: null, $emit: (...args) => emitted.push(args) }
  for (const [name, method] of Object.entries(definition.methods)) vm[name] = method.bind(vm)
  for (const [name, getter] of Object.entries(definition.computed)) Object.defineProperty(vm, name, { get: getter.bind(vm) })
  vm.selectOption(vm.options[1])
  assert.deepEqual(emitted, [])
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
