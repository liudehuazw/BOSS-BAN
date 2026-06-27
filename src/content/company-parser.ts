import type { ParsedCompanyInfo } from '../types/zhipin-api'

const COMPANY_PAGE_PATTERN = /\/gongsi(?:r)?\/([^/?#]+)/

interface BrandInfoWindow extends Window {
  _brandInfo?: {
    brand_id?: string
  }
}

function getTextContent(element: Element | null): string {
  if (!element) return ''
  return element.textContent?.trim() ?? ''
}

function extractFromBusinessDetail(): string {
  const nameItem = document.querySelector('li.business-detail-name')
  if (!nameItem) return ''

  const fullText = getTextContent(nameItem)
  const prefix = '企业名称：'
  if (fullText.startsWith(prefix)) return fullText.slice(prefix.length).trim()

  const label = nameItem.querySelector('.t')
  if (label) {
    return getTextContent(nameItem).replace(getTextContent(label), '').trim()
  }

  return fullText
}

function extractFromCompanyFullName(): string {
  const fullNameElement = document.querySelector('.company-full-name span')
  return getTextContent(fullNameElement)
}

function extractFromHeading(): string {
  const heading = document.querySelector('h1.name, .info-primary .name')
  if (!heading) return ''

  const clone = heading.cloneNode(true) as HTMLElement
  clone.querySelectorAll('i, div, .icon-focus').forEach((node) => node.remove())
  return clone.textContent?.trim() ?? ''
}

function extractEncryptComIdFromUrl(): string | null {
  const match = window.location.pathname.match(COMPANY_PAGE_PATTERN)
  if (!match?.[1]) return null

  const id = decodeURIComponent(match[1]).replace(/\.html$/, '')
  return id || null
}

function extractEncryptComIdFromPage(): string | null {
  const brandWindow = window as BrandInfoWindow
  const brandId = brandWindow._brandInfo?.brand_id?.trim()
  if (brandId) return brandId

  return extractEncryptComIdFromUrl()
}

export function isCompanyProfilePage(): boolean {
  return COMPANY_PAGE_PATTERN.test(window.location.pathname)
}

export function parseCompanyInfo(): ParsedCompanyInfo | null {
  if (!isCompanyProfilePage()) return null

  const name =
    extractFromBusinessDetail() ||
    extractFromCompanyFullName() ||
    extractFromHeading()

  if (!name) return null

  return {
    name,
    encryptComId: extractEncryptComIdFromPage(),
  }
}
