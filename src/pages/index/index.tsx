import { useState, useEffect } from 'react'
import { View, Text, Button, Image, Video, ScrollView, Textarea } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useAuthStore } from '../../store/auth'
import { DouyinIcon, XiaohongshuIcon } from '../../components/icons/platform-icons'
import { parseVideo, login, register, saveParseRecord, type ParseResult } from '../../lib/douyin-service'
import './index.less'

// 平台配置
const PLATFORMS = [
  { id: 'douyin', name: '抖音', icon: DouyinIcon, color: '#1890ff', pattern: /douyin\.com|iesdouyin\.com/ },
  { id: 'xiaohongshu', name: '小红书', icon: XiaohongshuIcon, color: '#fe2c55', pattern: /xiaohongshu\.com|xhslink\.com/ },
]

function Index() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState<ParseResult | null>(null)
  const [parsing, setParsing] = useState(false)
  const [copyStatus, setCopyStatus] = useState<Record<string, boolean>>({})
  const [expandedDesc, setExpandedDesc] = useState(false)
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const { user, setUser, setToken, setLoading } = useAuthStore()

  // 初始化检查登录状态
  useEffect(() => {
    const token = Taro.getStorageSync('access_token')
    const userData = Taro.getStorageSync('user_info')
    if (token && userData) {
      setToken(token)
      setUser(userData)
    }
    setLoading(false)
  }, [])

  // 处理登录/注册
  const handleAuth = async () => {
    if (!authEmail.trim()) {
      setAuthError('请输入邮箱')
      return
    }
    if (!authPassword.trim()) {
      setAuthError('请输入密码')
      return
    }

    setAuthError('')
    setAuthLoading(true)

    try {
      const data = await (authMode === 'login'
        ? login(authEmail, authPassword)
        : register(authEmail, authPassword))

      const userInfo = { id: data.user.id, email: data.user.email, phone: null, nickname: null, created_at: null }
      Taro.setStorageSync('access_token', data.token)
      Taro.setStorageSync('user_info', userInfo)
      setToken(data.token)
      setUser(userInfo)
      setAuthDialogOpen(false)
      Taro.showToast({ title: authMode === 'login' ? '登录成功' : '注册成功', icon: 'success' })
      setAuthEmail('')
      setAuthPassword('')
    } catch (error: unknown) {
      const e = error as Error
      setAuthError(e.message || (authMode === 'login' ? '登录失败' : '注册失败'))
    } finally {
      setAuthLoading(false)
    }
  }

  // 退出登录
  const handleLogout = () => {
    Taro.removeStorageSync('access_token')
    Taro.removeStorageSync('refresh_token')
    Taro.removeStorageSync('user_info')
    setToken(null)
    setUser(null)
    setAuthDialogOpen(false)
    Taro.showToast({ title: '已退出登录', icon: 'none' })
  }

  // 提取URL
  const extractUrl = (text: string): string => {
    const patterns = [
      /https?:\/\/v\.douyin\.com\/[a-zA-Z0-9_-]+/,
      /https?:\/\/www\.douyin\.com\/video\/\d+/,
      /https?:\/\/www\.douyin\.com\/note\/\d+/,
      /https?:\/\/www\.xiaohongshu\.com\/discovery\/item\/[a-zA-Z0-9]+/,
      /https?:\/\/xhslink\.com\/[a-zA-Z0-9]+/,
    ]
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) return match[0]
    }
    return text.trim()
  }

  // 识别平台
  const identifyPlatform = (inputUrl: string): string => {
    for (const platform of PLATFORMS) {
      if (platform.pattern.test(inputUrl)) return platform.id
    }
    return 'unknown'
  }

  // 解析视频
  const handleParse = async () => {
    if (!url.trim()) {
      Taro.showToast({ title: '请输入链接', icon: 'none' })
      return
    }

    const extractedUrl = extractUrl(url)
    const platform = identifyPlatform(extractedUrl)

    if (platform === 'unknown') {
      Taro.showToast({ title: '暂不支持该链接，请输入抖音或小红书的分享链接', icon: 'none' })
      return
    }

    setParsing(true)
    setResult(null)

    try {
      const data = await parseVideo(extractedUrl)
      console.log('[parseVideo result]', data)
      Taro.nextTick(() => {
        const parsed = {
          title: data.title || '无标题',
          videoUrl: data.videoUrl || '',
          coverImage: data.coverImage || '',
          author: data.author || '',
          desc: data.desc || data.title || '',
          images: data.images || [],
          platform,
          type: data.type || 'video',
        }
        setResult(parsed)
        setParsing(false)
        addParseRecord({
          title: parsed.title,
          author: parsed.author,
          coverImage: parsed.coverImage,
          platform,
          type: parsed.type,
          videoUrl: parsed.videoUrl,
          inputUrl: extractedUrl,
        })
        saveParseRecord({
          userId: 'anonymous',
          title: parsed.title,
          author: parsed.author,
          coverImage: parsed.coverImage,
          platform,
          type: parsed.type,
          videoUrl: parsed.videoUrl,
          inputUrl: extractedUrl,
        })
      })
    } catch (error: unknown) {
      console.error('解析失败:', error)
      Taro.showToast({ title: '解析失败，请重试', icon: 'none' })
      setParsing(false)
    }
  }

  // 复制内容
  const handleCopy = async (text: string, key: string) => {
    try {
      await Taro.setClipboardData({ data: text })
      setCopyStatus((prev) => ({ ...prev, [key]: true }))
      Taro.showToast({ title: '复制成功', icon: 'success' })
      setTimeout(() => {
        setCopyStatus((prev) => ({ ...prev, [key]: false }))
      }, 2000)
    } catch {
      Taro.showToast({ title: '复制失败', icon: 'none' })
    }
  }

  // 下载文件
  const handleDownload = async (fileUrl: string, filename: string) => {
    if (!fileUrl) {
      Taro.showToast({ title: '下载地址无效', icon: 'none' })
      return
    }
    try {
      Taro.showLoading({ title: '下载中...' })

      const isImage = fileUrl.includes('.jpg') || fileUrl.includes('.jpeg') || fileUrl.includes('.png') || fileUrl.includes('.webp') || fileUrl.includes('douyinpic.com')

      if (isImage) {
        // 图片：走后端代理获取 base64，再写入文件保存
        const res = await callContainer('/api/douyin/image-download', 'GET', undefined, { 'url': fileUrl }) as { code: number; data: { base64: string; contentType: string } }
        if (res.code !== 200) {
          Taro.hideLoading()
          Taro.showToast({ title: '图片获取失败', icon: 'none' })
          return
        }
        const buffer = Taro.base64ToArrayBuffer(res.data.base64)
        const fileManager = Taro.getFileSystemManager()
        const tempFilePath = `${Taro.env.USER_DATA_PATH}/temp_image_${Date.now()}.jpg`
        fileManager.writeFile({
          filePath: tempFilePath,
          data: buffer as ArrayBuffer,
          encoding: 'binary',
          success: () => {
            Taro.saveImageToPhotosAlbum({
              filePath: tempFilePath,
              success: () => {
                Taro.hideLoading()
                Taro.showToast({ title: '保存成功', icon: 'success' })
                fileManager.unlink({ filePath: tempFilePath })
              },
              fail: (err) => {
                Taro.hideLoading()
                console.error('[saveImage fail]', err)
                Taro.showToast({ title: '保存失败，请检查相册权限', icon: 'none' })
              },
            })
          },
          fail: (err) => {
            Taro.hideLoading()
            console.error('[writeFile fail]', err)
            Taro.showToast({ title: '保存失败', icon: 'none' })
          },
        })
      } else {
        // 视频：尝试直接下载
        Taro.downloadFile({
          url: fileUrl,
          success: (res) => {
            if (res.statusCode === 200 && res.tempFilePath) {
              Taro.saveVideoToPhotosAlbum({
                filePath: res.tempFilePath,
                success: () => {
                  Taro.hideLoading()
                  Taro.showToast({ title: '保存成功', icon: 'success' })
                },
                fail: (err) => {
                  Taro.hideLoading()
                  console.error('[saveVideo fail]', err)
                  Taro.showToast({ title: '保存失败，请检查相册权限', icon: 'none' })
                },
              })
            } else {
              Taro.hideLoading()
              Taro.showToast({ title: '下载失败', icon: 'none' })
            }
          },
          fail: (err) => {
            Taro.hideLoading()
            console.error('[downloadFile fail]', err)
            Taro.showToast({ title: '下载失败', icon: 'none' })
          },
        })
      }
    } catch (err) {
      Taro.hideLoading()
      console.error('[handleDownload exception]', err)
      Taro.showToast({ title: '下载失败', icon: 'none' })
    }
  }

  const detectedPlatform = result?.platform
    ? PLATFORMS.find((p) => p.id === result.platform)
    : null

  return (
    <View className="page-container">
      {/* Header */}
      <View className="header">
        <View className="header-content">
          <View className="logo-area">
            <View className="logo-icon">
              <Text className="icon-video">📹</Text>
            </View>
            <View className="logo-text">
              <Text className="title">轻链素材</Text>
              <Text className="subtitle">抖音/小红书视频一键去水印下载</Text>
            </View>
          </View>
          <View className="header-actions">
            <Button className="share-btn" open-type="share">
              <Text>分享</Text>
            </Button>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView className="main-content" scrollY>
        {/* Input Card */}
        <View className="input-card">
          <View className="input-area">
            <View className="input-wrapper">
              <View className="textarea-wrapper">
                <Textarea
                  className="url-textarea"
                  placeholder="粘贴抖音/小红书分享链接到此处..."
                  value={url}
                  onInput={(e) => setUrl(e.detail.value)}
                  onConfirm={handleParse}
                  autoHeight
                  maxlength={500}
                />
                {url && (
                  <View className="clear-btn" onClick={() => setUrl('')}>
                    <Text className="clear-icon">✕</Text>
                  </View>
                )}
              </View>
            </View>

            <Button
              className={`parse-btn ${parsing ? 'loading' : ''}`}
              onClick={handleParse}
              disabled={parsing}
            >
              <Text>{parsing ? '解析中...' : '开始解析'}</Text>
            </Button>

            <Text className="hint-text">支持抖音/小红书链接解析，自动去除水印</Text>
          </View>
        </View>

        {/* Loading State */}
        {parsing && !result && (
          <View className="loading-state">
            <Text className="loading-text">正在解析，请稍候...</Text>
          </View>
        )}

        {/* Result */}
        {result && (
          <View className="result-card">
            {detectedPlatform && (
              <View className="platform-badge">
                {(() => {
                  const Icon = detectedPlatform.icon
                  return <Icon size={20} />
                })()}
                <Text className="platform-name">{detectedPlatform.name}</Text>
                <Text className="content-type">
                  {result.type === 'image_post' ? '图文' : '视频'}
                </Text>
              </View>
            )}

            {/* Video Preview */}
            {result.type !== 'image_post' && result.videoUrl && (
              <View className="video-preview">
                <Text className="section-title">视频预览</Text>
                <View className="video-container">
                  <Video
                    src={result.videoUrl}
                    controls
                    autoplay={false}
                    style={{ width: '100%', maxHeight: '360px' }}
                  />
                </View>
                <Button
                  className="download-btn"
                  onClick={() =>
                    handleDownload(result.videoUrl, `${(result.title || '视频').substring(0, 20)}.mp4`)
                  }
                >
                  <Text>下载视频</Text>
                </Button>
              </View>
            )}

            {/* Image Post */}
            {result.type === 'image_post' && (
              <View className="image-post">
                <Text className="section-title">
                  图文作品{result.images && result.images.length > 0 ? `（共${result.images.length}张）` : ''}
                </Text>
                {result.images && result.images.length > 0 ? (
                  <View className="image-grid">
                    {result.images.map((img, idx) => (
                      <View key={idx} className="image-item">
                        <Image
                          src={img}
                          mode="aspectFill"
                          className="post-image"
                          lazyLoad
                        />
                        <Button
                          className="image-download-btn"
                          onClick={() =>
                            handleDownload(img, `${(result.title || '图片').substring(0, 20)}_${idx + 1}.jpg`)
                          }
                        >
                          <Text>下载</Text>
                        </Button>
                      </View>
                    ))}
                  </View>
                ) : result.coverImage ? (
                  <View className="cover-display">
                    <Image
                      src={result.coverImage}
                      mode="aspectFill"
                      className="cover-image"
                    />
                    <Button
                      className="download-btn"
                      onClick={() =>
                        handleDownload(result.coverImage, `${(result.title || '图片').substring(0, 20)}.jpg`)
                      }
                    >
                      <Text>下载图片</Text>
                    </Button>
                  </View>
                ) : null}
              </View>
            )}

            {/* Cover Image */}
            {result.type !== 'image_post' && result.coverImage && (
              <View className="cover-section">
                <Text className="section-title">封面图</Text>
                <View className="cover-display">
                  <Image
                    src={result.coverImage}
                    mode="aspectFill"
                    className="cover-image"
                  />
                  <Button
                    className="download-btn-outline"
                    onClick={() =>
                      handleDownload(result.coverImage, `${(result.title || '封面').substring(0, 20)}.jpg`)
                    }
                  >
                    <Text>下载封面</Text>
                  </Button>
                </View>
              </View>
            )}

            {/* Title */}
            <View className="info-section">
              <Text className="section-title">标题</Text>
              <View className="info-row">
                <View className="info-content">
                  <Text className="info-text">{result.title}</Text>
                </View>
                <Button
                  className="copy-btn"
                  onClick={() => handleCopy(result.title, 'title')}
                >
                  <Text>{copyStatus.title ? '✓' : '📋'}</Text>
                </Button>
              </View>
            </View>

            {/* Author */}
            {result.author && (
              <View className="info-section">
                <Text className="section-title">作者</Text>
                <View className="info-row">
                  <View className="info-content">
                    <Text className="info-text">{result.author}</Text>
                  </View>
                  <Button
                    className="copy-btn"
                    onClick={() => handleCopy(result.author!, 'author')}
                  >
                    <Text>{copyStatus.author ? '✓' : '📋'}</Text>
                  </Button>
                </View>
              </View>
            )}

            {/* Description */}
            {result.desc && result.desc !== result.title && (
              <View className="info-section">
                <Text className="section-title">文案</Text>
                <View className="info-row">
                  <View className={`info-content ${!expandedDesc && result.desc.length > 100 ? 'line-clamp-3' : ''}`}>
                    <Text className="info-text">{result.desc}</Text>
                  </View>
                  <Button
                    className="copy-btn"
                    onClick={() => handleCopy(result.desc!, 'desc')}
                  >
                    <Text>{copyStatus.desc ? '✓' : '📋'}</Text>
                  </Button>
                </View>
                {result.desc.length > 100 && (
                  <Button className="expand-btn" onClick={() => setExpandedDesc(!expandedDesc)}>
                    <Text>{expandedDesc ? '收起' : '展开全部'}</Text>
                  </Button>
                )}
              </View>
            )}
          </View>
        )}

        {/* Empty State / How to Use */}
        {!result && !parsing && (
          <View className="guide-card">
            <Text className="guide-title">使用说明</Text>
            <View className="guide-list">
              <View className="guide-item">
                <Text className="step-num">1</Text>
                <Text className="step-text">在抖音或小红书 App 中找到想下载的内容</Text>
              </View>
              <View className="guide-item">
                <Text className="step-num">2</Text>
                <Text className="step-text">点击分享按钮，复制分享链接</Text>
              </View>
              <View className="guide-item">
                <Text className="step-num">3</Text>
                <Text className="step-text">将链接粘贴到上方输入框，点击「开始解析」</Text>
              </View>
              <View className="guide-item">
                <Text className="step-num">4</Text>
                <Text className="step-text">解析完成后可预览并下载无水印内容</Text>
              </View>
            </View>

            <View className="platforms-supported">
              <Text className="support-label">支持平台：</Text>
              {PLATFORMS.map((platform) => (
                <View
                  key={platform.id}
                  className="platform-badge-item"
                  style={{ backgroundColor: platform.color + '20', color: platform.color }}
                >
                  <platform.icon size={12} />
                  <Text className="platform-name">{platform.name}</Text>
                </View>
              ))}
            </View>

            <View className="feature-cards">
              <View className="feature-card">
                <Text className="feature-icon">📥</Text>
                <Text className="feature-title">无水印下载</Text>
                <Text className="feature-desc">解析获取无水印原画质内容</Text>
              </View>
              <View className="feature-card">
                <Text className="feature-icon">🖼️</Text>
                <Text className="feature-title">封面下载</Text>
                <Text className="feature-desc">一键下载视频/图文封面图</Text>
              </View>
              <View className="feature-card">
                <Text className="feature-icon">📋</Text>
                <Text className="feature-title">一键复制</Text>
                <Text className="feature-desc">标题、作者、文案一键复制</Text>
              </View>
            </View>
          </View>
        )}

        {/* Footer */}
        <View className="footer">
          <Text className="footer-text">温馨提示：本工具仅供学习交流使用，请勿用于商业用途</Text>
        </View>
      </ScrollView>

      {/* Auth Dialog */}
      {authDialogOpen && (
        <View className="auth-dialog-mask" onClick={() => setAuthDialogOpen(false)}>
          <View className="auth-dialog" onClick={(e) => e.stopPropagation()}>
            <View className="dialog-tabs">
              <Text
                className={`dialog-tab ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => { setAuthMode('login'); setAuthError('') }}
              >
                登录
              </Text>
              <Text
                className={`dialog-tab ${authMode === 'register' ? 'active' : ''}`}
                onClick={() => { setAuthMode('register'); setAuthError('') }}
              >
                注册
              </Text>
            </View>

            <View className="dialog-content">
              <Input
                className="dialog-input"
                placeholder="请输入邮箱"
                type="text"
                value={authEmail}
                onInput={(e) => setAuthEmail(e.detail.value)}
              />
              <Input
                className="dialog-input"
                placeholder="请输入密码"
                type="password"
                password
                value={authPassword}
                onInput={(e) => setAuthPassword(e.detail.value)}
              />
              {authError && <Text className="dialog-error">{authError}</Text>}
            </View>

            <View className="dialog-actions">
              <Button
                className="dialog-btn-primary"
                onClick={handleAuth}
                disabled={authLoading}
              >
                <Text>{authLoading ? '处理中...' : (authMode === 'login' ? '登录' : '注册')}</Text>
              </Button>
              <Button className="dialog-btn-secondary" onClick={() => setAuthDialogOpen(false)}>
                <Text>取消</Text>
              </Button>
            </View>

            {user && (
              <View className="dialog-footer">
                <Button className="logout-btn" onClick={handleLogout}>
                  <Text>退出登录</Text>
                </Button>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  )
}

// 分享配置
Index.onShareAppMessage = () => ({
  title: '轻链素材 - 抖音/小红书视频去水印下载',
  path: '/pages/index/index',
  imageUrl: '',
})

Index.onShareTimeline = () => ({
  title: '轻链素材 - 抖音/小红书视频去水印下载',
  query: '',
})

export default Index
