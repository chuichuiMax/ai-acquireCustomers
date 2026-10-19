<template>
  <view class="case-content">
    <view class="hero-wrap">
      <image
        v-if="coverUrl"
        class="cover-image"
        :src="coverUrl"
        mode="widthFix"
      />
      <view v-else class="cover-placeholder" />
    </view>

    <view v-if="metaItems.length || caseInfo.sharerPhone" class="project-card">
      <view
        v-for="item in metaItems"
        :key="item.label"
        class="project-field"
        :class="[item.className, { wide: item.wide }]"
      >
        <text class="field-label">{{ item.label }}：</text>
        <text class="field-value">{{ item.value }}</text>
      </view>
      <view v-if="caseInfo.sharerPhone" class="project-field share-phone" @click="callSharer">
        <text class="field-label">电话：</text>
        <text class="field-value">{{ caseInfo.sharerPhone }}</text>
      </view>
    </view>

    <view class="image-section">
      <view class="section-heading">
        <view class="section-mark" />
        <text>实景案例</text>
      </view>
      <view v-if="images.length" class="image-list">
        <view v-for="(image, index) in images" :key="image.id || image.displayUrl || index" class="image-item">
          <image v-if="imageStates[image.displayUrl] !== 'error'" class="case-image" :class="{ 'image-pending': !imageStates[image.displayUrl] }"
            :src="image.displayUrl" mode="widthFix" :lazy-load="index > 0"
            @load="imageLoaded(image.displayUrl)" @error="imageFailed(image.displayUrl, $event)" @click="previewImage(index)" />
          <view v-if="!imageStates[image.displayUrl]" class="image-status" role="status">正在加载案例图片…</view>
          <view v-else-if="imageStates[image.displayUrl] === 'error'" class="image-error">
            <text>案例图片加载失败</text><button @click="retryImage(image.displayUrl)">重新加载</button>
            <view v-if="showImageDiagnostics" class="image-diagnostics"><text>{{ imageErrors[image.displayUrl] }}</text><text>{{ image.displayUrl }}</text></view>
          </view>
        </view>
      </view>
      <text v-else class="empty-images">暂无可展示的案例图片</text>
    </view>
  </view>
</template>

<script>
import { formatArea } from '../utils/materials-logic.mjs'

export default {
  props: {
    caseInfo: { type: Object, required: true },
    coverUrl: { type: String, default: '' },
    images: { type: Array, default: () => [] }
  },
  emits: ['preview', 'call'],
  data() { return { imageStates: {}, imageErrors: {} } },
  computed: {
    showImageDiagnostics() {
      // 只在开发预览中展示微信原生错误，正式版保留普通失败提示。
      // #ifdef MP-WEIXIN
      if (typeof wx !== 'undefined' && typeof wx.getAccountInfoSync === 'function') {
        return wx.getAccountInfoSync().miniProgram.envVersion === 'develop'
      }
      // #endif
      return false
    },
    metaItems() {
      return [
        { label: '楼盘', value: this.caseInfo.building, className: 'project-building' },
        {
          label: '面积',
          value: formatArea(this.caseInfo.area),
          className: 'project-area'
        },
        { label: '联系人', value: this.caseInfo.sharerName, className: 'project-contact' },
        { label: '风格', value: this.caseInfo.style, className: 'project-style', wide: !this.caseInfo.sharerName }
      ].filter((item) => Boolean(item.value))
    }
  },
  methods: {
    imageLoaded(url) { this.imageStates = { ...this.imageStates, [url]: 'loaded' } },
    imageFailed(url, event) {
      this.imageErrors = { ...this.imageErrors, [url]: event?.detail?.errMsg || '微信未返回错误详情' }
      this.imageStates = { ...this.imageStates, [url]: 'error' }
    },
    retryImage(url) {
      const states = { ...this.imageStates }
      delete states[url]
      this.imageStates = states
    },
    callSharer() { this.$emit('call') },
    previewImage(index) { this.$emit('preview', index) }
  }
}
</script>

<style scoped>
.hero-wrap {
  background: #e5e2df;
}
.cover-image {
  display: block;
  width: 100%;
  height: auto;
}
.cover-placeholder {
  height: 220px;
  background: #e5e2df;
}
.project-card {
  --share-phone-color: #5b7cff;
  position: relative;
  z-index: 1;
  min-height: 94px;
  margin: -58px 28px 0;
  padding: 18px 22px 17px;
  border-radius: 8px;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 10px;
  background: #fff;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.16);
}
.project-field {
  min-width: 0;
  box-sizing: border-box;
  color: #202020;
  font-size: 15px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.project-building,
.project-contact {
  grid-column: 1;
}
.project-area,
.project-style {
  grid-column: 2;
}
.project-field.wide {
  grid-column: 1 / -1;
}
.share-phone {
  grid-column: 1 / -1;
  color: var(--share-phone-color);
  overflow-wrap: anywhere;
}
.field-label,
.field-value {
  display: inline;
}
.field-label {
  font-weight: 500;
}
.field-value {
  font-weight: 400;
}
.image-section {
  padding: 28px 16px 42px;
}
.section-heading {
  padding: 0 12px 20px;
  display: flex;
  align-items: center;
  color: #171717;
  font-size: 18px;
  font-weight: 700;
}
.section-mark {
  width: 10px;
  height: 26px;
  margin-right: 16px;
  flex-shrink: 0;
  background: #f20f1c;
}
.image-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.image-item {
  position: relative;
  background: #e5e2df;
}
.case-image {
  display: block;
  width: 100%;
  height: auto;
}
.case-image.image-pending { min-height: 220px; }
.image-status { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #706963; font-size: 13px; pointer-events: none; }
.image-error { min-height: 220px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: #706963; font-size: 13px; }
.image-error button { margin: 0; padding: 0 18px; background: #fff; color: #be2d22; font-size: 13px; }
.image-diagnostics { padding: 0 16px 16px; font-size: 11px; line-height: 1.6; overflow-wrap: anywhere; }
.image-diagnostics text { display: block; }
.empty-images {
  display: block;
  padding: 34px 0;
  color: #918681;
  font-size: 13px;
  text-align: center;
}
</style>
