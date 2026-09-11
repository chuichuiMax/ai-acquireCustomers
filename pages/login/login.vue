<template>
  <view class="page">
    <view class="hero">
      <image class="logo" src="/static/hirun-logo.png" mode="aspectFit" />
      <text class="title">AI获客平台</text>
    </view>

    <view class="field">
      <input class="field-input" v-model="phone" type="number" maxlength="11" placeholder="请输入手机号码" />
    </view>
    <view class="field code-field">
      <input class="field-input" v-model="code" type="number" maxlength="6" placeholder="请输入验证码" />
      <text class="sms-link" :class="{ disabled: countdown > 0 || sending }" @click="sendSms">
        {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
      </text>
    </view>

    <view class="btn-wrap">
      <button class="primary" :loading="logging" @click="loginBySms">登录</button>
    </view>
    <view class="btn-wrap">
      <!-- #ifdef MP-WEIXIN -->
      <button
        class="wechat"
        open-type="getPhoneNumber"
        :loading="wechatLoading"
        @getphonenumber="onGetPhoneNumber"
      >
        一键登录
      </button>
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <button class="wechat" :loading="wechatLoading" @click="loginByPhoneFallback">一键登录</button>
      <!-- #endif -->
    </view>
  </view>
</template>

<script>
import { mpAuthApi } from '../../apis/mp'
import { SESSION_KEY, TOKEN_KEY } from '../../config'
import { errorMessage, setToken } from '../../utils/request'

export default {
  data() {
    return {
      phone: '',
      code: '',
      sending: false,
      logging: false,
      wechatLoading: false,
      countdown: 0,
      timer: null
    }
  },
  onUnload() {
    if (this.timer) clearInterval(this.timer)
  },
  onShow() {
    const token = uni.getStorageSync(TOKEN_KEY)
    if (token) {
      uni.reLaunch({ url: '/pages/generate/generate' })
    }
  },
  methods: {
    phoneOk() {
      return /^1[3-9]\d{9}$/.test(this.phone)
    },
    async sendSms() {
      if (this.countdown > 0 || this.sending) return
      if (!this.phoneOk()) {
        uni.showToast({ title: '请输入正确手机号', icon: 'none' })
        return
      }
      this.sending = true
      try {
        const data = await mpAuthApi.sendSms({ phone: this.phone })
        if (data.debug_code) this.code = data.debug_code
        this.countdown = 60
        this.timer = setInterval(() => {
          this.countdown -= 1
          if (this.countdown <= 0 && this.timer) {
            clearInterval(this.timer)
            this.timer = null
          }
        }, 1000)
        uni.showToast({ title: '验证码已发送', icon: 'none' })
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      } finally {
        this.sending = false
      }
    },
    async loginBySms() {
      if (!this.phone) {
        uni.showToast({ title: '请输入手机号码', icon: 'none' })
        return
      }
      if (!this.phoneOk()) {
        uni.showToast({ title: '请输入正确手机号', icon: 'none' })
        return
      }
      if (!this.code) {
        uni.showToast({ title: '请输入验证码', icon: 'none' })
        return
      }
      this.logging = true
      try {
        const data = await mpAuthApi.loginBySms({ phone: this.phone, code: this.code })
        setToken(data.access_token)
        uni.reLaunch({ url: '/pages/generate/generate' })
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      } finally {
        this.logging = false
      }
    },
    wechatPhoneFrom(detail) {
      const info = (detail && (detail.phone_info || detail.phoneInfo)) || {}
      const raw = String(
        (detail && (detail.phoneNumber || detail.purePhoneNumber)) ||
          info.phoneNumber ||
          info.purePhoneNumber ||
          ''
      ).replace(/\D/g, '')
      const phone = raw.startsWith('86') && raw.length === 13 ? raw.slice(2) : raw
      return /^1[3-9]\d{9}$/.test(phone) ? phone : ''
    },
    async loginByPhoneFallback() {
      await this.bindWechatAndConfirm({ phone: this.phoneOk() ? this.phone : '' })
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
        iv: detail.iv,
        phone: this.wechatPhoneFrom(detail) || (this.phoneOk() ? this.phone : '')
      })
    },
    async bindWechatAndConfirm(phonePayload) {
      if (!phonePayload.code && !phonePayload.encrypted_data && !phonePayload.phone) {
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
        const bound = await mpAuthApi.bindWechatPhone({
          session_id: session.session_id,
          code: phonePayload.code,
          encrypted_data: phonePayload.encrypted_data,
          iv: phonePayload.iv,
          phone: phonePayload.phone || undefined
        })
        uni.setStorageSync(SESSION_KEY, {
          session_id: session.session_id,
          phone_masked: bound.phone_masked,
          name: bound.name
        })
        uni.navigateTo({ url: '/pages/login/confirm' })
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      } finally {
        this.wechatLoading = false
      }
    },
    getJsCode() {
      return new Promise((resolve, reject) => {
        // #ifdef MP-WEIXIN
        uni.login({
          success: (res) => resolve(res.code),
          fail: reject
        })
        // #endif
        // #ifndef MP-WEIXIN
        resolve('dev-code')
        // #endif
      })
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #fff;
  padding: 48px 32px 32px;
}
.hero {
  margin-bottom: 36px;
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
  margin-top: 4px;
  font-size: 18px;
  color: #2b2422;
}
.field {
  height: 46px;
  margin-bottom: 14px;
  padding: 0 14px;
  border: 1px solid #e4ddd8;
  border-radius: 8px;
  background: #fff;
}
.code-field {
  display: flex;
  align-items: center;
}
.field-input {
  flex: 1;
  height: 46px;
  font-size: 15px;
}
.sms-link {
  flex-shrink: 0;
  margin-left: 8px;
  color: #3b82f6;
  font-size: 14px;
}
.sms-link.disabled {
  color: #b8b0aa;
}
.btn-wrap {
  position: relative;
  margin-top: 10px;
}
.primary {
  height: 46px;
  line-height: 46px;
  border-radius: 8px;
  font-size: 16px;
  color: #fff;
  background: #BE2D22;
}
.wechat {
  height: 46px;
  line-height: 46px;
  border-radius: 8px;
  font-size: 16px;
  color: #fff;
  background: #07c160;
}
.primary::after {
  border: none;
}
.wechat::after {
  border: none;
}
</style>
