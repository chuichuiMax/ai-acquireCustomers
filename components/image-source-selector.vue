<template>
  <view class="image-source-selector">
    <view class="source-tabs">
      <view class="source-tab" :class="{ active: activeMode === 'library' }" @click="activeMode = 'library'">选择图库</view>
      <view class="source-tab" :class="{ active: activeMode === 'upload' }" @click="activeMode = 'upload'">上传照片</view>
    </view>

    <scroll-view v-if="activeMode === 'library'" class="source-entry-scroll" scroll-x :show-scrollbar="false">
      <view v-if="loading" class="source-entry-state">正在加载图库…</view>
      <view v-else-if="!entries.length" class="source-entry-state">暂无可用图库</view>
      <view v-else class="source-entry-row">
        <view v-for="entry in entries" :key="entry.key" class="source-entry" @click="selectEntry(entry)">
          <view class="yellow-folder">
            <image
              v-if="folderCoverUrl(entry)"
              class="folder-preview"
              :src="folderCoverUrl(entry)"
              mode="aspectFill"
              lazy-load
            />
            <view class="folder-tab" />
            <text class="scope-badge">{{ entry.badge }}</text>
          </view>
          <text class="entry-label">{{ entry.label }}</text>
        </view>
      </view>
    </scroll-view>

    <view v-else class="upload-panel" @click="$emit('upload')">
      <view class="upload-plus">+</view>
      <view><text>从手机选择照片</text><text>支持 JPG、PNG、WebP，单张不超过 20 MB</text></view>
    </view>
  </view>
</template>

<script>
import { galleryCoverPath } from '../utils/materials-logic.mjs'
import { mediaUrl } from '../utils/request'

export default {
  props: {
    entries: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false }
  },
  data() { return { activeMode: 'library' } },
  methods: {
    folderCoverUrl(entry) {
      return mediaUrl(galleryCoverPath(entry && entry.folder))
    },
    selectEntry(entry) {
      if (this.loading || entry.disabled) return
      this.$emit('select-gallery', entry)
    }
  }
}
</script>

<style scoped>
.image-source-selector { margin-top: 14px; }
.source-tabs { display: flex; align-items: center; gap: 8px; height: 38px; }
.source-tab { min-width: 96px; height: 38px; box-sizing: border-box; padding: 0 13px; border: 1px solid #d8d0ca; border-radius: 19px; color: #8a817c; font-size: 15px; line-height: 36px; text-align: center; background: #fff; }
.source-tab.active { border-color: #be2d22; color: #fff; font-weight: 700; background: #be2d22; }
.source-entry-scroll { width: 100%; margin-top: 14px; white-space: nowrap; }
.source-entry-row { display: inline-flex; align-items: flex-start; gap: 12px; padding: 10px 4px 8px; }
.source-entry { flex: none; width: 100px; text-align: center; }
.source-entry-state { padding: 22px 4px; color: #938a84; font-size: 13px; }
.yellow-folder { position: relative; width: 84px; height: 64px; margin: 0 auto 11px; overflow: visible; --folder-back-color: #ffc238; border-radius: 0 7px 9px 9px; background: var(--folder-back-color); box-shadow: 0 2px 5px rgba(177, 120, 8, .18); }
.yellow-folder::before { position: absolute; z-index: 0; top: -7px; left: 0; width: 40px; height: 14px; -webkit-clip-path: polygon(0 0, 70% 0, 100% 100%, 0 100%); clip-path: polygon(0 0, 70% 0, 100% 100%, 0 100%); border-radius: 6px 0 0 0; background: var(--folder-back-color); content: ''; }
.folder-preview { position: absolute; z-index: 1; top: 5px; right: 3px; left: 3px; width: auto; height: 45px; border-radius: 4px 4px 5px 5px; background: #f3eee5; }
.folder-tab { position: absolute; z-index: 2; right: 0; top: 34px; left: 0; height: 30px; border-radius: 6px 7px 8px 8px; background: linear-gradient(180deg, #ffe9a3 0%, #ffdc79 55%, #ffd15a 100%); box-shadow: inset 0 1px 0 rgba(255, 249, 220, .85), inset 0 -2px 0 rgba(235, 168, 28, .22), 0 2px 4px rgba(177, 120, 8, .14); }
.scope-badge { position: absolute; z-index: 3; right: -7px; bottom: -8px; min-width: 33px; height: 23px; padding: 0 6px; box-sizing: border-box; border: 1px solid #be2d22; border-radius: 12px; color: #fff; font-size: 12px; line-height: 21px; text-align: center; background: #be2d22; }
.entry-label { display: block; overflow: hidden; color: #302a26; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.upload-panel { min-height: 86px; margin-top: 18px; padding: 15px 16px; box-sizing: border-box; display: flex; align-items: center; border: 1px dashed #d2c9c2; border-radius: 8px; background: #faf8f6; }
.upload-plus { width: 42px; height: 42px; margin-right: 13px; border-radius: 50%; color: #be2d22; font-size: 31px; line-height: 39px; text-align: center; background: #f5e4e1; }
.upload-panel text { display: block; color: #342e2a; font-size: 14px; font-weight: 700; }
.upload-panel text + text { margin-top: 5px; color: #918983; font-size: 10px; font-weight: 400; }
</style>
