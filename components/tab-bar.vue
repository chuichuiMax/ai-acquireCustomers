<template>
  <view
    class="tab-bar"
    :style="{
      paddingBottom: safeBottom + 'px',
      '--tab-active-color': colors.active,
      '--tab-inactive-color': colors.inactive
    }"
  >
    <view
      v-for="item in tabs"
      :key="item.path"
      class="tab-item"
      :class="{ active: current === item.key }"
      @click="go(item.path)"
    >
      <view class="tab-content">
        <image class="icon" :src="resolveTabIcon(item, current)" mode="aspectFit" />
        <text class="label">{{ item.label }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import { resolveTabIcon, tabBarColors, tabBarItems } from '../utils/tab-bar-icons.mjs'

export default {
  name: 'TabBar',
  props: {
    current: { type: String, required: true }
  },
  data() {
    return {
      safeBottom: 0,
      colors: tabBarColors,
      tabs: tabBarItems
    }
  },
  created() {
    const info = uni.getSystemInfoSync()
    this.safeBottom = info.safeAreaInsets ? info.safeAreaInsets.bottom : 0
  },
  methods: {
    resolveTabIcon,
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
  color: var(--tab-inactive-color);
}
.tab-item.active {
  color: var(--tab-active-color);
}
.tab-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translateY(5px);
}
.icon {
  width: 24px;
  height: 24px;
  display: block;
  flex: 0 0 24px;
}
.label {
  margin-top: 2px;
  font-size: 11px;
  line-height: 14px;
}
</style>
