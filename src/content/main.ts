import { addCompanyToBlacklist, checkCompanyBlacklistStatus } from './blacklist-api'
import { isCompanyProfilePage, parseCompanyInfo } from './company-parser'
import {
  findBlockButtonAnchor,
  mountFloatButton,
  removeExistingFloatButton,
  type FloatButtonController,
} from './float-button'
import { showToast } from './toast'

const ROOT_ATTR = 'data-boss-ban-mounted'
let buttonController: FloatButtonController | null = null
let currentPageKey = ''

function getPageKey(): string {
  return `${window.location.pathname}${window.location.search}`
}

async function handleBlacklistClick(): Promise<void> {
  const companyInfo = parseCompanyInfo()
  if (!companyInfo?.name) {
    showToast({ type: 'error', message: '未能识别当前公司名称，请刷新页面后重试' })
    return
  }

  const result = await addCompanyToBlacklist(companyInfo.name)

  if (result.success) {
    buttonController?.setBlocked(true)
  } else if (result.alreadyBlocked) {
    buttonController?.setBlocked(true)
  }

  showToast({
    type: result.success ? 'success' : result.alreadyBlocked ? 'warning' : 'error',
    message: result.message,
  })
}

interface MountReadyState {
  companyName: string
  anchor: Element
}

function waitForMountReady(maxAttempts = 20, intervalMs = 300): Promise<MountReadyState | null> {
  return new Promise((resolve) => {
    let attempts = 0

    const check = (): void => {
      const companyInfo = parseCompanyInfo()
      const anchor = findBlockButtonAnchor()

      if (companyInfo?.name && anchor) {
        resolve({ companyName: companyInfo.name, anchor })
        return
      }

      attempts += 1
      if (attempts >= maxAttempts) {
        resolve(null)
        return
      }

      window.setTimeout(check, intervalMs)
    }

    check()
  })
}

async function mountForCurrentPage(): Promise<void> {
  if (!isCompanyProfilePage()) {
    teardown()
    return
  }

  const pageKey = getPageKey()
  if (pageKey === currentPageKey && buttonController) return

  currentPageKey = pageKey
  buttonController?.destroy()
  buttonController = null
  removeExistingFloatButton()

  document.documentElement.setAttribute(ROOT_ATTR, 'true')

  const mountReady = await waitForMountReady()
  if (!mountReady) {
    document.documentElement.removeAttribute(ROOT_ATTR)
    currentPageKey = ''
    showToast({ type: 'error', message: '未能加载拉黑按钮，请刷新页面后重试' })
    return
  }

  if (getPageKey() !== pageKey) return

  buttonController = mountFloatButton({
    onClick: handleBlacklistClick,
    anchor: mountReady.anchor,
  })
  buttonController.updateCompanyName(mountReady.companyName)

  const blacklistStatus = await checkCompanyBlacklistStatus(mountReady.companyName)
  if (getPageKey() !== pageKey) return

  if (blacklistStatus.alreadyBlocked) {
    buttonController.setBlocked(true)
  }
}

function teardown(): void {
  buttonController?.destroy()
  buttonController = null
  currentPageKey = ''
  document.documentElement.removeAttribute(ROOT_ATTR)
  removeExistingFloatButton()
}

function patchHistoryMethod(methodName: 'pushState' | 'replaceState'): void {
  const original = history[methodName]

  history[methodName] = function patchedHistoryMethod(...args) {
    const result = original.apply(this, args)
    window.dispatchEvent(new Event('boss-ban:location-change'))
    return result
  }
}

function observeUrlChanges(): void {
  patchHistoryMethod('pushState')
  patchHistoryMethod('replaceState')
  window.addEventListener('popstate', () => {
    window.dispatchEvent(new Event('boss-ban:location-change'))
  })

  window.addEventListener('boss-ban:location-change', () => {
    void mountForCurrentPage()
  })
}

function bootstrap(): void {
  if (document.documentElement.hasAttribute(ROOT_ATTR)) return

  observeUrlChanges()
  void mountForCurrentPage()
}

bootstrap()
