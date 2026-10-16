import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  displayMaterialFolderName,
  withStandardMaterialFolders
} from '../utils/mine-materials-display.mjs'

const uploadsPage = readFileSync(new URL('../pages/mine/uploads.vue', import.meta.url), 'utf8')
const folderPage = readFileSync(new URL('../pages/mine/folder.vue', import.meta.url), 'utf8')

function pageMethods(source, mpContentApi, uni = {}) {
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
    .replace(/^import .*$/gm, '')
    .replace('export default', 'return')
  return new Function(
    'TabBar', 'internalPageMixin', 'mpContentApi', 'formatUploadTime', 'uni',
    'mediaUrl', 'galleryCoverPath', 'displayMaterialFolderName', 'withStandardMaterialFolders',
    'MY_MATERIALS_ROUGH_NOTICE', 'errorMessage', 'galleryThumbUrl', script
  )(
    {}, {}, mpContentApi, () => '', uni,
    (path) => (path ? `media:${path}` : ''),
    (gallery) => gallery?.cover_thumbnail_file_url || gallery?.cover_file_url || '',
    displayMaterialFolderName,
    withStandardMaterialFolders,
    '',
    (error) => error?.message || '',
    () => ''
  ).methods
}

test('uploads page shows rough-folder notice and three-column folder grid', () => {
  assert.match(uploadsPage, /MY_MATERIALS_ROUGH_NOTICE/)
  assert.match(uploadsPage, /grid-template-columns:\s*repeat\(3/)
})

test('folder summaries retain cover addresses and empty folders stay coverless', async () => {
  const methods = pageMethods(uploadsPage, {
    myMaterialFolders: async () => ({
      folders: [
        { id: 'rough', name: '毛坯房图库', count: 2, cover_thumbnail_file_url: '/rough-thumb.jpg', cover_file_url: '/rough.jpg' },
        { id: 'generated', name: 'AI生图图库', count: 1, cover_thumbnail_file_url: null, cover_file_url: '/generated.jpg' },
        { id: 'uploads', name: '我的上传', count: 0, cover_thumbnail_file_url: null, cover_file_url: null },
        { id: 'works', name: '我的作品', count: 0, cover_thumbnail_file_url: null, cover_file_url: null }
      ]
    })
  })
  const vm = { loadingFolders: false, loadError: '', galleries: [] }
  await methods.loadGalleries.call(vm)
  assert.equal(vm.galleries[0].cover_thumbnail_file_url, '/rough-thumb.jpg')
  assert.equal(methods.folderCoverUrl.call(vm, vm.galleries[0]), 'media:/rough-thumb.jpg')
  assert.equal(methods.folderCoverUrl.call(vm, vm.galleries[1]), 'media:/generated.jpg')
  assert.equal(methods.folderCoverUrl.call(vm, vm.galleries[2]), '')
})

test('upload and delete reload the first page of the selected folder', async () => {
  const reloads = []
  let finish
  const completed = () => new Promise((resolve) => { finish = resolve })
  const uni = {
    chooseImage: ({ success }) => success({ tempFilePaths: ['new.png'] }),
    showModal: ({ success }) => success({ confirm: true }),
    showToast: () => finish(),
    setNavigationBarTitle: () => {}
  }
  const methods = pageMethods(folderPage, {
    myMaterialFolders: async () => ({ folders: [{ id: 'uploads', gallery_id: 'actual-uploads', can_upload: true, name: '我的上传' }] }),
    myMaterialItems: async () => ({ items: [], total: 0 }),
    uploadCover: async () => {},
    deleteGalleryItem: async () => {}
  }, uni)
  const vm = {
    folderId: 'uploads',
    galleryMeta: { id: 'uploads', gallery_id: 'actual-uploads', can_upload: true },
    uploading: false,
    selectedIds: ['old-item'],
    itemError: '',
    loadItems: async (reset) => reloads.push(reset),
    ensureInternalAccess: async () => true
  }

  let done = completed()
  methods.chooseImages.call(vm)
  await done
  done = completed()
  methods.removeSelected.call(vm)
  await done

  assert.deepEqual(reloads, [true, true])
})

test('folder page defaults to upload and edit, then switches to delete and cancel', () => {
  assert.match(folderPage, /v-if="!editing"[\s\S]*上传/)
  assert.match(folderPage, /v-if="!editing"[\s\S]*编辑/)
  assert.match(folderPage, /v-if="editing"[\s\S]*删除/)
  assert.match(folderPage, /v-if="editing"[\s\S]*取消/)
})
