export function resolveApiBaseUrl({
  isDevelopment,
  platform,
  localBaseUrl,
  onlineBaseUrl,
  useTestServer = false,
  testBaseUrl = '',
  /** 真机 uploadFile 须 HTTPS 且在微信 uploadFile 合法域名内；开发者工具仍可用 testBaseUrl */
  testDeviceBaseUrl = ''
}) {
  if (useTestServer) {
    if (platform && platform !== 'devtools') {
      return testDeviceBaseUrl || onlineBaseUrl || testBaseUrl
    }
    if (testBaseUrl) return testBaseUrl
  }
  if (platform && platform !== 'devtools') return onlineBaseUrl
  return isDevelopment ? localBaseUrl : onlineBaseUrl
}
