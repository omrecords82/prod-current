import {
    Alert,
    alpha,
    Badge,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    Collapse,
    IconButton,
    InputAdornment,
    LinearProgress,
    Paper,
    Stack,
    TextField,
    Tooltip,
    Typography,
    useTheme,
} from '@mui/material';
import {
    IconCalendar,
    IconChartBar,
    IconChevronDown,
    IconChevronRight,
    IconDownload,
    IconFiles,
    IconFileText,
    IconMessage,
    IconRobot,
    IconSearch,
    IconSortAscending,
    IconSortDescending,
    IconUser,
    IconX,
} from '@tabler/icons-react';
import React from 'react';

import type {
    ConversationDetail,
    ConversationMessage,
    ConversationSummary,
    SearchResult,
    Stats,
} from './types';

export interface ConversationsTabProps {
    conversations: ConversationSummary[];
    byDate: Record<string, ConversationSummary[]>;
    loading: boolean;
    error: string;

    searchQuery: string;
    searchResults: SearchResult[] | null;
    searching: boolean;

    expandedDates: Set<string>;
    expandedConversation: string | null;
    conversationDetail: ConversationDetail | null;
    loadingDetail: boolean;

    stats: Stats | null;
    showStats: boolean;
    filterType: 'all' | 'agent' | 'direct' | 'cascade';

    sortField: 'date' | 'size' | 'messages';
    sortDir: 'asc' | 'desc';
    selectedConvs: Set<string>;
    exporting: boolean;

    filteredByDate: Record<string, ConversationSummary[]>;
    filteredDates: string[];
    sortedDates: string[];

    reviewLoading: boolean;

    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClearSearch: () => void;
    onSetFilterType: (type: 'all' | 'agent' | 'direct' | 'cascade') => void;
    onSetSortField: (field: 'date' | 'size' | 'messages') => void;
    onToggleSortDir: () => void;
    onSetSelectedConvs: (convs: Set<string>) => void;
    onToggleConvSelection: (filename: string) => void;
    onSelectAllForDate: (date: string) => void;
    onToggleDate: (date: string) => void;
    onFetchDetail: (filename: string) => void;
    onCombineExport: (date?: string) => void;
    onExportSingle: (filename: string) => void;
    onReviewSelected: () => void;
}

