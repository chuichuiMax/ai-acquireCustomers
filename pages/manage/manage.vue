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
      <image v-if="item.cover_file_url" class="thumb" :src="mediaUrl(item.cover_file_url)" mode="aspectFill" />
      <view class="meta">
        <text v-if="item.content_code" class="code">{{ item.content_code }}</text>
        <text v-if="item.title" class="title">{{ item.title }}</text>
        <text class="row">模块：{{ item.service_entry || '-' }}</text>
        <text class="row">类型：{{ item.content_type_name || '-' }}</text>
        <text class="row">公式：{{ item.formula || '-' }}</text>
        <text class="row">状态：{{ statusLabel(item.status) }} · {{ item.created_at || '' }}</text>
        <view class="actions">
          <text class="action" @click="open(item)">查看</text>
        </view>
      </view>
    </view>
    <tab-bar current="manage" />
  </view>
</template>

<script>
import TabBar from '../../components/tab-bar.vue'
import { mpContentApi } from '../../apis/mp'
import { errorMessage, mediaUrl } from '../../utils/request'

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
    mediaUrl,
    statusLabel(status) {
      const map = {
        brief_ready: '已锁定',
        queued: '排队中',
        waiting_human: '待确认',
        waiting_external: '生成封面',
        completed: '已完成',
        failed: '失败'
      }
      return map[status] || status || '-'
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
      uni.navigateTo({ url: `/pages/generate/result?task_id=${item.task_id}` })
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
  background: #BE2D22;
  color: #fff;
}
.empty {
  text-align: center;
  color: #8a817c;
  padding: 40px 0;
}
.card {
  display: flex;
  gap: 10px;
  background: #fff;
  border-radius: 14px;
  padding: 12px;
  margin-bottom: 10px;
}
.thumb {
  width: 72px;
  height: 96px;
  border-radius: 8px;
  background: #eee;
  flex-shrink: 0;
}
.meta {
  flex: 1;
}
.code {
  display: block;
  color: #BE2D22;
  font-size: 12px;
}
.title {
  display: block;
  margin: 4px 0;
  font-weight: 600;
}
.row {
  display: block;
  color: #8a817c;
  font-size: 12px;
  line-height: 1.5;
}
.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}
.action {
  padding: 8px 4px;
  color: #BE2D22;
  font-size: 15px;
  line-height: 22px;
}
</style>
