<template>
  <view v-if="internalAccessGranted" class="page">
    <view v-if="activeGallery" class="back" @click="backGallery">‹ {{ activeGallery.parent_id ? '返回上一级' : '返回我的上传' }}</view>
    <view v-if="!activeGallery" class="folder-grid">
      <view v-for="gallery in galleries" :key="gallery.id" class="folder" @click="openGallery(gallery)">
        <view class="folder-icon"><view class="folder-tab" /></view>
        <text>{{ gallery.name }}</text>
        <text class="folder-count">{{ gallery.count || 0 }} 张</text>
      </view>
      <text v-if="!loading && !galleries.length" class="empty">暂无上传图片</text>
    </view>
    <template v-else>
      <text class="gallery-title">{{ activeGallery.name }}</text>
      <view v-if="childGalleries.length" class="folder-grid nested">
        <view v-for="gallery in childGalleries" :key="gallery.id" class="folder" @click="openGallery(gallery)">
          <view class="folder-icon"><view class="folder-tab" /></view>
          <text>{{ gallery.name }}</text>
          <text class="folder-count">{{ gallery.count || 0 }} 张</text>
        </view>
      </view>
      <view v-if="!loading && !items.length" class="empty">该文件夹暂无图片</view>
      <view v-else class="grid">
        <view v-for="item in items" :key="item.id" class="image-card" @click="toggleItem(item.id)">
          <image class="image" :src="imageUrl(item)" mode="aspectFill" lazy-load />
          <view v-if="editing" class="check" :class="{ selected: selectedIds.includes(item.id) }">{{ selectedIds.includes(item.id) ? '✓' : '' }}</view>
        </view>
      </view>
    </template>
    <view class="actions">
      <button v-if="!editing" class="button ghost" @click="editing = true">编辑</button>
      <button v-if="activeGallery && !editing" class="button primary" :loading="uploading" @click="chooseImages">上传图片</button>
      <template v-if="editing">
        <button class="button danger" :disabled="!selectedIds.length" @click="removeSelected">删除{{ selectedIds.length ? ` (${selectedIds.length})` : '' }}</button>
        <button class="button ghost" @click="cancelEdit">取消</button>
      </template>
    </view>
    <tab-bar current="mine" />
  </view>
</template>

<script>
import TabBar from '../../components/tab-bar.vue'
import { mpContentApi } from '../../apis/mp'
import { errorMessage, galleryThumbUrl } from '../../utils/request'
import { createImageSelection, privateChildGalleries, toggleImageSelection, visiblePrivateGalleries } from '../../utils/mine-library-logic.mjs'
import { internalPageMixin } from '../../utils/internal-access'

export default {
  components: { TabBar },
  mixins: [internalPageMixin],
  data() {
    return { galleries: [], activeGallery: null, items: [], loading: false, uploading: false, editing: false, selectedIds: createImageSelection() }
  },
  computed: {
    childGalleries() {
      return this.activeGallery ? privateChildGalleries(this.galleries, this.activeGallery.id) : []
    }
  },
  async onShow() {
    if (await this.ensureInternalAccess()) this.loadGalleries()
  },
  methods: {
    async loadGalleries() {
      this.loading = true
      try {
        const data = await mpContentApi.galleries('private')
        this.galleries = visiblePrivateGalleries(data.galleries)
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    async openGallery(gallery) {
      this.activeGallery = gallery
      this.cancelEdit()
      await this.loadItems()
    },
    async loadItems() {
      if (!this.activeGallery) return
      this.loading = true
      try {
        const data = await mpContentApi.galleryItems(this.activeGallery.id, 'private')
        this.items = data.items || []
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    closeGallery() {
      this.activeGallery = null
      this.items = []
      this.cancelEdit()
    },
    backGallery() {
      const parent = this.galleries.find((gallery) => gallery.id === this.activeGallery?.parent_id)
      if (parent) {
        this.openGallery(parent)
        return
      }
      this.closeGallery()
    },
    imageUrl(item) {
      return galleryThumbUrl(item, 720)
    },
    toggleItem(id) {
      if (!this.editing) return
      this.selectedIds = toggleImageSelection(this.selectedIds, id)
    },
    cancelEdit() {
      this.editing = false
      this.selectedIds = createImageSelection()
    },
    chooseImages() {
      if (!this.activeGallery || this.uploading) return
      uni.chooseImage({
        count: 9,
        sizeType: ['compressed'],
        success: async ({ tempFilePaths }) => {
          this.uploading = true
          const results = []
          for (const filePath of tempFilePaths || []) {
            try {
              await mpContentApi.uploadCover(filePath, this.activeGallery.id)
              results.push(true)
            } catch (error) {
              results.push(false)
            }
          }
          this.uploading = false
          await Promise.all([this.loadItems(), this.loadGalleries()])
          const failed = results.filter((result) => !result).length
          uni.showToast({ title: failed ? `${failed} 张上传失败` : '上传成功', icon: 'none' })
        }
      })
    },
    removeSelected() {
      if (!this.selectedIds.length) return
      uni.showModal({
        title: '删除上传图片',
        content: `确定删除 ${this.selectedIds.length} 张图片吗？正在使用或已共享的图片可能无法删除。`,
        success: async ({ confirm }) => {
          if (!confirm) return
          const results = await Promise.allSettled(this.selectedIds.map((id) => mpContentApi.deleteGalleryItem(id)))
          const failed = results.filter((result) => result.status === 'rejected').length
          this.cancelEdit()
          await Promise.all([this.loadItems(), this.loadGalleries()])
          uni.showToast({ title: failed ? `${failed} 张删除失败` : '删除成功', icon: 'none' })
        }
      })
    }
  }
}
</script>

<style scoped>
.page { min-height: 100vh; box-sizing: border-box; padding: 16px 16px 148px; background: #f4f1ee; }
.folder-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px 18px; }
.folder { min-width: 0; text-align: center; color: #3b312d; font-size: 14px; }
.folder-icon { position: relative; width: 90px; height: 64px; margin: 0 auto 8px; border-radius: 4px 8px 8px 8px; background: #deb44a; }
.folder-tab { position: absolute; top: -7px; left: 8px; width: 38px; height: 12px; border-radius: 5px 5px 0 0; background: #e8c661; }
.folder-count { display: block; margin-top: 3px; color: #988d84; font-size: 11px; }
.nested { margin-bottom: 18px; }
.back { margin: -4px 0 12px; color: #8e625a; font-size: 14px; }
.gallery-title { display: block; margin-bottom: 12px; color: #2b2422; font-size: 17px; font-weight: 700; }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.image-card { position: relative; }
.image { width: 100%; height: 188px; border-radius: 9px; background: #e5ddd7; }
.check { position: absolute; top: 9px; right: 9px; width: 25px; height: 25px; box-sizing: border-box; border: 2px solid #fff; border-radius: 4px; color: #fff; text-align: center; line-height: 21px; background: rgba(0, 0, 0, .2); }
.check.selected { border-color: #be2d22; background: #be2d22; }
.empty { display: block; padding-top: 72px; text-align: center; color: #928781; }
.actions { position: fixed; z-index: 21; right: 12px; bottom: 66px; left: 12px; display: flex; gap: 10px; padding: 10px; background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(54, 39, 32, .08); }
.button { flex: 1; height: 40px; line-height: 40px; border-radius: 7px; font-size: 14px; }
.ghost { color: #be2d22; background: #fff; border: 1px solid #be2d22; }
.primary, .danger { color: #fff; background: #be2d22; }
.danger[disabled] { opacity: .45; }
</style>
