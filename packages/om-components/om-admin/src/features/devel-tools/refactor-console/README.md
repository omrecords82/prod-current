# Refactor Console

A comprehensive developer tool for analyzing codebase structure, detecting duplicates, usage patterns, and refactoring opportunities.

## Features

### Code Analysis
- **File Discovery**: Scans `/var/www/orthodoxmetrics/prod/front-end/src/**` and `/var/www/orthodoxmetrics/prod/server/**`
- **Usage Analysis**: Tracks import references, server dependencies, route usage, and runtime hints
- **Smart Classification**: Files are classified as:
  - 🟢 **Green (Production Ready)**: Likely in production and actively used
  - 🟠 **Orange (High Risk)**: Used by multiple feature areas or core systems
  - 🟡 **Yellow (In Development)**: Development files or low usage, recent edits
  - 🔴 **Red (Legacy/Duplicate)**: Duplicates, legacy patterns, or old files

### Duplicate Detection
- **Exact Duplicates**: MD5 hash comparison for identical files
- **Near-Duplicates**: Levenshtein similarity analysis for similar filenames
- **Similarity Scoring**: Configurable thresholds (≥0.85 for near-matches, ≥0.9 for high-risk)

### Interactive UI
- **Virtualized Tree**: Handles large codebases with virtual scrolling
- **Advanced Filtering**: By classification, file type, modification date, duplicated status
- **Smart Sorting**: By usage score, name, modification time, or classification priority
- **Real-time Search**: File name and path search with instant results

## Installation

### Prerequisites
Ensure the following dependencies are installed:

**Frontend Dependencies (already added):**
```json
{
  "react-window": "^1.8.6",
  "react-hot-toast": "^2.4.1"
}
```

**Backend Dependencies (already added):**
```json
{
  "fs-extra": "^11.1.1",
  "glob": "^10.3.10",
  "ts-morph": "^27.0.0"
}
```

### Installation Steps

1. **Install Dependencies**:
   ```bash
   # Frontend dependencies
   cd /var/www/orthodoxmetrics/prod/front-end
   npm install

   # Backend dependencies
   cd /var/www/orthodoxmetrics/prod/server
   npm install
   ```

2. **Restart Services**:
   ```bash
   # Restart the backend to load new routes
   pm2 restart orthodoxmetrics-server

   # Rebuild frontend
   cd /var/www/orthodoxmetrics/prod/front-end
   npm run build
   ```

## Usage

### Accessing the Tool
1. Navigate to **Developer Tools > Refactor Console** in the sidebar menu
2. Or visit `/devel-tools/refactor-console` directly
3. Requires `super_admin` or `admin` role

### Performing Analysis
1. **Initial Scan**: Automatically performs on first visit
2. **Refresh**: Updates from cache (refreshes if >10 minutes old)
3. **Full Analysis**: Click "Analyze" button to force a complete rebuild

### Interpreting Results

#### Classification Legend
- **Green Files**: Core production files with high usage scores
- **Orange Files**: High-impact files that affect multiple systems
- **Yellow Files**: Development/testing files or recently modified code
- **Red Files**: Suspected duplicates or legacy code

#### Usage Scores
Composite score calculated as:
- Import References × 4
- Server References × 3
- Route References × 5
- Runtime Hints × 2

#### Risk Indicators
- **Import References**: How often other files import this file
- **Server References**: Server-side require()/import() usage
- **Route References**: Mentions in Router/Menu or route definitions
- **Runtime Hints**: Files observed in server middleware/controllers

## API Endpoints

### GET `/api/refactor-console/scan`
Scan the codebase and return analysis results.

**Query Parameters:**
- `rebuild`: `0` (use cache) or `1` (force rebuild)

**Response:**
```typescript
interface RefactorScan {
  generatedAt: string;
  root: string;
  summary: {
    totalFiles: number;
    totalDirs: number;
    duplicates: number;
    likelyInProd: number;
    highRisk: number;
    inDevelopment: number;
    legacyOrDupes: number;
  };
  nodes: FileNode[];
}
```

### Caching
- Analysis results are cached at `/var/www/orthodoxmetrics/prod/.analysis/refactor-scan.json`
- Cache auto-refreshes every 10 minutes
- Use `?rebuild=1` to force immediate rebuild

## Configuration

### File Patterns

**Include Patterns:**
- `/var/www/orthodoxmetrics/prod/front-end/src/**`
- `/var/www/orthodoxmetrics/prod/server/**`

**Exclude Patterns:**
- `**/node_modules/**`
- `**/dist/**`
- `**/.git/**`
- `**/.next/**`
- `**/build/**`
- `**/.cache/**`
- `**/coverage/**`
- `**/.nyc_output/**`

### Classification Heuristics

**Green (Production)**: Files in `front-end/src/features/**` with usage score ≥5 and referenced in routes

**Orange (High Risk)**: Files used by ≥2 distinct feature areas OR imported by auth/layout/core providers OR server middleware with ≥3 refs

**Yellow (Development)**: Files under `devel-*`, `demos/`, `examples/`, `sandbox/` OR files with usage score <3 and modified in last 14 days

**Red (Legacy/Duplicate)**: Exact duplicate exists elsewhere OR near-duplicate ≥0.9 similarity OR files under `legacy/`, `old/`, `backup/`, `-copy/`, `.bak`, `.old` patterns

## Troubleshooting

### Common Issues

**1. Analysis Takes Too Long**
- Large codebases may take several minutes for initial scan
- Consider adjusting include/exclude patterns if necessary
- Monitor server CPU usage during analysis

**2. High Memory Usage**
- Analysis uses worker threads for hashing and similarity calculations
- Monitor memory usage with very large codebases
- Consider running analysis during low-traffic periods

**3. Cache Issues**
- Clear cache by deleting `/var/www/orthodoxmetrics/prod/.analysis/refactor-scan.json`
- Force rebuild with `?rebuild=1` parameter

**4. Permission Errors**
- Ensure server has read access to all included directories
- Check file permissions for the `.analysis` directory

### Performance Notes
- Virtualized tree handles thousands of files efficiently
- Search is debounced for responsive UX
- Analysis runs in background worker threads
- Results are cached to avoid repeated expensive computations

## Development

### File Structure
```
src/features/devel-tools/refactor-console/
├── RefactorConsole.tsx          # Main page component
├── api/
│   └── refactorConsoleClient.ts # API client
├── hooks/
│   └── useRefactorScan.ts       # Data management hook
├── components/
│   ├── Tree.tsx                 # Virtualized file tree
│   ├── Legend.tsx               # Classification legend
│   └── Toolbar.tsx              # Search and filter controls
└── README.md                    # This file
```

### Backend Structure
```
server/src/routes/
└── refactorConsole.ts           # Express router with scan logic
```

### Contributing
When adding new analysis features:
1. Update `RefactorScan` interface in types
2. Modify classification logic in backend
3. Update frontend components to display new data
4. Add corresponding tests

## License
Same as the OrthodoxMetrics project.
