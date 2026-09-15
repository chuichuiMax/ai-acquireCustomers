export async function evaluateInternalAccess({ token, getMe }) {
  if (!token) return { allowed: false, clearToken: false }

  try {
    const data = await getMe()
    const allowed = Boolean(data && data.employee)
    return { allowed, clearToken: !allowed }
  } catch (error) {
    return { allowed: false, clearToken: true }
  }
}
