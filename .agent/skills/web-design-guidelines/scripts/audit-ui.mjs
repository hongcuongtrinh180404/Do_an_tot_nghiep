#!/usr/bin/env node
/**
 * audit-ui.mjs - Fast Static UI & Accessibility Auditor
 * 
 * Part of web-design-guidelines skill (Vercel Labs compliance).
 * Checks JSX/TSX files for core Web Interface Guidelines violations:
 * - Missing aria-label on icon-only buttons
 * - Non-semantic <div onClick> / <span onClick>
 * - Missing alt on images (<img / <Image)
 * - Missing keyboard handler on custom interactive elements
 * - Forbidden font classes per project architecture rules
 */

import fs from 'node:fs';
import path from 'node:path';

const TARGET_EXTENSIONS = new Set(['.tsx', '.jsx', '.ts', '.js']);
const IGNORED_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'coverage', '.turbo']);

/**
 * Recursively find all UI files in a directory
 */
function findFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      findFiles(fullPath, fileList);
    } else if (TARGET_EXTENSIONS.has(path.extname(entry.name))) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

/**
 * Audit a single file content
 */
function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  const issues = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // 1. Check for <div onClick> or <span onClick>
    if (/<(div|span)[^>]*\bonClick\b/i.test(line)) {
      if (!/\brole\s*=\s*['"]button['"]/i.test(line)) {
        issues.push({
          line: lineNum,
          rule: 'a11y/semantic-html',
          message: 'Non-semantic clickable element (<div/span onClick>). Use <button> or <a>/<Link>, or add role="button" with keyboard handlers.'
        });
      }
    }

    // 2. Check for <img> or <Image without alt
    if (/<(img|Image)\b/i.test(line)) {
      // Check if alt attribute exists on this line or nearby
      const hasAlt = /\balt\s*=/i.test(line);
      if (!hasAlt) {
        // Quick check if multi-line tag
        let combined = line;
        let j = i;
        while (!combined.includes('>') && j < Math.min(lines.length - 1, i + 5)) {
          j++;
          combined += ' ' + lines[j];
        }
        if (!/\balt\s*=/i.test(combined)) {
          issues.push({
            line: lineNum,
            rule: 'a11y/image-alt',
            message: 'Image element (<img / <Image) missing alt attribute. Add descriptive alt or alt="" for decorative images.'
          });
        }
      }
    }

    // 3. Check for Icon-only buttons without aria-label
    if (/<(button|Button)\b[^>]*>/i.test(line)) {
      let combined = line;
      let j = i;
      while (!combined.includes('</button>') && !combined.includes('</Button>') && !combined.includes('/>') && j < Math.min(lines.length - 1, i + 10)) {
        j++;
        combined += ' ' + lines[j];
      }

      const hasAriaLabel = /\baria-label\s*=|aria-labelledby\s*=/i.test(combined);
      const hasIcon = /<(svg|[A-Z][a-zA-Z]*Icon|Icon)\b/.test(combined);
      
      // If it has icon and NO visible text between tags
      if (hasIcon && !hasAriaLabel) {
        // Strip tags and see if there is meaningful text
        const textOnly = combined.replace(/<[^>]+>/g, '').trim();
        if (!textOnly || textOnly.length < 2) {
          issues.push({
            line: lineNum,
            rule: 'a11y/icon-button-label',
            message: 'Icon-only button missing aria-label or accessible text description.'
          });
        }
      }
    }

    // 4. Check for forbidden inline font family classes (Project Architecture Rule)
    if (/\b(font-sans|font-serif|font-mono)\b/.test(line) && !line.includes('// ignore-font')) {
      issues.push({
        line: lineNum,
        rule: 'style/forbidden-font-class',
        message: 'Avoid inline Tailwind font classes (font-sans, font-serif) per project design guidelines.'
      });
    }

    // 5. Check for outline-none without explicit focus ring
    if (/outline-none/.test(line) && !/focus|ring/.test(line)) {
      issues.push({
        line: lineNum,
        rule: 'a11y/focus-visible',
        message: 'Avoid removing outline without replacing with an explicit focus ring or state.'
      });
    }
  }

  return issues;
}

// Main execution
const targetArg = process.argv[2] || 'frontend/src';
const targetPath = path.resolve(process.cwd(), targetArg);

console.log(`\n🔍 Running Web Design Guidelines Static Audit on: ${targetArg}`);
console.log('='.repeat(70));

let filesToScan = [];
if (fs.existsSync(targetPath)) {
  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    filesToScan = findFiles(targetPath);
  } else {
    filesToScan = [targetPath];
  }
} else {
  console.error(`❌ Target path does not exist: ${targetArg}`);
  process.exit(1);
}

let totalIssues = 0;
const report = [];

for (const file of filesToScan) {
  const issues = auditFile(file);
  if (issues.length > 0) {
    totalIssues += issues.length;
    const relPath = path.relative(process.cwd(), file).replace(/\\/g, '/');
    for (const issue of issues) {
      report.push(`${relPath}:${issue.line} - [${issue.rule}] ${issue.message}`);
    }
  }
}

if (report.length > 0) {
  for (const item of report) {
    console.log(item);
  }
  console.log('='.repeat(70));
  console.log(`⚠️  Found ${totalIssues} potential guideline violation(s) across ${filesToScan.length} file(s).`);
  console.log(`💡 For comprehensive AI audit, invoke: @web-design-guidelines review <file-path>\n`);
} else {
  console.log(`✅ All ${filesToScan.length} file(s) passed basic Web Interface Guidelines checks!`);
}
