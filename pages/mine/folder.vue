<template>
  <view v-if="internalAccessGranted" class="page">
    <view class="gallery-card">
      <view v-if="scope === 'enterprise' && pendingUploadCount" class="library-notice" @click="refreshUploads">{{ pendingUploadCount }} 张图片正在入库，完成后显示，点击刷新</view>
      <view v-if="scope === 'enterprise' && uploadFailures.length" class="library-error">{{ uploadFailures.length }} 张图片入库失败，请重新上传</view>
      <view v-if="calendarOpen" class="calendar-scrim" @click="closeCalendar" />
      <view v-if="!isGeneratedGallery" class="date-filter-wrap">
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
            <view
              v-for="(cell, index) in calendarCells"
              :key="index"
              class="calendar-day"
              :class="{
                chosen: cell.date && (cell.date === draftDateFrom || cell.date === draftDateTo),
                'in-range': cell.date && draftDateTo && cell.date > draftDateFrom && cell.date < draftDateTo
              }"
              @click="cell.date && selectCalendarDate(cell.date)"
            >{{ cell.day }}</view>
          </view>
          <view class="calendar-actions">
            <button class="calendar-button confirm" :disabled="!draftDateFrom" @click="applyDateRange">确定</button>
          </view>
        </view>
      </view>
      <view v-if="itemError" class="library-error" @click="loadItems(true)">{{ itemError }}，点击重试</view>
      <view v-if="loading && !items.length" class="empty">正在加载图片…</view>
      <view v-else-if="!itemError && !items.length" class="empty">{{ pendingUploadCount ? '图片正在入库，请稍候' : (dateFrom ? '所选日期内暂无图片' : '该文件夹暂无图片') }}</view>
      <view v-else-if="isGeneratedGallery" class="grid">
        <view v-for="item in items" :key="item.id" class="work-card">
          <view class="work-thumb" @click="onGeneratedThumbClick(item)">
            <image class="work-image" :src="imageUrl(item)" mode="aspectFill" lazy-load />
            <view v-if="editing && canSelectItem(item)" class="check" :class="{ selected: selectedIds.includes(item.id) }">{{ selectedIds.includes(item.id) ? '✓' : '' }}</view>
          </view>
          <view class="work-meta">
            <text class="created-at">生成时间：{{ formatUploadTime(item.uploaded_at || item.created_at) }}</text>
            <button class="download-btn" :loading="downloadingId === item.id" :disabled="!!downloadingId" @click="downloadItem(item)">下载</button>
          </view>
        </view>
      </view>
      <view v-else class="grid">
        <view v-for="item in items" :key="item.id" class="image-card" @click="toggleItem(item)">
          <image class="image" :src="imageUrl(item)" mode="aspectFill" lazy-load />
          <view v-if="editing && canSelectItem(item)" class="check" :class="{ selected: selectedIds.includes(item.id) }">{{ selectedIds.includes(item.id) ? '✓' : '' }}</view>
          <text v-if="scope === 'enterprise'" class="image-detail">文件名称：{{ item.file_name || item.name || '-' }}</text>
          <text class="image-detail">上传时间：{{ formatUploadTime(item.uploaded_at || item.created_at) }}</text>
        </view>
      </view>
    </view>
    <view class="actions" :style="actionBarStyle">
      <template v-if="!editing">
        <button v-if="canUpload && !isGeneratedGallery" class="button ghost" :loading="uploading" @click="chooseImages">上传</button>
        <button class="button ghost" @click="editing = true">编辑</button>
      </template>
      <template v-else>
        <button class="button danger" :disabled="!selectedIds.length" @click="removeSelected">删除</button>
        <button class="button ghost" @click="cancelEdit">取消</button>
      </template>
    </view>
    <tab-bar current="mine" />
  </view>
</template>

<script>
import TabBar from '../../components/tab-bar.vue'
import { mpContentApi, mpMeApi } from '../../apis/mp'
import { errorMessage, galleryThumbUrl, mediaUrl, saveImageUrlToPhotosAlbum } from '../../utils/request'
import { createImageSelection, formatUploadTime, nextDateRangeSelection, toggleImageSelection } from '../../utils/mine-library-logic.mjs'
import { canSelectMaterialItemForDelete, filterEnterpriseRoughGalleries } from '../../utils/enterprise-materials.mjs'
import { internalPageMixin } from '../../utils/internal-access'

