<template>
  <view v-if="internalAccessGranted" class="page">
    <view class="tab-switch">
      <view class="tab" :class="{ active: activeTab === 'forms' }" @click="switchTab('forms')">需求清单</view>
      <view class="tab" :class="{ active: activeTab === 'records' }" @click="switchTab('records')">需求清单记录</view>
    </view>

    <view v-if="activeTab === 'forms'" class="panel">
      <view v-for="item in formItems" :key="item.id" class="form-card">
        <text class="form-title">{{ item.title }}</text>
        <text class="form-subtitle">{{ item.subtitle }}</text>
        <view class="form-desc"><text>{{ item.description }}</text></view>
        <text class="signature">{{ employeeSignature }}</text>
        <view class="form-actions">
          <button class="primary" @click="startFill(item)">开始填写</button>
          <button class="outline" open-type="share" :data-type="item.id" @click="prepareShare(item)">分享</button>
        </view>
      </view>
    </view>

    <view v-else class="panel records">
      <scroll-view scroll-x class="filters" :show-scrollbar="false">
        <view
          v-for="item in categories"
          :key="item.id"
          class="filter"
          :class="{ active: recordCategory === item.id }"
          @click="changeRecordCategory(item.id)"
        >{{ item.label }}</view>
      </scroll-view>
      <view v-if="recordsLoading && !records.length" class="state">正在加载记录…</view>
      <view v-else-if="recordsError" class="state">
        <text>{{ recordsError }}</text>
        <button class="retry" @click="loadRecords(true)">重新加载</button>
      </view>
      <view v-else-if="!filteredRecords.length" class="state">
        <text>{{ recordCategory ? '该分类暂无提交记录' : '暂无提交记录' }}</text>
        <text class="state-note">请点击上方卡片「开始填写」，按原型问卷提交后会出现在此列表（与 PC 同源）。</text>
        <button class="retry" @click="openNewFill">去填写需求清单</button>
      </view>
      <view v-for="item in filteredRecords" :key="item.id" class="record-card" @click="onRecordClick(item)">
        <view class="record-head">
          <view>
            <text class="form-title">{{ item.title || item.form_title || '需求清单' }}</text>
            <text class="form-subtitle">{{ item.subtitle || item.form_subtitle || '' }}</text>
          </view>
          <text v-if="completionLabel(item)" class="completion">{{ completionLabel(item) }}</text>
        </view>
        <view v-if="item.description || item.summary" class="form-desc"><text>{{ item.description || item.summary }}</text></view>
        <view v-if="customerLine(item)" class="customer-pill"><text>{{ customerLine(item) }}</text></view>
        <view class="record-foot">
          <text>提交时间：{{ formatTime(item.submitted_at || item.created_at) }}</text>
          <text class="detail">查看详情 ›</text>
        </view>
      </view>
      <view v-if="filteredRecords.length" class="list-footer">
        <text v-if="recordsLoading">正在加载…</text>
        <text v-else-if="records.length < recordsTotal" @click="loadRecords(false)">加载更多</text>
        <text v-else>已显示全部记录</text>
      </view>
    </view>

  </view>
</template>

<script>
import { mpMeApi, mpRequirementListApi } from '../../apis/mp'
import { errorMessage } from '../../utils/request'
import { internalPageMixin } from '../../utils/internal-access'
import { employeeFromMe } from '../../utils/internal-access-policy.mjs'
import { readPersistedEmployeeCode, resolveRequirementListUserCode } from '../../utils/requirement-list-employee.mjs'
import {
  REQUIREMENT_FORM_CATEGORIES,
  REQUIREMENT_FORM_ITEMS,
  employeeRequirementSignature
} from '../../utils/requirement-list-catalog.mjs'
import {
  formatRequirementRecordTime,
  matchesRequirementCategory,
  normalizeRequirementRecordList,
  requirementRecordCompletion,
  requirementRecordCustomerLine
} from '../../utils/requirement-list-records.mjs'
import { buildRequirementListSharePath } from '../../utils/requirement-list-share.mjs'

