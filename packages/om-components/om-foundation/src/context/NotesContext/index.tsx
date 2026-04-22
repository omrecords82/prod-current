
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { NotesType } from '../../types/apps/note';
import { useAuth } from '../AuthContext';
import { ensureArray } from '../../utils/arrayUtils';
import { apiClient } from '@/api/utils/axiosInstance';

interface NotesFilters {
    category: string;
    search: string;
    archived: boolean;
    pinned: boolean;
}

// Define context type
interface NotesContextType {
    notes: NotesType[];
    categories: any[];
    loading: boolean;
    error: string | null;
    selectedNoteId: number | null;
    filters: NotesFilters;
    selectNote: (id: number) => void;
    addNote: (newNote: Partial<NotesType>) => Promise<void>;
    updateNote: (id: number, updates: Partial<NotesType>) => Promise<void>;
    deleteNote: (id: number) => Promise<void>;
    bulkDeleteNotes: (noteIds: number[]) => Promise<void>;
    togglePin: (id: number) => Promise<void>;
    toggleArchive: (id: number) => Promise<void>;
    setFilter: (filterType: string, value: any) => void;
    refreshNotes: () => Promise<void>;
    shareNote: (id: number, userId: number, permission: string) => Promise<void>;
}

// Initial context values
const initialContext: NotesContextType = {
    notes: [],
    categories: [],
    loading: true,
    error: null,
    selectedNoteId: null,
    filters: {
        category: 'all',
        search: '',
        archived: false,
        pinned: false,
    },
    selectNote: () => { },
    addNote: async () => { },
    updateNote: async () => { },
    deleteNote: async () => { },
    bulkDeleteNotes: async () => { },
    togglePin: async () => { },
    toggleArchive: async () => { },
    setFilter: () => { },
    refreshNotes: async () => { },
    shareNote: async () => { },
};

// Create context
export const NotesContext = createContext<NotesContextType>(initialContext);

