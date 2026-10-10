import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const page = readFileSync(new URL('../pages/mine/works.vue', import.meta.url), 'utf8')
const script = page.match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace(/^import .*$/gm, '').replace('export default', 'return')

test('works refresh and retry use current server name and stop loading a deleted gallery', async () => {
  let folders = [{ id: 'works', name: '设计作品' }]
  const titles = []
  const definition = new Function('TabBar', 'internalPageMixin', 'mpContentApi', 'uni',
    'formatUploadTime', 'errorMessage', script)({}, {}, { myMaterialFolders: async () => ({ folders }) },
    { setNavigationBarTitle: ({ title }) => titles.push(title) }, () => '', (error) => error.message)
  let loads = 0
  let canceled = 0
  const vm = { items: [{ id: 'work' }], load: async () => loads++, cancelEdit: () => canceled++ }
  for (const [name, method] of Object.entries(definition.methods)) {
    if (!vm[name]) vm[name] = method.bind(vm)
  }
  await vm.refreshGallery()
  assert.equal(vm.galleryName, '设计作品')
  assert.deepEqual(titles, ['设计作品'])
  assert.equal(loads, 1)
  folders = []
  await vm.refreshGallery()
  assert.equal(vm.loadError, '该图库已删除')
  assert.equal(vm.finished, true)
  assert.deepEqual(vm.items, [])
  assert.equal(canceled, 1)
  assert.equal(loads, 1)
  assert.ok(page.includes('@click="refreshGallery"'))
})
