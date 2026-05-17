import { View, Text, Image } from '@tarojs/components'

interface PlatformIconProps {
  size?: number
  className?: string
}

// 抖音图标
export function DouyinIcon({ size = 20, className = '' }: PlatformIconProps) {
  return (
    <View className={className} style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <Image
        src="https://cdn-icons-png.flaticon.com/512/3669/3669986.png"
        mode="aspectFit"
        style={{ width: size, height: size }}
      />
    </View>
  )
}

// 小红书图标
export function XiaohongshuIcon({ size = 20, className = '' }: PlatformIconProps) {
  return (
    <View className={className} style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <Image
        src="https://cdn-icons-png.flaticon.com/512/5968/5968852.png"
        mode="aspectFit"
        style={{ width: size, height: size }}
      />
    </View>
  )
}
