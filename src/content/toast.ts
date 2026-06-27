const TOAST_ROOT_ID = 'boss-ban-toast-root'
const TOAST_DURATION_MS = 3000

interface ToastOptions {
  type: 'success' | 'error'
  message: string
}

function ensureToastRoot(): HTMLElement {
  let root = document.getElementById(TOAST_ROOT_ID)
  if (root) return root

  root = document.createElement('div')
  root.id = TOAST_ROOT_ID
  root.style.cssText = [
    'position: fixed',
    'top: 24px',
    'left: 50%',
    'transform: translateX(-50%)',
    'z-index: 2147483647',
    'display: flex',
    'flex-direction: column',
    'gap: 8px',
    'pointer-events: none',
    'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif',
  ].join(';')

  document.body.appendChild(root)
  return root
}

export function showToast({ type, message }: ToastOptions): void {
  const root = ensureToastRoot()
  const toast = document.createElement('div')

  const backgroundColor = type === 'success' ? '#16a34a' : '#dc2626'
  toast.textContent = message
  toast.style.cssText = [
    'min-width: 280px',
    'max-width: 420px',
    'padding: 12px 16px',
    'border-radius: 8px',
    'color: #ffffff',
    'font-size: 14px',
    'line-height: 1.5',
    'box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18)',
    `background-color: ${backgroundColor}`,
    'opacity: 0',
    'transform: translateY(-8px)',
    'transition: opacity 0.2s ease, transform 0.2s ease',
  ].join(';')

  root.appendChild(toast)

  requestAnimationFrame(() => {
    toast.style.opacity = '1'
    toast.style.transform = 'translateY(0)'
  })

  window.setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateY(-8px)'
    window.setTimeout(() => toast.remove(), 200)
  }, TOAST_DURATION_MS)
}
