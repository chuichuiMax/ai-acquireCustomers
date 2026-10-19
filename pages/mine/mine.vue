<template>
  <view v-if="internalAccessGranted" class="page">
    <view class="profile">
      <image class="avatar" :src="avatarSrc" mode="aspectFill" />
      <view class="profile-copy">
        <text class="display-name">{{ displayName }}</text>
        <text class="meta-line">账号 {{ employee.login_account || '-' }}</text>
        <text class="meta-line">最近登录 {{ lastLoginDisplay }}</text>
      </view>
    </view>

    <view class="menu-card">
      <view class="menu-row" @click="openMaterials">
        <text class="menu-label">我的素材</text>
        <text class="arrow">›</text>
      </view>
      <view class="menu-row" @click="openEnterprise">
        <text class="menu-label">企业共享</text>
        <text class="arrow">›</text>
      </view>
    </view>

    <button class="logout" @click="logout">退出登录</button>

    <tab-bar current="mine" />
  </view>
</template>

<script>
import TabBar from '../../components/tab-bar.vue'
import { mpAuthApi, mpMeApi } from '../../apis/mp'
import { errorMessage, setToken } from '../../utils/request'
import { internalPageMixin } from '../../utils/internal-access'
import { safeReLaunch } from '../../utils/safe-navigation'

export default {
  components: { TabBar },
  mixins: [internalPageMixin],
  data() {
    return {
      employee: {}
    }
  },
  computed: {
    avatarSrc() {
      return this.employee.avatar || '/static/hirun-logo.png'
    },
    displayName() {
      return (this.employee.name || '').trim() || '未登录'
    },
    lastLoginDisplay() {
      const raw = this.employee.last_login_at || ''
      if (!raw) return '-'
      return String(raw).replace('T', ' ').slice(0, 16)
    }
  },
  async onShow() {
    if (!(await this.ensureInternalAccess())) return
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
    openMaterials() {
      uni.navigateTo({ url: '/pages/mine/uploads' })
    },
    openEnterprise() {
      uni.navigateTo({ url: '/pages/mine/enterprise' })
    },
    async logout() {
      try {
        await mpAuthApi.logout()
      } catch (error) {
        /* 本地退出即可 */
      }
      setToken('')
      safeReLaunch('/pages/login/login')
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 16px 16px calc(90px + env(safe-area-inset-bottom));
  background: #f4f1ee;
}
.profile {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 8px 4px 24px;
}
.avatar {
  width: 72px;
  height: 72px;
  border-radius: 36px;
  background: #fff;
  flex-shrink: 0;
}
.profile-copy {
  flex: 1;
  min-width: 0;
}
.display-name {
  display: block;
  margin-bottom: 6px;
  color: #231f1d;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.25;
}
.meta-line {
  display: block;
  color: #8a817c;
  font-size: 13px;
  line-height: 1.55;
}
.menu-card {
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}
.menu-row {
  min-height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid #f0ebe6;
}
.menu-row:last-child {
  border-bottom: none;
}
.menu-label {
  color: #2b2422;
  font-size: 16px;
}
.arrow {
  color: #c4bcb5;
  font-size: 22px;
  line-height: 1;
}
.logout {
  margin-top: 48px;
  height: 48px;
  border: none;
  border-radius: 24px;
  color: #fff;
  font-size: 16px;
  line-height: 48px;
  background: #BE2D22;
}
.logout::after {
  border: none;
}
</style>
