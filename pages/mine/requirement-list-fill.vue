<template>
  <view v-if="internalAccessGranted || guestShare" class="page">
  <view v-if="effectivePreview" class="preview-shell">
    <scroll-view scroll-y class="preview-scroll" :show-scrollbar="true">
      <view class="preview-card head-card">
        <view class="preview-head-row">
          <text class="preview-type">{{ requirementType }}</text>
          <text class="preview-percent">已填 {{ completion.percent }}%</text>
        </view>
        <text class="preview-sub">{{ formTitle }}</text>
        <text class="preview-tip">以下为当前已填写的全部内容，提交前可返回任一步骤修改。</text>
        <text class="preview-status">{{ readonly ? '已提交' : '未提交' }}</text>
      </view>

      <view class="preview-card">
        <view class="preview-tools">
          <text class="preview-count">填写内容 · 共 {{ completion.total }} 题</text>
          <text class="preview-filter" :class="{ on: previewFilledOnly }" @click="previewFilledOnly = !previewFilledOnly">仅看已填</text>
        </view>
        <text class="preview-note">带「—」为未填项；提交前仍可返回修改。</text>
        <view v-for="(row, index) in filteredPreviewRows" :key="index" class="preview-row">
          <text class="preview-label">{{ row.label }}</text>
          <text class="preview-value" :class="{ empty: !rowDisplay(row) }">{{ rowDisplay(row) || '—' }}</text>
        </view>
      </view>

      <view v-if="!readonly && !guestShare" class="preview-card">
        <text class="lbl">分享人工号</text>
        <input v-model="staffCode" class="txt" />
      </view>
    </scroll-view>
    <view class="wizard-foot preview-foot">
      <view v-if="!readonly" class="foot-btn outline" @tap.stop="leavePreview">返回修改</view>
      <view v-if="readonly" class="foot-btn outline" @tap.stop="goBack">返回</view>
      <view v-if="!readonly" class="foot-btn primary" :class="{ loading: submitting }" @tap.stop="submitForm">提交</view>
    </view>
  </view>

  <view v-else class="wizard-shell">
    <view class="wizard-head">
      <text class="wizard-type">{{ requirementType }}</text>
      <view class="wizard-meta">
        <text class="wizard-step">第 {{ stepIndex + 1 }} / {{ stepCount }} 步 · {{ currentStep.title }}</text>
        <text class="wizard-percent">{{ completion.percent }}%</text>
      </view>
      <view class="progress-track"><view class="progress-fill" :style="{ width: progressWidth }" /></view>
    </view>

    <scroll-view scroll-y class="wizard-body" :show-scrollbar="true">
      <view v-if="stepIndex === 0" class="card">
        <text class="card-title">客户信息</text>
        <input v-model="address" class="txt block" placeholder="楼盘地址" />
        <view class="row-2">
          <input v-model="customerName" class="txt" placeholder="姓名" />
          <input v-model="phone" class="txt" type="number" maxlength="11" placeholder="手机号码" />
        </view>
        <text class="field-note">楼盘地址 / 姓名 / 手机至少填写一项即可提交</text>
      </view>

      <view v-for="question in stepQuestions" :key="question.key" class="card q-card">
        <view class="q-head">
          <text class="q-label">{{ question.title }}</text>
          <text v-if="question.kind === 'radio' || question.kind === 'check'" class="kind-tag">{{ kindLabel(question.kind) }}</text>
        </view>
        <template v-if="question.kind === 'area'">
          <input v-model="answers.q2_area" class="txt block" placeholder="房屋面积" />
          <text class="q-label sub">房型：</text>
          <input v-model="answers.q2_layout" class="txt block" placeholder="房型" />
        </template>
        <template v-else-if="question.kind === 'text'">
          <input
            v-model="answers[question.key]"
            class="txt block"
            :placeholder="question.placeholder || question.title"
          />
        </template>
        <template v-else-if="question.kind === 'groups'">
          <view v-for="(group, index) in question.groups" :key="group.label" class="sub-group">
            <text class="sg-label">{{ group.label }}</text>
            <view class="opts grid">
              <view
                v-for="option in group.options"
                :key="option"
                class="opt"
                :class="{ picked: answers[`${question.key}_${index}`] === option }"
                @click="pickRadio(`${question.key}_${index}`, option)"
              >
                <text>{{ option }}</text>
              </view>
            </view>
          </view>
        </template>
        <view v-else class="opts grid">
          <view
            v-for="option in question.options"
            :key="option"
            class="opt"
            :class="{ picked: question.kind === 'check' ? isChecked(question.key, option) : answers[question.key] === option }"
            @click="question.kind === 'check' ? toggleCheck(question.key, option) : pickRadio(question.key, option)"
          >
            <text>{{ option }}</text>
          </view>
          <input
            v-if="question.other"
            v-model="answers[`${question.key}_other`]"
            class="inline-txt"
            placeholder="其他说明"
          />
        </view>
      </view>

      <view v-if="stepIndex === stepCount - 1 && !guestShare" class="card">
        <text class="lbl">分享人工号</text>
        <input v-model="staffCode" class="txt block" />
      </view>
    </scroll-view>

    <view class="wizard-foot">
      <view class="foot-btn ghost" :class="{ disabled: stepIndex === 0 }" @tap.stop="prevStep">上一步</view>
      <view class="foot-btn outline" @tap.stop="openPreview">预览</view>
      <view v-if="stepIndex < stepCount - 1" class="foot-btn primary" @tap.stop="nextStep">下一步</view>
      <view v-else class="foot-btn primary" @tap.stop="openPreview">去提交</view>
    </view>
  </view>
  </view>
