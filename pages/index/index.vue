<template>
	<view class="entry-page">
		<image class="logo" src="/static/hirun-logo.png" mode="aspectFit" />
		<text class="title">正在验证员工身份…</text>
	</view>
</template>

<script>
	import { LOGIN_PATH } from '../../utils/internal-access'

	export default {
		data() {
			return {
				leaveWatchdog: null
			}
		},
		onShow() {
			// App.onShow 负责正常分流；这里只做兜底，避免一直停在验证文案。
			this.clearLeaveWatchdog()
			this.leaveWatchdog = setTimeout(() => {
				try {
					const pages = getCurrentPages()
					const route = pages.length ? pages[pages.length - 1].route : ''
					if (route === 'pages/index/index') {
						uni.reLaunch({ url: LOGIN_PATH })
					}
				} catch (error) {
					uni.reLaunch({ url: LOGIN_PATH })
				}
			}, 9000)
		},
		onHide() {
			this.clearLeaveWatchdog()
		},
		onUnload() {
			this.clearLeaveWatchdog()
		},
		methods: {
			clearLeaveWatchdog() {
				if (this.leaveWatchdog) {
					clearTimeout(this.leaveWatchdog)
					this.leaveWatchdog = null
				}
			}
		}
	}
</script>

<style>
	.entry-page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: #fff;
	}

	.logo {
		width: 220px;
		height: 72px;
		margin-bottom: 18px;
	}

	.title {
		font-size: 14px;
		color: #8a817c;
	}
</style>
