<template>
  <view v-if="visible" class="save-target-layer">
    <view class="sheet-head"><text class="back" @click="close">‹</text><text>选择保存位置</text><text class="close" @click="close">取消</text></view>
    <scroll-view class="sheet-body" scroll-y>
      <view class="scope-list"><view v-for="option in options" :key="option.scope" class="folder-row" :class="{ selected: selected(option), disabled: option.disabled }" @click="selectOption(option)"><view><text>{{ option.label }}</text><text>{{ option.hint }}</text></view><text>{{ selected(option) ? '✓' : '' }}</text></view></view>
    </scroll-view>
    <button class="confirm" :disabled="!validCandidate" @click="confirm">确定</button>
  </view>
</template>

<script>
import { fixedSaveTargetOptions } from '../../utils/image-design-logic.mjs'

export default {
  name: 'SaveTargetSheet',
  props: { visible: { type: Boolean, default: false }, scopes: { type: Array, default: () => [] }, value: { type: Object, default: null } },
  data() { return { candidate: null } },
  computed: {
    options() { return fixedSaveTargetOptions(this.scopes) },
    validCandidate() { return this.options.some((option) => !option.disabled && this.selected(option)) }
  },
  watch: { visible(opened) { if (opened) this.resetCandidate(this.value) }, value: { handler(value) { if (this.visible) this.resetCandidate(value) }, deep: true } },
  methods: {
    resetCandidate(value) { this.candidate = value && value.scope ? { scope: value.scope, gallery_id: value.gallery_id || null } : null },
    selected(option) { return this.candidate && this.candidate.scope === option.scope && this.candidate.gallery_id === option.gallery_id },
    selectOption(option) { if (!option.disabled) this.candidate = { scope: option.scope, gallery_id: option.gallery_id } },
    close() { this.$emit('close') }, confirm() { if (this.validCandidate) this.$emit('confirm', { ...this.candidate }) }
  }
}
</script>

<style scoped>
.folder-row.disabled { opacity: .5; }
.save-target-layer { position: fixed; inset: 0; z-index: 60; display: flex; flex-direction: column; padding-bottom: env(safe-area-inset-bottom); background: #f4f1ee; }.sheet-head { position: relative; min-height: 58px; display: flex; align-items: center; justify-content: center; border-bottom: 1px solid #ece6e1; color: #201c1a; font-size: 18px; font-weight: 700; background: #fff; }.back, .close { position: absolute; top: 0; min-height: 58px; display: flex; align-items: center; }.back { left: 17px; font-size: 37px; font-weight: 400; }.close { right: 16px; color: #766e68; font-size: 13px; font-weight: 400; }.sheet-body { flex: 1; min-height: 0; }.scope-list, .folder-list { padding: 14px; }.scope-row, .folder-row { min-height: 68px; margin-bottom: 10px; padding: 0 15px; display: flex; align-items: center; justify-content: space-between; border: 1px solid #e5ddd7; border-radius: 7px; color: #37312d; background: #fff; }.scope-row > text { color: #8b837c; font-size: 26px; }.scope-row view text, .folder-row view text { display: block; font-size: 16px; font-weight: 700; }.scope-row view text + text, .folder-row view text + text { margin-top: 5px; color: #8a817a; font-size: 12px; font-weight: 400; }.folder-row.selected { border-color: #be2d22; }.folder-row > text { min-width: 20px; color: #be2d22; font-size: 18px; text-align: center; }.root-row { background: #fffaf8; }.confirm { margin: 0 18px 18px; height: 54px; border-radius: 27px; color: #fff; font-size: 18px; line-height: 54px; background: #be2d22; }.confirm::after { border: 0; }.confirm[disabled] { opacity: .5; }
</style>
