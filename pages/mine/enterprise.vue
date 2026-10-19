<template>
  <view v-if="internalAccessGranted" class="page">
    <view v-if="loadError" class="library-error" @click="loadGalleries">{{ loadError }}，点击重试</view>
    <view v-else-if="loading" class="empty">正在加载图库…</view>
    <view v-else-if="!galleries.length" class="empty">暂无企业毛坯房图库</view>
    <view v-else class="folder-grid">
      <view v-for="gallery in galleries" :key="gallery.id" class="folder" @click="openGallery(gallery)">
        <view class="folder-icon">
          <image v-if="folderCoverUrl(gallery)" class="folder-preview" :src="folderCoverUrl(gallery)" mode="aspectFill" lazy-load />
          <view class="folder-tab" />
        </view>
        <text class="folder-name">{{ gallery.name || '毛坯房图库' }}</text>
      </view>
    </view>
    <tab-bar current="mine" />
  </view>
</template>

<script>
import TabBar from '../../components/tab-bar.vue'
import { mpContentApi } from '../../apis/mp'
import { errorMessage, mediaUrl } from '../../utils/request'
import { galleryCoverPath } from '../../utils/materials-logic.mjs'
import { internalPageMixin } from '../../utils/internal-access'

export default {
  components: { TabBar },
  mixins: [internalPageMixin],
  data() {
    return { galleries: [], loading: false, loadError: '' }
  },
  async onShow() {
    if (await this.ensureInternalAccess()) this.loadGalleries()
  },
  methods: {
    async loadGalleries() {
      if (this.loading) return
      this.loading = true
      this.loadError = ''
      try {
        const data = await mpContentApi.enterpriseRoughFolders()
        const galleries = data?.galleries?.filter((gallery) => gallery.visibility === 'enterprise' && !gallery.parent_id && gallery.image_design_role === 'rough')
        if (!Array.isArray(galleries) || galleries.length !== 1 || galleries.some((gallery) => !Number.isInteger(gallery.count) || gallery.count < 0)) {
          this.loadError = '图库返回数据不完整'
          this.galleries = []
        } else {
          this.galleries = galleries
        }
      } catch (error) {
        this.loadError = `图库加载失败：${errorMessage(error)}`
        this.galleries = []
      } finally {
        this.loading = false
      }
    },
    openGallery(gallery) {
      if (!gallery || !gallery.id) return
      const name = encodeURIComponent(gallery.name || '毛坯房图库')
      uni.navigateTo({ url: `/pages/mine/folder?scope=enterprise&category=${encodeURIComponent(gallery.id)}&name=${name}` })
    },
    folderCoverUrl(gallery) {
      return mediaUrl(galleryCoverPath(gallery))
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 16px 16px calc(90px + env(safe-area-inset-bottom));
  background: #f4f1ee;
}
.library-error {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff;
  color: #be2d22;
  font-size: 12px;
  line-height: 1.5;
}
.empty {
  padding-top: 90px;
  text-align: center;
  color: #928781;
  font-size: 14px;
}
.folder-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 28px 12px;
}
.folder {
  min-width: 0;
  text-align: center;
  color: #3b312d;
  font-size: 13px;
}
.folder-icon {
  position: relative;
  width: 88px;
  height: 62px;
  margin: 0 auto 10px;
  overflow: visible;
  --folder-back-color: #ffc238;
  border-radius: 0 7px 9px 9px;
  background: var(--folder-back-color);
  box-shadow: 0 2px 5px rgba(177, 120, 8, .18);
}
.folder-icon::before {
  position: absolute;
  z-index: 0;
  top: -7px;
  left: 0;
  width: 43px;
  height: 14px;
  -webkit-clip-path: polygon(0 0, 70% 0, 100% 100%, 0 100%);
  clip-path: polygon(0 0, 70% 0, 100% 100%, 0 100%);
  border-radius: 6px 0 0 0;
  background: var(--folder-back-color);
  content: '';
}
.folder-preview {
  position: absolute;
  z-index: 1;
  top: 5px;
  right: 3px;
  left: 3px;
  width: auto;
  height: 45px;
  border-radius: 4px 4px 5px 5px;
  background: #f3eee5;
}
.folder-tab {
  position: absolute;
  z-index: 2;
  top: 34px;
  right: 0;
  left: 0;
  height: 30px;
  border-radius: 6px 7px 8px 8px;
  background: linear-gradient(180deg, #ffe9a3 0%, #ffdc79 55%, #ffd15a 100%);
  box-shadow: inset 0 1px 0 rgba(255, 249, 220, .85), inset 0 -2px 0 rgba(235, 168, 28, .22), 0 2px 4px rgba(177, 120, 8, .14);
}
.folder-name {
  display: block;
  line-height: 1.35;
}
</style>
