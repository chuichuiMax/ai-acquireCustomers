<template>
  <view v-if="internalAccessGranted || guestShare" class="page">
  <view v-if="effectivePreview" class="preview-shell">
    <scroll-view scroll-y class="preview-scroll" :show-scrollbar="true">
      <view class="preview-card head-card">
        <view class="preview-head-row">
          <text class="preview-type">{{ requirementType }}</text>
          <text class="preview-percent">完成度{{ completion.percent }}%</text>
        </view>
        <text class="preview-sub">{{ formTitle }}</text>
        <view v-if="readonly && detailDescription" class="preview-desc"><text>{{ detailDescription }}</text></view>
        <text v-else-if="!readonly" class="preview-tip">以下为当前已填写的全部内容，提交前可返回任一步骤修改。</text>
        <view v-if="readonly && detailCustomerLine" class="detail-customer-row">
          <text class="detail-customer-line">{{ detailCustomerLine }}</text>
          <text class="preview-status">已提交</text>
        </view>
        <view class="progress-track detail-progress"><view class="progress-fill" :style="{ width: progressWidth }" /></view>
        <view v-if="readonly" class="detail-meta">
          <view class="detail-meta-row">
            <text class="detail-meta-item">提交时间：{{ detailSubmittedAt }}</text>
            <text class="detail-meta-item">提交人：{{ detailSubmitterName }}</text>
          </view>
          <view class="detail-meta-row">
            <text class="detail-meta-item">分享时间：{{ detailSharedAt }}</text>
            <text class="detail-meta-item">分享人：{{ detailSharerName }}</text>
          </view>
          <view v-if="detailSharedMembersLine" class="detail-meta-row single">
            <text class="detail-meta-item">共享成员：{{ detailSharedMembersLine }}</text>
          </view>
        </view>
        <text v-if="!readonly" class="preview-status draft">未提交</text>
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
      <view v-if="guestShare && !readonly" class="preview-card guest-consent-card">
        <text class="lbl">提交人 · {{ guestNickname || '请先填写微信昵称' }}</text>
        <view class="guest-consent">
          <view class="guest-consent-toggle" @tap.stop="toggleGuestConsent">
            <view class="guest-consent-circle" :class="{ checked: guestConsent }"><text v-if="guestConsent">✓</text></view>
          </view>
          <view class="guest-consent-text">
            <text>手机号与昵称将记录为提交人，仅用于设计师联系。请阅读</text>
            <text class="guest-privacy" @tap.stop="openGuestPrivacy">《隐私保护指引》</text>
            <text>并勾选同意。</text>
          </view>
        </view>
        <text v-if="guestAuthError" class="guest-error">{{ guestAuthError }}</text>
      </view>
    </scroll-view>
    <view class="wizard-foot preview-foot">
      <view v-if="!readonly" class="foot-btn outline" @tap.stop="leavePreview">返回修改</view>
      <view v-if="readonly" class="foot-btn outline" @tap.stop="goBack">返回</view>
      <!-- #ifdef MP-WEIXIN -->
      <button
        v-if="!readonly && guestShare"
        class="foot-btn primary guest-submit-btn"
        :class="{ loading: submitting }"
        :open-type="guestSubmitReady ? 'getPhoneNumber|agreePrivacyAuthorization' : ''"
        :disabled="submitting || !guestSubmitReady"
        :loading="submitting"
        @tap.stop="beginGuestSubmit"
        @getphonenumber="submitGuestWithPhone"
      >
        {{ submitting ? '正在提交…' : '同意授权并提交' }}
      </button>
      <!-- #endif -->
      <view v-if="!readonly && !guestShare" class="foot-btn primary" :class="{ loading: submitting }" @tap.stop="submitForm">提交</view>
    </view>
  </view>

  <view v-else class="wizard-shell">
    <view class="wizard-head">
      <text class="wizard-type">{{ requirementType }}</text>
      <text class="wizard-sub">{{ formTitle }}</text>
      <view v-if="detailDescription" class="wizard-desc"><text>{{ detailDescription }}</text></view>
      <text v-if="staffDisplayLine" class="wizard-staff">{{ staffDisplayLine }}</text>
      <view class="wizard-meta">
        <text class="wizard-step">第 {{ stepIndex + 1 }} / {{ stepCount }} 步 · {{ currentStep.title }}</text>
        <text class="wizard-percent">{{ completion.percent }}%</text>
      </view>
      <view class="progress-track"><view class="progress-fill" :style="{ width: progressWidth }" /></view>
    </view>

    <scroll-view scroll-y class="wizard-body" :show-scrollbar="true">
      <view v-if="stepIndex === 0 && guestShare" class="card">
        <text class="card-title">微信身份</text>
        <!-- #ifdef MP-WEIXIN -->
        <input
          v-model="guestNickname"
          class="txt block"
          type="nickname"
          placeholder="微信昵称（点击使用微信昵称）"
          @blur="normalizeGuestNickname"
        />
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <input v-model="guestNickname" class="txt block" placeholder="您的称呼" />
        <!-- #endif -->
        <text v-if="guestSessionLoading" class="field-note">正在连接微信…</text>
        <text v-else-if="guestSessionError" class="guest-error block">{{ guestSessionError }}</text>
        <button v-else-if="!guestSession" class="guest-retry" @tap.stop="prepareGuestSession">重新连接微信</button>
        <text v-else class="field-note">提交时将授权微信手机号，手机号与昵称记入「提交人」。</text>
      </view>

      <view v-if="stepIndex === 0" class="card">
        <text class="card-title">客户信息</text>
        <input v-model="address" class="txt block" placeholder="楼盘地址" />
        <template v-if="guestShare">
          <input v-model="customerName" class="txt block" placeholder="客户姓名（选填）" />
        </template>
        <view v-else class="row-2">
          <input v-model="customerName" class="txt" placeholder="姓名" />
          <input v-model="phone" class="txt" type="number" maxlength="11" placeholder="手机号码" />
        </view>
        <text class="field-note">{{ guestShare ? '楼盘地址或客户姓名至少填一项；手机号在提交时微信授权获取' : '楼盘地址 / 姓名 / 手机至少填写一项即可提交' }}</text>
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
        <input
          v-model="staffCode"
          class="txt block"
          :disabled="staffCodeLoading"
          :placeholder="staffCodeLoading ? '正在获取工号…' : '登录后自动带出工号'"
        />
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
  persistEmployeeCode,
  readPersistedEmployeeCode,
  refreshEmployeeWorkCodeFromMe,
  resolveRequirementListUserCode
} from '../../utils/requirement-list-employee.mjs'
import {
  REQUIREMENT_FORM_ITEMS,
  employeeRequirementSignature,
  requirementTypeForForm
} from '../../utils/requirement-list-catalog.mjs'
import {
  formatRequirementRecordTime,
  requirementRecordCustomerLine,
  requirementRecordSharedMembersLine
} from '../../utils/requirement-list-records.mjs'
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
      previewFilledOnly: false,
      guestNickname: '',
      guestSession: '',
      guestSessionExpiresAt: 0,
      guestSessionLoading: false,
      guestSessionError: '',
      guestConsent: false,
      guestAuthError: '',
      staffCodeLoading: false,
      detailSubmittedAt: '—',
      detailSubmitterName: '—',
      detailSharedAt: '—',
      detailSharerName: '—',
      detailSharedMembers: [],
      staffProfile: { name: '', role: '' }
    }
  },
  computed: {
    staffDisplayLine() {
      return employeeRequirementSignature(this.staffProfile)
    },
    detailDescription() {
      const item = REQUIREMENT_FORM_ITEMS.find((entry) => requirementTypeForForm(entry) === this.requirementType)
      return item ? item.description : ''
    },
    detailCustomerLine() {
      if (!this.readonly) return ''
      return requirementRecordCustomerLine({
        customer_name: this.customerName,
        phone: this.phone,
        address: this.address
      })
    },
    detailSharedMembersLine() {
      return requirementRecordSharedMembersLine(this.detailSharedMembers)
    },
    guestSubmitReady() {
      if (!this.guestShare) return false
      if (!String(this.guestNickname || '').trim()) return false
      if (!this.guestSession) return false
      if (!this.guestConsent) return false
      const name = String(this.customerName || '').trim()
      const place = String(this.address || '').trim()
      return Boolean(name || place)
    },
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
    this.applyGuestShareOptions(safeOptions)
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
    const pages = getCurrentPages()
    const current = pages[pages.length - 1]
    const options = (current && current.options) || {}
    if (!this.guestShare) this.applyGuestShareOptions(options)
    if (this.guestShare) {
      this.internalAccessGranted = true
    } else if (!(await this.ensureInternalAccess())) {
      return
    }
    if (!this.guestShare && !this.readonly) {
      await this.loadStaffCode(true)
      await this.loadStaffProfile()
    }
    if (this.guestShare && !this.readonly) await this.prepareGuestSession()
    if (options.id && !this._detailLoaded) {
      this.readonly = true
      this.previewMode = true
      await this.loadDetail(options.id)
      uni.setNavigationBarTitle({ title: '需求清单详情' })
    }
  },
  methods: {
    kindLabel,
    applyGuestShareOptions(pageOptions = {}) {
      if (!isRequirementGuestPageOptions(pageOptions)) return
      this.guestShare = true
      const staff = String(pageOptions.staff || pageOptions.usercode || '').trim()
      if (staff) this.staffCode = staff
      else if (!this._guestStaffWarned) {
        this._guestStaffWarned = true
        uni.showToast({ title: '分享链接无效，缺少员工工号', icon: 'none' })
      }
    },
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
    async openPreview() {
      if (this.guestShare) {
        this.normalizeGuestNickname()
        if (!String(this.guestNickname || '').trim()) {
          uni.showToast({ title: '请先填写微信昵称', icon: 'none' })
          return
        }
        if (!this.guestSession) await this.prepareGuestSession()
      } else {
        await this.loadStaffCode(true)
      }
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
    async nextStep() {
      if (this.stepCount < 1 || this.stepIndex >= this.stepCount - 1) return
      const next = this.stepIndex + 1
      if (next === this.stepCount - 1 && !this.guestShare) await this.loadStaffCode(true)
      this.stepIndex = next
    },
    async loadStaffProfile() {
      try {
        const data = await mpMeApi.get()
        const employee = employeeFromMe(data) || {}
        this.staffProfile = {
          name: employee.name || '',
          role: employee.role || ''
        }
      } catch {
        if (!this.staffProfile.name && !this.staffProfile.role) {
          this.staffProfile = { name: '', role: '全案设计师' }
        }
      }
    },
    async loadStaffCode(force = false) {
      if (this.guestShare) return
      if (!force && String(this.staffCode || '').trim()) return
      const cached = readPersistedEmployeeCode()
      if (cached && !force) this.staffCode = cached
      this.staffCodeLoading = true
      try {
        const data = await mpMeApi.get()
        let code = resolveRequirementListUserCode(employeeFromMe(data) || {})
        if (!code) code = await refreshEmployeeWorkCodeFromMe(() => mpMeApi.get())
        if (code) {
          this.staffCode = code
          persistEmployeeCode(code)
        } else if (cached) {
          this.staffCode = cached
        }
      } catch {
        if (!this.staffCode && cached) this.staffCode = cached
      } finally {
        this.staffCodeLoading = false
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
        this.detailSubmittedAt = formatRequirementRecordTime(detail.submitted_at)
        this.detailSubmitterName = String(detail.submitter_name || '—').trim() || '—'
        this.detailSharedAt = formatRequirementRecordTime(detail.shared_at)
        this.detailSharerName = String(detail.sharer_name || '—').trim() || '—'
        this.detailSharedMembers = Array.isArray(detail.shared_members) ? detail.shared_members : []
        this.staffProfile = {
          name: detail.sharer_name || '',
          role: detail.role || ''
        }
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
    normalizeGuestNickname() {
      this.guestNickname = String(this.guestNickname || '').trim().slice(0, 32)
    },
    toggleGuestConsent() {
      if (!this.submitting) this.guestConsent = !this.guestConsent
    },
    openGuestPrivacy() {
      // #ifdef MP-WEIXIN
      if (typeof wx !== 'undefined' && typeof wx.openPrivacyContract === 'function') {
        wx.openPrivacyContract({
          fail: () => {
            this.guestAuthError = '隐私保护指引暂时无法打开，请稍后重试'
          }
        })
      }
      // #endif
    },
    async prepareGuestSession() {
      if (!this.guestShare || this.guestSessionLoading) return
      const staff = String(this.staffCode || '').trim()
      if (!staff) return
      if (this.guestSession && Date.now() < this.guestSessionExpiresAt) return
      this.guestSessionLoading = true
      this.guestSessionError = ''
      try {
        const login = await new Promise((resolve, reject) => uni.login({ timeout: 10000, success: resolve, fail: reject }))
        const session = await mpRequirementListApi.createVisitorSession({
          code: login.code,
          staff_code: staff
        })
        this.guestSession = session.session_id
        this.guestSessionExpiresAt = Date.now() + Math.max(30, (session.expires_in || 600) - 15) * 1000
        this.staffProfile = {
          name: session.sharer_name || '',
          role: session.sharer_role || ''
        }
      } catch (error) {
        const errMsg = String((error && (error.errMsg || error.message)) || '')
        this.guestSession = ''
        this.guestSessionError = /deny|cancel|privacy/i.test(errMsg)
          ? '请同意微信隐私保护指引后重试'
          : errorMessage(error) || '微信连接失败，请稍后重试'
      } finally {
        this.guestSessionLoading = false
      }
    },
    beginGuestSubmit() {
      this.guestAuthError = ''
      this.normalizeGuestNickname()
      if (!this.guestSubmitReady) {
        if (!String(this.guestNickname || '').trim()) {
          uni.showToast({ title: '请先填写微信昵称', icon: 'none' })
          return
        }
        if (!this.guestConsent) {
          uni.showToast({ title: '请先阅读并同意隐私说明', icon: 'none' })
          return
        }
        const name = String(this.customerName || '').trim()
        const place = String(this.address || '').trim()
        if (!name && !place) {
          uni.showToast({ title: '请填写楼盘地址或客户姓名', icon: 'none' })
        }
        if (!this.guestSession) this.prepareGuestSession()
      }
    },
    async submitGuestWithPhone(event) {
      if (this.readonly || this.submitting || !this.guestShare) return
      const detail = event.detail || {}
      this.normalizeGuestNickname()
      if (!detail.code) {
        this.guestAuthError = /deny|cancel/i.test(detail.errMsg || '')
          ? '已取消手机号授权，尚未提交'
          : '未能获取微信手机号，请稍后重试'
        return
      }
      if (!this.guestSubmitReady) {
        this.beginGuestSubmit()
        return
      }
      const staff = String(this.staffCode || '').trim()
      this.submitting = true
      this.guestAuthError = ''
      try {
        const name = String(this.customerName || '').trim()
        const place = String(this.address || '').trim()
        const nickname = String(this.guestNickname || '').trim()
        const payload = {
          requirement_type: this.requirementType,
          customer_name: name,
          address: place,
          staff_code: staff,
          answers: cloneAnswers(this.answers),
          visitor_session_id: this.guestSession,
          phone_code: detail.code,
          submitter_nickname: nickname
        }
        await mpRequirementListApi.createShared(payload)
        uni.showModal({
          title: '提交成功',
          content: '您的需求清单已提交，设计师会尽快与您联系。',
          showCancel: false
        })
      } catch (error) {
        this.guestAuthError = errorMessage(error) || '提交失败'
        if (error && error.statusCode === 401) this.guestSession = ''
      } finally {
        this.submitting = false
      }
    },
    async submitForm() {
      if (this.readonly || this.submitting || this.guestShare) return
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
      if (!this.guestShare) await this.loadStaffCode(true)
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
        await mpRequirementListApi.create(payload)
        const eventChannel = this.getOpenerEventChannel && this.getOpenerEventChannel()
        if (eventChannel) eventChannel.emit('requirementSubmitted')
        uni.navigateBack()
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
.wizard-sub { display: block; font-size: 13px; color: #666; margin-bottom: 8px; }
.wizard-desc {
  margin-bottom: 8px;
  padding: 10px 12px;
  background: #f6f6f6;
  border-radius: 8px;
  font-size: 12px;
  color: #666;
  line-height: 1.6;
}
.wizard-staff { display: block; margin-bottom: 10px; font-size: 13px; color: #888; }
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
.preview-desc {
  display: block;
  margin-top: 10px;
  padding: 10px 12px;
  background: #f6f6f6;
  border-radius: 8px;
  font-size: 12px;
  color: #666;
  line-height: 1.6;
}
.preview-tip { display: block; margin-top: 10px; padding: 10px; background: #f6f6f6; border-radius: 8px; font-size: 12px; color: #666; line-height: 1.6; }
.detail-customer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
}
.detail-customer-line {
  flex: 1;
  font-size: 13px;
  color: #888;
  line-height: 1.5;
}
.detail-progress { margin-top: 10px; }
.detail-meta { margin-top: 14px; }
.detail-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-bottom: 8px;
}
.detail-meta-row.single { margin-bottom: 0; }
.detail-meta-item {
  flex: 1;
  min-width: 46%;
  font-size: 12px;
  color: #888;
  line-height: 1.5;
}
.preview-status { flex-shrink: 0; color: #3cb371; font-size: 13px; }
.preview-status.draft { display: block; margin-top: 10px; text-align: right; }
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
.guest-error { display: block; margin-top: 8px; font-size: 12px; color: #d5262b; line-height: 1.5; }
.guest-error.block { margin-top: 6px; }
.guest-retry {
  margin-top: 8px;
  height: 40px;
  line-height: 40px;
  font-size: 14px;
  color: #d5262b;
  background: #fff7f7;
  border: 1px solid #f0c4c4;
  border-radius: 8px;
}
.guest-consent { display: flex; align-items: flex-start; gap: 10px; margin-top: 6px; }
.guest-consent-toggle { flex-shrink: 0; padding: 2px 0; }
.guest-consent-circle {
  width: 18px;
  height: 18px;
  border: 1px solid #ccc;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #fff;
}
.guest-consent-circle.checked { background: #d5262b; border-color: #d5262b; }
.guest-consent-text { font-size: 12px; color: #666; line-height: 1.55; }
.guest-privacy { color: #3d6bff; }
.guest-consent-card { padding-bottom: 12px; }
button.guest-submit-btn,
button.guest-submit-btn::after {
  border: none;
  margin: 0;
  padding: 0;
  background: transparent;
}
button.guest-submit-btn.foot-btn.primary {
  background: #d5262b;
  color: #fff;
}
button.guest-submit-btn.loading { opacity: 0.65; }
</style>
