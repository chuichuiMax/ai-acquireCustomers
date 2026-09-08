<script>
import { TOKEN_KEY } from './config'

export default {
	onLaunch() {
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
