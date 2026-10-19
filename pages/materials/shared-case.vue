<template>
  <view class="share-page">
    <view v-if="loading" class="state-view">正在加载案例...</view>

    <view v-else-if="loadError" class="state-view error-state">
      <text>案例暂时无法查看</text>
      <button class="retry-button" @click="loadShare">重新加载</button>
    </view>

    <view v-else-if="shareStatus !== 'completed'" class="state-view">
      <text>{{ statusMessage }}</text>
      <button class="retry-button" @click="loadShare">重新加载</button>
    </view>

    <scroll-view v-else class="case-scroll" scroll-y>
      <case-share-content :case-info="caseInfo" :cover-url="coverUrl" :images="images"
        @preview="previewImage" @call="callSharer" />
      <view class="booking-entry">
        <button class="booking-cta" @click="openBooking">预约免费参观工地</button>
      </view>
    </scroll-view>
    <view v-if="bookingVisible" class="booking-mask" @click="closeBooking">
      <view class="booking-sheet" role="dialog" aria-label="预约免费参观工地" @click.stop>
        <view class="booking-heading">
          <view><text class="booking-title">预约免费参观工地</text><text class="booking-subtitle">留下联系信息，我们为您安排参观</text></view>
          <button class="booking-close" :disabled="bookingSubmitting" aria-label="关闭预约" @click="closeBooking">×</button>
        </view>
        <view class="booking-profile">
          <button class="booking-avatar" open-type="chooseAvatar" :disabled="bookingSubmitting"
            @click="beginBookingAvatar" @chooseavatar="chooseBookingAvatar">
            <image v-if="bookingAvatar" :src="bookingAvatar" mode="aspectFill" />
            <text v-else>选择头像</text>
          </button>
          <view class="booking-name-field">
            <text>客户昵称</text>
            <input type="nickname" :value="bookingNickname" maxlength="32" :disabled="bookingSubmitting"
              placeholder="请填写昵称" @input="updateBookingNickname" @blur="updateBookingNickname"
              @nicknamereview="reviewBookingNickname" />
          </view>
        </view>
        <view class="booking-consent" @click="toggleBookingConsent">
          <checkbox :checked="bookingConsent" color="#e60012" :disabled="bookingSubmitting" />
          <text>我同意提供昵称、头像和手机号，用于联系安排本次参观，并已阅读</text>
          <text class="booking-privacy" @click.stop="openBookingPrivacy">《隐私保护指引》</text>
        </view>
        <text v-if="bookingError" class="booking-error">{{ bookingError }}</text>
        <button v-if="!bookingSession" class="booking-cta" :loading="bookingSessionLoading"
          :disabled="bookingSessionLoading" @click="prepareBookingSession">{{ bookingSessionLoading ? '正在准备预约…' : '重试准备预约' }}</button>
        <button v-else class="booking-cta" open-type="getPhoneNumber" :disabled="!bookingReady" :loading="bookingSubmitting"
          @click="beginBookingPhone" @getphonenumber="submitBooking">{{ bookingSubmitting ? '正在提交…' : '授权手机号并提交预约' }}</button>
        <text class="booking-footnote">提交成功后，工作人员将电话联系您确认参观安排</text>
      </view>
    </view>
  </view>
</template>

<script>
import CaseShareContent from '../../components/case-share-content.vue'
import { caseShareViewData } from '../../utils/case-share-view.mjs'
import { mpContentApi, mpVisitorApi } from '../../apis/mp'
import { caseShareStatusMessage, DEFAULT_CASE_SHARE_COVER } from '../../utils/materials-logic.mjs'
import { errorMessage, publicMediaUrl } from '../../utils/request'
import { beginCaseComponentAction, finishCaseComponentAction, clearCaseSystemAction, markCaseSystemReturn, openCaseSystemPage, saveLastShareId, caseEntryOptions } from '../../utils/share-entry.mjs'

