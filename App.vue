<script>
import { TOKEN_KEY } from './config'

function checkMiniProgramUpdate() {
	// #ifdef MP-WEIXIN
	if (typeof uni.getUpdateManager !== 'function') return
	const updateManager = uni.getUpdateManager()
	if (!updateManager) return

	updateManager.onUpdateReady(() => {
		updateManager.applyUpdate()
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
		const token = uni.getStorageSync(TOKEN_KEY)
		uni.reLaunch({
			url: token ? '/pages/generate/generate' : '/pages/login/login'
		})
	}
}
</script>

<style>
page {
	background: #f4f1ee;
}
</style>
