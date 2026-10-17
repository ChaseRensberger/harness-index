import path from 'node:path'
import type { Plugin } from 'vite'
import { catalogDirectory, generate } from './generate.ts'

export const catalogModuleId = 'virtual:harnesses'
const resolvedModuleId = `\0${catalogModuleId}`

export function harnessCatalog(directory = catalogDirectory): Plugin {
  let isBuild = false
  return {
    name: 'harness-catalog',
    configResolved(config) {
      isBuild = config.command === 'build'
    },
    resolveId(id) {
      if (id === catalogModuleId) return resolvedModuleId
    },
    async load(id) {
      if (id !== resolvedModuleId) return
      const { harnesses, lastUpdated, files } = await generate(directory)
      // In dev, Vite turns addWatchFile entries into browser imports.
      // The explicit server watcher below handles data files instead.
      if (isBuild) {
        this.addWatchFile(directory)
        for (const file of files) this.addWatchFile(file)
      }
      return `export const harnesses = ${JSON.stringify(harnesses)};\nexport const lastUpdated = ${JSON.stringify(lastUpdated)};`
    },
    configureServer(server) {
      server.watcher.add(directory)
      const onChange = (event: string, file: string) => {
        if (!['add', 'change', 'unlink'].includes(event)) return
        if (path.dirname(path.resolve(file)) !== path.resolve(directory) || !file.endsWith('.toml')) return
        const module = server.moduleGraph.getModuleById(resolvedModuleId)
        if (module) server.moduleGraph.invalidateModule(module)
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('all', onChange)
      server.httpServer?.once('close', () => server.watcher.off('all', onChange))
    },
  }
}
