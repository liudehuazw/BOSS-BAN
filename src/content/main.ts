import {
  addCompanyToBlacklist,
  checkCompanyBlacklistStatus,
  removeCompanyFromBlacklist,
} from './blacklist-api'
import { isCompanyProfilePage, parseCompanyInfo } from './company-parser'
import {
  findBlockButtonAnchor,
  isCompanyButtonMounted,
  mountCompanyButtons,
  removeExistingFloatButton,
  type CompanyButtonController,
} from './float-button'
import { showToast } from './toast'

const ROOT_ATTR = 'data-boss-ban-mounted'
let buttonController: CompanyButtonController | null = null
let currentPageKey = ''
let isMounting = false
let remountTimer: number | null = null

function getPageKey(): string {
  return `${window.location.pathname}${window.location.search}`
}

function getCompanyInfoOrToast() {
  const companyInfo = parseCompanyInfo()
  if (!companyInfo?.name) {
    showToast({ type: 'error', message: '未能识别当前公司名称，请刷新页面后重试' })
    return null
  }

  return companyInfo
}

async function handleBlacklistClick(): Promise<void> {
  const companyInfo = getCompanyInfoOrToast()
  if (!companyInfo) return

  const result = await addCompanyToBlacklist(companyInfo)

  if (result.success || result.alreadyBlocked) {
    buttonController?.setBlocked(true)
  }

  showToast({
    type: result.success ? 'success' : result.alreadyBlocked ? 'warning' : 'error',
    message: result.message,
  })
}

async function handleUnblockClick(): Promise<void> {
  const companyInfo = getCompanyInfoOrToast()
  if (!companyInfo) return

  const result = await removeCompanyFromBlacklist(companyInfo)

  if (result.success) {
    buttonController?.setBlocked(false)
  } else if (result.notBlocked) {
    buttonController?.setBlocked(false)
  }

  showToast({
    type: result.success ? 'success' : result.notBlocked ? 'warning' : 'error',
    message: result.message,
  })
}

interface MountReadyState {
  companyName: string
  anchor: Element
}

function waitForMountReady(maxAttempts = 40, intervalMs = 300): Promise<MountReadyState | null> {
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

async function applyBlockedState(companyName: string, pageKey: string): Promise<void> {
  const companyInfo = parseCompanyInfo()
  if (!companyInfo || getPageKey() !== pageKey || !buttonController) return

  const blacklistStatus = await checkCompanyBlacklistStatus(companyInfo)
  if (getPageKey() !== pageKey || !buttonController) return

  if (blacklistStatus.alreadyBlocked) {
    buttonController.setBlocked(true)
  } else {
    buttonController.setBlocked(false)
  }

  buttonController.updateCompanyName(blacklistStatus.companyName || companyName)
}

async function mountForCurrentPage(): Promise<void> {
  if (!isCompanyProfilePage()) {
    teardown()
    return
  }

  const pageKey = getPageKey()
  if (pageKey === currentPageKey && buttonController && isCompanyButtonMounted()) return

  if (isMounting) return
  isMounting = true

  try {
    if (pageKey !== currentPageKey) {
      buttonController?.destroy()
      buttonController = null
      removeExistingFloatButton()
      currentPageKey = pageKey
    } else if (!isCompanyButtonMounted()) {
      buttonController = null
      removeExistingFloatButton()
    }

    document.documentElement.setAttribute(ROOT_ATTR, 'true')

    const mountReady = await waitForMountReady()
    if (!mountReady) {
      if (!isCompanyButtonMounted()) {
        document.documentElement.removeAttribute(ROOT_ATTR)
        currentPageKey = ''
      }
      return
    }

    if (getPageKey() !== pageKey) return

    const companyInfo = parseCompanyInfo()
    if (!companyInfo) return

    if (!buttonController || !isCompanyButtonMounted()) {
      buttonController = mountCompanyButtons({
        onBlockClick: handleBlacklistClick,
        onUnblockClick: handleUnblockClick,
        anchor: mountReady.anchor,
      })
      buttonController.updateCompanyName(mountReady.companyName)
    }

    await applyBlockedState(mountReady.companyName, pageKey)
  } finally {
    isMounting = false
  }
}

function scheduleRemount(): void {
  if (remountTimer !== null) {
    window.clearTimeout(remountTimer)
  }

  remountTimer = window.setTimeout(() => {
    remountTimer = null
    void mountForCurrentPage()
  }, 300)
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
    scheduleRemount()
  })
}

function observeDomChanges(): void {
  const observer = new MutationObserver(() => {
    if (!isCompanyProfilePage()) {
      if (isCompanyButtonMounted()) teardown()
      return
    }

    if (!isCompanyButtonMounted()) {
      scheduleRemount()
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })
}

function bootstrap(): void {
  observeUrlChanges()
  observeDomChanges()
  void mountForCurrentPage()
}

bootstrap()
