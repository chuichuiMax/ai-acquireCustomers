<template>
  <view v-if="internalAccessGranted" class="page">
    <view v-if="isGenerating" class="card process-card">
      <text class="phase-title">{{ generationProcess.title }}</text>
      <text v-for="line in generationProcess.lines" :key="line.id" class="process-line">{{ line.text }}</text>
      <view v-if="generationProcess.thinking" class="thinking">
        <view class="spinner"></view>
        <text>正在思考...</text>
      </view>
      <text class="elapsed">已等待 {{ elapsedText }}</text>
    </view>
    <view v-else class="card">
      <text class="badge">{{ autoRun ? '正在生成内容' : '策略和证据已锁定' }}</text>
      <text v-if="!autoRun && !runId" class="desc">内容将按策略 → 证据 → 标题 → 正文 → 审核生成，标题和封面会自动确认。</text>
      <button v-if="!autoRun && !runId" class="primary" :loading="starting" @click="start">点击开始生成</button>
      <view v-else class="status">当前状态：{{ statusText }}</view>
      <text v-if="!autoRun && errorMessage" class="desc">{{ errorMessage }}</text>
      <button v-if="!autoRun && status === 'failed'" class="primary" :loading="retrying" @click="retry">重试</button>
    </view>

    <view v-if="!autoRun && interrupt && interrupt.interrupt_type === 'content_correction'" class="card">
      <text class="block-title">内容需要定点回修</text>
      <text class="desc">校验或审核发现阻断问题，确认后只重跑建议节点。</text>
      <text class="desc">回修原因：{{ interrupt.reason_code || '未标注' }}</text>
      <text v-if="interrupt.suggested_target" class="desc">目标节点：{{ interrupt.suggested_target }}</text>
      <text v-for="item in correctionMessages" :key="item" class="desc">{{ item }}</text>
      <button class="primary" :loading="resuming" @click="resumeGeneric">确认并重新生成</button>
    </view>

    <view
      v-else-if="showsManualInterrupt"
      class="card"
    >
      <text class="block-title">需要确认后继续</text>
      <text class="desc">当前关口：{{ interrupt.interrupt_type }}</text>
      <button class="primary" :loading="resuming" @click="resumeGeneric">继续生成</button>
    </view>
  </view>
</template>

<script>
import { mpContentApi } from '../../apis/mp'
import { errorMessage } from '../../utils/request'
import { internalPageMixin } from '../../utils/internal-access'
import { clearActiveGeneration, saveActiveGeneration } from '../../utils/active-generation.mjs'
import { buildGenerationProcess, normalizeRunSnapshot, shouldAutoPassInterrupt } from '../../utils/generation-process.mjs'

const MAX_AUTO_RETRY = 5

function formatDuration(seconds) {
  const value = Math.max(0, Math.ceil(seconds))
  if (value >= 60) {
    const minutes = Math.floor(value / 60)
    const rest = value % 60
    return rest ? `${minutes} 分 ${rest} 秒` : `${minutes} 分钟`
  }
  return `${value} 秒`
}

