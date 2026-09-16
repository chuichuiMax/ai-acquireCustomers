<template>
  <view v-if="internalAccessGranted" class="page">
    <view class="tabs">
      <view
        v-for="item in mainTabs"
        :key="item.id"
        class="tab"
        :class="{ active: mainTab === item.id }"
        @click="switchMainTab(item.id)"
      >
        {{ item.label }}
      </view>
    </view>

    <view v-if="mainTab === 'workflow'">
      <view class="card">
        <view class="card-head">
          <view class="card-mark" />
          <text class="card-title">创作工作流</text>
        </view>
        <text class="card-desc">
          上传一张需要换装的原房实拍图，选择换装风格或输入风格提示词，智能体将保留原房结构框架，为你生成全新风格案例图。
        </text>

        <view class="source-tabs">
          <text
            class="source-tab"
            :class="{ active: sourceTab === 'gallery' }"
            @click="sourceTab = 'gallery'"
          >选择图库</text>
          <text
            class="source-tab"
            :class="{ active: sourceTab === 'photo' }"
            @click="sourceTab = 'photo'"
          >上传照片</text>
        </view>

        <view v-if="sourceTab === 'gallery'" class="folders">
          <view
            class="folder"
            :class="{ active: selectedFolderKey === 'case' }"
            @click="openDesignFolder('case')"
          >
            <view class="folder-icon">
              <image v-if="folderCover(caseGallery)" class="folder-preview" :src="folderCover(caseGallery)" mode="aspectFill" />
              <view class="folder-flap" />
              <view v-if="selectedFolderKey === 'case'" class="folder-check" />
            </view>
            <text class="folder-name">案例图库</text>
          </view>
          <view
            class="folder"
            :class="{ active: selectedFolderKey === 'rough' }"
            @click="openDesignFolder('rough')"
          >
            <view class="folder-icon">
              <image v-if="folderCover(roughGallery)" class="folder-preview" :src="folderCover(roughGallery)" mode="aspectFill" />
              <view class="folder-flap" />
              <view v-if="selectedFolderKey === 'rough'" class="folder-check" />
            </view>
            <text class="folder-name">毛坯图库</text>
          </view>
        </view>

        <view v-else class="upload-box" @click="choosePhoto">
          <text class="upload-plus">+</text>
          <text class="upload-text">上传原房实拍图</text>
        </view>

        <view v-if="selectedImage" class="picked">
          <image class="picked-image" :src="selectedImage.url" mode="aspectFill" />
          <view class="picked-meta">
            <text class="picked-name">{{ selectedImage.name }}</text>
            <text class="picked-clear" @click="clearSelectedImage">清除</text>
          </view>
        </view>
      </view>

      <view class="card">
        <text class="section-title"><text class="req">*</text>换装风格选择</text>
        <text class="section-hint">（选中后，风格详情将与所选图片一起传给生图模型）</text>
        <view class="style-grid">
          <view
            v-for="style in styleChips"
            :key="style"
            class="style-chip"
            :class="{ active: selectedStyle === style }"
            @click="selectStyle(style)"
          >
            {{ style }}
          </view>
        </view>
        <textarea
          class="prompt-box"
          :value="stylePrompt"
          maxlength="800"
          auto-height
          @input="onStylePrompt"
        />
      </view>

      <view class="card">
        <text class="section-title"><text class="req">*</text>补充描述</text>
        <text class="section-hint">（填写后请点下方红色【AI深度润色】）</text>
        <textarea
          class="extra-box"
          :value="extraDesc"
          maxlength="500"
          placeholder="描述你对设计效果图的额外要求，填写风格、材质、色调、空间氛围；建议注明哪墙作为电视墙、床头背景墙等重点位置，可结合参考图描述改造需求"
          placeholder-class="extra-placeholder"
          @input="onExtraDesc"
        />
        <view class="polish-row">
          <view class="polish-btn" :class="{ disabled: polishing }" @click="runPolish">
            {{ polishing ? '正在润色…' : 'AI深度润色（必做）' }}
          </view>
        </view>
        <view class="polish-result" :class="{ done: polished }">
          <text class="polish-title">{{ polished ? 'AI深度润色（必做）--已润色' : 'AI深度润色（必做）--还未润色' }}</text>
          <text class="polish-body">{{ polished ? polishedPrompt : '请先在上方填写补充描述，再点红色【AI深度润色（必做）】按钮，AI会重新识别图片，汇总你的想法，生成更精准的设计方案并填入描述框，润色后再生成，效果更贴合你的想法。' }}</text>
        </view>
      </view>

      <view class="card">
        <text class="section-title"><text class="req">*</text>图片比例</text>
        <view
          v-for="item in ratioOptions"
          :key="item.id"
          class="choice-block"
          :class="{ active: ratioId === item.id }"
          @click="ratioId = item.id"
        >
          <text class="choice-title">{{ item.label }}</text>
          <text class="choice-sub">{{ item.sizeLabel }}</text>
        </view>
      </view>

      <view class="card">
        <text class="section-title"><text class="req">*</text>生成数量</text>
        <view class="choice-row">
          <view
            v-for="item in countOptions"
            :key="item"
            class="choice-half"
            :class="{ active: count === item }"
            @click="count = item"
          >{{ item }}张</view>
        </view>
      </view>

      <view class="card">
        <text class="section-title"><text class="req">*</text>清晰度</text>
        <view class="choice-row">
          <view
            v-for="item in qualityOptions"
            :key="item.id"
            class="choice-half"
            :class="{ active: qualityId === item.id }"
            @click="qualityId = item.id"
          >{{ item.label }}</view>
        </view>
      </view>

      <view class="card">
        <text class="section-title"><text class="req">*</text>选择保存路径</text>
        <picker :range="savePathLabels" @change="onSavePath">
          <view class="path-picker">
            <text :class="{ placeholder: !savePathLabel }">{{ savePathLabel || '请选择保存路径' }}</text>
            <text class="path-arrow">▾</text>
          </view>
        </picker>
      </view>

      <view class="submit" :class="{ disabled: generating }" @click="submitGenerate">
        {{ generating ? '正在提交…' : '生成图片' }}
      </view>
    </view>

    <view v-else-if="mainTab === 'uploads'" class="library-pane">
      <view class="dropzone" @click="chooseLibraryPhotos">
        <view class="drop-icon">
          <view class="drop-tray" />
          <view class="drop-arrow" />
        </view>
        <view class="drop-copy">
          <text class="drop-title">点击上传文件</text>
          <text class="drop-sub">支持 jpg、png、webp</text>
        </view>
      </view>
      <view v-if="uploadItems.length" class="upload-grid">
        <view
          v-for="item in uploadItems"
          :key="item.id"
          class="upload-card"
          :class="{ active: selectedImage && selectedImage.id === item.id }"
          @click="useUpload(item)"
        >
          <image :src="item.url" mode="aspectFill" lazy-load />
          <view class="upload-caption">
            <text class="upload-state">{{ recognitionText(item) }}</text>
            <text class="upload-date">{{ compactDate(item.createdAt) }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="results-pane">
      <view v-if="jobsLoading && !resultCards.length" class="card"><text class="empty">正在加载生成结果…</text></view>
      <view v-else-if="!resultCards.length" class="card"><text class="empty">暂无生成结果</text></view>
      <view v-for="card in resultCards" :key="card.id" class="result-card">
        <view v-if="card.pending" class="result-pending" @click="loadJobs()">
          <text>{{ statusLabel(card.status) }}</text>
        </view>
        <image v-else class="result-image" :src="card.url" mode="aspectFill" @click="previewResult(card)" />
        <view class="result-bar">
          <view class="result-time">
            <text>{{ resultDate(card).date }}</text>
            <text>{{ resultDate(card).time }}</text>
          </view>
          <view class="result-actions">
            <view class="dl-btn" @click.stop="saveResult(card)">↓</view>
            <view class="cmp-btn" @click.stop="openCompare(card)">对比</view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="compareCard" class="compare-mask" @click="closeCompare">
      <view class="compare-sheet" @click.stop>
        <view class="compare-head">
          <text class="compare-title">对比</text>
          <text class="compare-close" @click="closeCompare">关闭</text>
        </view>
        <view class="compare-pair">
          <view class="compare-col">
            <image :src="compareCard.sourceUrl" mode="aspectFill" />
            <text>原图</text>
          </view>
          <view class="compare-col">
            <image :src="compareCard.url" mode="aspectFill" />
            <text>生成图</text>
          </view>
        </view>
      </view>
    </view>

    <tab-bar current="cover" />

    <view v-if="galleryOpen" class="gallery-page">
      <view class="region-crumbs">
        <view class="region-nav">
          <text class="crumb" @click="backGallery">图库</text>
          <text v-if="activeGallery" class="crumb current">{{ activeGallery.name }}</text>
        </view>
        <text class="region-close" @click="closeGallery">关闭</text>
      </view>
      <scroll-view class="gallery-body" scroll-y>
        <view class="gallery-inner">
          <view v-if="galleryParent" class="gallery-back" @click="openGallery(galleryParent.id)">
            返回 {{ galleryParent.name }}
          </view>
          <view v-if="galleryChildren.length" class="gallery-grid">
            <view
              v-for="item in galleryChildren"
              :key="item.id"
              class="gallery-card"
              @click="openGallery(item.id)"
            >
              <view class="gallery-card-inner">
                <text class="gallery-name">{{ item.name }}</text>
                <text class="gallery-count">{{ item.count }}张图片素材</text>
              </view>
            </view>
          </view>
          <view class="photo-grid picker-grid">
            <view
              v-for="item in galleryItems"
              :key="item.id"
              class="photo-item"
              :class="{ active: selectedImage && selectedImage.id === item.id }"
              @click="selectGalleryItem(item)"
            >
              <image :src="galleryThumbUrl(item)" mode="aspectFill" lazy-load />
            </view>
          </view>
          <text v-if="!galleryLoading && !galleryItems.length && !galleryChildren.length" class="empty">
            该图库暂无图片
          </text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script>
import TabBar from '../../components/tab-bar.vue'
import { mpContentApi, mpImageApi } from '../../apis/mp'
import { errorMessage, galleryThumbUrl, mediaUrl } from '../../utils/request'
import { internalPageMixin } from '../../utils/internal-access'
import { galleryCoverPath } from '../../utils/materials-logic.mjs'
import {
  COUNT_OPTIONS,
  DESIGN_STYLE_CHIPS,
  QUALITY_OPTIONS,
  RATIO_OPTIONS,
  SAVE_PATH_OPTIONS,
  buildPolishedPrompt,
  extractPolishedPrompt,
  flattenResultCards,
  formatCompactDate,
  formatResultDateTime,
  isMissingApi,
  isRunningJob,
  jobStatusLabel,
  normalizeJobs,
  normalizeUploads,
  promptForStyle,
  ratioSize,
  recognitionLabel,
  resolveDesignFolders
} from '../../utils/design-image.mjs'

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024
const ALLOWED_UPLOAD_EXTS = ['png', 'jpg', 'jpeg', 'webp']

export default {
  components: { TabBar },
  mixins: [internalPageMixin],
  data() {
    return {
      mainTabs: [
        { id: 'workflow', label: '工作流' },
        { id: 'uploads', label: '上传图库' },
        { id: 'results', label: '生成结果' }
      ],
      mainTab: 'workflow',
      sourceTab: 'gallery',
      styleChips: DESIGN_STYLE_CHIPS,
      ratioOptions: RATIO_OPTIONS,
      countOptions: COUNT_OPTIONS,
      qualityOptions: QUALITY_OPTIONS,
      selectedStyle: '复合写意',
      stylePrompt: promptForStyle('复合写意'),
      extraDesc: '',
      polishedPrompt: '',
      polished: false,
      ratioId: 'portrait',
      count: 2,
      qualityId: '1k',
      savePathId: '',
      galleries: [],
      selectedFolderKey: 'case',
      selectedImage: null,
      galleryOpen: false,
      galleryId: '',
      galleryItems: [],
      galleryLoading: false,
      uploadedPhotos: [],
      jobs: [],
      jobsLoading: false,
      polishing: false,
      generating: false,
      resumeAfterPicker: false,
      pollTimer: null,
      compareCard: null
    }
  },
  computed: {
    folders() {
      return resolveDesignFolders(this.galleries)
    },
    caseGallery() {
      return this.folders.caseGallery
    },
    roughGallery() {
      return this.folders.roughGallery
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
    savePathLabels() {
      return SAVE_PATH_OPTIONS.map((item) => item.label)
    },
    savePathLabel() {
      const item = SAVE_PATH_OPTIONS.find((option) => option.id === this.savePathId)
      return item ? item.label : ''
    },
    uploadItems() {
      return this.uploadedPhotos
    },
    resultCards() {
      return flattenResultCards(this.jobs, (path) =>
        mediaUrl(path, { format: 'webp', width: 1080, quality: 80 })
      )
    }
  },
  async onLoad(options) {
    if (!(await this.ensureInternalAccess())) return
    if (options && (options.tab === 'results' || options.tab === 'uploads')) {
      this.mainTab = options.tab
    }
    await this.bootstrap()
    if (this.mainTab === 'results') this.loadJobs()
  },
  async onShow() {
    if (!(await this.ensureInternalAccess())) return
    if (this.resumeAfterPicker) {
      this.resumeAfterPicker = false
      return
    }
    if (this.mainTab === 'results') this.loadJobs()
  },
  onHide() {
    this.stopPolling()
  },
  onUnload() {
    this.stopPolling()
  },
  methods: {
    galleryThumbUrl,
    compactDate: formatCompactDate,
    recognitionText: recognitionLabel,
    resultDate(card) {
      return formatResultDateTime(card && card.createdAt)
    },
    folderCover(gallery) {
      return mediaUrl(galleryCoverPath(gallery), { format: 'webp', width: 240, quality: 72 })
    },
    statusLabel: jobStatusLabel,
    async bootstrap() {
      try {
        const data = await mpContentApi.galleries()
        this.galleries = (data && data.galleries) || []
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      }
      this.loadUploads()
    },
    switchMainTab(id) {
      this.mainTab = id
      if (id === 'results') this.loadJobs()
      if (id === 'uploads') this.loadUploads()
    },
    selectStyle(style) {
      this.selectedStyle = style
      this.stylePrompt = promptForStyle(style)
      this.polished = false
      this.polishedPrompt = ''
    },
    onStylePrompt(event) {
      this.stylePrompt = event.detail.value
      this.polished = false
      this.polishedPrompt = ''
    },
    onExtraDesc(event) {
      this.extraDesc = event.detail.value
      this.polished = false
    },
    onSavePath(event) {
      const item = SAVE_PATH_OPTIONS[Number(event.detail.value)]
      this.savePathId = item ? item.id : ''
    },
    folderByKey(key) {
      return key === 'rough' ? this.roughGallery : this.caseGallery
    },
    openDesignFolder(key) {
      const gallery = this.folderByKey(key)
      this.selectedFolderKey = key
      if (!gallery) {
        uni.showToast({ title: key === 'rough' ? '暂未配置毛坯图库' : '暂未配置案例图库', icon: 'none' })
        return
      }
      this.openGallery(gallery.id)
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
    closeGallery() {
      this.galleryOpen = false
    },
    backGallery() {
      if (this.galleryParent) {
        this.openGallery(this.galleryParent.id)
        return
      }
      this.closeGallery()
    },
    selectGalleryItem(item) {
      this.selectedImage = {
        id: item.id,
        assetId: item.asset_id || '',
        galleryId: this.galleryId,
        name: item.name || item.file_name || '图库图片',
        url: mediaUrl(item.file_url || item.url, { format: 'webp', width: 1080, quality: 80 }),
        source: 'gallery'
      }
      this.polished = false
      this.closeGallery()
    },
    clearSelectedImage() {
      this.selectedImage = null
    },
    fileExt(path) {
      const clean = String(path || '').split('?')[0]
      const name = clean.split('/').pop() || ''
      const parts = name.split('.')
      return parts.length > 1 ? parts.pop().toLowerCase() : ''
    },
    async assertUploadableImage(filePath) {
      const ext = this.fileExt(filePath)
      if (ext && !ALLOWED_UPLOAD_EXTS.includes(ext) && !['heic', 'heif', 'gif', 'bmp'].includes(ext)) {
        throw new Error('仅支持 PNG、JPG、WebP 图片')
      }
      try {
        const info = await new Promise((resolve, reject) => {
          uni.getFileInfo({ filePath, success: resolve, fail: reject })
        })
        if ((info && info.size) > MAX_UPLOAD_BYTES) throw new Error('单张图片不能超过 20 MB')
      } catch (error) {
        if (error && error.message) throw error
      }
    },
    prepareUploadImage(filePath) {
      return new Promise((resolve) => {
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
    chooseLibraryPhotos() {
      this.choosePhoto({ stayOnTab: true, count: 9 })
    },
    choosePhoto(options = {}) {
      const stayOnTab = Boolean(options.stayOnTab)
      const count = options.count || 1
      this.resumeAfterPicker = true
      uni.chooseImage({
        count,
        sizeType: ['compressed'],
        success: async (res) => {
          const paths = res.tempFilePaths || []
          try {
            uni.showLoading({ title: '上传中', mask: true })
            const photos = []
            for (const filePath of paths) {
              photos.push(await this.uploadOnePhoto(filePath))
            }
            this.uploadedPhotos = [
              ...photos,
              ...this.uploadedPhotos.filter((item) => !photos.some((photo) => photo.id === item.id))
            ]
            if (!stayOnTab && photos[0]) {
              this.selectedImage = photos[0]
              this.polished = false
            }
          } catch (error) {
            uni.showToast({ title: error.message || errorMessage(error), icon: 'none' })
          } finally {
            uni.hideLoading()
          }
        },
        fail: () => {
          this.resumeAfterPicker = false
        }
      })
    },
    async uploadOnePhoto(filePath) {
      await this.assertUploadableImage(filePath)
      const uploadPath = await this.prepareUploadImage(filePath)
      const category =
        (this.roughGallery && this.roughGallery.id) || (this.caseGallery && this.caseGallery.id) || 'uncategorized'
      const uploaded = await mpImageApi.uploadPhoto(uploadPath, category)
      const asset = uploaded.asset || uploaded
      const mapped = normalizeUploads([{ ...uploaded, ...asset, file_url: asset.file_url || filePath }])[0]
      return {
        id: mapped?.id || uploaded.library_item_id || asset.id || `local-${Date.now()}`,
        assetId: mapped?.assetId || asset.id || '',
        galleryId: mapped?.galleryId || uploaded.category || category,
        name: mapped?.name || (asset && asset.original_file_name) || '上传图片',
        url: filePath,
        source: 'upload',
        recognized: false,
        createdAt: mapped?.createdAt || new Date().toISOString()
      }
    },
    useUpload(item) {
      this.selectedImage = item
      this.polished = false
      this.polishedPrompt = ''
      this.mainTab = 'workflow'
      this.sourceTab = 'photo'
    },
    async loadUploads() {
      try {
        const data = await mpImageApi.uploads()
        const remote = normalizeUploads(data).map((item) => ({
          ...item,
          url: mediaUrl(item.url, { format: 'webp', width: 720, quality: 80 })
        }))
        const localIds = new Set(this.uploadedPhotos.map((item) => item.id))
        this.uploadedPhotos = [
          ...this.uploadedPhotos,
          ...remote.filter((item) => item.id && !localIds.has(item.id))
        ]
      } catch (error) {
        if (!isMissingApi(error)) {
          /* 工作流上传仍可继续 */
        }
      }
    },
    async runPolish() {
      if (this.polishing) return
      if (!this.selectedImage) {
        uni.showToast({ title: '请先选择或上传原房图片', icon: 'none' })
        return
      }
      if (!this.selectedStyle) {
        uni.showToast({ title: '请选择换装风格', icon: 'none' })
        return
      }
      this.polishing = true
      const fallback = buildPolishedPrompt({ style: this.selectedStyle, extra: this.extraDesc })
      try {
        const data = await mpImageApi.polish({
          style: this.selectedStyle,
          style_prompt: this.stylePrompt,
          extra_description: this.extraDesc,
          source_item_id: this.selectedImage.id,
          source_asset_id: this.selectedImage.assetId,
          source_url: this.selectedImage.url
        })
        this.polishedPrompt = extractPolishedPrompt(data, fallback)
        this.polished = true
        this.markRecognized(this.selectedImage.id)
      } catch (error) {
        if (isMissingApi(error)) {
          this.polishedPrompt = fallback
          this.polished = true
          this.markRecognized(this.selectedImage.id)
        } else {
          uni.showToast({ title: errorMessage(error), icon: 'none' })
        }
      } finally {
        this.polishing = false
      }
    },
    markRecognized(id) {
      if (!id) return
      this.uploadedPhotos = this.uploadedPhotos.map((item) =>
        item.id === id ? { ...item, recognized: true } : item
      )
      if (this.selectedImage && this.selectedImage.id === id) {
        this.selectedImage = { ...this.selectedImage, recognized: true }
      }
    },
    async submitGenerate() {
      if (this.generating) return
      if (!this.selectedImage) {
        uni.showToast({ title: '请选择或上传原房图片', icon: 'none' })
        return
      }
      if (!this.selectedStyle) {
        uni.showToast({ title: '请选择换装风格', icon: 'none' })
        return
      }
      if (!this.polished || !this.polishedPrompt) {
        uni.showToast({ title: '请先完成 AI 深度润色', icon: 'none' })
        return
      }
      if (!this.savePathId) {
        uni.showToast({ title: '请选择保存路径', icon: 'none' })
        return
      }
      this.generating = true
      try {
        const data = await mpImageApi.generate({
          style: this.selectedStyle,
          prompt: this.polishedPrompt,
          extra_description: this.extraDesc,
          size: ratioSize(this.ratioId),
          n: this.count,
          quality: this.qualityId,
          save_target: this.savePathId,
          source_item_id: this.selectedImage.id,
          source_asset_id: this.selectedImage.assetId,
          source_url: this.selectedImage.url,
          gallery_id: this.selectedImage.galleryId
        })
        const jobs = normalizeJobs(data).map((job) => ({
          ...job,
          sourceUrl: job.sourceUrl || this.selectedImage.url,
          createdAt: job.createdAt || new Date().toISOString()
        }))
        if (jobs.length) this.jobs = [...jobs, ...this.jobs.filter((item) => item.id !== jobs[0].id)]
        this.mainTab = 'results'
        uni.showToast({ title: '已提交生图任务', icon: 'none' })
        this.loadJobs()
      } catch (error) {
        uni.showToast({ title: errorMessage(error), icon: 'none' })
      } finally {
        this.generating = false
      }
    },
    async loadJobs(silent = false) {
      if (!silent) this.jobsLoading = true
      try {
        const data = await mpImageApi.jobs()
        const previous = new Map(this.jobs.map((job) => [job.id, job]))
        this.jobs = normalizeJobs(data).map((job) => {
          const last = previous.get(job.id)
          return {
            ...job,
            sourceUrl: job.sourceUrl || (last && last.sourceUrl) || ''
          }
        })
        this.syncPolling()
      } catch (error) {
        if (!isMissingApi(error)) uni.showToast({ title: errorMessage(error), icon: 'none' })
      } finally {
        if (!silent) this.jobsLoading = false
      }
    },
    syncPolling() {
      const running = this.jobs.some((job) => isRunningJob(job.status))
      if (running) this.startPolling()
      else this.stopPolling()
    },
    startPolling() {
      if (this.pollTimer) return
      this.pollTimer = setInterval(() => {
        if (this.mainTab === 'results') this.loadJobs(true)
      }, 4000)
    },
    stopPolling() {
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }
    },
    previewResult(card) {
      if (!card || !card.url) return
      uni.previewImage({ urls: [card.url], current: card.url })
    },
    saveResult(card) {
      if (!card || !card.url) {
        uni.showToast({ title: '暂无可保存图片', icon: 'none' })
        return
      }
      const save = (filePath) => {
        uni.saveImageToPhotosAlbum({
          filePath,
          success: () => uni.showToast({ title: '已保存到相册', icon: 'none' }),
          fail: () => uni.showToast({ title: '保存失败，请检查相册权限', icon: 'none' })
        })
      }
      if (/^(wxfile:|file:|http:\/\/tmp\/|https:\/\/tmp\/)/i.test(card.url)) {
        save(card.url)
        return
      }
      uni.downloadFile({
        url: card.url,
        success: (res) => save(res.tempFilePath),
        fail: () => uni.showToast({ title: '下载失败', icon: 'none' })
      })
    },
    openCompare(card) {
      if (!card || !card.sourceUrl) {
        uni.showToast({ title: '暂无原图可对比', icon: 'none' })
        return
      }
      this.compareCard = card
    },
    closeCompare() {
      this.compareCard = null
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f4f1ee;
  padding: 12px 12px 110px;
}
.tabs {
  display: flex;
  margin-bottom: 12px;
  overflow: hidden;
  border: 1px solid #be2d22;
  border-radius: 8px;
  background: #fff;
}
.tab {
  flex: 1;
  height: 42px;
  color: #2b2422;
  font-size: 15px;
  line-height: 42px;
  text-align: center;
}
.tab.active {
  color: #fff;
  background: #be2d22;
}
.card {
  margin-bottom: 12px;
  padding: 16px 14px;
  border-radius: 12px;
  background: #fff;
}
.card-head {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}
.card-mark {
  width: 4px;
  height: 16px;
  margin-right: 8px;
  border-radius: 2px;
  background: #be2d22;
}
.card-title {
  color: #2b2422;
  font-size: 16px;
  font-weight: 700;
}
.card-desc {
  display: block;
  color: #5c5652;
  font-size: 13px;
  line-height: 1.7;
}
.source-tabs {
  display: flex;
  gap: 28px;
  margin: 18px 0 16px;
}
.source-tab {
  color: #8a817c;
  font-size: 15px;
}
.source-tab.active {
  color: #2b2422;
  font-weight: 600;
  border-bottom: 2px solid #2b2422;
  padding-bottom: 4px;
}
.folders {
  display: flex;
  justify-content: space-around;
  padding: 18px 0 4px;
}
.folder {
  width: 46%;
  text-align: center;
}
.folder-icon {
  position: relative;
  width: 106px;
  height: 82px;
  margin: 0 auto 10px;
  overflow: visible;
  --folder-back-color: #ffc238;
  border-radius: 0 8px 10px 10px;
  background: var(--folder-back-color);
  box-shadow: 0 2px 5px rgba(177, 120, 8, 0.18);
}
.folder-icon::before {
  position: absolute;
  z-index: 0;
  top: -9px;
  left: 0;
  width: 50px;
  height: 18px;
  border-radius: 7px 0 0 0;
  background: var(--folder-back-color);
  clip-path: polygon(0 0, 70% 0, 100% 100%, 0 100%);
  content: '';
}
.folder-preview {
  position: absolute;
  z-index: 1;
  top: 7px;
  left: 4px;
  width: 98px;
  height: 58px;
  border-radius: 4px 4px 6px 6px;
  background: #f3eee5;
}
.folder-flap {
  position: absolute;
  z-index: 2;
  top: 44px;
  right: 0;
  left: 0;
  height: 38px;
  border-radius: 7px 8px 9px 9px;
  background: linear-gradient(180deg, #ffe9a3 0%, #ffdc79 55%, #ffd15a 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 249, 220, 0.85),
    inset 0 -2px 0 rgba(235, 168, 28, 0.22),
    0 2px 4px rgba(177, 120, 8, 0.14);
}
.folder-check {
  position: absolute;
  z-index: 3;
  top: 16px;
  right: 14px;
  width: 16px;
  height: 16px;
  border: 2px solid #be2d22;
  border-radius: 8px;
  background: #fff;
}
.folder-check::after {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 6px;
  height: 6px;
  border-radius: 3px;
  background: #be2d22;
  content: '';
}
.folder-name {
  overflow: hidden;
  color: #292624;
  font-size: 12px;
  line-height: 1.4;
}
.upload-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 120px;
  border: 1px dashed #cfc6c0;
  border-radius: 12px;
  background: #faf8f6;
}
.upload-plus {
  color: #be2d22;
  font-size: 28px;
  line-height: 32px;
}
.upload-text {
  margin-top: 6px;
  color: #8a817c;
  font-size: 13px;
}
.picked {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 14px;
}
.picked-image {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  background: #f7f4f2;
}
.picked-meta {
  flex: 1;
  min-width: 0;
}
.picked-name,
.picked-clear {
  display: block;
}
.picked-name {
  overflow: hidden;
  color: #2b2422;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.picked-clear {
  margin-top: 6px;
  color: #be2d22;
  font-size: 12px;
}
.section-title {
  display: block;
  color: #2b2422;
  font-size: 16px;
  font-weight: 700;
}
.req {
  margin-right: 2px;
  color: #be2d22;
}
.section-hint {
  display: block;
  margin: 6px 0 12px;
  color: #8a817c;
  font-size: 12px;
  line-height: 1.5;
}
.style-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}
.style-chip {
  width: 31%;
  box-sizing: border-box;
  height: 38px;
  margin-bottom: 10px;
  border: 1px solid #ddd6d1;
  border-radius: 8px;
  color: #2b2422;
  font-size: 13px;
  line-height: 36px;
  text-align: center;
}
.style-chip.active {
  color: #fff;
  background: #be2d22;
  border-color: #be2d22;
}
.prompt-box,
.extra-box,
.polish-result {
  width: 100%;
  box-sizing: border-box;
  min-height: 110px;
  padding: 12px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.6;
}
.prompt-box {
  margin-top: 6px;
  border: 1px solid #8aa4e8;
  color: #4b63c7;
  background: #f3f6ff;
}
.extra-box,
.polish-result {
  border: 1px dashed #8aa4e8;
  background: #f7f9ff;
}
.extra-placeholder {
  color: #b8b4d6;
  font-size: 12px;
  line-height: 1.6;
}
.polish-row {
  display: flex;
  justify-content: flex-end;
  margin: 12px 0;
}
.polish-btn {
  padding: 0 16px;
  border-radius: 20px;
  color: #fff;
  font-size: 13px;
  line-height: 36px;
  background: #be2d22;
}
.polish-btn.disabled {
  opacity: 0.65;
}
.polish-result {
  min-height: 96px;
}
.polish-result.done {
  border-style: solid;
}
.polish-title,
.polish-body {
  display: block;
}
.polish-title {
  margin-bottom: 8px;
  color: #be2d22;
  font-size: 13px;
}
.polish-body {
  color: #9a9590;
  font-size: 12px;
  line-height: 1.7;
}
.polish-result.done .polish-body {
  color: #4b63c7;
}
.choice-block,
.choice-half,
.path-picker {
  border: 1px solid #ddd6d1;
  border-radius: 10px;
  background: #fff;
}
.choice-block {
  margin-top: 10px;
  padding: 12px 14px;
}
.choice-block.active,
.choice-half.active {
  color: #fff;
  background: #be2d22;
  border-color: #be2d22;
}
.choice-title,
.choice-sub {
  display: block;
}
.choice-title {
  font-size: 15px;
  font-weight: 600;
}
.choice-sub {
  margin-top: 4px;
  font-size: 12px;
  opacity: 0.9;
}
.choice-row {
  display: flex;
  gap: 12px;
  margin-top: 10px;
}
.choice-half {
  flex: 1;
  height: 44px;
  font-size: 15px;
  line-height: 44px;
  text-align: center;
}
.path-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  padding: 0 14px;
  height: 44px;
  color: #2b2422;
}
.path-picker .placeholder {
  color: #b8b0aa;
}
.path-arrow {
  color: #9a908a;
}
.submit {
  height: 48px;
  margin-top: 4px;
  border-radius: 10px;
  color: #fff;
  font-size: 17px;
  line-height: 48px;
  text-align: center;
  background: #be2d22;
}
.submit.disabled {
  opacity: 0.7;
}
.empty {
  display: block;
  padding: 28px 0;
  color: #8a817c;
  font-size: 13px;
  text-align: center;
}
.empty.small {
  padding: 12px 0 0;
}
.library-pane,
.results-pane {
  min-height: 40vh;
}
.dropzone {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
  padding: 18px 16px;
  border: 1px dashed #c9c4bf;
  border-radius: 16px;
  background: #fff;
}
.drop-icon {
  position: relative;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
}
.drop-tray {
  position: absolute;
  left: 6px;
  right: 6px;
  bottom: 4px;
  height: 18px;
  border: 2px solid #8b949e;
  border-top: 0;
  border-radius: 0 0 6px 6px;
}
.drop-arrow {
  position: absolute;
  top: 2px;
  left: 50%;
  width: 2px;
  height: 18px;
  background: #8b949e;
  transform: translateX(-50%);
}
.drop-arrow::before {
  position: absolute;
  top: 0;
  left: 50%;
  width: 10px;
  height: 10px;
  border-top: 2px solid #8b949e;
  border-right: 2px solid #8b949e;
  transform: translate(-50%, 2px) rotate(-45deg);
  content: '';
}
.drop-copy {
  flex: 1;
  min-width: 0;
}
.drop-title,
.drop-sub {
  display: block;
}
.drop-title {
  color: #2b2422;
  font-size: 15px;
  line-height: 1.4;
}
.drop-sub {
  margin-top: 4px;
  color: #8a817c;
  font-size: 12px;
  line-height: 1.5;
}
.upload-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}
.upload-card {
  position: relative;
  width: 48.5%;
  margin-bottom: 10px;
  overflow: hidden;
  border-radius: 4px;
  background: #ece8e4;
}
.upload-card.active {
  outline: 2px solid #be2d22;
}
.upload-card image {
  display: block;
  width: 100%;
  height: 210px;
}
.upload-caption {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 28px 8px 8px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.55) 100%);
}
.upload-state,
.upload-date {
  display: block;
  color: #fff;
  font-size: 12px;
  line-height: 1.4;
  text-align: center;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
}
.result-card {
  overflow: hidden;
  margin: 0 auto 16px;
  max-width: 320px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(43, 36, 34, 0.06);
}
.result-image,
.result-pending {
  display: block;
  width: 100%;
  height: 420px;
  background: #ece8e4;
}
.result-pending {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8a817c;
  font-size: 14px;
}
.result-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #fff;
}
.result-time text {
  display: block;
  color: #2b2422;
  font-size: 13px;
  line-height: 1.35;
}
.result-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.dl-btn,
.cmp-btn {
  display: flex;
  align-items: center;
  justify-content: center;
}
.dl-btn {
  width: 32px;
  height: 32px;
  color: #4d6bff;
  font-size: 20px;
  line-height: 32px;
}
.cmp-btn {
  min-width: 52px;
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  color: #fff;
  font-size: 13px;
  line-height: 28px;
  background: #4d6bff;
}
.compare-mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 30;
  display: flex;
  align-items: flex-end;
  background: rgba(0, 0, 0, 0.45);
}
.compare-sheet {
  width: 100%;
  padding: 16px 16px calc(20px + env(safe-area-inset-bottom));
  border-radius: 16px 16px 0 0;
  background: #fff;
}
.compare-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.compare-title {
  color: #2b2422;
  font-size: 16px;
  font-weight: 700;
}
.compare-close {
  color: #8a817c;
  font-size: 13px;
}
.compare-pair {
  display: flex;
  gap: 10px;
}
.compare-col {
  flex: 1;
  min-width: 0;
  text-align: center;
}
.compare-col image {
  width: 100%;
  height: 240px;
  border-radius: 8px;
  background: #f4f1ee;
}
.compare-col text {
  display: block;
  margin-top: 8px;
  color: #6f6763;
  font-size: 13px;
}
.photo-grid {
  display: flex;
  flex-wrap: wrap;
}
.photo-item {
  width: 210rpx;
  height: 210rpx;
  margin-right: 12rpx;
  margin-bottom: 12rpx;
  overflow: hidden;
  border-radius: 10px;
  background: #f7f4f2;
}
.photo-item.active {
  outline: 2px solid #be2d22;
}
.photo-item image {
  width: 100%;
  height: 100%;
}
.gallery-page {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  background: #fff;
}
.region-crumbs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 0;
}
.region-nav {
  display: flex;
  gap: 8px;
  align-items: center;
}
.crumb {
  color: #2b2422;
  font-size: 15px;
}
.crumb.current {
  color: #be2d22;
}
.region-close {
  color: #8a817c;
  font-size: 13px;
}
.gallery-body {
  flex: 1;
  height: 0;
  overflow: hidden;
}
.gallery-inner {
  padding: 12px 16px 24px;
  box-sizing: border-box;
}
.gallery-back {
  margin-bottom: 12px;
  color: #be2d22;
}
.gallery-grid {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.gallery-card {
  flex: 0 0 50%;
  max-width: 50%;
  min-width: 0;
  box-sizing: border-box;
  padding: 0 8px 8px 0;
}
.gallery-card:nth-child(even) {
  padding-right: 0;
  padding-left: 8px;
}
.gallery-card-inner {
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  overflow: hidden;
  border-radius: 12px;
  background: #f7f4f2;
}
.gallery-name {
  display: block;
  overflow: hidden;
  color: #2b2422;
  font-weight: 600;
  line-height: 1.4;
  word-break: break-all;
}
.gallery-count {
  display: block;
  margin-top: 4px;
  overflow: hidden;
  color: #8a817c;
  font-size: 12px;
}
.picker-grid {
  margin-top: 8px;
}
</style>
