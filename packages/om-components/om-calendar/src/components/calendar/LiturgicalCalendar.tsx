/**
 * OrthodoxMetrics Liturgical Calendar Component
 * A comprehensive liturgical calendar inspired by GOARCH Chapel Calendar but with enhanced design and functionality
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Search,
    Filter,
    Share2,
    Download,
    Bell,
    Settings,
    Grid,
    List,
    ChevronDown,
    Cross,
    Star,
    Clock,
    BookOpen,
    Users,
    MapPin,
    Bookmark,
    Eye,
    EyeOff,
    RefreshCw,
    ArrowLeft,
    ArrowRight,
    Home,
    Maximize2,
    Minimize2
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { useCalendarData, useCalendarSettings, useCalendarFilters, useCalendarSearch, useShareDay, useExportCalendar } from '@/shared/lib/useCalendarData';
import { CalendarDayDetail } from './CalendarDayDetail.tsx';
import type { LiturgicalDay, Feast, Saint, CalendarView } from '../types/liturgical.types';

interface LiturgicalCalendarProps {
    className?: string;
    defaultView?: 'day' | 'week' | 'month' | 'year';
    embedded?: boolean;
    onDateSelect?: (date: Date) => void;
}

const LITURGICAL_COLORS = {
    'red': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', accent: 'bg-red-500' },
    'gold': { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', accent: 'bg-yellow-500' },
    'white': { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-800', accent: 'bg-gray-400' },
    'green': { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', accent: 'bg-green-500' },
    'purple': { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', accent: 'bg-purple-500' },
    'blue': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', accent: 'bg-blue-500' },
    'black': { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-900', accent: 'bg-gray-600' },
    'silver': { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-800', accent: 'bg-slate-400' },
};

const FEAST_ICONS = {
    'great': Cross,
    'major': Star,
    'minor': Bookmark,
    'local': MapPin,
    'saint': Users,
};

const FASTING_COLORS = {
    'strict': 'bg-red-100 text-red-800 border-red-200',
    'wine-oil': 'bg-orange-100 text-orange-800 border-orange-200',
    'fish': 'bg-blue-100 text-blue-800 border-blue-200',
    'dairy': 'bg-green-100 text-green-800 border-green-200',
    'fast-free': 'bg-gray-100 text-gray-600 border-gray-200',
};

export const LiturgicalCalendar: React.FC<LiturgicalCalendarProps> = ({
    className = '',
    defaultView = 'month',
    embedded = false,
    onDateSelect
}) => {
    // State management
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [view, setView] = useState<CalendarView['type']>(defaultView);
    const [showSidebar, setShowSidebar] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Hooks
    const { settings, updateSettings } = useCalendarSettings();
    const { filters, updateFilters, clearFilters } = useCalendarFilters();
    const { data, monthData, feasts, nextFeast, isLoading, error, refetch, prefetchAdjacentMonths } = useCalendarData(currentDate, view, settings);
    const searchResults = useCalendarSearch(searchQuery, filters, settings);
    const shareDay = useShareDay();
    const exportCalendar = useExportCalendar();

    // Prefetch adjacent months on mount and date change
    useEffect(() => {
        prefetchAdjacentMonths();
    }, [currentDate, prefetchAdjacentMonths]);

    // Calendar navigation
    const navigateMonth = (direction: 'prev' | 'next') => {
        setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
        setSelectedDate(new Date());
    };

    const goToNextFeast = () => {
        if (nextFeast?.date) {
            const feastDate = new Date(nextFeast.date);
            setCurrentDate(feastDate);
            setSelectedDate(feastDate);
        }
    };

    // Calendar data processing
    const calendarDays = useMemo(() => {
        if (!monthData?.days) return [];

        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const calendarStart = startOfWeek(monthStart);
        const calendarEnd = endOfWeek(monthEnd);

        return eachDayOfInterval({ start: calendarStart, end: calendarEnd }).map(date => {
            const dateString = format(date, 'yyyy-MM-dd');
            const liturgicalDay = monthData.days.find(day => day.date === dateString);

            return {
                date,
                liturgicalDay,
                isCurrentMonth: isSameMonth(date, currentDate),
                isToday: isToday(date),
                isSelected: selectedDate ? isSameDay(date, selectedDate) : false,
            };
        });
    }, [monthData, currentDate, selectedDate]);

    // Event handlers
    const handleDateClick = (date: Date, liturgicalDay?: LiturgicalDay) => {
        setSelectedDate(date);
        setShowSidebar(true);
        onDateSelect?.(date);
    };

    const handleShare = async (type: 'link' | 'text' | 'pdf') => {
        if (!selectedDate) return;

        try {
            await shareDay.mutateAsync({
                date: format(selectedDate, 'yyyy-MM-dd'),
                options: {
                    type: 'day',
                    format: type,
                    includeReadings: true,
                    includeFasting: true,
                    includeSaints: true,
                }
            });
        } catch (error) {
            console.error('Share failed:', error);
        }
    };

    const handleExport = async (format: 'pdf' | 'ical') => {
        try {
            const monthStart = startOfMonth(currentDate);
            const monthEnd = endOfMonth(currentDate);

            await exportCalendar.mutateAsync({
                type: 'day',
                format,
                includeReadings: true,
                includeFasting: true,
                includeSaints: true,
                dateRange: {
                    start: format(monthStart, 'yyyy-MM-dd'),
                    end: format(monthEnd, 'yyyy-MM-dd'),
                }
            });
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    // Utility functions
    const getFeastColor = (feasts: Feast[] = []) => {
        if (feasts.length === 0) return null;
        const primaryFeast = feasts.sort((a, b) => a.rank - b.rank)[0];
        return LITURGICAL_COLORS[primaryFeast.color] || LITURGICAL_COLORS.white;
    };

    const getFastingIndicator = (fastingRule?: any) => {
        if (!fastingRule) return null;
        return FASTING_COLORS[fastingRule.level as keyof typeof FASTING_COLORS] || FASTING_COLORS['fast-free'];
    };

    if (error) {
        return (
            <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
                <div className="text-center">
                    <Cross className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load calendar</h3>
                    <p className="text-gray-600 mb-4">There was an error loading the liturgical calendar data.</p>
                    <button
                        onClick={() => refetch()}
                        className="inline-flex items-center px-4 py-2 bg-orthodox-purple text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`liturgical-calendar ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'relative'} ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orthodox-purple to-purple-800 text-white rounded-t-lg">
                <div className="flex items-center space-x-4">
                    <h1 className="text-xl font-bold">Orthodox Liturgical Calendar</h1>
                    {nextFeast && (
                        <button
                            onClick={goToNextFeast}
                            className="flex items-center space-x-2 px-3 py-1 bg-white/20 rounded-lg hover:bg-white/30 transition-colors text-sm"
                        >
                            <Star className="w-4 h-4" />
                            <span>Next: {nextFeast.name}</span>
                        </button>
                    )}
                </div>

                <div className="flex items-center space-x-2">
                    {/* Search */}
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search feasts, saints..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 w-64 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/30"
                        />
                    </div>

                    {/* View Toggle */}
                    <div className="flex bg-white/20 rounded-lg p-1">
                        {(['month', 'week', 'day'] as const).map((viewType) => (
                            <button
                                key={viewType}
                                onClick={() => setView(viewType)}
                                className={`px-3 py-1 rounded text-sm capitalize transition-colors ${view === viewType ? 'bg-white text-orthodox-purple' : 'text-white hover:bg-white/20'
                                    }`}
                            >
                                {viewType}
                            </button>
                        ))}
                    </div>

                    {/* Action buttons */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                    >
                        <Filter className="w-5 h-5" />
                    </button>

                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                    >
                        {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Filters Panel */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-b border-gray-200 bg-gray-50 p-4"
                    >
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-700">Show:</span>
                                {(['feasts', 'saints', 'fasting', 'readings'] as const).map((type) => (
                                    <label key={type} className="flex items-center space-x-1">
                                        <input
                                            type="checkbox"
                                            checked={filters[`${type}Types` as keyof typeof filters]?.length > 0 || type === 'feasts'}
                                            onChange={(e) => {
                                                // Implementation for filter updates
                                            }}
                                            className="rounded border-gray-300 text-orthodox-purple focus:ring-orthodox-purple"
                                        />
                                        <span className="text-sm text-gray-600 capitalize">{type}</span>
                                    </label>
                                ))}
                            </div>

                            <button
                                onClick={clearFilters}
                                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                Clear all
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="flex h-full">
                {/* Calendar Grid */}
                <div className={`flex-1 ${showSidebar ? 'pr-96' : ''} relative`}>
                    {/* Navigation */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigateMonth('prev')}
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>

                            <h2 className="text-xl font-semibold">
                                {format(currentDate, 'MMMM yyyy')}
                            </h2>

                            <button
                                onClick={() => navigateMonth('next')}
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex items-center space-x-2">
                            <button
                                onClick={goToToday}
                                className="px-4 py-2 bg-orthodox-purple text-white rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                Today
                            </button>

                            <button
                                onClick={() => handleExport('pdf')}
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                title="Export to PDF"
                            >
                                <Download className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Calendar Grid */}
                    {view === 'month' && (
                        <div className="p-4">
                            {/* Week headers */}
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-700">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar days */}
                            <div className="grid grid-cols-7 gap-1">
                                {isLoading ? (
                                    // Loading skeleton
                                    Array.from({ length: 42 }).map((_, i) => (
                                        <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
                                    ))
                                ) : (
                                    calendarDays.map(({ date, liturgicalDay, isCurrentMonth, isToday, isSelected }) => {
                                        const feastColor = getFeastColor(liturgicalDay?.feasts);
                                        const fastingClass = getFastingIndicator(liturgicalDay?.fastingRule);

                                        return (
                                            <motion.div
                                                key={date.toISOString()}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => handleDateClick(date, liturgicalDay)}
                                                className={`
                          h-24 p-2 rounded-lg border cursor-pointer transition-all
                          ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                          ${isToday ? 'ring-2 ring-orthodox-purple' : ''}
                          ${isSelected ? 'ring-2 ring-orthodox-gold' : ''}
                          ${feastColor ? `${feastColor.bg} ${feastColor.border}` : 'border-gray-200 hover:border-gray-300'}
                        `}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={`text-sm font-medium ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                                                        } ${isToday ? 'text-orthodox-purple' : ''}`}>
                                                        {format(date, 'd')}
                                                    </span>

                                                    {liturgicalDay?.fastingRule && (
                                                        <div className={`w-2 h-2 rounded-full ${fastingClass?.split(' ')[0]}`} />
                                                    )}
                                                </div>

                                                {/* Feasts and Saints */}
                                                <div className="space-y-1">
                                                    {liturgicalDay?.feasts?.slice(0, 2).map((feast, index) => {
                                                        const Icon = FEAST_ICONS[feast.type as keyof typeof FEAST_ICONS];
                                                        return (
                                                            <div key={index} className="flex items-center space-x-1">
                                                                <Icon className="w-3 h-3 text-orthodox-purple flex-shrink-0" />
                                                                <span className="text-xs text-gray-700 truncate">
                                                                    {feast.name}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}

                                                    {liturgicalDay?.saints?.slice(0, 1).map((saint, index) => (
                                                        <div key={index} className="flex items-center space-x-1">
                                                            <Users className="w-3 h-3 text-gray-500 flex-shrink-0" />
                                                            <span className="text-xs text-gray-600 truncate">
                                                                {saint.name}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Indicators */}
                                                <div className="flex items-center justify-end mt-1 space-x-1">
                                                    {liturgicalDay?.readings?.epistle && (
                                                        <BookOpen className="w-3 h-3 text-gray-400" />
                                                    )}
                                                    {liturgicalDay?.vigil && (
                                                        <Clock className="w-3 h-3 text-orthodox-purple" />
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {/* Other view types (day, week) would be implemented here */}
                </div>

                {/* Sidebar */}
                <AnimatePresence>
                    {showSidebar && selectedDate && (
                        <CalendarDayDetail
                            date={selectedDate}
                            onClose={() => setShowSidebar(false)}
                            onShare={handleShare}
                            settings={settings}
                        />
                    )}
                </AnimatePresence>
            </div>

            {/* Search Results Overlay */}
            <AnimatePresence>
                {searchQuery && searchResults.data && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-16 left-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg z-40 max-h-96 overflow-y-auto"
                    >
                        <div className="p-4">
                            <h3 className="font-semibold text-gray-900 mb-3">Search Results</h3>

                            {/* Feasts */}
                            {searchResults.data.feasts?.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Feasts</h4>
                                    {searchResults.data.feasts.map((feast) => (
                                        <div key={feast.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                            <Star className="w-4 h-4 text-orthodox-gold" />
                                            <div>
                                                <div className="font-medium text-sm">{feast.name}</div>
                                                <div className="text-xs text-gray-500">{format(new Date(feast.date), 'MMM d, yyyy')}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Saints */}
                            {searchResults.data.saints?.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Saints</h4>
                                    {searchResults.data.saints.map((saint) => (
                                        <div key={saint.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                            <Users className="w-4 h-4 text-gray-600" />
                                            <div>
                                                <div className="font-medium text-sm">{saint.name}</div>
                                                <div className="text-xs text-gray-500">{format(new Date(saint.feastDay), 'MMM d, yyyy')}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LiturgicalCalendar;
