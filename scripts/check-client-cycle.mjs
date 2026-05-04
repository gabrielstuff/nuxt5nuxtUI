import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const assetsDir = join(process.cwd(), '.output/public/_nuxt')

if (!existsSync(assetsDir)) {
  console.error('No .output/public/_nuxt directory found. Run `bun run build` first.')
  process.exit(1)
}

const jsFiles = readdirSync(assetsDir).filter(file => file.endsWith('.js'))
const problematic = []

for (const file of jsFiles) {
  const source = readFileSync(join(assetsDir, file), 'utf8')

  if (/import\{lt as e\}from"#entry"/.test(source)) {
    problematic.push({
      file,
      reason: 'imports { lt as e } from "#entry"',
    })
    continue
  }

  const entryImport = source.match(/^import\{([^}]+)\}from"#entry";/)
  if (!entryImport) continue

  const importedAliases = entryImport[1]
    .split(',')
    .map(part => part.trim().match(/(?:\w+ as )?(\w+)$/)?.[1])
    .filter(Boolean)

  const namespaceHelperAlias = importedAliases.find(alias => new RegExp(`\\b${alias}\\(\\{`).test(source))
  if (namespaceHelperAlias) {
    problematic.push({
      file,
      reason: `imports ${namespaceHelperAlias} from "#entry" and calls it as a top-level module namespace helper`,
    })
  }
}

if (problematic.length > 0) {
  console.error('Reproduced bad client chunk cycle:')
  for (const issue of problematic) {
    console.error(`- ${issue.file} ${issue.reason}`)
  }
  console.error('')
  console.error('This is the same shape that fails in the browser as: TypeError: e is not a function')
  process.exit(1)
}

console.log('No bad #entry helper cycle found.')
