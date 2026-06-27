import { accessSync, constants, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const iconsDir = resolve(projectRoot, 'icons')

const SOURCE_CANDIDATES = [
  resolve(projectRoot, 'bossicon.jpg'),
  resolve(projectRoot, 'assets/bossicon.jpg'),
]

function resolveSourceIcon() {
  for (const sourcePath of SOURCE_CANDIDATES) {
    try {
      accessSync(sourcePath, constants.R_OK)
      return sourcePath
    } catch {
      continue
    }
  }

  throw new Error(
    'Source icon not found. Place bossicon.jpg in the project root and rebuild.',
  )
}

async function generateIcons() {
  const sourceIcon = resolveSourceIcon()
  mkdirSync(iconsDir, { recursive: true })

  for (const size of [16, 48, 128]) {
    await sharp(sourceIcon)
      .resize(size, size, {
        fit: 'cover',
        position: 'centre',
      })
      .png()
      .toFile(resolve(iconsDir, `icon${size}.png`))
  }

  console.log(`Icons generated from ${sourceIcon}`)
}

await generateIcons()
