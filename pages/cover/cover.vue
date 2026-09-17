<template>
  <view v-if="internalAccessGranted" class="page">
    <view class="segments">
      <view v-for="item in tabs" :key="item.key" class="segment" :class="{ active: activeTab === item.key }" @click="selectTab(item.key)">{{ item.label }}</view>
    </view>

    <scroll-view class="content" scroll-y>
      <template v-if="activeTab === 'workflow'">
        <view class="section workflow-head">
          <view class="section-title"><view /><text>创作工作流</text></view>
          <view class="workflow-options">
            <view v-for="item in workflows" :key="item.key" class="workflow-option" :class="{ active: workflow === item.key }" @click="workflow = item.key">
              {{ item.label }}<text v-if="workflow === item.key">✓</text>
            </view>
          </view>
          <text class="workflow-description">{{ activeWorkflow.description }}</text>
        </view>

        <view v-if="workflow === 'redesign'" class="section">
          <view class="field-title"><text>*</text>原房实拍图</view>
          <view class="source-actions source-actions-three">
            <view class="source-folder" @click="openPicker('source', 'reference')"><view class="mini-folder"><view /></view><text>案例图库</text></view>
            <view class="source-folder" @click="openPicker('source', 'rough')"><view class="mini-folder"><view /></view><text>毛坯图库</text></view>
            <view class="source-upload" @click="chooseUpload('source')"><text>+</text><text>上传照片</text></view>
          </view>
          <view v-if="slotImage('source')" class="selected-input" @click="previewImage(slotImage('source'))"><image :src="imageUrl(slotImage('source'))" mode="aspectFill" /><view><text>已选择原房图</text><text>{{ imageSourceLabel(slotImage('source').source_role) }}</text></view><text>更换</text></view>
        </view>

        <view v-if="workflow === 'adapt'" class="section">
          <view class="field-title"><text>*</text>参考效果图</view>
          <view class="source-actions"><view class="source-folder" @click="openPicker('reference', 'reference')"><view class="mini-folder"><view /></view><text>案例图库</text></view><view class="source-upload" @click="chooseUpload('reference')"><text>+</text><text>上传照片</text></view></view>
          <view v-if="slotImage('reference')" class="selected-input" @click="previewImage(slotImage('reference'))"><image :src="imageUrl(slotImage('reference'))" mode="aspectFill" /><view><text>已选择案例图</text><text>{{ imageSourceLabel(slotImage('reference').source_role) }}</text></view><text>更换</text></view>
        </view>

        <view v-if="workflow === 'adapt'" class="section">
          <view class="field-title"><text>*</text>毛坯实拍图</view>
          <view class="source-actions"><view class="source-folder" @click="openPicker('rough', 'rough')"><view class="mini-folder"><view /></view><text>毛坯图库</text></view><view class="source-upload" @click="chooseUpload('rough')"><text>+</text><text>上传照片</text></view></view>
          <view v-if="slotImage('rough')" class="selected-input" @click="previewImage(slotImage('rough'))"><image :src="imageUrl(slotImage('rough'))" mode="aspectFill" /><view><text>已选择毛坯图</text><text>{{ imageSourceLabel(slotImage('rough').source_role) }}</text></view><text>更换</text></view>
        </view>

        <view v-if="workflow === 'transfer'" class="section">
          <view class="field-title"><text>*</text>参考效果图</view>
          <view class="source-actions"><view class="source-folder" @click="openPicker('reference', 'reference')"><view class="mini-folder"><view /></view><text>案例图库</text></view><view class="source-upload" @click="chooseUpload('reference')"><text>+</text><text>上传照片</text></view></view>
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
          <view class="chip-grid two-column"><view v-for="element in transferElements" :key="element" class="choice-chip" :class="{ active: activeDraft.extra_element === element }" @click="updateDraft({ extra_element: element })">{{ element }}</view></view>
        </view>

        <view class="section">
          <view class="field-title"><text>*</text>补充描述</view>
          <text class="field-note">填写后点击 AI 深度润色；润色成功后才可生成。</text>
          <textarea class="description" :value="activeDraft.description" maxlength="500" placeholder="描述风格、材质、色调、空间氛围与重点陈设。" placeholder-class="description-placeholder" @input="updateDescription($event.detail.value)" />
          <button class="polish-button" :loading="polishing" @click="polishDescription">AI 深度润色</button>
          <view class="polish-result" :class="{ ready: activeDraft.polished_prompt }"><text>AI 润色结果{{ activeDraft.polished_prompt ? '' : ' · 未生成' }}</text><text>{{ activeDraft.polished_prompt || '请先完成补充描述与 AI 深度润色。' }}</text></view>
        </view>

        <view class="section">
          <view class="field-title"><text>*</text>图片比例</view>
          <view class="option-stack"><view v-for="item in imageRatios" :key="item.key" class="large-choice" :class="{ active: activeDraft.ratio === item.key }" @click="updateDraft({ ratio: item.key })"><text>{{ item.label }}</text><text>{{ item.pixels }}</text></view></view>
        </view>
        <view class="section compact"><view class="field-title"><text>*</text>生成数量</view><view class="two-row"><view v-for="count in imageCounts" :key="count" class="large-choice inline" :class="{ active: activeDraft.count === count }" @click="updateDraft({ count })">{{ count }}张</view></view></view>
        <view class="section compact"><view class="field-title"><text>*</text>清晰度</view><view class="two-row"><view v-for="item in imageQualities" :key="item.key" class="large-choice inline" :class="{ active: activeDraft.quality === item.key }" @click="updateDraft({ quality: item.key })">{{ item.label }}</view></view></view>
        <view class="section compact"><view class="field-title"><text>*</text>选择保存路径</view><view class="save-target" @click="savePickerVisible = true"><text :class="{ placeholder: !selectedSaveFolder }">{{ selectedSaveFolder ? selectedSaveFolder.name : '请选择保存路径' }}</text><text>⌄</text></view><text v-if="draftSyncIssue" class="sync-note">草稿暂未同步到账号，将在网络恢复后再次保存。</text></view>
        <button class="generate-button" :loading="generating" :disabled="generating" @click="generateImages">生成图片</button>
      </template>

      <template v-else-if="activeTab === 'library'">
        <view class="gallery-heading"><text>我的生图图库</text><text>已保存 {{ designLibrary.length }} 张图片</text></view>
        <view v-if="libraryLoading" class="state">正在加载图库…</view>
        <view v-else-if="libraryError" class="state"><text>图库暂时无法加载</text><button class="retry" @click="loadDesignLibrary">重新加载</button></view>
        <view v-else-if="!designLibrary.length" class="state">从工作流中选择或上传图片后，会保存到这里。</view>
        <view v-else class="library-grid"><view v-for="item in designLibrary" :key="item.id" class="library-image" @click="previewImage(item)"><image :src="imageUrl(item)" mode="aspectFill" lazy-load /><text>{{ imageSourceLabel(item.source_role) }}</text></view></view>
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
      <view class="layer-head"><text class="back" @click="pickerStage === 'images' ? backToFolders() : closePicker()">‹</text><text>{{ pickerStage === 'folders' ? '选择图库' : '选择图片' }}</text><text class="close" @click="closePicker">关闭</text></view>
      <scroll-view class="layer-body" scroll-y>
        <view v-if="pickerStage === 'folders'">
          <view v-if="sourceFoldersLoading" class="state">正在加载图库…</view>
          <view v-else-if="!sourceFolders.length" class="state">暂无可选择的图库文件夹</view>
          <view v-else class="folder-grid"><view v-for="folder in sourceFolders" :key="folder.id" class="folder-card" @click="openFolder(folder)"><view class="folder-icon"><view /></view><text>{{ folder.name }}</text></view></view>
        </view>
        <view v-else>
          <text class="breadcrumb">{{ activeFolder ? activeFolder.name : '' }}</text>
          <view v-if="folderItemsLoading" class="state">正在加载图片…</view>
          <view v-else-if="!folderItems.length" class="state">该图库暂无图片</view>
          <view v-else class="picker-grid"><view v-for="item in folderItems" :key="item.id" class="picker-image" :class="{ selected: selectedFolderItem && selectedFolderItem.id === item.id }" @click="selectedFolderItem = item"><image :src="imageUrl(item)" mode="aspectFill" lazy-load /><text>{{ selectedFolderItem && selectedFolderItem.id === item.id ? '✓' : '' }}</text></view></view>
        </view>
      </scroll-view>
      <button v-if="pickerStage === 'images'" class="picker-confirm" :loading="pickerSaving" :disabled="!selectedFolderItem || pickerSaving" @click="confirmPicker">确定</button>
    </view>

    <view v-if="savePickerVisible" class="layer">
      <view class="layer-head"><text class="back" @click="savePickerVisible = false">‹</text><text>选择保存路径</text><text class="close" @click="savePickerVisible = false">关闭</text></view>
      <scroll-view class="layer-body" scroll-y><view v-if="!saveFolders.length" class="state">暂无可保存的文件夹</view><view v-else class="save-list"><view v-for="folder in saveFolders" :key="folder.id" class="save-row" :class="{ selected: activeDraft.save_target_id === folder.id }" @click="selectSaveFolder(folder)"><view class="small-folder"><view /></view><view><text>{{ folder.name }}</text><text>{{ isPublicFolder(folder) ? '企业公共库' : '个人素材库' }}</text></view><text>{{ activeDraft.save_target_id === folder.id ? '✓' : '' }}</text></view></view></scroll-view>
    </view>

    <view v-if="comparisonVisible" class="layer compare-layer"><view class="layer-head"><text class="back" @click="comparisonVisible = false">‹</text><text>对比</text><text class="close" @click="comparisonVisible = false">关闭</text></view><scroll-view class="layer-body" scroll-y><view class="compare-list"><view v-for="item in comparisonImages" :key="item.label"><text>{{ item.label }}</text><image :src="mediaUrl(item.url)" mode="widthFix" /></view></view></scroll-view></view>
    <tab-bar current="cover" />
  </view>
