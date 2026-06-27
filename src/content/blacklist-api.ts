import type {
  AddResponseData,
  BlacklistResult,
  SuggestResponseData,
  ZhipinApiResponse,
} from '../types/zhipin-api'

const SUGGEST_URL = 'https://www.zhipin.com/wapi/zpgeek/maskcompany/suggest.json'
const ADD_URL = 'https://www.zhipin.com/wapi/zpgeek/maskcompany/add.json'

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

function resolveLoginError(code: number, message: string): string | null {
  if (code === 37 || /登录|login/i.test(message)) {
    return '请先登录 BOSS 直聘后再试'
  }

  return null
}

function resolveDuplicateError(message: string): string | null {
  if (/已屏蔽|已在|重复|exist/i.test(message)) {
    return '该公司已在黑名单中'
  }

  return null
}

export async function addCompanyToBlacklist(companyName: string): Promise<BlacklistResult> {
  try {
    const suggestUrl = `${SUGGEST_URL}?query=${encodeURIComponent(companyName)}`
    const suggestResponse = await fetchJson<SuggestResponseData>(suggestUrl)

    const loginError = resolveLoginError(suggestResponse.code, suggestResponse.message)
    if (loginError) {
      return { success: false, message: loginError }
    }

    if (suggestResponse.code !== 0 || suggestResponse.message !== 'Success') {
      return {
        success: false,
        message: suggestResponse.message || '搜索公司失败，请稍后重试',
      }
    }

    const suggestList = suggestResponse.zpData?.suggestList ?? []
    if (suggestList.length === 0) {
      return {
        success: false,
        message: '未找到该公司，请手动确认名称后重试',
      }
    }

    const matchedItem =
      suggestList.find((item) => item.company.name === companyName) ?? suggestList[0]
    const encryptComId = matchedItem.encryptComId
    const resolvedName = matchedItem.company.name || companyName
    const totalCount = suggestResponse.zpData.totalCount ?? suggestList.length

    const addParams = new URLSearchParams({
      comIds: encryptComId,
      checkall: '1',
      totalCount: String(totalCount),
      name: resolvedName,
    })

    const addResponse = await fetchJson<AddResponseData>(`${ADD_URL}?${addParams.toString()}`)

    const addLoginError = resolveLoginError(addResponse.code, addResponse.message)
    if (addLoginError) {
      return { success: false, message: addLoginError }
    }

    const duplicateError = resolveDuplicateError(addResponse.message)
    if (duplicateError) {
      return { success: false, message: duplicateError, companyName: resolvedName }
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
