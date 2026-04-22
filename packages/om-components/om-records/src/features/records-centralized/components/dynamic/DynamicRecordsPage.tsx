import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Paper,
    Card,
    CardContent,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    CircularProgress,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Breadcrumbs,
    Link,
    IconButton,
    Tooltip,
} from '@mui/material';
import {
    Home as HomeIcon,
    TableChart as RecordsIcon,
    Refresh as RefreshIcon,
    Storage as DatabaseIcon,
} from '@mui/icons-material';
import { axiosInstance } from '@/shared/lib/axiosInstance';
import { getTableData, RecordTableData } from '@/shared/lib/dynamicRecordsApi';

interface ApiResponse {
    success: boolean;
    data?: any;
    message?: string;
    error?: {
        message: string;
        code: string;
        status: number;
    };
    timestamp: string;
}

interface TableData {
    data: any[][];
    columns: number;
    rows: number;
}

const DynamicRecordsPage: React.FC = () => {
    const [selectedDb, setSelectedDb] = useState<string>('');
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [availableTables, setAvailableTables] = useState<string[]>([]);
    const [tableData, setTableData] = useState<TableData | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingTables, setLoadingTables] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [availableDatabases, setAvailableDatabases] = useState<string[]>([]);
    const [loadingDatabases, setLoadingDatabases] = useState(true);

    // Generate column headers (Col1, Col2, etc.)
    const columnHeaders = useMemo(() => {
        if (!tableData?.data || tableData.data.length === 0) return [];
        const maxColumns = Math.max(...tableData.data.map(row => row.length));
        return Array.from({ length: maxColumns }, (_, i) => `Col${i + 1}`);
    }, [tableData]);

    // Fetch available databases from the API
    const fetchDatabases = async () => {
        try {
            setLoadingDatabases(true);
            console.log('🔍 Fetching available church databases...');

            const response = await axiosInstance.get<ApiResponse>('/../features/records/records/databases');
            console.log('🔍 Database API Response:', response);

            if (response.data?.success && response.data?.data) {
                const databases = response.data.data as unknown as string[];
                console.log('✅ Successfully parsed databases:', databases);
                setAvailableDatabases(databases);

                // Auto-select first database if available and none selected
                if (databases.length > 0 && !selectedDb) {
                    console.log(`🎯 Auto-selecting database: ${databases[0]}`);
                    setSelectedDb(databases[0]);
                }

                console.log(`✅ Found ${databases.length} church databases:`, databases);
            } else {
                console.warn('⚠️ No church databases found or invalid response structure:', response.data);
                setAvailableDatabases([]);
            }
        } catch (err: any) {
            console.error('❌ Error fetching databases:', err);
            console.error('❌ Error details:', err.response?.data);
            setError('Failed to load available databases');
            setAvailableDatabases([]);
        } finally {
            setLoadingDatabases(false);
        }
    };

    // Fetch available tables for selected database
    const fetchTables = async (database: string) => {
        if (!database) return;

        setLoadingTables(true);
        setError(null);

        try {
            console.log(`🔍 Fetching tables for database: ${database}`);

            const response = await axiosInstance.get<ApiResponse>(`/../features/records/records/list`, {
                params: { db: database }
            });

            console.log('📊 API Response:', response.data);

            if (response.data?.success && response.data?.data) {
                console.log('📊 Raw data from API:', response.data.data);
                const data = response.data.data as { [tableName: string]: any[][] };
                const tableNames = Object.keys(data);
                console.log('📊 Available tables:', tableNames);

                setAvailableTables(tableNames);

                // Auto-select first table if available
                if (tableNames.length > 0) {
                    console.log(`🎯 Auto-selecting first table: ${tableNames[0]}`);
                    setSelectedTable(tableNames[0]);
                }
            } else {
                console.error('❌ API response structure invalid:', response.data);
                setError('Failed to fetch tables data');
                setAvailableTables([]);
            }
        } catch (err: any) {
            console.error('❌ Error fetching tables:', err);
            setError(err.response?.data?.message || 'Error fetching tables');
            setAvailableTables([]);
        } finally {
            setLoadingTables(false);
        }
    };

    // Fetch table data using the working API pattern
    const fetchTableData = async (database: string, table: string) => {
        if (!database || !table) return;

        setLoading(true);
        setError(null);

        try {
            console.log(`🔍 Fetching data for table: ${table} in database: ${database}`);

            // Use the same API pattern as the working Simple Records page
            const data = await getTableData(database, table, {
                limit: 100,
                offset: 0,
                orderByPos: 1,
                orderDir: 'desc'
            });

            console.log('📊 Table data response:', data);

            if (data?.rows) {
                setTableData({
                    data: data.rows,
                    columns: data.rows.length > 0 ? data.rows[0].length : 0,
                    rows: data.rows.length
                });
            } else {
                setTableData(null);
            }
        } catch (err: any) {
            console.error('❌ Error fetching table data:', err);
            setError(err.message || 'Failed to fetch table data');
            setTableData(null);
        } finally {
            setLoading(false);
        }
    };

    // Handle database selection
    const handleDatabaseChange = (database: string) => {
        setSelectedDb(database);
        setSelectedTable('');
        setTableData(null);

        if (database) {
            fetchTables(database);
        }
    };

    // Handle table selection
    const handleTableChange = (table: string) => {
        setSelectedTable(table);

        if (selectedDb && table) {
            fetchTableData(selectedDb, table);
        }
    };

    // Handle refresh
    const handleRefresh = () => {
        if (selectedDb) {
            fetchTables(selectedDb);
        }
    };

    // Load available databases on component mount
    useEffect(() => {
        fetchDatabases();
    }, []);

    // Auto-fetch tables when database is selected
    useEffect(() => {
        if (selectedDb) {
            console.log(`🎯 useEffect triggered for database: ${selectedDb}`);
            fetchTables(selectedDb);
        }
    }, [selectedDb]);

    // Auto-fetch table data when table is selected
    useEffect(() => {
        if (selectedDb && selectedTable) {
            console.log(`🎯 useEffect triggered for table: ${selectedTable}`);
            fetchTableData(selectedDb, selectedTable);
        }
    }, [selectedDb, selectedTable]);

    return (
        <Box sx={{ p: 3 }}>
            {/* Breadcrumbs */}
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
                <Link color="inherit" href="/" sx={{ display: 'flex', alignItems: 'center' }}>
                    <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                    Home
                </Link>
                <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
                    <RecordsIcon sx={{ mr: 0.5 }} fontSize="inherit" />
                    Dynamic Records
                </Typography>
            </Breadcrumbs>

            {/* Header */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h4" component="h1">
                            Dynamic Records Explorer
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Refresh Data">
                                <IconButton
                                    onClick={handleRefresh}
                                    disabled={!selectedDb || loading}
                                    color="primary"
                                >
                                    <RefreshIcon />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>

                    <Typography variant="body2" color="text.secondary">
                        Explore church records data from any Orthodox Metrics database.
                        Select a database to view available _records tables.
                    </Typography>
                </CardContent>
            </Card>

            {/* Database Selection */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        <Box sx={{ minWidth: 300, flex: 1 }}>
                            <FormControl fullWidth>
                                <InputLabel id="database-select-label">
                                    <DatabaseIcon sx={{ mr: 1, fontSize: 'small' }} />
                                    Select Database
                                </InputLabel>
                                <Select
                                    labelId="database-select-label"
                                    value={selectedDb}
                                    label="Select Database"
                                    onChange={(e) => handleDatabaseChange(e.target.value)}
                                    disabled={loading}
                                >
                                    <MenuItem value="">
                                        <em>Choose a database...</em>
                                    </MenuItem>
                                    {availableDatabases.map((db) => (
                                        <MenuItem key={db} value={db}>
                                            {db}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>

                        <Box sx={{ minWidth: 300, flex: 1 }}>
                            <FormControl fullWidth disabled={!selectedDb || availableTables.length === 0}>
                                <InputLabel id="table-select-label">
                                    <RecordsIcon sx={{ mr: 1, fontSize: 'small' }} />
                                    Select Table
                                </InputLabel>
                                <Select
                                    labelId="table-select-label"
                                    value={selectedTable}
                                    label="Select Table"
                                    onChange={(e) => handleTableChange(e.target.value)}
                                >
                                    <MenuItem value="">
                                        <em>Choose a table...</em>
                                    </MenuItem>
                                    {availableTables.map((table) => (
                                        <MenuItem key={table} value={table}>
                                            {table}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Debug Information */}
            <Card sx={{ mb: 3, backgroundColor: '#f5f5f5' }}>
                <CardContent>
                    <Typography variant="h6" color="primary">Debug Information</Typography>
                    <Typography variant="body2">Selected DB: {selectedDb || 'None'}</Typography>
                    <Typography variant="body2">Available Databases: {JSON.stringify(availableDatabases)}</Typography>
                    <Typography variant="body2">Available Tables: {JSON.stringify(availableTables)}</Typography>
                    <Typography variant="body2">Selected Table: {selectedTable || 'None'}</Typography>
                    <Typography variant="body2">Table Data Rows: {tableData?.rows || 0}</Typography>
                    <Typography variant="body2">Table Data Columns: {tableData?.columns || 0}</Typography>
                    <Typography variant="body2">Loading: {loading.toString()}</Typography>
                    <Typography variant="body2">Loading Databases: {loadingDatabases.toString()}</Typography>
                    <Typography variant="body2">Loading Tables: {loadingTables.toString()}</Typography>
                    <Typography variant="body2">Error: {error || 'None'}</Typography>
                </CardContent>
            </Card>

            {/* Loading State */}
            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            )}

            {/* Error State */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    <Typography variant="h6">Error loading records</Typography>
                    <Typography variant="body2">{error}</Typography>
                </Alert>
            )}

            {/* Data Display */}
            {!loading && !error && selectedTable && tableData?.data && tableData.data.length > 0 && (
                <Card>
                    <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">
                                {selectedTable}
                            </Typography>
                            <Chip
                                label={`${tableData.data.length} records`}
                                color="primary"
                                variant="outlined"
                            />
                        </Box>

                        <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                            <Table stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        {columnHeaders.map((header) => (
                                            <TableCell key={header} sx={{ fontWeight: 'bold' }}>
                                                {header}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {tableData.data.map((row: any[], rowIndex: number) => (
                                        <TableRow
                                            key={rowIndex}
                                            hover
                                            sx={{ '&:nth-of-type(odd)': { backgroundColor: 'action.hover' } }}
                                        >
                                            {columnHeaders.map((_, colIndex) => (
                                                <TableCell key={colIndex}>
                                                    {row[colIndex] !== undefined && row[colIndex] !== null
                                                        ? String(row[colIndex])
                                                        : '-'
                                                    }
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            )}

            {/* Empty State */}
            {!loading && !error && selectedDb && availableTables.length === 0 && (
                <Alert severity="info">
                    <Typography variant="h6">No Records Tables Found</Typography>
                    <Typography variant="body2">
                        No tables ending with '_records' were found in database {selectedDb}.
                    </Typography>
                </Alert>
            )}

            {/* No Selection State */}
            {!loading && !error && !selectedDb && (
                <Alert severity="info">
                    <Typography variant="h6">Select a Database</Typography>
                    <Typography variant="body2">
                        Choose a church database from the dropdown above to explore its records tables.
                    </Typography>
                </Alert>
            )}
        </Box>
    );
};

export default DynamicRecordsPage;
