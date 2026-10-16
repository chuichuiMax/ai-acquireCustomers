<template>
  <view v-if="internalAccessGranted" class="page">
    <view class="profile">
      <image class="avatar" :src="avatarSrc" mode="aspectFill" />
      <view class="profile-copy">
        <text class="account-line">账号：{{ employee.login_account || '-' }}</text>
        <text class="login-line">上次登录时间：{{ lastLoginDisplay }}</text>
      </view>
    </view>

    <view class="brand-banner">
      <text class="brand-title">鸿扬家居</text>
      <text class="brand-subtitle">高标准选鸿扬</text>
    </view>

    <view class="menu-card">
      <view
        v-for="item in menuItems"
        :key="item.key"
        class="menu-row"
        @click="openMenu(item)"
      >
        <view class="menu-left">
          <view class="menu-icon" />
          <text>{{ item.label }}</text>
        </view>
        <view class="menu-right">
          <text v-if="item.badge" class="badge">{{ item.badge }}</text>
          <text class="arrow">›</text>
        </view>
      </view>
    </view>

    <view class="logout-row" @click="logout">
      <view class="menu-left">
        <view class="menu-icon" />
        <text>退出登录</text>
      </view>
      <text class="arrow">›</text>
    </view>

    <tab-bar current="mine" />
  </view>
</template>

<script>
import TabBar from '../../components/tab-bar.vue'
import { mpAuthApi, mpMeApi } from '../../apis/mp'
import { errorMessage, setToken } from '../../utils/request'
import { internalPageMixin } from '../../utils/internal-access'

export default {
  components: { TabBar },
  mixins: [internalPageMixin],
  data() {
    return {
      employee: {},
      menuItems: [
        { key: 'materials', label: '我的素材', url: '/pages/mine/uploads' },
        { key: 'enterprise', label: '企业共享', url: '/pages/mine/enterprise' },
        { key: 'records', label: '生产记录', url: '/pages/manage/manage' },
        { key: 'leads', label: '我的客资', url: '', badge: 0 }
      ]
    }
  },
  computed: {
    avatarSrc() {
      return this.employee.avatar || '/static/hirun-logo.png'
    },
    lastLoginDisplay() {
      return this.employee.last_login_at || '-'
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
        const badge = Number(data.leads_pending_count || data.customer_leads_count || 0)
        this.menuItems = this.menuItems.map((item) =>
          item.key === 'leads' ? { ...item, badge: badge > 0 ? badge : 0 } : item
        )
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      }
    },
    openMenu(item) {
      if (!item.url) {
        uni.showToast({ title: '我的客资即将上线', icon: 'none' })
        return
      }
      uni.navigateTo({ url: item.url })
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
  background: #fff;
  padding: 12px 0 calc(90px + env(safe-area-inset-bottom));
}
.profile {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 8px 20px 18px;
}
.avatar {
  width: 72px;
  height: 72px;
  border-radius: 36px;
  background: #f4f1ee;
  flex-shrink: 0;
}
.profile-copy {
  flex: 1;
  min-width: 0;
}
.account-line,
.login-line {
  display: block;
  color: #6f6762;
  font-size: 13px;
  line-height: 1.6;
}
.brand-banner {
  margin: 0 16px 18px;
  padding: 22px 18px;
  border-radius: 10px;
  background: linear-gradient(135deg, #c62828 0%, #be2d22 100%);
  text-align: center;
}
.brand-title {
  display: block;
  color: #fff;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 2px;
}
.brand-subtitle {
  display: block;
  margin-top: 6px;
  color: rgba(255, 255, 255, .92);
  font-size: 13px;
}
.menu-card {
  margin: 0 16px;
  border-top: 1px solid #ece7e3;
}
.menu-row,
.logout-row {
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
  border-bottom: 1px solid #ece7e3;
  color: #2b2422;
  font-size: 15px;
}
.logout-row {
  margin: 0 16px;
}
.menu-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.menu-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  background: linear-gradient(180deg, #d8d2cc 0%, #b8b0a8 100%);
  clip-path: polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0 50%);
}
.menu-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  color: #fff;
  background: #be2d22;
  font-size: 11px;
  line-height: 18px;
  text-align: center;
}
.arrow {
  color: #b5ada6;
  font-size: 22px;
  line-height: 1;
}
</style>
