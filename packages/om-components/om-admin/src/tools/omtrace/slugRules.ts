// Slug taxonomy system for OMTRACE refactoring

export interface SlugRule {
  pattern: RegExp;
  domain: string;
  slug: string;
  priority: number; // Higher = more specific
}

export interface DomainMapping {
  [key: string]: string;
}

// Domain mappings
export const DOMAIN_MAPPINGS: DomainMapping = {
  'calendar': 'calendar-management',
  'charts': 'charts-management',
  'church': 'church-management',
  'user': 'user-management',
  'record': 'record-management',
  'dashboard': 'dashboard-management',
  'table': 'table-management',
  'schema': 'schema-management',
  'image': 'image-management',
  'log': 'log-management',
  'omai': 'omai-management',
  'site': 'site-management',
  'helper': 'helper-management',
  'blog': 'blog-management',
};

// Slug taxonomy rules (ordered by priority)
export const SLUG_RULES: SlugRule[] = [
  // Prefix overrides (highest priority)
  {
    pattern: /^Church/,
    domain: 'church',
    slug: 'ch-panel',
    priority: 100,
  },
  {
    pattern: /^AccessControlDashboard/,
    domain: 'dashboard',
    slug: 'acl-dash',
    priority: 100,
  },
  {
    pattern: /^User/,
    domain: 'user',
    slug: 'usr-core',
    priority: 90,
  },
  {
    pattern: /^Record/,
    domain: 'record',
    slug: 'rec-template',
    priority: 90,
  },

  // Keyword-based rules
  {
    pattern: /Wizard$/,
    domain: 'church',
    slug: 'ch-wiz',
    priority: 80,
  },
  {
    pattern: /Roles?$/,
    domain: 'user',
    slug: 'usr-roles',
    priority: 80,
  },
  {
    pattern: /Permissions?$/,
    domain: 'user',
    slug: 'usr-roles',
    priority: 80,
  },
  {
    pattern: /Options?$/,
    domain: 'site',
    slug: 'site-opt',
    priority: 70,
  },
  {
    pattern: /Settings?$/,
    domain: 'site',
    slug: 'site-set',
    priority: 70,
  },
  {
    pattern: /Display$/,
    domain: 'record',
    slug: 'rec-dis',
    priority: 70,
  },
  {
    pattern: /Template$/,
    domain: 'record',
    slug: 'rec-template',
    priority: 70,
  },
  {
    pattern: /Console$/,
    domain: 'helper',
    slug: 'hlp-console',
    priority: 70,
  },
  {
    pattern: /Admin$/,
    domain: 'dashboard',
    slug: 'dash-core',
    priority: 60,
  },
  {
    pattern: /Core$/,
    domain: 'dashboard',
    slug: 'dash-core',
    priority: 60,
  },
  {
    pattern: /Dashboard$/,
    domain: 'dashboard',
    slug: 'dash-core',
    priority: 60,
  },

  // Generic patterns (lowest priority)
  {
    pattern: /^.*$/,
    domain: 'shared',
    slug: 'shared',
    priority: 10,
  },
];

/**
 * Determine domain and slug for a component
 */
export function detectDomainAndSlug(componentName: string): { domain: string; slug: string } {
  // Find the highest priority matching rule
  let bestMatch: SlugRule | null = null;
  
  for (const rule of SLUG_RULES) {
    if (rule.pattern.test(componentName)) {
      if (!bestMatch || rule.priority > bestMatch.priority) {
        bestMatch = rule;
      }
    }
  }

  if (!bestMatch) {
    // Fallback to generic
    return { domain: 'shared', slug: 'shared' };
  }

  const domain = DOMAIN_MAPPINGS[bestMatch.domain] || `${bestMatch.domain}-management`;
  
  return {
    domain,
    slug: bestMatch.slug,
  };
}

/**
 * Generate the destination path for a component
 */
export function generateDestinationPath(
  componentName: string,
  fromPath: string
): string {
  const { domain, slug } = detectDomainAndSlug(componentName);
  
  // Extract the file extension
  const ext = fromPath.split('.').pop() || 'tsx';
  
  return `src/components/${domain}/${slug}/${componentName}.${ext}`;
}

/**
 * Check if a component has mixed usage (admin + public)
 */
export function checkMixedUsage(
  componentName: string,
  fromPath: string
): { hasMixedUsage: boolean; reason?: string } {
  // Simple heuristic: if it's in views/admin/, it's admin-only
  if (fromPath.includes('/admin/')) {
    return { hasMixedUsage: false };
  }

  // If it's in views/ but not admin/, it might be public
  if (fromPath.includes('/views/') && !fromPath.includes('/admin/')) {
    return { 
      hasMixedUsage: true, 
      reason: 'Component in views/ may have mixed admin/public usage' 
    };
  }

  return { hasMixedUsage: false };
}
