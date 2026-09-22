<template>
  <view v-if="internalAccessGranted" class="page">
    <scroll-view class="content" scroll-y :lower-threshold="100" @scrolltolower="loadMoreDesignLibrary">
      <view class="segments">
        <view v-for="item in tabs" :key="item.key" class="segment" :class="{ active: activeTab === item.key }" @click="selectTab(item.key)">{{ item.label }}</view>
      </view>

      <template v-if="activeTab === 'workflow'">
        <view class="section workflow-head">
          <view class="section-title"><view /><text>创作工作流</text></view>
          <view class="workflow-options">
            <view v-for="item in workflows" :key="item.key" class="workflow-option" :class="{ active: workflow === item.key }" @click="selectWorkflow(item.key)">
              {{ item.label }}
            </view>
          </view>
          <text class="workflow-description">{{ activeWorkflow.description }}</text>
        </view>

        <view v-if="sourceFolderErrorMessage" class="source-folder-error">
          <text>{{ sourceFolderErrorMessage }}</text><text @click="loadSourceFolders">重新加载</text>
        </view>

        <view v-if="workflow === 'redesign'" class="section">
          <view class="field-title"><text>*</text>原房实拍图</view>
          <image-source-selector :entries="sourceEntries('source')" :loading="sourceFoldersLoading" @select-gallery="openPicker('source', $event)" @upload="chooseUpload('source')" />
          <view v-if="slotImage('source')" class="selected-input" @click="previewImage(slotImage('source'))"><image :src="imageUrl(slotImage('source'))" mode="aspectFill" /><view><text>已选择原房图</text><text>{{ imageSourceLabel(slotImage('source').source_role) }}</text></view><text>更换</text></view>
        </view>

        <view v-if="workflow === 'adapt'" class="section">
          <view class="field-title"><text>*</text>参考效果图</view>
          <image-source-selector :entries="sourceEntries('reference')" :loading="sourceFoldersLoading" @select-gallery="openPicker('reference', $event)" @upload="chooseUpload('reference')" />
          <view v-if="slotImage('reference')" class="selected-input" @click="previewImage(slotImage('reference'))"><image :src="imageUrl(slotImage('reference'))" mode="aspectFill" /><view><text>已选择案例图</text><text>{{ imageSourceLabel(slotImage('reference').source_role) }}</text></view><text>更换</text></view>
        </view>

        <view v-if="workflow === 'adapt'" class="section">
          <view class="field-title"><text>*</text>毛坯实拍图</view>
          <image-source-selector :entries="sourceEntries('rough')" :loading="sourceFoldersLoading" @select-gallery="openPicker('rough', $event)" @upload="chooseUpload('rough')" />
          <view v-if="slotImage('rough')" class="selected-input" @click="previewImage(slotImage('rough'))"><image :src="imageUrl(slotImage('rough'))" mode="aspectFill" /><view><text>已选择毛坯图</text><text>{{ imageSourceLabel(slotImage('rough').source_role) }}</text></view><text>更换</text></view>
        </view>

        <view v-if="workflow === 'transfer'" class="section">
          <view class="field-title"><text>*</text>参考效果图</view>
          <image-source-selector :entries="sourceEntries('reference')" :loading="sourceFoldersLoading" @select-gallery="openPicker('reference', $event)" @upload="chooseUpload('reference')" />
          <view v-if="slotImage('reference')" class="selected-input" @click="previewImage(slotImage('reference'))"><image :src="imageUrl(slotImage('reference'))" mode="aspectFill" /><view><text>已选择案例图</text><text>{{ imageSourceLabel(slotImage('reference').source_role) }}</text></view><text>更换</text></view>
        </view>

        <view v-if="workflow === 'redesign'" class="section">
          <view class="field-title"><text>*</text>换装风格选择</view>
          <text class="field-note">选中后，预设风格或补充描述将与原房图一起传给生图模型。</text>
          <view class="chip-grid"><view v-for="style in designStyles" :key="style.value" class="choice-chip" :class="{ active: activeDraft.style === style.value }" @click="selectDesignStyle(style.value)">{{ style.label }}</view></view>
        </view>

        <view v-if="workflow === 'transfer'" class="section">
          <view class="field-title"><text>*</text>目标空间</view>
          <view class="chip-grid three-column"><view v-for="space in targetSpaces" :key="space" class="choice-chip" :class="{ active: activeDraft.target_space === space }" @click="updateDraft({ target_space: space })">{{ space }}</view></view>
          <view class="sub-title">布局类型</view>
          <view class="chip-grid two-column"><view v-for="layout in transferLayouts" :key="layout" class="choice-chip" :class="{ active: activeDraft.layout_type === layout }" @click="updateDraft({ layout_type: layout })">{{ layout }}</view></view>
          <view class="sub-title">附加元素</view>
          <view class="chip-grid two-column"><view v-for="element in transferElements" :key="element" class="choice-chip" :class="{ active: activeDraft.extra_element.includes(element) }" @click="toggleTransferElement(element)">{{ element }}</view></view>
        </view>

        <view class="section">
          <view class="field-title"><text>*</text>补充描述</view>
          <text class="field-note">填写后点击 AI深度润色（必做）；润色成功后才可生成。</text>
          <view class="description-box">
            <view class="description-keywords">
              <view v-for="keyword in activeDraft.description_keywords" :key="keyword" class="description-keyword">
                <text>{{ keyword }}</text><text class="keyword-remove" role="button" :aria-label="'删除' + keyword" @click.stop="removeDescriptionKeyword(keyword)">×</text>
              </view>
              <button v-if="!keywordInputVisible" class="keyword-add" @click="keywordInputVisible = true">＋自定义</button>
              <view v-else class="keyword-editor">
                <input v-model="keywordInput" class="keyword-input" :focus="keywordInputVisible" maxlength="30" placeholder="输入关键词" confirm-type="done" @confirm="addDescriptionKeyword" />
                <button class="keyword-add" @click="addDescriptionKeyword">添加</button>
                <button class="keyword-cancel" @click="closeKeywordInput">取消</button>
              </view>
            </view>
            <textarea class="description" :value="activeDraft.description" maxlength="500" placeholder="描述风格、材质、色调、空间氛围与重点陈设。" placeholder-class="description-placeholder" @input="updateDescription($event.detail.value)" />
          </view>
          <button class="polish-button" :loading="polishing" @click="polishDescription">AI深度润色（必做）</button>
          <view class="polish-result" :class="{ ready: activeDraft.polished_prompt }"><text>AI 润色结果{{ activeDraft.polished_prompt ? '' : ' · 未生成' }}</text><text>{{ activeDraft.polished_prompt || '请先完成补充描述与 AI 深度润色。' }}</text></view>
        </view>

        <view class="section">
          <view class="field-title"><text>*</text>图片比例</view>
          <view class="option-stack"><view v-for="item in imageRatios" :key="item.key" class="large-choice" :class="{ active: activeDraft.ratio === item.key }" @click="updateDraft({ ratio: item.key })"><text>{{ item.label }}</text><text>{{ item.pixels }}</text></view></view>
        </view>
        <view class="section compact"><view class="field-title"><text>*</text>生成数量</view><view class="two-row"><view v-for="count in imageCounts" :key="count" class="large-choice inline" :class="{ active: activeDraft.count === count }" @click="updateDraft({ count })">{{ count }}张</view></view></view>
        <view class="section compact"><view class="field-title"><text>*</text>清晰度</view><view class="two-row"><view v-for="item in imageQualities" :key="item.key" class="large-choice inline" :class="{ active: activeDraft.quality === item.key }" @click="updateDraft({ quality: item.key })">{{ item.label }}</view></view></view>
        <view class="section compact"><view class="field-title"><text>*</text>选择保存路径</view><view class="save-target" @click="openSaveTarget"><text :class="{ placeholder: !selectedSaveTargetLabel }">{{ selectedSaveTargetLabel || '请选择保存路径' }}</text><text>›</text></view><text v-if="saveTargetsError" class="sync-note">{{ saveTargetsError }}</text><text v-if="draftSyncIssue" class="sync-note">草稿暂未同步到账号，请稍后重试。</text></view>
        <button class="generate-button" :loading="generating" :disabled="generating" @click="generateImages">生成图片</button>
      </template>

      <template v-else-if="activeTab === 'library'">
        <view class="gallery-heading"><text>我的生图图库</text><text>已保存 {{ libraryTotal }} 张图片</text></view>
        <view v-if="libraryLoading" class="state">正在加载图库…</view>
        <view v-else-if="libraryError" class="state"><text>图库暂时无法加载</text><button class="retry" @click="loadDesignLibrary()">重新加载</button></view>
        <view v-else-if="!designLibrary.length" class="state">选择、上传和生成的图片都会保存在这里。</view>
        <view v-else class="library-grid"><view v-for="item in designLibrary" :key="item.id" class="library-image" @click="previewImage(item)"><image :src="imageUrl(item)" mode="aspectFill" lazy-load /><button class="library-remove" :disabled="!!libraryRemovingId" aria-label="从图库管理移除" @click.stop="removeDesignLibraryItem(item)"><view class="trash-icon" /></button><view class="library-caption"><text>{{ item.recognized_roles.length ? '已识别' : '未识别' }}</text><text>{{ imageDesignLibraryDate(item.created_at) }}</text></view></view></view>
        <view v-if="!libraryLoading && !libraryError && designLibrary.length" class="load-more"><text v-if="libraryLoadingMore">正在加载更多…</text><text v-else-if="libraryMoreError" @click="loadDesignLibrary(false)">加载失败，点击重试</text><text v-else-if="libraryHasMore" @click="loadDesignLibrary(false)">加载更多</text><text v-else>已显示全部图片</text></view>
      </template>

      <template v-else>
        <view v-if="taskList.length" class="tasks"><view v-for="task in taskList" :key="task.id" class="task"><view /><text>{{ task.status_text || '正在生成图片…' }}</text><text>{{ task.progress || '' }}</text></view></view>
        <view v-if="resultsLoading" class="state">正在加载生成结果…</view>
        <view v-else-if="!results.length && !taskList.length" class="state">还没有生成图片</view>
        <view v-else class="result-grid"><view v-for="item in results" :key="item.id" class="result-card"><image :src="resultImageUrl(item)" mode="aspectFill" lazy-load @click="previewResult(item)" /><text class="result-time">{{ displayTime(item.created_at) }}</text><view class="result-actions"><view class="download" @click="downloadResult(item)"><text>↓</text><text>下载</text></view><view class="compare" @click="openComparison(item)">对比</view></view><view v-if="item.failed_count || item.can_retry" class="retry-line"><text>{{ item.failed_count ? `${item.failed_count} 张生成失败` : '可补生成失败图片' }}</text><text @click="retryTask(item)">补生成</text></view></view></view>
      </template>
      <view class="spacer" />
    </scroll-view>

    <view v-if="pickerVisible" class="layer">
      <view class="layer-head"><text class="back" @click="backPicker">‹</text><text>{{ pickerMode === 'personal-folders' ? '我的素材' : '选择图片' }}</text></view>
      <scroll-view class="layer-body" scroll-y :lower-threshold="80" @scrolltolower="loadMoreFolderItems">
        <text class="breadcrumb">{{ pickerTitle }}</text>
        <template v-if="pickerMode === 'personal-folders'">
          <view v-if="!pickerFolders.length" class="state">暂无个人素材图库</view>
          <view v-else class="folder-grid"><view v-for="folder in pickerFolders" :key="folder.id" class="folder-card" @click="selectPersonalFolder(folder)"><view class="folder-icon"><view /></view><text>{{ folder.name || '未分类' }}</text></view></view>
        </template>
        <template v-else>
          <view v-if="pickerFolders.length" class="folder-grid"><view v-for="folder in pickerFolders" :key="folder.id" class="folder-card" @click="selectPickerFolder(folder)"><view class="folder-icon"><view /></view><text>{{ folder.name || '未分类' }}</text></view></view>
          <view v-if="folderItemsLoading && !folderItems.length" class="state">正在加载图片…</view>
          <view v-else-if="folderItemsError && !folderItems.length" class="state"><text>图库加载失败</text><button class="retry" @click="retryFolderItems">重新加载</button></view>
          <view v-else-if="!folderItems.length && !pickerFolders.length" class="state">该图库暂无图片或子图库</view>
          <view v-else-if="folderItems.length" class="picker-grid"><view v-for="item in folderItems" :key="item.id" class="picker-image" :class="{ selected: selectedFolderItem && selectedFolderItem.id === item.id }" @click="selectedFolderItem = item"><image :src="imageUrl(item)" mode="aspectFill" lazy-load /><text>{{ selectedFolderItem && selectedFolderItem.id === item.id ? '✓' : '' }}</text></view></view>
          <view v-if="folderItemsLoadingMore" class="load-more">正在加载更多…</view>
          <view v-else-if="folderItemsError && folderItems.length" class="load-more load-more-error"><text>加载更多失败</text><text @click="retryFolderItems">重试</text></view>
        </template>
      </scroll-view>
      <button v-if="pickerMode !== 'personal-folders'" class="picker-confirm" :loading="pickerSaving" :disabled="!selectedFolderItem || pickerSaving" @click="confirmPicker">确定</button>
    </view>

    <view v-if="comparisonVisible" class="layer compare-layer"><view class="layer-head"><text class="back" @click="comparisonVisible = false">‹</text><text>对比</text><text class="close" @click="comparisonVisible = false">关闭</text></view><scroll-view class="layer-body" scroll-y><view class="compare-list"><view v-for="item in comparisonImages" :key="item.label"><text>{{ item.label }}</text><image :src="mediaUrl(item.url)" mode="widthFix" /></view></view></scroll-view></view>
    <save-target-sheet :visible="saveTargetVisible" :scopes="saveTargetScopes" :value="activeDraft.save_target" @confirm="confirmSaveTarget" @close="closeSaveTarget" />
    <tab-bar current="cover" />
  </view>
