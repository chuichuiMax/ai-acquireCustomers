<template>
  <view class="page">
    <view class="hero">
      <image class="logo" src="/static/hirun-logo.png" mode="aspectFit" />
      <text class="title">AI获客平台</text>
    </view>

    <view class="field">
      <input class="field-input" v-model="phone" type="number" maxlength="11" placeholder="请输入手机号码" />
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
import { errorMessage, setToken } from '../../utils/request'
import { requireInternalAccess } from '../../utils/internal-access'

export default {
  data() {
    return {
      phone: '',
      wechatLoading: false
    }
  },
  async onShow() {
    if (await requireInternalAccess({ redirect: false })) {
      uni.reLaunch({ url: '/pages/generate/generate' })
    }
  },
  methods: {
    phoneOk() {
      return /^1[3-9]\d{9}$/.test(this.phone)
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
        await mpAuthApi.bindWechatPhone({
          session_id: session.session_id,
          code: phonePayload.code,
          encrypted_data: phonePayload.encrypted_data,
          iv: phonePayload.iv,
          phone: phonePayload.phone || undefined
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
.field-input {
  flex: 1;
  height: 46px;
  font-size: 15px;
}
.btn-wrap {
  position: relative;
  margin-top: 10px;
}
.wechat {
  height: 46px;
  line-height: 46px;
  border-radius: 8px;
  font-size: 16px;
  color: #fff;
  background: #07c160;
}
.wechat::after {
  border: none;
}
</style>
