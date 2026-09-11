<template>
  <view class="page">
    <view class="entries">
      <view
        v-for="item in entries"
        :key="item.value"
        class="entry"
        :class="{ active: serviceEntry === item.value }"
        @click="switchEntry(item.value)"
      >
        <text>{{ item.label }}</text>
      </view>
    </view>

    <view v-if="!typeStepDone" class="block type-step">
      <text class="type-label"><text class="req">*</text>内容类型</text>
      <view class="type-grid" :class="{ 'type-grid-single': contentTypes.length === 1 }">
        <view
          v-for="item in contentTypes"
          :key="item.id"
          class="type-card"
          :class="{ active: contentTypeCode === item.type_code }"
          @click="selectContentType(item.type_code)"
        >
          <view class="type-icon-wrap">
            <text class="type-icon">{{ typeCardIcon(item) }}</text>
          </view>
          <text class="type-name">{{ item.name }}</text>
          <text class="type-desc">{{ contentTypeDesc(item.name) }}</text>
        </view>
      </view>
    </view>

    <template v-else>
      <view class="selected-type-bar" @click="backToTypeStep">
        <text class="selected-type-text">内容类型：{{ selectedContentTypeName }}</text>
        <text class="selected-type-change">更换</text>
      </view>

      <view class="block">
        <text class="block-title">业务变量</text>
        <view v-if="serviceEntry === '装修家居'" class="field">
          <text class="label">外框面积 *</text>
          <picker :range="frameAreaLabels" @change="onFrameArea">
            <view class="picker">
              <text class="picker-text">{{ formValues['外框面积'] || '请选择外框面积' }}</text>
              <text class="picker-arrow">▾</text>
            </view>
          </picker>
        </view>
        <view v-if="serviceEntry === '装修家居' && quoteVariables.length" class="field">
          <text class="label">预算 *</text>
          <view v-for="item in quoteVariables" :key="item.id || item.key || item.name" class="quote-row">
            <text class="quote-name">{{ fieldLabel(item) }}</text>
            <input
              class="quote-input"
              :value="formValues[fieldName(item)]"
              :placeholder="'根据外框面积自动带出价格范围'"
              @input="onQuoteInput(fieldName(item), $event)"
            />
          </view>
        </view>
        <view v-for="item in formVariables" :key="item.id || item.key || item.name" class="field">
          <text class="label">{{ fieldLabel(item) }}{{ isRequired(item) ? ' *' : '' }}</text>
          <picker
            v-if="isSelectField(item)"
            :range="fieldOptions(item)"
            @click="onSelectFieldTap(item)"
            @change="onSelectField(item, $event)"
          >
            <view class="picker">
              <text class="picker-text">{{ formValues[fieldName(item)] || item.placeholder || `请选择${fieldLabel(item)}` }}</text>
              <text class="picker-arrow">▾</text>
            </view>
          </picker>
          <input
            v-else
            v-model="formValues[fieldName(item)]"
            :placeholder="item.placeholder || `请输入${fieldLabel(item)}`"
          />
        </view>
        <view v-if="serviceEntry === '装修家居'" class="field">
          <text class="label">设计风格 *</text>
          <picker :range="schema.design_styles" @change="onStyle">
            <view class="picker">
              <text class="picker-text">{{ formValues['设计风格'] || '请选择设计风格' }}</text>
              <text class="picker-arrow">▾</text>
            </view>
          </picker>
        </view>
        <view v-if="hasRegionField" class="field">
          <text class="label">所在区域{{ regionRequired ? ' *' : '' }}</text>
          <view class="picker" @click="openRegion">
            <text class="picker-text">{{ formValues['所在区域'] || '请选择所在区域' }}</text>
            <text class="picker-arrow">▾</text>
          </view>
        </view>
      </view>

      <view v-if="serviceEntry === '装修家居'" class="block">
        <text class="block-title">选择图库图片 *</text>
        <view class="gallery-grid">
          <view
            v-for="item in rootGalleries"
            :key="item.id"
            class="gallery-card"
            :class="{ active: selectedGalleryRootId === item.id }"
            @click="openGallery(item.id)"
          >
            <text class="gallery-name">{{ item.name }}</text>
            <text class="gallery-count">{{ item.count }}张图片素材</text>
            <text v-if="selectedGalleryRootId === item.id" class="gallery-badge">已选择</text>
          </view>
        </view>
        <view class="cover-actions">
          <view class="cover-action" @click="chooseCover">上传图片</view>
        </view>
        <text class="block-title">小红书封面模板 *</text>
        <scroll-view class="templates" scroll-x>
          <view
            v-for="item in schema.hycanvas_templates"
            :key="item.id"
            class="tpl"
            :class="{ active: coverTemplateId === item.id }"
            @click="coverTemplateId = item.id"
          >
            <image :src="thumbUrl(item.preview_urls && item.preview_urls[0], 360)" mode="aspectFill" lazy-load />
            <text class="tpl-title">{{ item.title }}</text>
          </view>
        </scroll-view>
        <view v-if="coverPhotoSrc" class="xhs-preview">
          <text class="block-title">小红书封面预览</text>
          <view class="xhs-pair">
            <view class="xhs-card">
              <view class="xhs-preview-frame">
                <image class="xhs-preview-image" :src="coverPhotoSrc" mode="aspectFill" />
              </view>
              <text class="xhs-card-label">封面原图</text>
            </view>
            <view class="xhs-card">
              <view class="xhs-preview-frame">
                <image class="xhs-preview-image" :src="coverPhotoSrc" mode="aspectFill" />
                <view v-if="templateOverlaySrc" class="xhs-preview-overlay-wrap" :class="{ multiply: overlayUsesMultiply }">
                  <image class="xhs-preview-overlay" :src="templateOverlaySrc" mode="scaleToFill" />
                </view>
              </view>
              <text class="xhs-card-label">模板叠加效果</text>
              <text v-if="selectedTemplateTitle" class="xhs-card-sub">{{ selectedTemplateTitle }}</text>
            </view>
          </view>
          <view v-if="imageItemId || coverAssetId" class="xhs-preview-toolbar">
            <text class="selected-cover-link" @click="coverGalleryId ? openGallery(coverGalleryId) : chooseCover">更换</text>
            <text class="selected-cover-link" @click="clearCover">清除</text>
          </view>
        </view>
      </view>

      <button class="submit" :loading="submitting" @click="compile">
        生成内容
      </button>
    </template>

    <tab-bar current="generate" />

    <view v-if="regionOpen" class="region-page">
      <view class="region-crumbs">
        <view class="region-nav">
          <text class="crumb" @click="backToCities">湖南省</text>
          <text
            v-if="regionLevel === 'district' && regionCity"
            class="crumb"
            @click="pickCityOnly"
          >{{ regionCity }}</text>
          <text class="crumb current">请选择</text>
        </view>
        <text class="region-close" @click="closeRegion">关闭</text>
      </view>
      <scroll-view class="region-list" scroll-y>
        <view v-if="regionLevel === 'district'" class="region-row" @click="pickCityOnly">
          <text class="region-letter"></text>
          <text class="region-name">{{ regionCity }}</text>
        </view>
        <view v-for="group in regionGroups" :key="group.letter" class="region-group">
          <view
            v-for="(name, idx) in group.items"
            :key="name"
            class="region-row"
            @click="pickRegion(name)"
          >
            <text class="region-letter">{{ idx === 0 ? group.letter : '' }}</text>
            <text class="region-name">{{ name }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <view v-if="galleryOpen" class="gallery-page">
      <view class="region-crumbs">
        <view class="region-nav">
          <text class="crumb" @click="backGallery">图库</text>
          <text v-if="activeGallery" class="crumb current">{{ activeGallery.name }}</text>
        </view>
        <text class="region-close" @click="closeGallery">关闭</text>
      </view>
      <scroll-view class="gallery-body" scroll-y>
        <view v-if="galleryParent" class="gallery-back" @click="openGallery(galleryParent.id)">
          返回 {{ galleryParent.name }}
        </view>
        <view v-if="galleryChildren.length" class="gallery-grid inner">
          <view
            v-for="item in galleryChildren"
            :key="item.id"
            class="gallery-card"
            :class="{ active: coverGalleryId === item.id }"
            @click="openGallery(item.id)"
          >
            <text class="gallery-name">{{ item.name }}</text>
            <text class="gallery-count">{{ item.count }}张图片素材</text>
          </view>
        </view>
        <view class="photo-grid">
          <view
            v-for="item in galleryItems"
            :key="item.id"
            class="photo-item"
            :class="{ active: imageItemId === item.id && !isGalleryImageUsed(item), used: isGalleryImageUsed(item) }"
            @click="selectGalleryItem(item)"
          >
            <image :src="galleryThumbUrl(item)" mode="aspectFill" lazy-load />
            <text v-if="isGalleryImageUsed(item)" class="used-badge">已使用</text>
          </view>
        </view>
        <text v-if="!galleryLoading && !galleryItems.length && !galleryChildren.length" class="empty">
          该图库暂无图片，可返回后点上传图片
        </text>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import TabBar from '../../components/tab-bar.vue'
import { mpContentApi } from '../../apis/mp'
import { TOKEN_KEY } from '../../config'
import { errorMessage, galleryThumbUrl, mediaUrl, thumbUrl } from '../../utils/request'

const REGION_INITIAL = {
  芙: 'F', 天: 'T', 岳: 'Y', 开: 'K', 雨: 'Y', 望: 'W', 长: 'C', 浏: 'L', 宁: 'N',
  荷: 'H', 芦: 'L', 石: 'S', 渌: 'L', 醴: 'L', 攸: 'Y', 茶: 'C', 炎: 'Y', 云: 'Y',
  湘: 'X', 韶: 'S', 珠: 'Z', 雁: 'Y', 蒸: 'Z', 南: 'N', 衡: 'H', 祁: 'Q', 耒: 'L',
  常: 'C', 双: 'S', 大: 'D', 北: 'B', 邵: 'S', 新: 'X', 隆: 'L', 洞: 'D', 绥: 'S',
  城: 'C', 武: 'W', 君: 'J', 华: 'H', 平: 'P', 汨: 'M', 临: 'L', 鼎: 'D', 安: 'A',
  汉: 'H', 澧: 'L', 桃: 'T', 津: 'J', 永: 'Y', 慈: 'C', 桑: 'S', 资: 'Z', 赫: 'H',
  沅: 'Y', 苏: 'S', 桂: 'G', 宜: 'Y', 嘉: 'J', 汝: 'R', 零: 'L', 冷: 'L', 东: 'D',
  道: 'D', 江: 'J', 蓝: 'L', 鹤: 'H', 中: 'Z', 辰: 'C', 溆: 'X', 会: 'H', 麻: 'M',
  芷: 'Z', 靖: 'J', 通: 'T', 洪: 'H', 娄: 'L', 涟: 'L', 吉: 'J', 泸: 'L', 凤: 'F',
  花: 'H', 保: 'B', 古: 'G', 龙: 'L', 株: 'Z', 张: 'Z', 益: 'Y', 郴: 'C', 怀: 'H'
}

function regionLetter(name) {
  return REGION_INITIAL[String(name || '').charAt(0)] || '#'
}

function groupRegionNames(names) {
  const groups = {}
  for (const name of names) {
    const letter = regionLetter(name)
    if (!groups[letter]) groups[letter] = []
    groups[letter].push(name)
  }
  return Object.keys(groups)
    .sort()
    .map((letter) => ({ letter, items: groups[letter] }))
}

function matchRegionCity(value, tree) {
  const current = String(value || '').trim()
  if (!current) return ''
  const exact = tree.find((item) => item.city === current)
  if (exact) return exact.city
  const prefixed = tree
    .filter((item) => current.startsWith(item.city) && current.length > item.city.length)
    .sort((a, b) => b.city.length - a.city.length)
  return prefixed.length ? prefixed[0].city : ''
}

const MAX_PHOTOS = 3
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024
const ALLOWED_UPLOAD_EXTS = ['png', 'jpg', 'jpeg', 'webp']

const REVIEW_NOTES_TYPE_CODE = 'review_notes'
const REVIEW_NOTES_TYPE = {
  id: 'review-notes',
  type_code: REVIEW_NOTES_TYPE_CODE,
  name: '好评笔记',
  variables: []
}

const CONTENT_TYPE_DESC = {
  工艺施工展示: '水电泥木油各阶段，AI自动生成专业话术',
  装修报价清单: '把复杂的报价变成客户能看懂的小红书图文，信任度直接拉满',
  装修案例分享: '上传几张完工照，AI帮你写故事感文案，从“这是我家”到“想抄”',
  装修知识科普: '那些你重复讲了100遍的避坑知识，AI帮你整理成收藏级干货笔记',
  人设自荐: '项目经理/设计师个人IP打造，AI帮你写出有温度的人设文案',
  装修避坑分享: '把高频踩坑点整理成避雷笔记，帮客户少交学费',
  装修省钱攻略: '预算怎么花更值，AI帮你写出可落地的省钱建议',
  好评笔记: '品牌宣传 / 流量曝光\n默认目标：塑造品牌口碑'
}

export default {
  components: { TabBar },
  data() {
    return {
      serviceEntry: '装修家居',
      typeStepDone: false,
      entries: [
        { value: '装修家居', label: '装修家居' },
        { value: '好评笔记', label: '好评笔记' }
      ],
      schema: {
        content_types: [],
        variables: [],
        frame_areas: [],
        design_styles: [],
        project_stages: [],
        target_audiences: [],
        resident_populations: [],
        process_types: [],
        process_names_by_type: {},
        regions: [],
        region_tree: [],
        cover_templates: [],
        hycanvas_templates: []
      },
      regionOpen: false,
      regionLevel: 'city',
      regionCity: '',
      contentTypeCode: '',
      formValues: {},
      coverLocal: '',
      coverAssetId: '',
      coverTemplateId: '',
      imageItemId: '',
      coverName: '',
      coverCategory: '',
      coverGalleryId: '',
      galleries: [],
      galleryOpen: false,
      galleryId: '',
      galleryItems: [],
      galleryLoading: false,
      photos: [],
      maxPhotos: MAX_PHOTOS,
      uploadCategoryId: 'uncategorized',
      submitting: false,
      schemaLoaded: false,
      resumeAfterPicker: false
    }
  },
  computed: {
    isHomeDecor() {
      return String(this.serviceEntry || '').includes('装修')
    },
    isReviewNotes() {
      return String(this.serviceEntry || '').includes('好评')
    },
    contentTypes() {
      if (this.isReviewNotes) return [REVIEW_NOTES_TYPE]
      return this.schema.content_types || []
    },
    selectedContentTypeName() {
      const selected = this.contentTypes.find((item) => item.type_code === this.contentTypeCode)
      return (selected && selected.name) || '未选择'
    },
    variables() {
      let list = []
      if (this.serviceEntry === '装修家居') {
        const selected = (this.schema.content_types || []).find(
          (item) => item.type_code === this.contentTypeCode
        )
        list = (selected && selected.variables) || []
      } else {
        list = this.schema.variables || []
      }
      return this.prioritizeFormFields(list)
    },
    frameAreaLabels() {
      return (this.schema.frame_areas || []).map((item) => item.label)
    },
    quoteVariables() {
      return this.variables.filter((item) => this.isQuoteField(this.fieldName(item)))
    },
    formVariables() {
      return this.variables.filter((item) => {
        const name = this.fieldName(item)
        const label = this.fieldLabel(item)
        if (this.isQuoteField(name)) return false
        if (name === '所在区域') return false
        if (this.isHomeDecor && ['外框面积', '设计风格'].includes(name)) return false
        if (this.isUploadCategoryField(item)) return false
        if (this.isReviewNotes && /照片|图片|封面|上传/.test(`${name}${label}`)) return false
        return true
      })
    },
    hasRegionField() {
      return this.variables.some((item) => this.fieldName(item) === '所在区域')
    },
    regionRequired() {
      const item = this.variables.find((entry) => this.fieldName(entry) === '所在区域')
      return item ? this.isRequired(item) : false
    },
    regionGroups() {
      const tree = this.schema.region_tree || []
      if (this.regionLevel === 'district') {
        const city = tree.find((item) => item.city === this.regionCity)
        return groupRegionNames((city && city.districts) || [])
      }
      return groupRegionNames(tree.map((item) => item.city))
    },
    rootGalleries() {
      return (this.galleries || []).filter((item) => !item.parent_id)
    },
    activeGallery() {
      return (this.galleries || []).find((item) => item.id === this.galleryId) || null
    },
    galleryParent() {
      const current = this.activeGallery
      if (!current || !current.parent_id) return null
      return (this.galleries || []).find((item) => item.id === current.parent_id) || null
    },
    galleryChildren() {
      return (this.galleries || []).filter((item) => item.parent_id === this.galleryId)
    },
    selectedGalleryRootId() {
      let current = (this.galleries || []).find((item) => item.id === this.coverGalleryId)
      while (current && current.parent_id) {
        current = (this.galleries || []).find((item) => item.id === current.parent_id)
      }
      return current ? current.id : ''
    },
    uploadCategoryOptions() {
      const roots = this.rootGalleries || []
      if (roots.length) return roots
      return [{ id: 'uncategorized', name: '未分类' }]
    },
    uploadCategoryLabels() {
      return this.uploadCategoryOptions.map((item) =>
        item.description ? `${item.name} — ${item.description}` : item.name
      )
    },
    uploadCategoryLabel() {
      const selected = this.uploadCategoryOptions.find((item) => item.id === this.uploadCategoryId)
      if (!selected) return ''
      return selected.description ? `${selected.name} — ${selected.description}` : selected.name
    },
    selectedTemplate() {
      return (this.schema.hycanvas_templates || []).find((item) => item.id === this.coverTemplateId) || null
    },
    selectedTemplateTitle() {
      return (this.selectedTemplate && this.selectedTemplate.title) || ''
    },
    coverPhotoSrc() {
      return this.coverLocal || ''
    },
    templateOverlaySrc() {
      const template = this.selectedTemplate
      if (!template) return ''
      return this.firstMedia(
        template.overlay_url,
        template.overlay_file_url,
        template.overlay_urls,
        template.mask_url,
        template.transparent_url,
        template.layer_url,
        template.layer_urls,
        Array.isArray(template.preview_urls) && template.preview_urls.length > 1
          ? template.preview_urls.slice(1)
          : '',
        template.preview_urls,
        template.preview_url
      )
    },
    overlayUsesMultiply() {
      const template = this.selectedTemplate
      if (!template) return false
      return !this.firstMedia(
        template.overlay_url,
        template.overlay_file_url,
        template.overlay_urls,
        template.mask_url,
        template.transparent_url,
        template.layer_url,
        template.layer_urls,
        Array.isArray(template.preview_urls) && template.preview_urls.length > 1
          ? template.preview_urls.slice(1)
          : ''
      )
    }
  },
  onLoad() {
    if (!uni.getStorageSync(TOKEN_KEY)) {
      uni.reLaunch({ url: '/pages/login/login' })
      return
    }
    this.loadSchema()
  },
  onShow() {
    // 从系统相册选图返回会触发 onShow；此时不应重拉 schema，否则会把步骤打回内容类型选择。
    if (this.resumeAfterPicker) {
      this.resumeAfterPicker = false
      return
    }
    if (!this.schemaLoaded) {
      this.loadSchema()
    }
  },
  watch: {
    contentTypeCode() {
      if (this.serviceEntry !== '装修家居') return
      const next = { ...this.formValues }
      for (const item of this.variables) {
        const name = this.fieldName(item)
        if (name && next[name] === undefined) next[name] = ''
      }
      this.formValues = next
    }
  },
  methods: {
    mediaUrl,
    thumbUrl,
    galleryThumbUrl,
    firstMedia(...values) {
      for (const value of values) {
        if (Array.isArray(value) && value.length) {
          const nested = this.firstMedia(...value)
          if (nested) return nested
        } else if (value && typeof value === 'object') {
          const nested = this.firstMedia(value.url, value.file_url, value.preview_url)
          if (nested) return nested
        } else if (typeof value === 'string' && value.trim()) {
          return this.mediaUrl(value.trim(), { format: 'webp', width: 1080, quality: 80 })
        }
      }
      return ''
    },
    shortTypeName(name) {
      return String(name || '')
        .replace(/^装修/, '')
        .replace(/分享$/, '')
    },
    contentTypeDesc(name) {
      return CONTENT_TYPE_DESC[name] || '按所选内容类型生成专业小红书文案'
    },
    typeCardIcon(item) {
      return item && item.type_code === REVIEW_NOTES_TYPE_CODE ? '👍' : '⌂'
    },
    selectContentType(typeCode) {
      if (!typeCode) {
        uni.showToast({ title: '请选择内容类型', icon: 'none' })
        return
      }
      this.contentTypeCode = typeCode
      if (this._typeSelectTimer) {
        clearTimeout(this._typeSelectTimer)
        this._typeSelectTimer = null
      }
      // 先高亮卡片，再进入业务变量步骤
      this._typeSelectTimer = setTimeout(() => {
        this.typeStepDone = true
        this.loadGalleries()
        this._typeSelectTimer = null
      }, 180)
    },
    backToTypeStep() {
      if (this._typeSelectTimer) {
        clearTimeout(this._typeSelectTimer)
        this._typeSelectTimer = null
      }
      this.typeStepDone = false
    },
    isQuoteField(name) {
      return ['基础', '木制品', '主材'].includes(name)
    },
    prioritizeFormFields(fields) {
      const priority = ['外框面积', '基础', '木制品', '主材']
      const rank = Object.fromEntries(priority.map((name, index) => [name, index]))
      const fallback = priority.length
      return (fields || [])
        .map((field, index) => ({ field, index }))
        .sort((a, b) => {
          const aName = this.fieldName(a.field)
          const bName = this.fieldName(b.field)
          const aRank = Object.prototype.hasOwnProperty.call(rank, aName) ? rank[aName] : fallback
          const bRank = Object.prototype.hasOwnProperty.call(rank, bName) ? rank[bName] : fallback
          return aRank - bRank || a.index - b.index
        })
        .map((item) => item.field)
    },
    fieldName(item) {
      return String((item && (item.key || item.name)) || '').trim()
    },
    fieldLabel(item) {
      return String((item && (item.label || item.name || item.key)) || '').trim()
    },
    isUploadCategoryField(item) {
      const text = `${this.fieldName(item)}${this.fieldLabel(item)}`
      return /上传分类|upload_category|uploadCategory/i.test(text)
    },
    isRequired(item) {
      if (!item || item.required === undefined || item.required === null) return true
      return Boolean(item.required)
    },
    isSelectField(item) {
      if (!item) return false
      if (item.type === 'select' || (Array.isArray(item.options) && item.options.length > 0)) return true
      const name = this.fieldName(item)
      if (name === '目标人群' && (this.schema.target_audiences || []).length > 0) return true
      if (name === '居住人口' && (this.schema.resident_populations || []).length > 0) return true
      if (name === '工艺类型' && (this.schema.process_types || []).length > 0) return true
      if (name === '工艺名称' && Object.keys(this.schema.process_names_by_type || {}).length > 0) return true
      if (name === '项目阶段' && (this.schema.project_stages || []).length > 0) return true
      return false
    },
    fieldOptions(item) {
      const name = this.fieldName(item)
      if (name === '目标人群' && (this.schema.target_audiences || []).length) {
        return this.schema.target_audiences
      }
      if (name === '居住人口' && (this.schema.resident_populations || []).length) {
        return this.schema.resident_populations
      }
      if (name === '工艺类型' && (this.schema.process_types || []).length) {
        return this.schema.process_types
      }
      if (name === '工艺名称') {
        const selectedType = String(this.formValues['工艺类型'] || '').trim()
        if (!selectedType) return []
        return (this.schema.process_names_by_type && this.schema.process_names_by_type[selectedType]) || []
      }
      if (name === '项目阶段' && (this.schema.project_stages || []).length) {
        return this.schema.project_stages
      }
      return (item && item.options) || []
    },
    hasProcessTypeVariable() {
      return this.variables.some((item) => this.fieldName(item) === '工艺类型')
    },
    onSelectFieldTap(item) {
      if (this.fieldName(item) !== '工艺名称') return
      const selectedType = String(this.formValues['工艺类型'] || '').trim()
      if (!this.hasProcessTypeVariable() || !selectedType) {
        uni.showToast({
          title: '请先选择工艺类型，若没有工艺类型变量，请联系管理员配置',
          icon: 'none',
          duration: 3000
        })
      }
    },
    onSelectField(item, event) {
      const name = this.fieldName(item)
      if (name === '工艺名称') {
        const selectedType = String(this.formValues['工艺类型'] || '').trim()
        if (!this.hasProcessTypeVariable() || !selectedType) {
          uni.showToast({
            title: '请先选择工艺类型，若没有工艺类型变量，请联系管理员配置',
            icon: 'none',
            duration: 3000
          })
          return
        }
      }
      const options = this.fieldOptions(item)
      const value = options[event.detail.value]
      if (!name || value === undefined) return
      const next = { ...this.formValues, [name]: value }
      if (name === '工艺类型') {
        const allowed = (this.schema.process_names_by_type && this.schema.process_names_by_type[value]) || []
        if (next['工艺名称'] && !allowed.includes(next['工艺名称'])) next['工艺名称'] = ''
      }
      this.formValues = next
    },
    async switchEntry(value) {
      if (this._typeSelectTimer) {
        clearTimeout(this._typeSelectTimer)
        this._typeSelectTimer = null
      }
      this.serviceEntry = value
      this.typeStepDone = false
      this.contentTypeCode = ''
      this.formValues = {}
      this.photos = []
      this.uploadCategoryId = 'uncategorized'
      this.coverLocal = ''
      this.coverAssetId = ''
      this.coverTemplateId = ''
      this.clearCover()
      this.closeGallery()
      this.closeRegion()
      this.schemaLoaded = false
      await this.loadSchema()
    },
    async loadSchema() {
      try {
        const data = await mpContentApi.formSchema(this.serviceEntry)
        this.schema = data
        this.schemaLoaded = true
        const next = { ...this.formValues }
        for (const item of this.variables) {
          const name = this.fieldName(item)
          if (name && next[name] === undefined) next[name] = ''
        }
        this.formValues = next
        const templates = data.hycanvas_templates || []
        if (!this.coverTemplateId || !templates.some((item) => item.id === this.coverTemplateId)) {
          this.coverTemplateId = templates.length ? templates[0].id : ''
        }
        await this.loadGalleries()
        this.ensureUploadCategory()
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      }
    },
    onFrameArea(event) {
      const item = this.schema.frame_areas[event.detail.value]
      if (!item) return
      const quotes = {}
      const quoteKeys = this.quoteVariables.map((entry) => this.fieldName(entry)).filter(Boolean)
      for (const key of quoteKeys) {
        const choices = (item.quote_choices && item.quote_choices[key]) || []
        if (!choices.length) continue
        quotes[key] = choices[Math.floor(Math.random() * choices.length)]
      }
      this.formValues = { ...this.formValues, 外框面积: item.value, ...quotes }
    },
    onQuoteInput(name, event) {
      this.formValues = { ...this.formValues, [name]: event.detail.value }
    },
    onStyle(event) {
      this.formValues = { ...this.formValues, 设计风格: this.schema.design_styles[event.detail.value] }
    },
    openRegion() {
      const tree = this.schema.region_tree || []
      const cityName = matchRegionCity(this.formValues['所在区域'], tree)
      this.regionOpen = true
      if (cityName) {
        this.regionCity = cityName
        this.regionLevel = 'district'
      } else {
        this.regionCity = ''
        this.regionLevel = 'city'
      }
    },
    async loadGalleries() {
      try {
        const data = await mpContentApi.galleries()
        this.galleries = data.galleries || []
        this.ensureUploadCategory()
      } catch (error) {
        this.galleries = []
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      }
    },
    ensureUploadCategory() {
      const options = this.uploadCategoryOptions
      if (!options.some((item) => item.id === this.uploadCategoryId)) {
        this.uploadCategoryId = options[0]?.id || 'uncategorized'
      }
    },
    fileExt(path) {
      const clean = String(path || '').split('?')[0]
      const name = clean.split('/').pop() || ''
      const parts = name.split('.')
      return parts.length > 1 ? parts.pop().toLowerCase() : ''
    },
    async assertUploadableImage(filePath) {
      const ext = this.fileExt(filePath)
      // 微信临时路径常无扩展名；HEIC 可能带 .heic 或伪装成其它后缀，交给 compressImage 转 JPEG
      if (ext && !ALLOWED_UPLOAD_EXTS.includes(ext) && !['heic', 'heif', 'gif', 'bmp'].includes(ext)) {
        throw new Error('仅支持 PNG、JPG、WebP 图片（相册请选照片）')
      }
      try {
        const info = await new Promise((resolve, reject) => {
          uni.getFileInfo({
            filePath,
            success: resolve,
            fail: reject
          })
        })
        if ((info && info.size) > MAX_UPLOAD_BYTES) {
          throw new Error('单张图片不能超过 20 MB')
        }
      } catch (error) {
        if (error && error.message) throw error
      }
    },
    prepareUploadImage(filePath) {
      return new Promise((resolve) => {
        // 微信相册常见 HEIC，原图直传会被后端拒绝；压缩后多为 JPEG
        if (typeof uni.compressImage !== 'function') {
          resolve(filePath)
          return
        }
        uni.compressImage({
          src: filePath,
          quality: 80,
          success: (res) => resolve((res && res.tempFilePath) || filePath),
          fail: () => resolve(filePath)
        })
      })
    },
    clearCover() {
      this.coverLocal = ''
      this.coverAssetId = ''
      this.imageItemId = ''
      this.coverName = ''
      this.coverCategory = ''
      this.coverGalleryId = ''
    },
    closeGallery() {
      this.galleryOpen = false
    },
    isGalleryImageUsed(item) {
      return Boolean(item && item.in_use)
    },
    backGallery() {
      if (this.galleryParent) {
        this.openGallery(this.galleryParent.id)
        return
      }
      this.closeGallery()
    },
    async openGallery(galleryId) {
      this.galleryId = galleryId
      this.galleryOpen = true
      this.galleryLoading = true
      this.galleryItems = []
      try {
        const data = await mpContentApi.galleryItems(galleryId)
        this.galleryItems = data.items || []
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      } finally {
        this.galleryLoading = false
      }
    },
    selectGalleryItem(item) {
      if (this.isGalleryImageUsed(item)) {
        uni.showToast({ title: '该图片已被其他内容使用', icon: 'none' })
        return
      }
      this.imageItemId = item.id
      this.coverAssetId = item.asset_id
      this.coverName = item.name || item.file_name || ''
      this.coverCategory = item.category_name || this.activeGallery?.name || ''
      this.coverGalleryId = this.galleryId
      this.coverLocal = this.mediaUrl(item.file_url, { format: 'webp', width: 1080, quality: 80 })
      this.closeGallery()
    },
    closeRegion() {
      this.regionOpen = false
      this.regionLevel = 'city'
      this.regionCity = ''
    },
    backToCities() {
      this.regionCity = ''
      this.regionLevel = 'city'
    },
    pickCityOnly() {
      if (!this.regionCity) return
      this.formValues = { ...this.formValues, 所在区域: this.regionCity }
      this.closeRegion()
    },
    pickRegion(name) {
      if (this.regionLevel === 'city') {
        this.regionCity = name
        this.regionLevel = 'district'
        return
      }
      this.formValues = { ...this.formValues, 所在区域: `${this.regionCity}${name}` }
      this.closeRegion()
    },
    chooseCover() {
      this.ensureUploadCategory()
      this.resumeAfterPicker = true
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        success: async (res) => {
          const filePath = res.tempFilePaths[0]
          this.coverLocal = filePath
          try {
            await this.assertUploadableImage(filePath)
            const uploadPath = await this.prepareUploadImage(filePath)
            const uploaded = await mpContentApi.uploadCover(uploadPath, this.uploadCategoryId)
            this.coverAssetId = uploaded.asset.id
            this.imageItemId = uploaded.library_item_id || ''
            this.coverName = (uploaded.asset && uploaded.asset.original_file_name) || '上传图片'
            this.coverCategory = uploaded.category_name || this.uploadCategoryLabel || '未分类'
            this.coverGalleryId = uploaded.category || this.uploadCategoryId
            await this.loadGalleries()
          } catch (error) {
            this.clearCover()
            uni.showToast({ title: error.message || errorMessage(error), icon: 'none' })
          }
        },
        fail: () => {
          this.resumeAfterPicker = false
        }
      })
    },
    choosePhotos() {
      this.ensureUploadCategory()
      const remain = this.maxPhotos - this.photos.length
      if (remain <= 0) {
        uni.showToast({ title: `最多上传${this.maxPhotos}张图片`, icon: 'none' })
        return
      }
      this.resumeAfterPicker = true
      uni.chooseImage({
        count: remain,
        sizeType: ['compressed'],
        success: async (res) => {
          for (const filePath of res.tempFilePaths || []) {
            if (this.photos.length >= this.maxPhotos) {
              uni.showToast({ title: `最多上传${this.maxPhotos}张图片`, icon: 'none' })
              break
            }
            try {
              await this.assertUploadableImage(filePath)
              const uploadPath = await this.prepareUploadImage(filePath)
              const uploaded = await mpContentApi.uploadCover(uploadPath, this.uploadCategoryId)
              this.photos = [
                ...this.photos,
                {
                  local: filePath,
                  assetId: uploaded.asset.id,
                  libraryItemId: uploaded.library_item_id || ''
                }
              ]
            } catch (error) {
              uni.showToast({ title: error.message || errorMessage(error), icon: 'none' })
              break
            }
          }
          await this.loadGalleries()
        },
        fail: () => {
          this.resumeAfterPicker = false
        }
      })
    },
    removePhoto(index) {
      this.photos = this.photos.filter((_, itemIndex) => itemIndex !== index)
    },
    async compile() {
      if (this.isHomeDecor && !this.contentTypeCode) {
        uni.showToast({ title: '请选择内容类型', icon: 'none' })
        return
      }
      for (const item of this.formVariables) {
        if (!this.isRequired(item)) continue
        const name = this.fieldName(item)
        if (!String(this.formValues[name] || '').trim()) {
          uni.showToast({ title: `请填写${this.fieldLabel(item)}`, icon: 'none' })
          return
        }
      }
      if (this.hasRegionField && this.regionRequired && !String(this.formValues['所在区域'] || '').trim()) {
        uni.showToast({ title: '请选择所在区域', icon: 'none' })
        return
      }
      if (this.isHomeDecor) {
        for (const label of ['外框面积', '设计风格']) {
          if (!this.formValues[label]) {
            uni.showToast({ title: `请选择${label}`, icon: 'none' })
            return
          }
        }
        for (const item of this.quoteVariables) {
          if (!this.isRequired(item)) continue
          const name = this.fieldName(item)
          if (!String(this.formValues[name] || '').trim()) {
            uni.showToast({ title: `请填写${this.fieldLabel(item)}`, icon: 'none' })
            return
          }
        }
        if (!this.imageItemId && !this.coverAssetId) {
          uni.showToast({ title: '请选择图库图片或上传封面图', icon: 'none' })
          return
        }
        if (!this.coverTemplateId) {
          uni.showToast({ title: '请选择小红书封面模板', icon: 'none' })
          return
        }
      }
      const formValues = { ...this.formValues }
      delete formValues.cover_asset_ids
      delete formValues.cover_asset_id
      delete formValues.image_item_id
      this.ensureUploadCategory()
      for (const item of this.variables) {
        if (!this.isUploadCategoryField(item)) continue
        const name = this.fieldName(item)
        if (name) formValues[name] = '未分类'
      }
      this.submitting = true
      try {
        const payload = {
          service_entry: this.serviceEntry,
          form_values: formValues
        }
        if (this.isHomeDecor) {
          const coverAssetIds = this.coverAssetId ? [this.coverAssetId] : []
          payload.content_type_code = this.contentTypeCode
          payload.cover_asset_id = coverAssetIds[0]
          payload.cover_asset_ids = coverAssetIds
          payload.image_item_id = this.imageItemId || undefined
          payload.hycanvas_template_id = this.coverTemplateId || undefined
          formValues.cover_asset_ids = coverAssetIds
        }
        const data = await mpContentApi.compileBrief(payload)
        uni.navigateTo({
          url: `/pages/generate/locked?task_id=${data.task_id}&service_entry=${encodeURIComponent(this.serviceEntry)}`
        })
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f4f1ee;
  padding: 16px 16px 110px;
}
.entries {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
.entry {
  flex: 1;
  height: 40px;
  border-radius: 20px;
  background: #fff;
  color: #8a817c;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}
.entry.active {
  background: #BE2D22;
  color: #fff;
}
.type-step {
  padding-bottom: 18px;
}
.type-label {
  display: block;
  margin-bottom: 12px;
  color: #2b2422;
  font-size: 15px;
  font-weight: 600;
}
.type-label .req {
  color: #d64545;
  margin-right: 2px;
}
.type-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}
.type-grid-single {
  justify-content: flex-start;
}
.type-grid-single .type-card {
  width: 48%;
}
.type-card {
  width: 48%;
  box-sizing: border-box;
  margin-bottom: 10px;
  padding: 14px 10px 12px;
  border-radius: 12px;
  border: 1px solid #e5e0dc;
  background: #fff;
  text-align: center;
}
.type-card.active {
  border-color: #BE2D22;
  background: #fbf4f2;
}
.type-icon-wrap {
  width: 36px;
  height: 36px;
  margin: 0 auto 8px;
  border-radius: 10px;
  background: #f0ebe8;
  display: flex;
  align-items: center;
  justify-content: center;
}
.type-card.active .type-icon-wrap {
  background: #f0d9d4;
}
.type-icon {
  color: #9a918c;
  font-size: 22px;
  line-height: 1;
}
.type-card.active .type-icon {
  color: #BE2D22;
}
.type-name {
  display: block;
  color: #6f6763;
  font-size: 14px;
  font-weight: 700;
  line-height: 20px;
  white-space: normal;
  word-break: break-all;
}
.type-card.active .type-name {
  color: #BE2D22;
}
.type-desc {
  display: block;
  margin-top: 6px;
  color: #9a918c;
  font-size: 11px;
  line-height: 16px;
  white-space: pre-line;
  word-break: break-all;
}
.type-card.active .type-desc {
  color: #8a817c;
}
.selected-type-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #fff;
}
.selected-type-text {
  color: #2b2422;
  font-size: 13px;
  font-weight: 600;
}
.selected-type-change {
  color: #BE2D22;
  font-size: 12px;
}
.block {
  background: #fff;
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 12px;
}
.block-title {
  display: block;
  margin-bottom: 10px;
  font-weight: 600;
  color: #2b2422;
}
.hint {
  display: block;
  margin: -4px 0 12px;
  color: #8a817c;
  font-size: 12px;
  line-height: 18px;
}
.gallery-grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  margin-bottom: 8px;
}
.gallery-grid.inner {
  margin-bottom: 12px;
}
.gallery-card {
  width: 48%;
  box-sizing: border-box;
  flex-shrink: 0;
  margin-bottom: 8px;
  padding: 12px;
  border-radius: 12px;
  background: #f7f4f2;
  border: 2px solid transparent;
  position: relative;
}
.gallery-card.active {
  border-color: #BE2D22;
}
.gallery-name {
  display: block;
  color: #2b2422;
  font-weight: 600;
}
.gallery-count {
  display: block;
  margin-top: 4px;
  color: #8a817c;
  font-size: 12px;
}
.gallery-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 10px;
  color: #BE2D22;
}
.cover-actions {
  display: flex;
  margin-bottom: 12px;
}
.cover-action {
  height: 36px;
  padding: 0 14px;
  border-radius: 18px;
  background: #BE2D22;
  color: #fff;
  line-height: 36px;
  font-size: 13px;
}
.xhs-preview {
  margin-top: 14px;
}
.xhs-pair {
  display: flex;
  gap: 10px;
}
.xhs-card {
  flex: 1;
  min-width: 0;
}
.xhs-preview-frame {
  position: relative;
  isolation: isolate;
  width: 100%;
  padding-top: 133.33%;
  overflow: hidden;
  border-radius: 12px;
  background: #f7f4f2;
}
.xhs-preview-image,
.xhs-preview-overlay,
.xhs-preview-overlay-wrap {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.xhs-preview-overlay-wrap.multiply {
  mix-blend-mode: multiply;
}
.xhs-card-label {
  display: block;
  margin-top: 8px;
  color: #2b2422;
  font-size: 13px;
  text-align: center;
}
.xhs-card-sub {
  display: block;
  margin-top: 2px;
  color: #8a817c;
  font-size: 12px;
  text-align: center;
}
.xhs-preview-toolbar {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 10px;
}
.selected-cover-link {
  margin-left: 8px;
  color: #BE2D22;
  font-size: 13px;
  flex-shrink: 0;
}
.gallery-page {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: #fff;
  z-index: 20;
  display: flex;
  flex-direction: column;
}
.gallery-body {
  flex: 1;
  padding: 12px 16px 24px;
}
.gallery-back {
  margin-bottom: 12px;
  color: #BE2D22;
}
.empty {
  display: block;
  padding: 24px 0;
  color: #8a817c;
  text-align: center;
}
.photo-item.active {
  outline: 2px solid #BE2D22;
}
.photo-item.used {
  outline: none;
}
.photo-item.used image {
  opacity: 0.45;
}
.used-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(190, 45, 34, 0.92);
  color: #fff;
  font-size: 10px;
  line-height: 14px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip {
  padding: 6px 10px;
  border-radius: 16px;
  background: #f7f4f2;
  color: #6f6763;
  font-size: 12px;
}
.chip.active {
  background: #f8ece9;
  color: #BE2D22;
}
.field {
  margin-bottom: 12px;
}
.label {
  display: block;
  margin-bottom: 6px;
  color: #8a817c;
  font-size: 12px;
}
input,
.quote-row .quote-input {
  height: 40px;
  padding: 0 12px;
  background: #fff;
  border: 1px solid #BE2D22;
  border-radius: 10px;
  line-height: 40px;
  box-sizing: border-box;
}
.picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  padding: 0 12px;
  background: #f7f4f2;
  border-radius: 10px;
  box-sizing: border-box;
}
.picker-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 40px;
}
.picker-arrow {
  margin-left: 8px;
  color: #8a817c;
  font-size: 12px;
  line-height: 40px;
  flex-shrink: 0;
}
.quote-row {
  display: flex;
  align-items: center;
  margin-top: 8px;
}
.quote-name {
  width: 52px;
  margin-right: 8px;
  color: #6f6763;
  font-size: 13px;
  flex-shrink: 0;
}
.quote-row .quote-input {
  flex: 1;
  min-width: 0;
  font-size: 13px;
}
.cover-upload {
  height: 140px;
  border-radius: 12px;
  background: #f7f4f2;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8a817c;
  overflow: hidden;
}
.cover-upload image {
  width: 100%;
  height: 100%;
}
.cover-upload + .block-title {
  margin-top: 12px;
}
.photo-grid {
  display: flex;
  flex-wrap: wrap;
}
.photo-item,
.photo-add {
  width: 210rpx;
  height: 210rpx;
  margin-right: 12rpx;
  margin-bottom: 12rpx;
  border-radius: 10px;
  overflow: hidden;
  background: #f7f4f2;
  position: relative;
}
.photo-item image {
  width: 100%;
  height: 100%;
}
.photo-remove {
  position: absolute;
  top: 4px;
  right: 6px;
  width: 18px;
  height: 18px;
  line-height: 16px;
  text-align: center;
  border-radius: 9px;
  background: rgba(43, 36, 34, 0.72);
  color: #fff;
  font-size: 14px;
}
.photo-add {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
}
.photo-add-text {
  color: #BE2D22;
  font-size: 12px;
  text-align: center;
  line-height: 18px;
}
.templates {
  margin-top: 10px;
  white-space: nowrap;
}
.tpl {
  display: inline-block;
  width: 72px;
  margin-right: 8px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid transparent;
  vertical-align: top;
}
.tpl.active {
  border-color: #BE2D22;
}
.tpl image {
  width: 72px;
  height: 96px;
  background: #f7f4f2;
}
.tpl-title {
  display: block;
  padding: 4px 2px 6px;
  font-size: 10px;
  line-height: 14px;
  color: #6f6763;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.submit {
  height: 46px;
  line-height: 46px;
  border-radius: 12px;
  color: #fff;
  background: #BE2D22;
}
.region-page {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 30;
  background: #fff;
  display: flex;
  flex-direction: column;
}
.region-crumbs {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 14px 16px 0;
  border-bottom: 1px solid #f0ece9;
}
.region-nav {
  display: flex;
  align-items: flex-end;
  flex: 1;
}
.crumb {
  margin-right: 22px;
  padding-bottom: 10px;
  color: #2b2422;
  font-size: 15px;
}
.crumb.current {
  color: #e85a8c;
  border-bottom: 2px solid #e85a8c;
}
.region-close {
  padding-bottom: 10px;
  color: #8a817c;
  font-size: 13px;
}
.region-list {
  flex: 1;
  height: 0;
}
.region-row {
  display: flex;
  align-items: center;
  min-height: 48px;
  padding: 0 16px;
}
.region-letter {
  width: 28px;
  color: #c4bbb6;
  font-size: 15px;
}
.region-name {
  color: #2b2422;
  font-size: 15px;
}
</style>
