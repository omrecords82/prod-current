/**
 * Refactor Console v2 — Policy Loader
 * 
 * Loads and parses YAML policy files from the backend.
 * Does NOT contain UI logic.
 */
import { apiClient } from '@/api/utils/axiosInstance';
import { PolicyFile, PolicyRule } from '@/types/refactorConsole';

const DEFAULT_POLICY_PATH = '/var/www/orthodoxmetrics/prod/ops/refactor/refactor-policies.yml';

/**
 * Fetch raw YAML policy content from backend endpoint.
 */
export async function fetchPolicyContent(policyPath?: string): Promise<string> {
  const path = policyPath || DEFAULT_POLICY_PATH;
  const params = new URLSearchParams({ path });
  
  const data = await apiClient.get<any>(`/admin/refactor/policy?${params}`);
  return data.content;
}

/**
 * Parse YAML content into a PolicyFile structure.
 * Uses a simple YAML subset parser (no external dependency needed for this schema).
 */
export function parsePolicyYaml(yamlContent: string): PolicyFile {
  const lines = yamlContent.split('\n');
  let version = 1;
  const rules: PolicyRule[] = [];
  let currentRule: Partial<PolicyRule> | null = null;
  let currentSection: string | null = null; // 'when' | 'match' | 'suggest'

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments and blank lines
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Top-level version
    if (trimmed.startsWith('version:')) {
      version = parseInt(trimmed.split(':')[1].trim()) || 1;
      continue;
    }

    // Start of rules array
    if (trimmed === 'rules:') continue;

    // New rule item (starts with "- id:")
    if (trimmed.startsWith('- id:')) {
      if (currentRule && currentRule.id) {
        rules.push(finalizeRule(currentRule));
      }
      currentRule = {
        id: trimmed.replace('- id:', '').trim(),
        enabled: true,
        scope: 'prod_root',
        when: {},
        match: {},
        suggest: { action: 'report', confidence: 0.5 },
      };
      currentSection = null;
      continue;
    }

    if (!currentRule) continue;

    // Rule-level fields
    if (trimmed.startsWith('enabled:')) {
      currentRule.enabled = trimmed.split(':')[1].trim() === 'true';
    } else if (trimmed.startsWith('scope:')) {
      currentRule.scope = trimmed.split(':')[1].trim() as any;
    } else if (trimmed.startsWith('description:')) {
      currentRule.description = trimmed.replace('description:', '').trim().replace(/^["']|["']$/g, '');
    } else if (trimmed === 'when:') {
      currentSection = 'when';
    } else if (trimmed === 'match:') {
      currentSection = 'match';
    } else if (trimmed === 'suggest:') {
      currentSection = 'suggest';
    } else if (currentSection === 'when') {
      if (trimmed.startsWith('any_dir_exists:')) {
        currentRule.when = currentRule.when || {};
        currentRule.when.any_dir_exists = parseInlineList(trimmed.replace('any_dir_exists:', '').trim());
      } else if (trimmed.startsWith('not_under:')) {
        currentRule.when = currentRule.when || {};
        currentRule.when.not_under = parseInlineList(trimmed.replace('not_under:', '').trim());
      } else if (trimmed.startsWith('- ')) {
        // Continuation list item for the last key
        const val = trimmed.slice(2).trim();
        if (currentRule.when?.any_dir_exists) {
          currentRule.when.any_dir_exists.push(val);
        } else if (currentRule.when?.not_under) {
          currentRule.when.not_under.push(val);
        }
      }
    } else if (currentSection === 'match') {
      if (trimmed.startsWith('extensions:')) {
        currentRule.match = currentRule.match || {};
        currentRule.match.extensions = parseInlineList(trimmed.replace('extensions:', '').trim());
      } else if (trimmed.startsWith('include:')) {
        currentRule.match = currentRule.match || {};
        currentRule.match.include = parseInlineList(trimmed.replace('include:', '').trim());
      } else if (trimmed.startsWith('exclude:')) {
        currentRule.match = currentRule.match || {};
        currentRule.match.exclude = parseInlineList(trimmed.replace('exclude:', '').trim());
      } else if (trimmed.startsWith('- ')) {
        const val = trimmed.slice(2).trim().replace(/^["']|["']$/g, '');
        if (currentRule.match?.extensions) {
          currentRule.match.extensions.push(val);
        }
      }
    } else if (currentSection === 'suggest') {
      if (trimmed.startsWith('action:')) {
        currentRule.suggest = currentRule.suggest || { action: 'report', confidence: 0.5 };
        currentRule.suggest.action = trimmed.split(':')[1].trim() as any;
      } else if (trimmed.startsWith('dest:')) {
        currentRule.suggest = currentRule.suggest || { action: 'report', confidence: 0.5 };
        currentRule.suggest.dest = trimmed.replace('dest:', '').trim().replace(/^["']|["']$/g, '');
      } else if (trimmed.startsWith('confidence:')) {
        currentRule.suggest = currentRule.suggest || { action: 'report', confidence: 0.5 };
        currentRule.suggest.confidence = parseFloat(trimmed.split(':')[1].trim()) || 0.5;
      }
    }
  }

  // Push last rule
  if (currentRule && currentRule.id) {
    rules.push(finalizeRule(currentRule));
  }

  return { version, rules };
}

function finalizeRule(partial: Partial<PolicyRule>): PolicyRule {
  return {
    id: partial.id || 'unknown',
    enabled: partial.enabled ?? true,
    scope: partial.scope || 'prod_root',
    description: partial.description,
    when: partial.when || {},
    match: partial.match || {},
    suggest: partial.suggest || { action: 'report', confidence: 0.5 },
  };
}

function parseInlineList(str: string): string[] {
  // Handle [item1, item2, ...] format
  if (str.startsWith('[') && str.endsWith(']')) {
    return str.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  }
  // Handle single value
  if (str && str !== '[]') {
    return [str.replace(/^["']|["']$/g, '')];
  }
  return [];
}

/**
 * Load and parse policy from the backend.
 */
export async function loadPolicy(policyPath?: string): Promise<PolicyFile> {
  const content = await fetchPolicyContent(policyPath);
  return parsePolicyYaml(content);
}