export default {
  components: { CaseShareContent },
  data() {
    return {
      shareId: '',
      loading: true,
      loadError: false,
      shareStatus: 'unknown',
      caseInfo: {
        title: '案例分享',
        building: '',
        area: '',
        style: '',
        sharerName: '',
        sharerPhone: ''
      },
      coverUrl: '',
      coverPreviewUrl: '',
      shareCardCoverUrl: '',
      images: [],
      bookingVisible: false,
      bookingNickname: '',
      bookingAvatar: '',
      bookingConsent: false,
      bookingNicknameValid: true,
      bookingSession: '',
      bookingSessionExpiresAt: 0,
      bookingSessionLoading: false,
      bookingSubmitting: false,
      bookingError: '',
      bookingVersion: 0
    }
  },
  computed: {
    statusMessage() { return caseShareStatusMessage(this.shareStatus) },
    bookingReady() {
      return Boolean(this.bookingSession && this.bookingAvatar && this.bookingNickname.trim()
        && this.bookingNicknameValid && this.bookingConsent && !this.bookingSessionLoading && !this.bookingSubmitting)
    }
  },
  onLoad(options) {
    const entry = caseEntryOptions(options)
    this._entryCode = entry.entryCode
    this._bookingIntent = entry.booking
    this.shareId = entry.entryCode ? '' : options?.shareId || ''
    saveLastShareId(this.shareId)
    this.loadShare()
  },
  onShow() {
    markCaseSystemReturn(this)
    // #ifdef MP-WEIXIN
    if (typeof uni.hideHomeButton === 'function') uni.hideHomeButton()
    // #endif
  },
  onUnload() {
    this.bookingVersion += 1
    this._shareDisposed = true
    this._shareLoadVersion = (this._shareLoadVersion || 0) + 1
    clearTimeout(this._sharePollTimer)
    clearCaseSystemAction(this)
  },
  onShareAppMessage() {
    return {
      title: this.caseInfo.title,
      imageUrl: this.shareCardCoverUrl || this.coverPreviewUrl || this.coverUrl || DEFAULT_CASE_SHARE_COVER,
      path: `/pages/materials/shared-case?shareId=${encodeURIComponent(this.shareId)}`
    }
  },
  methods: {
    openBooking() {
      this.bookingVisible = true
      this.bookingError = ''
      if (!this.bookingSession || Date.now() >= this.bookingSessionExpiresAt) this.prepareBookingSession()
    },
    closeBooking() {
      if (this.bookingSubmitting) return
      this.bookingVisible = false
      this.bookingVersion += 1
      this.bookingSessionLoading = false
    },
    async prepareBookingSession() {
      if (this.bookingSessionLoading) return
      const version = ++this.bookingVersion
      this.bookingSessionLoading = true
      this.bookingSession = ''
      this.bookingError = ''
      try {
        // #ifdef MP-WEIXIN
        if (typeof wx !== 'undefined' && typeof wx.requirePrivacyAuthorize === 'function') {
          beginCaseComponentAction('bookingPrivacy', this)
          await new Promise((resolve, reject) => wx.requirePrivacyAuthorize({ success: resolve, fail: reject }))
        }
        // #endif
        const login = await new Promise((resolve, reject) => uni.login({ timeout: 10000, success: resolve, fail: reject }))
        const session = await mpVisitorApi.createSession({ code: login.code, share_token: this.shareId })
        if (version !== this.bookingVersion) return
        this.bookingSession = session.session_id
        this.bookingSessionExpiresAt = Date.now() + (session.expires_in - 10) * 1000
      } catch (error) {
        finishCaseComponentAction(this, true)
        if (version === this.bookingVersion) this.bookingError = /deny|cancel/i.test(error.errMsg || '')
          ? '请同意微信隐私保护指引后继续预约' : errorMessage(error)
      } finally {
        if (version === this.bookingVersion) this.bookingSessionLoading = false
      }
    },
    beginBookingAvatar() {
      beginCaseComponentAction('chooseAvatar', this)
    },
    chooseBookingAvatar(event) {
      finishCaseComponentAction(this, !event.detail?.avatarUrl)
      if (event.detail?.avatarUrl) this.bookingAvatar = event.detail.avatarUrl
    },
    updateBookingNickname(event) {
      this.bookingNickname = String(event.detail?.value || '')
      this.bookingNicknameValid = false
    },
    reviewBookingNickname(event) {
      this.bookingNicknameValid = event.detail?.pass !== false
      if (!this.bookingNicknameValid) this.bookingError = '昵称未通过微信审核，请修改后重试'
    },
    beginBookingPhone() {
      if (!this.bookingReady) return
      beginCaseComponentAction('getPhoneNumber', this)
    },
    async submitBooking(event) {
      const detail = event.detail || {}
      finishCaseComponentAction(this, !detail.code)
      if (this.bookingSubmitting) return
      if (!detail.code) {
        this.bookingError = /deny|cancel/i.test(detail.errMsg || '')
          ? '已取消手机号授权，预约尚未提交'
          : /frequently|too many/i.test(detail.errMsg || '') ? '手机号授权过于频繁，请稍后重试' : '未能获取微信手机号，请稍后重试'
        return
      }
      if (!this.bookingReady) return
      const version = this.bookingVersion
      this.bookingSubmitting = true
      this.bookingError = ''
      try {
        await mpVisitorApi.submitBooking(this.shareId, this.bookingAvatar, {
          session_id: this.bookingSession, nickname: this.bookingNickname.trim(), phone_code: detail.code, consent: 'true'
        })
        if (version !== this.bookingVersion) return
        this.bookingVisible = false
        this.bookingSession = ''
        uni.showModal({ title: '预约申请已提交', content: '工作人员将联系您安排免费工地参观。', showCancel: false })
      } catch (error) {
        if (version !== this.bookingVersion) return
        this.bookingError = errorMessage(error)
        if (error.statusCode === 401) this.bookingSession = ''
      } finally {
        this.bookingSubmitting = false
      }
    },
    toggleBookingConsent() {
      if (!this.bookingSubmitting) this.bookingConsent = !this.bookingConsent
    },
    openBookingPrivacy() {
      // #ifdef MP-WEIXIN
      if (typeof wx !== 'undefined' && typeof wx.openPrivacyContract === 'function') {
        beginCaseComponentAction('privacyContract', this)
        wx.openPrivacyContract({ fail: () => {
          finishCaseComponentAction(this, true)
          this.bookingError = '隐私保护指引暂时无法打开，请稍后重试'
        } })
      }
      // #endif
    },
    async loadShare(poll = false) {
      clearTimeout(this._sharePollTimer)
      if (poll !== true) this._sharePollCount = 0
      const version = this._shareLoadVersion = (this._shareLoadVersion || 0) + 1
      if (!this.shareId && !this._entryCode) {
        this.loading = false
        this.loadError = true
        return
      }

      if (poll !== true) this.loading = true
      this.loadError = false
      try {
        if (this._entryCode && !this.shareId) {
          const entry = await mpVisitorApi.resolveEntry(this._entryCode)
          if (this._shareDisposed || version !== this._shareLoadVersion) return
          this.shareId = entry.share_id
        }
        const response = await mpContentApi.getShare(this.shareId)
        if (this._shareDisposed || version !== this._shareLoadVersion) return
        const share = response.share || response
        this.shareStatus = share.status || 'completed'
        if (this.shareStatus !== 'completed') {
          this.caseInfo.title = share.title || '案例分享'
          if (this.shareStatus !== 'failed' && this._sharePollCount < 15) {
            this._sharePollCount += 1
            this._sharePollTimer = setTimeout(() => this.loadShare(true), 2000)
          }
          return
        }
        Object.assign(this, caseShareViewData(share, publicMediaUrl))
        saveLastShareId(this.shareId)
        uni.setNavigationBarTitle({ title: this.caseInfo.title })
        if (this._bookingIntent) {
          // 先展示原案例再展开卡片；手机号仍由业主主动点击原生授权按钮。
          await this.$nextTick()
          if (!this._shareDisposed && version === this._shareLoadVersion && this._bookingIntent) {
            this._bookingIntent = false
            this.openBooking()
          }
        }
      } catch (error) {
        if (this._shareDisposed || version !== this._shareLoadVersion) return
        this.loadError = true
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      } finally {
        if (!this._shareDisposed && version === this._shareLoadVersion) this.loading = false
      }
    },
    callSharer() {
      openCaseSystemPage('makePhoneCall', { phoneNumber: this.caseInfo.sharerPhone }, this)
    },
    previewImage(index) {
      const urls = this.images.map((image) => image.previewUrl)
      if (!urls.length) return
      openCaseSystemPage('previewImage', { current: urls[index], urls }, this)
    }
  }
}
</script>

