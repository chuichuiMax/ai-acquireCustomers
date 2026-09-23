<template>
  <view v-if="visible" class="save-target-popover">
    <view class="save-target-backdrop" @click="close" />
    <view class="save-target-menu">
      <view v-if="loading" class="menu-state">正在加载保存位置…</view>
      <template v-else>
        <view v-for="option in options" :key="option.scope" class="save-target-option" :class="{ selected: selected(option), disabled: option.disabled }" @click="selectOption(option)">
          <view><text>{{ option.label }}</text><text v-if="option.disabled && !error">{{ option.hint }}</text></view>
          <text class="option-check">{{ selected(option) ? '✓' : '' }}</text>
        </view>
        <text v-if="error" class="menu-error">{{ error }}</text>
      </template>
    </view>
  </view>
</template>

<script>
import { fixedSaveTargetOptions } from '../../utils/image-design-logic.mjs'

export default {
  name: 'SaveTargetSheet',
  props: {
    visible: { type: Boolean, default: false },
    scopes: { type: Array, default: () => [] },
    value: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    error: { type: String, default: '' }
  },
  computed: {
    options() { return fixedSaveTargetOptions(this.scopes) }
  },
  methods: {
    selected(option) { return this.value && this.value.scope === option.scope && (this.value.gallery_id || null) === option.gallery_id },
    selectOption(option) { if (!option.disabled) this.$emit('confirm', { scope: option.scope, gallery_id: option.gallery_id }) },
    close() { this.$emit('close') }
  }
}
</script>

<style scoped>
.save-target-popover { position: absolute; top: calc(100% + 4px); right: 0; left: 0; z-index: 60; }
.save-target-backdrop { position: fixed; inset: 0; z-index: 0; background: transparent; }
.save-target-menu { position: relative; z-index: 1; overflow: hidden; border: 1px solid #ebe5e0; border-radius: 8px; background: #fff; box-shadow: 0 9px 24px rgba(59, 47, 39, .16); }
.save-target-option { min-height: 48px; padding: 0 14px; display: flex; align-items: center; justify-content: space-between; box-sizing: border-box; border-bottom: 1px solid #f0ece9; color: #342e2a; font-size: 15px; background: #fff; }
.save-target-option:last-of-type { border-bottom: 0; }
.save-target-option > view > text { display: block; }
.save-target-option > view > text + text { margin-top: 3px; color: #9b928c; font-size: 11px; }
.save-target-option.selected { color: #be2d22; background: #fff8f7; }
.save-target-option.disabled { color: #aaa29c; background: #faf9f8; }
.option-check { min-width: 20px; color: #be2d22; font-size: 16px; text-align: right; }
.menu-state, .menu-error { display: block; padding: 14px; color: #8b837c; font-size: 12px; }
.menu-error { border-top: 1px solid #f0ece9; color: #aa6c34; line-height: 1.5; }
</style>