export default {
  mixins: [internalPageMixin],
  data() {
    return {
      shareTypeId: 'rough',
      activeTab: 'forms',
      employee: {},
      formItems: REQUIREMENT_FORM_ITEMS,
      categories: REQUIREMENT_FORM_CATEGORIES,
      recordCategory: '',
      records: [],
      recordsTotal: 0,
      recordsPage: 0,
      recordsLoading: false,
      recordsError: ''
    }
  },
  computed: {
    employeeSignature() {
      return employeeRequirementSignature(this.employee)
    },
    filteredRecords() {
      return this.records.filter((item) => matchesRequirementCategory(item, this.recordCategory))
    }
  },
  async onShow() {
    if (!(await this.ensureInternalAccess())) return
    await this.loadEmployee()
    if (this.activeTab === 'records' && !this._recordsLoaded) this.loadRecords(true)
    if (this._refreshRecordsOnShow) {
      this._refreshRecordsOnShow = false
      this.activeTab = 'records'
      this.loadRecords(true)
    }
  },
  onShareAppMessage(res) {
    const dataset = res && res.target && res.target.dataset
    const typeId = (dataset && dataset.type) || this.shareTypeId || 'rough'
    const item = this.formItems.find((entry) => entry.id === typeId) || this.formItems[0]
    const code = this.employee.employee_code || readPersistedEmployeeCode()
    return {
      title: `${item ? item.title : '需求清单'} · 鸿扬家居`,
      path: buildRequirementListSharePath({ typeId: item ? item.id : typeId, staffCode: code })
    }
  },
  methods: {
    prepareShare(item) {
      if (item && item.id) this.shareTypeId = item.id
    },
    formatTime: formatRequirementRecordTime,
    customerLine: requirementRecordCustomerLine,
    completionLabel: requirementRecordCompletion,
    switchTab(tab) {
      this.activeTab = tab
      if (tab === 'records') this.loadRecords(true)
    },
    changeRecordCategory(categoryId) {
      this.recordCategory = categoryId
    },
    async loadEmployee() {
      try {
        const data = await mpMeApi.get()
        this.employee = employeeFromMe(data) || {}
      } catch (error) {
        const code = readPersistedEmployeeCode()
        this.employee = code ? { employee_code: code } : {}
      }
    },
    startFill(item) {
      const staff = resolveRequirementListUserCode(this.employee) || readPersistedEmployeeCode()
      const staffQuery = staff ? `&staff=${encodeURIComponent(staff)}` : ''
      uni.navigateTo({
        url: `/pages/mine/requirement-list-fill?type=${encodeURIComponent(item.id)}${staffQuery}`,
        events: {
          requirementSubmitted: () => {
            this._refreshRecordsOnShow = true
          }
        }
      })
    },
    openNewFill() {
      if (!this.formItems.length) return
      this.startFill(this.formItems[0])
    },
    onRecordClick(item) {
      if (!item || !item.id) return
      uni.navigateTo({ url: `/pages/mine/requirement-list-fill?id=${encodeURIComponent(item.id)}` })
    },
    async loadRecords(reset) {
      if (this.recordsLoading && !reset) return
      const page = reset ? 1 : this.recordsPage + 1
      this.recordsLoading = true
      if (reset) {
        this.records = []
        this.recordsTotal = 0
        this.recordsPage = 0
        this.recordsError = ''
      }
      try {
        const data = await mpRequirementListApi.list({
          page,
          page_size: 20
        })
        const rows = normalizeRequirementRecordList(data)
        const total = Number(data && (data.total ?? data.count)) || rows.length
        const known = new Set(this.records.map((item) => item.id))
        this.records = reset ? rows : [...this.records, ...rows.filter((item) => !known.has(item.id))]
        this.recordsTotal = total
        this.recordsPage = page
        this._recordsLoaded = true
      } catch (error) {
        if (reset) this.recordsError = errorMessage(error) || '记录暂时无法加载'
      } finally {
        this.recordsLoading = false
      }
    }
  }
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f3f3f3; padding: 12px 12px 24px; box-sizing: border-box; }
.tab-switch { display: flex; gap: 8px; margin-bottom: 12px; }
.tab {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  border-radius: 8px;
  border: 1px solid #b40018;
  color: #b40018;
  font-size: 15px;
  background: #fff;
}
.tab.active { background: #b40018; color: #fff; }
.panel { display: flex; flex-direction: column; gap: 12px; }
.form-card, .record-card {
  background: #fff;
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.form-title { display: block; font-size: 18px; font-weight: 600; color: #222; }
.form-subtitle { display: block; margin-top: 4px; font-size: 14px; color: #666; }
.form-desc {
  margin-top: 10px;
  background: #f6f6f6;
  border-radius: 8px;
  padding: 12px;
  font-size: 13px;
  color: #555;
  line-height: 1.6;
}
.signature { display: block; margin-top: 10px; font-size: 13px; color: #888; }
.form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 12px; }
.primary, .outline, .retry {
  margin: 0;
  font-size: 14px;
  line-height: 2.2;
  border-radius: 6px;
  padding: 0 16px;
}
.primary { background: #d5262b; color: #fff; }
.primary::after, .outline::after, .retry::after { border: 0; }
.outline { background: #fff; color: #d5262b; border: 1px solid #d5262b; }
.filters { white-space: nowrap; margin-bottom: 8px; }
.filter {
  display: inline-block;
  padding: 8px 12px;
  font-size: 14px;
  color: #666;
  margin-right: 8px;
}
.filter.active { color: #3478ff; border-bottom: 2px solid #3478ff; }
.record-head { display: flex; justify-content: space-between; gap: 8px; }
.completion { color: #52b14f; font-size: 13px; flex-shrink: 0; }
.customer-pill {
  margin-top: 10px;
  background: #f3f3f3;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
  color: #444;
}
.record-foot {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #999;
}
.detail { color: #666; }
.state { padding: 36px 12px; text-align: center; color: #777; font-size: 14px; line-height: 1.7; }
.state-note { display: block; margin-top: 8px; font-size: 12px; color: #999; }
.retry { margin-top: 12px; color: #3478ff; background: #edf3ff; }
.outline-retry { color: #d5262b; background: #fff4f4; }
.list-footer { text-align: center; padding: 12px 0 4px; font-size: 13px; color: #888; }
</style>
