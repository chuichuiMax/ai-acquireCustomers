<template>
  <view v-if="internalAccessGranted" class="page">
    <view class="toolbar">
      <view class="search-box"><text class="search-icon" /><input v-model="keyword" placeholder="搜索客户昵称 / 手机号码" confirm-type="search" @confirm="search" /><text v-if="keyword" class="clear" @click="clearSearch">×</text></view>
      <button class="calendar-button" :class="{ selected: startDate || endDate }" aria-label="筛选预约日期" @click="dateVisible = !dateVisible"><view class="calendar-icon" /></button>
    </view>
    <view v-if="dateVisible" class="date-panel">
      <text class="filter-title">预约日期</text>
      <view class="date-range">
        <picker mode="date" :value="draftStart" :end="draftEnd || undefined" @change="draftStart = $event.detail.value"><view>{{ draftStart || '开始日期' }}</view></picker>
        <text>至</text>
        <picker mode="date" :value="draftEnd" :start="draftStart || undefined" @change="draftEnd = $event.detail.value"><view>{{ draftEnd || '结束日期' }}</view></picker>
      </view>
      <view class="filter-actions"><button @click="clearDates">清除</button><button class="primary" @click="applyDates">确定</button></view>
    </view>
    <view v-if="startDate || endDate" class="filter-summary">{{ startDate || '不限开始' }} — {{ endDate || '不限结束' }}<text @click="clearDates">清除</text></view>
    <view v-if="!items.length && loading" class="state">正在加载客资…</view>
    <view v-else-if="!items.length && loadError" class="state"><text>{{ loadError }}</text><button @click="load(true)">重新加载</button></view>
    <view v-else-if="!items.length" class="state"><text>{{ appliedKeyword || startDate || endDate ? '没有符合条件的客资' : '暂无预约客资' }}</text><text class="state-note">业主通过您分享的案例提交预约后，会显示在这里。</text></view>
    <view v-for="item in items" :key="item.id" class="lead-card" @click="openDetail(item)">
      <view class="customer-row">
        <view class="avatar-wrap"><image v-if="item.avatarSrc" class="avatar" :src="item.avatarSrc" mode="aspectFill" /><view v-else class="avatar avatar-placeholder">{{ (item.nickname || '客').slice(0, 1) }}</view><view v-if="item.unread" class="unread-dot" /></view>
        <view class="customer-copy"><text class="customer-name">{{ item.nickname || '预约客户' }}</text><text class="phone">{{ item.phone_masked }}</text></view>
        <text class="status-tag" :class="item.follow_status">{{ item.follow_status === 'followed' ? '已跟进' : '待跟进' }}</text>
      </view>
      <view class="source-row"><text class="source-title">案例分享：{{ item.source_title }}</text><text class="source-tag">{{ sourceLabel(item.source_platform) }}</text></view>
      <view class="card-footer">
        <button class="follow-button" :class="{ done: item.follow_status === 'followed' }" :disabled="item.follow_status === 'followed' || !!following[item.id]" :loading="!!following[item.id]" @click.stop="follow(item)">{{ item.follow_status === 'followed' ? '已跟进' : '待跟进' }}</button>
        <text class="time">{{ formatTime(item.acquired_at) }}</text>
      </view>
    </view>
    <view v-if="items.length" class="list-footer"><text v-if="loading">正在加载…</text><text v-else-if="loadError" class="retry" @click="load(false)">{{ loadError }}，点击重试</text><text v-else-if="items.length < total" @click="load(false)">加载更多</text><text v-else>已显示全部客资</text></view>
    <tab-bar current="mine" />
  </view>
</template>

<script>
import TabBar from '../../components/tab-bar.vue'
import { mpLeadApi } from '../../apis/mp'
import { errorMessage } from '../../utils/request'
import { internalPageMixin } from '../../utils/internal-access'
import { applyLeadUpdate, formatLeadTime, leadSourceLabel } from '../../utils/customer-leads.mjs'

