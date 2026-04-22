import { useCallback, useState } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import type { OmAssistantContext, OmAssistantMessage } from './omAssistant.types';

export function useOmAssistant(context: OmAssistantContext) {
  const [messages, setMessages] = useState<OmAssistantMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    const userMsg: OmAssistantMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await apiClient.post<{
        success: boolean;
        response: string;
        error?: string;
        work_item_id?: number;
        work_item_title?: string;
      }>('/omai/ask', {
        prompt: content,
        context: {
          type: context.type,
          churchId: context.churchId,
          churchName: context.churchName,
          guideContent: context.guideContent,
        },
      });

      const assistantMsg: OmAssistantMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: res.success ? res.response : (res.error || 'Sorry, something went wrong.'),
        timestamp: new Date(),
        workItemId: res.work_item_id,
        workItemTitle: res.work_item_title,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const assistantMsg: OmAssistantMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I was unable to process your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [context]);

  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, isLoading, sendMessage, clearMessages };
}
