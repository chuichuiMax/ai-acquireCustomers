<template>
  <view class="gallery-grid">
    <view
      v-for="folder in folders"
      :key="folder.id"
      class="gallery-card"
      :class="{ active: activeId === folder.id }"
      @click="$emit('select', folder)"
    >
      <view class="folder-icon">
        <view class="folder-tab-top" />
        <image
          v-if="coverUrl(folder)"
          class="folder-preview"
          :src="coverUrl(folder)"
          mode="aspectFill"
          lazy-load
        />
        <view class="folder-tab" />
      </view>
      <text class="gallery-name">{{ folder.name || '未命名图库' }}</text>
    </view>
  </view>
</template>

<script>
import { galleryCoverPath } from '../utils/materials-logic.mjs'
import { mediaUrl } from '../utils/request'

export default {
  props: {
    folders: { type: Array, default: () => [] },
    activeId: { type: String, default: '' }
  },
  methods: {
    coverUrl(folder) {
      const path = galleryCoverPath(folder)
      return path ? mediaUrl(path) : ''
    }
  }
}
</script>

<style scoped>
.gallery-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  padding-top: 12px;
}
.gallery-card {
  width: 47%;
  margin-bottom: 26px;
  text-align: center;
}
.gallery-card.active .folder-icon {
  box-shadow: 0 0 0 2px #178df0;
}
.folder-icon {
  position: relative;
  width: 106px;
  height: 82px;
  margin: 0 auto 10px;
  overflow: visible;
  border-radius: 0 8px 10px 10px;
  background: #ffc238;
  box-shadow: 0 2px 5px rgba(177, 120, 8, 0.18);
}
.folder-tab-top {
  position: absolute;
  z-index: 0;
  top: -9px;
  left: 0;
  width: 50px;
  height: 18px;
  border-radius: 7px 0 0 0;
  background: #ffc238;
}
.folder-preview {
  position: absolute;
  z-index: 1;
  top: 7px;
  right: 4px;
  left: 4px;
  width: auto;
  height: 58px;
  border-radius: 4px 4px 6px 6px;
  background: #f3eee5;
}
.folder-tab {
  position: absolute;
  z-index: 2;
  right: 0;
  top: 44px;
  left: 0;
  display: block;
  height: 38px;
  border-radius: 7px 8px 9px 9px;
  background: linear-gradient(180deg, #ffe9a3 0%, #ffdc79 55%, #ffd15a 100%);
  box-shadow: inset 0 1px 0 rgba(255, 249, 220, 0.85), inset 0 -2px 0 rgba(235, 168, 28, 0.22), 0 2px 4px rgba(177, 120, 8, 0.14);
}
.gallery-name {
  display: block;
  overflow: hidden;
  padding: 0 4px;
  color: #292624;
  font-size: 12px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
