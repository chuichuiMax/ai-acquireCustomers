<template>
  <view class="page">
    <view class="hero">
      <image class="logo" src="/static/hirun-logo.png" mode="aspectFit" />
      <text class="title">鸿扬获客</text>
      <view class="notice">
        <text>该小程序仅限于鸿扬内部员工登入</text>
      </view>
    </view>

    <view class="btn-wrap">
      <button
        class="wechat"
        open-type="getPhoneNumber"
        :loading="wechatLoading"
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
import { requireInternalAccess } from '../../utils/internal-access'

export default {
  data() {
    return {
      wechatLoading: false
    }
  },
  async onShow() {
    if (await requireInternalAccess({ redirect: false })) {
      uni.reLaunch({ url: '/pages/generate/generate' })
    }
  },
  methods: {
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
.btn-wrap {
  position: relative;
  margin-top: 24px;
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