</template>

<script>
import TabBar from '../../components/tab-bar.vue'
import ImageSourceSelector from '../../components/image-source-selector.vue'
import SaveTargetSheet from '../../components/image-design/SaveTargetSheet.vue'
import { mpContentApi, mpImageDesignApi } from '../../apis/mp'
import { errorMessage, galleryThumbUrl, mediaUrl } from '../../utils/request'
import { internalPageMixin } from '../../utils/internal-access'
import {
  IMAGE_COUNTS, IMAGE_DESIGN_STYLE_OPTIONS, IMAGE_DESIGN_WORKFLOWS, IMAGE_QUALITIES, IMAGE_RATIOS, TARGET_SPACES, TRANSFER_ELEMENTS, TRANSFER_LAYOUTS,
  buildImageDesignPayload, comparisonSources, createImageDesignDrafts, draftCanGenerate, imageFileUrl, imageSourceLabel,
  fixedSaveTargetOptions, imageDesignLibraryDate,
  imageDesignStyleForPayload, isSupportedImageDesignStyle, normalizeImageDesignDrafts,
  imageDesignDescription, restoreImageDesignDraftKeywords, updateImageDesignDraftKeywords,
  childFolders, imageSourceEntries, mergeGalleryItems, normalizeImageDesignLibraryItem, normalizeSaveTarget, normalizeTransferElements, toggleTransferElement as toggleTransferElementValue, uniqueFolders,
  updateImageDesignDraftDescription, updateImageDesignDraftImage, updateImageDesignDraftStyle
} from '../../utils/image-design-logic.mjs'

