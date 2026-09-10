<script>
import { TOKEN_KEY } from './config'

function launchPath() {
	return uni.getStorageSync(TOKEN_KEY) ? '/pages/generate/generate' : '/pages/login/login'
}

function isDevtools() {
	try {
		return uni.getSystemInfoSync().platform === 'devtools'
	} catch (error) {
		return false
	}
}

function restartMiniProgram() {
	const path = launchPath()
	// #ifdef MP-WEIXIN
	if (typeof uni.restartMiniProgram === 'function') {
		uni.restartMiniProgram({
			path,
			fail: () => {
				uni.reLaunch({ url: path })
			}
		})
		return
	}
	// #endif
	uni.reLaunch({ url: path })
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
			restartMiniProgram()
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
		uni.reLaunch({ url: launchPath() })
	}
}
</script>

<style>
page {
	background: #f4f1ee;
}
</style>
