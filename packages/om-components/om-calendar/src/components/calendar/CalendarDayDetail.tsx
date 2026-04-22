/**
 * Calendar Day Detail Sidebar Component
 * Shows detailed information for a selected liturgical day
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    X,
    Calendar,
    Cross,
    Star,
    Users,
    BookOpen,
    Coffee,
    Fish,
    Wine,
    Milk,
    Check,
    Share2,
    Copy,
    Download,
    ExternalLink,
    Clock,
    MapPin,
    Scroll,
    Heart,
    ChevronRight,
    ChevronDown,
    Info
} from 'lucide-react';
import { format } from 'date-fns';
import { useCalendarDay, useReadings } from '@/shared/lib/useCalendarData';
import type { CalendarSettings, ShareOptions } from '../types/liturgical.types';

interface CalendarDayDetailProps {
    date: Date;
    onClose: () => void;
    onShare: (type: 'link' | 'text' | 'pdf') => void;
    settings: CalendarSettings;
}

const FASTING_ICONS = {
    'strict': Coffee,
    'wine-oil': Wine,
    'fish': Fish,
    'dairy': Milk,
    'fast-free': Check,
};

const FASTING_DESCRIPTIONS = {
    'strict': 'Strict fast - no animal products, oil, or wine',
    'wine-oil': 'Wine and oil permitted',
    'fish': 'Fish, wine, and oil permitted',
    'dairy': 'Dairy products permitted',
    'fast-free': 'No fasting restrictions',
};

const SAINT_TYPE_COLORS = {
    'apostle': 'bg-red-100 text-red-800',
    'martyr': 'bg-red-100 text-red-800',
    'confessor': 'bg-blue-100 text-blue-800',
    'hierarch': 'bg-purple-100 text-purple-800',
    'monastic': 'bg-gray-100 text-gray-800',
    'righteous': 'bg-green-100 text-green-800',
    'fool-for-christ': 'bg-yellow-100 text-yellow-800',
    'new-martyr': 'bg-red-100 text-red-800',
    'unmercenary': 'bg-blue-100 text-blue-800',
    'virgin': 'bg-pink-100 text-pink-800',
    'bishop': 'bg-purple-100 text-purple-800',
    'monk': 'bg-gray-100 text-gray-800',
    'prophet': 'bg-indigo-100 text-indigo-800',
    'other': 'bg-gray-100 text-gray-800',
};

export const CalendarDayDetail: React.FC<CalendarDayDetailProps> = ({
    date,
    onClose,
    onShare,
    settings
}) => {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['feasts', 'readings']));
    const [copiedText, setCopiedText] = useState<string | null>(null);

    const { data: dayData, isLoading } = useCalendarDay(date, settings);
    const { data: readings } = useReadings(date, undefined, settings);

    const toggleSection = (section: string) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(section)) {
            newExpanded.delete(section);
        } else {
            newExpanded.add(section);
        }
        setExpandedSections(newExpanded);
    };

    const copyToClipboard = async (text: string, label: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedText(label);
            setTimeout(() => setCopiedText(null), 2000);
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
        }
    };

    const formatJulianDate = (gregorianDate: Date) => {
        // This would need a proper Julian calendar conversion
        // For now, showing placeholder
        const julianOffset = 13; // Current difference between calendars
        const julianDate = new Date(gregorianDate);
        julianDate.setDate(julianDate.getDate() - julianOffset);
        return format(julianDate, 'MMM d');
    };

    if (isLoading) {
        return (
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                className="fixed right-0 top-0 bottom-0 w-96 bg-white border-l border-gray-200 shadow-xl z-50 overflow-y-auto"
            >
                <div className="p-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="space-y-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="h-16 bg-gray-200 rounded"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    if (!dayData) {
        return (
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                className="fixed right-0 top-0 bottom-0 w-96 bg-white border-l border-gray-200 shadow-xl z-50 overflow-y-auto"
            >
                <div className="p-6 text-center">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No data available</h3>
                    <p className="text-gray-600">No liturgical information found for this date.</p>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed right-0 top-0 bottom-0 w-96 bg-white border-l border-gray-200 shadow-xl z-50 overflow-y-auto"
        >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold text-gray-900">
                        {format(date, 'EEEE, MMMM d')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600">
                    <div>
                        {format(date, 'yyyy')}
                        {settings.showJulianDates && (
                            <span className="ml-2 text-xs">
                                (Julian: {formatJulianDate(date)})
                            </span>
                        )}
                    </div>

                    {dayData.tone && (
                        <div className="flex items-center space-x-1">
                            <span>Tone {dayData.tone}</span>
                        </div>
                    )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center space-x-2 mt-3">
                    <button
                        onClick={() => onShare('link')}
                        className="flex items-center space-x-1 px-3 py-1 bg-orthodox-purple text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
                    >
                        <Share2 className="w-4 h-4" />
                        <span>Share</span>
                    </button>

                    <button
                        onClick={() => onShare('pdf')}
                        className="flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-6">
                {/* Liturgical Color */}
                {dayData.liturgicalColor && (
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
                        <div
                            className="w-4 h-4 rounded-full border border-gray-300"
                            style={{ backgroundColor: dayData.liturgicalColor.primary }}
                        />
                        <div>
                            <div className="font-medium text-gray-900">{dayData.liturgicalColor.name}</div>
                            {dayData.liturgicalColor.description && (
                                <div className="text-sm text-gray-600">{dayData.liturgicalColor.description}</div>
                            )}
                        </div>
                    </div>
                )}

                {/* Fasting Rule */}
                {dayData.fastingRule && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">Fasting</h3>
                        </div>
                        <div className={`p-3 rounded-lg border ${dayData.fastingRule.level === 'strict' ? 'bg-red-50 border-red-200' :
                            dayData.fastingRule.level === 'wine-oil' ? 'bg-orange-50 border-orange-200' :
                                dayData.fastingRule.level === 'fish' ? 'bg-blue-50 border-blue-200' :
                                    dayData.fastingRule.level === 'dairy' ? 'bg-green-50 border-green-200' :
                                        'bg-gray-50 border-gray-200'
                            }`}>
                            <div className="flex items-center space-x-2 mb-2">
                                {React.createElement(FASTING_ICONS[dayData.fastingRule.level] || Check, {
                                    className: "w-5 h-5 text-gray-700"
                                })}
                                <span className="font-medium">{dayData.fastingRule.name}</span>
                            </div>
                            <p className="text-sm text-gray-600">
                                {FASTING_DESCRIPTIONS[dayData.fastingRule.level] || dayData.fastingRule.description}
                            </p>
                            {dayData.fastingRule.restrictions?.length > 0 && (
                                <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                                    {dayData.fastingRule.restrictions.map((restriction, index) => (
                                        <li key={index}>{restriction}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}

                {/* Feasts */}
                {dayData.feasts && dayData.feasts.length > 0 && (
                    <div className="space-y-2">
                        <button
                            onClick={() => toggleSection('feasts')}
                            className="flex items-center justify-between w-full text-left"
                        >
                            <h3 className="font-semibold text-gray-900">Feasts ({dayData.feasts.length})</h3>
                            {expandedSections.has('feasts') ? (
                                <ChevronDown className="w-5 h-5 text-gray-500" />
                            ) : (
                                <ChevronRight className="w-5 h-5 text-gray-500" />
                            )}
                        </button>

                        {expandedSections.has('feasts') && (
                            <div className="space-y-3">
                                {dayData.feasts.map((feast, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className={`p-3 rounded-lg border ${feast.type === 'great' ? 'bg-red-50 border-red-200' :
                                            feast.type === 'major' ? 'bg-yellow-50 border-yellow-200' :
                                                'bg-gray-50 border-gray-200'
                                            }`}
                                    >
                                        <div className="flex items-start space-x-3">
                                            <div className="flex-shrink-0 mt-1">
                                                {feast.type === 'great' && <Cross className="w-5 h-5 text-red-600" />}
                                                {feast.type === 'major' && <Star className="w-5 h-5 text-yellow-600" />}
                                                {feast.type === 'minor' && <Star className="w-4 h-4 text-gray-600" />}
                                                {feast.type === 'local' && <MapPin className="w-4 h-4 text-blue-600" />}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-medium text-gray-900">{feast.name}</h4>
                                                <div className="flex items-center space-x-2 mt-1">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${feast.type === 'great' ? 'bg-red-100 text-red-800' :
                                                        feast.type === 'major' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {feast.type}
                                                    </span>
                                                    <span className="text-xs text-gray-500">Rank {feast.rank}</span>
                                                </div>
                                                {feast.description && (
                                                    <p className="text-sm text-gray-600 mt-2">{feast.description}</p>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Saints */}
                {dayData.saints && dayData.saints.length > 0 && (
                    <div className="space-y-2">
                        <button
                            onClick={() => toggleSection('saints')}
                            className="flex items-center justify-between w-full text-left"
                        >
                            <h3 className="font-semibold text-gray-900">Saints ({dayData.saints.length})</h3>
                            {expandedSections.has('saints') ? (
                                <ChevronDown className="w-5 h-5 text-gray-500" />
                            ) : (
                                <ChevronRight className="w-5 h-5 text-gray-500" />
                            )}
                        </button>

                        {expandedSections.has('saints') && (
                            <div className="space-y-3">
                                {dayData.saints.map((saint, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="p-3 rounded-lg border border-gray-200 bg-gray-50"
                                    >
                                        <div className="flex items-start space-x-3">
                                            <Users className="w-5 h-5 text-gray-600 flex-shrink-0 mt-1" />
                                            <div className="flex-1">
                                                <h4 className="font-medium text-gray-900">
                                                    {saint.name}
                                                    {saint.title && <span className="text-sm text-gray-600 ml-1">({saint.title})</span>}
                                                </h4>
                                                <div className="flex items-center space-x-2 mt-1">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${SAINT_TYPE_COLORS[saint.type] || 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {saint.type.replace('-', ' ')}
                                                    </span>
                                                    {saint.feastRank && (
                                                        <span className="text-xs text-gray-500 capitalize">{saint.feastRank}</span>
                                                    )}
                                                </div>
                                                {saint.biography && (
                                                    <p className="text-sm text-gray-600 mt-2 line-clamp-3">{saint.biography}</p>
                                                )}
                                                {saint.troparion && (
                                                    <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                                                        <p className="text-sm italic text-gray-700">{saint.troparion}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Readings */}
                {(dayData.readings || readings) && (
                    <div className="space-y-2">
                        <button
                            onClick={() => toggleSection('readings')}
                            className="flex items-center justify-between w-full text-left"
                        >
                            <h3 className="font-semibold text-gray-900">Daily Readings</h3>
                            {expandedSections.has('readings') ? (
                                <ChevronDown className="w-5 h-5 text-gray-500" />
                            ) : (
                                <ChevronRight className="w-5 h-5 text-gray-500" />
                            )}
                        </button>

                        {expandedSections.has('readings') && (
                            <div className="space-y-3">
                                {dayData.readings?.epistle && (
                                    <div className="p-3 rounded-lg border border-blue-200 bg-blue-50">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <Scroll className="w-4 h-4 text-blue-600" />
                                            <h4 className="font-medium text-blue-900">Epistle</h4>
                                            <button
                                                onClick={() => copyToClipboard(dayData.readings.epistle!.reference, 'epistle')}
                                                className="ml-auto p-1 rounded hover:bg-blue-100 transition-colors"
                                            >
                                                {copiedText === 'epistle' ? (
                                                    <Check className="w-4 h-4 text-green-600" />
                                                ) : (
                                                    <Copy className="w-4 h-4 text-blue-600" />
                                                )}
                                            </button>
                                        </div>
                                        <p className="text-sm font-medium text-blue-800 mb-1">
                                            {dayData.readings.epistle.reference}
                                        </p>
                                        <p className="text-sm text-blue-700">
                                            {dayData.readings.epistle.citation}
                                        </p>
                                    </div>
                                )}

                                {dayData.readings?.gospel && (
                                    <div className="p-3 rounded-lg border border-red-200 bg-red-50">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <BookOpen className="w-4 h-4 text-red-600" />
                                            <h4 className="font-medium text-red-900">Gospel</h4>
                                            <button
                                                onClick={() => copyToClipboard(dayData.readings.gospel!.reference, 'gospel')}
                                                className="ml-auto p-1 rounded hover:bg-red-100 transition-colors"
                                            >
                                                {copiedText === 'gospel' ? (
                                                    <Check className="w-4 h-4 text-green-600" />
                                                ) : (
                                                    <Copy className="w-4 h-4 text-red-600" />
                                                )}
                                            </button>
                                        </div>
                                        <p className="text-sm font-medium text-red-800 mb-1">
                                            {dayData.readings.gospel.reference}
                                        </p>
                                        <p className="text-sm text-red-700">
                                            {dayData.readings.gospel.citation}
                                        </p>
                                    </div>
                                )}

                                {dayData.readings?.oldTestament && dayData.readings.oldTestament.length > 0 && (
                                    <div className="p-3 rounded-lg border border-purple-200 bg-purple-50">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <BookOpen className="w-4 h-4 text-purple-600" />
                                            <h4 className="font-medium text-purple-900">Old Testament</h4>
                                        </div>
                                        {dayData.readings.oldTestament.map((reading, index) => (
                                            <div key={index} className="mb-2 last:mb-0">
                                                <p className="text-sm font-medium text-purple-800">
                                                    {reading.reference}
                                                </p>
                                                <p className="text-sm text-purple-700">
                                                    {reading.citation}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Special Notes */}
                {dayData.specialNotes && dayData.specialNotes.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="font-semibold text-gray-900">Special Notes</h3>
                        <div className="space-y-2">
                            {dayData.specialNotes.map((note, index) => (
                                <div key={index} className="flex items-start space-x-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                                    <Info className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-yellow-800">{note}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Service Information */}
                {(dayData.vigil || dayData.allNightVigil) && (
                    <div className="p-3 rounded-lg border border-orthodox-purple bg-purple-50">
                        <div className="flex items-center space-x-2 mb-2">
                            <Clock className="w-4 h-4 text-orthodox-purple" />
                            <h4 className="font-medium text-purple-900">Service Information</h4>
                        </div>
                        {dayData.vigil && (
                            <p className="text-sm text-purple-700">• Vigil service</p>
                        )}
                        {dayData.allNightVigil && (
                            <p className="text-sm text-purple-700">• All-night vigil</p>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default CalendarDayDetail;
