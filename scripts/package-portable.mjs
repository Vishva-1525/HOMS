#!/usr/bin/env node
/**
 * Build HOMS for offline USB / pendrive transfer.
 * Output: HOMS-Portable.zip (full app + launcher — NOT a single HTML file)
 */
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const staging = join(root, 'HOMS-Portable')
const zipPath = join(root, 'HOMS-Portable.zip')

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

console.log('\n📦 Building HOMS portable package...\n')

rmSync(staging, { recursive: true, force: true })
mkdirSync(staging, { recursive: true })

console.log('→ Building app (portable mode)...\n')
run('npm', ['run', 'build:portable'])

const distDir = join(root, 'dist')
if (!existsSync(join(distDir, 'index.html'))) {
  console.error('Build failed: dist/index.html not found')
  process.exit(1)
}

console.log('\n→ Copying app files...\n')
cpSync(distDir, staging, { recursive: true })

const portableDir = join(root, 'portable')
for (const file of ['START-HOMS.bat', 'START-HOMS.command', 'start-homs.ps1', 'README.txt']) {
  cpSync(join(portableDir, file), join(staging, file))
}

if (process.platform !== 'win32') {
  spawnSync('chmod', ['+x', join(staging, 'START-HOMS.command')], { stdio: 'inherit' })
}

console.log('→ Creating ZIP archive...\n')
rmSync(zipPath, { force: true })

if (process.platform === 'win32') {
  run('powershell', [
    '-NoProfile',
    '-Command',
    `Compress-Archive -Path '${staging.replace(/'/g, "''")}\\*' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force`,
  ])
} else {
  run('zip', ['-r', zipPath, '.'], { cwd: staging })
}

const sizeMb = (statSync(zipPath).size / (1024 * 1024)).toFixed(1)

console.log('\n✅ Done!\n')
console.log(`   Package: ${zipPath}`)
console.log(`   Size:    ${sizeMb} MB`)
console.log('\n   Copy HOMS-Portable.zip to your pendrive.')
console.log('   On the old computer: unzip → double-click START-HOMS.bat\n')
