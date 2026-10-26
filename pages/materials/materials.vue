<template>
  <view v-if="internalAccessGranted" class="page">
    <view v-if="!activeGallery" class="library-view">
      <view class="heading">
        <text class="title">案例</text>
        <text class="subtitle">按楼盘和设计风格查看图库</text>
      </view>

      <view class="search-wrap">
        <case-building-search :value="buildingQuery" @input="buildingQuery = $event" />
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
          <view v-else-if="!visibleGalleries.length" class="state-block">
            {{ buildingQuery.trim() ? '未找到匹配的案例' : '暂无二级图库' }}
          </view>
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

    <view v-if="contactVisible" class="share-mask contact-mask" @click="closeContact">
      <view class="contact-dialog" aria-role="dialog" aria-label="修改联系方式" @click.stop>
        <button class="contact-close" aria-label="关闭" @click="closeContact">×</button>
        <text class="contact-title">修改联系方式</text>
        <text class="contact-subtitle">业主拨打该号码可联系你</text>
        <view class="contact-field">
          <text>联系人</text>
          <input v-model="contact.contact_name" :maxlength="80" :disabled="contactLoading"
            aria-label="联系人" placeholder="请输入联系人" />
        </view>
        <view class="contact-field">
          <text>手机号码</text>
          <view class="contact-phone">
            <input v-model="contact.contact_phone" type="number" :maxlength="11" :disabled="contactLoading"
              aria-label="手机号码" placeholder="请输入11位手机号码" />
            <button class="last-contact" :disabled="!lastShareContact || contactLoading" @click="restoreLastContact">上次使用</button>
          </view>
        </view>
        <text class="contact-status" :class="{ valid: !contactError && !contactLoading }" aria-live="polite">
          {{ contactLoading ? '正在读取登录人信息…' : (contactError || '格式正确，点击确定保存') }}
        </text>
        <view class="contact-actions">
          <button class="contact-cancel" @click="closeContact">取消</button>
          <button class="contact-confirm" :disabled="contactLoading || Boolean(contactError)" @click="confirmContact">确定</button>
        </view>
      </view>
    </view>
    <view v-if="shareSheetVisible" class="share-mask" @click="closeShareSheet">
      <view class="share-sheet" @click.stop>
        <view class="sheet-close" @click="closeShareSheet">×</view>
        <text class="sheet-title">分享案例</text>
        <view class="share-options">
          <button
            class="share-option native-share-option"
            :open-type="canStartShare ? 'share' : ''"
            @click="shareToWechat"
          >
            <image class="share-channel-icon" src="/static/share-icons/wechat.png" mode="aspectFit" />
            <text>微信</text>
          </button>
          <button
            class="share-option native-share-option"
            :open-type="isWorkWechatHost() && canStartShare ? 'share' : ''"
            @click="shareToWorkWechat"
          >
            <image class="share-channel-icon" src="/static/share-icons/wecom.png" mode="aspectFit" />
            <text>企业微信</text>
          </button>
        </view>
      </view>
    </view>
    <tab-bar current="materials" />
  </view>
</template>

<script>
import { beginCaseComponentAction, clearCaseSystemAction, markCaseSystemReturn, openCaseSystemPage } from '../../utils/share-entry.mjs'
import TabBar from '../../components/tab-bar.vue'
import CaseBuildingSearch from '../../components/case-building-search.vue'
import { filterCaseGalleryChildren } from '../../utils/case-gallery.mjs'
import { mpContentApi, mpMeApi } from '../../apis/mp'
import { errorMessage, galleryThumbUrl, getToken, mediaUrl } from '../../utils/request'
import { internalPageMixin } from '../../utils/internal-access'
import {
  MATERIAL_LIBRARY_STYLE_OPTIONS,
  galleryStyle,
  galleryCoverPath,
  groupGalleryItemsIntoRows,
  createSelectionState,
  toggleSelection,
  shareSelectionKey,
  buildWechatSharePayload
} from '../../utils/materials-logic.mjs'
import { publicMediaUrl } from '../../utils/request'