export default {
  mixins: [internalPageMixin],
  data() {
    return {
      taskId: '',
      runId: '',
      serviceEntry: '',
      starting: false,
      resuming: false,
      retrying: false,
      status: '',
      errorMessage: '',
      interrupt: null,
      runNodes: [],
      runEvents: [],
      selectedTitleId: '',
      selectedCoverAssetId: '',
      fromManage: false,
      timer: null,
      tickTimer: null,
      startedAt: 0,
      now: Date.now()
    }
  },
  computed: {
    autoRun() {
      return this.serviceEntry === '好评笔记'
    },
    generationProcess() {
      return buildGenerationProcess({
        nodes: this.runNodes,
        events: this.runEvents,
        interrupt: this.interrupt,
        status: this.status,
        elapsedSeconds: this.elapsedSeconds
      })
    },
    elapsedSeconds() {
      if (!this.startedAt) return 0
      return Math.max(0, Math.floor((this.now - this.startedAt) / 1000))
    },
    waitingUser() {
      const type = this.interrupt && this.interrupt.interrupt_type
      return Boolean(
        !this.autoRun &&
          type &&
          type !== 'external_wait' &&
          !shouldAutoPassInterrupt(type)
      )
    },
    showsManualInterrupt() {
      const type = this.interrupt && this.interrupt.interrupt_type
      return Boolean(
        !this.autoRun &&
          type &&
          type !== 'external_wait' &&
          type !== 'content_correction' &&
          !shouldAutoPassInterrupt(type)
      )
    },
    isGenerating() {
      if (this.status === 'completed' || this.status === 'cancelled' || this.status === 'reviewed') return false
      if (!this.autoRun && this.status === 'failed') return false
      if (this.waitingUser) return false
      return true
    },
    elapsedText() {
      return formatDuration(this.elapsedSeconds)
    },
    statusText() {
      if (this.autoRun) return '生成中'
      if (this.interrupt && this.interrupt.interrupt_type === 'external_wait') return '封面生成中'
      if (this.status === 'completed') return '已完成'
      if (this.status === 'failed') return '失败'
      if (this.runId) return this.status || '生成中'
      return '待开始'
    },
    titleOptions() {
      return (this.interrupt && this.interrupt.options) || []
    },
    coverOptions() {
      return (this.interrupt && this.interrupt.asset_ids) || []
    },
    correctionMessages() {
      const interrupt = this.interrupt || {}
      const titleChecks = ((interrupt.title_validation_report && interrupt.title_validation_report.items) || []).flatMap(
        (item) => item.checks || []
      )
      const checks = [
        ...titleChecks,
        ...((interrupt.validation_report && interrupt.validation_report.checks) || []),
        ...((interrupt.review_report && interrupt.review_report.checks) || [])
      ]
      return checks
        .filter((item) => item.status === 'blocked' || item.level === 'error')
        .map((item) => item.message || item.code)
        .filter(Boolean)
    }
  },
  async onLoad(query) {
    if (!(await this.ensureInternalAccess())) return
    this.taskId = query.task_id
    this.serviceEntry = decodeURIComponent(query.service_entry || '')
    this.fromManage = query.from === 'manage'
    saveActiveGeneration(this.taskId, this.serviceEntry)
    this.markStarted()
    this.startTick()
    this.restore()
  },
  onShow() {
    if (!this.taskId) return
    this.startTick()
    if (this.runId) this.poll()
  },
  onHide() {
    this.stopPoll()
    this.stopTick()
  },
  onUnload() {
    this.stopPoll()
    this.stopTick()
    clearActiveGeneration()
  },
  methods: {
    markStarted() {
      if (!this.startedAt) this.startedAt = Date.now()
      this.now = Date.now()
    },
    startTick() {
      this.stopTick()
      this.now = Date.now()
      this.tickTimer = setInterval(() => {
        this.now = Date.now()
      }, 1000)
    },
    stopTick() {
      if (this.tickTimer) {
        clearInterval(this.tickTimer)
        this.tickTimer = null
      }
    },
    stopPoll() {
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    },
    applyRunSnapshot(data) {
      const snapshot = normalizeRunSnapshot(data)
      if (snapshot.runId) this.runId = snapshot.runId
      if (snapshot.status) this.status = snapshot.status
      this.interrupt = snapshot.interrupt
      this.errorMessage = this.autoRun ? '' : snapshot.errorMessage
      this.runNodes = snapshot.nodes
      this.runEvents = snapshot.events
      if (
        snapshot.interrupt &&
        snapshot.interrupt.interrupt_type === 'cover_selection' &&
        !this.selectedCoverAssetId &&
        (snapshot.interrupt.asset_ids || []).length
      ) {
        this.selectedCoverAssetId = snapshot.interrupt.asset_ids[0]
      }
      return snapshot
    },
    goResult() {
      this.stopPoll()
      clearActiveGeneration()
      uni.redirectTo({
        url: `/pages/generate/result?task_id=${this.taskId}&service_entry=${encodeURIComponent(this.serviceEntry || '')}`
      })
    },
    async restore() {
      if (!this.taskId) return
      try {
        const data = await mpContentApi.getTask(this.taskId)
        const brief = (data.task && data.task.brief) || {}
        const values = brief.form_values || {}
        this.serviceEntry = values.mp_service_entry || this.serviceEntry
        const runId = data.task && data.task.latest_run_id
        const taskStatus = String((data.task && data.task.status) || '').toLowerCase()
        if (runId) {
          this.runId = runId
          if (this.fromManage && (taskStatus === 'failed' || taskStatus === 'cancelled')) {
            await this.retry()
            return
          }
          if (taskStatus === 'reviewed' || taskStatus === 'completed') {
            this.goResult()
            return
          }
          this.poll()
          return
        }
        await this.start()
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      }
    },
    async start() {
      this.starting = true
      this.markStarted()
      try {
        const data = await mpContentApi.startRun(this.taskId, {})
        this.applyRunSnapshot(data)
        this.poll()
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      } finally {
        this.starting = false
      }
    },
    poll() {
      this.markStarted()
      this.startTick()
      this.stopPoll()
      this.timer = setInterval(() => this.refresh(), 2000)
      this.refresh()
    },
    async refresh() {
      if (!this.runId) return
      try {
        const data = await mpContentApi.getRun(this.runId)
        const snapshot = this.applyRunSnapshot(data)
        if (snapshot.status === 'completed' || snapshot.status === 'reviewed') {
          this.goResult()
          return
        }
        if (this.autoRun) {
          await this.advanceAuto()
          return
        }
        await this.advancePassThrough()
        if (snapshot.status === 'failed' || snapshot.status === 'cancelled') {
          this.stopPoll()
        }
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      }
    },
    async advanceAuto() {
      if (this.starting || this.retrying || this.resuming) return
      if (this.status === 'failed' || this.status === 'cancelled') {
        if (this.retryCount >= MAX_AUTO_RETRY) return
        this.retryCount += 1
        await this.retry()
        return
      }
      const type = this.interrupt && this.interrupt.interrupt_type
      if (!type || type === 'external_wait') return
      if (await this.advancePassThrough()) return
      await this.resumeGeneric()
    },
    async advancePassThrough() {
      if (this.starting || this.retrying || this.resuming) return false
      const type = this.interrupt && this.interrupt.interrupt_type
      if (!shouldAutoPassInterrupt(type)) return false
      if (type === 'title_selection') {
        const first = this.titleOptions[0]
        if (!first) return false
        this.selectedTitleId = first.id
        await this.doResume(this.resumePayload({ title_id: first.id }))
        return true
      }
      const assetId = this.selectedCoverAssetId || (this.coverOptions && this.coverOptions[0])
      if (!assetId) return false
      this.selectedCoverAssetId = assetId
      await this.doResume(this.resumePayload({ asset_id: assetId }))
      return true
    },
    resumePayload(extra) {
      return {
        resume: {
          run_id: this.interrupt.run_id,
          node_id: this.interrupt.node_id,
          expected_state_version: this.interrupt.expected_state_version,
          ...extra
        }
      }
    },
    async resumeGeneric() {
      const type = this.interrupt.interrupt_type
      let extra = {}
      if (type === 'content_approval') extra = { decision: 'approved' }
      else if (type === 'content_correction') extra = { decision: 'revise' }
      else if (type === 'high_risk_facts' || type === 'strategy_product_facts') {
        extra = { confirmed_evidence_ids: this.interrupt.evidence_ids || [] }
      } else if (type === 'cover_selection') {
        extra = { asset_id: this.selectedCoverAssetId || (this.interrupt.asset_ids || [])[0] }
      } else if (type === 'formula_selection') {
        extra = {
          title_formula_code: (this.interrupt.title_formula_codes || [])[0],
          body_formula_code: (this.interrupt.body_formula_codes || [])[0]
        }
      } else if (type === 'content_direction') {
        extra = { direction_code: (this.interrupt.options || [])[0]?.direction_code }
      }
      await this.doResume(this.resumePayload(extra))
    },
    async retry() {
      this.retrying = true
      this.startedAt = Date.now()
      this.now = Date.now()
      try {
        const data = await mpContentApi.retryRun(this.runId, {})
        this.applyRunSnapshot(data)
        this.poll()
      } catch (error) {
        if (!this.autoRun) uni.showToast({ title: errorMessage(error), icon: 'none' })
      } finally {
        this.retrying = false
      }
    },
    async doResume(payload) {
      this.resuming = true
      try {
        const data = await mpContentApi.resumeRun(this.runId, payload)
        this.applyRunSnapshot(data)
        this.poll()
      } catch (error) {
        if (!this.autoRun) uni.showToast({ title: errorMessage(error), icon: 'none' })
      } finally {
        this.resuming = false
      }
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f4f1ee;
  padding: 24px 16px;
}
.card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 12px;
}
.badge {
  display: block;
  color: #BE2D22;
  font-weight: 700;
  font-size: 18px;
}
.process-card {
  padding: 28px 24px 24px;
}
.phase-title {
  display: block;
  margin-bottom: 20px;
  color: #1f1a18;
  font-size: 18px;
  font-weight: 700;
  line-height: 26px;
}
.process-line {
  display: block;
  margin-bottom: 16px;
  color: #2b2422;
  font-size: 15px;
  line-height: 24px;
}
.thinking {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-top: 4px;
  color: #8a817c;
  font-size: 14px;
  line-height: 22px;
}
.thinking .spinner {
  margin-right: 8px;
}
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e5ddd8;
  border-top-color: #8a817c;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
.elapsed {
  display: block;
  margin-top: 16px;
  color: #8a817c;
  font-size: 12px;
}
.desc,
.status {
  display: block;
  margin: 12px 0;
  color: #8a817c;
  line-height: 1.6;
}
.block-title {
  display: block;
  margin-bottom: 10px;
  font-weight: 600;
}
.primary {
  height: 46px;
  line-height: 46px;
  border-radius: 12px;
  color: #fff;
  background: #BE2D22;
}
</style>
