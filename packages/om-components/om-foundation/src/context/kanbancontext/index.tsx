import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../AuthContext';
import { apiClient } from '@/api/utils/axiosInstance';

// Enhanced types to match backend structure
export interface KanbanLabel {
    id: number;
    name: string;
    color: string;
}

export interface KanbanTask {
    id: number;
    board_id: number;
    column_id: number;
    title: string;
    description?: string;
    assigned_to?: number;
    assigned_to_name?: string;
    assigned_to_email?: string;
    created_by: number;
    created_by_name?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'todo' | 'in_progress' | 'review' | 'done';
    due_date?: string;
    position: number;
    labels: KanbanLabel[];
    attachments_count?: number;
    comments_count?: number;
    created_at: string;
    updated_at: string;
}

export interface KanbanColumn {
    id: number;
    board_id: number;
    name: string;
    color?: string;
    position: number;
    wip_limit?: number;
    created_at: string;
    updated_at: string;
    child: KanbanTask[]; // Tasks in this column
}

export interface KanbanBoard {
    id: number;
    name: string;
    description?: string;
    color?: string;
    is_private: boolean;
    is_archived: boolean;
    created_by: number;
    created_by_name?: string;
    role?: string; // User's role on this board
    task_count?: number;
    member_count?: number;
    created_at: string;
    updated_at: string;
    columns?: KanbanColumn[];
    labels?: KanbanLabel[];
}

// Legacy support for old TodoCategory interface
export interface TodoCategory {
    id: number;
    name: string;
    child: KanbanTask[];
}

interface KanbanDataContextProps {
    children: ReactNode;
}

interface KanbanContextType {
    // New backend-integrated state
    boards: KanbanBoard[];
    currentBoard: KanbanBoard | null;
    loading: boolean;
    error: string | null;

    // Board operations
    fetchBoards: () => Promise<void>;
    fetchBoard: (boardId: number) => Promise<void>;
    createBoard: (boardData: Partial<KanbanBoard>) => Promise<void>;
    updateBoard: (boardId: number, updates: Partial<KanbanBoard>) => Promise<void>;
    deleteBoard: (boardId: number) => Promise<void>;

    // Column operations
    createColumn: (boardId: number, columnData: Partial<KanbanColumn>) => Promise<void>;
    updateColumn: (columnId: number, updates: Partial<KanbanColumn>) => Promise<void>;
    deleteColumn: (columnId: number) => Promise<void>;

    // Task operations
    createTask: (taskData: Partial<KanbanTask>) => Promise<void>;
    updateTask: (taskId: number, updates: Partial<KanbanTask>) => Promise<void>;
    deleteTask: (taskId: number) => Promise<void>;
    moveTask: (taskId: number, targetColumnId: number, position: number) => Promise<void>;

    // Legacy support for existing components
    todoCategories: TodoCategory[];
    setTodoCategories: (categories: TodoCategory[]) => void;
    addCategory: (categoryName: string) => Promise<void>;
    deleteCategory: (categoryId: string) => Promise<void>;
    clearAllTasks: (categoryId: string) => Promise<void>;
    deleteTodo: (taskId: number) => Promise<void>;
    setError: (error: string | null) => void;
}

export const KanbanDataContext = createContext<KanbanContextType>({} as KanbanContextType);

