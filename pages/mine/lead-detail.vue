<template>
  <view v-if="internalAccessGranted" class="page">
    <view v-if="loading" class="state">正在加载客资…</view>
    <view v-else-if="loadError" class="state"><text>{{ loadError }}</text><button @click="load">重新加载</button></view>
    <template v-else-if="lead">
      <view class="profile-card">
        <view class="customer-row"><image v-if="avatarSrc" class="avatar" :src="avatarSrc" mode="aspectFill" /><view v-else class="avatar avatar-placeholder">{{ lead.nickname.slice(0, 1) }}</view><view class="customer-copy"><text class="name">{{ lead.nickname }}</text><text class="phone">{{ lead.phone_masked }}</text></view></view>
        <button class="call-button" @click="call"><text class="call-icon">☎</text><text>拨打电话</text></button>
        <view v-if="readError" class="read-error"><text>{{ readError }}</text><text @click="load">刷新重试</text></view>
      </view>
      <view class="source-card">
        <view class="source-heading"><view class="person-icon" /><text>信息来源</text><text class="source-tag">{{ sourceLabel(lead.source_platform) }}</text></view>
        <view v-if="sourceLoading" class="source-state">正在加载案例…</view>
        <view v-else-if="sourceError" class="source-state"><text>{{ sourceError }}</text><button @click="loadSource()">重新加载</button></view>
        <case-share-content v-else-if="sourceView" :case-info="sourceView.caseInfo" :cover-url="sourceView.coverUrl" :images="sourceView.images"
          @preview="previewSourceImage" @call="callSourceSharer" />
        <view class="source-copy"><text class="source-title">{{ lead.source_title }}</text><text class="shared-time">分享时间：{{ formatTime(lead.shared_at) }}</text></view>
      </view>
    </template>
    <tab-bar current="mine" />
  </view>
</template>

<script>
import TabBar from '../../components/tab-bar.vue'
import CaseShareContent from '../../components/case-share-content.vue'
import { mpLeadApi, mpContentApi } from '../../apis/mp'
import { errorMessage, publicMediaUrl } from '../../utils/request'
import { caseShareViewData } from '../../utils/case-share-view.mjs'
import { caseShareStatusMessage } from '../../utils/materials-logic.mjs'
import { internalPageMixin } from '../../utils/internal-access'
import { markLeadRead } from '../../utils/lead-reminder'
import { formatLeadTime, leadSourceLabel } from '../../utils/customer-leads.mjs'
import { openCaseSystemPage, markCaseSystemReturn, clearCaseSystemAction } from '../../utils/share-entry.mjs'

export default {
  components: { TabBar, CaseShareContent },
  mixins: [internalPageMixin],
  data() { return { id: '', lead: null, avatarSrc: '', loading: true, loadError: '', readError: '', sourceView: null, sourceLoading: false, sourceError: '' } },
  onLoad(options) { this.id = options?.id || ''; this._loadVersion = 0 },
  async onShow() {
    this._visible = true
    markCaseSystemReturn(this)
    if (!(await this.ensureInternalAccess())) return
    if (!this.lead) this.load()
    else if (this.lead.unread && !this.readError) this.markRead(this.lead, this._loadVersion)
  },
  onHide() { this._visible = false },
  onUnload() { this._visible = false; this._loadVersion += 1; clearCaseSystemAction(this) },
  methods: {
    formatTime: formatLeadTime,
    sourceLabel: leadSourceLabel,
    async load() {
      if (!this.internalAccessGranted) return
      const version = ++this._loadVersion
      this.loading = true; this.loadError = ''; this.readError = ''; this.avatarSrc = ''
      try {
        if (!this.id) throw new Error('缺少客资编号')
        const lead = await mpLeadApi.get(this.id)
        if (version !== this._loadVersion) return
        this.lead = lead; this.loading = false
        this.loadSource(lead, version)
        uni.$emit('customer-lead-changed', lead)
        mpLeadApi.avatar(lead.avatar_url).then(src => {
          if (version !== this._loadVersion) return
          this.avatarSrc = src
          uni.$emit('customer-lead-changed', { ...this.lead, avatarSrc: src })
        }).catch(() => {})
        await this.$nextTick()
        await this.markRead(lead, version)
      } catch (error) {
        if (version === this._loadVersion) this.loadError = errorMessage(error)
      } finally { if (version === this._loadVersion) this.loading = false }
    },
    async markRead(lead, version) {
      if (!this._visible || version !== this._loadVersion || !lead.unread || this._readingVersion === version) return
      this._readingVersion = version
      try {
        await markLeadRead(lead.id, lead.revision)
        if (version !== this._loadVersion) return
        this.lead = { ...this.lead, unread: false }
        uni.$emit('customer-lead-changed', this.lead)
      } catch (error) {
        if (version === this._loadVersion) this.readError = error.statusCode === 409 ? '业主有新的预约，请刷新查看' : '已读状态未保存'
      } finally { if (this._readingVersion === version) this._readingVersion = null }
    },
    call() {
      openCaseSystemPage('makePhoneCall', { phoneNumber: this.lead.phone, fail: error => {
        if (!/cancel/i.test(error.errMsg || '')) uni.showToast({ title: '暂时无法拨号，请稍后重试', icon: 'none' })
      } }, this)
    },
    async loadSource(lead = this.lead, version = this._loadVersion) {
      const sourceVersion = this._sourceLoadVersion = (this._sourceLoadVersion || 0) + 1
      this.sourceLoading = true; this.sourceError = ''; this.sourceView = null
      try {
        if (!lead?.source_share_id) throw new Error('缺少案例分享信息')
        const response = await mpContentApi.getShare(lead.source_share_id)
        if (version !== this._loadVersion || sourceVersion !== this._sourceLoadVersion) return
        const share = response.share || response
        if (share.status && share.status !== 'completed') throw new Error(caseShareStatusMessage(share.status))
        this.sourceView = caseShareViewData(share, publicMediaUrl)
      } catch (error) {
        if (version === this._loadVersion && sourceVersion === this._sourceLoadVersion) this.sourceError = errorMessage(error)
      } finally {
        if (version === this._loadVersion && sourceVersion === this._sourceLoadVersion) this.sourceLoading = false
      }
    },
    callSourceSharer() {
      openCaseSystemPage('makePhoneCall', { phoneNumber: this.sourceView.caseInfo.sharerPhone }, this)
    },
    previewSourceImage(index) {
      const urls = this.sourceView.images.map(image => image.previewUrl)
      if (urls.length) openCaseSystemPage('previewImage', { current: urls[index], urls }, this)
    }
  }
}
</script>

