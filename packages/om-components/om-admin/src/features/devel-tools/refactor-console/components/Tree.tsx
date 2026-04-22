import { RecoveryStatus, TreeItem } from '@/types/refactorConsole';
import { useTheme } from '@mui/material/styles';
import {
    AlertTriangle,
    CheckCircle,
    ChevronDown,
    ChevronRight,
    Clock,
    Copy,
    ExternalLink,
    Eye,
    FileCheck,
    FileCode,
    FileX,
    Folder,
    RotateCcw,
    Shield,
    ShieldOff,
    XCircle
} from '@/ui/icons';
import React, { memo, useEffect, useState } from 'react';

// Browser-compatible path utilities
const pathBasename = (filePath: string): string => {
  const parts = filePath.split('/');
  return parts[parts.length - 1] || '/';
};

const pathExtname = (filePath: string): string => {
  const basename = pathBasename(filePath);
  const lastDot = basename.lastIndexOf('.');
  return lastDot >= 0 ? basename.slice(lastDot) : '';
};

const pathDirname = (filePath: string): string => {
  const parts = filePath.split('/');
  return parts.slice(0, -1).join('/') || '/';
};

interface TreeProps {
  treeItems: TreeItem[];
  expandedPaths: Set<string>;
  onToggleExpanded: (path: string) => void;
  onNodeAction: (action: string, node: TreeItem) => void;
  className?: string;
  isDark?: boolean;
  isWhitelisted?: (relPath: string) => boolean;
  onToggleWhitelist?: (relPath: string) => void;
}


const getRecoveryStatusIcon = (recoveryStatus?: RecoveryStatus) => {
  if (!recoveryStatus) return null;
  
  switch (recoveryStatus) {
    case 'missing_in_prod':
      return <FileX className="w-4 h-4 text-purple-500" title="Missing in production" />;
    case 'modified_since_backup':
      return <AlertTriangle className="w-4 h-4 text-orange-500" title="Modified since backup" />;
    case 'new_file':
      return <FileCheck className="w-4 h-4 text-green-500" title="New file (not in backup)" />;
    case 'unchanged':
      return <CheckCircle className="w-4 h-4 text-gray-400" title="Unchanged since backup" />;
    default:
      return null;
  }
};

const getRecoveryStatusColor = (recoveryStatus?: RecoveryStatus): string => {
  if (!recoveryStatus) return '';
  
  switch (recoveryStatus) {
    case 'missing_in_prod':
      return 'border-l-4 border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/20';
    case 'modified_since_backup':
      return 'border-l-4 border-orange-500 dark:border-orange-400 bg-orange-50 dark:bg-orange-900/20';
    case 'new_file':
      return 'border-l-4 border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20';
    case 'unchanged':
      return '';
    default:
      return '';
  }
};

const getClassificationIcon = (classification: string) => {
  switch (classification) {
    case 'green':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'orange':
      return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    case 'yellow':
      return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'red':
        return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return <FileCode className="w-4 h-4 text-gray-400" />;
  }
};

// Text colors are now handled inline in TreeNode using isDark prop

const getFileIcon = (filePath: string) => {
  const extension = pathExtname(filePath).toLowerCase();
  
  switch (extension) {
    case 'tsx':
    case 'ts':
      return <FileCode className="w-4 h-4 text-blue-500" />;
    case 'jsx':
    case 'js':
      return <FileCode className="w-4 h-4 text-yellow-500" />;
    case 'css':
    case 'scss':
      return <FileCode className="w-4 h-4 text-purple-500" />;
    case 'json':
      return <FileCode className="w-4 h-4 text-green-500" />;
    default:
      return <FileCode className="w-4 h-4 text-gray-400" />;
  }
};

interface TreeNodeProps {
  item: TreeItem;
  level: number;
  onToggleExpanded: (path: string) => void;
  onNodeAction: (action: string, node: TreeItem) => void;
  showBadges?: boolean;
  isDark?: boolean;
  isWhitelisted?: boolean;
  onToggleWhitelist?: (relPath: string) => void;
}

