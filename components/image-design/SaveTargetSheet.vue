<template>
  <view v-if="visible" class="save-target-layer">
    <view class="sheet-head"><text class="back" @click="stage === 'folder' ? backToScopes() : close()">‹</text><text>{{ stage === 'scope' ? '选择保存位置' : activeScope.label }}</text><text class="close" @click="close">取消</text></view>
    <scroll-view class="sheet-body" scroll-y>
      <view v-if="stage === 'scope'" class="scope-list"><view v-for="scope in scopes" :key="scope.scope" class="scope-row" @click="selectScope(scope)"><view><text>{{ scope.label }}</text><text>选择保存到{{ scope.label }}</text></view><text>›</text></view></view>
      <view v-else class="folder-list"><view v-if="activeScope.can_write_root" class="folder-row root-row" :class="{ selected: candidate && candidate.gallery_id === null }" @click="selectRoot"><view><text>直接保存到{{ activeScope.label }}</text><text>不放入具体文件夹</text></view><text>{{ candidate && candidate.gallery_id === null ? '✓' : '' }}</text></view><view v-for="folder in activeScope.folders || []" :key="folder.id" class="folder-row" :class="{ selected: candidate && candidate.gallery_id === folder.id }" @click="selectFolder(folder)"><view><text>{{ folder.path || folder.name }}</text><text v-if="folder.path && folder.name && folder.path !== folder.name">{{ folder.name }}</text></view><text>{{ candidate && candidate.gallery_id === folder.id ? '✓' : '' }}</text></view></view>
    </scroll-view>
    <button v-if="stage === 'folder'" class="confirm" :disabled="!candidate" @click="confirm">确定</button>
  </view>
</template>

<script>
export default {
  name: 'SaveTargetSheet',
  props: { visible: { type: Boolean, default: false }, scopes: { type: Array, default: () => [] }, value: { type: Object, default: null } },
  data() { return { stage: 'scope', candidate: null } },
  computed: { activeScope() { return this.scopes.find((scope) => scope && this.candidate && scope.scope === this.candidate.scope) || { label: '', folders: [] } } },
  watch: { visible(opened) { if (opened) this.resetCandidate(this.value) }, value: { handler(value) { if (this.visible) this.resetCandidate(value) }, deep: true } },
  methods: {
    resetCandidate(value) { this.stage = 'scope'; this.candidate = value && value.scope ? { scope: value.scope, gallery_id: value.gallery_id || null } : null },
    selectScope(scope) { this.candidate = { scope: scope.scope, gallery_id: null }; this.stage = 'folder' },
    selectRoot() { this.candidate = { scope: this.candidate.scope, gallery_id: null } },
    selectFolder(folder) { this.candidate = { scope: this.candidate.scope, gallery_id: folder.id } },
    backToScopes() { this.stage = 'scope' }, close() { this.$emit('close') }, confirm() { if (this.candidate) this.$emit('confirm', { ...this.candidate }) }
  }
}
</script>

<style scoped>
.save-target-layer { position: fixed; inset: 0; z-index: 60; display: flex; flex-direction: column; padding-bottom: env(safe-area-inset-bottom); background: #f4f1ee; }.sheet-head { position: relative; min-height: 58px; display: flex; align-items: center; justify-content: center; border-bottom: 1px solid #ece6e1; color: #201c1a; font-size: 18px; font-weight: 700; background: #fff; }.back, .close { position: absolute; top: 0; min-height: 58px; display: flex; align-items: center; }.back { left: 17px; font-size: 37px; font-weight: 400; }.close { right: 16px; color: #766e68; font-size: 13px; font-weight: 400; }.sheet-body { flex: 1; min-height: 0; }.scope-list, .folder-list { padding: 14px; }.scope-row, .folder-row { min-height: 68px; margin-bottom: 10px; padding: 0 15px; display: flex; align-items: center; justify-content: space-between; border: 1px solid #e5ddd7; border-radius: 7px; color: #37312d; background: #fff; }.scope-row > text { color: #8b837c; font-size: 26px; }.scope-row view text, .folder-row view text { display: block; font-size: 16px; font-weight: 700; }.scope-row view text + text, .folder-row view text + text { margin-top: 5px; color: #8a817a; font-size: 12px; font-weight: 400; }.folder-row.selected { border-color: #be2d22; }.folder-row > text { min-width: 20px; color: #be2d22; font-size: 18px; text-align: center; }.root-row { background: #fffaf8; }.confirm { margin: 0 18px 18px; height: 54px; border-radius: 27px; color: #fff; font-size: 18px; line-height: 54px; background: #be2d22; }.confirm::after { border: 0; }.confirm[disabled] { opacity: .5; }
</style>
