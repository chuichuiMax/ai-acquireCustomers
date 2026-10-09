<script>
import { requireInternalAccess } from './utils/internal-access'
import { getActiveGeneration, resolveAllowedShowUrl } from './utils/active-generation.mjs'
import { buildSharedCasePath, consumeCaseSystemReturn, getLastShareId, markCaseSystemHide } from './utils/share-entry.mjs'

const ENTRY_URL = '/pages/index/index'
const WORKSPACE_URL = '/pages/generate/generate'
const LOGIN_URL = '/pages/login/login'
const SHARED_CASE_ROUTE = 'pages/materials/shared-case'
const SHARE_SCENES = new Set([1007, 1008, 1044])
const ENTRY_ROUTE = 'pages/index/index'
const NORMAL_ENTRY_SCENES = new Set([1001, 1089])
const CASE_ROUTES = new Set(['pages/materials/materials', SHARED_CASE_ROUTE])

function currentRoute() {
	try {
		const pages = getCurrentPages()
		return pages.length ? pages[pages.length - 1].route : ''
	} catch (error) {
		return ''
	}
}

function openSharedCase(shareId) {
	const pages = getCurrentPages()
	const page = pages[pages.length - 1]
	if (page?.route !== SHARED_CASE_ROUTE || page.options?.shareId !== shareId) {
		uni.reLaunch({ url: buildSharedCasePath(shareId) })
	}
}

function queryValue(options, key) {
	if (options && options.query && options.query[key]) return options.query[key]
	if (options && options[key]) return options[key]
	return ''
}

function shareIdFromLaunch(options = {}) {
	const queryShareId = queryValue(options, 'shareId')
	if (queryShareId) return String(queryShareId)
	const path = String(options.path || '')
	if (!path.includes(SHARED_CASE_ROUTE)) return ''
	const query = path.split('?')[1] || ''
	return query
		.split('&')
		.map((item) => item.split('='))
		.filter(([key]) => key === 'shareId')
		.map(([, value]) => decodeURIComponent(value || ''))[0] || ''
}

function isDevtools() {
	try {
		return uni.getSystemInfoSync().platform === 'devtools'
	} catch (error) {
		return false
	}
}

function reopenEntry() {
	uni.reLaunch({ url: ENTRY_URL })
}

function checkMiniProgramUpdate() {
	// #ifdef MP-WEIXIN
	// 开发者工具编译会误报新包，applyUpdate 会导致模拟器卡死、点击无响应
	if (isDevtools()) return
	if (typeof uni.getUpdateManager !== 'function') return
	const updateManager = uni.getUpdateManager()
	if (!updateManager) return

	let restarting = false
	updateManager.onUpdateReady(() => {
		if (restarting) return
		restarting = true
		try {
			updateManager.applyUpdate()
		} catch (error) {
			reopenEntry()
		}
	})

	updateManager.onUpdateFailed(() => {
		uni.showModal({
			title: '更新失败',
			content: '新版本下载失败，请删除小程序后重新打开',
			showCancel: false
		})
	})
	// #endif
}

export default {
	data() {
		return {
			entryVersion: 0
		}
	},
	onLaunch() {
		checkMiniProgramUpdate()
	},
	onHide() {
		this.entryVersion += 1
		markCaseSystemHide()
	},
	async onShow(options = {}) {
		const entryVersion = ++this.entryVersion
		const shareId = shareIdFromLaunch(options)
		const route = currentRoute()
		const scene = Number(options.scene)
		const systemReturn = consumeCaseSystemReturn()
		// 案例图片预览、拨号返回只恢复页面，不作为重新进入小程序。
		if (systemReturn && !SHARE_SCENES.has(scene)) return
		const path = String(options.path || '').split('?')[0].replace(/^\//, '')
		const normalCaseEntry = NORMAL_ENTRY_SCENES.has(scene) && (
			CASE_ROUTES.has(route) || ((!route || route === ENTRY_ROUTE) && CASE_ROUTES.has(path))
		)
		// 普通入口可能带有上一次的分享参数；先校验身份，再决定是否回首页。
		if (shareId && !normalCaseEntry) {
			openSharedCase(shareId)
			return
		}
		if (SHARE_SCENES.has(scene) && route === SHARED_CASE_ROUTE) return

		try {
			const allowed = await requireInternalAccess({ redirect: false })
			if (entryVersion !== this.entryVersion) return
			const current = currentRoute()
			if (allowed) {
				if (normalCaseEntry && (CASE_ROUTES.has(current) || current === ENTRY_ROUTE || !current)) {
					uni.reLaunch({ url: WORKSPACE_URL })
					return
				}
				const resumeUrl = resolveAllowedShowUrl(current, getActiveGeneration())
				if (resumeUrl) {
					uni.reLaunch({ url: resumeUrl })
				} else if (current === ENTRY_ROUTE || !current) {
					uni.reLaunch({ url: WORKSPACE_URL })
				}
				return
			}

			if (normalCaseEntry && shareId) {
				openSharedCase(shareId)
				return
			}
			const lastShareId = getLastShareId()
			if (lastShareId) {
				if (current !== SHARED_CASE_ROUTE) uni.reLaunch({ url: buildSharedCasePath(lastShareId) })
				return
			}

			if (current !== 'pages/login/login') uni.reLaunch({ url: LOGIN_URL })
		} catch (error) {
			if (entryVersion !== this.entryVersion) return
			if (currentRoute() !== 'pages/login/login') uni.reLaunch({ url: LOGIN_URL })
		}
	}
}
</script>

<style>
page {
	background: #f4f1ee;
}
</style>
