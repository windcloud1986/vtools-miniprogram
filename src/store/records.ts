import Taro from '@tarojs/taro'

export interface ParseRecord {
  id: string
  title: string
  author: string
  coverImage: string
  platform: string
  type: string
  videoUrl: string
  inputUrl: string
  time: string
}

export interface ShareRecord {
  id: string
  title: string
  coverImage: string
  platform: string
  type: string
  time: string
}

const PARSE_KEY = 'parse_records'
const SHARE_KEY = 'share_records'
const MAX_RECORDS = 100

export function getParseRecords(): ParseRecord[] {
  try {
    return Taro.getStorageSync(PARSE_KEY) || []
  } catch {
    return []
  }
}

export function addParseRecord(record: Omit<ParseRecord, 'id' | 'time'>): void {
  const records = getParseRecords()
  const newRecord: ParseRecord = {
    ...record,
    id: `pr_${Date.now()}`,
    time: new Date().toLocaleString('zh-CN'),
  }
  records.unshift(newRecord)
  if (records.length > MAX_RECORDS) records.length = MAX_RECORDS
  Taro.setStorageSync(PARSE_KEY, records)
}

export function removeParseRecord(id: string): void {
  const records = getParseRecords().filter(r => r.id !== id)
  Taro.setStorageSync(PARSE_KEY, records)
}

export function clearParseRecords(): void {
  Taro.setStorageSync(PARSE_KEY, [])
}

export function getShareRecords(): ShareRecord[] {
  try {
    return Taro.getStorageSync(SHARE_KEY) || []
  } catch {
    return []
  }
}

export function addShareRecord(record: Omit<ShareRecord, 'id' | 'time'>): void {
  const records = getShareRecords()
  const newRecord: ShareRecord = {
    ...record,
    id: `sr_${Date.now()}`,
    time: new Date().toLocaleString('zh-CN'),
  }
  records.unshift(newRecord)
  if (records.length > MAX_RECORDS) records.length = MAX_RECORDS
  Taro.setStorageSync(SHARE_KEY, records)
}

export function clearShareRecords(): void {
  Taro.setStorageSync(SHARE_KEY, [])
}
