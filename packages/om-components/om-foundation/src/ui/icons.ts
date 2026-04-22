/**
 * Canonical Icon Registry
 *
 * Single source of truth for all Lucide icons used across the application.
 *
 * WHY THIS EXISTS:
 *   Some Lucide icon names collide with browser globals (Lock, History, etc.).
 *   Importing them directly from 'lucide-react' in a file that doesn't explicitly
 *   import them can cause the browser global (e.g. Web Locks API `Lock`) to be
 *   used instead, resulting in "Illegal constructor" at runtime.
 *
 * RULES:
 *   1. Import icons from '@/ui/icons' (or '@/shared/ui/icons' for legacy).
 *   2. Do NOT import directly from 'lucide-react' in feature code.
 *   3. Browser-global-colliding names also have *Icon aliases (LockIcon, etc.).
 *   4. AG Grid icons must use string SVG markup — see '@/ui/agGridIcons'.
 *
 * Usage:
 *   import { Plus, Pencil, LockIcon, Search } from '@/ui/icons';
 */

// ── Re-export all Lucide icons used in the codebase ────────────────────────

export {
  // Action
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Edit,
  Copy,
  Share2,
  ClipboardList,

  // Navigation
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Globe,

  // UI / Layout
  Search,
  Filter,
  Eye,
  EyeOff,
  Settings,
  Palette,
  LayoutGrid,
  LayoutList,
  List,
  Table,
  Columns,
  Grid,
  Maximize2,
  Minimize2,
  SortAsc,
  SortDesc,
  Circle,
  Table2,
  TableProperties,

  // Data / Files
  Download,
  Upload,
  RefreshCw,
  ArrowUpDown,
  FileText,
  FileBarChart,
  FileCheck,
  FileCode,
  FileSearch,
  FileX,
  Folder,
  FolderOpen,
  Package,

  // Users / People
  Users,
  User,

  // Security — DANGEROUS NAMES (collide with browser globals)
  Lock,
  Unlock,
  Shield,
  ShieldOff,

  // Status / Feedback
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Loader2,
  Info,
  Check,
  HelpCircle,
  Zap,

  // Utility
  MoreVertical,
  Database,
  BarChart3,
  HardDrive,
  Code,
  GitBranch,
  GitCompare,
  Wrench,
  ScanLine,

  // Communication
  Mail,
  Phone,

  // Buildings
  Building2,

  // Domain-specific
  Calendar,
  CalendarDays,
  Bell,
  Bookmark,
  Star,
  Heart,
  Home,
  Activity,
  Play,
  RotateCcw,
  Archive,
  BookOpen,
  Church,
  Coffee,
  Cross,
  Crown,
  Fish,
  Flame,
  History,
  MapPin,
  Milk,
  Scroll,
  ScrollText,
} from 'lucide-react';

// ── Type re-exports ─────────────────────────────────────────────────────────
export type { LucideIcon } from 'lucide-react';

// ── Safe aliases for browser-global-colliding names ────────────────────────
// Use these when you want extra safety or clarity.

export {
  Lock as LockIcon,
  Unlock as UnlockIcon,
  History as HistoryIcon,
  Table as TableIcon,
} from 'lucide-react';
