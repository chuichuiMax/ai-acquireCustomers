<template>
  <view class="page">
    <view class="profile">
      <image class="avatar" :src="avatarSrc" mode="aspectFit" />
      <view>
        <text class="name">{{ employee.name || '未登录' }}</text>
        <text class="account">账号 {{ employee.login_account || '-' }}</text>
        <text class="login">最近登录 {{ employee.last_login_at || '-' }}</text>
      </view>
    </view>
    <view class="card" @click="goBio">
      <text class="label">简介</text>
      <text class="bio">{{ employee.bio || '点击填写简介' }}</text>
    </view>
    <view class="banner">
      <image class="banner-logo" src="/static/hirun-logo.png" mode="aspectFit" />
    </view>
    <button class="logout" @click="logout">退出登录</button>
    <tab-bar current="mine" />
  </view>
</template>

<script>
import TabBar from '../../components/tab-bar.vue'
import { mpAuthApi, mpMeApi } from '../../apis/mp'
import { errorMessage, setToken } from '../../utils/request'

export default {
  components: { TabBar },
  data() {
    return { employee: {} }
  },
  computed: {
    avatarSrc() {
      return this.employee.avatar || '/static/hirun-logo.png'
    }
  },
  onShow() {
    this.load()
  },
  methods: {
    async load() {
      try {
        const data = await mpMeApi.get()
        this.employee = data.employee || {}
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      }
    },
    goBio() {
      uni.navigateTo({ url: '/pages/mine/bio' })
    },
    async logout() {
      try {
        await mpAuthApi.logout()
      } catch (error) {
        /* 本地退出即可 */
      }
      setToken('')
      uni.reLaunch({ url: '/pages/login/login' })
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f4f1ee;
  padding: 20px 16px 90px;
}
.profile {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}
.avatar {
  width: 64px;
  height: 64px;
  border-radius: 32px;
  background: #fff;
  flex-shrink: 0;
  border: 1px solid #eee8e4;
}
.name {
  display: block;
  font-size: 20px;
  font-weight: 700;
}
.account,
.login {
  display: block;
  margin-top: 4px;
  color: #8a817c;
  font-size: 12px;
}
.card,
.banner {
  background: #fff;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 12px;
}
.label {
  display: block;
  color: #8a817c;
  font-size: 12px;
}
.bio {
  display: block;
  margin-top: 8px;
  color: #2b2422;
}
.banner {
  background: #fff;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 88px;
}
.banner-logo {
  width: 180px;
  height: 72px;
}
.logout {
  height: 44px;
  line-height: 44px;
  border-radius: 12px;
  background: #fff;
  color: #c0392b;
}
</style>
