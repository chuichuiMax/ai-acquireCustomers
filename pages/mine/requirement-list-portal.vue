<template>
  <view v-if="internalAccessGranted" class="page">
    <view v-if="loading" class="state">正在打开需求清单…</view>
    <view v-else-if="errorMessage" class="state">
      <text>{{ errorMessage }}</text>
      <button class="retry" @click="load">重新加载</button>
    </view>
    <!-- #ifdef MP-WEIXIN -->
    <web-view v-else-if="frameUrl" :key="frameKey" class="frame" :src="frameUrl" />
    <!-- #endif -->
    <!-- #ifndef MP-WEIXIN -->
    <view v-else class="state">请在微信小程序中查看需求清单</view>
    <!-- #endif -->
  </view>
</template>

<script>
import { mpMeApi } from '../../apis/mp'
import { errorMessage } from '../../utils/request'
import { internalPageMixin } from '../../utils/internal-access'
import { employeeFromMe } from '../../utils/internal-access-policy.mjs'
import { readPersistedEmployeeCode, resolveRequirementListUserCode } from '../../utils/requirement-list-employee.mjs'
import { requirementListUrl } from '../../utils/requirement-list-url.mjs'

export default {
  mixins: [internalPageMixin],
  data() {
    return { loading: true, frameUrl: '', frameKey: 0, errorMessage: '', refreshOnShow: false, fixedTarget: '' }
  },
  onLoad(options) {
    this.refreshOnShow = options && options.refresh === '1'
    this.fixedTarget = options && options.target ? decodeURIComponent(options.target) : ''
  },
  async onShow() {
    if (!(await this.ensureInternalAccess())) return
    if (!this.frameUrl && !this.errorMessage) {
      await this.load()
      return
    }
    if (this.refreshOnShow && this.frameUrl) {
      this.refreshOnShow = false
      this.reloadPortal()
    }
  },
  methods: {
    async resolveUserCode() {
      let userCode = ''
      try {
        const data = await mpMeApi.get()
        const employee = employeeFromMe(data) || {}
        userCode = resolveRequirementListUserCode(employee)
      } catch (meError) {
        userCode = readPersistedEmployeeCode()
        if (!userCode) throw meError
      }
      return userCode
    },
    async load() {
      this.loading = true
      this.errorMessage = ''
      this.frameUrl = ''
      try {
        const userCode = await this.resolveUserCode()
        const url = this.fixedTarget || requirementListUrl(userCode)
        if (!url) {
          this.errorMessage = '当前账号没有员工编码，无法打开需求清单'
          return
        }
        this.frameUrl = url
        this.frameKey += 1
      } catch (error) {
        const message = error instanceof Error ? error.message : ''
        this.errorMessage = errorMessage(error) || message || '需求清单暂时无法打开'
      } finally {
        this.loading = false
      }
    },
    async reloadPortal() {
      try {
        const userCode = await this.resolveUserCode()
        const url = requirementListUrl(userCode, { refresh: true })
        if (!url) return
        this.frameUrl = url
        this.frameKey += 1
      } catch (error) {}
    }
  }
}
</script>

<style scoped>
.page { min-height: 100vh; background: #fff; }
.frame { width: 100%; height: 100vh; }
.state { padding: 80px 20px; text-align: center; color: #777; font-size: 14px; line-height: 1.6; }
.state text { display: block; }
.retry { margin-top: 16px; color: #3478ff; font-size: 14px; background: #edf3ff; }
.retry::after { border: 0; }
</style>
