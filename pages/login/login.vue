<template>
  <view class="page">
    <view class="hero">
      <image class="logo" src="/static/hirun-logo.png" mode="aspectFit" />
      <text class="title">鸿扬获客</text>
    </view>

    <view class="login-card">
      <text class="card-title">账号登录</text>
      <view class="field">
        <text class="field-label">企业微信工号 <text class="required">*</text></text>
        <view class="input-wrap" :class="{ 'input-error': employeeError }">
          <text class="field-icon">▤</text>
          <input
            class="field-input"
            :value="workId"
            :disabled="loginLoading"
            maxlength="64"
            placeholder="请输入工号"
            placeholder-class="input-placeholder"
            confirm-type="done"
            @input="onWorkIdInput"
            @blur="lookupEmployee"
            @confirm="onLogin"
          />
          <button v-if="workId && !loginLoading" class="clear-button" aria-label="清空工号" @tap="clearWorkId">
            ×
          </button>
        </view>
        <text class="field-hint" :class="{ 'hint-error': employeeError, 'hint-success': employee && !employeeError }">
          {{
            employeeError ||
            (lookupLoading ? '正在查询员工信息…' : employee ? '已自动同步员工信息' : '输入工号后自动带出姓名和手机号')
          }}
        </text>
      </view>
      <view class="field">
        <text class="field-label">姓名</text>
        <view class="input-wrap readonly-wrap">
          <view class="person-icon" />
          <input
            class="field-input"
            :value="employee ? employee.name : ''"
            placeholder="默认带出姓名"
            placeholder-class="input-placeholder"
            disabled
          />
        </view>
      </view>
      <view class="field">
        <text class="field-label">手机号码</text>
        <view class="input-wrap readonly-wrap">
          <text class="field-icon">☎</text>
          <input
            class="field-input"
            :value="employee ? employee.login_account : ''"
            placeholder="默认带出手机号码"
            placeholder-class="input-placeholder"
            disabled
          />
        </view>
      </view>
      <button class="login-button" :loading="loginLoading" :disabled="loginLoading" @tap="onLogin">登录</button>
      <view class="form-actions">
        <button class="action-link" @tap="helpOpen = true"><text class="help-icon">?</text> 遇到问题？</button>
        <button class="action-link" @tap="showForgotWorkId">忘记工号</button>
      </view>
    </view>
    <view class="notice"><text>该小程序仅限于鸿扬内部员工登入</text></view>

    <view v-if="helpOpen" class="help-mask" @tap="helpOpen = false">
      <view class="help-sheet" @tap.stop>
        <text class="sheet-title">登录帮助</text>
        <button class="help-item" @tap="showLoginHelp('workId')">如何获取工号？<text>›</text></button>
        <button class="help-item" @tap="showLoginHelp('phone')">手机号如何更新？<text>›</text></button>
        <button class="help-item" @tap="showLoginHelp('missing')">提示“未找到对应员工号”怎么办？<text>›</text></button>
        <button class="sheet-close" @tap="helpOpen = false">关闭</button>
      </view>
    </view>
  </view>
</template>

<script>
import { mpAuthApi } from '../../apis/mp'
import { errorMessage } from '../../utils/request'
import { acceptConfirmedLogin, requireInternalAccess } from '../../utils/internal-access'

