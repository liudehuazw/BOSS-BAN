import type { ParsedCompanyInfo } from '../types/company-info'
import type {
  AddResponseData,
  BlacklistResult,
  SuggestCompanyItem,
  SuggestResponseData,
  UnblockResponseData,
  ZhipinApiResponse,
} from '../types/zhipin-api'

const SUGGEST_URL = 'https://www.zhipin.com/wapi/zpgeek/maskcompany/suggest.json'
const ADD_URL = 'https://www.zhipin.com/wapi/zpgeek/maskcompany/add.json'
const UNBLOCK_URL = 'https://www.zhipin.com/wapi/zpgeek/maskcompany/unblock.json'

function getCookieValue(name: string): string {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : ''
}

function getZpToken(): string {
  return getCookieValue('bst') || getCookieValue('geek_zp_token')
}

function buildHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    accept: 'application/json, text/plain, */*',
    'x-requested-with': 'XMLHttpRequest',
  }

  const zpToken = getZpToken()
  if (zpToken) headers.zp_token = zpToken

  const pageWindow = window as Window & {
    _PAGE?: { token?: string }
  }
  const pageToken = pageWindow._PAGE?.token?.split('|')[0]
  if (pageToken) headers.token = pageToken

  return headers
}

function appendCacheBuster(url: string): string {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}_=${Date.now()}`
}

async function fetchJson<T>(url: string): Promise<ZhipinApiResponse<T>> {
  const response = await fetch(appendCacheBuster(url), {
    method: 'GET',
    credentials: 'include',
    headers: buildHeaders(),
  })

  if (!response.ok) {
    throw new Error(`请求失败（HTTP ${response.status}）`)
  }

  return response.json() as Promise<ZhipinApiResponse<T>>
}

async function fetchPostJson<T>(url: string, body: URLSearchParams): Promise<ZhipinApiResponse<T>> {
  const response = await fetch(appendCacheBuster(url), {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...Object.fromEntries(Object.entries(buildHeaders() as Record<string, string>)),
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (!response.ok) {
    throw new Error(`请求失败（HTTP ${response.status}）`)
  }

  return response.json() as Promise<ZhipinApiResponse<T>>
}

function resolveLoginError(code: number, message: string): string | null {
  if (code === 37 || /登录|login/i.test(message)) {
    return '请先登录 BOSS 直聘后再试'
  }

  return null
}

function isCompanyAlreadyBlocked(item: SuggestCompanyItem): boolean {
  return item.mark === 1
}

function pickMatchedItem({
  suggestList,
  searchNames,
  encryptComId,
}: {
  suggestList: SuggestCompanyItem[]
  searchNames: string[]
  encryptComId: string | null
}): SuggestCompanyItem | null {
  if (suggestList.length === 0) return null

  if (encryptComId) {
    const byId = suggestList.find((item) => item.encryptComId === encryptComId)
    if (byId) return byId
  }

  for (const searchName of searchNames) {
    const byName = suggestList.find((item) => item.company.name === searchName)
    if (byName) return byName
  }

  return suggestList[0]
}

function buildFallbackItem(companyInfo: ParsedCompanyInfo): SuggestCompanyItem | null {
  if (!companyInfo.encryptComId || !companyInfo.name) return null

  return {
    company: {
      name: companyInfo.name,
      code: '',
      hlname: companyInfo.name,
      highlightList: [],
      itemType: 0,
    },
    desc: null,
    comId: 0,
    mark: 0,
    markType: 1,
    source: 0,
    encryptComId: companyInfo.encryptComId,
  }
}

async function fetchSuggestList(query: string): Promise<SuggestCompanyItem[]> {
  const suggestUrl = `${SUGGEST_URL}?query=${encodeURIComponent(query)}`
  const suggestResponse = await fetchJson<SuggestResponseData>(suggestUrl)

  const loginError = resolveLoginError(suggestResponse.code, suggestResponse.message)
  if (loginError) {
    throw new Error(loginError)
  }

  if (suggestResponse.code !== 0 || suggestResponse.message !== 'Success') {
    throw new Error(suggestResponse.message || '搜索公司失败，请稍后重试')
  }

  return suggestResponse.zpData?.suggestList ?? []
}

async function resolveCompanyItem(companyInfo: ParsedCompanyInfo): Promise<SuggestCompanyItem | null> {
  const queries = [...companyInfo.searchNames]
  if (companyInfo.encryptComId) {
    queries.push(companyInfo.encryptComId)
  }

  const uniqueQueries = [...new Set(queries.filter(Boolean))]

  for (const query of uniqueQueries) {
    const suggestList = await fetchSuggestList(query)
    const matchedItem = pickMatchedItem({
      suggestList,
      searchNames: companyInfo.searchNames,
      encryptComId: companyInfo.encryptComId,
    })
    if (matchedItem) return matchedItem
  }

  return buildFallbackItem(companyInfo)
}

function buildAlreadyBlockedResult(companyName: string): BlacklistResult {
  return {
    success: false,
    message: '该公司已在黑名单中',
    companyName,
    alreadyBlocked: true,
  }
}

function buildNotBlockedResult(companyName: string): BlacklistResult {
  return {
    success: false,
    message: '该公司不在黑名单中',
    companyName,
    notBlocked: true,
  }
}

export async function checkCompanyBlacklistStatus(
  companyInfo: ParsedCompanyInfo,
): Promise<Pick<BlacklistResult, 'alreadyBlocked' | 'companyName'>> {
  try {
    const matchedItem = await resolveCompanyItem(companyInfo)
    if (!matchedItem) return { alreadyBlocked: false }

    return {
      alreadyBlocked: isCompanyAlreadyBlocked(matchedItem),
      companyName: matchedItem.company.name || companyInfo.name,
    }
  } catch {
    return { alreadyBlocked: false }
  }
}

function resolveDuplicateError(message: string): string | null {
  if (/已屏蔽|已在|重复|exist/i.test(message)) {
    return '该公司已在黑名单中'
  }

  return null
}

export async function addCompanyToBlacklist(
  companyInfo: ParsedCompanyInfo,
): Promise<BlacklistResult> {
  try {
    const matchedItem = await resolveCompanyItem(companyInfo)
    if (!matchedItem) {
      return {
        success: false,
        message: '未找到该公司，请手动确认名称后重试',
      }
    }

    const encryptComId = matchedItem.encryptComId
    const resolvedName = matchedItem.company.name || companyInfo.name

    if (isCompanyAlreadyBlocked(matchedItem)) {
      return buildAlreadyBlockedResult(resolvedName)
    }

    const addParams = new URLSearchParams({
      comIds: encryptComId,
      checkall: '1',
      totalCount: '1',
      name: resolvedName,
    })

    const addResponse = await fetchJson<AddResponseData>(`${ADD_URL}?${addParams.toString()}`)

    const addLoginError = resolveLoginError(addResponse.code, addResponse.message)
    if (addLoginError) {
      return { success: false, message: addLoginError }
    }

    const duplicateError = resolveDuplicateError(addResponse.message)
    if (duplicateError) {
      return {
        success: false,
        message: duplicateError,
        companyName: resolvedName,
        alreadyBlocked: true,
      }
    }

    if (addResponse.code !== 0 || addResponse.message !== 'Success') {
      return {
        success: false,
        message: addResponse.message || '加入黑名单失败，请稍后重试',
      }
    }

    if (!addResponse.zpData?.result) {
      return {
        success: false,
        message: '加入黑名单失败，请稍后重试',
      }
    }

    return {
      success: true,
      message: `已成功加入黑名单：${resolvedName}`,
      companyName: resolvedName,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '网络异常，请检查网络后重试'
    return { success: false, message }
  }
}

export async function removeCompanyFromBlacklist(
  companyInfo: ParsedCompanyInfo,
): Promise<BlacklistResult> {
  try {
    const matchedItem = await resolveCompanyItem(companyInfo)
    if (!matchedItem) {
      return {
        success: false,
        message: '未找到该公司，请手动确认名称后重试',
      }
    }

    const encryptComId = matchedItem.encryptComId
    const resolvedName = matchedItem.company.name || companyInfo.name

    if (!isCompanyAlreadyBlocked(matchedItem)) {
      return buildNotBlockedResult(resolvedName)
    }

    const unblockParams = new URLSearchParams({
      comId: encryptComId,
    })

    const unblockResponse = await fetchPostJson<UnblockResponseData>(UNBLOCK_URL, unblockParams)

    const unblockLoginError = resolveLoginError(unblockResponse.code, unblockResponse.message)
    if (unblockLoginError) {
      return { success: false, message: unblockLoginError }
    }

    if (unblockResponse.code !== 0 || unblockResponse.message !== 'Success') {
      return {
        success: false,
        message: unblockResponse.message || '移出黑名单失败，请稍后重试',
      }
    }

    return {
      success: true,
      message: `已成功移出黑名单：${resolvedName}`,
      companyName: resolvedName,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '网络异常，请检查网络后重试'
    return { success: false, message }
  }
}