const TreeNode = memo<TreeNodeProps>(({
  item,
  level,
  onToggleExpanded,
  onNodeAction,
  showBadges = true,
  isDark = false,
  isWhitelisted = false,
  onToggleWhitelist
}) => {
  const isExpanded = item.expanded;
  const hasChildren = item.children && item.children.length > 0;
  const isDirectory = item.type === 'dir';
  
  const indentStyle = { marginLeft: `${level * 16}px` };
  
  // Get text color based on classification and dark mode
  const getTextColor = () => {
    switch (item.classification) {
      case 'green': return isDark ? '#4ade80' : '#15803d';
      case 'orange': return isDark ? '#fb923c' : '#c2410c';
      case 'yellow': return isDark ? '#facc15' : '#a16207';
      case 'red': return isDark ? '#f87171' : '#b91c1c';
      default: return isDark ? '#d1d5db' : '#374151';
    }
  };
  
  const textColor = getTextColor();
  
  const handleAction = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    onNodeAction(action, item);
  };
  
  const renderBadges = () => {
    if (!showBadges) return null;
    
    const badges = [];
    
    // Badge style helper - more subtle and professional
    const getBadgeStyle = (type: string) => {
      const styles: Record<string, { bg: string; text: string; border?: string }> = {
        purple: {
          bg: isDark ? 'rgba(147, 51, 234, 0.15)' : 'rgba(147, 51, 234, 0.1)',
          text: isDark ? '#c084fc' : '#9333ea',
          border: isDark ? 'rgba(147, 51, 234, 0.3)' : 'rgba(147, 51, 234, 0.2)'
        },
        orange: {
          bg: isDark ? 'rgba(234, 88, 12, 0.15)' : 'rgba(234, 88, 12, 0.1)',
          text: isDark ? '#fb923c' : '#ea580c',
          border: isDark ? 'rgba(234, 88, 12, 0.3)' : 'rgba(234, 88, 12, 0.2)'
        },
        green: {
          bg: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)',
          text: isDark ? '#4ade80' : '#16a34a',
          border: isDark ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)'
        },
        yellow: {
          bg: isDark ? 'rgba(234, 179, 8, 0.15)' : 'rgba(234, 179, 8, 0.1)',
          text: isDark ? '#facc15' : '#ca8a04',
          border: isDark ? 'rgba(234, 179, 8, 0.3)' : 'rgba(234, 179, 8, 0.2)'
        },
        red: {
          bg: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
          text: isDark ? '#f87171' : '#dc2626',
          border: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)'
        },
        blue: {
          bg: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
          text: isDark ? '#60a5fa' : '#2563eb',
          border: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'
        },
        gray: {
          bg: isDark ? 'rgba(156, 163, 175, 0.15)' : 'rgba(156, 163, 175, 0.1)',
          text: isDark ? '#9ca3af' : '#6b7280',
          border: isDark ? 'rgba(156, 163, 175, 0.3)' : 'rgba(156, 163, 175, 0.2)'
        }
      };
      return styles[type] || styles.gray;
    };
    
    // Whitelist badge (highest priority)
    if (isWhitelisted) {
      const shieldStyle = getBadgeStyle('blue');
      badges.push(
        <span
          key="whitelist"
          className="text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1"
          style={{
            backgroundColor: shieldStyle.bg,
            color: shieldStyle.text,
            border: `1px solid ${shieldStyle.border}`
          }}
        >
          <Shield className="w-3 h-3" />
          Protected
        </span>
      );
    }

    // Recovery status badge (highest priority) - only show if not unchanged
    if (item.recoveryStatus && item.recoveryStatus !== 'unchanged') {
      const statusLabels = {
        'missing_in_prod': 'Missing',
        'modified_since_backup': 'Modified',
        'new_file': 'New'
      };
      const statusTypes = {
        'missing_in_prod': 'purple',
        'modified_since_backup': 'orange',
        'new_file': 'green'
      };
      const style = getBadgeStyle(statusTypes[item.recoveryStatus]);
      badges.push(
        <span 
          key="recovery"
          className="text-xs px-2 py-0.5 rounded font-medium"
          style={{
            backgroundColor: style.bg,
            color: style.text,
            border: `1px solid ${style.border}`
          }}
        >
          {statusLabels[item.recoveryStatus]}
        </span>
      );
    }
    
    // Classification badge - only show if not green (green = good, no need to highlight)
    if (item.classification !== 'green') {
      const classStyle = getBadgeStyle(
        item.classification === 'orange' ? 'orange' :
        item.classification === 'yellow' ? 'yellow' : 'red'
      );
      badges.push(
        <span 
          key="classification"
          className="text-xs px-2 py-0.5 rounded font-medium uppercase"
          style={{
            backgroundColor: classStyle.bg,
            color: classStyle.text,
            border: `1px solid ${classStyle.border}`
          }}
        >
          {item.classification}
        </span>
      );
    }
    
    // Usage score badge - only show if score is 0 (problematic)
    if (item.type === 'file' && item.usage.score === 0) {
      const blueStyle = getBadgeStyle('blue');
      badges.push(
        <span 
          key="score" 
          className="text-xs px-2 py-0.5 rounded font-medium"
          style={{
            backgroundColor: blueStyle.bg,
            color: blueStyle.text,
            border: `1px solid ${blueStyle.border}`
          }}
        >
          Score: 0
        </span>
      );
    }
    
    // Duplicate badge - show with icon
    if (item.similarity?.duplicates.length || item.similarity?.nearMatches.length) {
      const redStyle = getBadgeStyle('red');
      badges.push(
        <span 
          key="duplicates" 
          className="text-xs px-2 py-0.5 rounded font-medium flex items-center gap-1"
          style={{
            backgroundColor: redStyle.bg,
            color: redStyle.text,
            border: `1px solid ${redStyle.border}`
          }}
        >
          <Copy className="w-3 h-3" />
          {item.similarity.duplicates.length + item.similarity.nearMatches.length}
        </span>
      );
    }
    
    return (
      <div className="flex gap-1.5 items-center">
        {badges}
      </div>
    );
  };
  
  return (
    <div 
      className="group flex items-center gap-3 px-4 py-2.5 cursor-pointer"
      style={{
        ...indentStyle,
        backgroundColor: 'transparent',
        transition: 'all 0.2s ease',
        borderBottom: `1px solid ${isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(229, 231, 235, 0.5)'}`
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)';
        e.currentTarget.style.borderLeftColor = isDark ? '#3b82f6' : '#60a5fa';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.borderLeftColor = 'transparent';
      }}
    >
      {/* LEFT SIDE: icons + name */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {/* Expand/Collapse Button - Chevron Disclosure */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpanded(item.path);
            }}
            className="flex h-6 w-6 items-center justify-center rounded transition-colors"
            style={{ 
              color: isDark ? 'rgba(156, 163, 175, 0.7)' : 'rgba(107, 114, 128, 0.7)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(243, 244, 246, 1)';
              e.currentTarget.style.color = isDark ? '#f3f4f6' : '#1f2937';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = isDark ? 'rgba(156, 163, 175, 0.7)' : 'rgba(107, 114, 128, 0.7)';
            }}
            aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
            title={isExpanded ? 'Collapse folder' : 'Expand folder'}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <div className="h-6 w-6" />
        )}
        
        {/* File/Directory Icon */}
        {isDirectory ? (
          <Folder 
            className="h-4 w-4 flex-shrink-0" 
            style={{ 
              color: isDark ? '#60a5fa' : '#3b82f6',
              strokeWidth: 2,
              fill: 'none'
            }} 
          />
        ) : (
          <div className="flex-shrink-0" style={{ backgroundColor: 'transparent' }}>{getFileIcon(item.path)}</div>
        )}
        
        {/* Recovery Status Icon (if in recovery mode) */}
        {item.recoveryStatus && (
          <div className="flex items-center flex-shrink-0" style={{ backgroundColor: 'transparent' }}>
            {getRecoveryStatusIcon(item.recoveryStatus)}
          </div>
        )}
        
        {/* Classification Icon */}
        <div className="flex items-center flex-shrink-0" style={{ backgroundColor: 'transparent' }}>
          {getClassificationIcon(item.classification)}
        </div>
        
        {/* File/Directory Name */}
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium" style={{ color: textColor }}>
            {item.type === 'dir' ? pathBasename(item.path) : pathBasename(item.relPath)}
          </div>
          {item.type === 'file' && (
            <div 
              className="truncate text-xs"
              style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
            >
              {item.relPath}
            </div>
          )}
        </div>
      </div>
      
      {/* RIGHT SIDE: always present, fixed width */}
      <div className="ml-auto flex w-[170px] items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
        {/* Whitelist toggle */}
        {item.type === 'file' && onToggleWhitelist && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleWhitelist(item.relPath);
            }}
            className="rounded p-1.5 transition-colors"
            style={{ color: isWhitelisted ? (isDark ? '#60a5fa' : '#2563eb') : (isDark ? '#d1d5db' : '#4b5563') }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = isWhitelisted ? (isDark ? '#93c5fd' : '#1d4ed8') : (isDark ? '#60a5fa' : '#3b82f6');
              e.currentTarget.style.backgroundColor = isWhitelisted ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = isWhitelisted ? (isDark ? '#60a5fa' : '#2563eb') : (isDark ? '#d1d5db' : '#4b5563');
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title={isWhitelisted ? 'Remove from whitelist (unprotect)' : 'Add to whitelist (protect from modifications)'}
          >
            {isWhitelisted ? <Shield className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
          </button>
        )}

        <button
          onClick={(e) => handleAction(e, 'copy')}
          className="rounded p-1.5 transition-colors hover:bg-blue-500/20"
          style={{ color: isDark ? '#d1d5db' : '#4b5563' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = isDark ? '#60a5fa' : '#3b82f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = isDark ? '#d1d5db' : '#4b5563';
          }}
          title="Copy relative path"
        >
          <Copy className="h-4 w-4" />
        </button>
        
        {item.type === 'file' && (
          <button
            onClick={(e) => handleAction(e, 'open')}
            className="rounded p-1.5 transition-colors hover:bg-blue-500/20"
            style={{ color: isDark ? '#d1d5db' : '#4b5563' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = isDark ? '#60a5fa' : '#3b82f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = isDark ? '#d1d5db' : '#4b5563';
            }}
            title="Open in editor"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        )}
        
        {/* Restore button (only for missing files) */}
        {item.recoveryStatus === 'missing_in_prod' && item.type === 'file' && (
          <button
            onClick={(e) => handleAction(e, 'restore')}
            className="rounded p-1.5 transition-colors hover:bg-purple-500/20"
            style={{ color: isDark ? '#c084fc' : '#9333ea' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = isDark ? '#e9d5ff' : '#7e22ce';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = isDark ? '#c084fc' : '#9333ea';
            }}
            title="Restore from backup"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
        
        <button
          onClick={(e) => handleAction(e, 'reasons')}
          className="rounded p-1.5 transition-colors hover:bg-blue-500/20"
          style={{ color: isDark ? '#d1d5db' : '#4b5563' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = isDark ? '#60a5fa' : '#3b82f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = isDark ? '#d1d5db' : '#4b5563';
          }}
          title="View classification reasons"
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>
      
      {/* Badges */}
      <div className="flex-shrink-0 ml-auto">
        {renderBadges()}
      </div>
    </div>
  );
});

