import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const inputPath = join(__dirname, '..', 'build', 'icon.png')
const outputPath = join(__dirname, '..', 'build', 'icon.ico')

const sizes = [16, 32, 48, 64, 128, 256]

async function generateIco() {
  const pngs = await Promise.all(
    sizes.map(async (size) => {
      const buf = await sharp(inputPath)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()
      return { size, buf }
    })
  )

  const headerSize = 6
  const dirEntrySize = 16
  const numImages = pngs.length
  const dirSize = numImages * dirEntrySize
  let offset = headerSize + dirSize

  const bmpHeaders = pngs.map(({ size, buf }) => {
    const entry = Buffer.alloc(dirEntrySize)
    entry.writeUInt8(size >= 256 ? 0 : size, 0)
    entry.writeUInt8(size >= 256 ? 0 : size, 1)
    entry.writeUInt8(0, 2)
    entry.writeUInt8(0, 3)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 5)
    entry.writeUInt32LE(buf.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += buf.length
    return { entry, buf }
  })

  const header = Buffer.alloc(headerSize)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(numImages, 4)

  const ico = Buffer.concat([
    header,
    ...bmpHeaders.map((b) => b.entry),
    ...bmpHeaders.map((b) => b.buf),
  ])

  writeFileSync(outputPath, ico)
  console.log(`Generated ${outputPath} with sizes: ${sizes.join(', ')}`)
}

generateIco().catch((err) => {
  console.error(err)
  process.exit(1)
})
