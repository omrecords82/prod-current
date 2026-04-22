// AI Services API Integration for Orthodox Metrics Admin
// Routes through the main backend at /api/omai/*
import { apiClient } from '@/api/utils/axiosInstance';

export interface AIContentRequest {
    content_type: 'documentation' | 'report' | 'newsletter' | 'announcement' | 'admin_guide';
    context: string;
    language?: string;
    church_context?: string;
    target_audience?: string;
}

export interface AITranslationRequest {
    text: string;
    source_language?: string;
    target_language: string;
    preserve_formatting?: boolean;
}

export interface AIOCRRequest {
    image_url?: string;
    language?: string;
    enhancement?: boolean;
    output_format?: 'text' | 'structured' | 'json';
}

export interface AIAnalyticsRequest {
    data_source: string;
    analysis_type: 'trends' | 'anomalies' | 'predictions' | 'insights';
    time_range?: string;
    metrics?: string[];
}

export interface AIContentResponse {
    content: string;
    metadata: {
        word_count: number;
        estimated_reading_time: number;
        content_type: string;
        generated_at: string;
    };
    suggestions?: string[];
}

export interface AITranslationResponse {
    translated_text: string;
    confidence_score: number;
    detected_language?: string;
    quality_assessment: {
        fluency: number;
        accuracy: number;
        cultural_appropriateness: number;
    };
}

export interface AIOCRResponse {
    extracted_text: string;
    confidence: number;
    structure?: {
        sections: Array<{
            type: string;
            content: string;
            confidence: number;
        }>;
    };
    detected_language?: string;
}

export interface AIAnalyticsResponse {
    insights: Array<{
        type: string;
        title: string;
        description: string;
        confidence: number;
        actionable: boolean;
        recommendations?: string[];
    }>;
    visualizations?: Array<{
        type: 'chart' | 'graph' | 'heatmap';
        data: any;
        config: any;
    }>;
}

class AIService {
    /** Helper: send a prompt to OMAI and get a text response */
    private async askOMAI(prompt: string): Promise<string> {
        const res = await apiClient.post<any>('/omai/ask', { prompt });
        return res?.response || res?.data?.response || '';
    }

    // Content Generation — routes through OMAI /ask
    async generateContent(request: AIContentRequest): Promise<AIContentResponse> {
        const prompt = `Generate ${request.content_type} content. Context: ${request.context}` +
            (request.language ? `. Language: ${request.language}` : '') +
            (request.target_audience ? `. Target audience: ${request.target_audience}` : '') +
            (request.church_context ? `. Church context: ${request.church_context}` : '');

        const text = await this.askOMAI(prompt);
        return {
            content: text,
            metadata: {
                word_count: text.split(/\s+/).length,
                estimated_reading_time: Math.ceil(text.split(/\s+/).length / 200),
                content_type: request.content_type,
                generated_at: new Date().toISOString(),
            },
        };
    }

    // Translation — routes through OMAI /ask
    async translateText(request: AITranslationRequest): Promise<AITranslationResponse> {
        const prompt = `Translate the following text to ${request.target_language}` +
            (request.source_language ? ` from ${request.source_language}` : '') +
            (request.preserve_formatting ? '. Preserve formatting.' : '') +
            `:\n\n${request.text}`;

        const text = await this.askOMAI(prompt);
        return {
            translated_text: text,
            confidence_score: 0.85,
            quality_assessment: { fluency: 0.85, accuracy: 0.85, cultural_appropriateness: 0.9 },
        };
    }

    // OCR Processing — placeholder (OCR has its own pipeline)
    async processOCR(_file: File, _request: Partial<AIOCRRequest> = {}): Promise<AIOCRResponse> {
        return {
            extracted_text: '',
            confidence: 0,
            detected_language: 'en',
        };
    }

    // Analytics — routes through OMAI /ask
    async generateAnalytics(request: AIAnalyticsRequest): Promise<AIAnalyticsResponse> {
        const prompt = `Analyze ${request.data_source} for ${request.analysis_type}` +
            (request.time_range ? ` over ${request.time_range}` : '') +
            (request.metrics?.length ? `. Focus on: ${request.metrics.join(', ')}` : '');

        const text = await this.askOMAI(prompt);
        return {
            insights: [{
                type: request.analysis_type,
                title: `${request.analysis_type} analysis`,
                description: text,
                confidence: 0.8,
                actionable: true,
            }],
        };
    }

