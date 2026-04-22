/**
 * AG Grid Icon Map
 *
 * AG Grid requires icon overrides as plain HTML strings, NOT React components.
 * Passing a React component (e.g. `<Lock />`) causes "Illegal constructor" errors.
 *
 * Usage:
 *   import { agGridIconMap } from '@/ui/agGridIcons';
 *   <AgGridReact icons={agGridIconMap} ... />
 *
 * To add icons: import from '@/ui/icons', wrap with svg().
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  SortAsc,
  SortDesc,
  Filter,
  Columns,
  Search,
  X,
  Check,
  Maximize2,
  Minimize2,
  Copy,
  Eye,
  EyeOff,
  Download,
  Pencil,
} from '@/ui/icons';

import type { LucideIcon } from 'lucide-react';

/** Convert a Lucide component into an SVG HTML string for AG Grid. */
const svg = (Cmp: LucideIcon, size = 16): string =>
  renderToStaticMarkup(createElement(Cmp, { size }));

/**
 * Map AG Grid internal icon names → SVG markup strings.
 * See: https://www.ag-grid.com/react-data-grid/custom-icons/
 */
export const agGridIconMap: Record<string, string> = {
  // Sorting
  sortAscending: svg(SortAsc),
  sortDescending: svg(SortDesc),
  sortUnSort: svg(ChevronDown),

  // Menu & Filter
  menu: svg(ChevronDown),
  filter: svg(Filter),
  columns: svg(Columns),

  // Navigation
  first: svg(ChevronLeft),
  previous: svg(ChevronLeft),
  next: svg(ChevronRight),
  last: svg(ChevronRight),

  // Row groups
  groupExpanded: svg(ChevronDown),
  groupContracted: svg(ChevronRight),

  // Column operations
  columnMoveMove: svg(Maximize2),
  columnMoveHide: svg(EyeOff),
  columnMovePin: svg(Minimize2),

  // Clipboard
  copy: svg(Copy),

  // Selection
  checkboxChecked: svg(Check),
  checkboxUnchecked: svg(X),

  // Cell
  cellEdit: svg(Pencil),

  // Misc
  search: svg(Search),
  cancel: svg(X),
  eye: svg(Eye),
  eyeSlash: svg(EyeOff),
  csvExport: svg(Download),
  excelExport: svg(Download),
};
