<template>
	<view class="entry-page">
		<image class="logo" src="/static/hirun-logo.png" mode="aspectFit" />
		<text class="title">{{ stuckHint ? '验证较慢，请完全关闭小程序后重试' : '正在验证员工身份…' }}</text>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				stuckHint: false,
				stuckTimer: null
			}
		},
		onShow() {
			// 路由由 App.onShow 统一处理；此处仅提示，避免与 App 并发 reLaunch 触发 timeout。
			this.stuckHint = false
			if (this.stuckTimer) clearTimeout(this.stuckTimer)
			this.stuckTimer = setTimeout(() => {
				try {
					const pages = getCurrentPages()
					const route = pages.length ? pages[pages.length - 1].route : ''
					if (route === 'pages/index/index') this.stuckHint = true
				} catch (error) {
					this.stuckHint = true
				}
			}, 12000)
		},
		onHide() {
			if (this.stuckTimer) {
				clearTimeout(this.stuckTimer)
				this.stuckTimer = null
			}
		},
		onUnload() {
			if (this.stuckTimer) {
				clearTimeout(this.stuckTimer)
				this.stuckTimer = null
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
