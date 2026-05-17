import Taro from '@tarojs/taro'

export interface ParseResult {
  title: string
  videoUrl: string
  coverImage: string
  author?: string
  desc?: string
  images?: string[]
  platform?: string
  type?: string
}

// 微信云托管配置
const CLOUD_ENV = 'vtools-d2gur8xc22cbd5c24'
const SERVICE_NAME = 'vtools'

/**
 * 调用微信云托管容器
 */
function callContainer(path: string, method: string, data?: Record<string, unknown>, header?: Record<string, string>): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('请求超时，请稍后重试'))
    }, 120000)

    wx.cloud.callContainer({
      config: { env: CLOUD_ENV },
      path,
      header: {
        'X-WX-SERVICE': SERVICE_NAME,
        'Content-Type': 'application/json',
        ...header,
      },
      method,
      data,
      success: (res: { result: string | Record<string, unknown> | undefined }) => {
        console.log('[callContainer]', path, JSON.stringify(res.result))
        clearTimeout(timeoutId)
        if (!res.result) {
          reject(new Error('请求返回为空'))
          return
        }
        const parsed = typeof res.result === 'string' ? JSON.parse(res.result) : res.result
        resolve(parsed as Record<string, unknown>)
      },
      fail: (err: { errMsg: string }) => {
        clearTimeout(timeoutId)
        console.error('[callContainer fail]', path, err)
        reject(new Error(err.errMsg || '请求失败'))
      },
    })
  })
}

/**
 * 调用后端 API 解析视频
 */
export async function parseVideo(url: string): Promise<ParseResult> {
  try {
    console.log('[parseVideo] 开始请求, url:', url)
    const data = await callContainer('/api/douyin/parse', 'POST', { url }) as { code: number; msg: string; data: ParseResult }
    console.log('[parseVideo] 响应数据:', JSON.stringify(data))

    if (data.code !== 200) {
      throw new Error(data.msg || '解析失败')
    }

    if (!data.data) {
      throw new Error('解析返回数据为空')
    }

    return data.data
  } catch (error: unknown) {
    const e = error as Error
    console.error('[parseVideo] 捕获到错误:', e.message)
    throw new Error(e.message || '解析失败，请重试')
  }
}

/**
 * 登录
 */
export async function login(email: string, password: string): Promise<{ token: string; user: { id: string; email: string } }> {
  const data = await callContainer('/api/auth/login', 'POST', { email, password }) as { code: number; msg: string; data: { access_token: string; user: { id: string; email: string } } }

  if (data.code !== 200) {
    throw new Error(data.msg || '登录失败')
  }

  return {
    token: data.data.access_token,
    user: data.data.user,
  }
}

/**
 * 注册
 */
export async function register(email: string, password: string): Promise<{ token: string; user: { id: string; email: string } }> {
  const data = await callContainer('/api/auth/register', 'POST', { email, password }) as { code: number; msg: string; data: { access_token: string; user: { id: string; email: string } } }

  if (data.code !== 200) {
    throw new Error(data.msg || '注册失败')
  }

  return {
    token: data.data.access_token,
    user: data.data.user,
  }
}

/**
 * 检查登录状态
 */
export async function checkSession(): Promise<{ id: string; email: string } | null> {
  const token = Taro.getStorageSync('access_token')
  if (!token) return null

  try {
    const data = await callContainer('/api/auth/session', 'GET', undefined, { 'Authorization': `Bearer ${token}` }) as { code: number; data: { id: string; email: string } | null }
    return data.code === 200 ? data.data : null
  } catch {
    return null
  }
}

// 保存解析记录到数据库
export async function saveParseRecord(params: {
  userId: string
  title: string
  author: string
  coverImage: string
  platform: string
  type: string
  videoUrl: string
  inputUrl: string
}): Promise<void> {
  try {
    await callContainer('/api/records/parse', 'POST', params)
  } catch (err) {
    console.warn('[saveParseRecord] failed:', err)
  }
}

// 获取解析记录列表
export async function getParseRecords(userId: string, page = 1, pageSize = 20): Promise<{
  list: Array<{
    id: string
    title: string
    author: string
    cover_image: string
    platform: string
    type: string
    created_at: string
    video_url: string
    input_url: string
  }>
  total: number
}> {
  const data = await callContainer(`/api/records/parse?userId=${userId}&page=${page}&pageSize=${pageSize}`, 'GET') as { code: number; data: { list: any[]; total: number } }
  return data.code === 200 ? data.data : { list: [], total: 0 }
}

// 保存分享记录到数据库
export async function saveShareRecord(params: {
  userId: string
  title: string
  coverImage: string
  platform: string
  type: string
}): Promise<void> {
  try {
    await callContainer('/api/records/share', 'POST', params)
  } catch (err) {
    console.warn('[saveShareRecord] failed:', err)
  }
}

// 获取分享记录列表
export async function getShareRecords(userId: string, page = 1, pageSize = 20): Promise<{
  list: Array<{
    id: string
    title: string
    cover_image: string
    platform: string
    type: string
    created_at: string
  }>
  total: number
}> {
  const data = await callContainer(`/api/records/share?userId=${userId}&page=${page}&pageSize=${pageSize}`, 'GET') as { code: number; data: { list: any[]; total: number } }
  return data.code === 200 ? data.data : { list: [], total: 0 }
}
