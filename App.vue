<script>
const ENTRY_URL = '/pages/index/index'

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
	onLaunch() {
		checkMiniProgramUpdate()
	}
}
</script>

<style>
page {
	background: #f4f1ee;
}
</style>
