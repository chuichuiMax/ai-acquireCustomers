<template>
  <view class="page">
    <view class="card">
      <text class="badge">{{ autoRun ? '正在生成内容' : '策略和证据已锁定' }}</text>
      <text v-if="!autoRun && !runId" class="desc">内容将按策略 → 证据 → 标题 → 正文 → 审核生成。点击开始后，会在标题候选处暂停。</text>
      <button v-if="!autoRun && !runId" class="primary" :loading="starting" @click="start">点击开始生成</button>
      <view v-else class="status">当前状态：{{ statusText }}</view>
      <text v-if="!autoRun && errorMessage" class="desc">{{ errorMessage }}</text>
      <button v-if="!autoRun && status === 'failed'" class="primary" :loading="retrying" @click="retry">重试</button>
    </view>

    <view v-if="!autoRun && interrupt && interrupt.interrupt_type === 'title_selection'" class="card">
      <text class="block-title">请选择最终标题</text>
      <radio-group @change="onTitle">
        <label v-for="item in titleOptions" :key="item.id" class="option">
          <radio :value="item.id" :checked="selectedTitleId === item.id" color="#b44a3a" />
          <text>{{ item.text || item.title }}</text>
        </label>
      </radio-group>
      <button class="primary" :loading="resuming" @click="resumeTitle">确认标题并继续生成</button>
    </view>

    <view v-else-if="!autoRun && interrupt && interrupt.interrupt_type === 'content_correction'" class="card">
      <text class="block-title">内容需要定点回修</text>
      <text class="desc">校验或审核发现阻断问题，确认后只重跑建议节点。</text>
      <text class="desc">回修原因：{{ interrupt.reason_code || '未标注' }}</text>
      <text v-if="interrupt.suggested_target" class="desc">目标节点：{{ interrupt.suggested_target }}</text>
      <text v-for="item in correctionMessages" :key="item" class="desc">{{ item }}</text>
      <button class="primary" :loading="resuming" @click="resumeGeneric">确认并重新生成</button>
    </view>

    <view v-else-if="!autoRun && interrupt && interrupt.interrupt_type === 'cover_selection'" class="card">
      <text class="block-title">选择最终封面</text>
      <text class="desc">只能选系统生成并通过视觉审核的封面，不能选上传或图库原图。</text>
      <text v-if="!coverOptions.length" class="desc">当前没有通过视觉审核的封面，请点重试重新生成。</text>
      <view class="cover-grid">
        <view
          v-for="(assetId, index) in coverOptions"
          :key="assetId"
          class="cover-option"
          :class="{ active: selectedCoverAssetId === assetId }"
          @click="selectedCoverAssetId = assetId"
        >
          <image :src="coverFileUrl(assetId)" mode="aspectFill" />
          <text class="cover-option-label">封面候选 {{ index + 1 }}</text>
        </view>
      </view>
      <button class="primary" :loading="resuming" :disabled="!selectedCoverAssetId" @click="resumeCover">
        确认封面并保存
      </button>
    </view>

    <view
      v-else-if="!autoRun && interrupt && interrupt.interrupt_type && interrupt.interrupt_type !== 'external_wait'"
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
import { errorMessage, mediaUrl } from '../../utils/request'

const MAX_AUTO_RETRY = 5

