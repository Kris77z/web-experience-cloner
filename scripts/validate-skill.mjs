#!/usr/bin/env node
import fs from "node:fs"
import path from "node:path"

const root = process.cwd()
const skillDir = path.join(root, "skills/web-experience-cloner")
const errors = []
const warnings = []

function read(file) {
  return fs.readFileSync(file, "utf8")
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.isFile()) out.push(full)
  }
  return out
}

function parseFrontmatter(content) {
  const match = /^---\n([\s\S]*?)\n---/.exec(content)
  if (!match) return null

  const lines = match[1].split(/\r?\n/)
  const data = {}
  const keys = []

  for (let i = 0; i < lines.length; i += 1) {
    const top = /^([A-Za-z0-9_-]+):(?:\s*(.*))?$/.exec(lines[i])
    if (!top) continue
    const key = top[1]
    let value = (top[2] || "").trim()
    keys.push(key)

    if (value === ">" || value === "|") {
      const block = []
      i += 1
      for (; i < lines.length; i += 1) {
        if (/^[A-Za-z0-9_-]+:/.test(lines[i])) {
          i -= 1
          break
        }
        if (lines[i].trim()) block.push(lines[i].trim())
      }
      value = value === ">" ? block.join(" ") : block.join("\n")
    } else {
      value = value.replace(/^["']|["']$/g, "")
    }

    data[key] = value
  }

  return { data, keys }
}

function relative(file) {
  return path.relative(root, file)
}

function checkRepoFiles() {
  for (const file of ["README.md", "LICENSE", "CONTRIBUTING.md", "SECURITY.md"]) {
    if (!fs.existsSync(path.join(root, file))) errors.push(`Missing top-level ${file}`)
  }
}

function checkSkill() {
  const skillName = "web-experience-cloner"
  const skillMd = path.join(skillDir, "SKILL.md")
  if (!fs.existsSync(skillMd)) {
    errors.push(`${skillName}: missing SKILL.md`)
    return
  }

  for (const name of ["README.md", "CHANGELOG.md", "INSTALLATION_GUIDE.md", "QUICK_REFERENCE.md"]) {
    if (fs.existsSync(path.join(skillDir, name))) {
      errors.push(`${skillName}: remove ${name} from the skill folder; keep user-facing docs at repo root`)
    }
  }

  const content = read(skillMd)
  const frontmatter = parseFrontmatter(content)
  if (!frontmatter) {
    errors.push(`${skillName}: invalid or missing YAML frontmatter`)
    return
  }

  const allowedKeys = new Set(["name", "description"])
  for (const key of frontmatter.keys) {
    if (!allowedKeys.has(key)) errors.push(`${skillName}: unexpected frontmatter key "${key}"`)
  }

  const { name, description } = frontmatter.data
  if (!name) errors.push(`${skillName}: missing frontmatter name`)
  if (!description) errors.push(`${skillName}: missing frontmatter description`)
  if (name && !/^[a-z0-9-]+$/.test(name)) errors.push(`${skillName}: name must be lowercase hyphen-case`)
  if (name && name !== skillName) errors.push(`${skillName}: folder name must match frontmatter name "${name}"`)
  if (description && description.length > 1024) {
    errors.push(`${skillName}: description is ${description.length} chars; keep it <= 1024`)
  }

  const lineCount = content.split(/\r?\n/).length
  if (lineCount > 500) warnings.push(`${skillName}: SKILL.md is ${lineCount} lines; consider more progressive disclosure`)

  const linkedPaths = new Set()
  for (const match of content.matchAll(/\b(?:references|scripts|assets)\/[A-Za-z0-9._/@-]+/g)) {
    linkedPaths.add(match[0])
  }
  for (const linked of linkedPaths) {
    if (!fs.existsSync(path.join(skillDir, linked))) {
      errors.push(`${skillName}: SKILL.md references missing path ${linked}`)
    }
  }

  const agentsYaml = path.join(skillDir, "agents/openai.yaml")
  if (!fs.existsSync(agentsYaml)) {
    warnings.push(`${skillName}: missing agents/openai.yaml UI metadata`)
  } else {
    const yaml = read(agentsYaml)
    for (const key of ["display_name", "short_description", "default_prompt"]) {
      if (!yaml.includes(`${key}:`)) errors.push(`${skillName}: agents/openai.yaml missing ${key}`)
    }
    if (!yaml.includes(`$${skillName}`)) {
      errors.push(`${skillName}: default_prompt should mention $${skillName}`)
    }
  }

  for (const file of walk(skillDir)) {
    const size = fs.statSync(file).size
    if (size > 2 * 1024 * 1024) errors.push(`${relative(file)} is larger than 2 MiB`)
  }
}

checkRepoFiles()
checkSkill()

for (const warning of warnings) console.warn(`WARN ${warning}`)
for (const error of errors) console.error(`ERROR ${error}`)

if (errors.length) {
  console.error(`\nValidation failed: ${errors.length} error(s), ${warnings.length} warning(s).`)
  process.exit(1)
}

console.log(`Validation passed: web-experience-cloner, ${warnings.length} warning(s).`)