export default {
  components: { TabBar },
  mixins: [internalPageMixin],
  data() {
    return { items: [], total: 0, pageNumber: 0, loading: false, loadError: '', following: {}, keyword: '', appliedKeyword: '', startDate: '', endDate: '', draftStart: '', draftEnd: '', dateVisible: false }
  },
  onLoad() {
    this._loadVersion = 0
    this._avatarGeneration = 0
    this._onLeadChanged = (updated) => { this.items = applyLeadUpdate(this.items, updated) }
    uni.$on('customer-lead-changed', this._onLeadChanged)
  },
  async onShow() {
    if (!(await this.ensureInternalAccess())) return
    if (!this._loaded) this.load(true)
  },
  onUnload() { this._loadVersion += 1; this._avatarGeneration += 1; uni.$off('customer-lead-changed', this._onLeadChanged) },
  onPullDownRefresh() { this.load(true) },
  onReachBottom() { if (!this.loading && this.items.length < this.total) this.load(false) },
  methods: {
    formatTime: formatLeadTime,
    sourceLabel: leadSourceLabel,
    search() { this.appliedKeyword = this.keyword.trim(); this.load(true) },
    clearSearch() { this.keyword = ''; this.search() },
    clearDates() { this.draftStart = ''; this.draftEnd = ''; this.applyDates() },
    applyDates() {
      if (this.draftStart && this.draftEnd && this.draftStart > this.draftEnd) {
        uni.showToast({ title: '开始日期不能晚于结束日期', icon: 'none' }); return
      }
      this.startDate = this.draftStart; this.endDate = this.draftEnd; this.dateVisible = false; this.load(true)
    },
    async load(reset) {
      if (!this.internalAccessGranted || (this.loading && !reset)) { uni.stopPullDownRefresh(); return }
      const version = ++this._loadVersion
      const page = reset ? 1 : this.pageNumber + 1
      this.loading = true; this.loadError = ''
      if (reset) { this._avatarGeneration += 1; this.items = []; this.total = 0; this.pageNumber = 0 }
      const avatarGeneration = this._avatarGeneration
      try {
        const data = await mpLeadApi.list({ page, page_size: 20, keyword: this.appliedKeyword, start_date: this.startDate, end_date: this.endDate })
        if (version !== this._loadVersion) return
        const rows = data.items.map(item => ({ ...item, avatarSrc: '' }))
        const known = new Set(this.items.map(item => item.id))
        this.items = reset ? rows : [...this.items, ...rows.filter(item => !known.has(item.id))]
        this.total = data.total; this.pageNumber = page; this._loaded = true
        for (const item of rows) {
          if (!item.avatar_url) continue
          mpLeadApi.avatar(item.avatar_url).then(src => {
            if (avatarGeneration === this._avatarGeneration) this.items = this.items.map(row =>
              row.id === item.id && row.revision === item.revision ? { ...row, avatarSrc: src } : row)
          }).catch(() => {})
        }
      } catch (error) {
        if (version === this._loadVersion) this.loadError = errorMessage(error)
      } finally {
        if (version === this._loadVersion) { this.loading = false; uni.stopPullDownRefresh() }
      }
    },
    openDetail(item) { uni.navigateTo({ url: `/pages/mine/lead-detail?id=${encodeURIComponent(item.id)}` }) },
    async follow(item) {
      if (item.follow_status === 'followed' || this.following[item.id]) return
      this.following = { ...this.following, [item.id]: true }
      try {
        await mpLeadApi.follow(item.id, item.revision)
        this.items = this.items.map(row => row.id === item.id && row.revision === item.revision
          ? { ...row, follow_status: 'followed' } : row)
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
        if (error.statusCode === 409) this.load(true)
      } finally { this.following = { ...this.following, [item.id]: false } }
    }
  }
}
</script>

