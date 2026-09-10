<template>
  <view class="page">
    <view class="block">
      <text class="block-title">素材库</text>
      <text class="hint">浏览图库图片，或上传新图（PNG / JPG / WebP，单张不超过 20 MB）。</text>

      <view class="upload-row">
        <picker :range="uploadCategoryLabels" @change="onUploadCategory">
          <view class="picker">{{ uploadCategoryLabel || '选择上传分类' }}</view>
        </picker>
        <button class="upload-btn" :loading="uploading" @click="chooseUpload">上传图片</button>
      </view>

      <view v-if="!rootGalleries.length" class="empty">暂无图库</view>
      <view v-else class="gallery-grid">
        <view
          v-for="item in rootGalleries"
          :key="item.id"
          class="gallery-card"
          @click="openGallery(item.id)"
        >
          <text class="gallery-name">{{ item.name }}</text>
          <text class="gallery-count">{{ item.count || 0 }}张图片素材</text>
        </view>
      </view>
    </view>

    <view v-if="galleryOpen" class="gallery-page">
      <view class="crumbs">
        <view class="nav">
          <text class="crumb" @click="backGallery">图库</text>
          <text v-if="activeGallery" class="crumb current">{{ activeGallery.name }}</text>
        </view>
        <text class="close" @click="closeGallery">关闭</text>
      </view>
      <scroll-view class="gallery-body" scroll-y>
        <view v-if="galleryParent" class="gallery-back" @click="openGallery(galleryParent.id)">
          返回 {{ galleryParent.name }}
        </view>
        <view v-if="galleryChildren.length" class="gallery-grid inner">
          <view
            v-for="item in galleryChildren"
            :key="item.id"
            class="gallery-card"
            @click="openGallery(item.id)"
          >
            <text class="gallery-name">{{ item.name }}</text>
            <text class="gallery-count">{{ item.count || 0 }}张图片素材</text>
          </view>
        </view>
        <view class="photo-grid">
          <view
            v-for="item in galleryItems"
            :key="item.id"
            class="photo-item"
            :class="{ used: item.in_use }"
            @click="previewItem(item)"
          >
            <image :src="mediaUrl(item.file_url)" mode="aspectFill" />
            <text v-if="item.in_use" class="used-badge">已使用</text>
          </view>
        </view>
        <text v-if="!galleryLoading && !galleryItems.length && !galleryChildren.length" class="empty">
          该图库暂无图片，可返回后上传
        </text>
      </scroll-view>
    </view>

    <tab-bar current="materials" />
  </view>
</template>

<script>
import TabBar from '../../components/tab-bar.vue'
import { mpContentApi } from '../../apis/mp'
import { errorMessage, mediaUrl } from '../../utils/request'

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024
const ALLOWED_UPLOAD_EXTS = ['png', 'jpg', 'jpeg', 'webp']

