import { addTemplate, createResolver, defineNuxtModule, resolveFiles, useLogger } from 'nuxt/kit'
import { camelCase } from 'scule'
import { relative, normalize } from 'pathe'
import { promises } from 'node:fs'
import { jsonSchemaToZod } from 'json-schema-to-zod'

export default defineNuxtModule({
  meta: {
    name: 'schemas-module',
    configKey: 'schemas'
  },
  defaults: {
  },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const logger = useLogger('schemas-module')
    const targetFolder = resolver.resolve(nuxt.options.rootDir, 'schemas')

    const pattern = '**/*.json'

    async function generateZodSchemaContent() {
      const before = performance.now()

      const files = await resolveFiles(targetFolder, pattern)

      const schemaMap: string[] = []

      for await (const filePath of files) {
        const relativePath = relative(targetFolder, filePath)
        const wildcardValue = normalize(relativePath).replace(/\.json$/, '')
        const content = await promises.readFile(filePath, 'utf-8')

        const tsFile = jsonSchemaToZod(JSON.parse(content), {
          module: 'esm',
          type: true,
          name: camelCase(wildcardValue),
          noImport: true
        })

        schemaMap.push(tsFile)

        logger.success(`Schemas built in ${(performance.now() - before).toFixed(0)} ms`)
      }

      return `import {z} from 'zod/v4' \n${schemaMap.join('\n')}`
    }

    nuxt.hook('build:before', async () => {
      nuxt.options.alias['#project-schemas'] = addTemplate({
        filename: 'project-schemas.ts',
        getContents: async () => await generateZodSchemaContent(),
        write: true
      }).dst
    })
  }
})
