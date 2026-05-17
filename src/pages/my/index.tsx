import { useState, useEffect } from 'react'
import { View, Text, Button, Image, Input, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useAuthStore } from '../../store/auth'
import { getParseRecords, getShareRecords, clearParseRecords, clearShareRecords, addShareRecord, type ParseRecord, type ShareRecord } from '../../store/records'
import { saveShareRecord as apiSaveShare, getParseRecords as apiGetParse, getShareRecords as apiGetShare } from '../../lib/douyin-service'
import './index.less'

export default function My() {
  const { user, setUser, setToken } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [nickname, setNickname] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [activeTab, setActiveTab] = useState<'parse' | 'share'>('parse')
  const [parseRecords, setParseRecords] = useState<ParseRecord[]>([])
  const [shareRecords, setShareRecords] = useState<ShareRecord[]>([])
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const isGuest = !user

  useEffect(() => {
    if (user) {
      setNickname(user.nickname || user.email?.split('@')[0] || '用户')
      setAvatarUrl('')
    } else {
      setNickname('游客')
      setAvatarUrl('')
    }
  }, [user])

  useEffect(() => {
    const loadRecords = async () => {
      // 从本地存储读取（离线缓存）
      const localParse = getParseRecords()
      const localShare = getShareRecords()

      // 从云端获取最新数据
      try {
        const cloudParse = await apiGetParse('anonymous')
        if (cloudParse.list.length > 0) {
          const merged = [...cloudParse.list.map(r => ({
            id: r.id,
            title: r.title,
            author: r.author,
            coverImage: r.cover_image,
            platform: r.platform,
            type: r.type,
            videoUrl: r.video_url,
            inputUrl: r.input_url,
            time: new Date(r.created_at).toLocaleString('zh-CN'),
          }))]
          setParseRecords(merged)
        } else {
          setParseRecords(localParse)
        }
      } catch {
        setParseRecords(localParse)
      }

      try {
        const cloudShare = await apiGetShare('anonymous')
        if (cloudShare.list.length > 0) {
          const merged = cloudShare.list.map(r => ({
            id: r.id,
            title: r.title,
            coverImage: r.cover_image,
            platform: r.platform,
            type: r.type,
            time: new Date(r.created_at).toLocaleString('zh-CN'),
          }))
          setShareRecords(merged)
        } else {
          setShareRecords(localShare)
        }
      } catch {
        setShareRecords(localShare)
      }
    }
    loadRecords()
  }, [activeTab])

  // 微信一键登录
  const handleWxLogin = async () => {
    try {
      const res = await Taro.getUserProfile({
        desc: '用于完善个人资料',
        lang: 'zh_CN',
      })

      if (res.userInfo) {
        const userInfo = {
          id: user?.id || `wx_${Date.now()}`,
          email: user?.email || null,
          phone: null,
          nickname: res.userInfo.nickName,
          created_at: null,
        }
        setAvatarUrl(res.userInfo.avatarUrl)
        setNickname(res.userInfo.nickName)
        setUser(userInfo)
        Taro.setStorageSync('user_info', userInfo)
        Taro.showToast({ title: '登录成功', icon: 'success' })
      }
    } catch (err) {
      console.error('微信登录失败:', err)
      Taro.showModal({
        title: '提示',
        content: '微信登录需要使用真实AppID，在开发者工具中可体验为游客模式',
        showCancel: false,
      })
    }
  }

  // 编辑昵称
  const handleEditNickname = () => {
    if (!nickname.trim()) {
      Taro.showToast({ title: '昵称不能为空', icon: 'none' })
      return
    }

    const userInfo = {
      ...user,
      nickname: nickname.trim(),
      phone: user?.phone || null,
      email: user?.email || null,
      created_at: user?.created_at || null,
    }
    setUser(userInfo)
    Taro.setStorageSync('user_info', userInfo)
    setIsEditing(false)
    Taro.showToast({ title: '修改成功', icon: 'success' })
  }

  // 选择头像
  const handleChooseAvatar = () => {
    Taro.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        if (res.tempFilePaths && res.tempFilePaths[0]) {
          const tempFilePath = res.tempFilePaths[0]
          setAvatarUrl(tempFilePath)
          const userInfo = {
            ...user,
            avatar: tempFilePath,
            nickname: nickname || user?.nickname || '用户',
          }
          setUser(userInfo)
          Taro.setStorageSync('user_info', userInfo)
        }
      },
      fail: (err) => {
        console.error('选择头像失败:', err)
        if (err.errMsg?.includes('cancel')) return
        Taro.showToast({ title: '选择失败', icon: 'none' })
      },
    })
  }

  // 退出登录
  const handleLogout = () => {
    Taro.removeStorageSync('access_token')
    Taro.removeStorageSync('refresh_token')
    Taro.removeStorageSync('user_info')
    setToken(null)
    setUser(null)
    setNickname('游客')
    setAvatarUrl('')
    Taro.showToast({ title: '已退出登录', icon: 'none' })
  }

  // 分享解析记录
  const handleShare = (record: ParseRecord) => {
    // 保存到本地
    addShareRecord({
      title: record.title,
      coverImage: record.coverImage,
      platform: record.platform,
      type: record.type,
    })
    // 保存到云端数据库
    apiSaveShare({
      userId: 'anonymous',
      title: record.title,
      coverImage: record.coverImage,
      platform: record.platform,
      type: record.type,
    })
    setShareRecords(getShareRecords())
    Taro.showToast({ title: '已添加到分享记录', icon: 'success' })
  }

  // 清空记录
  const handleClear = () => {
    if (activeTab === 'parse') {
      clearParseRecords()
      setParseRecords([])
    } else {
      clearShareRecords()
      setShareRecords([])
    }
    setShowClearConfirm(false)
    Taro.showToast({ title: '已清空', icon: 'success' })
  }

  // 默认头像
  const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0NSIgZmlsbD0iI2Y1ZjVmNSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iMzUiIHI9IjE4IiBmaWxsPSIjYmRiZGJkIi8+PC9zdmc+'

  const currentRecords = activeTab === 'parse' ? parseRecords : shareRecords

  // 平台标签
  const platformLabel = (p: string) => {
    if (p === 'douyin') return '抖音'
    if (p === 'xiaohongshu') return '小红书'
    return p
  }

  return (
    <View className="my-page">
      {/* Header */}
      <View className="profile-header">
        <View className="avatar-section">
          <View className="avatar-wrapper" onClick={handleChooseAvatar}>
            <Image
              className="avatar-img"
              src={avatarUrl || defaultAvatar}
              mode="aspectFill"
            />
            <View className="avatar-edit-icon">✎</View>
          </View>
        </View>

        <View className="user-info">
          {isEditing ? (
            <View className="edit-nickname">
              <Input
                className="nickname-input"
                value={nickname}
                onInput={(e) => setNickname(e.detail.value)}
                placeholder="请输入昵称"
                maxlength={20}
              />
              <View className="edit-actions">
                <Button className="edit-btn cancel" onClick={() => setIsEditing(false)}>
                  <Text>取消</Text>
                </Button>
                <Button className="edit-btn confirm" onClick={handleEditNickname}>
                  <Text>确定</Text>
                </Button>
              </View>
            </View>
          ) : (
            <View className="nickname-row" onClick={() => isGuest ? handleWxLogin() : setIsEditing(true)}>
              <Text className="nickname">{nickname || '游客'}</Text>
              {!isGuest && <Text className="edit-hint">✎</Text>}
            </View>
          )}

          <View className="user-badge">
            <View className={`badge ${isGuest ? 'guest' : 'normal'}`}>
              <Text>{isGuest ? '游客' : '普通用户'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Login Button for Guest */}
      {isGuest && (
        <View className="login-section">
          <Button className="login-btn primary" onClick={handleWxLogin}>
            <Text>微信一键登录</Text>
          </Button>
        </View>
      )}

      {/* Records Section */}
      <View className="records-section">
        <View className="records-tabs">
          <View
            className={`records-tab ${activeTab === 'parse' ? 'active' : ''}`}
            onClick={() => setActiveTab('parse')}
          >
            <Text>解析记录</Text>
          </View>
          <View
            className={`records-tab ${activeTab === 'share' ? 'active' : ''}`}
            onClick={() => setActiveTab('share')}
          >
            <Text>我的分享</Text>
          </View>
        </View>

        {/* Records Header */}
        <View className="records-header">
          <Text className="records-count">共 {currentRecords.length} 条</Text>
          {currentRecords.length > 0 && (
            <View className="records-actions">
              <Text className="clear-btn" onClick={() => setShowClearConfirm(true)}>清空</Text>
            </View>
          )}
        </View>

        {/* Records List */}
        <ScrollView className="records-list" scrollY>
          {currentRecords.length === 0 ? (
            <View className="records-empty">
              <Text className="empty-icon">{activeTab === 'parse' ? '📋' : '🔗'}</Text>
              <Text className="empty-text">
                {activeTab === 'parse' ? '暂无解析记录' : '暂无分享记录'}
              </Text>
            </View>
          ) : (
            currentRecords.map((record) => (
              <View key={record.id} className="record-item">
                {record.coverImage && (
                  <Image
                    className="record-cover"
                    src={record.coverImage}
                    mode="aspectFill"
                  />
                )}
                {!record.coverImage && (
                  <View className="record-cover-placeholder">
                    <Text>{record.type === 'image_post' ? '🖼️' : '🎬'}</Text>
                  </View>
                )}
                <View className="record-info">
                  <Text className="record-title">{(record as ParseRecord).title || record.title}</Text>
                  <View className="record-meta">
                    <View className="record-platform-tag">
                      <Text className="platform-tag-text">{platformLabel(record.platform)}</Text>
                    </View>
                    <Text className="record-type">{record.type === 'image_post' ? '图文' : '视频'}</Text>
                    <Text className="record-time">{record.time}</Text>
                  </View>
                </View>
                {activeTab === 'parse' && (
                  <View className="record-share-btn" onClick={() => handleShare(record as ParseRecord)}>
                    <Text>分享</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Menu List */}
      <View className="menu-list">
        <View className="menu-item" onClick={() => !user && handleWxLogin()}>
          <Text className="menu-icon">⚙️</Text>
          <Text className="menu-text">设置</Text>
          <Text className="menu-arrow">›</Text>
        </View>
      </View>

      {/* Footer */}
      {user && (
        <View className="logout-section">
          <Button className="logout-btn" onClick={handleLogout}>
            <Text>退出登录</Text>
          </Button>
        </View>
      )}

      <View className="footer">
        <Text className="footer-text">秒解析 v1.0.0</Text>
      </View>

      {/* Clear Confirm Dialog */}
      {showClearConfirm && (
        <View className="dialog-mask" onClick={() => setShowClearConfirm(false)}>
          <View className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <Text className="confirm-title">确认清空</Text>
            <Text className="confirm-text">
              确定要清空{activeTab === 'parse' ? '解析' : '分享'}记录吗？此操作不可恢复。
            </Text>
            <View className="confirm-actions">
              <Button className="confirm-btn cancel" onClick={() => setShowClearConfirm(false)}>
                <Text>取消</Text>
              </Button>
              <Button className="confirm-btn danger" onClick={handleClear}>
                <Text>清空</Text>
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
