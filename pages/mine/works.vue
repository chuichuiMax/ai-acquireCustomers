<template>
  <view v-if="internalAccessGranted" class="page">
    <view v-if="loading && !items.length" class="empty">正在加载作品…</view>
    <view v-else-if="!items.length" class="empty">还没有生成作品</view>
    <view v-else class="grid">
      <view v-for="item in items" :key="item.id" class="work-card" @click="toggleItem(item.id)">
        <image class="work-image" :src="imageUrl(item)" mode="aspectFill" lazy-load />
        <view v-if="editing" class="check" :class="{ selected: selectedIds.includes(item.id) }">{{ selectedIds.includes(item.id) ? '✓' : '' }}</view>
        <text class="created-at">生成时间：{{ displayTime(item.created_at) }}</text>
      </view>
    </view>
    <view class="actions">
      <button v-if="!editing" class="button ghost" @click="editing = true">编辑</button>
      <template v-else>
        <button class="button danger" :disabled="!selectedIds.length" @click="removeSelected">删除{{ selectedIds.length ? ` (${selectedIds.length})` : '' }}</button>
        <button class="button ghost" @click="cancelEdit">取消</button>
      </template>
    </view>
    <tab-bar current="mine" />
  </view>
</template>

<script>
import TabBar from '../../components/tab-bar.vue'
import { mpImageApi } from '../../apis/mp'
import { errorMessage, mediaUrl } from '../../utils/request'
import { createImageSelection, toggleImageSelection } from '../../utils/mine-library-logic.mjs'
import { internalPageMixin } from '../../utils/internal-access'

export default {
  components: { TabBar },
  mixins: [internalPageMixin],
  data() {
    return { items: [], page: 1, total: 0, loading: false, finished: false, editing: false, selectedIds: createImageSelection() }
  },
  async onShow() {
    if (await this.ensureInternalAccess()) this.load(true)
  },
  onReachBottom() {
    this.load(false)
  },
  methods: {
    async load(reset) {
      if (this.loading || (!reset && this.finished)) return
      if (reset) {
        this.page = 1
        this.finished = false
      }
      this.loading = true
      try {
        const data = await mpImageApi.works({ page: this.page, page_size: 24 })
        const next = data.items || []
        this.items = reset ? next : [...this.items, ...next]
        this.total = data.total || 0
        this.finished = this.items.length >= this.total || !next.length
        this.page += 1
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    imageUrl(item) {
      return mediaUrl(item.thumbnail_file_url || item.file_url)
    },
    displayTime(value) {
      return value ? String(value).replace('T', ' ').slice(0, 16) : '-'
    },
    toggleItem(id) {
      if (!this.editing) return
      this.selectedIds = toggleImageSelection(this.selectedIds, id)
    },
    cancelEdit() {
      this.editing = false
      this.selectedIds = createImageSelection()
    },
    removeSelected() {
      if (!this.selectedIds.length) return
      uni.showModal({
        title: '移除作品',
        content: `确定从“我的作品”中移除 ${this.selectedIds.length} 张图片吗？生成记录将保留。`,
        success: async ({ confirm }) => {
          if (!confirm) return
          const results = await Promise.allSettled(this.selectedIds.map((id) => mpImageApi.hideWork(id)))
          const failed = results.filter((result) => result.status === 'rejected')
          this.cancelEdit()
          await this.load(true)
          uni.showToast({ title: failed.length ? `${failed.length} 张移除失败` : '已从我的作品移除', icon: 'none' })
        }
      })
    }
  }
}
</script>

<style scoped>
.page { min-height: 100vh; box-sizing: border-box; padding: 16px 12px 148px; background: #f4f1ee; }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.work-card { position: relative; min-width: 0; }
.work-image { width: 100%; height: 218px; border-radius: 10px; background: #e5ddd7; }
.created-at { display: block; margin-top: 5px; color: #908680; font-size: 11px; }
.check { position: absolute; top: 9px; right: 9px; width: 25px; height: 25px; box-sizing: border-box; border: 2px solid #fff; border-radius: 4px; color: #fff; text-align: center; line-height: 21px; background: rgba(0, 0, 0, .2); }
.check.selected { border-color: #be2d22; background: #be2d22; }
.empty { padding-top: 90px; text-align: center; color: #928781; }
.actions { position: fixed; z-index: 21; right: 12px; bottom: 66px; left: 12px; display: flex; gap: 10px; padding: 10px; background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(54, 39, 32, .08); }
.button { flex: 1; height: 40px; line-height: 40px; border-radius: 7px; font-size: 14px; }
.ghost { color: #be2d22; background: #fff; border: 1px solid #be2d22; }
.danger { color: #fff; background: #be2d22; }
.danger[disabled] { opacity: .45; }
</style>
