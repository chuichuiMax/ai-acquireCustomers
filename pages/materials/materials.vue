<template>
  <view class="page">
    <web-view v-if="incomingShareId" class="share-webview" :src="shareH5Url" />

    <view v-else-if="!activeGallery" class="library-view">
      <view class="heading">
        <text class="title">素材库</text>
        <text class="subtitle">按设计风格查看图库</text>
      </view>

      <view class="library-workspace">
        <scroll-view class="style-sidebar" scroll-y>
          <view
            v-for="style in styleOptions"
            :key="style"
            class="style-option"
            :class="{ active: selectedStyle === style }"
            @click="selectStyle(style)"
          >
            <text>{{ style }}</text>
          </view>
        </scroll-view>

        <scroll-view class="gallery-content" scroll-y>
          <view v-if="loadingGalleries" class="state-block">正在加载图库…</view>
          <view v-else-if="!visibleGalleries.length" class="state-block">暂无二级图库</view>
          <view v-else class="gallery-grid">
            <view
              v-for="gallery in visibleGalleries"
              :key="gallery.id"
              class="gallery-card"
              @click="openGallery(gallery.id)"
            >
              <view class="folder-icon">
                <view class="folder-tab" />
              </view>
              <text class="gallery-name">{{ gallery.name }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <view v-else class="detail-view">
      <view class="detail-heading">
        <text class="back" @click="closeGallery">‹</text>
        <view class="detail-title-wrap">
          <text class="title">素材库</text>
          <text class="detail-gallery-name">{{ activeGallery.name }}</text>
        </view>
      </view>

      <scroll-view class="photo-content" scroll-y>
        <view v-if="loadingItems" class="state-block">正在加载图片…</view>
        <view v-else-if="!items.length" class="state-block">该图库暂无图片素材</view>
        <view v-else class="photo-grid">
          <view v-for="item in items" :key="item.id" class="photo-item">
            <view class="photo-wrap" @click="previewItem(item)">
              <image :src="imageUrl(item)" mode="aspectFill" />
              <view
                class="select-badge"
                :class="{ selected: isSelected(item) }"
                @click.stop="toggleItem(item)"
              >
                <text v-if="isSelected(item)">{{ selectionNumber(item) }}</text>
              </view>
            </view>
            <text class="photo-name">{{ filename(item) }}</text>
          </view>
        </view>
      </scroll-view>

      <view v-if="selectedIds.length" class="share-fab" @click="openShareSheet">
        <text class="share-icon">↗</text>
        <text class="share-label">分享</text>
      </view>
    </view>

    <view v-if="shareSheetVisible" class="share-mask" @click="closeShareSheet">
      <view class="share-sheet" @click.stop>
        <view class="sheet-close" @click="closeShareSheet">×</view>
        <text class="sheet-title">选择分享方式</text>
        <view class="share-options">
          <view class="share-option" @click="shareTo('wechat')">
            <view class="wechat-mark">微</view>
            <text>微信</text>
          </view>
          <view class="share-option" @click="shareTo('work-wechat')">
            <view class="work-wechat-mark">企</view>
            <text>企业微信</text>
          </view>
        </view>
      </view>
    </view>

    <button
      v-if="wechatShareReady"
      class="native-share-button"
      open-type="share"
      @click="wechatShareReady = false"
    >发送到微信</button>

    <tab-bar current="materials" />
  </view>
</template>

<script>
import TabBar from '../../components/tab-bar.vue'
import { mpContentApi } from '../../apis/mp'
import { errorMessage, mediaUrl } from '../../utils/request'
import {
  STYLE_OPTIONS,
  galleryStyle,
  createSelectionState,
  toggleSelection,
  buildShareSnapshot,
  buildWechatSharePayload
} from '../../utils/materials-logic.mjs'
import { BASE_URL } from '../../config'

export default {
  components: { TabBar },
  data() {
    return {
      styleOptions: STYLE_OPTIONS,
      selectedStyle: '全部',
      galleries: [],
      activeGalleryId: '',
      items: [],
      selection: createSelectionState(),
      loadingGalleries: false,
      loadingItems: false,
      shareSheetVisible: false,
      shareSnapshot: null,
      incomingShareId: '',
      wechatShareReady: false
    }
  },
  computed: {
    activeGallery() {
      return this.galleries.find((item) => item.id === this.activeGalleryId) || null
    },
    visibleGalleries() {
      const secondaries = this.galleries.filter((item) => Boolean(item.parent_id))
      if (this.selectedStyle === '全部') return secondaries
      return secondaries.filter((item) => {
        if (galleryStyle(item) === this.selectedStyle) return true
        const parent = this.galleries.find((candidate) => candidate.id === item.parent_id)
        return galleryStyle(parent) === this.selectedStyle
      })
    },
    selectedIds() {
      return this.selection.orderedIds
    },
    shareH5Url() {
      return `${BASE_URL.replace(/\/$/, '')}/share/case/${encodeURIComponent(this.incomingShareId)}`
    }
  },
  onLoad(options) {
    this.incomingShareId = options?.shareId || ''
  },
  onShow() {
    if (!this.incomingShareId) this.loadGalleries()
  },
  onShareAppMessage() {
    const payload = buildWechatSharePayload(this.shareSnapshot)
    if (!payload) {
      return { title: '素材图库', path: '/pages/materials/materials' }
    }
    return payload
  },
  methods: {
    imageUrl(item) {
      return mediaUrl(item.file_url || item.url || item.path || '')
    },
    filename(item) {
      return item.file_name || item.filename || item.name || '图片素材'
    },
    selectStyle(style) {
      this.selectedStyle = style
    },
    async loadGalleries() {
      this.loadingGalleries = true
      try {
        const data = await mpContentApi.galleries()
        this.galleries = data.galleries || []
      } catch (error) {
        this.galleries = []
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      } finally {
        this.loadingGalleries = false
      }
    },
    async openGallery(galleryId) {
      this.activeGalleryId = galleryId
      this.items = []
      this.selection = createSelectionState(galleryId)
      this.shareSnapshot = null
      this.loadingItems = true
      try {
        const data = await mpContentApi.galleryItems(galleryId)
        this.items = (data.items || []).map((item) => ({ ...item, galleryId }))
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      } finally {
        this.loadingItems = false
      }
    },
    closeGallery() {
      this.activeGalleryId = ''
      this.items = []
      this.selection = createSelectionState()
      this.shareSnapshot = null
      this.shareSheetVisible = false
      this.wechatShareReady = false
    },
    previewItem(item) {
      const current = this.imageUrl(item)
      const urls = this.items.map((candidate) => this.imageUrl(candidate)).filter(Boolean)
      if (!current || !urls.length) return
      uni.previewImage({ current, urls })
    },
    isSelected(item) {
      return this.selectedIds.includes(item.id)
    },
    selectionNumber(item) {
      const index = this.selectedIds.indexOf(item.id)
      return index === -1 ? '' : index + 1
    },
    toggleItem(item) {
      try {
        this.selection = toggleSelection(this.selection, item)
      } catch (error) {
        uni.showToast({ title: error.message, icon: 'none' })
      }
    },
    openShareSheet() {
      if (!this.selectedIds.length || !this.activeGallery) return
      this.shareSnapshot = buildShareSnapshot(this.activeGallery, this.items, this.selectedIds)
      this.shareSheetVisible = true
    },
    closeShareSheet() {
      this.shareSheetVisible = false
    },
    async shareTo(channel) {
      if (!this.selectedIds.length || !this.activeGallery) return
      try {
        const localSnapshot = buildShareSnapshot(this.activeGallery, this.items, this.selectedIds)
        const response = await mpContentApi.createShare(this.selectedIds)
        const share = response.share || response
        const shareId = share.share_id || share.id || share.token
        if (!shareId) throw new Error('服务端未返回分享快照 ID')
        this.shareSnapshot = {
          ...localSnapshot,
          shareId,
          shareUrl: share.url || share.share_url || share.page_url || `${BASE_URL}/share/case/${shareId}`,
          coverUrl: mediaUrl(share.cover_url || share.cover_file_url || ''),
          images: localSnapshot.images.map((item, index) => ({
            ...item,
            public_url: index === 0 ? mediaUrl(share.cover_url || share.cover_file_url || '') : ''
          }))
        }
        this.shareSheetVisible = false
        if (channel === 'wechat') {
          this.wechatShareReady = true
          uni.showToast({ title: '快照已生成，请点击“发送到微信”', icon: 'none' })
          return
        }

        await new Promise((resolve, reject) => {
          uni.setClipboardData({
            data: this.shareSnapshot.shareUrl,
            success: resolve,
            fail: reject
          })
        })
        uni.showModal({
          title: '企业微信分享',
          content: '当前小程序运行环境没有可直接调用的企业微信官方发送 API。链接已复制，请在企业微信中选择联系人或群聊后粘贴发送。若要接入企业微信专用能力，还需要完成 CorpID、AgentID、主体关联、可信域名和后端签名配置。',
          showCancel: false
        })
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      }
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding-bottom: 66px;
  box-sizing: border-box;
  background: #f4f1ee;
}
.library-view,
.detail-view {
  min-height: calc(100vh - 66px);
}
.heading {
  padding: 20px 18px 14px;
  background: #fff;
}
.title,
.subtitle,
.detail-gallery-name,
.gallery-name,
.photo-name,
.sheet-title,
.share-label {
  display: block;
}
.title {
  color: #1e1c1b;
  font-size: 22px;
  font-weight: 700;
}
.subtitle {
  margin-top: 6px;
  color: #8a817c;
  font-size: 13px;
}
.library-workspace {
  display: flex;
  height: calc(100vh - 133px);
}
.style-sidebar {
  width: 116px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #d8d8d8;
}
.style-option {
  position: relative;
  min-height: 46px;
  padding: 0 10px 0 20px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  color: #53616a;
  font-size: 14px;
  line-height: 1.25;
}
.style-option.active {
  color: #1688e8;
  background: #e6f6ff;
}
.style-option.active::after {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 4px;
  background: #178df0;
  content: '';
}
.gallery-content,
.photo-content {
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
}
.gallery-content {
  padding: 18px 14px;
  background: #f4f4f4;
}
.gallery-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}
.gallery-card {
  width: 47%;
  margin-bottom: 26px;
  text-align: center;
}
.folder-icon {
  position: relative;
  width: 84px;
  height: 70px;
  margin: 0 auto 12px;
  border-radius: 0 12px 12px 12px;
  background: #ffbd48;
}
.folder-icon::before {
  position: absolute;
  top: -8px;
  left: 0;
  width: 34px;
  height: 14px;
  border-radius: 8px 8px 0 0;
  background: #ffbd48;
  content: '';
}
.folder-tab {
  display: none;
}
.gallery-name {
  overflow: hidden;
  color: #292624;
  font-size: 12px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.state-block {
  padding: 58px 10px;
  color: #8a817c;
  font-size: 13px;
  text-align: center;
}
.detail-heading {
  position: relative;
  min-height: 64px;
  padding: 10px 18px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  background: #fff;
}
.back {
  width: 30px;
  color: #222;
  font-size: 36px;
  line-height: 1;
}
.detail-title-wrap {
  flex: 1;
  text-align: center;
}
.detail-title-wrap .title {
  font-size: 20px;
}
.detail-gallery-name {
  max-width: 260px;
  margin: 4px auto 0;
  overflow: hidden;
  color: #8a817c;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.photo-content {
  height: calc(100vh - 130px);
  padding: 18px 14px 100px;
  background: #f4f4f4;
}
.photo-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}
.photo-item {
  width: 48.5%;
  margin-bottom: 18px;
}
.photo-wrap {
  position: relative;
  width: 100%;
  height: 190px;
  background: #e9e5e2;
}
.photo-wrap image {
  width: 100%;
  height: 100%;
  display: block;
}
.select-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.35);
}
.select-badge.selected {
  border-color: #1688e8;
  background: #1688e8;
}
.select-badge text {
  color: #fff;
  font-size: 16px;
  font-weight: 700;
}
.photo-name {
  margin-top: 7px;
  overflow: hidden;
  color: #292624;
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.share-fab {
  position: fixed;
  right: 22px;
  bottom: 84px;
  z-index: 15;
  width: 68px;
  height: 68px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #287cf0;
  box-shadow: 0 8px 18px rgba(40, 124, 240, 0.28);
}
.native-share-button {
  position: fixed;
  right: 22px;
  bottom: 84px;
  z-index: 20;
  width: 132px;
  height: 44px;
  padding: 0;
  border-radius: 22px;
  background: #39bd67;
  color: #fff;
  font-size: 14px;
  line-height: 44px;
  box-shadow: 0 8px 18px rgba(57, 189, 103, 0.28);
}
.native-share-button::after {
  border: 0;
}
.share-webview {
  position: fixed;
  inset: 0 0 0 0;
  width: 100%;
  height: 100%;
}
.share-icon {
  color: #fff;
  font-size: 27px;
  line-height: 25px;
}
.share-label {
  margin-top: 2px;
  color: #fff;
  font-size: 12px;
}
.share-mask {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: rgba(0, 0, 0, 0.48);
}
.share-sheet {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  min-height: 230px;
  padding: 30px 28px 40px;
  border-radius: 22px 22px 0 0;
  box-sizing: border-box;
  background: #fff;
}
.sheet-close {
  position: absolute;
  top: 14px;
  right: 20px;
  color: #847b75;
  font-size: 26px;
}
.sheet-title {
  color: #25211f;
  font-size: 16px;
  font-weight: 700;
  text-align: center;
}
.share-options {
  display: flex;
  justify-content: center;
  gap: 56px;
  margin-top: 28px;
}
.share-option {
  min-width: 76px;
  color: #332e2a;
  font-size: 13px;
  text-align: center;
}
.share-option text {
  display: block;
  margin-top: 8px;
}
.wechat-mark,
.work-wechat-mark {
  width: 54px;
  height: 54px;
  margin: 0 auto;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20px;
  font-weight: 700;
}
.wechat-mark {
  background: #39bd67;
}
.work-wechat-mark {
  background: #317cf3;
}
</style>
