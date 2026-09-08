<template>
  <view class="page">
    <view class="close" @click="cancel">×</view>
    <image class="logo" src="/static/hirun-logo.png" mode="aspectFit" />
    <text class="title">登录确认</text>
    <view class="actions">
      <button class="primary" :loading="confirming" @click="confirm">登录</button>
      <text class="cancel" @click="cancel">取消登录</text>
    </view>
  </view>
</template>

<script>
import { mpAuthApi } from '../../apis/mp'
import { SESSION_KEY } from '../../config'
import { errorMessage, setToken } from '../../utils/request'

export default {
  data() {
    return {
      sessionId: '',
      avatar: '',
      confirming: false
    }
  },
  onLoad() {
    const session = uni.getStorageSync(SESSION_KEY) || {}
    this.sessionId = session.session_id
    this.avatar = session.avatar || ''
  },
  methods: {
    async confirm() {
      if (!this.sessionId) {
        uni.showToast({ title: '登录会话已失效', icon: 'none' })
        return
      }
      this.confirming = true
      try {
        const data = await mpAuthApi.confirmLogin({
          session_id: this.sessionId,
          avatar: this.avatar || undefined
        })
        setToken(data.access_token)
        uni.removeStorageSync(SESSION_KEY)
        uni.reLaunch({ url: '/pages/generate/generate' })
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      } finally {
        this.confirming = false
      }
    },
    async cancel() {
      try {
        if (this.sessionId) await mpAuthApi.cancelLogin({ session_id: this.sessionId })
      } catch (error) {
        /* 取消失败仍返回登录页 */
      }
      uni.removeStorageSync(SESSION_KEY)
      uni.reLaunch({ url: '/pages/login/login' })
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #fff;
  padding: 24px 28px 48px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.close {
  align-self: flex-start;
  width: 32px;
  height: 32px;
  line-height: 28px;
  font-size: 28px;
  color: #333;
}
.logo {
  width: 180px;
  height: 68px;
  margin-top: 28px;
}
.title {
  margin-top: 24px;
  font-size: 20px;
  color: #222;
}
.actions {
  margin-top: auto;
  width: 100%;
  text-align: center;
  padding-bottom: 24px;
}
.primary {
  height: 44px;
  line-height: 44px;
  background: #2f80ed;
  color: #fff;
  font-size: 16px;
  border-radius: 4px;
}
.primary::after {
  border: none;
}
.cancel {
  display: block;
  margin-top: 18px;
  color: #222;
  font-size: 15px;
}
</style>
