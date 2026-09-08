<template>
  <view class="page">
    <view class="hero">
      <image class="hero-bg" src="/static/home-hero.jpg" mode="aspectFill" />
      <view class="hero-mask" />
      <view class="hero-copy">
        <text class="eyebrow">鸿扬集团 · 家装</text>
        <text class="headline">让业绩增长率提升 60%</text>
        <text class="headline">让获客成本低于行业 30%</text>
        <view class="hero-btn" @click="goGenerate">
          <text>开始增长获客</text>
          <text class="spark">✦</text>
        </view>
      </view>
    </view>

    <view class="kpis">
      <view v-for="item in kpis" :key="item.label" class="kpi">
        <text class="kpi-value">{{ item.value }}</text>
        <text class="kpi-label">{{ item.label }}</text>
      </view>
    </view>

    <view class="section">
      <text class="kicker">GROWTH CAPABILITIES</text>
      <text class="section-title">不只生产内容，更管理家装获客效率</text>
      <scroll-view
        class="cap-scroll"
        scroll-x
        :show-scrollbar="false"
        @scroll="onCapScroll"
      >
        <view class="cap-track">
          <view v-for="item in capabilities" :key="item.title" class="cap-card">
            <view class="cap-icon" :class="item.icon">
              <view v-if="item.icon === 'chart'" class="bars">
                <view class="bar b1" />
                <view class="bar b2" />
                <view class="bar b3" />
              </view>
              <view v-else-if="item.icon === 'wallet'" class="wallet" />
              <view v-else class="check" />
            </view>
            <text class="cap-title">{{ item.title }}</text>
            <text class="cap-desc">{{ item.desc }}</text>
          </view>
        </view>
      </scroll-view>
      <view class="dots">
        <view
          v-for="(item, index) in capabilities"
          :key="item.title"
          class="dot"
          :class="{ on: capIndex === index }"
        />
      </view>
    </view>

    <view class="section">
      <text class="kicker">GROWTH WORKFLOW</text>
      <text class="section-title">一条从内容到有效线索的增长链路</text>
      <view class="steps">
        <view v-for="item in steps" :key="item.number" class="step">
          <text class="step-num">{{ item.number }}</text>
          <text class="step-title">{{ item.title }}</text>
          <text class="step-desc">{{ item.desc }}</text>
        </view>
      </view>
    </view>

    <view class="final">
      <view class="final-copy">
        <text class="final-kicker">鸿扬内容策略 Agent</text>
        <text class="final-title">从一个增长目标开始，获取下一条有效装修线索。</text>
      </view>
      <view class="final-btn" @click="goGenerate">
        <text>进入工作台</text>
        <text class="arrow">→</text>
        <text class="spark">✦</text>
      </view>
    </view>

    <tab-bar current="home" />
  </view>
</template>

<script>
import TabBar from '../../components/tab-bar.vue'

