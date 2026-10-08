<template>
  <view class="direct-stream-preview">
    <view v-if="showHeader" class="stream-header">
      <view class="stream-spinner stream-spinner-blue"></view>
      <text class="stream-header-text">{{ headerText }}</text>
    </view>

    <scroll-view
      scroll-y
      class="stream-preview-card"
      :scroll-top="scrollTop"
      :scroll-with-animation="true"
    >
      <text v-if="title" class="stream-preview-title">{{ title }}</text>
      <text v-if="body" class="stream-preview-body">{{ body }}</text>
      <text v-else-if="showBodyPlaceholder" class="stream-preview-body stream-preview-placeholder">{{ placeholder }}</text>
      <view v-if="topics && topics.length" class="stream-preview-topics">
        <text v-for="topic in topics" :key="topic" class="stream-preview-topic">#{{ topic }}</text>
      </view>
    </scroll-view>

    <view v-if="showFooter" class="stream-footer">
      <view class="stream-spinner stream-spinner-blue"></view>
      <text class="stream-footer-text">{{ footerText }}</text>
      <text v-if="footerAnimating" class="stream-dots">...</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'DirectStreamPreview',
  props: {
    headerText: { type: String, default: '正在生成内容' },
    footerText: { type: String, default: '' },
    title: { type: String, default: '' },
    body: { type: String, default: '' },
    topics: { type: Array, default: () => [] },
    showHeader: { type: Boolean, default: true },
    showFooter: { type: Boolean, default: true },
    footerAnimating: { type: Boolean, default: true },
    scrollTop: { type: Number, default: 0 },
    placeholder: { type: String, default: '…' },
    showBodyPlaceholder: { type: Boolean, default: true }
  }
}
</script>

<style scoped>
.direct-stream-preview {
  width: 100%;
}
.stream-header,
.stream-footer {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 12px;
}
.stream-footer {
  margin-top: 12px;
  margin-bottom: 0;
}
.stream-header-text {
  color: #2563eb;
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
}
.stream-footer-text {
  color: #2563eb;
  font-size: 14px;
  line-height: 22px;
}
.stream-spinner {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  margin-right: 8px;
  border-radius: 50%;
  animation: stream-spin 0.85s linear infinite;
}
.stream-spinner-blue {
  border: 2px solid #bfdbfe;
  border-top-color: #2563eb;
}
.stream-dots {
  margin-left: 2px;
  color: #2563eb;
  font-size: 14px;
  letter-spacing: 1px;
  animation: stream-dots 1.2s steps(4, end) infinite;
}
.stream-preview-card {
  box-sizing: border-box;
  max-height: 62vh;
  padding: 16px 14px;
  border: 1px solid #e7e5e4;
  border-radius: 12px;
  background: #fff;
}
.stream-preview-title {
  display: block;
  margin-bottom: 12px;
  color: #1c1917;
  font-size: 18px;
  font-weight: 700;
  line-height: 28px;
}
.stream-preview-body {
  display: block;
  color: #292524;
  font-size: 15px;
  line-height: 26px;
  white-space: pre-wrap;
  word-break: break-word;
}
.stream-preview-placeholder {
  color: #a8a29e;
}
.stream-preview-topics {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}
.stream-preview-topic {
  padding: 4px 10px;
  border-radius: 999px;
  background: #f5f5f4;
  color: #57534e;
  font-size: 12px;
  line-height: 18px;
}
@keyframes stream-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
@keyframes stream-dots {
  0% {
    opacity: 0.35;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.35;
  }
}
</style>
