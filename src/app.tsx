import React, { useEffect } from 'react'
import { View } from '@tarojs/components'
import './app.less'

function App(props: { children?: React.ReactNode }) {
  useEffect(() => {
    if (typeof wx !== 'undefined' && wx.cloud) {
      wx.cloud.init({ env: 'vtools-d2gur8xc22cbd5c24' })
    }
  }, [])

  return (
    <View className="app">
      {props.children}
    </View>
  )
}

export default App
