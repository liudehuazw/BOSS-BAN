export interface ZhipinApiResponse<T> {
  code: number
  message: string
  zpData: T
}

export interface SuggestCompanyItem {
  company: {
    name: string
    code: string
    hlname: string
    highlightList: Array<{ startIndex: number; endIndex: number }>
    itemType: number
  }
  desc: string | null
  comId: number
  mark: number
  markType: number
  source: number
  encryptComId: string
}

export interface SuggestResponseData {
  totalCount: number
  suggestList: SuggestCompanyItem[]
}

export interface AddResponseData {
  result: boolean
}

export interface UnblockResponseData {
  encryptKey?: string
}

export interface BlacklistResult {
  success: boolean
  message: string
  companyName?: string
  alreadyBlocked?: boolean
  notBlocked?: boolean
}

export type { ParsedCompanyInfo } from './company-info'
