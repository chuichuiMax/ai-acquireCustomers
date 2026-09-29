import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const page = readFileSync(new URL('../pages/mine/uploads.vue', import.meta.url), 'utf8')
const script = page.match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace(/^import .*$/gm, '')
  .replace('export default', 'return')

function pageMethods(mpContentApi, uni) {
  return new Function(
    'TabBar', 'internalPageMixin', 'mpContentApi', 'formatUploadTime', 'uni',
    'mediaUrl', 'galleryCoverPath', script
  )(
    {}, {}, mpContentApi, () => '', uni,
    (path) => path ? `media:${path}` : '',
    (gallery) => gallery?.cover_thumbnail_file_url || gallery?.cover_file_url || ''
  ).methods
}

test('folder summaries retain cover addresses and empty folders stay coverless', async () => {
  const methods = pageMethods({
    myMaterialFolders: async () => ({
      folders: [
        { id: 'rough', count: 2, cover_thumbnail_file_url: '/rough-thumb.jpg', cover_file_url: '/rough.jpg' },
        { id: 'generated', count: 1, cover_thumbnail_file_url: null, cover_file_url: '/generated.jpg' },
        { id: 'uploads', count: 0, cover_thumbnail_file_url: null, cover_file_url: null },
        { id: 'works', count: 0, cover_thumbnail_file_url: null, cover_file_url: null }
      ]
    })
  }, {})
  const vm = {
    loadingFolders: false,
    loadError: '',
    libraryNotice: '',
    legacyMode: false,
    legacySources: {},
    galleries: [
      { id: 'rough', name: '毛坯房图库' },
      { id: 'generated', name: '生图图库' },
      { id: 'uploads', name: '我的上传' },
      { id: 'works', name: '我的作品' }
    ]
  }

  await methods.loadGalleries.call(vm)

  assert.equal(vm.galleries[0].cover_thumbnail_file_url, '/rough-thumb.jpg')
  assert.equal(methods.folderCoverUrl.call(vm, vm.galleries[0]), 'media:/rough-thumb.jpg')
  assert.equal(methods.folderCoverUrl.call(vm, vm.galleries[1]), 'media:/generated.jpg')
  assert.equal(vm.galleries[2].count, 0)
  assert.equal(methods.folderCoverUrl.call(vm, vm.galleries[2]), '')
})

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