export default {
  components: { TabBar },
  mixins: [internalPageMixin],
  data() {
    return {
      scope: 'private',
      folderId: '',
      categoryId: '',
      currentUid: '',
      galleryMeta: null,
      items: [],
      page: 1,
      total: 0,
      loading: false,
      uploading: false,
      editing: false,
      selectedIds: createImageSelection(),
      pendingReload: false,
      safeBottom: 0,
      itemError: '',
      dateFrom: '',
      dateTo: '',
      draftDateFrom: '',
      draftDateTo: '',
      calendarOpen: false,
      calendarYear: new Date().getFullYear(),
      calendarMonth: new Date().getMonth() + 1,
      weekDays: ['一', '二', '三', '四', '五', '六', '日'],
      downloadingId: '',
      pageVisible: false,
      pendingUploadCount: 0,
      uploadFailures: [],
      uploadTimer: null,
      uploadPolls: 0
    }
  },
  computed: {
    isGeneratedGallery() {
      return this.scope !== 'enterprise' && this.folderId === 'generated'
    },
    actionBarStyle() {
      const bottom = this.isGeneratedGallery
        ? `calc(66px + env(safe-area-inset-bottom))`
        : `${53 + this.safeBottom}px`
      return { bottom }
    },
    canUpload() {
      return Boolean(this.galleryMeta && this.galleryMeta.can_upload)
    },
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
  created() {
    const info = uni.getSystemInfoSync()
    this.safeBottom = info.safeAreaInsets ? info.safeAreaInsets.bottom : 0
  },
  async onLoad(options) {
    this.scope = options.scope === 'enterprise' ? 'enterprise' : 'private'
    this.folderId = String(options.folder || '').trim()
    this.categoryId = String(options.category || '').trim()
    const title = options.name ? decodeURIComponent(options.name) : ''
    if (title) uni.setNavigationBarTitle({ title })
    if (!(await this.ensureInternalAccess())) return
    await this.loadCurrentUid()
    const missingTarget = this.scope === 'enterprise' ? !this.categoryId : !this.folderId
    if (missingTarget) {
      uni.showToast({ title: '图库不存在', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 300)
      return
    }
    await this.loadGalleryMeta()
    await this.loadItems(true)
  },
  onReachBottom() {
    if (this.items.length < this.total) this.loadItems(false)
  },
  onShow() {
    this.pageVisible = true
    if (this.scope === 'enterprise' && this.galleryMeta) this.loadItems(true)
  },
  onHide() {
    this.pageVisible = false
    this.stopUploadWatch()
  },
  onUnload() {
    this.pageVisible = false
    this.stopUploadWatch()
  },
  methods: {
    async loadCurrentUid() {
      try {
        const data = await mpMeApi.get()
        this.currentUid = String(
          data.user_uid || (data.user && data.user.uid) || data.uid || ''
        ).trim()
      } catch (error) {
        this.currentUid = ''
      }
    },
    canSelectItem(item) {
      return canSelectMaterialItemForDelete(item, { scope: this.scope, currentUid: this.currentUid })
    },
    async loadGalleryMeta() {
      try {
        if (this.scope === 'enterprise') {
          const data = await mpContentApi.enterpriseRoughFolders()
          const gallery = filterEnterpriseRoughGalleries(data.galleries || []).find((row) => row.id === this.categoryId)
          if (!gallery) {
            this.itemError = '图库不存在或已删除'
            return
          }
          this.galleryMeta = { ...gallery, gallery_id: gallery.id }
        } else {
          const data = await mpContentApi.myMaterialFolders()
          const gallery = (data.folders || []).find((folder) => folder.id === this.folderId)
          if (!gallery) {
            this.itemError = '图库不存在或已删除'
            return
          }
          this.galleryMeta = gallery
        }
        uni.setNavigationBarTitle({ title: this.galleryMeta.name })
      } catch (error) {
        this.itemError = `图库加载失败：${errorMessage(error)}`
      }
    },
    async loadItems(reset = true) {
      const hasTarget = this.scope === 'enterprise' ? this.categoryId : this.folderId
      if (!hasTarget || this.itemError === '图库不存在或已删除') return
      if (this.loading) {
        if (reset) this.pendingReload = true
        return
      }
      if (reset) {
        this.page = 1
        this.items = []
        this.total = 0
      }
      this.loading = true
      this.itemError = ''
      try {
        let data
        if (this.scope === 'enterprise') {
          data = await mpContentApi.galleryItems(this.categoryId, 'enterprise', {
            page: this.page, page_size: 30, date_from: this.dateFrom, date_to: this.dateTo
          })
          this.pendingUploadCount = data.pending_upload_count || 0
          this.uploadFailures = data.upload_failures || []
        } else {
          data = await mpContentApi.myMaterialItems(this.folderId, this.page, 30, this.dateFrom, this.dateTo)
          if (this.galleryMeta && data.gallery_id) {
            this.galleryMeta = { ...this.galleryMeta, gallery_id: data.gallery_id }
          }
        }
        this.items = reset ? (data.items || []) : [...this.items, ...(data.items || [])]
        this.total = data.total || 0
        this.page += 1
      } catch (error) {
        this.itemError = `图片加载失败：${errorMessage(error)}`
      } finally {
        this.loading = false
        if (this.scope === 'enterprise') {
          this.stopUploadWatch()
          if (this.pageVisible && this.pendingUploadCount && !this.itemError && this.uploadPolls < 10) {
            this.uploadTimer = setTimeout(async () => {
              this.uploadPolls += 1
              await this.loadGalleryMeta()
              await this.loadItems(true)
            }, 3000)
          }
        }
        if (this.pendingReload) {
          this.pendingReload = false
          this.loadItems(true)
        }
      }
    },
    stopUploadWatch() {
      if (this.uploadTimer) clearTimeout(this.uploadTimer)
      this.uploadTimer = null
    },
    async refreshUploads() {
      this.uploadPolls = 0
      await this.loadGalleryMeta()
      await this.loadItems(true)
    },
    imageUrl(item) {
      return galleryThumbUrl(item, 720)
    },
    itemFileUrl(item) {
      return mediaUrl(item.file_url || item.thumbnail_file_url)
    },
    formatUploadTime,
    onGeneratedThumbClick(item) {
      if (this.editing) {
        if (this.canSelectItem(item)) {
          this.selectedIds = toggleImageSelection(this.selectedIds, item.id)
        }
        return
      }
      const url = this.itemFileUrl(item)
      if (url) uni.previewImage({ current: url, urls: [url] })
    },
    async downloadItem(item) {
      const url = this.itemFileUrl(item)
      if (!url || this.downloadingId) return
      this.downloadingId = item.id
      try {
        await saveImageUrlToPhotosAlbum(url)
      } catch (error) {
        /* saveImageUrlToPhotosAlbum 已提示 */
      } finally {
        this.downloadingId = ''
      }
    },
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
      if (this.scope === 'enterprise' && !this.editing) {
        const current = this.itemFileUrl(item)
        const urls = this.items.map((image) => this.itemFileUrl(image)).filter(Boolean)
        if (current && urls.length) uni.previewImage({ current, urls })
        return
      }
      if (!this.editing || !this.canSelectItem(item)) return
      this.selectedIds = toggleImageSelection(this.selectedIds, item.id)
    },
    cancelEdit() {
      this.editing = false
      this.selectedIds = createImageSelection()
    },
    chooseImages() {
      if (!this.galleryMeta || this.uploading || (this.scope === 'enterprise' && !this.galleryMeta.can_upload)) return
      uni.chooseImage({
        count: 9,
        sizeType: ['compressed'],
        success: async ({ tempFilePaths }) => {
          this.uploading = true
          const results = []
          for (const filePath of tempFilePaths || []) {
            try {
              const category = this.scope === 'enterprise'
                ? this.categoryId
                : (this.galleryMeta.gallery_id || 'uncategorized')
              const folder = this.scope === 'enterprise' || this.folderId === 'rough' ? 'rough' : 'uploads'
              await mpContentApi.uploadCover(filePath, category, folder, this.scope)
              results.push(true)
            } catch (error) {
              results.push(false)
              if (results.length === 1) {
                uni.showToast({ title: errorMessage(error), icon: 'none', duration: 3000 })
              }
            }
          }
          this.uploading = false
          this.uploadPolls = 0
          await this.loadItems(true)
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
          const deletableIds = this.selectedIds.filter((id) => {
            const item = this.items.find((row) => row.id === id)
            return item && this.canSelectItem(item)
          })
          if (!deletableIds.length) {
            uni.showToast({ title: '只能删除本人上传的图片', icon: 'none' })
            return
          }
          const results = await Promise.allSettled(deletableIds.map((id) => mpContentApi.deleteGalleryItem(id)))
          const failed = results.filter((result) => result.status === 'rejected').length
          this.cancelEdit()
          await this.loadItems(true)
          uni.showToast({ title: failed ? `${failed} 张删除失败` : '删除成功', icon: 'none' })
        }
      })
    }
  }
}
</script>

<style scoped>
.page { min-height: 100vh; box-sizing: border-box; padding: 16px 16px calc(148px + env(safe-area-inset-bottom)); background: #f4f1ee; }
.gallery-card { min-height: 62vh; padding: 14px; border-radius: 12px; background: #fff; box-shadow: 0 2px 10px rgba(54, 39, 32, .06); }
.library-error { margin-bottom: 12px; padding: 10px 12px; border-radius: 8px; background: #fff6f5; color: #be2d22; font-size: 12px; line-height: 1.5; }
.library-notice { margin-bottom: 12px; color: #be2d22; font-size: 12px; line-height: 1.5; }
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
.work-card { min-width: 0; }
.work-thumb { position: relative; }
.work-image { width: 100%; height: 218px; border-radius: 10px; background: #e5ddd7; }
.work-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 6px; }
.created-at { flex: 1; min-width: 0; overflow: hidden; color: #908680; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.download-btn { flex-shrink: 0; height: 28px; margin: 0; padding: 0 12px; border: none; border-radius: 4px; color: #fff; background: #2f80ed; font-size: 12px; line-height: 28px; }
.download-btn::after { border: none; }
.download-btn[disabled] { opacity: .55; }
.empty { display: block; padding-top: 72px; text-align: center; color: #928781; }
.actions { position: fixed; z-index: 21; right: 12px; left: 12px; display: flex; gap: 10px; padding: 10px; background: #fff; border-radius: 12px 12px 0 0; box-shadow: 0 2px 12px rgba(54, 39, 32, .08); }
.button { flex: 1; height: 40px; line-height: 40px; border-radius: 7px; font-size: 14px; }
.ghost { color: #be2d22; background: #fff; border: 1px solid #be2d22; }
.danger { color: #fff; background: #be2d22; border: 1px solid #be2d22; }
.danger[disabled] { opacity: .45; }
.button::after { border: none; }
</style>
