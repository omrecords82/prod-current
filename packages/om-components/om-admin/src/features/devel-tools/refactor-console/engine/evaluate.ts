/**
 * Refactor Console v2 — Policy Evaluator
 * 
 * Pure function: takes inventory + policy → returns findings.
 * No side effects, no UI logic, no API calls.
 */
import {
    PolicyEvaluationResult,
    PolicyFile,
    PolicyFinding,
    PolicyRule,
    ScanInventoryItem,
} from '@/types/refactorConsole';

/**
 * Evaluate a single rule against the inventory.
 */
function evaluateRule(rule: PolicyRule, inventory: ScanInventoryItem[]): PolicyFinding[] {
  if (!rule.enabled) return [];

  // Filter to items in this rule's scope
  const scopeItems = inventory.filter(item => item.scopeId === rule.scope);
  if (scopeItems.length === 0) return [];

  const findings: PolicyFinding[] = [];

  // Step 1: Check `when.any_dir_exists` — find directories matching the glob
  let candidateDirs: Set<string> = new Set();
  if (rule.when.any_dir_exists && rule.when.any_dir_exists.length > 0) {
    const dirItems = scopeItems.filter(item => item.isDir);
    for (const dirItem of dirItems) {
      for (const dirPattern of rule.when.any_dir_exists) {
        // Simple glob: **/docs matches any dir named "docs" at any depth
        const patternName = dirPattern.replace(/^\*\*\//, '');
        const dirName = dirItem.relPath.split('/').filter(Boolean).pop() || '';
        if (dirName === patternName || dirItem.relPath.includes('/' + patternName + '/') || dirItem.relPath.endsWith('/' + patternName)) {
          candidateDirs.add(dirItem.path);
        }
      }
    }
  } else {
    // No dir condition — all scope items are candidates
    candidateDirs = new Set(['*']);
  }

  if (candidateDirs.size === 0) return [];

  // Step 2: Apply `when.not_under` — exclude directories under these paths
  if (rule.when.not_under && rule.when.not_under.length > 0) {
    for (const excludePath of rule.when.not_under) {
      const normalized = excludePath.replace(/\/+$/, '');
      candidateDirs.forEach(dir => {
        if (dir !== '*' && (dir === normalized || dir.startsWith(normalized + '/'))) {
          candidateDirs.delete(dir);
        }
      });
    }
  }

  if (candidateDirs.size === 0) return [];

  // Step 3: Find files that match the rule's match criteria
  const fileItems = scopeItems.filter(item => !item.isDir);

  for (const file of fileItems) {
    // Check if file is under one of the candidate directories (or '*' means all)
    let underCandidate = candidateDirs.has('*');
    if (!underCandidate) {
      for (const dir of candidateDirs) {
        if (file.path.startsWith(dir + '/') || file.path.startsWith(dir)) {
          underCandidate = true;
          break;
        }
      }
    }
    if (!underCandidate) continue;

    // Check extension match
    if (rule.match.extensions && rule.match.extensions.length > 0) {
      if (!rule.match.extensions.includes(file.ext)) continue;
    }

    // Check include patterns
    if (rule.match.include && rule.match.include.length > 0) {
      const matches = rule.match.include.some((pat: string) => {
        if (pat.startsWith('**/')) {
          return file.relPath.includes(pat.slice(3));
        }
        return file.relPath.includes(pat);
      });
      if (!matches) continue;
    }

    // Check exclude patterns
    if (rule.match.exclude && rule.match.exclude.length > 0) {
      const excluded = rule.match.exclude.some((pat: string) => {
        if (pat.startsWith('**/')) {
          return file.relPath.includes(pat.slice(3));
        }
        return file.relPath.includes(pat);
      });
      if (excluded) continue;
    }

    // Build the suggested destination with template substitution
    let dest = rule.suggest.dest;
    if (dest && dest.includes('{rel_parent}')) {
      // {rel_parent} = the relative directory of the file within the scope
      const relDir = file.relPath.split('/').slice(0, -1).join('/');
      dest = dest.replace('{rel_parent}', relDir);
    }

    findings.push({
      ruleId: rule.id,
      scopeId: rule.scope,
      path: file.path,
      relPath: file.relPath,
      reason: rule.description || `Matched rule: ${rule.id}`,
      suggested: {
        action: rule.suggest.action,
        dest: dest,
        confidence: rule.suggest.confidence,
      },
    });
  }

  return findings;
}

/**
 * Evaluate all policy rules against the full inventory.
 * Pure function — no side effects.
 */
export function evaluatePolicy(
  inventory: ScanInventoryItem[],
  policy: PolicyFile
): PolicyEvaluationResult {
  const allFindings: PolicyFinding[] = [];

  for (const rule of policy.rules) {
    const ruleFindings = evaluateRule(rule, inventory);
    allFindings.push(...ruleFindings);
  }

  // Build summary
  const byRule: Record<string, number> = {};
  const byAction: Record<string, number> = {};

  for (const f of allFindings) {
    byRule[f.ruleId] = (byRule[f.ruleId] || 0) + 1;
    byAction[f.suggested.action] = (byAction[f.suggested.action] || 0) + 1;
  }

  return {
    findings: allFindings,
    summary: {
      totalFindings: allFindings.length,
      byRule,
      byAction,
    },
    evaluatedAt: new Date().toISOString(),
  };
}
