<template>
  <view class="page">
    <image v-if="coverUrl" class="cover" :src="coverUrl" mode="aspectFill" />
    <view class="card">
      <text class="label">爆款标题</text>
      <text class="title">{{ artifact.title || '生成中或暂无标题' }}</text>
      <button class="ghost" @click="copy(artifact.title, '标题已复制')">复制标题</button>
    </view>
    <view class="card">
      <text class="label">正文</text>
      <text class="body">{{ artifact.body }}</text>
      <button class="ghost" @click="copy(artifact.body, '正文已复制')">复制正文</button>
    </view>
    <view class="card">
      <text class="label">话题标签</text>
      <text class="tags">{{ tagsText }}</text>
      <button class="ghost" @click="copy(tagsText, '标签已复制')">复制标签</button>
    </view>
    <button v-if="coverUrl" class="primary" @click="saveCover">保存照片</button>
  </view>
</template>

<script>
import { mpContentApi } from '../../apis/mp'
import { errorMessage, mediaUrl } from '../../utils/request'

export default {
  data() {
    return {
      taskId: '',
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
    }
  },
  onLoad(query) {
    this.taskId = query.task_id
    this.load()
  },
  methods: {
    async load() {
      try {
        const data = await mpContentApi.getArtifact(this.taskId)
        this.artifact = data.artifact || {}
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
  padding: 16px 16px 32px;
}
.cover {
  width: 100%;
  height: 220px;
  border-radius: 14px;
  margin-bottom: 12px;
  background: #ddd;
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
.ghost,
.primary {
  height: 40px;
  line-height: 40px;
  border-radius: 10px;
  font-size: 14px;
}
.ghost {
  background: #f7f4f2;
  color: #BE2D22;
}
.primary {
  color: #fff;
  background: #BE2D22;
}
</style>
