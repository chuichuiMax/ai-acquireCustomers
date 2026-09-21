<template>
  <view class="page">
    <view class="hero">
      <image class="logo" src="/static/hirun-logo.png" mode="aspectFit" />
      <text class="title">鸿扬获客</text>
      <view class="notice">
        <text>该小程序仅限于鸿扬内部员工登入</text>
      </view>
    </view>

    <view class="form">
      <input
        class="field"
        type="number"
        v-model="phone"
        placeholder="请输入手机号"
        placeholder-class="placeholder"
        maxlength="11"
        confirm-type="next"
      />
      <view class="code-row">
        <input
          class="field code-field"
          type="number"
          v-model="code"
          placeholder="请输入验证码"
          placeholder-class="placeholder"
          maxlength="6"
          confirm-type="done"
          @confirm="loginBySms"
        />
        <button class="sms" :loading="smsSending" :disabled="smsCountdown > 0 || smsLoading" @click="sendSms">
          {{ smsCountdown > 0 ? smsCountdown + 's' : '获取验证码' }}
        </button>
      </view>
      <button class="primary" :loading="smsLoading" :disabled="wechatLoading || smsSending" @click="loginBySms">
        登录
      </button>
    </view>

    <view class="btn-wrap">
      <button
        class="wechat"
        open-type="getPhoneNumber"
        :loading="wechatLoading"
        :disabled="smsLoading || smsSending"
        @getphonenumber="onGetPhoneNumber"
      >
        一键登录
      </button>
    </view>
  </view>
</template>

<script>
import { mpAuthApi } from '../../apis/mp'
import { errorMessage, setToken } from '../../utils/request'
import { requireInternalAccess, resetInternalAccess } from '../../utils/internal-access'
import { hasMiniProgramAccess } from '../../utils/internal-access-policy.mjs'

export default {
  data() {
    return {
      phone: '',
      code: '',
      smsCountdown: 0,
      smsSending: false,
      smsLoading: false,
      wechatLoading: false,
      smsTimer: null
    }
  },
  async onShow() {
    if (await requireInternalAccess({ redirect: false })) {
      uni.reLaunch({ url: '/pages/generate/generate' })
    }
  },
  onUnload() {
    this.clearSmsTimer()
  },
  methods: {
    phoneOk() {
      return /^1[3-9]\d{9}$/.test(String(this.phone || '').trim())
    },
    clearSmsTimer() {
      if (this.smsTimer) {
        clearInterval(this.smsTimer)
        this.smsTimer = null
      }
    },
    startSmsCountdown() {
      this.clearSmsTimer()
      this.smsCountdown = 60
      const self = this
      this.smsTimer = setInterval(function () {
        self.smsCountdown -= 1
        if (self.smsCountdown <= 0) self.clearSmsTimer()
      }, 1000)
    },
    async sendSms() {
      if (!this.phoneOk()) {
        uni.showToast({ title: '请输入正确手机号', icon: 'none' })
        return
      }
      if (this.smsCountdown > 0) return
      this.smsSending = true
      try {
        const data = await mpAuthApi.sendSms({
          phone: this.phone,
          login_account: this.phone,
          account: this.phone
        })
        if (data && data.debug_code) this.code = String(data.debug_code)
        uni.showToast({ title: '验证码已发送', icon: 'none' })
        this.startSmsCountdown()
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      } finally {
        this.smsSending = false
      }
    },
    async loginBySms() {
      const phone = String(this.phone || '').trim()
      const code = String(this.code || '').trim()
      if (!this.phoneOk()) {
        uni.showToast({ title: '请输入正确手机号', icon: 'none' })
        return
      }
      if (!code) {
        uni.showToast({ title: '请输入验证码', icon: 'none' })
        return
      }
      this.smsLoading = true
      try {
        const data = await mpAuthApi.loginBySms({
          phone: phone,
          login_account: phone,
          account: phone,
          code: code
        })
        const token = data && data.access_token
        if (!token) {
          uni.showToast({ title: '登录失败', icon: 'none' })
          return
        }
        if (!hasMiniProgramAccess(data)) {
          uni.showToast({ title: '该账号无权使用小程序', icon: 'none' })
          return
        }
        setToken(token)
        resetInternalAccess()
        uni.reLaunch({ url: '/pages/generate/generate' })
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      } finally {
        this.smsLoading = false
      }
    },
    async onGetPhoneNumber(event) {
      const detail = (event && event.detail) || {}
      const errMsg = String(detail.errMsg || '')
      if (errMsg.includes('fail')) {
        uni.showToast({ title: '需要授权手机号才能登录', icon: 'none' })
        return
      }
      await this.bindWechatAndConfirm({
        code: detail.code,
        encrypted_data: detail.encryptedData,
        iv: detail.iv
      })
    },
    async bindWechatAndConfirm(wechatPayload) {
      if (!wechatPayload.code && !wechatPayload.encrypted_data) {
        uni.showToast({ title: '未获取到手机号', icon: 'none' })
        return
      }
      this.wechatLoading = true
      try {
        const jsCode = await this.getJsCode()
        if (!jsCode) {
          uni.showToast({ title: '微信登录码获取失败', icon: 'none' })
          return
        }
        const session = await mpAuthApi.loginByWechat({ code: jsCode })
        await mpAuthApi.bindWechatPhone({
          session_id: session.session_id,
          code: wechatPayload.code,
          encrypted_data: wechatPayload.encrypted_data,
          iv: wechatPayload.iv
        })
        const data = await mpAuthApi.confirmLogin({ session_id: session.session_id })
        setToken(data.access_token)
        uni.reLaunch({ url: '/pages/generate/generate' })
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      } finally {
        this.wechatLoading = false
      }
    },
    getJsCode() {
      return new Promise((resolve, reject) => {
        uni.login({
          success: (res) => resolve(res.code),
          fail: reject
        })
      })
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #fff;
  padding: 72px 32px 32px;
  box-sizing: border-box;
}
.hero {
  margin-bottom: 28px;
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
  margin: 16px auto 0;
  padding: 8px 16px;
  border: 1px solid #BE2D22;
  border-radius: 6px;
}
.notice text {
  color: #BE2D22;
  font-size: 14px;
  line-height: 20px;
}
.form {
  margin-top: 8px;
}
.field {
  height: 46px;
  margin-bottom: 14px;
  padding: 0 20px;
  border: 1px solid #e6e0dc;
  border-radius: 23px;
  background: #fff;
  font-size: 15px;
  color: #2b2422;
  box-sizing: border-box;
}
.code-row {
  display: flex;
  align-items: center;
  margin-bottom: 14px;
}
.code-field {
  flex: 1;
  margin-bottom: 0;
  margin-right: 10px;
}
.sms {
  width: 118px;
  height: 46px;
  line-height: 46px;
  padding: 0 8px;
  border-radius: 23px;
  font-size: 13px;
  color: #BE2D22;
  background: #fff;
  border: 1px solid #BE2D22;
}
.sms::after {
  border: none;
}
.placeholder {
  color: #b8b0aa;
  font-size: 15px;
}
.primary {
  height: 46px;
  margin-top: 8px;
  line-height: 46px;
  border-radius: 23px;
  font-size: 16px;
  color: #fff;
  background: #BE2D22;
}
.primary::after {
  border: none;
}
.btn-wrap {
  position: relative;
  margin-top: 14px;
}
.wechat {
  height: 46px;
  line-height: 46px;
  border-radius: 23px;
  font-size: 16px;
  color: #fff;
  background: #07c160;
}
.wechat::after {
  border: none;
}
</style>
