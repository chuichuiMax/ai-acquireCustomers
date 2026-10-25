<template>
  <view class="page">
    <view class="hero">
      <image class="logo" src="/static/hirun-logo.png" mode="aspectFill" />
      <text class="title">鸿扬获客</text>
    </view>

    <view class="login-card">
      <view class="field">
        <text class="field-label">企业微信工号 <text class="required">*</text></text>
        <view class="input-wrap" :class="{ 'input-error': employeeError }">
          <image class="field-icon" src="/static/login-icons/envelope.png" mode="aspectFit" />
          <input
            class="field-input"
            :value="workId"
            :disabled="loginLoading || wechatLoading"
            maxlength="64"
            placeholder="请输入工号"
            placeholder-class="input-placeholder"
            confirm-type="done"
            @input="onWorkIdInput"
            @blur="lookupEmployee"
            @confirm="onLogin"
          />
          <button v-if="workId && !loginLoading && !wechatLoading" class="clear-button" aria-label="清空工号" @tap="clearWorkId">
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
          <image class="field-icon person-icon" src="/static/login-icons/person.png" mode="aspectFit" />
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
          <image class="field-icon" src="/static/login-icons/phone.png" mode="aspectFit" />
          <input
            class="field-input"
            :value="employee ? employee.login_account : ''"
            placeholder="默认带出手机号码"
            placeholder-class="input-placeholder"
            disabled
          />
        </view>
      </view>
      <button class="login-button" :loading="loginLoading" :disabled="loginLoading || wechatLoading" @tap="onLogin">登录</button>
      <!-- #ifdef MP-WEIXIN -->
      <button class="login-button wechat-button" open-type="getPhoneNumber|agreePrivacyAuthorization"
        :loading="wechatLoading" :disabled="loginLoading || wechatLoading" @getphonenumber="onWechatLogin">
        <image v-if="!wechatLoading" class="wechat-icon" src="/static/login-icons/wechat.svg" mode="aspectFit" />
        <text>一键登录</text>
      </button>
      <text v-if="wechatError" class="field-hint hint-error">{{ wechatError }}</text>
      <!-- #endif -->
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
      wechatLoading: false,
      wechatError: '',
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
      if (this.wechatLoading) return null
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
      if (!this.pageActive || this.loginLoading || this.wechatLoading) return
      this.wechatError = ''
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
    async onWechatLogin(event) {
      if (!this.pageActive || this.loginLoading || this.wechatLoading) return
      const detail = event.detail || {}
      this.employeeError = ''
      if (!detail.code) {
        const message = detail.errMsg || ''
        this.wechatError = /privacy|隐私/i.test(message) ? '请同意微信隐私保护指引后重试'
          : /deny|cancel/i.test(message) ? '已取消手机号授权'
            : '未能获取微信手机号，请重试'
        return
      }
      this.wechatLoading = true
      this.wechatError = ''
      this.lookupVersion++
      this.lookupLoading = false
      this.lookupPromise = null
      try {
        const login = await new Promise((resolve, reject) => uni.login({ provider: 'weixin', timeout: 10000, success: resolve, fail: reject }))
        if (!this.pageActive) return
        if (!login.code) {
          this.wechatError = '微信登录失败，请重试'
          return
        }
        const session = await mpAuthApi.loginByWechat({ code: login.code })
        if (!this.pageActive) return
        await mpAuthApi.bindWechatPhone({ session_id: session.session_id, code: detail.code })
        if (!this.pageActive) return
        const data = await mpAuthApi.confirmLogin({ session_id: session.session_id })
        if (!this.pageActive) return
        acceptConfirmedLogin(data)
        uni.reLaunch({ url: '/pages/generate/generate' })
      } catch (error) {
        if (this.pageActive) this.wechatError = errorMessage(error)
      } finally {
        this.wechatLoading = false
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
  --layout-space: clamp(0px, calc(10vh - 65px), 12px);
  min-height: 100vh;
  background: #fff;
  padding: calc(8px + var(--layout-space)) 24px 12px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  box-sizing: border-box;
}
.hero {
  margin-bottom: calc(8px + var(--layout-space));
  text-align: center;
}
.logo {
  display: block;
  width: 120px;
  height: 68px;
  margin: 0 auto;
}
.title {
  display: block;
  margin-top: 4px;
  font-size: 18px;
  line-height: 24px;
  color: #2b2422;
}
.notice {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: calc(8px + var(--layout-space)) auto 0;
}
.notice text {
  color: #be2d22;
  font-size: 14px;
  line-height: 20px;
}
.login-card {
  max-width: 460px;
  margin: 0 auto;
  padding: calc(12px + var(--layout-space)) 20px calc(8px + var(--layout-space));
  border: 1px solid #eee8e5;
  border-top: 4px solid #be2d22;
  border-radius: 20px;
  box-shadow: 0 8px 28px rgba(67, 34, 24, 0.07);
}
.field {
  margin-bottom: calc(8px + var(--layout-space));
}
.field-label {
  display: block;
  margin-bottom: 6px;
  font-size: 15px;
  line-height: 20px;
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
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  margin-right: 6px;
}
.person-icon {
  height: 20px;
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
.field-hint {
  display: block;
  min-height: 19px;
  margin-top: 4px;
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
.wechat-button {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: calc(8px + var(--layout-space));
  background: linear-gradient(110deg, #60b967, #4d9e54);
}
.wechat-button[disabled] {
  background: #91bf96;
}
.wechat-icon {
  width: 25px;
  height: 25px;
  margin-right: 8px;
}
.form-actions {
  display: flex;
  justify-content: space-between;
  margin-top: calc(4px + var(--layout-space));
}
.action-link {
  display: flex;
  align-items: center;
  margin: 0;
  padding: 6px 0;
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
@media (max-height: 650px) {
  .logo {
    height: 60px;
  }
  .title {
    margin-top: 0;
  }
  .field-label {
    margin-bottom: 4px;
  }
  .action-link {
    padding-top: 4px;
    padding-bottom: 4px;
  }
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
