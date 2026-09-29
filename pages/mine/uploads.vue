<template>
  <view v-if="internalAccessGranted" class="page">
    <view v-if="libraryNotice" class="library-notice">{{ libraryNotice }}</view>
    <view v-if="loadError && !activeGallery" class="library-error" @click="loadGalleries">{{ loadError }}，点击重试</view>
    <view v-if="activeGallery" class="back" @click="backGallery">‹ 返回我的素材</view>
    <view v-if="!activeGallery" class="folder-grid">
      <view v-for="gallery in galleries" :key="gallery.id" class="folder" @click="openGallery(gallery)">
        <view class="folder-icon"><view class="folder-tab" /></view>
        <text>{{ gallery.name }}</text>
        <text class="folder-count">{{ gallery.count === null ? (loadingFolders ? '正在加载…' : '未加载') : `${gallery.count} 张` }}</text>
      </view>
    </view>
    <view v-else class="gallery-card">
      <text class="gallery-title">{{ activeGallery.name }}</text>
      <view v-if="calendarOpen" class="calendar-scrim" @click="closeCalendar" />
      <view class="date-filter-wrap">
        <view class="date-filter" @click="openCalendar">
          <text class="date-label">日期区间</text>
          <text class="date-value">{{ dateFrom && dateTo ? dateFrom + '—' + dateTo : '开始日期—结束日期' }}</text>
          <text class="date-icon">▦</text>
        </view>
        <view v-if="calendarOpen" class="calendar-panel">
          <view class="calendar-title">选择日期区间</view>
          <view class="calendar-selection">
            <text>{{ draftDateFrom || '开始日期' }}</text>
            <text>—</text>
            <text>{{ draftDateTo || '结束日期' }}</text>
          </view>
          <view class="calendar-month">
            <text class="month-arrow" @click="moveCalendarMonth(-1)">‹</text>
            <text>{{ calendarYear }} 年 {{ calendarMonth }} 月</text>
            <text class="month-arrow" @click="moveCalendarMonth(1)">›</text>
          </view>
          <view class="calendar-days">
            <text v-for="day in weekDays" :key="day" class="weekday">{{ day }}</text>
            <view v-for="(cell, index) in calendarCells" :key="index" class="calendar-day"
              :class="{ chosen: cell.date && (cell.date === draftDateFrom || cell.date === draftDateTo), 'in-range': cell.date && draftDateTo && cell.date > draftDateFrom && cell.date < draftDateTo }"
              @click="cell.date && selectCalendarDate(cell.date)">{{ cell.day }}</view>
          </view>
          <view class="calendar-actions">
            <button class="calendar-button confirm" :disabled="!draftDateFrom" @click="applyDateRange">确定</button>
          </view>
        </view>
      </view>
      <view v-if="itemError" class="library-error" @click="loadItems(true)">{{ itemError }}，点击重试</view>
      <view v-if="loading && !items.length" class="empty">正在加载图片…</view>
      <view v-else-if="!itemError && !items.length" class="empty">{{ dateFrom ? '所选日期内暂无图片' : '该文件夹暂无图片' }}</view>
      <view v-else class="grid">
        <view v-for="item in items" :key="item.id" class="image-card" @click="toggleItem(item)">
          <image class="image" :src="imageUrl(item)" mode="aspectFill" lazy-load />
          <view v-if="editing && item.can_manage" class="check" :class="{ selected: selectedIds.includes(item.id) }">{{ selectedIds.includes(item.id) ? '✓' : '' }}</view>
          <text v-if="activeGallery.id !== 'generated'" class="image-detail">文件名称：{{ item.file_name || '-' }}</text>
          <text class="image-detail">上传时间：{{ formatUploadTime(item.uploaded_at || (legacyMode ? item.created_at : '')) }}</text>
        </view>
      </view>
    </view>
    <view v-if="activeGallery" class="actions">
      <button v-if="activeGallery.can_upload && !editing" class="button primary" :loading="uploading" @click="chooseImages">上传</button>
      <button v-if="!editing" class="button ghost" @click="editing = true">编辑</button>
      <template v-if="editing">
        <button class="button danger" :disabled="!selectedIds.length" @click="removeSelected">删除</button>
        <button class="button ghost" @click="cancelEdit">取消</button>
      </template>
    </view>
    <tab-bar current="mine" />
  </view>