const DRAFT_CACHE_KEY = 'image-design-drafts-v1'
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

export default {
  components: { ImageSourceSelector, SaveTargetSheet, TabBar },
  mixins: [internalPageMixin],
  data() {
    return {
      tabs: [{ key: 'workflow', label: '生成图片' }, { key: 'library', label: '图库管理' }, { key: 'results', label: '生成结果' }],
      activeTab: 'workflow', workflow: 'redesign', workflows: IMAGE_DESIGN_WORKFLOWS, imageRatios: IMAGE_RATIOS, imageCounts: IMAGE_COUNTS, imageQualities: IMAGE_QUALITIES,
      designStyles: IMAGE_DESIGN_STYLE_OPTIONS, targetSpaces: TARGET_SPACES, transferLayouts: TRANSFER_LAYOUTS, transferElements: TRANSFER_ELEMENTS, drafts: createImageDesignDrafts(),
      keywordInputVisible: false, keywordInput: '',
      sourceFolders: [], sourceFoldersLoading: false, sourceFolderErrors: { private: false, enterprise: false }, designLibrary: [], libraryLoading: false, libraryError: false, results: [], resultsLoading: false, tasks: {},
      pickerVisible: false, pickerMode: '', pickerPersonalFolders: [], pickerFolders: [], pickerFolderStack: [], pickerSlot: '', pickerSourceRole: '', pickerTitle: '', pickerIncludeDescendants: false, activeFolder: null,
      folderItems: [], folderItemsPage: 0, folderItemsTotal: 0, folderItemsHasMore: false, folderItemsLoading: false, folderItemsLoadingMore: false, folderItemsError: false, selectedFolderItem: null, pickerSaving: false,
      comparisonVisible: false, comparisonImages: [], polishing: false, generating: false, draftSyncIssue: false, draftSaveTimer: null, taskPollTimer: null,
      saveTargetScopes: [], saveTargetsLoaded: false, saveTargetsLoading: false, saveTargetsError: '', saveTargetVisible: false,
      libraryPage: 0, libraryTotal: 0, libraryHasMore: false, libraryLoadingMore: false, libraryMoreError: false, libraryRequestId: 0, libraryRemovingId: ''
    }
  },
  computed: {
    activeWorkflow() { return this.workflows.find((item) => item.key === this.workflow) || this.workflows[0] },
    activeDraft() { return this.drafts[this.workflow] || {} },
    selectedSaveTargetLabel() { return fixedSaveTargetOptions(this.saveTargetScopes).find((option) => !option.disabled && this.activeDraft.save_target && option.scope === this.activeDraft.save_target.scope && option.gallery_id === this.activeDraft.save_target.gallery_id)?.label || '' },
    sourceFolderErrorMessage() {
      if (this.sourceFolderErrors.private && this.sourceFolderErrors.enterprise) return '素材图库加载失败，请重新加载。'
      if (this.sourceFolderErrors.private) return '我的素材加载失败，请重新加载。'
      if (this.sourceFolderErrors.enterprise) return '企业图库加载失败，请重新加载。'
      return ''
    },
    taskList() { return Object.keys(this.tasks).map((id) => this.tasks[id]).filter((item) => item && !this.isTaskDone(item)) }
  },
  async onShow() {
    if (!(await this.ensureInternalAccess())) return
    await Promise.all([this.loadSourceFolders(), this.loadSaveTargets()])
    await Promise.all([this.loadRemoteDrafts(), this.loadDesignLibrary(), this.loadResults()])
    this.startTaskPolling()
  },
  onHide() { this.persistDraftsNow(); this.stopTaskPolling() },
  onUnload() { this.persistDraftsNow(); this.stopTaskPolling() },
  methods: {
    mediaUrl, imageSourceLabel, imageDesignLibraryDate,
    sourceEntries(slot) { return imageSourceEntries(slot, this.sourceFolders) },
    imageUrl(item) { return galleryThumbUrl(item, 720) },
    resultImageUrl(item) { return mediaUrl(item.image_url || item.file_url || item.url || imageFileUrl(item)) },
    slotImage(slot) { return this.activeDraft[slot] || null },
    selectTab(key) { this.activeTab = key; if (key === 'library') this.loadDesignLibrary(); if (key === 'results') this.loadResults() },
    selectWorkflow(key) { this.closeKeywordInput(); this.workflow = key },
    closeKeywordInput() { this.keywordInputVisible = false; this.keywordInput = '' },
    removeDescriptionKeyword(keyword) {
      this.updateDescriptionKeywords(this.activeDraft.description_keywords.filter((item) => item !== keyword))
    },
    addDescriptionKeyword() {
      const keyword = this.keywordInput.trim()
      if (!keyword) { uni.showToast({ title: '请输入关键词', icon: 'none' }); return }
      const keywords = this.activeDraft.description_keywords
      if (keywords.includes(keyword)) { uni.showToast({ title: '该关键词已存在', icon: 'none' }); return }
      if (imageDesignDescription({ ...this.activeDraft, description_keywords: [...keywords, keyword] }).length > 3000) {
        uni.showToast({ title: '关键词与描述合计不能超过3000字', icon: 'none' }); return
      }
      this.updateDescriptionKeywords([...keywords, keyword]); this.closeKeywordInput()
    },
    updateDescriptionKeywords(keywords) {
      this.drafts = { ...this.drafts, [this.workflow]: updateImageDesignDraftKeywords(this.activeDraft, keywords) }; this.scheduleDraftSave()
    },
    updateDraft(patch) {
      const invalidatesPolish = ['target_space', 'layout_type', 'extra_element'].some((key) => Object.prototype.hasOwnProperty.call(patch, key) && patch[key] !== this.activeDraft[key])
      const draft = invalidatesPolish ? { ...this.activeDraft, ...patch, polished_prompt: '', polished_for: '', refinement_id: '' } : { ...this.activeDraft, ...patch }
      this.drafts = { ...this.drafts, [this.workflow]: draft }; this.scheduleDraftSave()
    },
    selectDesignStyle(style) { this.drafts = { ...this.drafts, [this.workflow]: updateImageDesignDraftStyle(this.activeDraft, style) }; this.scheduleDraftSave() },
    updateDescription(description) { this.drafts = { ...this.drafts, [this.workflow]: updateImageDesignDraftDescription(this.activeDraft, description) }; this.scheduleDraftSave() },
    toggleTransferElement(element) {
      if (this.workflow !== 'transfer') return
      const current = normalizeTransferElements(this.activeDraft.extra_element)
      const next = toggleTransferElementValue(current, element)
      if (next.length === current.length && next.every((item, index) => item === current[index])) {
        if (!current.includes(element)) uni.showToast({ title: '最多选择两个附加元素', icon: 'none' })
        return
      }
      this.updateDraft({ extra_element: next })
    },
    async loadSourceFolders() {
      this.sourceFoldersLoading = true
      this.sourceFolderErrors = { private: false, enterprise: false }
      try {
        const scopes = ['private', 'enterprise']
        const responses = await Promise.allSettled(scopes.map((scope) => mpContentApi.galleries(scope)))
        let folders = []
        const errors = { private: false, enterprise: false }
        responses.forEach((result, index) => {
          if (result.status === 'fulfilled') folders = folders.concat(result.value.galleries || [])
          else errors[scopes[index]] = true
        })
        if (!folders.length || errors.private || errors.enterprise) {
          try {
            const data = await mpContentApi.galleries()
            folders = data.galleries || []
            errors.private = false
            errors.enterprise = false
          } catch (error) {}
        }
        this.sourceFolders = uniqueFolders(folders)
        this.sourceFolderErrors = errors
      } catch (error) {
        this.sourceFolders = []
        this.sourceFolderErrors = { private: true, enterprise: true }
      } finally { this.sourceFoldersLoading = false }
    },
    async loadSaveTargets() {
      this.saveTargetsLoading = true; this.saveTargetsError = ''
      try {
        const data = await mpImageDesignApi.saveTargets()
        this.saveTargetScopes = Array.isArray(data.scopes) ? data.scopes : []
        this.saveTargetsLoaded = true
        this.drafts = normalizeImageDesignDrafts(this.drafts, this.saveTargetScopes)
      } catch (error) { this.saveTargetsError = `保存位置加载失败：${errorMessage(error)}` } finally { this.saveTargetsLoading = false }
    },
    async loadDesignLibrary(reset = true) {
      if (!reset && (this.libraryLoading || this.libraryLoadingMore || this.libraryError || !this.libraryHasMore)) return
      const requestId = ++this.libraryRequestId
      const page = reset ? 1 : this.libraryPage + 1
      this.libraryMoreError = false
      if (reset) { this.libraryLoading = true; this.libraryError = false; this.libraryLoadingMore = false }
      else this.libraryLoadingMore = true
      try {
        const data = await mpImageDesignApi.library({ page, page_size: 30 })
        if (requestId !== this.libraryRequestId) return
        const items = (data.items || data.library_items || []).map((item) => normalizeImageDesignLibraryItem(item)).filter((item) => item.id)
        this.designLibrary = mergeGalleryItems(reset ? [] : this.designLibrary, items)
        this.libraryPage = page; this.libraryTotal = Number(data.total || 0)
        this.libraryHasMore = page * 30 < this.libraryTotal
      } catch (error) {
        if (requestId !== this.libraryRequestId) return
        if (reset) this.libraryError = true
        else this.libraryMoreError = true
      } finally {
        if (requestId === this.libraryRequestId) { this.libraryLoading = false; this.libraryLoadingMore = false }
      }
    },
    loadMoreDesignLibrary() { if (this.activeTab === 'library' && !this.libraryMoreError) this.loadDesignLibrary(false) },
    removeDesignLibraryItem(item) {
      if (this.libraryRemovingId) return
      uni.showModal({ title: '从图库管理移除', content: '仅从当前账号的图库管理移除，PC 素材和生成结果会保留。', confirmText: '移除', success: async ({ confirm }) => {
        if (!confirm || this.libraryRemovingId) return
        this.libraryRemovingId = item.id
        try {
          await mpImageDesignApi.removeLibraryItem(item.id)
          await this.loadDesignLibrary()
          uni.showToast({ title: '已从图库管理移除', icon: 'none' })
        } catch (error) { uni.showToast({ title: errorMessage(error), icon: 'none' }) }
        finally { this.libraryRemovingId = '' }
      } })
    },
    async loadRemoteDrafts() {
      const cached = this.loadCachedDrafts()
      try { const data = await mpImageDesignApi.drafts(); this.applyDrafts(data.drafts || data); this.draftSyncIssue = false } catch (error) { this.applyDrafts(cached || this.drafts); this.draftSyncIssue = true }
    },
    loadCachedDrafts() { try { const raw = uni.getStorageSync(DRAFT_CACHE_KEY); return raw ? JSON.parse(raw) : null } catch (error) { return null } },
    applyDrafts(received) {
      if (!received || typeof received !== 'object') return
      const drafts = normalizeImageDesignDrafts(received, this.saveTargetScopes)
      Object.keys(drafts).forEach((key) => { drafts[key] = restoreImageDesignDraftKeywords(drafts[key]) })
      this.drafts = drafts; this.closeKeywordInput()
    },
    scheduleDraftSave() { if (this.draftSaveTimer) clearTimeout(this.draftSaveTimer); this.draftSaveTimer = setTimeout(() => this.persistDraftsNow(), 700) },
    async persistDraftsNow() {
      if (this.draftSaveTimer) { clearTimeout(this.draftSaveTimer); this.draftSaveTimer = null }
      try { uni.setStorageSync(DRAFT_CACHE_KEY, JSON.stringify(this.drafts)) } catch (error) {}
      try { await mpImageDesignApi.saveDrafts(this.drafts); this.draftSyncIssue = false } catch (error) { this.draftSyncIssue = true }
    },
    openPicker(slot, entry) {
      if (!entry || entry.disabled) return
      this.pickerSlot = slot; this.pickerSourceRole = entry.sourceRole; this.pickerTitle = entry.label; this.pickerIncludeDescendants = false
      this.pickerVisible = true; this.pickerPersonalFolders = entry.folders || []; this.pickerFolders = entry.folders || []; this.pickerFolderStack = []; this.folderItems = []; this.folderItemsPage = 0; this.folderItemsTotal = 0; this.folderItemsHasMore = false; this.folderItemsError = false; this.selectedFolderItem = null
      if (entry.pickerMode === 'personal-folders') { this.pickerMode = 'personal-folders'; this.activeFolder = null; return }
      if (!entry.folder) { this.closePicker(); return }
      this.pickerMode = 'images'; this.pickerFolderStack = [entry.folder]; this.activeFolder = entry.folder; this.pickerFolders = childFolders(this.sourceFolders, entry.folder.id); this.loadFolderItems(true)
    },
    selectPersonalFolder(folder) {
      if (!folder) return
      this.pickerMode = 'images'; this.pickerFolderStack = [folder]; this.activeFolder = folder; this.pickerTitle = `我的素材 / ${folder.name || '未分类'}`; this.pickerIncludeDescendants = false; this.pickerFolders = childFolders(this.sourceFolders, folder.id)
      this.folderItems = []; this.folderItemsPage = 0; this.folderItemsTotal = 0; this.folderItemsHasMore = false; this.folderItemsError = false; this.selectedFolderItem = null
      this.loadFolderItems(true)
    },
    selectPickerFolder(folder) {
      if (!folder) return
      this.pickerMode = 'images'; this.pickerFolderStack = [...this.pickerFolderStack, folder]; this.activeFolder = folder
      if (this.pickerPersonalFolders.length) this.pickerTitle = `我的素材 / ${this.pickerFolderStack.map((item) => item.name || '未分类').join(' / ')}`
      else this.pickerTitle = this.pickerFolderStack.map((item) => item.name || '未分类').join(' / ')
      this.pickerFolders = childFolders(this.sourceFolders, folder.id); this.folderItems = []; this.folderItemsPage = 0; this.folderItemsTotal = 0; this.folderItemsHasMore = false; this.folderItemsError = false; this.selectedFolderItem = null
      this.loadFolderItems(true)
    },
    backPicker() {
      if (this.pickerMode === 'images' && this.pickerFolderStack.length > 1) {
        this.pickerFolderStack = this.pickerFolderStack.slice(0, -1); this.activeFolder = this.pickerFolderStack[this.pickerFolderStack.length - 1]
        this.pickerTitle = this.pickerPersonalFolders.length ? `我的素材 / ${this.pickerFolderStack.map((item) => item.name || '未分类').join(' / ')}` : this.pickerFolderStack.map((item) => item.name || '未分类').join(' / ')
        this.pickerFolders = childFolders(this.sourceFolders, this.activeFolder.id); this.folderItems = []; this.folderItemsPage = 0; this.folderItemsTotal = 0; this.folderItemsHasMore = false; this.folderItemsError = false; this.selectedFolderItem = null; this.loadFolderItems(true)
        return
      }
      if (this.pickerMode === 'images' && this.pickerPersonalFolders.length) {
        this.pickerMode = 'personal-folders'; this.pickerFolderStack = []; this.activeFolder = null; this.pickerFolders = this.pickerPersonalFolders; this.pickerTitle = '我的素材'; this.pickerIncludeDescendants = false
        this.folderItems = []; this.folderItemsPage = 0; this.folderItemsTotal = 0; this.folderItemsHasMore = false; this.folderItemsError = false; this.selectedFolderItem = null
        return
      }
      this.closePicker()
    },
    closePicker() {
      this.pickerVisible = false; this.pickerMode = ''; this.pickerPersonalFolders = []; this.pickerFolders = []; this.pickerFolderStack = []; this.pickerSlot = ''; this.pickerSourceRole = ''; this.pickerTitle = ''; this.pickerIncludeDescendants = false; this.activeFolder = null
      this.folderItems = []; this.folderItemsPage = 0; this.folderItemsTotal = 0; this.folderItemsHasMore = false; this.folderItemsLoading = false; this.folderItemsLoadingMore = false; this.folderItemsError = false; this.selectedFolderItem = null
    },
    async loadFolderItems(reset = false) {
      if (!this.activeFolder || this.folderItemsLoading || this.folderItemsLoadingMore) return
      if (!reset && !this.folderItemsHasMore) return
      const page = reset ? 1 : this.folderItemsPage + 1
      this.folderItemsError = false
      if (reset) this.folderItemsLoading = true
      else this.folderItemsLoadingMore = true
      try {
        const data = await mpContentApi.galleryItems(this.activeFolder.id, this.activeFolder.visibility || '', { page, page_size: 30, include_descendants: false })
        const incoming = data.items || []
        this.folderItems = reset ? mergeGalleryItems([], incoming) : mergeGalleryItems(this.folderItems, incoming)
        this.folderItemsPage = page
        const pagination = data.pagination || {}
        const rawTotal = data.total !== undefined ? data.total : pagination.total
        this.folderItemsTotal = Number.isFinite(Number(rawTotal)) ? Number(rawTotal) : this.folderItems.length
        this.folderItemsHasMore = rawTotal !== undefined ? this.folderItems.length < this.folderItemsTotal : incoming.length >= 30
      } catch (error) { this.folderItemsError = true; uni.showToast({ title: errorMessage(error), icon: 'none' }) } finally { this.folderItemsLoading = false; this.folderItemsLoadingMore = false }
    },
    loadMoreFolderItems() { if (!this.folderItemsError) this.loadFolderItems(false) },
    retryFolderItems() { const reset = !this.folderItems.length; this.folderItemsError = false; this.loadFolderItems(reset) },
    async confirmPicker() {
      if (!this.selectedFolderItem || this.pickerSaving) return
      this.pickerSaving = true
      try {
        const response = await mpImageDesignApi.addLibraryItem({ source_library_item_id: this.selectedFolderItem.id, source_role: this.pickerSourceRole, source_gallery_id: this.activeFolder ? this.activeFolder.id : '' })
        const saved = normalizeImageDesignLibraryItem(response.item || response.library_item || response, { source_item_id: this.selectedFolderItem.id, asset_id: this.selectedFolderItem.asset_id || '', file_url: imageFileUrl(this.selectedFolderItem), thumbnail_file_url: this.selectedFolderItem.thumbnail_file_url || '', file_name: this.selectedFolderItem.file_name || this.selectedFolderItem.name || '', source_role: this.pickerSourceRole })
        if (!saved.id) throw new Error('图库保存失败，请稍后重试')
        this.setImageSlot(this.pickerSlot, saved)
        await this.loadDesignLibrary()
        this.closePicker(); uni.showToast({ title: '已加入图库并填入图片', icon: 'none' })
      } catch (error) { uni.showToast({ title: error.message || errorMessage(error), icon: 'none' }) } finally { this.pickerSaving = false }
    },
    chooseUpload(slot) {
      uni.chooseImage({ count: 1, sizeType: ['compressed'], success: async (response) => {
        const filePath = (response.tempFilePaths || [])[0]; if (!filePath) return
        try {
          await this.assertUploadableImage(filePath); uni.showLoading({ title: '正在上传', mask: true })
          const upload = await mpImageDesignApi.uploadInput(filePath, slot)
          const saved = normalizeImageDesignLibraryItem(upload.item || upload.library_item || upload, { source_role: 'upload' })
          if (!saved.id) throw new Error('上传后未返回图库图片')
          this.setImageSlot(slot, saved)
          await this.loadDesignLibrary()
          uni.showToast({ title: '已上传并加入图库', icon: 'none' })
        } catch (error) { uni.showToast({ title: error.message || errorMessage(error), icon: 'none' }) } finally { uni.hideLoading() }
      } })
    },
    assertUploadableImage(filePath) { return new Promise((resolve, reject) => uni.getFileInfo({ filePath, success: (info) => info && info.size > MAX_UPLOAD_BYTES ? reject(new Error('单张图片不能超过 20 MB')) : resolve(), fail: () => resolve() })) },
    setImageSlot(slot, image) { this.drafts = { ...this.drafts, [this.workflow]: updateImageDesignDraftImage(this.activeDraft, slot, image) }; this.scheduleDraftSave() },
    previewImage(item) { const url = this.imageUrl(item); if (url) uni.previewImage({ current: url, urls: [url] }) },
    requiredRoles() { return this.workflow === 'adapt' ? ['reference', 'rough'] : this.workflow === 'transfer' ? ['reference'] : ['source'] },
    requiredRoleMissing() { return this.requiredRoles().find((role) => !this.activeDraft[role]) || '' },
    roleLabel(role) { return { source: '原房实拍图', reference: '参考效果图', rough: '毛坯实拍图' }[role] || '图片' },
    async polishDescription() {
      const workflow = this.workflow
      const draftAtRequest = this.activeDraft
      const description = imageDesignDescription(draftAtRequest)
      if (!description) { uni.showToast({ title: '请先填写补充描述', icon: 'none' }); return }
      if (description.length > 3000) { uni.showToast({ title: '关键词与描述合计不能超过3000字', icon: 'none' }); return }
      const missing = this.requiredRoleMissing(); if (missing) { uni.showToast({ title: `请先选择${this.roleLabel(missing)}`, icon: 'none' }); return }
      if (this.workflow === 'redesign' && !isSupportedImageDesignStyle(this.activeDraft.style)) { uni.showToast({ title: '请选择换装风格', icon: 'none' }); return }
      this.polishing = true
      try {
        const images = this.requiredRoles().map((role) => ({ role, library_item_id: this.activeDraft[role].id }))
        const data = await mpImageDesignApi.polish({ workflow: this.workflow, description, style: imageDesignStyleForPayload(this.activeDraft.style), images, target_space: this.activeDraft.target_space || undefined, layout_type: this.activeDraft.layout_type || undefined, extra_element: this.workflow === 'transfer' ? normalizeTransferElements(this.activeDraft.extra_element) : undefined })
        const polished = data.polished_prompt || data.prompt || data.result || ''; if (!polished) throw new Error('AI 未返回润色结果，请重试')
        const refinementId = String(data.refinement_id || '').trim(); if (!refinementId) throw new Error('AI 未返回润色凭证，请重试')
        if (this.workflow === workflow && this.activeDraft === draftAtRequest) this.updateDraft({ polished_prompt: polished, polished_for: description, refinement_id: refinementId })
      } catch (error) { uni.showToast({ title: error.message || errorMessage(error), icon: 'none' }) } finally { this.polishing = false }
    },
    async openSaveTarget() {
      if (this.saveTargetsLoading) return
      if (!this.saveTargetsLoaded || this.saveTargetsError) await this.loadSaveTargets()
      if (!this.saveTargetsError && this.saveTargetScopes.length) this.saveTargetVisible = true
      else uni.showToast({ title: '保存位置暂时无法加载', icon: 'none' })
    },
    closeSaveTarget() { this.saveTargetVisible = false },
    isWritableSaveTarget(target) {
      const normalized = normalizeSaveTarget(target); if (!normalized || !this.saveTargetsLoaded || this.saveTargetsError) return false
      return fixedSaveTargetOptions(this.saveTargetScopes).some((option) => !option.disabled && option.scope === normalized.scope && option.gallery_id === normalized.gallery_id)
    },
    async confirmSaveTarget(target) {
      if (!this.isWritableSaveTarget(target)) { uni.showToast({ title: '该保存位置已不可用，请重新选择', icon: 'none' }); return }
      const drafts = {}
      Object.keys(this.drafts).forEach((key) => { drafts[key] = { ...this.drafts[key], save_target: normalizeSaveTarget(target) } })
      this.drafts = drafts
      this.closeSaveTarget()
      await this.persistDraftsNow()
    },
    validateGeneration() {
      const missing = this.requiredRoleMissing(); if (missing) return `请选择${this.roleLabel(missing)}`
      if (this.workflow === 'redesign' && !isSupportedImageDesignStyle(this.activeDraft.style)) return '请选择换装风格'
      const description = imageDesignDescription(this.activeDraft)
      if (!description) return '请填写补充描述'
      if (description.length > 3000) return '关键词与描述合计不能超过3000字'
      if (!this.activeDraft.polished_prompt || this.activeDraft.polished_for !== description || !this.activeDraft.refinement_id) return '请先完成 AI 深度润色'
      return this.isWritableSaveTarget(this.activeDraft.save_target) ? '' : '请选择有效的保存路径'
    },
    async generateImages() {
      const validation = this.validateGeneration(); if (validation) { uni.showToast({ title: validation, icon: 'none' }); return }
      if (!draftCanGenerate(this.workflow, this.activeDraft)) { uni.showToast({ title: '生成参数尚未填写完整', icon: 'none' }); return }
      this.generating = true
      try {
        const workflow = this.workflow; const payload = buildImageDesignPayload(workflow, this.activeDraft)
        await this.persistDraftsNow(); const data = await mpImageDesignApi.createTask(payload); const task = data.task || data; const id = task.id || task.task_id || task.job_id
        if (id) this.tasks = { ...this.tasks, [id]: { ...task, id, status_text: task.status_text || '正在生成图片…' } }
        this.activeTab = 'results'; await this.loadResults(); this.startTaskPolling()
      } catch (error) { uni.showToast({ title: error.message || errorMessage(error), icon: 'none' }) } finally { this.generating = false }
    },
    async loadResults() { this.resultsLoading = true; try { const data = await mpImageDesignApi.results({ page: 1, page_size: 100 }); this.results = data.items || data.results || [] } catch (error) { this.results = [] } finally { this.resultsLoading = false } },
    startTaskPolling() { if (this.taskPollTimer || !Object.keys(this.tasks).length) return; this.taskPollTimer = setInterval(() => this.refreshTasks(), 4000); this.refreshTasks() },
    stopTaskPolling() { if (this.taskPollTimer) clearInterval(this.taskPollTimer); this.taskPollTimer = null },
    isTaskDone(task) { return ['completed', 'succeeded', 'failed', 'cancelled'].includes(String(task.status || '').toLowerCase()) },
    async refreshTasks() {
      const ids = Object.keys(this.tasks).filter((id) => !this.isTaskDone(this.tasks[id])); if (!ids.length) { this.stopTaskPolling(); return }
      const next = { ...this.tasks }
      await Promise.all(ids.map(async (id) => { try { const data = await mpImageDesignApi.task(id); next[id] = { ...next[id], ...(data.task || data), id } } catch (error) {} }))
      this.tasks = next
      if (ids.some((id) => this.isTaskDone(next[id]))) {
        this.loadResults()
        this.loadDesignLibrary()
      }
      if (!Object.keys(next).some((id) => !this.isTaskDone(next[id]))) this.stopTaskPolling()
    },
    async retryTask(item) { const id = item.task_id || item.job_id || item.id; if (!id) return; try { const data = await mpImageDesignApi.retryTask(id); const task = data.task || data; const taskId = task.id || task.task_id || id; this.tasks = { ...this.tasks, [taskId]: { ...task, id: taskId, status_text: '正在补生成图片…' } }; this.startTaskPolling() } catch (error) { uni.showToast({ title: errorMessage(error), icon: 'none' }) } },
    openComparison(item) { this.comparisonImages = comparisonSources(item).filter((image) => image.url); if (!this.comparisonImages.length) { uni.showToast({ title: '暂无法获取对比图片', icon: 'none' }); return }; this.comparisonVisible = true },
    previewResult(item) { const url = this.resultImageUrl(item); if (url) uni.previewImage({ current: url, urls: [url] }) },
    downloadResult(item) {
      const url = this.resultImageUrl(item); if (!url) return; uni.showLoading({ title: '正在下载', mask: true })
      uni.downloadFile({ url, success: (response) => {
        if (response.statusCode !== 200 || !response.tempFilePath) { uni.hideLoading(); uni.showToast({ title: '图片下载失败', icon: 'none' }); return }
        uni.saveImageToPhotosAlbum({ filePath: response.tempFilePath, success: () => { uni.hideLoading(); uni.showToast({ title: '已保存到相册', icon: 'none' }) }, fail: () => { uni.hideLoading(); uni.showModal({ title: '需要相册权限', content: '请允许保存图片到相册后重试。', confirmText: '去设置', success: ({ confirm }) => { if (confirm && typeof uni.openSetting === 'function') uni.openSetting({}) } }) } })
      }, fail: () => { uni.hideLoading(); uni.showToast({ title: '图片下载失败', icon: 'none' }) } })
    },
    displayTime(value) { return value ? String(value).replace('T', ' ').slice(0, 16) : '' }
  }
}
</script>

