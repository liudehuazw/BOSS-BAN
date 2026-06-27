import type { ParsedCompanyInfo } from '../types/company-info'

interface BrandInfoWindow extends Window {
  _brandInfo?: {
    brand_id?: string
  }
}

function cleanCompanyId(raw: string): string {
  return decodeURIComponent(raw).replace(/\.html$/, '')
}

function parseCompanyIdFromPath(pathname: string): string | null {
  const jobsMatch = pathname.match(/\/gongsi(?:r)?\/job\/([^/?#]+)/)
  if (jobsMatch?.[1]) return cleanCompanyId(jobsMatch[1])

  const introMatch = pathname.match(/\/gongsi(?:r)?\/([^/?#]+)/)
  if (!introMatch?.[1] || introMatch[1] === 'job') return null

  return cleanCompanyId(introMatch[1])
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

function extractFromTitle(): string {
  const match = document.title.match(/「(.+?)招聘」/)
  return match?.[1]?.trim() ?? ''
}

function extractFromLogoAlt(): string {
  const logo = document.querySelector('.info-primary img[alt]')
  const alt = logo?.getAttribute('alt') ?? ''
  return alt.replace(/LOGO$/i, '').trim()
}

function buildSearchNames(): string[] {
  const candidates = [
    extractFromBusinessDetail(),
    extractFromCompanyFullName(),
    extractFromHeading(),
    extractFromTitle(),
    extractFromLogoAlt(),
  ]

  return [...new Set(candidates.filter(Boolean))]
}

function extractEncryptComIdFromPage(): string | null {
  const brandWindow = window as BrandInfoWindow
  const brandId = brandWindow._brandInfo?.brand_id?.trim()
  if (brandId) return brandId

  return parseCompanyIdFromPath(window.location.pathname)
}

export function isCompanyProfilePage(): boolean {
  return parseCompanyIdFromPath(window.location.pathname) !== null
}

export function isCompanyJobsPage(): boolean {
  return /\/gongsi(?:r)?\/job\//.test(window.location.pathname)
}

export function parseCompanyInfo(): ParsedCompanyInfo | null {
  if (!isCompanyProfilePage()) return null

  const searchNames = buildSearchNames()
  if (searchNames.length === 0) return null

  return {
    name: searchNames[0],
    searchNames,
    encryptComId: extractEncryptComIdFromPage(),
  }
}
