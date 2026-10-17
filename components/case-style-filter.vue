<template>
  <scroll-view class="case-style-filter" scroll-x enable-flex>
    <view
      v-for="style in options"
      :key="style"
      class="case-style-chip"
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
.case-style-filter {
  width: 100%;
  white-space: nowrap;
  margin-bottom: 12px;
}
.case-style-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 14px;
  margin-right: 8px;
  border-radius: 999px;
  background: #f3f0ed;
  color: #6b6560;
  font-size: 13px;
}
.case-style-chip.active {
  background: #1f1a17;
  color: #fff;
}
</style>