export default {
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
      selectedTitleId: '',
      selectedCoverAssetId: '',
      retryCount: 0,
      timer: null
    }
  },
  computed: {
    autoRun() {
      return this.serviceEntry === '好评笔记'
    },
    statusText() {
      if (this.autoRun) return '生成中'
      if (this.interrupt && this.interrupt.interrupt_type === 'title_selection') return '等待选择标题'
      if (this.interrupt && this.interrupt.interrupt_type === 'cover_selection') return '等待选择封面'
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
  onLoad(query) {
    this.taskId = query.task_id
    this.serviceEntry = decodeURIComponent(query.service_entry || '')
    this.restore()
  },
  onUnload() {
    this.stopPoll()
  },
  methods: {
    stopPoll() {
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    },
    async restore() {
      if (!this.taskId) return
      try {
        const data = await mpContentApi.getTask(this.taskId)
        const brief = (data.task && data.task.brief) || {}
        const values = brief.form_values || {}
        this.serviceEntry = values.mp_service_entry || this.serviceEntry
        const runId = data.task && data.task.latest_run_id
        if (runId) {
          this.runId = runId
          this.poll()
          return
        }
        if (this.autoRun) await this.start()
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      }
    },
    async start() {
      this.starting = true
      try {
        const data = await mpContentApi.startRun(this.taskId, {})
        this.runId = data.run_id
        this.status = data.status
        this.errorMessage = this.autoRun ? '' : data.error_message || ''
        this.poll()
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      } finally {
        this.starting = false
      }
    },
    poll() {
      this.stopPoll()
      this.timer = setInterval(() => this.refresh(), 2000)
      this.refresh()
    },
    async refresh() {
      if (!this.runId) return
      try {
        const data = await mpContentApi.getRun(this.runId)
        this.status = data.status
        this.interrupt = data.interrupt
        this.errorMessage = this.autoRun ? '' : data.error_message || ''
        if (
          data.interrupt &&
          data.interrupt.interrupt_type === 'cover_selection' &&
          !this.selectedCoverAssetId &&
          (data.interrupt.asset_ids || []).length
        ) {
          this.selectedCoverAssetId = data.interrupt.asset_ids[0]
        }
        if (data.status === 'completed') {
          this.stopPoll()
          uni.redirectTo({ url: `/pages/generate/result?task_id=${this.taskId}` })
          return
        }
        if (data.run_id && data.run_id !== this.runId) this.runId = data.run_id
        if (this.autoRun) {
          await this.advanceAuto()
          return
        }
        if (data.status === 'failed' || data.status === 'cancelled') {
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
      if (type === 'title_selection') {
        const first = this.titleOptions[0]
        if (!first) return
        this.selectedTitleId = first.id
        await this.doResume(this.resumePayload({ title_id: first.id }))
        return
      }
      await this.resumeGeneric()
    },
    onTitle(event) {
      this.selectedTitleId = event.detail.value
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
    async resumeTitle() {
      if (!this.selectedTitleId) {
        uni.showToast({ title: '请选择一个标题', icon: 'none' })
        return
      }
      await this.doResume(this.resumePayload({ title_id: this.selectedTitleId }))
    },
    coverFileUrl(assetId) {
      return mediaUrl(`/api/mp/content/covers/${assetId}/file`)
    },
    async resumeCover() {
      if (!this.selectedCoverAssetId) {
        uni.showToast({ title: '请选择一张封面', icon: 'none' })
        return
      }
      await this.doResume(this.resumePayload({ asset_id: this.selectedCoverAssetId }))
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
      try {
        const data = await mpContentApi.retryRun(this.runId, {})
        this.runId = data.run_id
        this.status = data.status
        this.errorMessage = ''
        this.interrupt = null
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
        this.runId = data.run_id
        this.interrupt = null
        this.errorMessage = ''
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
  color: #b44a3a;
  font-weight: 700;
  font-size: 18px;
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
.option {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 10px;
}
.cover-grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  margin: 12px 0;
}
.cover-option {
  width: 48%;
  box-sizing: border-box;
  margin-bottom: 10px;
  border: 2px solid transparent;
  border-radius: 12px;
  overflow: hidden;
  background: #f7f4f2;
}
.cover-option.active {
  border-color: #b44a3a;
}
.cover-option image {
  width: 100%;
  height: 180px;
  background: #eee;
}
.cover-option-label {
  display: block;
  padding: 8px;
  font-size: 12px;
  color: #6f6763;
}
.primary {
  height: 46px;
  line-height: 46px;
  border-radius: 12px;
  color: #fff;
  background: #b44a3a;
}
</style>
