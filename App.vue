<script>
import { TOKEN_KEY } from './config'

export default {
	onLaunch() {
		const token = uni.getStorageSync(TOKEN_KEY)
		if (token) {
			uni.reLaunch({ url: '/pages/home/home' })
		}
	}
}
</script>

<style>
page {
	background: #f4f1ee;
}
</style>