</template>

<script>
import TabBar from '../../components/tab-bar.vue'
import { mpContentApi, mpImageApi } from '../../apis/mp'
import { errorMessage, galleryThumbUrl } from '../../utils/request'
import { createImageSelection, formatUploadTime, nextDateRangeSelection, toggleImageSelection, uploadDateKey } from '../../utils/mine-library-logic.mjs'
import { legacyFolderCount, legacyMaterialSources, mergeLegacyMaterialItems } from '../../utils/my-materials-compat.mjs'
import { loadAllGalleryItems } from '../../utils/gallery-items.mjs'
import { internalPageMixin } from '../../utils/internal-access'

export default {
  components: { TabBar },
  mixins: [internalPageMixin],
  data() {
    return { galleries: [
      { id: 'rough', name: '毛坯房图库', count: null, can_upload: true },
      { id: 'generated', name: '生图图库', count: null, can_upload: false },
      { id: 'uploads', name: '我的上传', count: null, can_upload: true },
      { id: 'works', name: '我的作品', count: null, can_upload: false }
    ], activeGallery: null, items: [], page: 1, total: 0, loading: false, loadingFolders: false, uploading: false,
    editing: false, selectedIds: createImageSelection(), legacyMode: false, legacySources: {},
    pendingReload: false,
    legacyAllItems: [], libraryNotice: '', loadError: '', itemError: '',
    dateFrom: '', dateTo: '', draftDateFrom: '', draftDateTo: '', calendarOpen: false,
    calendarYear: new Date().getFullYear(), calendarMonth: new Date().getMonth() + 1,
    weekDays: ['一', '二', '三', '四', '五', '六', '日'] }
  },
  computed: {
    calendarCells() {
      const firstDay = (new Date(this.calendarYear, this.calendarMonth - 1, 1).getDay() + 6) % 7
      const days = new Date(this.calendarYear, this.calendarMonth, 0).getDate()
      const prefix = Array.from({ length: firstDay }, () => ({ day: '', date: '' }))
      const dates = Array.from({ length: days }, (_, index) => {
        const day = index + 1
        const date = `${this.calendarYear}-${String(this.calendarMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        return { day, date }
      })
      return [...prefix, ...dates]
    }
  },
  async onShow() {
    if (await this.ensureInternalAccess()) this.loadGalleries()
  },
  onReachBottom() {
    if (this.activeGallery && this.items.length < this.total) this.loadItems(false)
  },
  methods: {
    async loadGalleries() {
      if (this.loadingFolders) return
      this.loadingFolders = true
      this.loadError = ''
      this.libraryNotice = ''
      this.legacyMode = false
      this.legacySources = {}
      this.galleries = this.galleries.map((gallery) => ({ ...gallery, count: null }))
      try {
        const data = await mpContentApi.myMaterialFolders()
        const folders = data?.folders
        const byId = new Map(Array.isArray(folders) ? folders.map((folder) => [folder.id, folder]) : [])
        const invalid = byId.size !== this.galleries.length || this.galleries.some((gallery) => {
          const count = byId.get(gallery.id)?.count
          return !Number.isInteger(count) || count < 0
        })
        if (invalid) this.loadError = '图库返回数据不完整'
        else this.galleries = this.galleries.map((gallery) => ({ ...gallery, count: byId.get(gallery.id).count }))
      } catch (error) {
        if (error?.statusCode === 404) {
          try {
            const data = await mpContentApi.galleries()
            this.legacySources = legacyMaterialSources(data.galleries)
            const root = await mpContentApi.galleryItems('private-root', 'private', { page: 1, page_size: 1 }).catch(() => null)
            const privateRoot = this.legacySources.uploads.find((item) => item.id === 'private-root')
            if (privateRoot && root && Number.isFinite(Number(root.total))) privateRoot.count = Number(root.total)
            this.legacyMode = true
            this.libraryNotice = '线上图库服务尚未更新，当前显示可读取的旧图库；共享图片需完成服务更新和历史整理。'
            this.galleries = this.galleries.map((gallery) => ({ ...gallery,
              count: gallery.id === 'works' ? gallery.count : legacyFolderCount(this.legacySources[gallery.id] || [])
            }))
          } catch (legacyError) {
            this.loadError = `图库加载失败：${errorMessage(legacyError)}`
          }
        } else {
          this.loadError = `图库加载失败：${errorMessage(error)}`
        }
      }
      if (this.legacyMode) {
        try {
          const works = await mpImageApi.works({ page: 1, page_size: 1 })
          const count = Number(works.total)
          this.galleries = this.galleries.map((gallery) => gallery.id === 'works'
            ? { ...gallery, count: Number.isInteger(count) && count >= 0 ? count : null } : gallery)
        } catch (error) {
          this.galleries = this.galleries.map((gallery) => gallery.id === 'works' ? { ...gallery, count: null } : gallery)
        }
      }
      this.loadingFolders = false
    },
    async openGallery(gallery) {
      if (this.loading || this.loadingFolders || this.loadError) return
      if (gallery.id === 'works') {
        uni.navigateTo({ url: '/pages/mine/works' })
        return
      }
      this.activeGallery = gallery
      uni.setNavigationBarTitle({ title: gallery.name })
      this.cancelEdit()
      this.dateFrom = ''
      this.dateTo = ''
      this.calendarOpen = false
      await this.loadItems(true)
    },
    async loadItems(reset = true) {
      if (!this.activeGallery) return
      if (this.loading) {
        if (reset) this.pendingReload = true
        return
      }
      if (reset) { this.page = 1; this.items = []; this.total = 0 }
      this.loading = true
      this.itemError = ''
      try {
        if (this.legacyMode) {
          if (reset) {
            const sources = this.legacySources[this.activeGallery.id] || []
            if (!sources.length) {
              this.itemError = '线上旧图库暂未提供这个分类'
              return
            }
            const responses = await Promise.allSettled(sources.map((source) => loadAllGalleryItems((params) =>
              mpContentApi.galleryItems(source.id, source.scope, params))))
            const successful = responses.filter((result) => result.status === 'fulfilled')
            if (!successful.length && responses.length) throw responses[0].reason
            this.legacyAllItems = mergeLegacyMaterialItems(successful.map((result) => result.value))
            if (successful.length !== responses.length) this.itemError = '部分图片加载失败'
          }
          const filtered = this.dateFrom && this.dateTo
            ? this.legacyAllItems.filter((item) => {
              const day = uploadDateKey(item.uploaded_at || item.created_at)
              return day >= this.dateFrom && day <= this.dateTo
            }) : this.legacyAllItems
          this.total = filtered.length
          this.items = filtered.slice(0, this.page * 30)
        } else {
          const data = await mpContentApi.myMaterialItems(this.activeGallery.id, this.page, 30, this.dateFrom, this.dateTo)
          this.items = reset ? (data.items || []) : [...this.items, ...(data.items || [])]
          this.total = data.total || 0
        }
        this.page += 1
      } catch (error) {
        this.itemError = `图片加载失败：${errorMessage(error)}`
      } finally {
        this.loading = false
        if (this.pendingReload) {
          this.pendingReload = false
          this.loadItems(true)
        }
      }
    },
    closeGallery() {
      this.activeGallery = null
      uni.setNavigationBarTitle({ title: '我的素材' })
      this.items = []
      this.itemError = ''
      this.calendarOpen = false
      this.cancelEdit()
    },
    backGallery() {
      this.closeGallery()
    },
    imageUrl(item) {
      return galleryThumbUrl(item, 720)
    },
    formatUploadTime,
    openCalendar() {
      this.draftDateFrom = this.dateFrom
      this.draftDateTo = this.dateTo
      const parts = this.dateFrom ? this.dateFrom.split('-').map(Number) : []
      const month = parts.length === 3 ? new Date(parts[0], parts[1] - 1, 1) : new Date()
      this.calendarYear = month.getFullYear()
      this.calendarMonth = month.getMonth() + 1
      this.calendarOpen = true
    },
    closeCalendar() {
      this.calendarOpen = false
    },
    moveCalendarMonth(offset) {
      const month = new Date(this.calendarYear, this.calendarMonth - 1 + offset, 1)
      this.calendarYear = month.getFullYear()
      this.calendarMonth = month.getMonth() + 1
    },
    selectCalendarDate(date) {
      const selected = nextDateRangeSelection(this.draftDateFrom, this.draftDateTo, date)
      this.draftDateFrom = selected.start
      this.draftDateTo = selected.end
    },
    applyDateRange() {
      if (!this.draftDateFrom) return
      const end = this.draftDateTo || this.draftDateFrom
      if (this.dateFrom !== this.draftDateFrom || this.dateTo !== end) {
        this.dateFrom = this.draftDateFrom
        this.dateTo = end
        this.cancelEdit()
        this.loadItems(true)
      }
      this.closeCalendar()
    },
    toggleItem(item) {
      if (!this.editing || !item.can_manage) return
      this.selectedIds = toggleImageSelection(this.selectedIds, item.id)
    },
    cancelEdit() {
      this.editing = false
      this.selectedIds = createImageSelection()
    },
    chooseImages() {
      if (!this.activeGallery || this.uploading) return
      const legacyRough = this.legacyMode && this.activeGallery.id === 'rough'
        ? (this.legacySources.rough || []).find((item) => item.scope === 'private') : null
      if (this.legacyMode && this.activeGallery.id === 'rough' && !legacyRough) {
        uni.showToast({ title: '线上服务未更新，暂不能向毛坯房图库上传', icon: 'none' })
        return
      }
      uni.chooseImage({
        count: 9,
        sizeType: ['compressed'],
        success: async ({ tempFilePaths }) => {
          this.uploading = true
          const results = []
          for (const filePath of tempFilePaths || []) {
            try {
              await mpContentApi.uploadCover(filePath, legacyRough?.id || 'uncategorized', this.activeGallery.id === 'rough' ? 'rough' : 'uploads')
              results.push(true)
            } catch (error) {
              results.push(false)
            }
          }
          this.uploading = false
          await this.loadItems(true)
          await this.loadGalleries()
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
          await this.loadItems(true)
          await this.loadGalleries()
          uni.showToast({ title: failed ? `${failed} 张删除失败` : '删除成功', icon: 'none' })
        }
      })
    }
  }
}
</script>

<style scoped>
.page { min-height: 100vh; box-sizing: border-box; padding: 16px 16px calc(148px + env(safe-area-inset-bottom)); background: #f4f1ee; }
.folder-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px 18px; }
.folder { min-width: 0; text-align: center; color: #3b312d; font-size: 14px; }
.folder-icon { position: relative; width: 90px; height: 64px; margin: 0 auto 8px; border-radius: 4px 8px 8px 8px; background: #deb44a; }
.folder-tab { position: absolute; top: -7px; left: 8px; width: 38px; height: 12px; border-radius: 5px 5px 0 0; background: #e8c661; }
.folder-count { display: block; margin-top: 3px; color: #988d84; font-size: 11px; }
.library-notice { margin-bottom: 14px; padding: 10px 12px; border-radius: 8px; background: #fff6dc; color: #755919; font-size: 12px; line-height: 1.5; }
.library-error { margin-bottom: 12px; padding: 10px 12px; border-radius: 8px; background: #fff; color: #be2d22; font-size: 12px; line-height: 1.5; }
.nested { margin-bottom: 18px; }
.back { margin: -4px 0 12px; color: #8e625a; font-size: 14px; }
.gallery-card { min-height: 62vh; padding: 14px; border-radius: 12px; background: #fff; box-shadow: 0 2px 10px rgba(54, 39, 32, .06); }
.gallery-title { display: block; margin-bottom: 12px; color: #2b2422; font-size: 17px; font-weight: 700; }
.date-filter-wrap { position: relative; z-index: 31; margin-bottom: 18px; }
.date-filter { display: flex; align-items: center; min-height: 44px; padding: 0 12px; border: 1px solid #d7dce3; border-radius: 4px; background: #fff; }
.date-label { flex-shrink: 0; margin-right: 14px; color: #98a1ad; font-size: 12px; }
.date-value { flex: 1; min-width: 0; color: #5a6574; font-size: 12px; }
.date-icon { color: #8d98a7; font-size: 18px; }
.calendar-scrim { position: fixed; z-index: 30; top: 0; right: 0; bottom: 0; left: 0; background: rgba(0, 0, 0, .12); }
.calendar-panel { position: absolute; top: calc(100% + 6px); right: 0; left: 0; padding: 14px; border: 1px solid #e4e7eb; border-radius: 8px; background: #fff; box-shadow: 0 8px 22px rgba(0, 0, 0, .14); }
.calendar-title { margin-bottom: 10px; color: #333; font-size: 14px; font-weight: 600; }
.calendar-selection { display: flex; justify-content: space-between; margin-bottom: 12px; padding: 9px; border: 1px solid #e4e7eb; color: #5a6574; font-size: 12px; }
.calendar-month { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; color: #333; font-size: 13px; }
.month-arrow { width: 30px; text-align: center; font-size: 24px; }
.calendar-days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); text-align: center; }
.weekday, .calendar-day { height: 34px; line-height: 34px; font-size: 12px; }
.weekday { color: #929aa4; }
.calendar-day { color: #3b424b; }
.calendar-day.in-range { background: #fbe9e7; }
.calendar-day.chosen { border-radius: 50%; color: #fff; background: #be2d22; }
.calendar-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px; }
.calendar-button { width: 76px; height: 34px; margin: 0; border: 1px solid #be2d22; border-radius: 5px; color: #be2d22; background: #fff; font-size: 12px; line-height: 32px; }
.calendar-button.confirm { color: #fff; background: #be2d22; }
.calendar-button.confirm[disabled] { opacity: .45; }
.calendar-button::after { border: none; }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.image-card { position: relative; }
.image { width: 100%; height: 188px; border-radius: 9px; background: #e5ddd7; }
.image-detail { display: block; margin-top: 4px; overflow: hidden; color: #929ca7; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.check { position: absolute; top: 9px; right: 9px; width: 25px; height: 25px; box-sizing: border-box; border: 2px solid #fff; border-radius: 4px; color: #fff; text-align: center; line-height: 21px; background: rgba(0, 0, 0, .2); }
.check.selected { border-color: #be2d22; background: #be2d22; }
.empty { display: block; padding-top: 72px; text-align: center; color: #928781; }
.actions { position: fixed; z-index: 21; right: 12px; bottom: calc(66px + env(safe-area-inset-bottom)); left: 12px; display: flex; gap: 10px; padding: 10px; background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(54, 39, 32, .08); }
.button { flex: 1; height: 40px; line-height: 40px; border-radius: 7px; font-size: 14px; }
.ghost { color: #be2d22; background: #fff; border: 1px solid #be2d22; }
.primary, .danger { color: #fff; background: #be2d22; }
.danger[disabled] { opacity: .45; }
</style>
