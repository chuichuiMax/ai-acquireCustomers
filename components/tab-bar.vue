<template>
  <view class="tab-bar" :style="{ paddingBottom: safeBottom + 'px' }">
    <view
      v-for="item in tabs"
      :key="item.path"
      class="tab-item"
      :class="{ active: current === item.key }"
      @click="go(item.path)"
    >
      <text class="icon">{{ item.icon }}</text>
      <text class="label">{{ item.label }}</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'TabBar',
  props: {
    current: { type: String, required: true }
  },
  data() {
    return {
      safeBottom: 0,
      tabs: [
        { key: 'generate', path: '/pages/generate/generate', label: '内容生成', icon: '✎' },
        { key: 'manage', path: '/pages/manage/manage', label: '内容管理', icon: '☰' },
        { key: 'materials', path: '/pages/materials/materials', label: '素材库', icon: '⌂' },
        { key: 'mine', path: '/pages/mine/mine', label: '我的', icon: '☺' }
      ]
    }
  },
  created() {
    const info = uni.getSystemInfoSync()
    this.safeBottom = info.safeAreaInsets ? info.safeAreaInsets.bottom : 0
  },
  methods: {
    go(path) {
      const pages = getCurrentPages()
      const route = pages.length ? `/${pages[pages.length - 1].route}` : ''
      if (route === path) return
      uni.redirectTo({ url: path })
    }
  }
}
</script>

<style scoped>
.tab-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  background: #fff;
  border-top: 1px solid #eee8e4;
  box-shadow: none;
  outline: none;
}
.tab-item {
  flex: 1;
  height: 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #9a908a;
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
  outline: none;
}
.tab-item.active {
  color: #BE2D22;
  background: transparent;
}
.icon {
  font-size: 18px;
  line-height: 20px;
}
.label {
  margin-top: 2px;
  font-size: 11px;
}
</style>
