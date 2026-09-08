<template>
  <view class="page">
    <textarea v-model="bio" maxlength="200" placeholder="请输入个人简介" />
    <button class="primary" :loading="saving" @click="save">确定</button>
  </view>
</template>

<script>
import { mpMeApi } from '../../apis/mp'
import { errorMessage } from '../../utils/request'

export default {
  data() {
    return { bio: '', saving: false }
  },
  async onLoad() {
    try {
      const data = await mpMeApi.get()
      this.bio = (data.employee && data.employee.bio) || ''
    } catch (error) {
      uni.showToast({ title: errorMessage(error), icon: 'none' })
    }
  },
  methods: {
    async save() {
      this.saving = true
      try {
        await mpMeApi.update({ bio: this.bio })
        uni.navigateBack()
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f4f1ee;
  padding: 16px;
}
textarea {
  width: 100%;
  height: 180px;
  background: #fff;
  border-radius: 12px;
  padding: 12px;
  box-sizing: border-box;
}
.primary {
  margin-top: 16px;
  height: 46px;
  line-height: 46px;
  border-radius: 12px;
  color: #fff;
  background: #b44a3a;
}
</style>
