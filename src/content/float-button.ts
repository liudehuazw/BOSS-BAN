const BUTTON_ROOT_ID = 'boss-ban-button-root'

const ANCHOR_SELECTORS = [
  'h1.name .icon-focus',
  '.info-primary .info .icon-focus',
  '.info-primary .icon-focus[ka="gongsi_job_focus_click"]',
]

export interface FloatButtonController {
  updateCompanyName: (companyName: string) => void
  setLoading: (isLoading: boolean) => void
  setBlocked: (isBlocked: boolean) => void
  destroy: () => void
}

export function findBlockButtonAnchor(): Element | null {
  for (const selector of ANCHOR_SELECTORS) {
    const element = document.querySelector(selector)
    if (element) return element
  }

  return null
}

export function mountFloatButton({
  onClick,
  anchor,
}: {
  onClick: () => Promise<void>
  anchor: Element
}): FloatButtonController {
  let isLoading = false
  let isBlocked = false
  let currentCompanyName = ''

  const root = document.createElement('span')
  root.id = BUTTON_ROOT_ID
  root.style.cssText = [
    'display: inline-flex',
    'align-items: center',
    'vertical-align: middle',
    'margin-left: 12px',
    'line-height: 1',
  ].join(';')

  const button = document.createElement('button')
  button.type = 'button'
  button.style.cssText = [
    'display: inline-flex',
    'align-items: center',
    'justify-content: center',
    'box-sizing: border-box',
    'height: 32px',
    'padding: 0 16px',
    'border: none',
    'border-radius: 16px',
    'background: #e74c3c',
    'color: #ffffff',
    'font-size: 14px',
    'font-weight: 500',
    'font-family: inherit',
    'cursor: pointer',
    'white-space: nowrap',
    'transition: opacity 0.15s ease, background-color 0.15s ease',
  ].join(';')

  function renderLabel(): void {
    if (isLoading) {
      button.textContent = '拉黑中...'
      return
    }

    if (isBlocked) {
      button.textContent = '已拉黑'
      return
    }

    button.textContent = '拉黑该公司'
  }

  function setDisabledState(): void {
    button.disabled = isLoading || isBlocked || !currentCompanyName
    button.style.opacity = button.disabled ? '0.65' : '1'
    button.style.cursor = button.disabled ? 'not-allowed' : 'pointer'

    if (isBlocked) {
      button.style.background = '#94a3b8'
      return
    }

    button.style.background = button.disabled ? '#c0392b' : '#e74c3c'
  }

  button.addEventListener('mouseenter', () => {
    if (!button.disabled && !isBlocked) button.style.background = '#cf3f31'
  })

  button.addEventListener('mouseleave', () => {
    if (isBlocked) {
      button.style.background = '#94a3b8'
      return
    }

    if (!button.disabled) button.style.background = '#e74c3c'
  })

  button.addEventListener('click', async () => {
    if (isLoading || isBlocked || !currentCompanyName) return

    isLoading = true
    renderLabel()
    setDisabledState()

    try {
      await onClick()
    } finally {
      isLoading = false
      renderLabel()
      setDisabledState()
    }
  })

  root.appendChild(button)
  anchor.insertAdjacentElement('afterend', root)
  renderLabel()
  setDisabledState()

  return {
    updateCompanyName(companyName: string) {
      currentCompanyName = companyName
      renderLabel()
      setDisabledState()
    },
    setLoading(loading: boolean) {
      isLoading = loading
      renderLabel()
      setDisabledState()
    },
    setBlocked(blocked: boolean) {
      isBlocked = blocked
      renderLabel()
      setDisabledState()
    },
    destroy() {
      root.remove()
    },
  }
}

export function removeExistingFloatButton(): void {
  document.getElementById(BUTTON_ROOT_ID)?.remove()
}