<style scoped>
.page { min-height: 100vh; box-sizing: border-box; padding: 18px 14px calc(90px + env(safe-area-inset-bottom)); background: #f7fafc; color: #171717; }
.profile-card, .source-card { overflow: hidden; border-radius: 14px; background: #fff; box-shadow: 0 3px 8px #20202017; }
.profile-card { padding: 20px 16px; }.customer-row { display: flex; align-items: center; gap: 14px; }
.avatar { display: block; flex-shrink: 0; width: 62px; height: 62px; border-radius: 50%; }
.avatar-placeholder { display: flex; align-items: center; justify-content: center; color: #3478ff; background: #e7efff; font-size: 25px; }
.customer-copy { flex: 1; min-width: 0; }.name { display: block; font-size: 21px; font-weight: 600; overflow-wrap: anywhere; }.phone { display: block; color: #3478ff; font-size: 18px; margin-top: 7px; }
.call-button { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; width: 112px; height: 86px; margin: 20px 0 2px; padding: 0; border-radius: 12px; line-height: 1.5; color: #171717; background: #fff; box-shadow: 0 2px 8px #2020201c; font-size: 18px; }
.call-button::after, button::after { border: 0; }.call-icon { color: #dc2626; font-size: 29px; }
.source-card { margin-top: 20px; }.source-heading { display: flex; align-items: center; gap: 12px; padding: 19px 18px; font-size: 21px; font-weight: 600; }
.person-icon { position: relative; width: 20px; height: 13px; background: #181818; border-radius: 8px 8px 2px 2px; margin-top: 10px; }.person-icon::before { content: ''; position: absolute; top: -12px; left: 4px; width: 12px; height: 12px; border-radius: 50%; background: #181818; }
.source-tag { margin-left: auto; padding: 7px 8px; border-radius: 5px; color: #b73a25; background: #fff8f3ed; font-size: 12px; font-weight: 600; }
.source-state { padding: 32px 16px; text-align: center; color: #777; font-size: 14px; }.source-state text { display: block; }.source-state button { margin: 16px auto 0; width: 112px; background: #edf3ff; color: #3478ff; font-size: 14px; }
.source-copy { padding: 14px 14px 18px; }.source-title { display: block; font-size: 18px; font-weight: 600; line-height: 1.5; overflow-wrap: anywhere; }.shared-time { display: block; margin-top: 7px; color: #777; font-size: 14px; }
.state { padding: 80px 16px; text-align: center; color: #777; font-size: 14px; }.state button { margin: 20px auto; width: 130px; background: #edf3ff; color: #3478ff; font-size: 14px; }
.read-error { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; gap: 12px; color: #a15c26; font-size: 12px; }.read-error text:last-child { color: #3478ff; flex-shrink: 0; }
</style>
