'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import RenderLatexText from '@/components/RenderLatexText';
import {
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    GraduationCap,
    BookOpen,
    Search,
    Zap,
    Library,
    Trash2,
} from 'lucide-react';

/* ── Year / Subject constants ──────────────────────────────────────────── */

const YEARS = [
    { id: 'Year 7', title: 'Year 7' },
    { id: 'Year 8', title: 'Year 8' },
    { id: 'Year 9', title: 'Year 9' },
    { id: 'Year 10', title: 'Year 10' },
    { id: 'Year 11', title: 'Year 11' },
    { id: 'Year 12', title: 'Year 12' },
];

const SUBJECTS: Record<string, string[]> = {
    'Year 7': ['Mathematics'],
    'Year 8': ['Mathematics'],
    'Year 9': ['Mathematics'],
    'Year 10': ['Mathematics'],
    'Year 11': ['Mathematics Advanced', 'Mathematics Extension 1'],
    'Year 12': ['Mathematics Advanced', 'Mathematics Extension 1', 'Mathematics Extension 2'],
};

/* ── Types ─────────────────────────────────────────────────────────────── */

type DotPoint = { id: string; text: string };
type TaxonomyGrouped = Record<string, Record<string, DotPoint[]>>;

type Props = {
    onClose?: () => void;
    isDevMode?: boolean;
};

const coerceDotPointText = (value: unknown): string => {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
    if (value && typeof value === 'object') {
        const nested = (value as { text?: unknown }).text;
        if (nested !== undefined) return coerceDotPointText(nested);
    }
    return '';
};

const normalizeDotPoint = (value: unknown, fallbackId: string): DotPoint | null => {
    if (typeof value === 'string') {
        const text = value.trim();
        if (!text) return null;
        return { id: fallbackId, text };
    }

    if (!value || typeof value !== 'object') return null;

    const obj = value as { id?: unknown; text?: unknown };
    const text = coerceDotPointText(obj.text ?? value);
    if (!text) return null;

    const id = typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim() : fallbackId;
    return { id, text };
};

const normalizeTaxonomyGrouped = (value: unknown): TaxonomyGrouped => {
    if (!value || typeof value !== 'object') return {};

    const groupedInput = value as Record<string, unknown>;
    const groupedOutput: TaxonomyGrouped = {};

    for (const [topicKey, subtopicsValue] of Object.entries(groupedInput)) {
        const topic = String(topicKey || '').trim();
        if (!topic || !subtopicsValue || typeof subtopicsValue !== 'object') continue;

        const subtopicsInput = subtopicsValue as Record<string, unknown>;
        const normalizedSubtopics: Record<string, DotPoint[]> = {};

        for (const [subtopicKey, pointsValue] of Object.entries(subtopicsInput)) {
            const subtopic = String(subtopicKey || '').trim();
            if (!subtopic) continue;

            const pointList = Array.isArray(pointsValue) ? pointsValue : [pointsValue];
            const normalizedPoints = pointList
                .map((point, index) => normalizeDotPoint(point, `${topic}-${subtopic}-${index}`))
                .filter((point): point is DotPoint => Boolean(point));

            if (normalizedPoints.length > 0) {
                normalizedSubtopics[subtopic] = normalizedPoints;
            }
        }

        if (Object.keys(normalizedSubtopics).length > 0) {
            groupedOutput[topic] = normalizedSubtopics;
        }
    }

    return groupedOutput;
};

/* ── Component ─────────────────────────────────────────────────────────── */