const ConversationsTab: React.FC<ConversationsTabProps> = ({
    conversations,
    byDate,
    loading,
    error,
    searchQuery,
    searchResults,
    searching,
    expandedDates,
    expandedConversation,
    conversationDetail,
    loadingDetail,
    stats,
    showStats,
    filterType,
    sortField,
    sortDir,
    selectedConvs,
    exporting,
    filteredByDate,
    filteredDates,
    sortedDates,
    reviewLoading,
    onSearchChange,
    onClearSearch,
    onSetFilterType,
    onSetSortField,
    onToggleSortDir,
    onSetSelectedConvs,
    onToggleConvSelection,
    onSelectAllForDate,
    onToggleDate,
    onFetchDetail,
    onCombineExport,
    onExportSingle,
    onReviewSelected,
}) => {
    const theme = useTheme();

    // ─── Formatting helpers ──────────────────────────────────────

    const formatDate = (dateStr: string) => {
        try {
            const d = new Date(dateStr + 'T00:00:00');
            return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const highlightQuery = (text: string, query: string) => {
        if (!query) return text;
        const idx = text.toLowerCase().indexOf(query.toLowerCase());
        if (idx === -1) return text;
        return (
            <>
                {text.substring(0, idx)}
                <Box component="span" sx={{ bgcolor: 'warning.light', color: 'warning.contrastText', px: 0.3, borderRadius: 0.5, fontWeight: 700 }}>
                    {text.substring(idx, idx + query.length)}
                </Box>
                {text.substring(idx + query.length)}
            </>
        );
    };

    // ─── Markdown rendering helpers ──────────────────────────────

    const renderInlineMarkdown = (text: string): React.ReactNode => {
        const parts: React.ReactNode[] = [];
        let remaining = text;
        let key = 0;

        while (remaining.length > 0) {
            // Inline code
            const codeMatch = remaining.match(/`([^`]+)`/);
            // Bold
            const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);

            let firstMatch: { type: string; index: number; full: string; inner: string } | null = null;

            if (codeMatch && codeMatch.index !== undefined) {
                firstMatch = { type: 'code', index: codeMatch.index, full: codeMatch[0], inner: codeMatch[1] };
            }
            if (boldMatch && boldMatch.index !== undefined) {
                if (firstMatch === null || boldMatch.index < firstMatch.index) {
                    firstMatch = { type: 'bold', index: boldMatch.index, full: boldMatch[0], inner: boldMatch[1] };
                }
            }

            if (!firstMatch) {
                parts.push(remaining);
                break;
            }

            if (firstMatch.index > 0) {
                parts.push(remaining.substring(0, firstMatch.index));
            }

            if (firstMatch.type === 'code') {
                parts.push(
                    <Box
                        key={`inline-${key++}`}
                        component="code"
                        sx={{
                            bgcolor: alpha(theme.palette.text.primary, 0.08),
                            px: 0.5,
                            py: 0.1,
                            borderRadius: 0.5,
                            fontSize: '0.85em',
                            fontFamily: 'monospace',
                        }}
                    >
                        {firstMatch.inner}
                    </Box>
                );
            } else if (firstMatch.type === 'bold') {
                parts.push(
                    <Box key={`inline-${key++}`} component="strong" sx={{ fontWeight: 700 }}>
                        {firstMatch.inner}
                    </Box>
                );
            }

            remaining = remaining.substring(firstMatch.index + firstMatch.full.length);
        }

        return <>{parts}</>;
    };

    const renderMarkdown = (content: string) => {
        const lines = content.split('\n');
        const elements: React.ReactNode[] = [];
        let inCodeBlock = false;
        let codeBlockContent: string[] = [];
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        let codeBlockLang = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.startsWith('```')) {
                if (inCodeBlock) {
                    elements.push(
                        <Box
                            key={`code-${i}`}
                            component="pre"
                            sx={{
                                bgcolor: alpha(theme.palette.text.primary, 0.05),
                                border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                                borderRadius: 1,
                                p: 1.5,
                                my: 1,
                                overflow: 'auto',
                                fontSize: '0.8rem',
                                fontFamily: 'monospace',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                            }}
                        >
                            {codeBlockContent.join('\n')}
                        </Box>
                    );
                    codeBlockContent = [];
                    inCodeBlock = false;
                } else {
                    inCodeBlock = true;
                    codeBlockLang = line.substring(3).trim();
                }
                continue;
            }

            if (inCodeBlock) {
                codeBlockContent.push(line);
                continue;
            }

            // Headers
            if (line.startsWith('### ')) {
                elements.push(
                    <Typography key={i} variant="subtitle2" sx={{ fontWeight: 700, mt: 1.5, mb: 0.5 }}>
                        {line.substring(4)}
                    </Typography>
                );
                continue;
            }
            if (line.startsWith('## ')) {
                elements.push(
                    <Typography key={i} variant="subtitle1" sx={{ fontWeight: 700, mt: 2, mb: 0.5 }}>
                        {line.substring(3)}
                    </Typography>
                );
                continue;
            }
            if (line.startsWith('# ')) {
                elements.push(
                    <Typography key={i} variant="h6" sx={{ fontWeight: 700, mt: 2, mb: 0.5 }}>
                        {line.substring(2)}
                    </Typography>
                );
                continue;
            }

            // Bullet points
            if (line.match(/^\s*[-*]\s/)) {
                const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
                const text = line.replace(/^\s*[-*]\s/, '');
                elements.push(
                    <Box key={i} sx={{ display: 'flex', ml: indent / 2 + 1, my: 0.2 }}>
                        <Typography variant="body2" sx={{ mr: 1, color: 'text.secondary' }}>•</Typography>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {renderInlineMarkdown(text)}
                        </Typography>
                    </Box>
                );
                continue;
            }

            // Numbered lists
            if (line.match(/^\s*\d+\.\s/)) {
                const match = line.match(/^(\s*)(\d+)\.\s(.*)$/);
                if (match) {
                    const indent = match[1].length;
                    elements.push(
                        <Box key={i} sx={{ display: 'flex', ml: indent / 2 + 1, my: 0.2 }}>
                            <Typography variant="body2" sx={{ mr: 1, color: 'text.secondary', minWidth: 20 }}>{match[2]}.</Typography>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {renderInlineMarkdown(match[3])}
                            </Typography>
                        </Box>
                    );
                    continue;
                }
            }

            // Empty line
            if (!line.trim()) {
                elements.push(<Box key={i} sx={{ height: 8 }} />);
                continue;
            }

            // Regular text
            elements.push(
                <Typography key={i} variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', my: 0.2 }}>
                    {renderInlineMarkdown(line)}
                </Typography>
            );
        }

        return <>{elements}</>;
    };

    const renderMessage = (msg: ConversationMessage, idx: number) => {
        const isUser = msg.role === 'user';
        return (
            <Box
                key={idx}
                sx={{
                    display: 'flex',
                    gap: 1.5,
                    py: 2,
                    px: 2,
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
                    bgcolor: isUser ? 'transparent' : alpha(theme.palette.primary.main, 0.02),
                    '&:last-child': { borderBottom: 'none' },
                }}
            >
                <Box
                    sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: isUser ? alpha(theme.palette.info.main, 0.12) : alpha(theme.palette.success.main, 0.12),
                        color: isUser ? 'info.main' : 'success.main',
                        flexShrink: 0,
                        mt: 0.3,
                    }}
                >
                    {isUser ? <IconUser size={18} /> : <IconRobot size={18} />}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: isUser ? 'info.main' : 'success.main', mb: 0.5, display: 'block' }}>
                        {isUser ? 'You' : 'Claude'}
                    </Typography>
                    <Box sx={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                        {renderMarkdown(msg.content)}
                    </Box>
                </Box>
            </Box>
        );
    };

    // ─── Render ──────────────────────────────────────────────────

    return (
        <>
            {/* Stats Panel */}
            <Collapse in={showStats && !!stats}>
                {stats && (
                    <Paper sx={{ p: 2, mb: 3, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                        <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Total Conversations</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>{stats.totalConversations}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Total Messages</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>{stats.totalMessages.toLocaleString()}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Your Messages</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>{stats.totalUserMessages.toLocaleString()}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Claude Messages</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>{stats.totalAssistantMessages.toLocaleString()}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Total Size</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>{stats.totalSizeMB} MB</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Active Days</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>{stats.uniqueDates}</Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Date Range</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {stats.dateRange.first} — {stats.dateRange.last}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Agent / Direct</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {stats.agentConversations} / {stats.directConversations}
                                </Typography>
                            </Box>
                        </Stack>
                    </Paper>
                )}
            </Collapse>

            {/* Search + Filters + Sort */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Stack spacing={1.5}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Search conversations (min 3 characters)..."
                            value={searchQuery}
                            onChange={onSearchChange}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        {searching ? <CircularProgress size={18} /> : <IconSearch size={18} />}
                                    </InputAdornment>
                                ),
                                endAdornment: searchQuery ? (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={onClearSearch}>
                                            <IconX size={16} />
                                        </IconButton>
                                    </InputAdornment>
                                ) : null,
                            }}
                        />
                    </Stack>
                    <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
                        <Stack direction="row" spacing={0.5}>
                            <Chip label="All" size="small" variant={filterType === 'all' ? 'filled' : 'outlined'} color={filterType === 'all' ? 'primary' : 'default'} onClick={() => onSetFilterType('all')} />
                            <Chip label="Direct" size="small" variant={filterType === 'direct' ? 'filled' : 'outlined'} color={filterType === 'direct' ? 'info' : 'default'} onClick={() => onSetFilterType('direct')} />
                            <Chip label="Agent" size="small" variant={filterType === 'agent' ? 'filled' : 'outlined'} color={filterType === 'agent' ? 'warning' : 'default'} onClick={() => onSetFilterType('agent')} />
                            <Chip label="Cascade" size="small" variant={filterType === 'cascade' ? 'filled' : 'outlined'} color={filterType === 'cascade' ? 'secondary' : 'default'} onClick={() => onSetFilterType('cascade')} />
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Sort:</Typography>
                            <Chip label="Date" size="small" variant={sortField === 'date' ? 'filled' : 'outlined'} color={sortField === 'date' ? 'primary' : 'default'} onClick={() => onSetSortField('date')} />
                            <Chip label="Size" size="small" variant={sortField === 'size' ? 'filled' : 'outlined'} color={sortField === 'size' ? 'primary' : 'default'} onClick={() => onSetSortField('size')} />
                            <Chip label="Messages" size="small" variant={sortField === 'messages' ? 'filled' : 'outlined'} color={sortField === 'messages' ? 'primary' : 'default'} onClick={() => onSetSortField('messages')} />
                            <IconButton size="small" onClick={onToggleSortDir}>
                                {sortDir === 'desc' ? <IconSortDescending size={16} /> : <IconSortAscending size={16} />}
                            </IconButton>
                        </Stack>
                    </Stack>
                    {/* Selection actions bar */}
                    {selectedConvs.size > 0 && (
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ pt: 0.5, borderTop: `1px solid ${alpha(theme.palette.divider, 0.3)}` }}>
                            <Chip label={`${selectedConvs.size} selected`} size="small" color="primary" onDelete={() => onSetSelectedConvs(new Set())} />
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={exporting ? <CircularProgress size={14} /> : <IconFiles size={14} />}
                                onClick={() => onCombineExport()}
                                disabled={exporting}
                                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                            >
                                Combine & Export .md
                            </Button>
                            <Button
                                size="small"
                                variant="contained"
                                color="secondary"
                                startIcon={reviewLoading ? <CircularProgress size={14} /> : <IconChartBar size={14} />}
                                onClick={onReviewSelected}
                                disabled={reviewLoading}
                                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                            >
                                Review & Analyze
                            </Button>
                        </Stack>
                    )}
                </Stack>
            </Paper>

            {/* Error */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            )}

            {/* Loading */}
            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress />
                </Box>
            )}

            {/* Search Results */}
            {searchResults !== null && !loading && (
                <Paper sx={{ mb: 3 }}>
                    <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            Search Results: {searchResults.length} conversation{searchResults.length !== 1 ? 's' : ''} matching "{searchQuery}"
                        </Typography>
                    </Box>
                    {searchResults.length === 0 ? (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <Typography color="text.secondary">No results found</Typography>
                        </Box>
                    ) : (
                        searchResults.map((result, ri) => (
                            <Box key={ri} sx={{ borderBottom: `1px solid ${alpha(theme.palette.divider, 0.3)}`, '&:last-child': { borderBottom: 'none' } }}>
                                <Box
                                    sx={{
                                        p: 1.5,
                                        cursor: 'pointer',
                                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                    }}
                                    onClick={() => onFetchDetail(result.filename)}
                                >
                                    {expandedConversation === result.filename ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                                    <IconCalendar size={14} />
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{result.date}</Typography>
                                    <Chip label={`${result.matchCount} match${result.matchCount !== 1 ? 'es' : ''}`} size="small" color="warning" variant="outlined" />
                                    <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', fontFamily: 'monospace' }}>
                                        {result.sessionId.substring(0, 12)}
                                    </Typography>
                                </Box>
                                {/* Show snippets */}
                                <Box sx={{ px: 3, pb: 1.5 }}>
                                    {result.matches.slice(0, 3).map((match, mi) => (
                                        <Box key={mi} sx={{ display: 'flex', gap: 1, mb: 0.5, alignItems: 'flex-start' }}>
                                            <Chip
                                                label={match.role === 'user' ? 'You' : 'Claude'}
                                                size="small"
                                                color={match.role === 'user' ? 'info' : 'success'}
                                                variant="outlined"
                                                sx={{ fontSize: '0.7rem', height: 20, mt: 0.2 }}
                                            />
                                            <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
                                                {highlightQuery(match.snippet, searchQuery)}
                                            </Typography>
                                        </Box>
                                    ))}
                                    {result.matches.length > 3 && (
                                        <Typography variant="caption" color="text.secondary">
                                            ...and {result.matches.length - 3} more matches
                                        </Typography>
                                    )}
                                </Box>
                                {/* Expanded detail */}
                                <Collapse in={expandedConversation === result.filename}>
                                    {loadingDetail && expandedConversation === result.filename && <LinearProgress />}
                                    {conversationDetail && expandedConversation === result.filename && (
                                        <Box sx={{ borderTop: `1px solid ${theme.palette.divider}` }}>
                                            {conversationDetail.messages.map((msg, mi) => renderMessage(msg, mi))}
                                        </Box>
                                    )}
                                </Collapse>
                            </Box>
                        ))
                    )}
                </Paper>
            )}

            {/* Date-grouped conversation list */}
            {searchResults === null && !loading && (
                <>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {conversations.length} conversations across {sortedDates.length} days
                    </Typography>

                    {filteredDates.map(date => {
                        const convs = filteredByDate[date] || [];
                        const isExpanded = expandedDates.has(date);
                        const allDateSelected = convs.length > 0 && convs.every(c => selectedConvs.has(c.filename));
                        const someDateSelected = convs.some(c => selectedConvs.has(c.filename));

                        return (
                            <Paper key={date} sx={{ mb: 2, overflow: 'hidden' }}>
                                {/* Date header */}
                                <Box
                                    sx={{
                                        p: 1.5,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) },
                                        borderBottom: isExpanded ? `1px solid ${theme.palette.divider}` : 'none',
                                    }}
                                >
                                    <Checkbox
                                        size="small"
                                        checked={allDateSelected}
                                        indeterminate={someDateSelected && !allDateSelected}
                                        onChange={() => onSelectAllForDate(date)}
                                        onClick={(e) => e.stopPropagation()}
                                        sx={{ p: 0.3 }}
                                    />
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, cursor: 'pointer' }} onClick={() => onToggleDate(date)}>
                                        {isExpanded ? <IconChevronDown size={18} /> : <IconChevronRight size={18} />}
                                        <IconCalendar size={16} />
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                            {formatDate(date)}
                                        </Typography>
                                        <Badge badgeContent={convs.length} color="primary" sx={{ ml: 1 }}>
                                            <IconMessage size={16} />
                                        </Badge>
                                        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', mr: 1 }}>
                                            {formatSize(convs.reduce((sum, c) => sum + c.size, 0))}
                                        </Typography>
                                    </Box>
                                    <Tooltip title="Combine & export all conversations for this date">
                                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onCombineExport(date); }} disabled={exporting}>
                                            <IconDownload size={16} />
                                        </IconButton>
                                    </Tooltip>
                                </Box>

                                {/* Conversations for this date */}
                                <Collapse in={isExpanded}>
                                    {convs.map((conv) => (
                                        <Box key={conv.filename}>
                                            <Box
                                                sx={{
                                                    p: 1.5,
                                                    pl: 2,
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: 0.5,
                                                    '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.5) },
                                                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
                                                    bgcolor: selectedConvs.has(conv.filename)
                                                        ? alpha(theme.palette.primary.main, 0.08)
                                                        : expandedConversation === conv.filename
                                                            ? alpha(theme.palette.primary.main, 0.06)
                                                            : 'transparent',
                                                }}
                                            >
                                                <Checkbox
                                                    size="small"
                                                    checked={selectedConvs.has(conv.filename)}
                                                    onChange={() => onToggleConvSelection(conv.filename)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    sx={{ p: 0.3, mt: 0.1 }}
                                                />
                                                <Box
                                                    sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flex: 1, cursor: 'pointer', minWidth: 0 }}
                                                    onClick={() => onFetchDetail(conv.filename)}
                                                >
                                                <Box sx={{ mt: 0.3 }}>
                                                    {expandedConversation === conv.filename ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                                                </Box>
                                                <IconFileText size={16} style={{ marginTop: 2, flexShrink: 0 }} />
                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                            {conv.date || conv.fileDate}
                                                        </Typography>
                                                        <Chip
                                                            label={conv.format === 'cascade' ? 'Cascade' : conv.isAgent ? 'Agent' : 'Direct'}
                                                            size="small"
                                                            color={conv.format === 'cascade' ? 'secondary' : conv.isAgent ? 'warning' : 'info'}
                                                            variant="outlined"
                                                            sx={{ height: 20, fontSize: '0.7rem' }}
                                                        />
                                                        {conv.source && conv.source !== 'c2' && (
                                                            <Chip
                                                                label={conv.source}
                                                                size="small"
                                                                variant="outlined"
                                                                sx={{ height: 20, fontSize: '0.7rem' }}
                                                            />
                                                        )}
                                                        <Chip
                                                            label={`${conv.messageCount} msgs`}
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{ height: 20, fontSize: '0.7rem' }}
                                                        />
                                                        {conv.title ? (
                                                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>
                                                                {conv.title}
                                                            </Typography>
                                                        ) : conv.sessionId ? (
                                                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                                                {conv.sessionId.substring(0, 16)}
                                                            </Typography>
                                                        ) : null}
                                                    </Stack>
                                                    {conv.preview && (
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            sx={{
                                                                display: 'block',
                                                                mt: 0.5,
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                                maxWidth: '100%',
                                                            }}
                                                        >
                                                            {conv.preview}
                                                        </Typography>
                                                    )}
                                                </Box>
                                                <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                                                    {formatSize(conv.size)}
                                                </Typography>
                                                </Box>
                                                <Tooltip title="Export .md">
                                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); onExportSingle(conv.filename); }} sx={{ opacity: 0.4, '&:hover': { opacity: 1 } }}>
                                                        <IconDownload size={14} />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>

                                            {/* Expanded conversation detail */}
                                            <Collapse in={expandedConversation === conv.filename}>
                                                {loadingDetail && expandedConversation === conv.filename && <LinearProgress />}
                                                {conversationDetail && expandedConversation === conv.filename && (
                                                    <Box sx={{ borderTop: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
                                                        {conversationDetail.messages.length === 0 ? (
                                                            <Box sx={{ p: 3, textAlign: 'center' }}>
                                                                <Typography color="text.secondary">No messages in this conversation</Typography>
                                                            </Box>
                                                        ) : (
                                                            conversationDetail.messages.map((msg, mi) => renderMessage(msg, mi))
                                                        )}
                                                    </Box>
                                                )}
                                            </Collapse>
                                        </Box>
                                    ))}
                                </Collapse>
                            </Paper>
                        );
                    })}
                </>
            )}
        </>
    );
};

export default ConversationsTab;
