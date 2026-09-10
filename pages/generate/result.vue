<template>
  <view class="page">
    <view class="card">
      <text class="label">爆款标题</text>
      <text class="title">{{ artifact.title || '生成中或暂无标题' }}</text>
    </view>
    <view class="card">
      <text class="label">正文</text>
      <text class="body">{{ artifact.body }}</text>
    </view>
    <view class="card">
      <text class="label">话题标签</text>
      <text class="tags">{{ tagsText }}</text>
    </view>

    <view v-if="showCover" class="cover-wrap">
      <image class="cover" :src="coverUrl" mode="aspectFill" />
      <view class="save-btn" @click="saveCover">保存照片</view>
    </view>

    <view class="copy-bar">
      <button class="ghost" @click="copy(artifact.title, '标题已复制')">复制标题</button>
      <button class="ghost" @click="copy(artifact.body, '正文已复制')">复制正文</button>
      <button class="ghost" @click="copy(tagsText, '标签已复制')">复制标签</button>
    </view>
  </view>
</template>

<script>
import { mpContentApi } from '../../apis/mp'
import { errorMessage, mediaUrl } from '../../utils/request'

export default {
  data() {
    return {
      taskId: '',
      serviceEntry: '',
      artifact: {}
    }
  },
  computed: {
    tagsText() {
      const topics = this.artifact.topics || []
      return topics.map((item) => (String(item).startsWith('#') ? item : `#${item}`)).join(' ')
    },
    coverUrl() {
      return mediaUrl(this.artifact.cover_file_url)
    },
    showCover() {
      return this.serviceEntry === '装修家居' && Boolean(this.coverUrl)
    }
  },
  onLoad(query) {
    this.taskId = query.task_id
    this.serviceEntry = decodeURIComponent(query.service_entry || '')
    this.load()
  },
  methods: {
    async load() {
      try {
        const data = await mpContentApi.getArtifact(this.taskId)
        this.artifact = data.artifact || {}
        this.serviceEntry =
          this.serviceEntry ||
          this.artifact.service_entry ||
          (data.task && data.task.service_entry) ||
          ''
        if (!this.serviceEntry) {
          const taskData = await mpContentApi.getTask(this.taskId)
          const values = (taskData.task && taskData.task.brief && taskData.task.brief.form_values) || {}
          this.serviceEntry = values.mp_service_entry || (taskData.task && taskData.task.service_entry) || ''
        }
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      }
    },
    copy(text, title) {
      if (!text) {
        uni.showToast({ title: '暂无可复制内容', icon: 'none' })
        return
      }
      uni.setClipboardData({
        data: String(text),
        success: () => uni.showToast({ title, icon: 'none' })
      })
    },
    saveCover() {
      if (!this.coverUrl) return
      uni.downloadFile({
        url: this.coverUrl,
        success: (res) => {
          uni.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => uni.showToast({ title: '已保存到相册', icon: 'none' }),
            fail: () => uni.showToast({ title: '保存失败，请检查相册权限', icon: 'none' })
          })
        }
      })
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f4f1ee;
  padding: 16px 16px calc(24px + env(safe-area-inset-bottom));
}
.cover-wrap {
  position: relative;
  width: 100%;
  padding-top: 133.33%;
  margin-bottom: 12px;
  overflow: hidden;
  border-radius: 14px;
  background: #ddd;
}
.cover {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.card {
  background: #fff;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 12px;
}
.label {
  display: block;
  color: #8a817c;
  font-size: 12px;
  margin-bottom: 8px;
}
.title {
  display: block;
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 10px;
}
.body,
.tags {
  display: block;
  line-height: 1.7;
  color: #2b2422;
  margin-bottom: 10px;
  white-space: pre-wrap;
}
.ghost {
  flex: 1;
  height: 40px;
  line-height: 40px;
  margin: 0;
  padding: 0;
  border-radius: 10px;
  font-size: 14px;
  background: #f7f4f2;
  color: #BE2D22;
}
.ghost::after {
  border: none;
}
.save-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  height: 32px;
  padding: 0 12px;
  border-radius: 16px;
  background: rgba(190, 45, 34, 0.92);
  color: #fff;
  font-size: 13px;
  line-height: 32px;
}
.copy-bar {
  display: flex;
  gap: 8px;
}
</style>