export default function SyllabusViewer({ onClose, isDevMode = false }: Props) {
    /* state */
    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [activeTopic, setActiveTopic] = useState<string | null>(null);
    const [expandedSubtopic, setExpandedSubtopic] = useState<string | null>(null);
    const [taxonomy, setTaxonomy] = useState<TaxonomyGrouped>({});
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

    /* fetch taxonomy when subject is selected */
    useEffect(() => {
        if (!selectedYear || !selectedSubject) return;
        setLoading(true);
        setTaxonomy({});
        setActiveTopic(null);
        setExpandedSubtopic(null);

        fetch(
            `/api/hsc/taxonomy?grade=${encodeURIComponent(selectedYear)}&subject=${encodeURIComponent(selectedSubject)}`
        )
            .then((res) => res.json())
            .then((data) => {
                if (data.grouped) {
                    const normalizedGrouped = normalizeTaxonomyGrouped(data.grouped);
                    setTaxonomy(normalizedGrouped);
                    const topics = Object.keys(normalizedGrouped);
                    if (topics.length > 0) setActiveTopic(topics[0]);
                }
            })
            .catch(() => setTaxonomy({}))
            .finally(() => setLoading(false));
    }, [selectedYear, selectedSubject]);

    /* derived */
    const topics = useMemo(() => Object.keys(taxonomy), [taxonomy]);
    const currentSubtopics = useMemo<Record<string, DotPoint[]>>(
        () => (activeTopic ? taxonomy[activeTopic] || {} : {}),
        [taxonomy, activeTopic]
    );

    /* filtered subtopics by search */
    const filteredSubtopicEntries = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const entries = Object.entries(currentSubtopics);
        if (!q) return entries;
        return entries
            .map(([heading, points]) => {
                const headingMatch = heading.toLowerCase().includes(q);
                const filteredPoints = points.filter((p) => p.text.toLowerCase().includes(q));
                if (headingMatch) return [heading, points] as [string, DotPoint[]];
                if (filteredPoints.length > 0) return [heading, filteredPoints] as [string, DotPoint[]];
                return null;
            })
            .filter(Boolean) as [string, DotPoint[]][];
    }, [currentSubtopics, searchQuery]);

    /* handlers */
    const handleSubjectSelect = useCallback((subject: string) => {
        setSelectedSubject(subject);
        setSearchQuery('');
    }, []);

    const handleBack = useCallback(() => {
        if (selectedSubject) {
            setSelectedSubject(null);
            setActiveTopic(null);
            setExpandedSubtopic(null);
            setTaxonomy({});
            setSearchQuery('');
        } else {
            setSelectedYear(null);
        }
    }, [selectedSubject]);

    const handleTopicClick = useCallback((topicId: string) => {
        setActiveTopic(topicId);
        setExpandedSubtopic(null);
        setSearchQuery('');
        document.getElementById('syllabus-content-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    /* delete a single dot point (dev mode only) */
    const handleDeleteDotPoint = useCallback(async (dotPointId: string, topicKey: string, subtopicKey: string) => {
        if (!confirm('Delete this dot point?')) return;
        setDeletingIds((prev) => new Set(prev).add(dotPointId));
        try {
            const res = await fetch('/api/hsc/taxonomy/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: dotPointId }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                alert(data?.error || 'Failed to delete');
                return;
            }
            // Remove from local state
            setTaxonomy((prev) => {
                const next = { ...prev };
                if (next[topicKey]?.[subtopicKey]) {
                    const filtered = next[topicKey][subtopicKey].filter((d) => d.id !== dotPointId);
                    if (filtered.length === 0) {
                        // Remove empty subtopic
                        const { [subtopicKey]: _, ...rest } = next[topicKey];
                        if (Object.keys(rest).length === 0) {
                            // Remove empty topic
                            const { [topicKey]: __, ...topRest } = next;
                            return topRest;
                        }
                        next[topicKey] = rest;
                    } else {
                        next[topicKey] = { ...next[topicKey], [subtopicKey]: filtered };
                    }
                }
                return next;
            });
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Delete failed');
        } finally {
            setDeletingIds((prev) => {
                const next = new Set(prev);
                next.delete(dotPointId);
                return next;
            });
        }
    }, []);

    /* ── Render ──────────────────────────────────────────────────────────── */

    return (
        <div
            className="flex-1 flex flex-col h-full overflow-hidden"
            style={{
                backgroundImage: 'radial-gradient(#e5e7eb 1.5px, transparent 1.5px)',
                backgroundSize: '24px 24px',
                backgroundColor: '#f9fafb',
            }}
        >
            {/* ── TOP HEADER ── */}
            <header
                className="flex items-center justify-between shrink-0"
                style={{ height: 72, padding: '0 2rem' }}
            >
                <div className="flex items-center gap-3">
                    {selectedSubject ? (
                        <>
                            <button
                                onClick={handleBack}
                                className="p-1.5 -ml-1.5 rounded-lg cursor-pointer"
                                style={{ color: '#9ca3af' }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = '#111827';
                                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = '#9ca3af';
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <h1
                                className="text-xl font-medium tracking-wider"
                                style={{ color: '#9ca3af' }}
                            >
                                SYLLABUS
                            </h1>
                            <span style={{ color: '#d1d5db' }}>/</span>
                            <h2 className="text-lg font-semibold" style={{ color: '#1f2937' }}>
                                {selectedSubject}
                            </h2>
                        </>
                    ) : (
                        <>
                            {onClose && (
                                <button
                                    onClick={onClose}
                                    className="p-1.5 -ml-1.5 rounded-lg cursor-pointer"
                                    style={{ color: '#9ca3af' }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.color = '#111827';
                                        e.currentTarget.style.backgroundColor = '#f3f4f6';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.color = '#9ca3af';
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                            )}
                            <h1
                                className="text-xl font-medium tracking-wider"
                                style={{ color: '#9ca3af' }}
                            >
                                COURSE SELECTION
                            </h1>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {selectedSubject && (
                        <div className="relative">
                            <Search
                                className="w-4 h-4 absolute top-1/2 -translate-y-1/2"
                                style={{ left: 16, color: '#9ca3af' }}
                            />
                            <input
                                type="text"
                                placeholder="Search syllabus..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="text-sm focus:outline-none"
                                style={{
                                    paddingLeft: 40,
                                    paddingRight: 16,
                                    paddingTop: 10,
                                    paddingBottom: 10,
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #f3f4f6',
                                    borderRadius: 9999,
                                    width: 256,
                                    color: '#111827',
                                    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                                }}
                            />
                        </div>
                    )}
                    <div
                        className="flex items-center gap-1.5"
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #f3f4f6',
                            borderRadius: 9999,
                            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                        }}
                    >
                        <Zap className="w-4 h-4" style={{ color: '#eab308', fill: '#eab308' }} />
                        <span className="text-sm font-bold tracking-wide" style={{ color: '#1f2937' }}>
                            HSC
                        </span>
                    </div>
                </div>
            </header>

            {/* ── BODY ── */}
            {!selectedSubject ? (
                /* ───────── Selection Screen ───────── */
                <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
                    <div
                        style={{
                            maxWidth: 768,
                            width: '100%',
                            backgroundColor: '#ffffff',
                            borderRadius: 24,
                            padding: '2.5rem',
                            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                            border: '1px solid #f3f4f6',
                        }}
                    >
                        <h2
                            className="text-3xl font-bold"
                            style={{ color: '#111827', marginBottom: 8 }}
                        >
                            {selectedYear ? 'Select Subject' : 'Select Year'}
                        </h2>
                        <p style={{ color: '#6b7280', marginBottom: 32 }}>
                            {selectedYear
                                ? 'Choose a course to view its syllabus.'
                                : 'Which year are you studying?'}
                        </p>

                        {selectedYear && (
                            <button
                                onClick={() => setSelectedYear(null)}
                                className="flex items-center text-sm font-semibold cursor-pointer"
                                style={{ color: '#6b7280', marginBottom: 24 }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#111827')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = '#6b7280')}
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" /> Back to Years
                            </button>
                        )}

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                                gap: 16,
                            }}
                        >
                            {!selectedYear
                                ? YEARS.map((year) => (
                                    <button
                                        key={year.id}
                                        onClick={() => setSelectedYear(year.id)}
                                        className="flex items-center cursor-pointer group"
                                        style={{
                                            padding: 24,
                                            backgroundColor: '#f9fafb',
                                            border: '1px solid #f3f4f6',
                                            borderRadius: 16,
                                            transition: 'all 150ms',
                                            textAlign: 'left',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = '#fcd34d';
                                            e.currentTarget.style.backgroundColor = '#fff9e6';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = '#f3f4f6';
                                            e.currentTarget.style.backgroundColor = '#f9fafb';
                                        }}
                                    >
                                        <div
                                            className="flex items-center justify-center shrink-0"
                                            style={{
                                                width: 56,
                                                height: 56,
                                                backgroundColor: '#ffffff',
                                                boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                                                border: '1px solid #f3f4f6',
                                                borderRadius: 12,
                                                marginRight: 20,
                                                transition: 'transform 150ms',
                                            }}
                                        >
                                            <GraduationCap className="w-7 h-7" style={{ color: '#374151' }} />
                                        </div>
                                        <div>
                                            <h3
                                                className="text-xl font-bold"
                                                style={{ color: '#111827' }}
                                            >
                                                {year.title}
                                            </h3>
                                            <p className="text-sm" style={{ color: '#6b7280' }}>
                                                View courses
                                            </p>
                                        </div>
                                    </button>
                                ))
                                : (SUBJECTS[selectedYear] || []).map((subject) => (
                                    <button
                                        key={subject}
                                        onClick={() => handleSubjectSelect(subject)}
                                        className="flex items-center cursor-pointer"
                                        style={{
                                            padding: 24,
                                            backgroundColor: '#f9fafb',
                                            border: '1px solid #f3f4f6',
                                            borderRadius: 16,
                                            transition: 'all 150ms',
                                            textAlign: 'left',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = '#93c5fd';
                                            e.currentTarget.style.backgroundColor = '#eff6ff';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = '#f3f4f6';
                                            e.currentTarget.style.backgroundColor = '#f9fafb';
                                        }}
                                    >
                                        <div
                                            className="flex items-center justify-center shrink-0"
                                            style={{
                                                width: 56,
                                                height: 56,
                                                backgroundColor: '#ffffff',
                                                boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                                                border: '1px solid #f3f4f6',
                                                borderRadius: 12,
                                                marginRight: 20,
                                                transition: 'transform 150ms',
                                            }}
                                        >
                                            <Library className="w-7 h-7" style={{ color: '#374151' }} />
                                        </div>
                                        <div>
                                            <h3
                                                className="text-lg font-bold"
                                                style={{ color: '#111827' }}
                                            >
                                                {subject}
                                            </h3>
                                            <p className="text-sm" style={{ color: '#6b7280' }}>
                                                Explore syllabus
                                            </p>
                                        </div>
                                    </button>
                                ))}
                        </div>
                    </div>
                </div>
            ) : (
                /* ───────── Syllabus Content Grid ───────── */
                <div
                    className="flex-1 overflow-hidden"
                    style={{ padding: '0 2rem 2rem' }}
                >
                    {loading ? (
                        <div
                            className="h-full flex flex-col items-center justify-center"
                            style={{ color: '#9ca3af' }}
                        >
                            <div
                                className="w-8 h-8 border-2 rounded-full animate-spin"
                                style={{
                                    borderColor: '#e5e7eb',
                                    borderTopColor: '#3b82f6',
                                    marginBottom: 16,
                                }}
                            />
                            <p>Loading taxonomy…</p>
                        </div>
                    ) : topics.length === 0 ? (
                        <div
                            className="h-full flex flex-col items-center justify-center"
                            style={{ color: '#9ca3af' }}
                        >
                            <BookOpen className="w-12 h-12 mb-4" style={{ color: '#d1d5db' }} />
                            <p className="text-lg font-medium" style={{ color: '#6b7280' }}>
                                No syllabus data found
                            </p>
                            <p className="text-sm mt-1">
                                Import syllabus dot points from Settings to populate this view.
                            </p>
                        </div>
                    ) : (
                        <div className="h-full flex gap-8" style={{ flexDirection: 'row' }}>
                            {/* ── Left Column: Topic Navigation ── */}
                            <div
                                className="overflow-y-auto custom-scrollbar shrink-0"
                                style={{ width: 288 }}
                            >
                                <nav
                                    style={{
                                        backgroundColor: '#ffffff',
                                        border: '1px solid #e5e7eb',
                                        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                    }}
                                >
                                    {topics.map((topic, index) => {
                                        const isActive = activeTopic === topic;
                                        const isLast = index === topics.length - 1;

                                        return (
                                            <button
                                                key={topic}
                                                onClick={() => handleTopicClick(topic)}
                                                className="text-left cursor-pointer"
                                                style={{
                                                    padding: '16px 20px',
                                                    fontSize: 14,
                                                    lineHeight: 1.4,
                                                    transition: 'all 200ms',
                                                    backgroundColor: isActive ? '#f4f4f5' : '#ffffff',
                                                    fontWeight: isActive ? 700 : 400,
                                                    color: isActive ? '#111827' : '#374151',
                                                    borderLeft: isActive ? '4px solid #cc0000' : '4px solid transparent',
                                                    paddingLeft: isActive ? 16 : 20,
                                                    borderBottom: !isLast ? '1px solid #e5e7eb' : 'none',
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isActive) e.currentTarget.style.backgroundColor = '#f9fafb';
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isActive) e.currentTarget.style.backgroundColor = '#ffffff';
                                                }}
                                            >
                                                <span style={{ display: 'block', paddingRight: 8 }}>{topic}</span>
                                            </button>
                                        );
                                    })}
                                </nav>
                            </div>

                            {/* ── Right Column: Subtopics + Dot Points ── */}
                            <div
                                className="flex-1 overflow-hidden flex flex-col"
                                style={{
                                    backgroundColor: '#ffffff',
                                    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                                    border: '1px solid #e5e7eb',
                                    borderTop: '8px solid #002664',
                                }}
                            >
                                {activeTopic ? (
                                    <div
                                        id="syllabus-content-scroll"
                                        className="flex-1 overflow-y-auto custom-scrollbar"
                                        style={{ padding: '2rem 3rem', scrollBehavior: 'smooth' }}
                                    >
                                        <div style={{ maxWidth: 896 }}>
                                            <h2
                                                className="text-3xl font-bold"
                                                style={{ color: '#111827', marginBottom: 8 }}
                                            >
                                                {activeTopic}
                                            </h2>
                                            <p style={{ color: '#6b7280', marginBottom: 32 }}>
                                                Subtopics
                                            </p>

                                            {filteredSubtopicEntries.length === 0 ? (
                                                <div
                                                    className="flex flex-col items-center justify-center"
                                                    style={{ padding: '3rem 0', color: '#9ca3af' }}
                                                >
                                                    <Search className="w-8 h-8 mb-3" style={{ color: '#d1d5db' }} />
                                                    <p className="text-sm">No subtopics match your search.</p>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col" style={{ gap: 12 }}>
                                                    {filteredSubtopicEntries.map(([heading, points]) => {
                                                        const isExpanded = expandedSubtopic === heading;

                                                        return (
                                                            <div key={heading}>
                                                                <button
                                                                    onClick={() =>
                                                                        setExpandedSubtopic(isExpanded ? null : heading)
                                                                    }
                                                                    className="text-left w-full cursor-pointer"
                                                                    style={{
                                                                        padding: 20,
                                                                        border: '1px solid #f3f4f6',
                                                                        borderRadius: 12,
                                                                        backgroundColor: isExpanded ? '#fffbeb' : '#f9fafb',
                                                                        borderColor: isExpanded ? '#fcd34d' : '#f3f4f6',
                                                                        transition: 'all 150ms',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'space-between',
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        if (!isExpanded) {
                                                                            e.currentTarget.style.backgroundColor = '#fff9e6';
                                                                            e.currentTarget.style.borderColor = '#fde68a';
                                                                        }
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        if (!isExpanded) {
                                                                            e.currentTarget.style.backgroundColor = '#f9fafb';
                                                                            e.currentTarget.style.borderColor = '#f3f4f6';
                                                                        }
                                                                    }}
                                                                >
                                                                    <h3
                                                                        className="font-semibold"
                                                                        style={{ fontSize: 17, color: '#1f2937' }}
                                                                    >
                                                                        {heading}
                                                                    </h3>
                                                                    {isExpanded ? (
                                                                        <ChevronDown
                                                                            className="w-5 h-5 shrink-0"
                                                                            style={{ color: '#d97706' }}
                                                                        />
                                                                    ) : (
                                                                        <ChevronRight
                                                                            className="w-5 h-5 shrink-0"
                                                                            style={{ color: '#d1d5db' }}
                                                                        />
                                                                    )}
                                                                </button>

                                                                {/* Expanded dot points */}
                                                                {isExpanded && (
                                                                    <div
                                                                        style={{
                                                                            marginTop: 4,
                                                                            padding: '16px 24px',
                                                                            backgroundColor: '#fffbeb',
                                                                            borderLeft: '3px solid #fcd34d',
                                                                            borderRadius: '0 0 12px 12px',
                                                                        }}
                                                                    >
                                                                        <ul
                                                                            style={{
                                                                                listStyle: 'none',
                                                                                padding: 0,
                                                                                margin: 0,
                                                                                display: 'flex',
                                                                                flexDirection: 'column',
                                                                                gap: 12,
                                                                            }}
                                                                        >
                                                                            {points.map((point, i) => (
                                                                                <li
                                                                                    key={point.id}
                                                                                    className="flex"
                                                                                    style={{ gap: 12, alignItems: 'flex-start' }}
                                                                                >
                                                                                    <span
                                                                                        className="shrink-0 flex items-center justify-center"
                                                                                        style={{
                                                                                            width: 24,
                                                                                            height: 24,
                                                                                            borderRadius: '50%',
                                                                                            backgroundColor: '#fef3c7',
                                                                                            color: '#92400e',
                                                                                            fontSize: 11,
                                                                                            fontWeight: 700,
                                                                                            marginTop: 1,
                                                                                        }}
                                                                                    >
                                                                                        {i + 1}
                                                                                    </span>
                                                                                    <RenderLatexText
                                                                                        text={point.text}
                                                                                        className="flex-1"
                                                                                        style={{
                                                                                            fontSize: 14,
                                                                                            lineHeight: 1.6,
                                                                                            color: '#374151',
                                                                                            margin: 0,
                                                                                        }}
                                                                                    />
                                                                                    {isDevMode && (
                                                                                        <button
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                handleDeleteDotPoint(point.id, activeTopic!, heading);
                                                                                            }}
                                                                                            disabled={deletingIds.has(point.id)}
                                                                                            className="shrink-0 cursor-pointer disabled:opacity-30"
                                                                                            style={{
                                                                                                padding: 4,
                                                                                                borderRadius: 6,
                                                                                                color: '#ef4444',
                                                                                                backgroundColor: 'transparent',
                                                                                                border: 'none',
                                                                                                transition: 'background-color 150ms',
                                                                                                marginTop: 1,
                                                                                            }}
                                                                                            onMouseEnter={(e) => {
                                                                                                e.currentTarget.style.backgroundColor = '#fef2f2';
                                                                                            }}
                                                                                            onMouseLeave={(e) => {
                                                                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                                                            }}
                                                                                            title="Delete this dot point"
                                                                                        >
                                                                                            <Trash2 className="w-4 h-4" />
                                                                                        </button>
                                                                                    )}
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className="flex-1 flex flex-col items-center justify-center"
                                        style={{ color: '#9ca3af' }}
                                    >
                                        <BookOpen className="w-12 h-12 mb-4" style={{ color: '#d1d5db' }} />
                                        <p>Select a topic to view subtopics.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* scrollbar styles */}
            <style
                dangerouslySetInnerHTML={{
                    __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e5e7eb; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #d1d5db; }
      `,
                }}
            />
        </div>
    );
}
