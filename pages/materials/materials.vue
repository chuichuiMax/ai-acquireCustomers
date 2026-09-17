<template>
  <view v-if="internalAccessGranted" class="page">
    <view v-if="!activeGallery" class="library-view">
      <view class="heading">
        <text class="title">案例</text>
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
          <view v-else-if="galleriesError" class="state-block error-state">
            <text>案例加载失败</text>
            <button class="retry-button" @click="loadGalleries">重新加载</button>
          </view>
          <view v-else-if="!visibleGalleries.length" class="state-block">暂无二级图库</view>
          <view v-else class="gallery-grid">
            <view
              v-for="gallery in visibleGalleries"
              :key="gallery.id"
              class="gallery-card"
              @click="openGallery(gallery.id)"
            >
              <view class="folder-icon">
                <image
                  v-if="folderCoverUrl(gallery)"
                  class="folder-preview"
                  :src="folderCoverUrl(gallery)"
                  mode="aspectFill"
                  lazy-load
                />
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
          <text class="detail-gallery-name">{{ activeGallery.name }}</text>
        </view>
      </view>

      <view class="photo-content">
        <view v-if="loadingItems" class="state-block">正在加载图片…</view>
        <view v-else-if="!items.length" class="state-block">该图库暂无图片素材</view>
        <view v-else class="photo-grid">
          <view v-for="row in photoRows" :key="row[0].id" class="photo-row">
            <view v-for="item in row" :key="item.id" class="photo-item">
              <view class="photo-wrap" @click="previewItem(item)">
                <image :src="imageUrl(item)" mode="aspectFill" lazy-load />
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
        </view>
      </view>

      <view v-if="selectedIds.length" class="share-fab" @click="openShareSheet">
        <image class="share-fab-icon" src="/static/share-icons/case-share.png" mode="aspectFit" />
        <text class="share-label">分享</text>
      </view>
    </view>

    <view v-if="shareSheetVisible" class="share-mask" @click="closeShareSheet">
      <view class="share-sheet" @click.stop>
        <view class="sheet-close" @click="closeShareSheet">×</view>
        <text class="sheet-title">分享案例</text>
        <view v-if="sharePreparing" class="share-preparing">
          <view class="share-preparing-spinner" />
          <text>正在准备分享…</text>
        </view>
        <view v-else-if="shareSnapshot" class="share-options">
          <button class="share-option native-share-option" open-type="share">
            <image class="share-channel-icon" src="/static/share-icons/wechat.png" mode="aspectFit" />
            <text>微信</text>
          </button>
          <button
            class="share-option native-share-option"
            :open-type="isWorkWechatHost() ? 'share' : ''"
            @click="shareToWorkWechat"
          >
            <image class="share-channel-icon" src="/static/share-icons/wecom.png" mode="aspectFit" />
            <text>企业微信</text>
          </button>
        </view>
        <view v-else class="share-prepare-error">
          <text>分享准备失败，请重试</text>
          <button class="share-retry" @click="prepareShareForSheet">重新准备</button>
        </view>
      </view>
    </view>
    <tab-bar current="materials" />
  </view>
</template>

<script>
import TabBar from '../../components/tab-bar.vue'
import { mpContentApi } from '../../apis/mp'
import { errorMessage, galleryThumbUrl, mediaUrl } from '../../utils/request'
import { internalPageMixin } from '../../utils/internal-access'
import {
  MATERIAL_LIBRARY_STYLE_OPTIONS,
  galleryStyle,
  galleryCoverPath,
  groupGalleryItemsIntoRows,
  createSelectionState,
  toggleSelection,
  shareSelectionKey,
  buildShareSnapshot,
  buildWechatSharePayload
} from '../../utils/materials-logic.mjs'
import { publicMediaUrl } from '../../utils/request'

