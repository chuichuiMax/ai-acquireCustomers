<template>
  <picker mode="selector" :range="pickerLabels" :value="selectedIndex" :disabled="pickerDisabled" @change="confirmSelection" @cancel="cancelSelection">
    <slot />
  </picker>
</template>

<script>
import { fixedSaveTargetOptions } from '../../utils/image-design-logic.mjs'

export default {
  name: 'SaveTargetSheet',
  props: {
    scopes: { type: Array, default: () => [] },
    value: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    error: { type: String, default: '' }
  },
  computed: {
    options() { return fixedSaveTargetOptions(this.scopes) },
    pickerDisabled() { return this.loading || !!this.error || this.options.every(option => option.disabled) },
    pickerLabels() { return this.options.map(option => option.disabled ? `${option.label}（暂不可用）` : option.label) },
    selectedIndex() {
      const index = this.options.findIndex(option => this.value && option.scope === this.value.scope && option.gallery_id === this.value.gallery_id)
      return index >= 0 ? index : Math.max(0, this.options.findIndex(option => !option.disabled))
    }
  },
  methods: {
    confirmSelection(event) {
      const option = this.options[Number(event.detail.value)]
      if (!option || this.loading || this.error) return
      if (option.disabled) { this.$emit('unavailable', option.hint); return }
      this.$emit('confirm', { scope: option.scope, gallery_id: option.gallery_id })
    },
    cancelSelection() { this.$emit('cancel') }
  }
}
</script>
