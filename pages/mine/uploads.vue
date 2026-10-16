<template>
  <view v-if="internalAccessGranted" class="page">
    <text class="library-notice">{{ roughNotice }}</text>
    <view v-if="loadError" class="library-error" @click="loadGalleries">{{ loadError }}，点击重试</view>
    <view class="folder-grid">
      <view v-for="gallery in galleries" :key="gallery.id" class="folder" @click="openGallery(gallery)">
        <view class="folder-icon">
          <image v-if="folderCoverUrl(gallery)" class="folder-preview" :src="folderCoverUrl(gallery)" mode="aspectFill" lazy-load />
          <view class="folder-tab" />
        </view>
        <text class="folder-name">{{ displayName(gallery) }}</text>
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
import {
  MY_MATERIALS_ROUGH_NOTICE,
  displayMaterialFolderName,
  withStandardMaterialFolders
} from '../../utils/mine-materials-display.mjs'
import { internalPageMixin } from '../../utils/internal-access'

export default {
  components: { TabBar },
  mixins: [internalPageMixin],
  data() {
    return {
      galleries: [],
      loadingFolders: false,
      loadError: '',
      roughNotice: MY_MATERIALS_ROUGH_NOTICE
    }
  },
  async onShow() {
    if (await this.ensureInternalAccess()) this.loadGalleries()
  },
  methods: {
    displayName: displayMaterialFolderName,
    async loadGalleries() {
      if (this.loadingFolders) return
      this.loadingFolders = true
      this.loadError = ''
      try {
        const data = await mpContentApi.myMaterialFolders()
        const folders = data?.folders
        if (!Array.isArray(folders) || folders.some((folder) => !Number.isInteger(folder.count) || folder.count < 0)) {
          this.loadError = '图库返回数据不完整'
        } else {
          this.galleries = withStandardMaterialFolders(folders)
        }
      } catch (error) {
        this.loadError = `图库加载失败：${errorMessage(error)}`
      }
      this.loadingFolders = false
    },
    openGallery(gallery) {
      if (this.loadError) return
      if (gallery.placeholder) {
        uni.showToast({ title: '生图视频暂不可用', icon: 'none' })
        return
      }
      if (gallery.id === 'works') {
        uni.navigateTo({ url: '/pages/mine/works' })
        return
      }
      const name = encodeURIComponent(displayMaterialFolderName(gallery))
      uni.navigateTo({ url: `/pages/mine/folder?folder=${encodeURIComponent(gallery.id)}&name=${name}` })
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
.library-notice {
  display: block;
  margin-bottom: 16px;
  color: #be2d22;
  font-size: 13px;
  line-height: 1.55;
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