</template>

<script>
import { mpMeApi, mpRequirementListApi } from '../../apis/mp'
import { errorMessage } from '../../utils/request'
import { internalPageMixin } from '../../utils/internal-access'
import { employeeFromMe } from '../../utils/internal-access-policy.mjs'
import {
  readPersistedEmployeeCode,
  resolveRequirementListUserCode
} from '../../utils/requirement-list-employee.mjs'
import { REQUIREMENT_FORM_ITEMS, requirementTypeForForm } from '../../utils/requirement-list-catalog.mjs'
import {
  blankAnswers,
  cloneAnswers,
  completionOf,
  kindLabel,
  listPreviewEntries,
  mergeAnswers,
  questionsForStep,
  requirementFormPack,
  requirementFormPackByTypeName
} from '../../utils/requirement-list-form.mjs'
import { isRequirementGuestPageOptions } from '../../utils/requirement-list-share.mjs'

export default {
  mixins: [internalPageMixin],
  data() {
    return {
      guestShare: false,
      formTypeId: 'rough',
      questions: [],
      formSteps: [],
      requirementType: '毛坯房',
      formTitle: '',
      customerName: '',
      phone: '',
      address: '',
      staffCode: '',
      answers: {},
      readonly: false,
      submitting: false,
      stepIndex: 0,
      previewMode: false,
      previewFilledOnly: false
    }
  },
  computed: {
    stepCount() {
      return this.formSteps.length
    },
    currentStep() {
      return this.formSteps[this.stepIndex] || this.formSteps[0]
    },
    stepQuestions() {
      return questionsForStep(this.stepIndex, { questions: this.questions, steps: this.formSteps })
    },
    completion() {
      return completionOf({
        answers: this.answers,
        customerName: this.customerName,
        phone: this.phone,
        address: this.address,
        questions: this.questions
      })
    },
    progressWidth() {
      return `${this.completion.percent}%`
    },
    effectivePreview() {
      return this.previewMode || this.readonly
    },
    previewRows() {
      return listPreviewEntries({
        answers: this.answers,
        customerName: this.customerName,
        phone: this.phone,
        address: this.address,
        questions: this.questions
      })
    },
    filteredPreviewRows() {
      if (!this.previewFilledOnly) return this.previewRows
      return this.previewRows.filter((row) => this.rowDisplay(row))
    }
  },
  async onLoad(options) {
    const safeOptions = options || {}
    this.guestShare = isRequirementGuestPageOptions(safeOptions)
    if (this.guestShare) {
      this.staffCode = String(safeOptions.staff || safeOptions.usercode || '').trim()
      if (!this.staffCode) {
        uni.showToast({ title: '分享链接无效，缺少员工工号', icon: 'none' })
      }
    }
    const typeId = safeOptions.type ? safeOptions.type : 'rough'
    const form = REQUIREMENT_FORM_ITEMS.find((item) => item.id === typeId) || REQUIREMENT_FORM_ITEMS[0]
    this.requirementType = requirementTypeForForm(form)
    this.formTitle = form.subtitle
    this.applyFormPack(typeId)
    if (!this.guestShare) {
      const staffFromRoute = String(safeOptions.staff || safeOptions.usercode || '').trim()
      this.staffCode = staffFromRoute || readPersistedEmployeeCode()
    }
    uni.setNavigationBarTitle({ title: this.readonly ? '填写预览' : form.title })
  },
  async onShow() {
    if (this.guestShare) {
      this.internalAccessGranted = true
    } else if (!(await this.ensureInternalAccess())) {
      return
    }
    const pages = getCurrentPages()
    const current = pages[pages.length - 1]
    const options = (current && current.options) || {}
    if (!this.guestShare && !this.readonly) await this.loadStaffCode(true)
    if (options.id && !this._detailLoaded) {
      this.readonly = true
      this.previewMode = true
      await this.loadDetail(options.id)
      uni.setNavigationBarTitle({ title: '填写预览' })
    }
  },
  methods: {
    kindLabel,
    applyFormPack(typeId) {
      const pack = requirementFormPack(typeId)
      this.formTypeId = pack.id
      this.questions = pack.questions
      this.formSteps = pack.steps
      if (!this.readonly && !this._detailLoaded) {
        this.answers = blankAnswers(pack.questions)
      }
    },
    rowDisplay(row) {
      return String(row.value || '').trim()
    },
    openPreview() {
      this.previewMode = true
      uni.setNavigationBarTitle({ title: '填写预览' })
    },
    leavePreview() {
      this.previewMode = false
      const form = REQUIREMENT_FORM_ITEMS.find((item) => requirementTypeForForm(item) === this.requirementType)
      uni.setNavigationBarTitle({ title: form ? form.title : this.requirementType })
    },
    goBack() {
      uni.navigateBack()
    },
    prevStep() {
      if (this.stepIndex <= 0) return
      this.stepIndex -= 1
    },
    nextStep() {
      if (this.stepCount < 1 || this.stepIndex >= this.stepCount - 1) return
      this.stepIndex += 1
    },
    async loadStaffCode(force = false) {
      if (!force && String(this.staffCode || '').trim()) return
      const cached = readPersistedEmployeeCode()
      if (cached) this.staffCode = cached
      try {
        const data = await mpMeApi.get()
        const employee = employeeFromMe(data) || {}
        const code = resolveRequirementListUserCode(employee)
        if (code) this.staffCode = code
      } catch {
        if (!this.staffCode) this.staffCode = cached
      }
    },
    async loadDetail(id) {
      try {
        const detail = await mpRequirementListApi.get(id)
        this.requirementType = detail.requirement_type || this.requirementType
        const pack = requirementFormPackByTypeName(this.requirementType)
        this.formTypeId = pack.id
        this.questions = pack.questions
        this.formSteps = pack.steps
        this.customerName = detail.customer_name || ''
        this.phone = detail.phone || ''
        this.address = detail.address || ''
        this.staffCode = detail.employee_code || this.staffCode
        if (detail.answers) this.answers = mergeAnswers(detail.answers, pack.questions)
        this._detailLoaded = true
      } catch (error) {
        uni.showToast({ title: errorMessage(error) || '无法加载详情', icon: 'none' })
      }
    },
    pickRadio(key, value) {
      if (this.readonly) return
      this.answers[key] = value
    },
    isChecked(key, value) {
      const list = this.answers[key]
      return Array.isArray(list) && list.includes(value)
    },
    toggleCheck(key, value) {
      if (this.readonly) return
      const list = Array.isArray(this.answers[key]) ? [...this.answers[key]] : []
      const index = list.indexOf(value)
      if (index >= 0) list.splice(index, 1)
      else list.push(value)
      this.answers[key] = list
    },
    async submitForm() {
      if (this.readonly || this.submitting) return
      const name = String(this.customerName || '').trim()
      const mobile = String(this.phone || '').trim()
      const place = String(this.address || '').trim()
      if (!name && !mobile && !place) {
        uni.showToast({ title: '请先填写客户姓名、手机号码或楼盘地址', icon: 'none' })
        if (!this.previewMode) this.openPreview()
        return
      }
      if (mobile && !/^1\d{10}$/.test(mobile)) {
        uni.showToast({ title: '请输入 11 位手机号码', icon: 'none' })
        return
      }
      const staff = String(this.staffCode || '').trim()
      if (!staff) {
        uni.showToast({ title: '缺少分享人工号，无法提交', icon: 'none' })
        return
      }
      this.submitting = true
      try {
        const payload = {
          requirement_type: this.requirementType,
          customer_name: name,
          address: place,
          staff_code: staff,
          answers: cloneAnswers(this.answers)
        }
        if (mobile) payload.phone = mobile
        if (this.guestShare) {
          await mpRequirementListApi.createShared(payload)
          uni.showModal({
            title: '提交成功',
            content: '您的需求清单已提交，设计师会尽快与您联系。',
            showCancel: false
          })
        } else {
          await mpRequirementListApi.create(payload)
          const eventChannel = this.getOpenerEventChannel && this.getOpenerEventChannel()
          if (eventChannel) eventChannel.emit('requirementSubmitted')
          uni.navigateBack()
        }
      } catch (error) {
        uni.showToast({ title: errorMessage(error) || '提交失败', icon: 'none' })
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style scoped>
.page { height: 100vh; background: #f3f3f3; display: flex; flex-direction: column; }
.wizard-shell, .preview-shell {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}
.wizard-head { padding: 12px 14px 10px; background: #fff; border-bottom: 1px solid #eee; }
.wizard-type { display: block; font-size: 17px; font-weight: 600; color: #222; margin-bottom: 6px; }
.wizard-meta { display: flex; justify-content: space-between; align-items: center; }
.wizard-step { font-size: 13px; color: #666; flex: 1; }
.wizard-percent { font-size: 13px; color: #d5262b; flex-shrink: 0; margin-left: 8px; }
.progress-track { height: 4px; margin-top: 10px; border-radius: 2px; background: #ececec; overflow: hidden; }
.progress-fill { height: 100%; background: #d5262b; border-radius: 2px; }
/* 微信 scroll-view 在 flex 内需 height:0，否则会盖住底部操作栏导致按钮无响应 */
.wizard-body {
  flex: 1;
  width: 100%;
  height: 0;
  min-height: 0;
  padding: 10px 12px 8px;
  box-sizing: border-box;
}
.preview-scroll {
  flex: 1;
  width: 100%;
  height: 0;
  min-height: 0;
  padding: 10px 12px;
  box-sizing: border-box;
}
.card {
  margin-bottom: 10px;
  padding: 14px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.card-title { display: block; font-size: 15px; font-weight: 600; color: #333; margin-bottom: 10px; }
.row-2 { display: flex; gap: 8px; }
.row-2 .txt { flex: 1; min-width: 0; }
.field-note { display: block; margin-top: 8px; font-size: 11px; color: #999; }
.txt {
  height: 40px;
  border: 1px solid #e6e6e6;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 14px;
  background: #fff;
  box-sizing: border-box;
}
.txt.block { width: 100%; margin-bottom: 8px; }
.q-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px; }
.q-label { font-size: 14px; color: #333; font-weight: 600; line-height: 1.5; flex: 1; }
.q-label.sub { display: block; margin: 8px 0 4px; font-weight: 500; }
.kind-tag {
  flex-shrink: 0;
  margin-left: 8px;
  padding: 2px 6px;
  border-radius: 4px;
  background: #f3f3f3;
  color: #888;
  font-size: 11px;
}
.opts { margin-top: 4px; }
.opts.grid { display: flex; flex-wrap: wrap; }
.opt {
  width: 31%;
  margin: 0 2% 8px 0;
  padding: 8px 4px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 12px;
  color: #444;
  text-align: center;
  box-sizing: border-box;
}
.opt.picked { border-color: #d5262b; color: #d5262b; background: #fff7f7; }
.sub-group { margin-top: 8px; }
.sg-label { display: block; font-size: 13px; color: #666; margin-bottom: 4px; }
.inline-txt {
  width: 100%;
  height: 40px;
  margin-top: 8px;
  padding: 0 12px;
  border: 1px solid #e6e6e6;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
}
.wizard-foot {
  position: relative;
  z-index: 20;
  flex-shrink: 0;
  display: flex;
  gap: 8px;
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1px solid #eee;
}
.preview-foot { padding-top: 8px; }
.foot-btn {
  flex: 1;
  margin: 0;
  height: 44px;
  line-height: 44px;
  font-size: 15px;
  border-radius: 8px;
  text-align: center;
  box-sizing: border-box;
}
.foot-btn.ghost { background: #fff; color: #666; border: 1px solid #ddd; }
.foot-btn.ghost.disabled { opacity: 0.45; pointer-events: none; }
.foot-btn.outline { background: #fff; color: #d5262b; border: 1px solid #d5262b; }
.foot-btn.primary { background: #d5262b; color: #fff; }
.foot-btn.primary.loading { opacity: 0.65; pointer-events: none; }
.preview-card {
  margin-bottom: 10px;
  padding: 14px;
  background: #fff;
  border-radius: 10px;
}
.head-card { padding-bottom: 12px; }
.preview-head-row { display: flex; justify-content: space-between; align-items: center; }
.preview-type { font-size: 18px; font-weight: 600; color: #222; }
.preview-percent { color: #3cb371; font-size: 14px; }
.preview-sub { display: block; margin-top: 6px; font-size: 13px; color: #666; }
.preview-tip { display: block; margin-top: 10px; padding: 10px; background: #f6f6f6; border-radius: 8px; font-size: 12px; color: #666; line-height: 1.6; }
.preview-status { display: block; margin-top: 10px; text-align: right; color: #3cb371; font-size: 13px; }
.preview-tools { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.preview-count { font-size: 14px; font-weight: 600; color: #333; }
.preview-filter { font-size: 13px; color: #666; padding: 4px 8px; border: 1px solid #ddd; border-radius: 6px; }
.preview-filter.on { color: #d5262b; border-color: #d5262b; background: #fff7f7; }
.preview-note { display: block; font-size: 11px; color: #999; margin-bottom: 10px; line-height: 1.5; }
.preview-row { padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
.preview-label { display: block; font-size: 13px; color: #666; margin-bottom: 4px; }
.preview-value { display: block; font-size: 14px; color: #333; line-height: 1.5; }
.preview-value.empty { color: #bbb; }
.lbl { display: block; font-size: 13px; color: #666; margin-bottom: 8px; }
</style>