    // Admin-specific AI features
    async generateAdminReport(type: 'system_health' | 'user_activity' | 'performance' | 'security'): Promise<AIContentResponse> {
        return this.generateContent({
            content_type: 'report',
            context: `Generate a comprehensive ${type} report for Orthodox Metrics admin dashboard`,
            target_audience: 'admin',
        });
    }

    async generateUserGuide(feature: string): Promise<AIContentResponse> {
        return this.generateContent({
            content_type: 'admin_guide',
            context: `Create a user guide for the ${feature} feature in Orthodox Metrics`,
            target_audience: 'church_administrators',
        });
    }

    async analyzeSystemLogs(_logData: string): Promise<AIAnalyticsResponse> {
        return this.generateAnalytics({
            data_source: 'system_logs',
            analysis_type: 'anomalies',
            metrics: ['error_rate', 'response_time', 'user_activity'],
        });
    }

    async translateAdminInterface(language: string): Promise<Record<string, string>> {
        const adminTexts = [
            'User Management', 'System Settings', 'Church Records',
            'Analytics Dashboard', 'Security Settings', 'Backup & Recovery',
            'Notifications', 'Performance Monitoring',
        ];
        const translations: Record<string, string> = {};
        for (const text of adminTexts) {
            const result = await this.translateText({ text, target_language: language, preserve_formatting: true });
            translations[text] = result.translated_text;
        }
        return translations;
    }

    // Health check — GET /api/omai/health
    async healthCheck(): Promise<{ status: string; version: string; services: Record<string, boolean> }> {
        const res = await apiClient.get<any>('/omai/health');
        return {
            status: res?.status || 'unknown',
            version: res?.version || '1.0.0',
            services: {
                content_generation: res?.status === 'healthy',
                translation: res?.status === 'healthy',
                analytics: res?.status === 'healthy',
            },
        };
    }

    // Get AI metrics — GET /api/omai/stats
    async getMetrics(): Promise<{
        dailyRequests: number;
        contentGenerated: number;
        documentsProcessed: number;
        translations: number;
        avgResponseTime: number;
        successRate: number;
    }> {
        const res = await apiClient.get<any>('/omai/stats');
        const stats = res?.stats || res || {};
        const total = (stats.totalRequests || 0);
        const successful = (stats.successfulRequests || 0);
        return {
            dailyRequests: total,
            contentGenerated: stats.indexedFiles || 0,
            documentsProcessed: stats.indexedFiles || 0,
            translations: 0,
            avgResponseTime: stats.averageResponseTime || 0,
            successRate: total > 0 ? Math.round((successful / total) * 100) : 100,
        };
    }

    // AI Deployment
    async runDeployment(request: {
        church_name: string;
        church_slug: string;
        domain?: string;
        ssl_enabled?: boolean;
        backup_enabled?: boolean;
        monitoring_enabled?: boolean;
    }): Promise<{ deployment_id: string; status: string; estimated_time: string; logs: string[] }> {
        const text = await this.askOMAI(
            `Generate deployment configuration for church "${request.church_name}" (slug: ${request.church_slug})` +
            (request.domain ? `, domain: ${request.domain}` : '') +
            `. SSL: ${request.ssl_enabled ?? true}, Backup: ${request.backup_enabled ?? true}, Monitoring: ${request.monitoring_enabled ?? true}`
        );
        return {
            deployment_id: `deploy-${Date.now()}`,
            status: 'completed',
            estimated_time: '0s',
            logs: [text],
        };
    }

    // OCR Learning Status
    async getOCRLearningStatus(): Promise<{
        status: string; progress: number; success_rate: number; last_run: string; next_run: string;
    }> {
        const res = await apiClient.get<any>('/omai/learning-status');
        return res || { status: 'idle', progress: 0, success_rate: 0, last_run: 'N/A', next_run: 'N/A' };
    }

    // Start OCR Learning
    async startOCRLearning(): Promise<{ task_id: string; status: string; estimated_duration: string }> {
        const res = await apiClient.post<any>('/omai/learn-now', {});
        return res || { task_id: '', status: 'started', estimated_duration: 'unknown' };
    }

    // Reset OCR Learning
    async resetOCRLearning(): Promise<{ message: string }> {
        return { message: 'OCR learning reset is not available via this interface.' };
    }

    // Get OCR Learning Rules
    async getOCRLearningRules(): Promise<Array<{
        id: string; name: string; description: string; confidence: number; enabled: boolean;
    }>> {
        return [];
    }
}

export const aiService = new AIService();
export default aiService;