const Tree = memo<TreeProps>(({
  treeItems,
  expandedPaths,
  onToggleExpanded,
  onNodeAction,
  className = '',
  isDark: isDarkProp,
  isWhitelisted,
  onToggleWhitelist
}) => {
  const theme = useTheme();
  const isDark = isDarkProp !== undefined ? isDarkProp : theme.palette.mode === 'dark';
  const [flattenedList, setFlattenedList] = useState<TreeItem[]>([]);
  
  // Flatten tree for virtualization
  const flattenTree = (items: TreeItem[], level: number = 0): TreeItem[] => {
    const result: TreeItem[] = [];
    
    items.forEach(item => {
      const flattenedItem = { ...item, level };
      result.push(flattenedItem);
      
      if (item.children && item.children.length > 0 && item.expanded) {
        result.push(...flattenTree(item.children, level + 1));
      }
    });
    
    return result;
  };
  
  useEffect(() => {
    const flattened = flattenTree(treeItems);
    setFlattenedList(flattened);
  }, [treeItems, expandedPaths]);
  
  if (treeItems.length === 0) {
    return (
      <div 
        className="flex items-center justify-center h-64 rounded-lg"
        style={{
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
          color: isDark ? '#9ca3af' : '#6b7280'
        }}
      >
        <div className="text-center">
          <FileCode 
            className="w-8 h-8 mx-auto mb-2" 
            style={{ color: isDark ? '#6b7280' : '#9ca3af' }}
          />
          <p>No files found matching current filters</p>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className={`rounded-lg ${className}`}
      style={{
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`
      }}
    >
      <div 
        className="p-4"
        style={{
          backgroundColor: isDark ? 'rgba(55, 65, 81, 0.5)' : '#f9fafb',
          borderBottom: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`
        }}
      >
        <div className="flex items-center justify-between">
          <h3 
            className="font-medium"
            style={{ color: isDark ? '#f3f4f6' : '#111827' }}
          >
            File Tree ({flattenedList.length} items)
          </h3>
          <div 
            className="text-sm"
            style={{ color: isDark ? '#9ca3af' : '#6b7280' }}
          >
            {treeItems.length} root items
          </div>
        </div>
      </div>
      
      <div 
        className="overflow-auto" 
        style={{ 
          maxHeight: '600px',
          backgroundColor: isDark ? '#1f2937' : '#ffffff'
        }}
      >
        {flattenedList.map((item, index) => (
          <TreeNode
            key={`${item.path}-${index}`}
            item={item}
            level={(item as any).level || 0}
            onToggleExpanded={onToggleExpanded}
            onNodeAction={onNodeAction}
            isDark={isDark}
            isWhitelisted={isWhitelisted ? isWhitelisted(item.relPath) : false}
            onToggleWhitelist={onToggleWhitelist}
          />
        ))}
      </div>
    </div>
  );
});

Tree.displayName = 'Tree';
TreeNode.displayName = 'TreeNode';

export default Tree;