export default {
  components: { TabBar },
  data() {
    return {
      galleries: [],
      galleryOpen: false,
      galleryId: '',
      galleryItems: [],
      galleryLoading: false,
      uploadCategoryId: 'uncategorized',
      uploading: false
    }
  },
  computed: {
    rootGalleries() {
      return (this.galleries || []).filter((item) => !item.parent_id)
    },
    activeGallery() {
      return (this.galleries || []).find((item) => item.id === this.galleryId) || null
    },
    galleryParent() {
      const current = this.activeGallery
      if (!current || !current.parent_id) return null
      return (this.galleries || []).find((item) => item.id === current.parent_id) || null
    },
    galleryChildren() {
      return (this.galleries || []).filter((item) => item.parent_id === this.galleryId)
    },
    uploadCategoryOptions() {
      const roots = this.rootGalleries || []
      if (roots.length) return roots
      return [{ id: 'uncategorized', name: '未分类' }]
    },
    uploadCategoryLabels() {
      return this.uploadCategoryOptions.map((item) =>
        item.description ? `${item.name} — ${item.description}` : item.name
      )
    },
    uploadCategoryLabel() {
      const selected = this.uploadCategoryOptions.find((item) => item.id === this.uploadCategoryId)
      if (!selected) return ''
      return selected.description ? `${selected.name} — ${selected.description}` : selected.name
    }
  },
  onShow() {
    this.loadGalleries()
  },
  methods: {
    mediaUrl,
    async loadGalleries() {
      try {
        const data = await mpContentApi.galleries()
        this.galleries = data.galleries || []
        this.ensureUploadCategory()
      } catch (error) {
        this.galleries = []
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      }
    },
    ensureUploadCategory() {
      const options = this.uploadCategoryOptions
      if (!options.some((item) => item.id === this.uploadCategoryId)) {
        this.uploadCategoryId = (options[0] && options[0].id) || 'uncategorized'
      }
    },
    onUploadCategory(event) {
      const option = this.uploadCategoryOptions[event.detail.value]
      this.uploadCategoryId = (option && option.id) || 'uncategorized'
    },
    fileExt(path) {
      const clean = String(path || '').split('?')[0]
      const name = clean.split('/').pop() || ''
      const parts = name.split('.')
      return parts.length > 1 ? parts.pop().toLowerCase() : ''
    },
    async assertUploadableImage(filePath) {
      const ext = this.fileExt(filePath)
      if (ext && !ALLOWED_UPLOAD_EXTS.includes(ext) && !['heic', 'heif', 'gif', 'bmp'].includes(ext)) {
        throw new Error('仅支持 PNG、JPG、WebP 图片（相册请选照片）')
      }
      try {
        const info = await new Promise((resolve, reject) => {
          uni.getFileInfo({
            filePath,
            success: resolve,
            fail: reject
          })
        })
        if ((info && info.size) > MAX_UPLOAD_BYTES) {
          throw new Error('单张图片不能超过 20 MB')
        }
      } catch (error) {
        if (error && error.message) throw error
      }
    },
    prepareUploadImage(filePath) {
      return new Promise((resolve) => {
        if (typeof uni.compressImage !== 'function') {
          resolve(filePath)
          return
        }
        uni.compressImage({
          src: filePath,
          quality: 80,
          success: (res) => resolve((res && res.tempFilePath) || filePath),
          fail: () => resolve(filePath)
        })
      })
    },
    closeGallery() {
      this.galleryOpen = false
    },
    backGallery() {
      if (this.galleryParent) {
        this.openGallery(this.galleryParent.id)
        return
      }
      this.closeGallery()
    },
    async openGallery(galleryId) {
      this.galleryId = galleryId
      this.galleryOpen = true
      this.galleryLoading = true
      this.galleryItems = []
      try {
        const data = await mpContentApi.galleryItems(galleryId)
        this.galleryItems = data.items || []
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      } finally {
        this.galleryLoading = false
      }
    },
    previewItem(item) {
      const urls = (this.galleryItems || [])
        .map((entry) => this.mediaUrl(entry.file_url))
        .filter(Boolean)
      const current = this.mediaUrl(item && item.file_url)
      if (!current) return
      uni.previewImage({
        current,
        urls: urls.length ? urls : [current]
      })
    },
    chooseUpload() {
      if (!this.uploadCategoryId) {
        uni.showToast({ title: '请选择上传分类', icon: 'none' })
        return
      }
      uni.chooseImage({
        count: 9,
        sizeType: ['compressed'],
        success: async (res) => {
          this.uploading = true
          try {
            for (const filePath of res.tempFilePaths || []) {
              await this.assertUploadableImage(filePath)
              const uploadPath = await this.prepareUploadImage(filePath)
              await mpContentApi.uploadCover(uploadPath, this.uploadCategoryId)
            }
            await this.loadGalleries()
            if (this.galleryOpen && this.galleryId) {
              await this.openGallery(this.galleryId)
            }
            uni.showToast({ title: '上传成功', icon: 'success' })
          } catch (error) {
            uni.showToast({ title: error.message || errorMessage(error), icon: 'none' })
          } finally {
            this.uploading = false
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f4f1ee;
  padding: 16px 16px 90px;
}
.block {
  background: #fff;
  border-radius: 14px;
  padding: 14px;
}
.block-title {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #2b2422;
}
.hint {
  display: block;
  margin-bottom: 12px;
  color: #8a817c;
  font-size: 12px;
  line-height: 18px;
}
.upload-row {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
.upload-row .picker {
  flex: 1;
  min-width: 0;
  height: 40px;
  padding: 0 12px;
  background: #f7f4f2;
  border-radius: 10px;
  line-height: 40px;
  color: #2b2422;
  font-size: 13px;
}
.upload-btn {
  height: 40px;
  line-height: 40px;
  padding: 0 14px;
  border-radius: 10px;
  background: #be2d22;
  color: #fff;
  font-size: 13px;
  flex-shrink: 0;
}
.upload-btn::after {
  border: none;
}
.gallery-grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
}
.gallery-grid.inner {
  margin-bottom: 12px;
}
.gallery-card {
  width: 48%;
  box-sizing: border-box;
  margin-bottom: 8px;
  padding: 12px;
  border-radius: 12px;
  background: #f7f4f2;
}
.gallery-name {
  display: block;
  color: #2b2422;
  font-weight: 600;
}
.gallery-count {
  display: block;
  margin-top: 4px;
  color: #8a817c;
  font-size: 12px;
}
.empty {
  display: block;
  padding: 32px 0;
  color: #8a817c;
  text-align: center;
}
.gallery-page {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: #fff;
  z-index: 30;
  display: flex;
  flex-direction: column;
}
.crumbs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #efe8e4;
}
.nav {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.crumb {
  color: #8a817c;
  font-size: 14px;
}
.crumb.current {
  color: #2b2422;
  font-weight: 600;
}
.close {
  color: #be2d22;
  font-size: 14px;
}
.gallery-body {
  flex: 1;
  padding: 12px 16px 24px;
}
.gallery-back {
  margin-bottom: 12px;
  color: #be2d22;
}
.photo-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}
.photo-item {
  position: relative;
  width: 31%;
  margin-bottom: 10px;
  border-radius: 10px;
  overflow: hidden;
  background: #f7f4f2;
}
.photo-item image {
  width: 100%;
  height: 110px;
  display: block;
}
.photo-item.used image {
  opacity: 0.45;
}
.used-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(190, 45, 34, 0.92);
  color: #fff;
  font-size: 10px;
  line-height: 14px;
}
</style>
