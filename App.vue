<script>
import { requireInternalAccess } from './utils/internal-access'
import { buildSharedCasePath, getLastShareId } from './utils/share-entry.mjs'

const ENTRY_URL = '/pages/index/index'
const WORKSPACE_URL = '/pages/generate/generate'
const LOGIN_URL = '/pages/login/login'
const SHARED_CASE_ROUTE = 'pages/materials/shared-case'
const SHARE_SCENES = new Set([1007, 1008, 1044])

function currentRoute() {
	try {
		const pages = getCurrentPages()
		return pages.length ? pages[pages.length - 1].route : ''
	} catch (error) {
		return ''
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
		return { routingEntry: false }
	},
	onLaunch() {
		checkMiniProgramUpdate()
	},
	async onShow(options = {}) {
		// 聊天中的案例分享是最高优先级：平台用户也必须先停留在案例页。
		const shareId = shareIdFromLaunch(options)
		if (shareId || (SHARE_SCENES.has(Number(options.scene)) && currentRoute() === SHARED_CASE_ROUTE)) return
		if (this.routingEntry) return

		this.routingEntry = true
		try {
			const allowed = await requireInternalAccess({ redirect: false })
			const route = currentRoute()
			if (allowed) {
				if (route !== 'pages/generate/generate') uni.reLaunch({ url: WORKSPACE_URL })
				return
			}

			const lastShareId = getLastShareId()
			if (lastShareId) {
				if (route !== SHARED_CASE_ROUTE) uni.reLaunch({ url: buildSharedCasePath(lastShareId) })
				return
			}

			if (route !== 'pages/login/login') uni.reLaunch({ url: LOGIN_URL })
		} finally {
			this.routingEntry = false
		}
	}
}
</script>

<style>
page {
	background: #f4f1ee;
}
</style>
