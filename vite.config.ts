import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(fileURLToPath(import.meta.url))

/**
 * base 说明：
 * GitHub Pages 项目站点地址是 https://<user>.github.io/<repo>/。
 * 这里默认使用相对路径 './'，这样无论仓库叫什么名字、部署在根域还是子目录，
 * 资源路径都不会出错（也就不会出现刷新 404 / 图片 404）。
 * 需要绝对路径时可通过 VITE_BASE=/repo/ 覆盖。
 */
const base = process.env.VITE_BASE ?? './'

/** 复制 index.html 为 404.html，保证 GitHub Pages 上刷新/直接打开任意路径不 404。 */
function notFoundFallback() {
  return {
    name: 'gh-pages-404-fallback',
    closeBundle() {
      const dist = resolve(rootDir, 'dist')
      const index = resolve(dist, 'index.html')
      if (existsSync(index)) copyFileSync(index, resolve(dist, '404.html'))
    },
  }
}

export default defineConfig({
  base,
  plugins: [react(), notFoundFallback()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: 'es2019',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