export default {
  components: { TabBar, CaseBuildingSearch },
  mixins: [internalPageMixin],
  data() {
    return {
      styleOptions: MATERIAL_LIBRARY_STYLE_OPTIONS,
      selectedStyle: '全部',
      buildingQuery: '',
      galleries: [],
      galleriesError: false,
      activeGalleryId: '',
      items: [],
      selection: createSelectionState(),
      loadingGalleries: false,
      loadingItems: false,
      shareSheetVisible: false,
      contactVisible: false,
      contactLoading: false,
      contact: { contact_name: '', contact_phone: '' },
      confirmedContact: null,
      lastShareContact: null,
      shareAccountUid: '',
      shareAccountToken: '',
      shareSnapshot: null,
      nextShareToken: '',
      shareTokenError: ''
    }
  },
  computed: {
    canStartShare() {
      return Boolean(this.confirmedContact && this.shareAccountToken === getToken()
        && (this.nextShareToken || (this.shareSnapshot && this.shareSnapshot.status !== 'failed')))
    },
    contactError() {
      if (!this.contact.contact_name.trim()) return '请填写联系人'
      if (!/^1[3-9]\d{9}$/.test(this.contact.contact_phone.trim())) return '请填写正确的11位手机号码'
      return ''
    },
    activeGallery() {
      return this.galleries.find((item) => item.id === this.activeGalleryId) || null
    },
    visibleGalleries() {
      const secondaries = this.galleries.filter((item) => Boolean(item.parent_id))
      const styled = this.selectedStyle === '全部' ? secondaries : secondaries.filter((item) => {
        if (galleryStyle(item) === this.selectedStyle) return true
        const parent = this.galleries.find((candidate) => candidate.id === item.parent_id)
        return galleryStyle(parent) === this.selectedStyle
      })
      return filterCaseGalleryChildren(styled, '全部', this.buildingQuery)
    },
    photoRows() {
      return groupGalleryItemsIntoRows(this.items)
    },
    selectedIds() {
      return this.selection.orderedIds
    }
  },
  onLoad() {
    this.primeShareToken()
  },
  onHide() {
    this._shareHidden = true
  },
  async onShow() {
    this._shareHidden = false
    this.primeShareToken()
    this.reportShareFailure()
    if (this.shareSnapshot) this.watchShareAttempt(this.shareSnapshot)
    markCaseSystemReturn(this)
    if (!(await this.ensureInternalAccess())) return
    this.hideWechatShareMenu()
    this.loadGalleries()
  },
  onShareAppMessage() {
    // Only the native callback creates a WeChat share; the button click never POSTs.
    const attempt = this.startShareAttempt()
    if (!attempt) return null // Native open-type is unavailable until a secure token exists.
    beginCaseComponentAction('shareAppMessage', this)
    const payload = buildWechatSharePayload(attempt)
    return {
      ...payload,
      promise: new Promise((resolve) => {
        const timer = setTimeout(() => resolve(payload), 2500)
        attempt.readyPromise.then(() => {
          clearTimeout(timer)
          resolve(buildWechatSharePayload(attempt))
        })
      })
    }
  },
  onUnload() {
    clearCaseSystemAction(this)
    this._shareDisposed = true
    this.shareSnapshot = null
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
        const data = await mpContentApi.galleries('enterprise')
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
        const data = await mpContentApi.galleryItems(galleryId, 'enterprise')
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
      openCaseSystemPage('previewImage', { current, urls }, this)
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
      if (!this.selectedIds.length || !this.activeGallery) return
      const requestId = this._contactRequestId = (this._contactRequestId || 0) + 1
      this.shareSheetVisible = false
      this.confirmedContact = null
      this.contact = { contact_name: '', contact_phone: '' }
      this.lastShareContact = null
      this.shareAccountUid = ''
      this.shareAccountToken = getToken()
      const accountToken = this.shareAccountToken
      this.contactVisible = true
      this.contactLoading = true
      try {
        const profile = await mpMeApi.get()
        if (requestId !== this._contactRequestId || this._shareDisposed
          || !this.contactVisible || getToken() !== accountToken) return
        if (!profile.employee || !profile.user_uid) throw new Error('登录人信息不完整，请重新登录')
        this.shareAccountUid = profile.user_uid
        this.contact = {
          contact_name: profile.employee.name || '',
          contact_phone: profile.employee.login_account || ''
        }
        try {
          const saved = uni.getStorageSync(`case-share-contact:${this.shareAccountUid}`)
          if (saved?.contact_name?.trim() && /^1[3-9]\d{9}$/.test(saved.contact_phone)) this.lastShareContact = saved
        } catch { this.lastShareContact = null }
      } catch (error) {
        if (requestId !== this._contactRequestId || this._shareDisposed
          || !this.contactVisible || getToken() !== accountToken) return
        uni.showToast({ title: errorMessage(error), icon: 'none' })
        this.contactVisible = false
      } finally {
        if (requestId === this._contactRequestId) this.contactLoading = false
      }
    },
    closeContact() {
      this.contactVisible = false
      this.confirmedContact = null
    },
    restoreLastContact() {
      if (this.lastShareContact) this.contact = { ...this.lastShareContact }
    },
    confirmContact() {
      if (this.contactLoading || !this.contactVisible) return
      if (this.shareAccountToken !== getToken() || !this.shareAccountUid) {
        this.closeContact()
        uni.showToast({ title: '登录账号已变化，请重新分享', icon: 'none' })
        return
      }
      if (this.contactError) {
        uni.showToast({ title: this.contactError, icon: 'none' })
        return
      }
      this.confirmedContact = {
        contact_name: this.contact.contact_name.trim(),
        contact_phone: this.contact.contact_phone.trim()
      }
      if (this.shareSnapshot && this.shareSnapshot.selectionKey !== this.currentShareSelectionKey()) {
        this.invalidateShareSnapshot()
      }
      try {
        uni.setStorageSync(`case-share-contact:${this.shareAccountUid}`, this.confirmedContact)
        this.lastShareContact = { ...this.confirmedContact }
      } catch {
        uni.showToast({ title: '无法保存上次使用，本次分享可继续', icon: 'none' })
      }
      this.contactVisible = false
      this.shareSheetVisible = true
    },
    currentShareSelectionKey() {
      return JSON.stringify([this.shareAccountUid, shareSelectionKey(this.activeGalleryId, this.selectedIds), this.confirmedContact])
    },
    invalidateShareSnapshot() {
      this.shareSnapshot = null
      this.hideWechatShareMenu()
    },
    primeShareToken() {
      if (this.nextShareToken || this._shareTokenPromise || this._shareDisposed) return
      this._shareTokenPromise = new Promise((resolve, reject) => {
        if (typeof wx === 'undefined' || typeof wx.getRandomValues !== 'function') {
          reject(new Error('当前微信版本不支持安全分享，请升级微信'))
          return
        }
        wx.getRandomValues({ length: 32, success: resolve, fail: reject })
      }).then((result) => {
        const bytes = new Uint8Array(result.randomValues)
        if (bytes.length !== 32) throw new Error('分享标识生成失败，请重试')
        if (!this._shareDisposed) {
          this.nextShareToken = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
          this.shareTokenError = ''
        }
      }).catch((error) => {
        this.shareTokenError = errorMessage(error)
      }).finally(() => { this._shareTokenPromise = null })
    },
    startShareAttempt() {
      if (this._shareDisposed || !this.selectedIds.length || !this.activeGallery
        || !this.confirmedContact || this.shareAccountToken !== getToken()) return null
      const selectionKey = this.currentShareSelectionKey()
      let attempt = this.shareSnapshot
      if (!attempt || attempt.selectionKey !== selectionKey || attempt.status === 'failed') {
        if (!this.nextShareToken) return null
        attempt = {
          selectionKey, itemIds: [...this.selectedIds], shareId: this.nextShareToken,
          contact: { ...this.confirmedContact },
          title: `${this.activeGallery.name}案例分享`, status: 'unknown', coverUrl: '',
          shareUrl: publicMediaUrl(`/share/case/${this.nextShareToken}`)
        }
        this.nextShareToken = ''
        this.shareSnapshot = attempt
        attempt = this.shareSnapshot // Keep Vue reactive updates when the request finishes.
        this.primeShareToken()
      }
      if (!attempt.acceptedPromise) {
        attempt.acceptedPromise = mpContentApi.createShare(attempt.itemIds, attempt.shareId, attempt.contact).then((response) => {
          this.updateShareAttempt(attempt, response)
          return attempt
        }).catch((error) => {
          // An interrupted response does not prove the server rejected the request.
          // A subsequent explicit click retries with this SAME idempotency token.
          attempt.acceptedPromise = null
          attempt.error = errorMessage(error)
          attempt.reported = false
          this.reportShareFailure(attempt)
          return null
        })
      }
      this.watchShareAttempt(attempt)
      return attempt
    },
    updateShareAttempt(attempt, response) {
      const share = response.share || response
      if (share.id !== attempt.shareId) throw new Error('分享结果与本次选择不一致，请重试')
      const previousStatus = attempt.status
      attempt.status = share.status || 'completed'
      if (attempt.status === 'completed') {
        attempt.title = share.title || share.gallery_name || attempt.title
        attempt.coverUrl = publicMediaUrl(share.card_cover_url || '')
        attempt.error = ''
      } else if (attempt.status === 'failed') {
        if (previousStatus !== 'failed') attempt.reported = false
        attempt.error = '案例生成失败，请重新分享'
        this.reportShareFailure(attempt)
      }
    },
    watchShareAttempt(attempt) {
      if (attempt.watching || this._shareDisposed) return
      attempt.watching = true
      attempt.readyPromise = (async () => {
        try {
          if (attempt.acceptedPromise) await attempt.acceptedPromise
        } catch (error) { /* Query the token: the acceptance response may have been lost. */ }
        try {
          for (let count = 0; count < 20 && !this._shareDisposed; count += 1) {
            if (attempt.status === 'completed' || attempt.status === 'failed') break
            this.updateShareAttempt(attempt, await mpContentApi.getShare(attempt.shareId))
            if (attempt.status === 'completed' || attempt.status === 'failed') break
            await new Promise((resolve) => setTimeout(resolve, 1500))
          }
        } catch (error) {
          attempt.error = '暂时无法确认案例生成结果，请稍后重试'
          this.reportShareFailure(attempt)
        }
        return attempt
      })().finally(() => { attempt.watching = false })
    },
    reportShareFailure(attempt = this.shareSnapshot) {
      if (!attempt?.error || attempt.reported || this._shareHidden || this._shareDisposed) return
      attempt.reported = true
      uni.showToast({ title: attempt.error, icon: 'none' })
    },
    closeShareSheet() {
      this.shareSheetVisible = false
    },
    isWorkWechatHost() {
      if (typeof uni.getAppBaseInfo !== 'function') return false
      const host = uni.getAppBaseInfo()?.host || {}
      return /wecom|wework|wxwork|企业微信/i.test(`${host.env || ''} ${host.name || ''}`)
    },
    shareToWechat() {
      if (this.canStartShare) return
      uni.showToast({ title: this.shareTokenError || '分享初始化未完成，请稍后重试', icon: 'none' })
      this.primeShareToken()
    },
    async shareToWorkWechat() {
      if (this.isWorkWechatHost()) {
        this.shareToWechat()
        return
      }
      if (this._copyingShare) return
      const attempt = this.startShareAttempt()
      if (!attempt) { this.shareToWechat(); return }
      this._copyingShare = true
      try {
        if (!(await attempt.acceptedPromise)) throw new Error(attempt.error || '分享请求未能确认，请重试')
        if (attempt.status === 'failed') throw new Error(attempt.error)
        if (this._shareDisposed) return
        await new Promise((resolve, reject) => {
          uni.setClipboardData({ data: attempt.shareUrl, success: resolve, fail: reject })
        })
        this.shareSheetVisible = false
        uni.showModal({
          title: '企业微信分享',
          content: '当前不在企业微信内，链接已复制，请在企业微信中选择联系人或群聊后粘贴发送。',
          showCancel: false
        })
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      } finally {
        this._copyingShare = false
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
  flex-shrink: 0;
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
.search-wrap {
  flex-shrink: 0;
  padding: 0 18px;
  background: #fff;
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
  padding: 6px 14px 18px;
  background: #f4f4f4;
}
.gallery-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  /* Keep the first row's -9px folder tab inside the native scroll content. */
  padding-top: 12px;
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
.contact-mask { display: flex; align-items: center; justify-content: center; padding: 24px; box-sizing: border-box; }
.contact-dialog { position: relative; width: 100%; max-width: 420px; max-height: 85vh; overflow-y: auto; padding: 28px 24px; border-radius: 20px; box-sizing: border-box; background: #fff; }
.contact-close { position: absolute; top: 18px; right: 18px; width: 30px; height: 30px; padding: 0; border-radius: 50%; background: #bdbfbf; color: #fff; font-size: 26px; line-height: 28px; }
.contact-title { display: block; padding-right: 30px; color: #25211f; font-size: 21px; font-weight: 700; }
.contact-subtitle { display: block; margin-top: 10px; color: #979999; font-size: 14px; }
.contact-field { margin-top: 24px; color: #697070; font-size: 16px; }
.contact-field input { height: 46px; margin-top: 8px; color: #151616; font-size: 19px; font-weight: 600; }
.contact-field > input, .contact-phone { border-bottom: 1px solid #d7d9d9; }
.contact-phone { display: flex; align-items: center; gap: 10px; }
.contact-phone input { flex: 1; min-width: 0; }
.last-contact { flex-shrink: 0; padding: 0 12px; background: #fff2f0; color: #cf1322; font-size: 13px; line-height: 34px; }
.contact-status { display: block; margin-top: 12px; color: #cf1322; font-size: 13px; }
.contact-status.valid { color: #389e0d; }
.contact-actions { display: flex; justify-content: space-around; gap: 24px; margin-top: 34px; }
.contact-actions button { width: 100px; margin: 0; font-size: 15px; line-height: 38px; }
.contact-cancel { background: #bdbfbf; color: #fff; }
.contact-confirm { background: #e60000; color: #fff; }
.contact-confirm[disabled], .last-contact[disabled] { background: #eff2f2; color: #979999; }
.contact-dialog button::after { border: 0; }
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
