import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { TraceMap, originalPositionFor } from '@jridgewell/trace-mapping'

const assetsDir = join(process.cwd(), '.output/public/_nuxt')

if (!existsSync(assetsDir)) {
  console.error('No .output/public/_nuxt directory found. Run `bun run build` first.')
  process.exit(1)
}

const jsFiles = readdirSync(assetsDir).filter(file => file.endsWith('.js'))
const problematic = []

function lineAndColumn(source, index) {
  const before = source.slice(0, index)
  const lines = before.split('\n')
  return {
    line: lines.length,
    column: lines.at(-1).length + 1,
  }
}

function excerpt(source, index) {
  const start = Math.max(0, index - 300)
  const end = Math.min(source.length, index + 500)
  return source
    .slice(start, end)
    .replaceAll('\r', '')
    .trim()
}

function originalLocation(file, line, column) {
  const mapFile = join(assetsDir, `${file}.map`)
  if (!existsSync(mapFile)) return null

  const map = new TraceMap(JSON.parse(readFileSync(mapFile, 'utf8')))
  const position = originalPositionFor(map, {
    line,
    column: Math.max(0, column - 1),
  })

  if (!position.source) return null

  return {
    source: position.source,
    line: position.line,
    column: position.column === null ? null : position.column + 1,
    name: position.name,
  }
}

for (const file of jsFiles) {
  const source = readFileSync(join(assetsDir, file), 'utf8')

  if (/import\{lt as e\}from"#entry"/.test(source)) {
    const index = source.indexOf('from"#entry"')
    problematic.push({
      file,
      ...lineAndColumn(source, index),
      reason: 'imports { lt as e } from "#entry"',
      excerpt: excerpt(source, index),
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
    const index = source.search(new RegExp(`\\b${namespaceHelperAlias}\\(\\{`))
    problematic.push({
      file,
      ...lineAndColumn(source, index),
      reason: `imports ${namespaceHelperAlias} from "#entry" and calls it as a top-level module namespace helper`,
      excerpt: excerpt(source, index),
    })
  }
}

if (problematic.length > 0) {
  console.error('Reproduced bad client chunk cycle:')
  for (const issue of problematic) {
    console.error(`- .output/public/_nuxt/${issue.file}:${issue.line}:${issue.column}`)
    console.error(`  ${issue.reason}`)
    const original = originalLocation(issue.file, issue.line, issue.column)
    if (original) {
      const location = original.line === null
        ? original.source
        : `${original.source}:${original.line}:${original.column ?? 1}`
      console.error(`  sourcemap: ${location}${original.name ? ` (${original.name})` : ''}`)
    }
    console.error('')
    console.error(issue.excerpt)
    console.error('')
  }
  console.error('This is the same shape that fails in the browser as: TypeError: e is not a function')
  process.exit(1)
}

console.log('No bad #entry helper cycle found.')
