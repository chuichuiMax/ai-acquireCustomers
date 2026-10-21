<template>
  <scroll-view class="style-sidebar" scroll-y>
    <view
      v-for="style in options"
      :key="style"
      class="style-option"
      :class="{ active: value === style }"
      @click="$emit('input', style)"
    >
      <text>{{ style }}</text>
    </view>
  </scroll-view>
</template>

<script>
import { MATERIAL_LIBRARY_STYLE_OPTIONS } from '../utils/materials-logic.mjs'

export default {
  props: {
    value: { type: String, default: '全部' },
    options: { type: Array, default: () => MATERIAL_LIBRARY_STYLE_OPTIONS }
  }
}
</script>

<style scoped>
.style-sidebar {
  width: 116px;
  min-height: 0;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #d8d8d8;
}
.style-option {
  position: relative;
  min-height: 46px;
  padding: 0 10px 0 20px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  color: #53616a;
  font-size: 14px;
  line-height: 1.25;
}
.style-option.active {
  color: #1688e8;
  background: #e6f6ff;
  border-right: 4px solid #178df0;
}
</style>