<style scoped>
.page { min-height: 100vh; box-sizing: border-box; padding: 18px 14px calc(90px + env(safe-area-inset-bottom)); background: #f7fafc; color: #202020; }
.toolbar { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
.search-box { flex: 1; min-width: 0; height: 48px; display: flex; align-items: center; padding: 0 14px; border-radius: 12px; background: #fff; box-shadow: 0 2px 7px #20202016; }
.search-box input { flex: 1; min-width: 0; font-size: 15px; }
.search-icon { width: 14px; height: 14px; border: 2px solid #272727; border-radius: 50%; position: relative; margin-right: 12px; }
.search-icon::after { content: ''; width: 7px; height: 2px; background: #272727; position: absolute; right: -5px; bottom: -3px; transform: rotate(45deg); }
.clear { padding: 6px; color: #888; font-size: 22px; }
.calendar-button { margin: 0; padding: 8px 3px; background: transparent; line-height: 1; }
.calendar-button::after, button::after { border: 0; }
.calendar-icon { width: 23px; height: 23px; border: 2px solid #3478ff; border-radius: 3px; background: repeating-linear-gradient(0deg, transparent 0 6px, #3478ff 6px 8px); }
.calendar-button.selected { background: #e8efff; border-radius: 8px; }
.lead-card { margin-bottom: 18px; padding: 18px 14px 14px; border-radius: 14px; background: #fff; box-shadow: 0 3px 8px #20202017; }
.customer-row { display: flex; align-items: center; gap: 10px; }
.avatar-wrap { position: relative; flex-shrink: 0; }
.avatar { display: block; width: 58px; height: 58px; border-radius: 50%; }
.avatar-placeholder { display: flex; align-items: center; justify-content: center; background: #e7efff; color: #3478ff; font-size: 23px; }
.unread-dot { position: absolute; right: 1px; top: 0; width: 9px; height: 9px; border: 2px solid #fff; background: #e83b35; border-radius: 50%; }
.customer-copy { flex: 1; min-width: 0; }
.customer-name { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 19px; font-weight: 600; }
.phone { display: block; margin-top: 6px; font-size: 16px; color: #3478ff; }
.status-tag { align-self: flex-start; padding: 7px 9px; border-radius: 5px; font-size: 11px; white-space: nowrap; background: #e5edff; color: #1763e9; }
.status-tag.followed { background: #ffeadc; color: #dc6514; }
.source-row { display: flex; align-items: center; gap: 8px; margin-top: 18px; padding: 10px; border-radius: 10px; background: #f5f5f7; }
.source-title { flex: 1; min-width: 0; font-size: 13px; line-height: 1.6; color: #747474; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.source-tag { flex-shrink: 0; padding: 6px 7px; border-radius: 5px; color: #b73a25; background: #f0e9e6; font-size: 11px; font-weight: 600; }
.card-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 14px; }
.follow-button { margin: 0; padding: 0 20px; height: 32px; line-height: 32px; border-radius: 4px; color: #fff; background: #2e972d; font-size: 12px; font-weight: 600; }
.follow-button.done, .follow-button.done[disabled] { color: #fff; background: #6d6d6d; }
.time { color: #777; font-size: 12px; }
.state { padding: 70px 15px; text-align: center; color: #777; font-size: 14px; }
.state text { display: block; }.state-note { margin-top: 12px; line-height: 1.8; font-size: 12px; }
.state button { margin: 20px auto; width: 130px; color: #3478ff; background: #edf3ff; font-size: 14px; }
.list-footer { padding: 12px; text-align: center; color: #999; font-size: 12px; }.retry { color: #b73a25; }
.date-panel { padding: 16px; margin-bottom: 16px; border-radius: 12px; background: #fff; box-shadow: 0 2px 7px #20202010; }
.filter-title { font-size: 14px; font-weight: 600; }.date-range { display: flex; align-items: center; gap: 10px; margin: 15px 0; font-size: 13px; }.date-range picker { flex: 1; padding: 10px 5px; text-align: center; background: #f5f7fa; border-radius: 6px; }
.filter-actions { display: flex; gap: 12px; }.filter-actions button { flex: 1; font-size: 13px; line-height: 32px; background: #f4f4f4; }.filter-actions .primary { color: #fff; background: #3478ff; }
.filter-summary { display: flex; justify-content: space-between; font-size: 12px; color: #777; margin: 0 2px 14px; }.filter-summary text { color: #3478ff; }
</style>