export default {
  data() {
    return {
      workId: '',
      employee: null,
      employeeError: '',
      lookupLoading: false,
      loginLoading: false,
      lookupCode: '',
      lookupPromise: null,
      lookupVersion: 0,
      pageActive: true,
      helpOpen: false,
    }
  },
  async onShow() {
    this.pageActive = true
    try {
      if (await requireInternalAccess({ redirect: false })) {
        uni.reLaunch({ url: '/pages/generate/generate' })
      }
    } catch (error) {
      if (error.code !== 'INTERNAL_ACCESS_STALE') {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      }
    }
  },
  onUnload() {
    this.pageActive = false
    this.lookupVersion++
  },
  methods: {
    onWorkIdInput(event) {
      this.workId = event.detail.value
      this.employee = null
      this.employeeError = ''
      this.lookupVersion++
      this.lookupCode = ''
      this.lookupPromise = null
      this.lookupLoading = false
    },
    clearWorkId() {
      this.onWorkIdInput({ detail: { value: '' } })
    },
    async lookupEmployee() {
      const code = this.workId.trim()
      if (!code) {
        this.employeeError = '请输入企业微信工号'
        return null
      }
      if (this.employee && this.employee.employee_code === code) return this.employee
      if (this.lookupPromise && this.lookupCode === code) return this.lookupPromise

      this.workId = code
      const version = ++this.lookupVersion
      this.lookupCode = code
      this.lookupLoading = true
      this.employeeError = ''
      const pending = mpAuthApi
        .lookupEmployee({ employee_code: code })
        .then((data) => {
          if (!this.pageActive || version !== this.lookupVersion) return null
          this.employee = data.employee
          return this.employee
        })
        .catch((error) => {
          if (this.pageActive && version === this.lookupVersion) {
            this.employee = null
            this.employeeError = errorMessage(error)
          }
          return null
        })
        .finally(() => {
          if (version === this.lookupVersion) {
            this.lookupLoading = false
            this.lookupPromise = null
          }
        })
      this.lookupPromise = pending
      return pending
    },
    async onLogin() {
      if (this.loginLoading) return
      const code = this.workId.trim()
      this.loginLoading = true
      let version = this.lookupVersion
      try {
        const employee = await this.lookupEmployee()
        if (!employee || !this.pageActive || this.workId.trim() !== code) return
        version = this.lookupVersion
        const data = await mpAuthApi.loginByEmployeeCode({ employee_code: code })
        if (!this.pageActive || version !== this.lookupVersion) return
        acceptConfirmedLogin(data)
        uni.reLaunch({ url: '/pages/generate/generate' })
      } catch (error) {
        if (this.pageActive && version === this.lookupVersion) {
          this.employee = null
          this.employeeError = errorMessage(error)
        }
      } finally {
        this.loginLoading = false
      }
    },
    showForgotWorkId() {
      uni.showToast({ title: '打开企业微信查看', icon: 'none' })
    },
    showLoginHelp(topic) {
      const messages = {
        workId: '请联系直属主管或人资获取工号',
        phone: '手机号由系统根据工号自动同步',
        missing: '请确认工号是否正确，或联系管理员核对员工信息',
      }
      uni.showToast({ title: messages[topic], icon: 'none', duration: 3500 })
    },
  },
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #fff;
  padding: 32px 24px 24px;
  box-sizing: border-box;
}
.hero {
  margin-bottom: 24px;
  text-align: center;
}
.logo {
  display: block;
  width: 220px;
  height: 72px;
  margin: 0 auto;
}
.title {
  display: block;
  margin-top: 12px;
  font-size: 18px;
  color: #2b2422;
}
.notice {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 24px auto 0;
}
.notice text {
  color: #be2d22;
  font-size: 14px;
  line-height: 20px;
}
.login-card {
  max-width: 460px;
  margin: 0 auto;
  padding: 24px 20px 16px;
  border: 1px solid #eee8e5;
  border-top: 4px solid #be2d22;
  border-radius: 20px;
  box-shadow: 0 8px 28px rgba(67, 34, 24, 0.07);
}
.card-title {
  display: block;
  margin-bottom: 20px;
  font-size: 23px;
  font-weight: 700;
  color: #2b2422;
}
.field {
  margin-bottom: 22px;
}
.field-label {
  display: block;
  margin-bottom: 10px;
  font-size: 15px;
  font-weight: 600;
  color: #77716e;
}
.required {
  color: #be2d22;
}
.input-wrap {
  display: flex;
  align-items: center;
  min-height: 52px;
  padding: 0 13px;
  border: 1px solid #e8e5e3;
  border-radius: 12px;
  background: #fafafa;
}
.input-error {
  border-color: #d6352b;
  box-shadow: 0 0 0 3px rgba(214, 53, 43, 0.08);
}
.field-icon {
  width: 22px;
  margin-right: 10px;
  font-size: 23px;
  color: #96918e;
}
.field-input {
  flex: 1;
  width: 0;
  min-height: 52px;
  font-size: 16px;
  color: #3a3431;
}
.input-placeholder {
  color: #aaa5a2;
}
.readonly-wrap {
  background: #f7f7f7;
}
.person-icon {
  position: relative;
  width: 20px;
  height: 24px;
  margin-right: 12px;
}
.person-icon::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 6px;
  width: 8px;
  height: 8px;
  border: 2px solid #aaa5a2;
  border-radius: 50%;
  box-sizing: border-box;
}
.person-icon::after {
  content: '';
  position: absolute;
  bottom: 2px;
  left: 2px;
  width: 16px;
  height: 9px;
  border: 2px solid #aaa5a2;
  border-bottom: 0;
  border-radius: 9px 9px 0 0;
  box-sizing: border-box;
}
.field-hint {
  display: block;
  min-height: 19px;
  margin-top: 8px;
  font-size: 12px;
  line-height: 19px;
  color: #96918e;
}
.hint-error {
  color: #d6352b;
}
.hint-success {
  color: #458665;
}
.clear-button {
  margin: 0 0 0 6px;
  padding: 0;
  width: 28px;
  height: 32px;
  line-height: 32px;
  font-size: 23px;
  color: #aaa5a2;
  background: transparent;
}
.login-button {
  height: 50px;
  line-height: 50px;
  border-radius: 12px;
  font-size: 17px;
  font-weight: 600;
  color: #fff;
  background: #be2d22;
}
.login-button[disabled] {
  color: #fff;
  background: #cf6b64;
}
.form-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
}
.action-link {
  display: flex;
  align-items: center;
  margin: 0;
  padding: 8px 0;
  line-height: 22px;
  font-size: 13px;
  color: #8b8480;
  background: transparent;
}
.help-icon {
  width: 15px;
  height: 15px;
  margin-right: 5px;
  border: 1px solid #8b8480;
  border-radius: 50%;
  line-height: 15px;
  text-align: center;
  font-size: 11px;
}
.help-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-end;
  background: rgba(25, 19, 16, 0.35);
}
.help-sheet {
  width: 100%;
  padding: 22px 20px 18px;
  padding-bottom: calc(18px + env(safe-area-inset-bottom));
  box-sizing: border-box;
  border-radius: 22px 22px 0 0;
  background: #fff;
}
.sheet-title {
  display: block;
  margin-bottom: 14px;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  color: #2b2422;
}
.help-item {
  display: flex;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid #f1eeec;
  border-radius: 0;
  text-align: left;
  line-height: 24px;
  font-size: 14px;
  color: #5d5551;
  background: transparent;
}
.help-item text {
  margin-left: 8px;
  color: #aaa5a2;
}
.sheet-close {
  margin-top: 18px;
  border-radius: 12px;
  line-height: 46px;
  font-size: 15px;
  color: #5d5551;
  background: #f5f3f2;
}
.clear-button::after,
.login-button::after,
.action-link::after,
.help-item::after,
.sheet-close::after {
  border: none;
}
</style>
