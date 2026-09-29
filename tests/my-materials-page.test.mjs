import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const page = readFileSync(new URL('../pages/mine/uploads.vue', import.meta.url), 'utf8')
const script = page.match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace(/^import .*$/gm, '')
  .replace('export default', 'return')

function pageMethods(mpContentApi, uni) {
  return new Function('TabBar', 'internalPageMixin', 'mpContentApi', 'formatUploadTime', 'uni', script)(
    {}, {}, mpContentApi, () => '', uni
  ).methods
}

test('upload and delete reload the first page of the selected folder', async () => {
  const reloads = []
  let finish
  const completed = () => new Promise((resolve) => { finish = resolve })
  const uni = {
    chooseImage: ({ success }) => success({ tempFilePaths: ['new.png'] }),
    showModal: ({ success }) => success({ confirm: true }),
    showToast: () => finish()
  }
  const methods = pageMethods({
    uploadCover: async () => {},
    deleteGalleryItem: async () => {}
  }, uni)
  const vm = {
    activeGallery: { id: 'uploads' }, uploading: false, legacyMode: false,
    selectedIds: ['old-item'],
    loadItems: async (reset) => reloads.push(reset),
    loadGalleries: async () => {},
    cancelEdit: () => {}
  }

  let done = completed()
  methods.chooseImages.call(vm)
  await done
  done = completed()
  methods.removeSelected.call(vm)
  await done

  assert.deepEqual(reloads, [true, true])
})
