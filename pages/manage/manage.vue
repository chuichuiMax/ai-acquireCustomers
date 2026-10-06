<template>
  <view v-if="internalAccessGranted" class="page">
    <view class="filters">
      <view
        v-for="item in filters"
        :key="item.value"
        class="filter"
        :class="{ active: serviceEntry === item.value }"
        @click="changeFilter(item.value)"
      >
        {{ item.label }}
      </view>
    </view>
    <view v-if="!items.length" class="empty">暂无内容</view>
    <view v-for="item in items" :key="item.task_id || item.id" class="card">
      <view class="row">
        <text class="label">内容编码</text>
        <text class="value">{{ item.content_code || '-' }}</text>
      </view>
      <view class="row">
        <text class="label">模块类型</text>
        <text class="value">{{ item.service_entry || '-' }}</text>
      </view>
      <view class="row">
        <text class="label">爆款标题</text>
        <text class="value ellipsis">{{ listTitle(item) }}</text>
      </view>
      <view class="row">
        <text class="label">正文</text>
        <text class="value ellipsis">{{ listBody(item) }}</text>
      </view>
      <view class="row">
        <text class="label">状态</text>
        <text class="value" :class="statusClass(item)">{{ displayStatus(item) }}</text>
      </view>
      <view class="row">
        <text class="label">创建时间</text>
        <text class="value">{{ item.created_at_display || formatCreatedAt(item.created_at) }}</text>
      </view>
      <view v-if="item.service_entry === '装修家居'" class="row cover-row">
        <text class="label">封面</text>
        <image
          v-if="item.cover_file_url"
          class="cover"
          :src="thumbUrl(item.cover_file_url, 400)"
          mode="aspectFill"
          lazy-load
        />
        <text v-else class="value muted">暂无封面</text>
      </view>
      <view class="card-actions">
        <view v-if="canView(item)" class="action-btn ghost" @click="open(item)">查看</view>
        <view
          v-if="canRegenerate(item)"
          class="action-btn"
          :class="{ disabled: regeneratingId === taskIdOf(item) }"
          @click="regenerate(item)"
        >再次生成</view>
      </view>
    </view>
    <tab-bar current="manage" />
  </view>
</template>

<script>
import TabBar from '../../components/tab-bar.vue'
import { mpContentApi } from '../../apis/mp'
import { errorMessage, thumbUrl } from '../../utils/request'
import { internalPageMixin } from '../../utils/internal-access'
import { saveActiveGeneration } from '../../utils/active-generation.mjs'
import { resolveProductionStatusLabel } from '../../utils/manage-production-status.mjs'

export default {
  components: { TabBar },
  mixins: [internalPageMixin],
  data() {
    return {
      serviceEntry: '',
      regeneratingId: '',
      filters: [
        { value: '', label: '全部' },
        { value: '装修家居', label: '装修家居' },
        { value: '好评笔记', label: '好评笔记' }
      ],
      items: []
    }
  },
  async onShow() {
    if (!(await this.ensureInternalAccess())) return
    this.load()
  },
  methods: {
    thumbUrl,
    statusKey(item) {
      return String((item && item.status) || '').toLowerCase()
    },
    listTitle(item) {
      const text = String((item && item.title) || '')
        .replace(/\s+/g, ' ')
        .trim()
      return text || '-'
    },
    listBody(item) {
      const text = String((item && item.body) || '')
        .replace(/\s+/g, ' ')
        .trim()
      return text || '-'
    },
    displayStatus(item) {
      return resolveProductionStatusLabel(this.statusKey(item))
    },
    statusClass(item) {
      const label = this.displayStatus(item)
      if (label === '失败') return 'is-failed'
      if (label === '已审核') return 'is-reviewed'
      return 'is-queued'
    },
    canRegenerate(item) {
      const label = this.displayStatus(item)
      return label === '失败' || label === '排队中'
    },
    taskIdOf(item) {
      return (item && (item.task_id || item.id)) || ''
    },
    canView(item) {
      return this.displayStatus(item) === '已审核' || Boolean(item && item.content_code)
    },
    formatCreatedAt(value) {
      if (!value) return '-'
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return String(value)
      const pad = (n) => String(n).padStart(2, '0')
      return (
        `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
      )
    },
    changeFilter(value) {
      this.serviceEntry = value
      this.load()
    },
    async load() {
      try {
        const data = await mpContentApi.list({ service_entry: this.serviceEntry || undefined, page: 1, page_size: 50 })
        this.items = data.items || []
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      }
    },
    open(item) {
      const taskId = this.taskIdOf(item)
      if (!taskId) {
        uni.showToast({ title: '缺少任务编号', icon: 'none' })
        return
      }
      uni.navigateTo({
        url: `/pages/generate/result?task_id=${taskId}&service_entry=${encodeURIComponent(item.service_entry || '')}`
      })
    },
    regenerate(item) {
      const taskId = this.taskIdOf(item)
      if (!taskId || this.regeneratingId) return
      this.regeneratingId = taskId
      saveActiveGeneration(taskId, item.service_entry || '')
      uni.navigateTo({
        url: `/pages/generate/locked?task_id=${taskId}&service_entry=${encodeURIComponent(
          item.service_entry || ''
        )}&from=manage`
      })
      this.regeneratingId = ''
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f4f1ee;
  padding: 16px 16px 90px;
}
.filters {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.filter {
  padding: 6px 12px;
  border-radius: 14px;
  background: #fff;
  color: #8a817c;
  font-size: 13px;
}
.filter.active {
  background: #be2d22;
  color: #fff;
}
.empty {
  text-align: center;
  color: #8a817c;
  padding: 40px 0;
}
.card {
  background: #fff;
  border-radius: 14px;
  padding: 14px 14px 12px;
  margin-bottom: 12px;
}
.row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 10px;
}
.label {
  width: 72px;
  flex-shrink: 0;
  color: #8a817c;
  font-size: 13px;
  line-height: 20px;
}
.value {
  flex: 1;
  min-width: 0;
  color: #2b2422;
  font-size: 13px;
  line-height: 20px;
  word-break: break-all;
}
.value.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: normal;
}
.value.muted {
  color: #b8b0aa;
}
.value.is-failed {
  color: #be2d22;
}
.value.is-queued {
  color: #2b6cb0;
}
.value.is-waiting {
  color: #b45309;
}
.value.is-reviewed {
  color: #2b6cb0;
}
.cover-row {
  align-items: center;
}
.cover {
  width: 72px;
  height: 96px;
  border-radius: 8px;
  background: #eee;
}
.card-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
.action-btn {
  flex: 1;
  height: 40px;
  line-height: 40px;
  text-align: center;
  border-radius: 20px;
  background: #be2d22;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}
.action-btn.ghost {
  background: #f7f4f2;
  color: #be2d22;
}
.action-btn.disabled {
  opacity: 0.6;
}
</style>