<style scoped>
.library-grid .library-image { height: 440rpx; }
.library-image .library-caption { position: absolute; bottom: 0; left: 0; right: 0; padding: 30px 6px 9px; background: linear-gradient(transparent, rgba(0,0,0,.55)); text-align: center; }
.library-image .library-caption text { position: static; display: block; padding: 2px 0; border-radius: 0; background: none; font-size: 14px; font-weight: 600; color: #fff; }
.library-remove { position: absolute; top: 3px; right: 3px; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; padding: 0; background: transparent; }
.library-remove::after { border: 0; }
.trash-icon { position: relative; width: 12px; height: 16px; border-radius: 0 0 2px 2px; background: #fff; }
.trash-icon::before { content: ''; position: absolute; left: -2px; top: -4px; width: 16px; height: 2px; background: #fff; }
.trash-icon::after { content: ''; position: absolute; left: 3px; top: -6px; width: 6px; height: 2px; background: #fff; }
.page { min-height: 100vh; box-sizing: border-box; padding-bottom: calc(52px + env(safe-area-inset-bottom)); background: #f4f1ee; color: #282421; }
.segments { display: flex; gap: 8px; height: 40px; margin: 14px 14px 0; overflow: visible; background: transparent; }.segment { flex: 1; display: flex; align-items: center; justify-content: center; border: 0; border-radius: 20px; color: #8a817c; font-size: 14px; background: #fff; }.segment.active { color: #fff; font-weight: 700; background: #be2d22; }.content { height: calc(100vh - 52px - env(safe-area-inset-bottom)); }
.section { margin-top: 12px; padding: 20px 18px; border-top: 1px solid #ede8e4; border-bottom: 1px solid #ede8e4; background: #fff; }.section-title { display: flex; align-items: center; color: #231f1d; font-size: 18px; font-weight: 700; }.section-title view { width: 4px; height: 23px; margin-right: 9px; background: #be2d22; }.workflow-options { display: flex; gap: 8px; margin-top: 17px; }.workflow-option { flex: 1; min-width: 0; height: 40px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; position: relative; border: 0; border-radius: 20px; color: #8a817c; font-size: 14px; background: #fff; }.workflow-option.active { color: #fff; font-weight: 700; background: #be2d22; }.workflow-description { display: block; margin-top: 12px; color: #5f5853; font-size: 13px; line-height: 1.6; }
.source-folder-error { margin: 10px 18px 0; padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; color: #9b5d27; font-size: 12px; background: #fff4e8; }.source-folder-error text:last-child { margin-left: 12px; color: #be2d22; white-space: nowrap; }
.field-title { color: #201d1a; font-size: 16px; font-weight: 700; }.field-title > text, .field-title > view > text { margin-right: 3px; color: #be2d22; }.field-title-with-action { display: flex; align-items: center; justify-content: space-between; }.field-title-with-action .upload-link { margin: 0; color: #be2d22; font-size: 14px; font-weight: 400; }.field-note { display: block; margin-top: 6px; color: #817872; font-size: 12px; line-height: 1.55; }.source-actions { display: flex; gap: 14px; margin-top: 15px; }.source-actions-three { gap: 9px; }.source-folder, .source-upload { min-width: 0; flex: 1; min-height: 93px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #3b3531; font-size: 13px; }.source-folder { border: 0; background: transparent; }.source-upload { border: 0; background: transparent; }.mini-folder { position: relative; width: 54px; height: 39px; margin-bottom: 8px; border-radius: 4px 6px 6px 6px; background: #ffc238; }.mini-folder view { position: absolute; top: -6px; left: 0; width: 26px; height: 9px; border-radius: 4px 4px 0 0; background: #ffc238; }.source-upload > text:first-child { width: 31px; height: 31px; margin-bottom: 9px; border-radius: 50%; color: #be2d22; font-size: 27px; line-height: 29px; text-align: center; background: #f5e4e1; }
.selected-input { min-height: 66px; margin-top: 13px; padding: 7px 10px; box-sizing: border-box; display: flex; align-items: center; background: #f8f6f4; }.selected-input image { width: 52px; height: 52px; margin-right: 11px; background: #e5ddd7; }.selected-input view text { display: block; color: #38322e; font-size: 13px; font-weight: 700; }.selected-input view text + text { margin-top: 4px; color: #918780; font-size: 11px; font-weight: 400; }.selected-input > text { margin-left: auto; color: #be2d22; font-size: 13px; }
.chip-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 15px; }.choice-chip { min-height: 40px; padding: 0 13px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; border: 0; border-radius: 20px; color: #8a817c; font-size: 13px; line-height: 1.25; text-align: center; background: #fff; }.choice-chip.active { color: #fff; font-weight: 700; background: #be2d22; }.three-column .choice-chip { width: calc((100% - 20px) / 3); padding: 0 4px; }.two-column .choice-chip { width: calc((100% - 10px) / 2); padding: 0 5px; }.sub-title { margin-top: 21px; color: #292421; font-size: 16px; font-weight: 700; }
.description { width: 100%; height: 138px; margin-top: 10px; padding: 0; box-sizing: border-box; color: #38322e; font-size: 14px; line-height: 1.55; background: transparent; }.description-placeholder { color: #ada9a5; }.polish-button { float: right; height: 40px; margin: 13px 0 12px; padding: 0 16px; border-radius: 20px; color: #fff; font-size: 15px; line-height: 40px; background: #be2d22; }.polish-button::after, .generate-button::after, .picker-confirm::after, .retry::after { border: 0; }.polish-result { clear: both; min-height: 87px; padding: 13px; box-sizing: border-box; border: 1px dashed #a9a29c; border-radius: 7px; background: #fafafa; }.polish-result.ready { border-color: #4f84ff; background: #f9fbff; }.polish-result text { display: block; color: #77706a; font-size: 13px; font-weight: 700; }.polish-result text + text { margin-top: 7px; color: #88817b; font-size: 12px; font-weight: 400; line-height: 1.6; white-space: pre-wrap; }.polish-result.ready text:first-child { color: #be2d22; }
.option-stack { margin-top: 14px; }.large-choice { min-height: 64px; margin-top: 12px; padding: 9px 16px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; border: 0; border-radius: 12px; color: #8a817c; font-size: 15px; line-height: 1.35; background: #fff; }.large-choice text + text { margin-top: 3px; font-size: 13px; }.large-choice.active { color: #fff; font-weight: 700; background: #be2d22; }.compact { padding-top: 18px; padding-bottom: 18px; }.two-row { display: flex; gap: 16px; margin-top: 14px; }.large-choice.inline { flex: 1; min-height: 40px; margin: 0; padding: 0 10px; align-items: center; text-align: center; border-radius: 20px; }.save-target { min-height: 40px; margin-top: 14px; padding: 0 13px; display: flex; align-items: center; justify-content: space-between; border: 0; border-radius: 20px; color: #342e2a; font-size: 14px; background: #fff; }.save-target .placeholder { color: #8b837c; }.sync-note { display: block; margin-top: 8px; color: #aa6c34; font-size: 11px; }.generate-button { width: calc(100% - 36px); height: 40px; margin: 24px 18px 0; border-radius: 20px; color: #fff; font-size: 15px; line-height: 40px; background: #be2d22; }.generate-button[disabled] { opacity: .55; }
.gallery-heading { display: flex; align-items: baseline; justify-content: space-between; padding: 22px 18px 15px; background: #fff; }.gallery-heading text:first-child { color: #25211e; font-size: 19px; font-weight: 700; }.gallery-heading text:last-child { color: #8f867f; font-size: 12px; }.state { padding: 74px 22px; color: #8b837d; font-size: 14px; text-align: center; }.state text { display: block; }.retry { display: inline-block; margin-top: 10px; padding: 0; color: #be2d22; font-size: 14px; background: transparent; }.library-grid, .result-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; padding: 14px; }.library-image { position: relative; height: 195px; overflow: hidden; background: #e5ddd7; }.library-image image { width: 100%; height: 100%; display: block; }.library-image text { position: absolute; top: 8px; left: 8px; padding: 3px 6px; border-radius: 3px; color: #fff; font-size: 10px; background: rgba(38, 33, 30, .72); }.tasks { padding: 10px 14px 0; }.task { min-height: 45px; padding: 0 12px; display: flex; align-items: center; gap: 8px; color: #796f67; font-size: 13px; background: #fff7e8; }.task view { width: 8px; height: 8px; border-radius: 50%; background: #be2d22; animation: pulse 1.2s infinite; }.task text:last-child { margin-left: auto; color: #be2d22; }.result-card { overflow: hidden; border: 1px solid #e8e1dc; background: #fff; }.result-card image { width: 100%; height: 205px; display: block; background: #e5ddd7; }.result-time { display: block; min-height: 30px; padding: 6px 8px 0; color: #77706b; font-size: 11px; }.result-actions { min-height: 42px; padding: 0 8px 8px; display: flex; align-items: center; justify-content: space-between; }.download { display: flex; align-items: center; color: #347bf1; font-size: 12px; }.download text:first-child { margin-right: 2px; font-size: 25px; line-height: 20px; }.compare { min-width: 42px; min-height: 29px; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #fff; font-size: 12px; background: #347bf1; }.retry-line { padding: 0 8px 8px; display: flex; justify-content: space-between; color: #aa6c34; font-size: 11px; }.retry-line text:last-child { color: #be2d22; }.spacer { height: 24px; }
.layer { position: fixed; inset: 0; z-index: 50; display: flex; flex-direction: column; padding-bottom: env(safe-area-inset-bottom); background: #f4f1ee; }.layer-head { position: relative; min-height: 58px; display: flex; align-items: center; justify-content: center; border-bottom: 1px solid #ece6e1; color: #201c1a; font-size: 18px; font-weight: 700; background: #fff; }.back, .close { position: absolute; top: 0; min-height: 58px; display: flex; align-items: center; }.back { left: 17px; font-size: 37px; font-weight: 400; }.close { right: 16px; color: #766e68; font-size: 13px; font-weight: 400; }.layer-body { flex: 1; min-height: 0; }.folder-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 25px 13px; padding: 28px 18px; }.folder-card { min-width: 0; color: #38322e; font-size: 12px; text-align: center; }.folder-card text { display: block; overflow: hidden; margin-top: 10px; text-overflow: ellipsis; white-space: nowrap; }.folder-icon { position: relative; width: 78px; height: 57px; margin: 0 auto; border-radius: 4px 7px 8px 8px; background: #ffc238; }.folder-icon view { position: absolute; top: -8px; left: 0; width: 37px; height: 14px; border-radius: 5px 5px 0 0; background: #ffc238; }.breadcrumb { display: block; padding: 15px 17px 0; color: #756d67; font-size: 13px; }.picker-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; padding: 18px 15px 92px; }.picker-image { position: relative; height: 145px; border: 2px solid transparent; background: #e5ddd7; }.picker-image.selected { border-color: #347bf1; }.picker-image image { width: 100%; height: 100%; display: block; }.picker-image text { position: absolute; top: 6px; right: 6px; width: 25px; height: 25px; box-sizing: border-box; border: 2px solid #fff; border-radius: 50%; color: #fff; font-size: 15px; line-height: 21px; text-align: center; background: rgba(0, 0, 0, .17); }.picker-image.selected text { border-color: #347bf1; background: #347bf1; }.load-more { padding: 12px 18px 90px; color: #8b837d; font-size: 12px; text-align: center; }.load-more-error { display: flex; justify-content: center; gap: 12px; }.load-more-error text:last-child { color: #be2d22; }.picker-confirm { position: absolute; right: 18px; bottom: calc(18px + env(safe-area-inset-bottom)); left: 18px; height: 54px; border-radius: 27px; color: #fff; font-size: 18px; line-height: 54px; background: #be2d22; }.picker-confirm[disabled] { opacity: .5; }
.compare-layer { background: #f5f2ef; }.compare-list { padding: 14px; }.compare-list > view { margin-bottom: 19px; background: #fff; }.compare-list text { display: block; padding: 14px 14px 9px; color: #25211f; font-size: 16px; font-weight: 700; }.compare-list image { width: 100%; display: block; background: #e5ddd7; } @keyframes pulse { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }
.description-box { margin-top: 16px; padding: 12px; border: 1px dashed #4f84ff; border-radius: 8px; background: #fafcff; }
.description-keywords { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.description-keyword { display: flex; align-items: center; max-width: 100%; box-sizing: border-box; padding: 2px 5px 2px 10px; border: 1px solid #4f84ff; border-radius: 18px; color: #4f84ff; font-size: 12px; line-height: 24px; background: #f0f5ff; }
.description-keyword > text:first-child { min-width: 0; overflow-wrap: anywhere; }
.keyword-remove { flex-shrink: 0; display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; margin-left: 2px; font-size: 20px; }
.keyword-add, .keyword-cancel { flex-shrink: 0; margin: 0; padding: 0 10px; height: 32px; border-radius: 16px; color: #4f84ff; font-size: 12px; line-height: 30px; background: transparent; }
.keyword-add { border: 1px dashed #4f84ff; }
.keyword-add::after, .keyword-cancel::after { border: none; }
.keyword-cancel { padding: 0 6px; color: #88817b; }
.keyword-editor { display: flex; align-items: center; gap: 6px; width: 100%; min-width: 0; }
.keyword-input { flex: 1; min-width: 0; height: 34px; padding: 0 8px; border: 1px solid #c6d7ff; border-radius: 6px; color: #38322e; font-size: 13px; background: #fff; }
</style>
