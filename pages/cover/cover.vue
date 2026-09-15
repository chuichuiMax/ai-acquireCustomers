<template>
  <view v-if="internalAccessGranted" class="page">
    <tab-bar current="cover" />
  </view>
</template>

<script>
import TabBar from '../../components/tab-bar.vue'
import { internalPageMixin } from '../../utils/internal-access'

export default {
  components: { TabBar },
  mixins: [internalPageMixin],
  async onShow() {
    await this.ensureInternalAccess()
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding-bottom: 90px;
  background: #f4f1ee;
}
</style>