<style scoped>
.share-page {
  min-height: 100vh;
  background: #f5f5f5;
}
.case-scroll {
  height: 100vh;
}
.state-view {
  min-height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #847b75;
  font-size: 14px;
}
.error-state {
  color: #5b514c;
}
.retry-button {
  width: 112px;
  height: 38px;
  margin-top: 18px;
  border-radius: 4px;
  color: #fff;
  font-size: 14px;
  line-height: 38px;
  background: #be2d22;
}
.retry-button::after {
  border: 0;
}
.booking-entry { padding: 0 16px calc(24px + env(safe-area-inset-bottom)); }
.booking-cta { width: 100%; margin: 0; min-height: 52px; line-height: 52px; border-radius: 8px;
  background: #e60012; color: #fff; font-size: 16px; font-weight: 600; }
.booking-cta[disabled] { background: #e4d9da; color: #8b7e7e; }
.booking-cta::after, .booking-avatar::after, .booking-close::after { border: 0; }
.booking-mask { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,.46);
  display: flex; align-items: flex-end; }
.booking-sheet { width: 100%; box-sizing: border-box; padding: 24px 22px calc(24px + env(safe-area-inset-bottom));
  max-height: 88vh; overflow-y: auto; background: #fff; border-radius: 20px 20px 0 0; }
.booking-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.booking-title { display: block; color: #202020; font-size: 20px; font-weight: 600; }
.booking-subtitle { display: block; margin-top: 8px; color: #837c7c; font-size: 13px; }
.booking-close { padding: 0; margin: -6px -4px 0 0; width: 36px; height: 36px; line-height: 34px;
  background: transparent; font-size: 28px; color: #898080; flex-shrink: 0; }
.booking-profile { display: flex; gap: 20px; align-items: center; margin: 28px 0 24px; }
.booking-avatar { width: 72px; height: 72px; padding: 0; margin: 0; border-radius: 50%;
  background: #f4eeee; color: #8d7474; font-size: 12px; line-height: 72px; flex-shrink: 0; }
.booking-avatar image { width: 72px; height: 72px; display: block; }
.booking-name-field { flex: 1; min-width: 0; color: #635959; font-size: 13px; }
.booking-name-field input { height: 42px; margin-top: 4px; border-bottom: 1px solid #e8e2e2; font-size: 16px; color: #202020; }
.booking-consent { font-size: 12px; line-height: 1.8; color: #817777; margin-bottom: 18px; }
.booking-consent checkbox { transform: scale(.7); transform-origin: left center; width: 24px; }
.booking-privacy { color: #b62626; }
.booking-error { display: block; color: #c32b2b; margin-bottom: 14px; font-size: 13px; line-height: 1.5; }
.booking-footnote { display: block; text-align: center; font-size: 11px; color: #9c9191; margin-top: 14px; }
</style>
