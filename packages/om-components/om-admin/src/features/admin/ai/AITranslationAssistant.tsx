import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Grid,
    Chip,
    Stack,
    Alert,
    CircularProgress,
    Paper,
    Divider,
    IconButton,
    Tooltip
} from '@mui/material';
import { 
    IconLanguage, 
    IconTransform, 
    IconCopy, 
    IconCheck, 
    IconAlertCircle,
    IconBook,
    IconRefresh
} from '@tabler/icons-react';

interface TranslationResult {
    id: string;
    sourceLanguage: string;
    targetLanguage: string;
    sourceText: string;
    translatedText: string;
    status: 'translating' | 'completed' | 'error';
    timestamp: Date;
    confidence?: number;
}

const AITranslationAssistant: React.FC = () => {
    const [sourceLanguage, setSourceLanguage] = useState<string>('');
    const [targetLanguage, setTargetLanguage] = useState<string>('');
    const [sourceText, setSourceText] = useState<string>('');
    const [isTranslating, setIsTranslating] = useState<boolean>(false);
    const [results, setResults] = useState<TranslationResult[]>([]);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const languages = [
        { code: 'en', name: 'English' },
        { code: 'el', name: 'Greek (Liturgical)' },
        { code: 'ru', name: 'Russian (Church Slavonic)' },
        { code: 'ar', name: 'Arabic' },
        { code: 'ro', name: 'Romanian' },
        { code: 'sr', name: 'Serbian' },
        { code: 'bg', name: 'Bulgarian' },
        { code: 'mk', name: 'Macedonian' },
        { code: 'ge', name: 'Georgian' },
        { code: 'am', name: 'Amharic' },
        { code: 'cop', name: 'Coptic' }
    ];

    const handleTranslate = async () => {
        if (!sourceLanguage || !targetLanguage || !sourceText.trim()) return;

        const newResult: TranslationResult = {
            id: Date.now().toString(),
            sourceLanguage,
            targetLanguage,
            sourceText: sourceText.trim(),
            translatedText: '',
            status: 'translating',
            timestamp: new Date()
        };

        setResults(prev => [newResult, ...prev]);
        setIsTranslating(true);

        try {
            // Simulate AI translation
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const sourceLanguageName = languages.find(l => l.code === sourceLanguage)?.name || sourceLanguage;
            const targetLanguageName = languages.find(l => l.code === targetLanguage)?.name || targetLanguage;
            
            const translatedText = `[AI Translation from ${sourceLanguageName} to ${targetLanguageName}]

"${sourceText}"

Translation Result:
This is a simulated translation result. In a real implementation, this would connect to specialized Orthodox Christian translation services that understand liturgical terminology, theological concepts, and traditional phraseology.

Key considerations for Orthodox translations:
- Liturgical accuracy and reverence
- Traditional theological terminology
- Cultural and historical context
- Scriptural and patristic references`;

            setResults(prev => 
                prev.map(result => 
                    result.id === newResult.id 
                        ? { 
                            ...result, 
                            translatedText, 
                            status: 'completed',
                            confidence: Math.floor(Math.random() * 20) + 80 // 80-99%
                        }
                        : result
                )
            );
        } catch (error) {
            setResults(prev => 
                prev.map(result => 
                    result.id === newResult.id 
                        ? { ...result, status: 'error' }
                        : result
                )
            );
        } finally {
            setIsTranslating(false);
        }
    };

    const handleCopy = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (error) {
            console.error('Failed to copy text:', error);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'translating':
                return <CircularProgress size={16} />;
            case 'completed':
                return <IconCheck size={16} color="green" />;
            case 'error':
                return <IconAlertCircle size={16} color="red" />;
            default:
                return null;
        }
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 90) return 'success';
        if (confidence >= 75) return 'warning';
        return 'error';
    };

    return (
        <Box>
            <Card>
                <CardContent>
                    <Stack spacing={3}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <IconLanguage size={24} />
                            <Typography variant="h6">
                                AI Translation Assistant
                            </Typography>
                        </Box>

                        <Alert severity="info" icon={<IconBook />}>
                            Specialized translation for Orthodox Christian texts. Handles liturgical, theological, and scriptural content with cultural sensitivity.
                        </Alert>

                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Source Language</InputLabel>
                                    <Select
                                        value={sourceLanguage}
                                        label="Source Language"
                                        onChange={(e) => setSourceLanguage(e.target.value)}
                                    >
                                        {languages.map((lang) => (
                                            <MenuItem key={lang.code} value={lang.code}>
                                                {lang.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Target Language</InputLabel>
                                    <Select
                                        value={targetLanguage}
                                        label="Target Language"
                                        onChange={(e) => setTargetLanguage(e.target.value)}
                                    >
                                        {languages.map((lang) => (
                                            <MenuItem key={lang.code} value={lang.code}>
                                                {lang.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>

                        <TextField
                            fullWidth
                            multiline
                            rows={6}
                            label="Text to Translate"
                            placeholder="Enter liturgical text, prayers, theological content, or scriptural passages..."
                            value={sourceText}
                            onChange={(e) => setSourceText(e.target.value)}
                            helperText="Supports liturgical texts, prayers, theological documents, and scriptural passages"
                        />

                        <Box display="flex" gap={2}>
                            <Button
                                variant="contained"
                                onClick={handleTranslate}
                                disabled={!sourceLanguage || !targetLanguage || !sourceText.trim() || isTranslating}
                                startIcon={isTranslating ? <CircularProgress size={16} /> : <IconTransform />}
                            >
                                {isTranslating ? 'Translating...' : 'Translate'}
                            </Button>
                            
                            <Button
                                variant="outlined"
                                onClick={() => {
                                    const temp = sourceLanguage;
                                    setSourceLanguage(targetLanguage);
                                    setTargetLanguage(temp);
                                }}
                                startIcon={<IconRefresh />}
                                disabled={!sourceLanguage || !targetLanguage}
                            >
                                Swap Languages
                            </Button>
                        </Box>
                    </Stack>
                </CardContent>
            </Card>

            {results.length > 0 && (
                <Box mt={3}>
                    <Typography variant="h6" gutterBottom>
                        Translation Results
                    </Typography>
                    <Stack spacing={2}>
                        {results.map((result) => (
                            <Paper key={result.id} elevation={1} sx={{ p: 3 }}>
                                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Chip 
                                            label={`${languages.find(l => l.code === result.sourceLanguage)?.name} → ${languages.find(l => l.code === result.targetLanguage)?.name}`}
                                            size="small" 
                                            color="primary" 
                                        />
                                        {getStatusIcon(result.status)}
                                        {result.confidence && (
                                            <Chip 
                                                label={`${result.confidence}% confidence`}
                                                size="small"
                                                color={getConfidenceColor(result.confidence)}
                                                variant="outlined"
                                            />
                                        )}
                                    </Box>
                                    <Typography variant="caption" color="textSecondary">
                                        {result.timestamp.toLocaleString()}
                                    </Typography>
                                </Box>
                                
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="subtitle2" gutterBottom>
                                            Source Text:
                                        </Typography>
                                        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                                            <Typography variant="body2">
                                                {result.sourceText}
                                            </Typography>
                                        </Paper>
                                    </Grid>
                                    
                                    {result.translatedText && (
                                        <Grid item xs={12} md={6}>
                                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                                <Typography variant="subtitle2" gutterBottom>
                                                    Translation:
                                                </Typography>
                                                <Tooltip title="Copy translation">
                                                    <IconButton 
                                                        size="small"
                                                        onClick={() => handleCopy(result.translatedText, result.id)}
                                                    >
                                                        {copiedId === result.id ? (
                                                            <IconCheck size={16} color="green" />
                                                        ) : (
                                                            <IconCopy size={16} />
                                                        )}
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                            <Paper variant="outlined" sx={{ p: 2 }}>
                                                <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                                                    {result.translatedText}
                                                </Typography>
                                            </Paper>
                                        </Grid>
                                    )}
                                </Grid>
                            </Paper>
                        ))}
                    </Stack>
                </Box>
            )}
        </Box>
    );
};

export default AITranslationAssistant;