export default {
  components: { TabBar },
  onLoad() {
    uni.reLaunch({ url: '/pages/generate/generate' })
  },
  data() {
    return {
      capIndex: 0,
      kpis: [
        { value: '1.2W+', label: 'AI平台获客量' },
        { value: '100%', label: '基于真实业务变量' },
        { value: '70%', label: '获客转化率' }
      ],
      capabilities: [
        {
          icon: 'chart',
          title: '增长率目标对齐',
          desc: '将区域、客群、内容表现与增长目标同步输入，让每条内容都有清晰的业务方向。'
        },
        {
          icon: 'wallet',
          title: '获客成本优化',
          desc: '以装修痛点、服务价值和成本变化重组表达，把预算优先投向更可能咨询的人群。'
        },
        {
          icon: 'check',
          title: '有效线索获取',
          desc: '用场景诊断、案例佐证与预约引导筛出真实装修需求，提升后续到店与成交效率。'
        }
      ],
      steps: [
        {
          number: '01',
          title: '设定增长目标',
          desc: '录入区域、目标客群、预期增长率与单线索成本，建立获客简报。'
        },
        {
          number: '02',
          title: '匹配获客策略',
          desc: '选择增长、成本或线索策略，明确内容要回应的装修需求。'
        },
        {
          number: '03',
          title: '生成留资内容',
          desc: '把真实数据、服务价值和行动入口组合为可编辑的内容预览。'
        },
        {
          number: '04',
          title: '复盘线索质量',
          desc: '回看咨询、到店与成本表现，让下一轮投放更聚焦有效获客。'
        }
      ]
    }
  },
  methods: {
    goGenerate() {
      uni.redirectTo({ url: '/pages/generate/generate' })
    },
    onCapScroll(event) {
      const left = event.detail.scrollLeft || 0
      this.capIndex = Math.min(2, Math.max(0, Math.round(left / 250)))
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f6f3f0;
  padding-bottom: 92px;
}
.hero {
  position: relative;
  height: 280px;
  overflow: hidden;
}
.hero-bg,
.hero-mask {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.hero-mask {
  background: linear-gradient(180deg, rgba(190, 45, 34, 0.55) 0%, rgba(190, 45, 34, 0.78) 100%);
}
.hero-copy {
  position: relative;
  z-index: 1;
  height: 100%;
  padding: 28px 22px 56px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}
.eyebrow {
  color: rgba(255, 255, 255, 0.86);
  font-size: 12px;
  margin-bottom: 10px;
}
.headline {
  color: #fff;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.35;
}
.hero-btn,
.final-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: #fff;
  color: #BE2D22;
  font-weight: 600;
}
.hero-btn {
  margin-top: 18px;
  height: 36px;
  padding: 0 18px;
  border-radius: 18px;
  font-size: 14px;
}
.spark {
  color: #3b82f6;
  font-size: 12px;
}
.kpis {
  display: flex;
  gap: 8px;
  margin: -28px 16px 8px;
  position: relative;
  z-index: 2;
}
.kpi {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  padding: 12px 6px;
  text-align: center;
  box-shadow: 0 6px 16px rgba(80, 40, 30, 0.08);
}
.kpi-value {
  display: block;
  color: #BE2D22;
  font-size: 18px;
  font-weight: 700;
}
.kpi-label {
  display: block;
  margin-top: 4px;
  color: #8a817c;
  font-size: 10px;
  line-height: 1.3;
}
.section {
  padding: 18px 16px 4px;
}
.kicker {
  display: block;
  color: #BE2D22;
  font-size: 11px;
  letter-spacing: 1px;
  font-weight: 600;
}
.section-title {
  display: block;
  margin: 6px 0 12px;
  color: #1f1a18;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.4;
}
.cap-scroll {
  width: 100%;
  white-space: nowrap;
}
.cap-track {
  display: inline-flex;
  gap: 10px;
  padding-right: 16px;
}
.cap-card {
  width: 240px;
  flex-shrink: 0;
  white-space: normal;
  background: #fff;
  border-radius: 14px;
  padding: 14px;
}
.cap-icon {
  width: 36px;
  height: 36px;
  border: 1.5px solid #BE2D22;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
}
.bars {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 16px;
}
.bar {
  width: 4px;
  background: #BE2D22;
  border-radius: 1px;
}
.b1 { height: 7px; }
.b2 { height: 16px; }
.b3 { height: 11px; }
.wallet {
  width: 16px;
  height: 12px;
  border: 1.5px solid #BE2D22;
  border-radius: 3px;
}
.check {
  width: 10px;
  height: 6px;
  border-left: 2px solid #BE2D22;
  border-bottom: 2px solid #BE2D22;
  transform: rotate(-45deg) translateY(-1px);
}
.cap-title {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: #1f1a18;
}
.cap-desc {
  display: block;
  margin-top: 6px;
  color: #8a817c;
  font-size: 12px;
  line-height: 1.55;
}
.dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin: 12px 0 4px;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ddd4cf;
}
.dot.on {
  background: #BE2D22;
}
.steps {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.step {
  width: calc(50% - 5px);
  background: #fff;
  border-radius: 14px;
  padding: 14px 12px;
  box-sizing: border-box;
}
.step-num {
  display: block;
  color: #BE2D22;
  font-size: 12px;
  font-weight: 700;
}
.step-title {
  display: block;
  margin: 4px 0 6px;
  font-size: 15px;
  font-weight: 700;
  color: #1f1a18;
}
.step-desc {
  display: block;
  color: #8a817c;
  font-size: 12px;
  line-height: 1.5;
}
.final {
  margin: 16px 16px 0;
  background: #BE2D22;
  border-radius: 16px;
  padding: 18px 16px;
}
.final-kicker {
  display: block;
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
}
.final-title {
  display: block;
  margin: 6px 0 14px;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.45;
}
.final-btn {
  height: 40px;
  border-radius: 10px;
  font-size: 14px;
}
.arrow {
  font-size: 14px;
}
</style>
