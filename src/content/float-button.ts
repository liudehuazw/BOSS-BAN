const BUTTON_ROOT_ID = 'boss-ban-button-root'

const ANCHOR_SELECTORS = [
  'h1.name .icon-focus',
  '.info-primary .info .icon-focus',
  '.info-primary .icon-focus[ka="gongsi_job_focus_click"]',
  'h1.name',
  '.info-primary .info .name',
  '.info-primary .name',
]

const BASE_BUTTON_STYLE = [
  'display: inline-flex',
  'align-items: center',
  'justify-content: center',
  'box-sizing: border-box',
  'height: 32px',
  'padding: 0 16px',
  'border: none',
  'border-radius: 16px',
  'font-size: 14px',
  'font-weight: 500',
  'font-family: inherit',
  'white-space: nowrap',
  'transition: opacity 0.15s ease, background-color 0.15s ease',
].join(';')

export interface CompanyButtonController {
  updateCompanyName: (companyName: string) => void
  setBlocked: (isBlocked: boolean) => void
  setBlockLoading: (isLoading: boolean) => void
  setUnblockLoading: (isLoading: boolean) => void
  destroy: () => void
}

export function findBlockButtonAnchor(): Element | null {
  for (const selector of ANCHOR_SELECTORS) {
    const element = document.querySelector(selector)
    if (element) return element
  }

  return null
}

export function mountCompanyButtons({
  onBlockClick,
  onUnblockClick,
  anchor,
}: {
  onBlockClick: () => Promise<void>
  onUnblockClick: () => Promise<void>
  anchor: Element
}): CompanyButtonController {
  let isBlockLoading = false
  let isUnblockLoading = false
  let isBlocked = false
  let currentCompanyName = ''

  const root = document.createElement('span')
  root.id = BUTTON_ROOT_ID
  root.style.cssText = [
    'display: inline-flex',
    'align-items: center',
    'gap: 8px',
    'vertical-align: middle',
    'margin-left: 12px',
    'line-height: 1',
  ].join(';')

  const blockButton = document.createElement('button')
  blockButton.type = 'button'
  blockButton.style.cssText = `${BASE_BUTTON_STYLE}; cursor: pointer; color: #ffffff;`

  const unblockButton = document.createElement('button')
  unblockButton.type = 'button'
  unblockButton.style.cssText = `${BASE_BUTTON_STYLE}; cursor: not-allowed; color: #ffffff;`

  function renderBlockLabel(): void {
    if (isBlockLoading) {
      blockButton.textContent = '拉黑中...'
      return
    }

    if (isBlocked) {
      blockButton.textContent = '已拉黑'
      return
    }

    blockButton.textContent = '拉黑该公司'
  }

  function renderUnblockLabel(): void {
    if (isUnblockLoading) {
      unblockButton.textContent = '移出中...'
      return
    }

    unblockButton.textContent = '移出黑名单'
  }

  function setBlockDisabledState(): void {
    blockButton.disabled = isBlockLoading || isUnblockLoading || isBlocked || !currentCompanyName
    blockButton.style.opacity = blockButton.disabled ? '0.65' : '1'
    blockButton.style.cursor = blockButton.disabled ? 'not-allowed' : 'pointer'
    blockButton.style.background = isBlocked ? '#94a3b8' : blockButton.disabled ? '#c0392b' : '#e74c3c'
  }

  function setUnblockDisabledState(): void {
    unblockButton.disabled =
      isBlockLoading || isUnblockLoading || !isBlocked || !currentCompanyName
    unblockButton.style.opacity = unblockButton.disabled ? '0.65' : '1'
    unblockButton.style.cursor = unblockButton.disabled ? 'not-allowed' : 'pointer'
    unblockButton.style.background = unblockButton.disabled ? '#94a3b8' : '#2563eb'
  }

  function renderAll(): void {
    renderBlockLabel()
    renderUnblockLabel()
    setBlockDisabledState()
    setUnblockDisabledState()
  }

  blockButton.addEventListener('mouseenter', () => {
    if (!blockButton.disabled && !isBlocked) blockButton.style.background = '#cf3f31'
  })

  blockButton.addEventListener('mouseleave', () => {
    setBlockDisabledState()
  })

  unblockButton.addEventListener('mouseenter', () => {
    if (!unblockButton.disabled) unblockButton.style.background = '#1d4ed8'
  })

  unblockButton.addEventListener('mouseleave', () => {
    setUnblockDisabledState()
  })

  blockButton.addEventListener('click', async () => {
    if (isBlockLoading || isUnblockLoading || isBlocked || !currentCompanyName) return

    isBlockLoading = true
    renderAll()

    try {
      await onBlockClick()
    } finally {
      isBlockLoading = false
      renderAll()
    }
  })

  unblockButton.addEventListener('click', async () => {
    if (isBlockLoading || isUnblockLoading || !isBlocked || !currentCompanyName) return

    isUnblockLoading = true
    renderAll()

    try {
      await onUnblockClick()
    } finally {
      isUnblockLoading = false
      renderAll()
    }
  })

  root.append(blockButton, unblockButton)
  anchor.insertAdjacentElement('afterend', root)
  renderAll()

  return {
    updateCompanyName(companyName: string) {
      currentCompanyName = companyName
      renderAll()
    },
    setBlocked(blocked: boolean) {
      isBlocked = blocked
      renderAll()
    },
    setBlockLoading(loading: boolean) {
      isBlockLoading = loading
      renderAll()
    },
    setUnblockLoading(loading: boolean) {
      isUnblockLoading = loading
      renderAll()
    },
    destroy() {
      root.remove()
    },
  }
}

export function removeExistingFloatButton(): void {
  document.getElementById(BUTTON_ROOT_ID)?.remove()
}

export function isCompanyButtonMounted(): boolean {
  return Boolean(document.getElementById(BUTTON_ROOT_ID))
}
