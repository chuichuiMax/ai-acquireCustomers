<script>
import { safeReLaunch } from './utils/safe-navigation'
import { requireInternalAccess } from './utils/internal-access'
import { errorMessage } from './utils/request'
import { getActiveGeneration, resolveAllowedShowUrl } from './utils/active-generation.mjs'
import {
  buildSharedCasePath,
  caseEntryOptions,
  isCaseSystemReturn,
  getLastShareId,
  markCaseSystemHide,
  ENTRY_ROUTE,
  SHARED_CASE_ROUTE,
  SHARE_SCENES,
  NORMAL_ENTRY_SCENES,
  CASE_ROUTES,
  shouldHonorLaunchShareId,
  shouldRestoreLastShare,
  normalizeLaunchPath
} from './utils/share-entry.mjs'

const ENTRY_URL = '/pages/index/index'
const WORKSPACE_URL = '/pages/generate/generate'
const LOGIN_URL = '/pages/login/login'

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
		safeReLaunch(buildSharedCasePath(shareId))
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
	safeReLaunch(ENTRY_URL)
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
		const systemReturn = isCaseSystemReturn(route)
		const bookingEntry = caseEntryOptions(options)
		const path = normalizeLaunchPath(options.path)
		// 原生授权、图片预览和拨号返回优先恢复原页，不能重放上次的预约入口。
		if (systemReturn && !SHARE_SCENES.has(scene)) return
		// 扫码和网页打开同样是公开访客入口，交给目标页解析，避免先走员工登录。
		if (!NORMAL_ENTRY_SCENES.has(scene) && bookingEntry.entryCode) {
			if (path !== SHARED_CASE_ROUTE) safeReLaunch(`/pages/materials/shared-case?entryCode=${encodeURIComponent(bookingEntry.entryCode)}&booking=${bookingEntry.booking ? '1' : '0'}`)
			return
		}
		const normalCaseEntry = NORMAL_ENTRY_SCENES.has(scene) && (
			CASE_ROUTES.has(route) || ((!route || route === ENTRY_ROUTE) && CASE_ROUTES.has(path))
		)
		// 分享卡片仍直达案例；桌面图标冷启动忽略残留 shareId，避免默认打开案例分享。
		if (shouldHonorLaunchShareId({ scene, route, path: options.path, shareId, normalCaseEntry })) {
			// 微信会打开启动参数中的目标页；页面栈尚未就绪时不能再次 reLaunch。
			if (path !== SHARED_CASE_ROUTE) openSharedCase(shareId)
			return
		}
		if (SHARE_SCENES.has(scene) && route === SHARED_CASE_ROUTE) return

		try {
			const allowed = await requireInternalAccess({ redirect: false })
			if (entryVersion !== this.entryVersion) return
			const current = currentRoute()
			if (allowed) {
				// 从客资详情回看来源案例，保留页面栈和返回位置。
				if (current === SHARED_CASE_ROUTE && getCurrentPages().some(page => page.route === 'pages/mine/lead-detail')) return
				if (normalCaseEntry && (CASE_ROUTES.has(current) || current === ENTRY_ROUTE || !current)) {
					safeReLaunch(WORKSPACE_URL)
					return
				}
				const resumeUrl = resolveAllowedShowUrl(current, getActiveGeneration())
				if (resumeUrl) {
					safeReLaunch(resumeUrl)
				} else if (current === ENTRY_ROUTE || !current) {
					safeReLaunch(WORKSPACE_URL)
				}
				return
			}

			if (normalCaseEntry && shareId) {
				openSharedCase(shareId)
				return
			}
			const lastShareId = getLastShareId()
			if (shouldRestoreLastShare({ scene, route: current, path: options.path, lastShareId })) {
				if (current !== SHARED_CASE_ROUTE) safeReLaunch(buildSharedCasePath(lastShareId))
				return
			}

			if (current !== 'pages/login/login') safeReLaunch(LOGIN_URL)
		} catch (error) {
			if (entryVersion !== this.entryVersion) return
			if (error.code !== 'INTERNAL_ACCESS_STALE') {
				uni.showToast({ title: errorMessage(error), icon: 'none' })
			}
		}
	}
}
</script>

<style>
page {
	background: #f4f1ee;
}
</style>
