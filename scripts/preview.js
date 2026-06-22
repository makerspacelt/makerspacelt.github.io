import { $ } from 'bun'
import { watch } from 'fs'
import { join, normalize } from 'path'

const PUBLIC_DIR = join(import.meta.dirname, '../public')
const ROOT_PATH = normalize(join(import.meta.dirname, '..'))

let isBuilding = false
let buildTimer = null

async function build(reason) {
  if (isBuilding) return
  console.log(`Rebuilding website: ${reason}`)
  try {
    isBuilding = true
    await $`bun scripts/build.js`
  } finally {
    isBuilding = false
  }
}

const server = Bun.serve({
  port: process.env.PORT || 8000,
  async fetch(req) {
    const url = new URL(req.url)
    const path = url.pathname
    console.log(`GET ${path}`)
    const file = Bun.file(join(PUBLIC_DIR, path))
    if (await file.exists()) return new Response(file)
    const index = Bun.file(join(PUBLIC_DIR, path, 'index.html'))
    if (await index.exists()) return new Response(index)
    return new Response('404 Not Found', { status: 404 })
  },
})

await build('initial build')

const watcher = watch(ROOT_PATH, { recursive: true }, (event, relativePath) => {
  if (relativePath.startsWith('cache')) return
  if (relativePath.startsWith('public')) return
  if (buildTimer) {
    clearTimeout(buildTimer)
    buildTimer = null
  }
  buildTimer = setTimeout(() => build(`${event} ${relativePath}`), 50)
})

console.log(`Server running at ${server.url}`)
console.log(`Watching ${ROOT_PATH} for changes`)