export const KanbanDataContextProvider: React.FC<KanbanDataContextProps> = ({ children }) => {
    const [boards, setBoards] = useState<KanbanBoard[]>([]);
    const [currentBoard, setCurrentBoard] = useState<KanbanBoard | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Legacy state for backward compatibility
    const [todoCategories, setTodoCategories] = useState<TodoCategory[]>([]);

    const { authenticated } = useAuth();

    // Convert current board columns to legacy todoCategories format
    useEffect(() => {
        if (currentBoard?.columns) {
            const categories: TodoCategory[] = currentBoard.columns.map(column => ({
                id: column.id,
                name: column.name,
                child: column.child || []
            }));
            setTodoCategories(categories);
        }
    }, [currentBoard]);

    // Clear boards when user is not authenticated (but don't auto-fetch on authentication)
    useEffect(() => {
        if (!authenticated) {
            console.log('User not authenticated, clearing boards');
            setBoards([]);
            setCurrentBoard(null);
        }
        // Note: Removed auto-fetch on authentication to improve login performance
        // Boards will be fetched only when explicitly requested (e.g., visiting Kanban page)
    }, [authenticated]);

    // Fetch all boards for the user
    const fetchBoards = async () => {
        if (!authenticated) {
            console.log('Not authenticated, skipping board fetch');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            console.log('Fetching boards from API...');

            const data = await apiClient.get<any>('/kanban/boards');
            console.log('Boards API response data:', data);
            
            if (data.success) {
                // Ensure boards is always an array
                const boardsArray = Array.isArray(data.boards) ? data.boards : [];
                console.log(`Setting ${boardsArray.length} boards in context`);
                setBoards(boardsArray);
            } else {
                console.error('API returned success=false:', data.message);
                setBoards([]); // Ensure empty array on failure
                throw new Error(data.message || 'Failed to fetch boards');
            }
        } catch (err: any) {
            console.error('Error in fetchBoards:', err);
            setError(err.message || 'Failed to fetch boards');
            setBoards([]); // Ensure empty array on error
        } finally {
            setLoading(false);
        }
    };

    // Fetch specific board with columns and tasks
    const fetchBoard = async (boardId: number) => {
        try {
            setLoading(true);
            setError(null);

            const data = await apiClient.get<any>(`/kanban/boards/${boardId}`);
            if (data.success) {
                setCurrentBoard(data.board);
            } else {
                throw new Error(data.message || 'Failed to fetch board');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch board');
        } finally {
            setLoading(false);
        }
    };

    // Create new board
    const createBoard = async (boardData: Partial<KanbanBoard>) => {
        try {
            const data = await apiClient.post<any>('/kanban/boards', boardData);
            if (data.success) {
                await fetchBoards(); // Refresh boards list
            } else {
                throw new Error(data.message || 'Failed to create board');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create board');
            throw err;
        }
    };

    // Update board
    const updateBoard = async (boardId: number, updates: Partial<KanbanBoard>) => {
        try {
            const data = await apiClient.put<any>(`/kanban/boards/${boardId}`, updates);
            if (data.success) {
                await fetchBoards(); // Refresh boards list
                if (currentBoard?.id === boardId) {
                    await fetchBoard(boardId); // Refresh current board if it's the one being updated
                }
            } else {
                throw new Error(data.message || 'Failed to update board');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to update board');
            throw err;
        }
    };

    // Delete board
    const deleteBoard = async (boardId: number) => {
        try {
            const data = await apiClient.delete<any>(`/kanban/boards/${boardId}`);
            if (data.success) {
                await fetchBoards(); // Refresh boards list
                if (currentBoard?.id === boardId) {
                    setCurrentBoard(null); // Clear current board if it was deleted
                }
            } else {
                throw new Error(data.message || 'Failed to delete board');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to delete board');
            throw err;
        }
    };

    // Create column
    const createColumn = async (boardId: number, columnData: Partial<KanbanColumn>) => {
        try {
            const data = await apiClient.post<any>('/kanban/columns', { ...columnData, board_id: boardId });
            if (data.success) {
                if (currentBoard?.id === boardId) {
                    await fetchBoard(boardId); // Refresh current board
                }
            } else {
                throw new Error(data.message || 'Failed to create column');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create column');
            throw err;
        }
    };

    // Update column
    const updateColumn = async (columnId: number, updates: Partial<KanbanColumn>) => {
        try {
            const data = await apiClient.put<any>(`/kanban/columns/${columnId}`, updates);
            if (data.success && currentBoard) {
                await fetchBoard(currentBoard.id); // Refresh current board
            } else if (!data.success) {
                throw new Error(data.message || 'Failed to update column');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to update column');
            throw err;
        }
    };

    // Delete column
    const deleteColumn = async (columnId: number) => {
        try {
            const data = await apiClient.delete<any>(`/kanban/columns/${columnId}`);
            if (data.success && currentBoard) {
                await fetchBoard(currentBoard.id); // Refresh current board
            } else if (!data.success) {
                throw new Error(data.message || 'Failed to delete column');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to delete column');
            throw err;
        }
    };

    // Create task
    const createTask = async (taskData: Partial<KanbanTask>) => {
        try {
            const data = await apiClient.post<any>('/kanban/tasks', taskData);
            if (data.success && currentBoard) {
                await fetchBoard(currentBoard.id); // Refresh current board
            } else if (!data.success) {
                throw new Error(data.message || 'Failed to create task');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create task');
            throw err;
        }
    };

    // Update task
    const updateTask = async (taskId: number, updates: Partial<KanbanTask>) => {
        try {
            const data = await apiClient.put<any>(`/kanban/tasks/${taskId}`, updates);
            if (data.success && currentBoard) {
                await fetchBoard(currentBoard.id); // Refresh current board
            } else if (!data.success) {
                throw new Error(data.message || 'Failed to update task');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to update task');
            throw err;
        }
    };

    // Delete task
    const deleteTask = async (taskId: number) => {
        try {
            const data = await apiClient.delete<any>(`/kanban/tasks/${taskId}`);
            if (data.success && currentBoard) {
                await fetchBoard(currentBoard.id); // Refresh current board
            } else if (!data.success) {
                throw new Error(data.message || 'Failed to delete task');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to delete task');
            throw err;
        }
    };

    // Move task to different column/position
    const moveTask = async (taskId: number, targetColumnId: number, position: number) => {
        try {
            const data = await apiClient.put<any>(`/kanban/tasks/${taskId}/move`, { column_id: targetColumnId, position });
            if (data.success && currentBoard) {
                await fetchBoard(currentBoard.id); // Refresh current board
            } else if (!data.success) {
                throw new Error(data.message || 'Failed to move task');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to move task');
            throw err;
        }
    };

    // Legacy function implementations for backward compatibility
    const addCategory = async (categoryName: string) => {
        if (currentBoard) {
            await createColumn(currentBoard.id, { name: categoryName });
        }
    };

    const deleteCategory = async (categoryId: string) => {
        await deleteColumn(parseInt(categoryId));
    };

    const clearAllTasks = async (categoryId: string) => {
        if (currentBoard) {
            // Get all tasks in the column and delete them
            const column = currentBoard.columns?.find(col => col.id.toString() === categoryId);
            if (column?.child) {
                for (const task of column.child) {
                    await deleteTask(task.id);
                }
            }
        }
    };

    const deleteTodo = async (taskId: number) => {
        await deleteTask(taskId);
    };

    // Clear data when not authenticated
    useEffect(() => {
        if (!authenticated) {
            setBoards([]);
            setCurrentBoard(null);
            setTodoCategories([]);
        }
        // Note: Removed auto-loading of boards to improve login performance
        // Boards and tasks will be loaded only when user explicitly navigates to Kanban page
    }, [authenticated]);

    // Auto-load first board when boards are fetched (only if user is actively using Kanban)
    useEffect(() => {
        if (boards.length > 0 && !currentBoard && window.location.pathname.includes('/kanban')) {
            fetchBoard(boards[0].id);
        }
    }, [boards]);

    return (
        <KanbanDataContext.Provider
            value={{
                // New backend-integrated state
                boards,
                currentBoard,
                loading,
                error,

                // Board operations
                fetchBoards,
                fetchBoard,
                createBoard,
                updateBoard,
                deleteBoard,

                // Column operations
                createColumn,
                updateColumn,
                deleteColumn,

                // Task operations
                createTask,
                updateTask,
                deleteTask,
                moveTask,

                // Legacy support
                todoCategories,
                setTodoCategories,
                addCategory,
                deleteCategory,
                clearAllTasks,
                deleteTodo,
                setError,
            }}
        >
            {children}
        </KanbanDataContext.Provider>
    );
};