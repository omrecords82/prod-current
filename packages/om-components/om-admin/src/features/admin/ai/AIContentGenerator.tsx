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
    Chip,
    Stack,
    Alert,
    CircularProgress,
    Paper,
    Divider
} from '@mui/material';
import { IconRobot, IconBulb, IconCheck, IconAlertCircle } from '@tabler/icons-react';

interface GenerationResult {
    id: string;
    type: string;
    content: string;
    status: 'generating' | 'completed' | 'error';
    timestamp: Date;
}

const AIContentGenerator: React.FC = () => {
    const [contentType, setContentType] = useState<string>('');
    const [prompt, setPrompt] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [results, setResults] = useState<GenerationResult[]>([]);

    const contentTypes = [
        { value: 'liturgical-text', label: 'Liturgical Text' },
        { value: 'sermon-outline', label: 'Sermon Outline' },
        { value: 'prayer', label: 'Prayer' },
        { value: 'bulletin-content', label: 'Bulletin Content' },
        { value: 'educational-content', label: 'Educational Content' },
        { value: 'announcement', label: 'Announcement' }
    ];

    const handleGenerate = async () => {
        if (!contentType || !prompt.trim()) return;

        const newResult: GenerationResult = {
            id: Date.now().toString(),
            type: contentType,
            content: '',
            status: 'generating',
            timestamp: new Date()
        };

        setResults(prev => [newResult, ...prev]);
        setIsGenerating(true);

        try {
            // Simulate AI content generation
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const generatedContent = `Generated ${contentType.replace('-', ' ')} content based on: "${prompt}"
            
This is a placeholder for AI-generated Orthodox Christian content. In a real implementation, this would connect to an AI service to generate appropriate liturgical, theological, or pastoral content.

Key themes addressed:
- Traditional Orthodox theology
- Pastoral care considerations
- Cultural sensitivity
- Scriptural foundations`;

            setResults(prev => 
                prev.map(result => 
                    result.id === newResult.id 
                        ? { ...result, content: generatedContent, status: 'completed' }
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
            setIsGenerating(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'generating':
                return <CircularProgress size={16} />;
            case 'completed':
                return <IconCheck size={16} color="green" />;
            case 'error':
                return <IconAlertCircle size={16} color="red" />;
            default:
                return null;
        }
    };

    return (
        <Box>
            <Card>
                <CardContent>
                    <Stack spacing={3}>
                        <Box display="flex" alignItems="center" gap={1}>
                            <IconRobot size={24} />
                            <Typography variant="h6">
                                AI Content Generator
                            </Typography>
                        </Box>

                        <Alert severity="info" icon={<IconBulb />}>
                            Generate Orthodox Christian content using AI assistance. Please review all generated content for theological accuracy.
                        </Alert>

                        <FormControl fullWidth>
                            <InputLabel>Content Type</InputLabel>
                            <Select
                                value={contentType}
                                label="Content Type"
                                onChange={(e) => setContentType(e.target.value)}
                            >
                                {contentTypes.map((type) => (
                                    <MenuItem key={type.value} value={type.value}>
                                        {type.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="Content Prompt"
                            placeholder="Describe the content you want to generate..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            helperText="Be specific about the topic, tone, and intended audience"
                        />

                        <Button
                            variant="contained"
                            onClick={handleGenerate}
                            disabled={!contentType || !prompt.trim() || isGenerating}
                            startIcon={isGenerating ? <CircularProgress size={16} /> : <IconRobot />}
                        >
                            {isGenerating ? 'Generating...' : 'Generate Content'}
                        </Button>
                    </Stack>
                </CardContent>
            </Card>

            {results.length > 0 && (
                <Box mt={3}>
                    <Typography variant="h6" gutterBottom>
                        Generated Content
                    </Typography>
                    <Stack spacing={2}>
                        {results.map((result) => (
                            <Paper key={result.id} elevation={1} sx={{ p: 2 }}>
                                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Chip 
                                            label={result.type.replace('-', ' ')} 
                                            size="small" 
                                            color="primary" 
                                        />
                                        {getStatusIcon(result.status)}
                                    </Box>
                                    <Typography variant="caption" color="textSecondary">
                                        {result.timestamp.toLocaleString()}
                                    </Typography>
                                </Box>
                                
                                {result.content && (
                                    <>
                                        <Divider sx={{ my: 1 }} />
                                        <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                                            {result.content}
                                        </Typography>
                                    </>
                                )}
                            </Paper>
                        ))}
                    </Stack>
                </Box>
            )}
        </Box>
    );
};

export default AIContentGenerator;
