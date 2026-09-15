export function resolveApiBaseUrl({ isDevelopment, platform, localBaseUrl, onlineBaseUrl }) {
  if (platform && platform !== 'devtools') return onlineBaseUrl
  return isDevelopment ? localBaseUrl : onlineBaseUrl
}
