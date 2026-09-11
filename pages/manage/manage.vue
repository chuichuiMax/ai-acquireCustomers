<template>
  <view class="page">
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
    <view v-for="item in items" :key="item.task_id" class="card">
      <view class="row">
        <text class="label">内容编码</text>
        <text class="value">{{ item.content_code || '-' }}</text>
      </view>
      <view class="row">
        <text class="label">模块类型</text>
        <text class="value">{{ item.service_entry || '-' }}</text>
      </view>
      <template v-if="item.service_entry === '装修家居'">
        <view class="row">
          <text class="label">创作手法</text>
          <text class="value">{{ item.creation_methods || item.method || '-' }}</text>
        </view>
        <view class="row">
          <text class="label">爆款标题</text>
          <text class="value">{{ item.viral_title_formula || '-' }}</text>
        </view>
        <view class="row">
          <text class="label">内容公式</text>
          <text class="value">{{ item.content_formula || item.formula || '-' }}</text>
        </view>
      </template>
      <view class="row">
        <text class="label">状态</text>
        <text class="value">{{ item.status_label || statusLabel(item.status) }}</text>
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
      <view class="view-btn" @click="open(item)">查看</view>
    </view>
    <tab-bar current="manage" />
  </view>
</template>

<script>
import TabBar from '../../components/tab-bar.vue'
import { mpContentApi } from '../../apis/mp'
import { errorMessage, thumbUrl } from '../../utils/request'

export default {
  components: { TabBar },
  data() {
    return {
      serviceEntry: '',
      filters: [
        { value: '', label: '全部' },
        { value: '装修家居', label: '装修家居' },
        { value: '好评笔记', label: '好评笔记' }
      ],
      items: []
    }
  },
  onShow() {
    this.load()
  },
  methods: {
    thumbUrl,
    statusLabel(status) {
      if (status === 'reviewed' || status === 'completed') return '已发布'
      return '未发布'
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
        this.items = (data.items || []).filter((item) => item.content_code)
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      }
    },
    open(item) {
      uni.navigateTo({
        url: `/pages/generate/result?task_id=${item.task_id}&service_entry=${encodeURIComponent(item.service_entry || '')}`
      })
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
  color: #2b2422;
  font-size: 13px;
  line-height: 20px;
  word-break: break-all;
}
.value.muted {
  color: #b8b0aa;
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
.view-btn {
  margin-top: 4px;
  height: 40px;
  line-height: 40px;
  text-align: center;
  border-radius: 8px;
  background: #be2d22;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}
</style>