export default {
  components: { TabBar },
  mixins: [internalPageMixin],
  data() {
    return {
      styleOptions: MATERIAL_LIBRARY_STYLE_OPTIONS,
      selectedStyle: '全部',
      galleries: [],
      galleriesError: false,
      activeGalleryId: '',
      items: [],
      selection: createSelectionState(),
      loadingGalleries: false,
      loadingItems: false,
      shareSheetVisible: false,
      shareSnapshot: null,
      sharePreparing: false
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
    photoRows() {
      return groupGalleryItemsIntoRows(this.items)
    },
    selectedIds() {
      return this.selection.orderedIds
    }
  },
  async onShow() {
    if (!(await this.ensureInternalAccess())) return
    this.hideWechatShareMenu()
    this.loadGalleries()
  },
  onShareAppMessage() {
    return buildWechatSharePayload(this.shareSnapshot)
  },
  methods: {
    hideWechatShareMenu() {
      if (typeof uni.hideShareMenu === 'function') uni.hideShareMenu()
    },
    showWechatShareMenu() {
      if (typeof uni.showShareMenu === 'function') {
        uni.showShareMenu({ menus: ['shareAppMessage'] })
      }
    },
    imageUrl(item) {
      return galleryThumbUrl(item, 480)
    },
    folderCoverUrl(gallery) {
      return mediaUrl(galleryCoverPath(gallery))
    },
    filename(item) {
      return item.file_name || item.filename || item.name || '图片素材'
    },
    selectStyle(style) {
      this.selectedStyle = style
    },
    async loadGalleries() {
      this.loadingGalleries = true
      this.galleriesError = false
      try {
        const data = await mpContentApi.galleries()
        this.galleries = data.galleries || []
      } catch (error) {
        this.galleries = []
        this.galleriesError = true
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      } finally {
        this.loadingGalleries = false
      }
    },
    async openGallery(galleryId) {
      this.activeGalleryId = galleryId
      this.items = []
      this.selection = createSelectionState(galleryId)
      this.invalidateShareSnapshot()
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
      this.invalidateShareSnapshot()
      this.shareSheetVisible = false
    },
    previewItem(item) {
      const current = galleryThumbUrl(item, 1080)
      const urls = this.items.map((candidate) => galleryThumbUrl(candidate, 1080)).filter(Boolean)
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
        this.invalidateShareSnapshot()
      } catch (error) {
        uni.showToast({ title: error.message, icon: 'none' })
      }
    },
    async openShareSheet() {
      if (!this.selectedIds.length || !this.activeGallery || this.sharePreparing) return
      this.shareSheetVisible = true
      await this.prepareShareForSheet()
    },
    currentShareSelectionKey() {
      return shareSelectionKey(this.activeGalleryId, this.selectedIds)
    },
    invalidateShareSnapshot() {
      this.shareSnapshot = null
      this.hideWechatShareMenu()
    },
    async prepareShareForSheet() {
      if (!this.selectedIds.length || !this.activeGallery || this.sharePreparing) return false
      const selectionKey = this.currentShareSelectionKey()
      if (this.shareSnapshot?.selectionKey === selectionKey) return true

      this.sharePreparing = true
      this.shareSnapshot = null
      this.hideWechatShareMenu()
      try {
        return await this.prepareWechatShare(selectionKey)
      } finally {
        this.sharePreparing = false
      }
    },
    closeShareSheet() {
      this.shareSheetVisible = false
    },
    isWorkWechatHost() {
      if (typeof uni.getAppBaseInfo !== 'function') return false
      const host = uni.getAppBaseInfo()?.host || {}
      return /wecom|wework|wxwork|企业微信/i.test(`${host.env || ''} ${host.name || ''}`)
    },
    async prepareWechatShare(selectionKey) {
      const gallery = this.activeGallery
      const selectedIds = [...this.selectedIds]
      if (!selectionKey || !gallery || !selectedIds.length) return false
      try {
        const localSnapshot = buildShareSnapshot(gallery, this.items, selectedIds)
        const response = await mpContentApi.createShare(selectedIds)
        const share = response.share || response
        const shareId = share.share_id || share.id || share.token
        if (!shareId) throw new Error('服务端未返回分享快照 ID')
        const cardCoverUrl = publicMediaUrl(
          share.card_cover_url || share.image_url || share.cover_url || share.cover_file_url || ''
        )
        const coverLocalPath = await this.downloadWechatShareCover(cardCoverUrl)
        if (selectionKey !== this.currentShareSelectionKey()) return false
        this.shareSnapshot = {
          ...localSnapshot,
          selectionKey,
          shareId,
          title: share.title || '',
          shareUrl: share.page_url || share.pageUrl || share.url || share.share_url || '',
          coverUrl: cardCoverUrl,
          coverLocalPath,
          images: localSnapshot.images.map((item, index) => ({
            ...item,
            public_url: index === 0 ? cardCoverUrl : ''
          }))
        }
        return true
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
        return false
      }
    },
    downloadWechatShareCover(url) {
      if (!url) return Promise.reject(new Error('服务端未返回分享封面'))
      return new Promise((resolve, reject) => {
        uni.downloadFile({
          url,
          success: (response) => {
            if (response.statusCode === 200 && response.tempFilePath) {
              resolve(response.tempFilePath)
              return
            }
            reject(new Error('分享封面下载失败'))
          },
          fail: () => reject(new Error('分享封面下载失败，请检查网络或小程序下载合法域名'))
        })
      })
    },
    async shareToWorkWechat() {
      if (this.isWorkWechatHost()) return
      if (!this.shareSnapshot?.shareUrl) return
      try {
        await new Promise((resolve, reject) => {
          uni.setClipboardData({ data: this.shareSnapshot.shareUrl, success: resolve, fail: reject })
        })
        this.shareSheetVisible = false
        uni.showModal({
          title: '企业微信分享',
          content: '当前不在企业微信内，链接已复制，请在企业微信中选择联系人或群聊后粘贴发送。',
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
  padding-bottom: calc(52px + env(safe-area-inset-bottom));
  box-sizing: border-box;
  background: #f4f1ee;
}
.library-view {
  height: calc(100vh - 52px - env(safe-area-inset-bottom));
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.detail-view {
  min-height: calc(100vh - 52px - env(safe-area-inset-bottom));
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
.sheet-title {
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
  flex: 1;
  min-height: 0;
  display: flex;
}
.style-sidebar {
  width: 116px;
  min-height: 0;
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
.gallery-content {
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
  width: 106px;
  height: 82px;
  margin: 0 auto 10px;
  overflow: visible;
  --folder-back-color: #ffc238;
  border-radius: 0 8px 10px 10px;
  background: var(--folder-back-color);
  box-shadow: 0 2px 5px rgba(177, 120, 8, 0.18);
}
.folder-icon::before {
  position: absolute;
  z-index: 0;
  top: -9px;
  left: 0;
  width: 50px;
  height: 18px;
  -webkit-clip-path: polygon(0 0, 70% 0, 100% 100%, 0 100%);
  clip-path: polygon(0 0, 70% 0, 100% 100%, 0 100%);
  border-radius: 7px 0 0 0;
  background: var(--folder-back-color);
  content: '';
}
.folder-preview {
  position: absolute;
  z-index: 1;
  top: 7px;
  right: 4px;
  left: 4px;
  width: auto;
  height: 58px;
  border-radius: 4px 4px 6px 6px;
  background: #f3eee5;
}
.folder-tab {
  position: absolute;
  z-index: 2;
  right: 0;
  top: 44px;
  left: 0;
  display: block;
  height: 38px;
  border-radius: 7px 8px 9px 9px;
  background: linear-gradient(180deg, #ffe9a3 0%, #ffdc79 55%, #ffd15a 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 249, 220, 0.85),
    inset 0 -2px 0 rgba(235, 168, 28, 0.22),
    0 2px 4px rgba(177, 120, 8, 0.14);
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
.error-state text {
  display: block;
}
.retry-button {
  width: 104px;
  height: 34px;
  margin-top: 14px;
  border-radius: 4px;
  color: #fff;
  font-size: 13px;
  line-height: 34px;
  background: #be2d22;
}
.retry-button::after {
  border: 0;
}
.detail-heading {
  flex-shrink: 0;
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
.detail-gallery-name {
  max-width: 260px;
  margin: 0 auto;
  overflow: hidden;
  color: #1e1c1b;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.photo-content {
  box-sizing: border-box;
  padding: 18px 14px 120px;
  background: #f4f4f4;
}
.photo-grid {
  display: block;
}
.photo-row {
  overflow: hidden;
  margin-bottom: 18px;
}
.photo-item {
  float: left;
  width: 48.5%;
  margin-bottom: 0;
}
.photo-item + .photo-item {
  float: right;
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
  bottom: calc(64px + env(safe-area-inset-bottom));
  z-index: 21;
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
.share-fab-icon {
  width: 30px;
  height: 30px;
  display: block;
}
.share-label {
  margin-top: 2px;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  line-height: 14px;
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
  padding: 0;
  border: 0;
  background: transparent;
  color: #332e2a;
  font-size: 13px;
  text-align: center;
}
.share-preparing,
.share-prepare-error {
  min-height: 96px;
  margin-top: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #756d67;
  font-size: 13px;
}
.share-preparing-spinner {
  width: 24px;
  height: 24px;
  margin-bottom: 10px;
  border: 3px solid #d9e7fb;
  border-top-color: #287cf0;
  border-radius: 50%;
  box-sizing: border-box;
  animation: share-preparing-spin 0.8s linear infinite;
}
.share-retry {
  min-width: 100px;
  margin-top: 12px;
  padding: 0 14px;
  border: 0;
  border-radius: 18px;
  color: #287cf0;
  font-size: 13px;
  line-height: 34px;
  background: #edf5ff;
}
.share-retry::after {
  border: 0;
}
@keyframes share-preparing-spin {
  to {
    transform: rotate(360deg);
  }
}
.share-option::after {
  border: 0;
}
.share-option text {
  display: block;
  margin-top: 8px;
}
.share-channel-icon {
  width: 60px;
  height: 54px;
  margin: 0 auto;
  display: block;
}
</style>
