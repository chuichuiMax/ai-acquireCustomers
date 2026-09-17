export const tabBarColors = Object.freeze({
  active: '#BE2D22',
  inactive: '#A4ADB3'
})

export const tabBarItems = Object.freeze([
  Object.freeze({ key: 'generate', path: '/pages/generate/generate', label: '生产', icon: '/static/tab-bar-icons/generate.png', activeIcon: '/static/tab-bar-icons/generate-active.png' }),
  Object.freeze({ key: 'manage', path: '/pages/manage/manage', label: '记录', icon: '/static/tab-bar-icons/manage.png', activeIcon: '/static/tab-bar-icons/manage-active.png' }),
  Object.freeze({ key: 'cover', path: '/pages/cover/cover', label: '生图', icon: '/static/tab-bar-icons/cover.png', activeIcon: '/static/tab-bar-icons/cover-active.png' }),
  Object.freeze({ key: 'materials', path: '/pages/materials/materials', label: '案例', icon: '/static/tab-bar-icons/materials.png', activeIcon: '/static/tab-bar-icons/materials-active.png' }),
  Object.freeze({ key: 'mine', path: '/pages/mine/mine', label: '我的', icon: '/static/tab-bar-icons/mine.png', activeIcon: '/static/tab-bar-icons/mine-active.png' })
])

export function resolveTabIcon(item, current) {
  return item.key === current ? item.activeIcon : item.icon
}