</template>

<script>
import TabBar from '../../components/tab-bar.vue'
import { mpContentApi, mpImageDesignApi } from '../../apis/mp'
import { errorMessage, galleryThumbUrl, mediaUrl } from '../../utils/request'
import { internalPageMixin } from '../../utils/internal-access'
import {
  IMAGE_COUNTS, IMAGE_DESIGN_STYLE_OPTIONS, IMAGE_DESIGN_WORKFLOWS, IMAGE_QUALITIES, IMAGE_RATIOS, TARGET_SPACES, TRANSFER_ELEMENTS, TRANSFER_LAYOUTS,
  buildImageDesignPayload, comparisonSources, createImageDesignDrafts, draftCanGenerate, imageFileUrl, imageSourceLabel,
  imageDesignStyleForPayload, isPublicSaveFolder, isSupportedImageDesignStyle, normalizeImageDesignDrafts,
  normalizeImageDesignLibraryItem, saveableFolders, uniqueFolders, updateImageDesignDraftStyle
} from '../../utils/image-design-logic.mjs'

const DRAFT_CACHE_KEY = 'image-design-drafts-v1'
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

export default {
  components: { TabBar },
  mixins: [internalPageMixin],
  data() {
    return {
      tabs: [{ key: 'workflow', label: '工作流' }, { key: 'library', label: '图库' }, { key: 'results', label: '生成结果' }],
      activeTab: 'workflow', workflow: 'redesign', workflows: IMAGE_DESIGN_WORKFLOWS, imageRatios: IMAGE_RATIOS, imageCounts: IMAGE_COUNTS, imageQualities: IMAGE_QUALITIES,
      designStyles: IMAGE_DESIGN_STYLE_OPTIONS, targetSpaces: TARGET_SPACES, transferLayouts: TRANSFER_LAYOUTS, transferElements: TRANSFER_ELEMENTS, drafts: createImageDesignDrafts(),
      sourceFolders: [], sourceFoldersLoading: false, designLibrary: [], libraryLoading: false, libraryError: false, results: [], resultsLoading: false, tasks: {},
      pickerVisible: false, pickerStage: 'folders', pickerSlot: '', pickerSourceRole: '', activeFolder: null, folderItems: [], folderItemsLoading: false, selectedFolderItem: null, pickerSaving: false,
      savePickerVisible: false, comparisonVisible: false, comparisonImages: [], polishing: false, generating: false, draftSyncIssue: false, draftSaveTimer: null, taskPollTimer: null
    }
  },
  computed: {
    activeWorkflow() { return this.workflows.find((item) => item.key === this.workflow) || this.workflows[0] },
    activeDraft() { return this.drafts[this.workflow] || {} },
    saveFolders() { return saveableFolders(this.sourceFolders) },
    selectedSaveFolder() { return this.saveFolders.find((item) => item.id === this.activeDraft.save_target_id) || null },
    taskList() { return Object.keys(this.tasks).map((id) => this.tasks[id]).filter((item) => item && !this.isTaskDone(item)) }
  },
  async onShow() {
    if (!(await this.ensureInternalAccess())) return
    await Promise.all([this.loadSourceFolders(), this.loadRemoteDrafts(), this.loadDesignLibrary(), this.loadResults()])
    this.startTaskPolling()
  },
  onHide() { this.persistDraftsNow(); this.stopTaskPolling() },
  onUnload() { this.persistDraftsNow(); this.stopTaskPolling() },
  methods: {
    mediaUrl, imageSourceLabel, isPublicFolder: isPublicSaveFolder,
    imageUrl(item) { return galleryThumbUrl(item, 720) },
    resultImageUrl(item) { return mediaUrl(item.image_url || item.file_url || item.url || imageFileUrl(item)) },
    slotImage(slot) { return this.activeDraft[slot] || null },
    selectTab(key) { this.activeTab = key; if (key === 'library') this.loadDesignLibrary(); if (key === 'results') this.loadResults() },
    updateDraft(patch) { this.drafts = { ...this.drafts, [this.workflow]: { ...this.activeDraft, ...patch } }; this.scheduleDraftSave() },
    selectDesignStyle(style) { this.drafts = { ...this.drafts, [this.workflow]: updateImageDesignDraftStyle(this.activeDraft, style) }; this.scheduleDraftSave() },
    updateDescription(description) { this.updateDraft({ description, polished_prompt: '', polished_for: '' }) },
    async loadSourceFolders() {
      this.sourceFoldersLoading = true
      try {
        const responses = await Promise.allSettled([mpContentApi.galleries('private'), mpContentApi.galleries('enterprise')])
        let folders = []
        responses.forEach((result) => { if (result.status === 'fulfilled') folders = folders.concat(result.value.galleries || []) })
        if (!folders.length) { const data = await mpContentApi.galleries(); folders = data.galleries || [] }
        this.sourceFolders = uniqueFolders(folders)
      } catch (error) { this.sourceFolders = [] } finally { this.sourceFoldersLoading = false }
    },
    async loadDesignLibrary() {
      this.libraryLoading = true; this.libraryError = false
      try { const data = await mpImageDesignApi.library({ page: 1, page_size: 100 }); const items = data.items || data.library_items || []; this.designLibrary = items.map((item) => normalizeImageDesignLibraryItem(item)).filter((item) => item.id) } catch (error) { this.libraryError = true } finally { this.libraryLoading = false }
    },
    async loadRemoteDrafts() {
      const cached = this.loadCachedDrafts()
      try { const data = await mpImageDesignApi.drafts(); this.applyDrafts(data.drafts || data); this.draftSyncIssue = false } catch (error) { if (cached) this.applyDrafts(cached); this.draftSyncIssue = true }
    },
    loadCachedDrafts() { try { const raw = uni.getStorageSync(DRAFT_CACHE_KEY); return raw ? JSON.parse(raw) : null } catch (error) { return null } },
    applyDrafts(received) { if (!received || typeof received !== 'object') return; this.drafts = normalizeImageDesignDrafts(received) },
    scheduleDraftSave() { if (this.draftSaveTimer) clearTimeout(this.draftSaveTimer); this.draftSaveTimer = setTimeout(() => this.persistDraftsNow(), 700) },
    async persistDraftsNow() {
      if (this.draftSaveTimer) { clearTimeout(this.draftSaveTimer); this.draftSaveTimer = null }
      try { uni.setStorageSync(DRAFT_CACHE_KEY, JSON.stringify(this.drafts)) } catch (error) {}
      try { await mpImageDesignApi.saveDrafts(this.drafts); this.draftSyncIssue = false } catch (error) { this.draftSyncIssue = true }
    },
    openPicker(slot, sourceRole) { this.pickerSlot = slot; this.pickerSourceRole = sourceRole; this.pickerVisible = true; this.pickerStage = 'folders'; this.activeFolder = null; this.folderItems = []; this.selectedFolderItem = null; this.loadSourceFolders() },
    closePicker() { this.pickerVisible = false; this.pickerStage = 'folders'; this.activeFolder = null; this.folderItems = []; this.selectedFolderItem = null },
    backToFolders() { this.pickerStage = 'folders'; this.activeFolder = null; this.folderItems = []; this.selectedFolderItem = null },
    async openFolder(folder) {
      this.activeFolder = folder; this.pickerStage = 'images'; this.folderItems = []; this.selectedFolderItem = null; this.folderItemsLoading = true
      try { const data = await mpContentApi.galleryItems(folder.id, folder.visibility || ''); this.folderItems = data.items || [] } catch (error) { uni.showToast({ title: errorMessage(error), icon: 'none' }) } finally { this.folderItemsLoading = false }
    },
    async confirmPicker() {
      if (!this.selectedFolderItem || this.pickerSaving) return
      this.pickerSaving = true
      try {
        const response = await mpImageDesignApi.addLibraryItem({ source_library_item_id: this.selectedFolderItem.id, source_role: this.pickerSourceRole, source_gallery_id: this.activeFolder ? this.activeFolder.id : '' })
        const saved = normalizeImageDesignLibraryItem(response.item || response.library_item || response, { source_item_id: this.selectedFolderItem.id, asset_id: this.selectedFolderItem.asset_id || '', file_url: imageFileUrl(this.selectedFolderItem), thumbnail_file_url: this.selectedFolderItem.thumbnail_file_url || '', file_name: this.selectedFolderItem.file_name || this.selectedFolderItem.name || '', source_role: this.pickerSourceRole })
        if (!saved.id) throw new Error('图库保存失败，请稍后重试')
        this.setImageSlot(this.pickerSlot, saved)
        if (!this.designLibrary.some((item) => item.id === saved.id)) this.designLibrary = [saved, ...this.designLibrary]
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
          if (!this.designLibrary.some((item) => item.id === saved.id)) this.designLibrary = [saved, ...this.designLibrary]
          uni.showToast({ title: '已上传并加入图库', icon: 'none' })
        } catch (error) { uni.showToast({ title: error.message || errorMessage(error), icon: 'none' }) } finally { uni.hideLoading() }
      } })
    },
    assertUploadableImage(filePath) { return new Promise((resolve, reject) => uni.getFileInfo({ filePath, success: (info) => info && info.size > MAX_UPLOAD_BYTES ? reject(new Error('单张图片不能超过 20 MB')) : resolve(), fail: () => resolve() })) },
    setImageSlot(slot, image) { this.updateDraft({ [slot]: image }) },
    previewImage(item) { const url = this.imageUrl(item); if (url) uni.previewImage({ current: url, urls: [url] }) },
    requiredRoles() { return this.workflow === 'adapt' ? ['reference', 'rough'] : this.workflow === 'transfer' ? ['reference'] : ['source'] },
    requiredRoleMissing() { return this.requiredRoles().find((role) => !this.activeDraft[role]) || '' },
    roleLabel(role) { return { source: '原房实拍图', reference: '参考效果图', rough: '毛坯实拍图' }[role] || '图片' },
    async polishDescription() {
      const description = String(this.activeDraft.description || '').trim()
      if (!description) { uni.showToast({ title: '请先填写补充描述', icon: 'none' }); return }
      const missing = this.requiredRoleMissing(); if (missing) { uni.showToast({ title: `请先选择${this.roleLabel(missing)}`, icon: 'none' }); return }
      if (this.workflow === 'redesign' && !isSupportedImageDesignStyle(this.activeDraft.style)) { uni.showToast({ title: '请选择换装风格', icon: 'none' }); return }
      this.polishing = true
      try {
        const images = this.requiredRoles().map((role) => ({ role, library_item_id: this.activeDraft[role].id }))
        const data = await mpImageDesignApi.polish({ workflow: this.workflow, description, style: imageDesignStyleForPayload(this.activeDraft.style), images, target_space: this.activeDraft.target_space || undefined, layout_type: this.activeDraft.layout_type || undefined, extra_element: this.activeDraft.extra_element || undefined })
        const polished = data.polished_prompt || data.prompt || data.result || ''; if (!polished) throw new Error('AI 未返回润色结果，请重试')
        this.updateDraft({ polished_prompt: polished, polished_for: description })
      } catch (error) { uni.showToast({ title: error.message || errorMessage(error), icon: 'none' }) } finally { this.polishing = false }
    },
    async selectSaveFolder(folder) {
      const drafts = {}
      Object.keys(this.drafts).forEach((key) => { drafts[key] = { ...this.drafts[key], save_target_id: folder.id } })
      this.drafts = drafts
      this.savePickerVisible = false
      await this.persistDraftsNow()
    },
    validateGeneration() {
      const missing = this.requiredRoleMissing(); if (missing) return `请选择${this.roleLabel(missing)}`
      if (this.workflow === 'redesign' && !isSupportedImageDesignStyle(this.activeDraft.style)) return '请选择换装风格'
      if (!String(this.activeDraft.description || '').trim()) return '请填写补充描述'
      if (!this.activeDraft.polished_prompt || this.activeDraft.polished_for !== this.activeDraft.description) return '请先完成 AI 深度润色'
      return this.activeDraft.save_target_id ? '' : '请选择保存路径'
    },
    async generateImages() {
      const validation = this.validateGeneration(); if (validation) { uni.showToast({ title: validation, icon: 'none' }); return }
      if (!draftCanGenerate(this.workflow, this.activeDraft)) { uni.showToast({ title: '生成参数尚未填写完整', icon: 'none' }); return }
      this.generating = true
      try {
        await this.persistDraftsNow(); const data = await mpImageDesignApi.createTask(buildImageDesignPayload(this.workflow, this.activeDraft)); const task = data.task || data; const id = task.id || task.task_id || task.job_id
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
      this.tasks = next; if (Object.keys(next).some((id) => this.isTaskDone(next[id]))) this.loadResults(); if (!Object.keys(next).some((id) => !this.isTaskDone(next[id]))) this.stopTaskPolling()
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
.page { min-height: 100vh; box-sizing: border-box; padding-bottom: calc(52px + env(safe-area-inset-bottom)); background: #f4f1ee; color: #282421; }
.segments { display: flex; height: 48px; margin: 14px 14px 0; overflow: hidden; border: 1px solid #be2d22; border-radius: 5px; background: #fff; }.segment { flex: 1; display: flex; align-items: center; justify-content: center; border-right: 1px solid #be2d22; color: #6e6761; font-size: 15px; }.segment:last-child { border: 0; }.segment.active { color: #fff; font-weight: 700; background: #be2d22; }.content { height: calc(100vh - 114px - env(safe-area-inset-bottom)); }
.section { margin-top: 12px; padding: 20px 18px; border-top: 1px solid #ede8e4; border-bottom: 1px solid #ede8e4; background: #fff; }.section-title { display: flex; align-items: center; color: #231f1d; font-size: 18px; font-weight: 700; }.section-title view { width: 4px; height: 23px; margin-right: 9px; background: #be2d22; }.workflow-options { display: flex; gap: 8px; margin-top: 17px; }.workflow-option { flex: 1; min-width: 0; min-height: 45px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; position: relative; border: 1px solid #8e8985; border-radius: 6px; color: #625c57; font-size: 14px; }.workflow-option.active { border-color: #be2d22; color: #fff; font-weight: 700; background: #be2d22; }.workflow-option text { position: absolute; right: 6px; bottom: 3px; font-size: 12px; }.workflow-description { display: block; margin-top: 12px; color: #5f5853; font-size: 13px; line-height: 1.6; }
.field-title { color: #201d1a; font-size: 17px; font-weight: 700; }.field-title > text { margin-right: 3px; color: #be2d22; }.field-note { display: block; margin-top: 6px; color: #817872; font-size: 12px; line-height: 1.55; }.source-actions { display: flex; gap: 14px; margin-top: 15px; }.source-actions-three { gap: 9px; }.source-folder, .source-upload { min-width: 0; flex: 1; min-height: 93px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #3b3531; font-size: 13px; }.source-folder { border: 1px solid #f0d6b1; background: #fff7e8; }.source-upload { border: 1px dashed #cfc5bd; background: #fbfaf9; }.mini-folder { position: relative; width: 54px; height: 39px; margin-bottom: 8px; border-radius: 4px 6px 6px 6px; background: #ffc238; }.mini-folder view { position: absolute; top: -6px; left: 0; width: 26px; height: 9px; border-radius: 4px 4px 0 0; background: #ffc238; }.source-upload > text:first-child { width: 31px; height: 31px; margin-bottom: 9px; border-radius: 50%; color: #be2d22; font-size: 27px; line-height: 29px; text-align: center; background: #f5e4e1; }
.selected-input { min-height: 66px; margin-top: 13px; padding: 7px 10px; box-sizing: border-box; display: flex; align-items: center; background: #f8f6f4; }.selected-input image { width: 52px; height: 52px; margin-right: 11px; background: #e5ddd7; }.selected-input view text { display: block; color: #38322e; font-size: 13px; font-weight: 700; }.selected-input view text + text { margin-top: 4px; color: #918780; font-size: 11px; font-weight: 400; }.selected-input > text { margin-left: auto; color: #be2d22; font-size: 13px; }
.chip-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 15px; }.choice-chip { min-height: 40px; padding: 0 13px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; border: 1px solid #98918b; border-radius: 5px; color: #625c57; font-size: 13px; line-height: 1.25; text-align: center; }.choice-chip.active { border-color: #be2d22; color: #fff; font-weight: 700; background: #be2d22; }.three-column .choice-chip { width: calc((100% - 20px) / 3); padding: 0 4px; }.two-column .choice-chip { width: calc((100% - 10px) / 2); padding: 0 5px; }.sub-title { margin-top: 21px; color: #292421; font-size: 16px; font-weight: 700; }
.description { width: 100%; height: 138px; margin-top: 16px; padding: 12px; box-sizing: border-box; border: 1px dashed #4f84ff; border-radius: 8px; color: #38322e; font-size: 14px; line-height: 1.55; background: #fafcff; }.description-placeholder { color: #ada9a5; }.polish-button { float: right; height: 39px; margin: 13px 0 12px; padding: 0 16px; border-radius: 20px; color: #fff; font-size: 14px; line-height: 39px; background: #be2d22; }.polish-button::after, .generate-button::after, .picker-confirm::after, .retry::after { border: 0; }.polish-result { clear: both; min-height: 87px; padding: 13px; box-sizing: border-box; border: 1px dashed #a9a29c; border-radius: 7px; background: #fafafa; }.polish-result.ready { border-color: #4f84ff; background: #f9fbff; }.polish-result text { display: block; color: #77706a; font-size: 13px; font-weight: 700; }.polish-result text + text { margin-top: 7px; color: #88817b; font-size: 12px; font-weight: 400; line-height: 1.6; white-space: pre-wrap; }.polish-result.ready text:first-child { color: #be2d22; }
.option-stack { margin-top: 14px; }.large-choice { min-height: 64px; margin-top: 12px; padding: 9px 16px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; border: 1px solid #8f8984; border-radius: 7px; color: #6a635e; font-size: 18px; line-height: 1.35; }.large-choice text + text { margin-top: 3px; font-size: 15px; }.large-choice.active { border-color: #be2d22; color: #fff; font-weight: 700; background: #be2d22; }.compact { padding-top: 18px; padding-bottom: 18px; }.two-row { display: flex; gap: 16px; margin-top: 14px; }.large-choice.inline { flex: 1; min-height: 51px; margin: 0; padding: 0 10px; align-items: center; text-align: center; }.save-target { min-height: 50px; margin-top: 14px; padding: 0 13px; display: flex; align-items: center; justify-content: space-between; border: 1px solid #b9b2ac; border-radius: 7px; color: #342e2a; font-size: 16px; background: #fff; }.save-target .placeholder { color: #8b837c; }.sync-note { display: block; margin-top: 8px; color: #aa6c34; font-size: 11px; }.generate-button { width: calc(100% - 36px); height: 55px; margin: 24px 18px 0; border-radius: 7px; color: #fff; font-size: 20px; line-height: 55px; background: #be2d22; }.generate-button[disabled] { opacity: .55; }
.gallery-heading { display: flex; align-items: baseline; justify-content: space-between; padding: 22px 18px 15px; background: #fff; }.gallery-heading text:first-child { color: #25211e; font-size: 19px; font-weight: 700; }.gallery-heading text:last-child { color: #8f867f; font-size: 12px; }.state { padding: 74px 22px; color: #8b837d; font-size: 14px; text-align: center; }.state text { display: block; }.retry { display: inline-block; margin-top: 10px; padding: 0; color: #be2d22; font-size: 14px; background: transparent; }.library-grid, .result-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; padding: 14px; }.library-image { position: relative; height: 195px; overflow: hidden; background: #e5ddd7; }.library-image image { width: 100%; height: 100%; display: block; }.library-image text { position: absolute; top: 8px; left: 8px; padding: 3px 6px; border-radius: 3px; color: #fff; font-size: 10px; background: rgba(38, 33, 30, .72); }.tasks { padding: 10px 14px 0; }.task { min-height: 45px; padding: 0 12px; display: flex; align-items: center; gap: 8px; color: #796f67; font-size: 13px; background: #fff7e8; }.task view { width: 8px; height: 8px; border-radius: 50%; background: #be2d22; animation: pulse 1.2s infinite; }.task text:last-child { margin-left: auto; color: #be2d22; }.result-card { overflow: hidden; border: 1px solid #e8e1dc; background: #fff; }.result-card image { width: 100%; height: 205px; display: block; background: #e5ddd7; }.result-time { display: block; min-height: 30px; padding: 6px 8px 0; color: #77706b; font-size: 11px; }.result-actions { min-height: 42px; padding: 0 8px 8px; display: flex; align-items: center; justify-content: space-between; }.download { display: flex; align-items: center; color: #347bf1; font-size: 12px; }.download text:first-child { margin-right: 2px; font-size: 25px; line-height: 20px; }.compare { min-width: 42px; min-height: 29px; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #fff; font-size: 12px; background: #347bf1; }.retry-line { padding: 0 8px 8px; display: flex; justify-content: space-between; color: #aa6c34; font-size: 11px; }.retry-line text:last-child { color: #be2d22; }.spacer { height: 24px; }
.layer { position: fixed; inset: 0; z-index: 50; display: flex; flex-direction: column; padding-bottom: env(safe-area-inset-bottom); background: #f4f1ee; }.layer-head { position: relative; min-height: 58px; display: flex; align-items: center; justify-content: center; border-bottom: 1px solid #ece6e1; color: #201c1a; font-size: 18px; font-weight: 700; background: #fff; }.back, .close { position: absolute; top: 0; min-height: 58px; display: flex; align-items: center; }.back { left: 17px; font-size: 37px; font-weight: 400; }.close { right: 16px; color: #766e68; font-size: 13px; font-weight: 400; }.layer-body { flex: 1; min-height: 0; }.folder-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 25px 13px; padding: 28px 18px; }.folder-card { min-width: 0; color: #38322e; font-size: 12px; text-align: center; }.folder-card text { display: block; overflow: hidden; margin-top: 10px; text-overflow: ellipsis; white-space: nowrap; }.folder-icon { position: relative; width: 78px; height: 57px; margin: 0 auto; border-radius: 4px 7px 8px 8px; background: #ffc238; }.folder-icon view { position: absolute; top: -8px; left: 0; width: 37px; height: 14px; border-radius: 5px 5px 0 0; background: #ffc238; }.breadcrumb { display: block; padding: 15px 17px 0; color: #756d67; font-size: 13px; }.picker-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; padding: 18px 15px 92px; }.picker-image { position: relative; height: 145px; border: 2px solid transparent; background: #e5ddd7; }.picker-image.selected { border-color: #347bf1; }.picker-image image { width: 100%; height: 100%; display: block; }.picker-image text { position: absolute; top: 6px; right: 6px; width: 25px; height: 25px; box-sizing: border-box; border: 2px solid #fff; border-radius: 50%; color: #fff; font-size: 15px; line-height: 21px; text-align: center; background: rgba(0, 0, 0, .17); }.picker-image.selected text { border-color: #347bf1; background: #347bf1; }.picker-confirm { position: absolute; right: 18px; bottom: calc(18px + env(safe-area-inset-bottom)); left: 18px; height: 54px; border-radius: 27px; color: #fff; font-size: 18px; line-height: 54px; background: #be2d22; }.picker-confirm[disabled] { opacity: .5; }
.save-list { padding: 12px 15px; }.save-row { min-height: 70px; margin-bottom: 10px; padding: 10px 12px; box-sizing: border-box; display: flex; align-items: center; border: 1px solid #e2dcd7; background: #fff; }.save-row.selected { border-color: #be2d22; background: #fffaf9; }.small-folder { position: relative; width: 45px; height: 34px; margin-right: 12px; border-radius: 4px 5px 5px 5px; background: #ffc238; }.small-folder view { position: absolute; top: -5px; left: 0; width: 21px; height: 7px; border-radius: 3px 3px 0 0; background: #ffc238; }.save-row > view + view text { display: block; color: #38322e; font-size: 14px; }.save-row > view + view text + text { margin-top: 5px; color: #908781; font-size: 11px; }.save-row > text { margin-left: auto; color: #fff; font-size: 14px; }.save-row.selected > text { width: 21px; height: 21px; border-radius: 50%; line-height: 21px; text-align: center; background: #be2d22; }.compare-layer { background: #f5f2ef; }.compare-list { padding: 14px; }.compare-list > view { margin-bottom: 19px; background: #fff; }.compare-list text { display: block; padding: 14px 14px 9px; color: #25211f; font-size: 16px; font-weight: 700; }.compare-list image { width: 100%; display: block; background: #e5ddd7; } @keyframes pulse { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }
</style>
