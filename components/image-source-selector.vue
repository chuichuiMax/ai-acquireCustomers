<template>
  <view class="image-source-selector">
    <view class="source-tabs">
      <view class="source-tab" :class="{ active: activeMode === 'library' }" @click="activeMode = 'library'">选择图库</view>
      <view class="source-tab" :class="{ active: activeMode === 'upload' }" @click="activeMode = 'upload'">上传照片</view>
    </view>

    <view v-if="activeMode === 'library'" class="source-entry-grid">
      <view
        v-for="entry in entries"
        :key="entry.key"
        class="source-entry"
        :class="{ disabled: loading || entry.disabled }"
        @click="selectEntry(entry)"
      >
        <view class="yellow-folder">
          <view class="folder-tab" />
          <view class="folder-photo folder-photo-back" />
          <view class="folder-photo folder-photo-front" />
          <text class="scope-badge">{{ entry.badge }}</text>
        </view>
        <text class="entry-label">{{ entry.label }}</text>
        <text v-if="!loading && entry.disabled" class="entry-state">图库未配置</text>
      </view>
    </view>

    <view v-else class="upload-panel" @click="$emit('upload')">
      <view class="upload-plus">+</view>
      <view><text>从手机选择照片</text><text>支持 JPG、PNG、WebP，单张不超过 20 MB</text></view>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    entries: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false }
  },
  data() { return { activeMode: 'library' } },
  methods: {
    selectEntry(entry) {
      if (this.loading || entry.disabled) return
      this.$emit('select-gallery', entry)
    }
  }
}
</script>

<style scoped>
.image-source-selector { margin-top: 14px; }
.source-tabs { display: flex; align-items: flex-end; height: 38px; border-bottom: 1px solid #e9e5e1; }
.source-tab { position: relative; min-width: 96px; height: 38px; color: #625d58; font-size: 15px; line-height: 36px; text-align: center; }
.source-tab.active { color: #26211e; font-weight: 700; }
.source-tab.active::after { content: ''; position: absolute; right: 13px; bottom: -1px; left: 13px; height: 3px; border-radius: 2px; background: #be2d22; }
.source-entry-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; padding-top: 22px; }
.source-entry { min-width: 0; text-align: center; }
.source-entry.disabled { opacity: .48; }
.yellow-folder { position: relative; width: 69px; height: 50px; margin: 0 auto 11px; border-radius: 5px 7px 8px 8px; background: #ffc238; box-shadow: inset 0 -5px 0 rgba(226, 148, 11, .14); }
.folder-tab { position: absolute; top: -7px; left: 0; width: 33px; height: 12px; border-radius: 5px 5px 0 0; background: #ffc238; }
.folder-photo { position: absolute; width: 27px; height: 21px; border: 2px solid rgba(255,255,255,.92); border-radius: 3px; background: rgba(255,255,255,.42); }
.folder-photo-back { top: 10px; left: 14px; transform: rotate(-5deg); }
.folder-photo-front { top: 14px; left: 26px; transform: rotate(4deg); }
.scope-badge { position: absolute; right: -8px; bottom: -8px; min-width: 33px; height: 23px; padding: 0 6px; box-sizing: border-box; border: 1px solid #be2d22; border-radius: 12px; color: #fff; font-size: 12px; line-height: 21px; text-align: center; background: #be2d22; }
.entry-label { display: block; overflow: hidden; color: #302a26; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.entry-state { display: block; margin-top: 4px; color: #938a84; font-size: 10px; }
.upload-panel { min-height: 86px; margin-top: 18px; padding: 15px 16px; box-sizing: border-box; display: flex; align-items: center; border: 1px dashed #d2c9c2; border-radius: 8px; background: #faf8f6; }
.upload-plus { width: 42px; height: 42px; margin-right: 13px; border-radius: 50%; color: #be2d22; font-size: 31px; line-height: 39px; text-align: center; background: #f5e4e1; }
.upload-panel text { display: block; color: #342e2a; font-size: 14px; font-weight: 700; }
.upload-panel text + text { margin-top: 5px; color: #918983; font-size: 10px; font-weight: 400; }
</style>