// Provider component
export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notes, setNotes] = useState<NotesType[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
    const [filters, setFilters] = useState(initialContext.filters);

    const { authenticated, user } = useAuth();

    // Fetch notes from the backend
    const fetchNotes = async () => {
        if (!authenticated) return;

        try {
            setLoading(true);
            setError(null);

            const queryParams = new URLSearchParams();
            if (filters.category !== 'all') queryParams.append('category', filters.category);
            if (filters.search) queryParams.append('search', filters.search);
            if (filters.archived) queryParams.append('archived', 'true');
            if (filters.pinned) queryParams.append('pinned', 'true');

            const data = await apiClient.get<any>(`/notes?${queryParams.toString()}`);

            if (data.success) {
                // Transform notes to include backward compatibility fields
                const transformedNotes = data.notes.map((note: any) => ({
                    ...note,
                    tags: Array.isArray(note.tags) ? note.tags : (note.tags ? JSON.parse(note.tags) : []),
                    datef: note.created_at || note.updated_at, // For backward compatibility
                }));

                setNotes(transformedNotes);
                // Auto-select first note if none selected
                if (!selectedNoteId && transformedNotes.length > 0) {
                    setSelectedNoteId(transformedNotes[0].id);
                }
            } else {
                setError(data.message || 'Failed to fetch notes');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch notes');
        } finally {
            setLoading(false);
        }
    };

    // Fetch categories
    const fetchCategories = async () => {
        if (!authenticated) return;

        try {
            const data = await apiClient.get<any>('/notes/categories');
            if (data.success) {
                setCategories(data.categories);
            }
        } catch (err) {
            console.error('Error fetching categories:', err);
        }
    };

    // Load data when authenticated or filters change
    useEffect(() => {
        if (authenticated) {
            fetchNotes();
            fetchCategories();
        } else {
            setNotes([]);
            setCategories([]);
            setLoading(false);
        }
    }, [authenticated, filters]);

    // Select a note by its ID
    const selectNote = (id: number) => {
        setSelectedNoteId(id);
    };

    // Add a new note
    const addNote = async (newNote: Partial<NotesType>) => {
        try {
            const data = await apiClient.post<any>('/notes', newNote);

            if (data.success) {
                const transformedNote = {
                    ...data.note,
                    tags: Array.isArray(data.note.tags) ? data.note.tags : (data.note.tags ? JSON.parse(data.note.tags) : []),
                    datef: data.note.created_at || data.note.updated_at, // For backward compatibility
                };
                setNotes(prev => [transformedNote, ...prev]);
                setSelectedNoteId(transformedNote.id);
            } else {
                throw new Error(data.message || 'Failed to create note');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create note');
            throw err;
        }
    };

    // Update a note by its ID
    const updateNote = async (id: number, updates: Partial<NotesType>) => {
        try {
            const data = await apiClient.put<any>(`/notes/${id}`, updates);

            if (data.success) {
                const transformedNote = {
                    ...data.note,
                    tags: Array.isArray(data.note.tags) ? data.note.tags : (data.note.tags ? JSON.parse(data.note.tags) : []),
                    datef: data.note.created_at || data.note.updated_at, // For backward compatibility
                };
                setNotes(prev => prev.map(note =>
                    note.id === id ? transformedNote : note
                ));
            } else {
                throw new Error(data.message || 'Failed to update note');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to update note');
            throw err;
        }
    };

    // Delete a note by its ID
    const deleteNote = async (id: number) => {
        try {
            const data = await apiClient.delete<any>(`/notes/${id}`);

            if (data.success) {
                setNotes(prev => prev.filter(note => note.id !== id));
                if (selectedNoteId === id) {
                    const remaining = notes.filter(note => note.id !== id);
                    setSelectedNoteId(remaining.length > 0 ? remaining[0].id : null);
                }
            } else {
                throw new Error(data.message || 'Failed to delete note');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to delete note');
            throw err;
        }
    };

    // Bulk delete notes
    const bulkDeleteNotes = async (noteIds: number[]) => {
        try {
            const data = await apiClient.post<any>('/notes/bulk-delete', { noteIds });

            if (data.success) {
                setNotes(prev => prev.filter(note => !noteIds.includes(note.id)));
                if (selectedNoteId && noteIds.includes(selectedNoteId)) {
                    const remaining = notes.filter(note => !noteIds.includes(note.id));
                    setSelectedNoteId(remaining.length > 0 ? remaining[0].id : null);
                }
            } else {
                throw new Error(data.message || 'Failed to delete notes');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to delete notes');
            throw err;
        }
    };

    // Toggle pin status
    const togglePin = async (id: number) => {
        const note = notes.find(n => n.id === id);
        if (note) {
            await updateNote(id, { is_pinned: !note.is_pinned });
        }
    };

    // Toggle archive status
    const toggleArchive = async (id: number) => {
        const note = notes.find(n => n.id === id);
        if (note) {
            await updateNote(id, { is_archived: !note.is_archived });
        }
    };

    // Set filter
    const setFilter = (filterType: string, value: any) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value,
        }));
    };

    // Refresh notes
    const refreshNotes = async () => {
        await fetchNotes();
    };

    // Share note
    const shareNote = async (id: number, userId: number, permission: string) => {
        try {
            const data = await apiClient.post<any>(`/notes/${id}/share`, {
                shared_with_user_id: userId,
                permission
            });

            if (data.success) {
                // Refresh notes to show updated sharing status
                await fetchNotes();
            } else {
                throw new Error(data.message || 'Failed to share note');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to share note');
            throw err;
        }
    };

    return (
        <NotesContext.Provider
            value={{
                notes,
                categories,
                loading,
                error,
                selectedNoteId,
                filters,
                selectNote,
                addNote,
                updateNote,
                deleteNote,
                bulkDeleteNotes,
                togglePin,
                toggleArchive,
                setFilter,
                refreshNotes,
                shareNote,
            }}
        >
            {children}
        </NotesContext.Provider>
    );
};


