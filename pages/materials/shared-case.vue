<template>
  <view class="share-page">
    <view v-if="loading" class="state-view">正在加载案例...</view>

    <view v-else-if="loadError" class="state-view error-state">
      <text>案例暂时无法查看</text>
      <button class="retry-button" @click="loadShare">重新加载</button>
    </view>

    <scroll-view v-else class="case-scroll" scroll-y>
      <view class="hero-wrap">
        <image
          v-if="coverUrl"
          class="cover-image"
          :src="coverUrl"
          mode="aspectFill"
        />
        <view v-else class="cover-placeholder" />
      </view>

      <view v-if="metaItems.length" class="project-card">
        <view
          v-for="item in metaItems"
          :key="item.label"
          class="project-field"
          :class="{ wide: item.wide }"
        >
          <text class="field-label">{{ item.label }}：</text>
          <text class="field-value">{{ item.value }}</text>
        </view>
      </view>

      <view class="image-section">
        <view class="section-heading">
          <view class="section-mark" />
          <text>实景案例</text>
        </view>
        <view v-if="images.length" class="image-list">
          <view v-for="(image, index) in images" :key="image.id || image.url || index" class="image-item">
            <image class="case-image" :src="image.url" mode="aspectFill" @click="previewImage(index)" />
          </view>
        </view>
        <text v-else class="empty-images">暂无可展示的案例图片</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { mpContentApi } from '../../apis/mp'
import { errorMessage, publicMediaUrl } from '../../utils/request'

export default {
  data() {
    return {
      shareId: '',
      loading: true,
      loadError: false,
      caseInfo: {
        title: '案例分享',
        building: '',
        area: '',
        style: ''
      },
      coverUrl: '',
      images: []
    }
  },
  computed: {
    metaItems() {
      return [
        { label: '楼盘', value: this.caseInfo.building },
        {
          label: '面积',
          value: this.caseInfo.area
            ? `${this.caseInfo.area}${String(this.caseInfo.area).includes('㎡') ? '' : '㎡'}`
            : ''
        },
        { label: '风格', value: this.caseInfo.style, wide: true }
      ].filter((item) => Boolean(item.value))
    }
  },
  onLoad(options) {
    this.shareId = options?.shareId || ''
    this.loadShare()
  },
  onShareAppMessage() {
    return {
      title: this.caseInfo.title,
      imageUrl: this.coverUrl,
      path: `/pages/materials/shared-case?shareId=${encodeURIComponent(this.shareId)}`
    }
  },
  methods: {
    async loadShare() {
      if (!this.shareId) {
        this.loading = false
        this.loadError = true
        return
      }

      this.loading = true
      this.loadError = false
      try {
        const response = await mpContentApi.getShare(this.shareId)
        const share = response.share || response
        const gallery = share.gallery || share.case || {}
        const rawImages = share.images || share.items || share.image_list || []
        this.images = rawImages
          .map((image) => ({
            id: image.id,
            name: image.file_name || image.filename || image.name || '',
            url: publicMediaUrl(image.url || image.file_url || image.public_url || image.path || '')
          }))
          .filter((image) => Boolean(image.url))
        this.coverUrl = publicMediaUrl(
          share.cover_url || share.cover_file_url || this.images[0]?.url || ''
        )
        this.caseInfo = {
          title: share.title || share.gallery_name || gallery.name || '案例分享',
          building: share.building_name || share.building || gallery.building_name || gallery.building || '',
          area: share.area || gallery.area || '',
          style: share.design_style || share.style || gallery.design_style || gallery.style || gallery.style_name || ''
        }
        uni.setNavigationBarTitle({ title: this.caseInfo.title })
      } catch (error) {
        this.loadError = true
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    previewImage(index) {
      const urls = this.images.map((image) => image.url)
      if (!urls.length) return
      uni.previewImage({ current: urls[index], urls })
    }
  }
}
</script>

<style scoped>
.share-page {
  min-height: 100vh;
  background: #f5f5f5;
}
.case-scroll {
  height: 100vh;
}
.state-view {
  min-height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #847b75;
  font-size: 14px;
}
.error-state {
  color: #5b514c;
}
.retry-button {
  width: 112px;
  height: 38px;
  margin-top: 18px;
  border-radius: 4px;
  color: #fff;
  font-size: 14px;
  line-height: 38px;
  background: #be2d22;
}
.retry-button::after {
  border: 0;
}
.hero-wrap {
  height: 220px;
  background: #e5e2df;
}
.cover-image,
.cover-placeholder {
  display: block;
  width: 100%;
  height: 100%;
}
.cover-placeholder {
  background: #e5e2df;
}
.project-card {
  position: relative;
  z-index: 1;
  min-height: 94px;
  margin: -58px 28px 0;
  padding: 18px 22px 17px;
  border-radius: 8px;
  box-sizing: border-box;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  background: #fff;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.16);
}
.project-field {
  width: 50%;
  padding-bottom: 14px;
  box-sizing: border-box;
  color: #202020;
  font-size: 15px;
  line-height: 1.4;
}
.project-field.wide {
  width: 100%;
  padding-bottom: 0;
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
  height: 205px;
  overflow: hidden;
  background: #e5e2df;
}
.case-image {
  display: block;
  width: 100%;
  height: 100%;
}
.empty-images {
  display: block;
  padding: 34px 0;
  color: #918681;
  font-size: 13px;
  text-align: center;
}
</style>
