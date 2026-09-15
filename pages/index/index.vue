<template>
	<view class="entry-page">
		<image class="logo" src="/static/hirun-logo.png" mode="aspectFit" />
		<text class="title">正在验证员工身份…</text>
	</view>
</template>

<script>
	import { enterInternalWorkspace } from '../../utils/internal-access'

	export default {
		onLoad() {
			enterInternalWorkspace()
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
