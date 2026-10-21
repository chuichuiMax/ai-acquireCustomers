<template>
  <view class="case-building-search">
    <text class="search-icon" aria-hidden="true">⌕</text>
    <input
      class="search-input"
      type="text"
      :value="value"
      placeholder="搜索楼盘地址"
      confirm-type="search"
      @input="onInput"
    />
    <text v-if="value" class="clear" @click="$emit('input', '')">×</text>
  </view>
</template>

<script>
export default {
  props: {
    value: { type: String, default: '' }
  },
  methods: {
    onInput(event) {
      this.$emit('input', (event.detail && event.detail.value) || '')
    }
  }
}
</script>

<style scoped>
.case-building-search {
  display: flex;
  align-items: center;
  min-height: 40px;
  margin-bottom: 12px;
  padding: 0 12px;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(32, 32, 32, 0.06);
}
.search-icon {
  margin-right: 8px;
  color: #9a928c;
  font-size: 16px;
  line-height: 1;
}
.search-input {
  flex: 1;
  min-width: 0;
  height: 40px;
  color: #2b2422;
  font-size: 14px;
}
.clear {
  padding: 4px 6px;
  color: #b5ada6;
  font-size: 18px;
  line-height: 1;
}
</style>
