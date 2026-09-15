<template>
  <view class="tab-bar" :style="{ paddingBottom: safeBottom + 'px' }">
    <view
      v-for="item in tabs"
      :key="item.path"
      class="tab-item"
      :class="{ active: current === item.key }"
      @click="go(item.path)"
    >
      <view v-if="item.key === 'cover'" class="plus-wrap">
        <text class="icon plus">+</text>
      </view>
      <text v-else class="icon">{{ item.icon }}</text>
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
        { key: 'generate', path: '/pages/generate/generate', label: '生产', icon: '▦' },
        { key: 'manage', path: '/pages/manage/manage', label: '记录', icon: '▤' },
        { key: 'cover', path: '/pages/cover/cover', label: '生图', icon: '+' },
        { key: 'materials', path: '/pages/materials/materials', label: '案例', icon: '⌂' },
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
}
.tab-item {
  flex: 1;
  height: 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #9a908a;
}
.tab-item.active {
  color: #BE2D22;
}
.icon {
  font-size: 18px;
  line-height: 20px;
}
.plus-wrap {
  width: 20px;
  height: 20px;
  border: 1px solid currentColor;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
.plus {
  font-size: 16px;
  line-height: 18px;
}
.label {
  margin-top: 2px;
  font-size: 11px;
}
</style>
