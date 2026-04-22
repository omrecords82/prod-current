/**
 * useOMAIData.ts — Custom hook for OMAI learning/training/ethics data.
 */

import { useState, useEffect } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import type {
  LearningProgress,
  TrainingSession,
  KnowledgeMetrics,
  EthicsProgress,
  EthicalFoundation,
  OMLearnSurvey,
} from './types';

export function useOMAIData() {
  const [learningProgress, setLearningProgress] = useState<LearningProgress | null>(null);
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>([]);
  const [knowledgeMetrics, setKnowledgeMetrics] = useState<KnowledgeMetrics | null>(null);
  const [activeTrainingSession, setActiveTrainingSession] = useState<TrainingSession | null>(null);
  const [selectedTrainingPhase, setSelectedTrainingPhase] = useState<string>('foundation');
  const [learningLoading, setLearningLoading] = useState(false);
  const [ethicsProgress, setEthicsProgress] = useState<EthicsProgress | null>(null);
  const [ethicalFoundations, setEthicalFoundations] = useState<EthicalFoundation[]>([]);
  const [omlearnSurveys, setOmlearnSurveys] = useState<OMLearnSurvey[]>([]);
  const [ethicsLoading, setEthicsLoading] = useState(false);

  const loadLearningProgress = async () => {
    try {
      const data = await apiClient.get<any>('/omai/learning-progress');
      if (data.success) setLearningProgress(data.progress);
    } catch (error) {
      console.error('Failed to load learning progress:', error);
    }
  };

  const loadTrainingSessions = async () => {
    try {
      const data = await apiClient.get<any>('/omai/training-sessions');
      if (data.success) setTrainingSessions(data.sessions);
    } catch (error) {
      console.error('Failed to load training sessions:', error);
    }
  };

  const loadKnowledgeMetrics = async () => {
    try {
      const data = await apiClient.get<any>('/omai/knowledge-metrics');
      if (data.success) setKnowledgeMetrics(data.metrics);
    } catch (error) {
      console.error('Failed to load knowledge metrics:', error);
    }
  };

  const startTrainingSession = async (phase: string) => {
    setLearningLoading(true);
    try {
      const data = await apiClient.post<any>('/omai/start-training', { phase });
      if (data.success) {
        setActiveTrainingSession(data.session);
        const interval = setInterval(() => {
          loadTrainingSessions();
          loadLearningProgress();
        }, 5000);
        setTimeout(() => clearInterval(interval), 30 * 60 * 1000);
      }
    } catch (error) {
      console.error('Failed to start training session:', error);
    } finally {
      setLearningLoading(false);
    }
  };

  const stopTrainingSession = async () => {
    if (!activeTrainingSession) return;
    try {
      const data = await apiClient.post<any>(`/omai/stop-training/${activeTrainingSession.id}`);
      if (data.success) {
        setActiveTrainingSession(null);
        loadTrainingSessions();
      }
    } catch (error) {
      console.error('Failed to stop training session:', error);
    }
  };

  const loadEthicsProgress = async () => {
    try {
      const data = await apiClient.get<any>('/omai/ethics-progress');
      if (data.success) setEthicsProgress(data.progress);
    } catch (error) {
      console.error('Failed to load ethics progress:', error);
    }
  };

  const loadEthicalFoundations = async () => {
    try {
      const data = await apiClient.get<any>('/omai/ethical-foundations');
      if (data.success) setEthicalFoundations(data.foundations);
    } catch (error) {
      console.error('Failed to load ethical foundations:', error);
    }
  };

  const loadOMLearnSurveys = async () => {
    try {
      const data = await apiClient.get<any>('/omai/omlearn-surveys');
      if (data.success) setOmlearnSurveys(data.surveys);
    } catch (error) {
      console.error('Failed to load OMLearn surveys:', error);
    }
  };

  const importOMLearnResponses = async (responses: any) => {
    setEthicsLoading(true);
    try {
      const data = await apiClient.post<any>('/omai/import-omlearn', responses);
      if (data.success) {
        await loadEthicalFoundations();
        await loadEthicsProgress();
      }
    } catch (error) {
      console.error('Failed to import OMLearn responses:', error);
    } finally {
      setEthicsLoading(false);
    }
  };

  const refreshOMAIData = async () => {
    setLearningLoading(true);
    try {
      await Promise.all([
        loadLearningProgress(),
        loadTrainingSessions(),
        loadKnowledgeMetrics(),
        loadEthicsProgress(),
        loadEthicalFoundations(),
      ]);
    } finally {
      setLearningLoading(false);
    }
  };

  useEffect(() => {
    loadLearningProgress();
    loadTrainingSessions();
    loadKnowledgeMetrics();
    loadEthicsProgress();
    loadEthicalFoundations();
    loadOMLearnSurveys();
  }, []);

  return {
    learningProgress,
    trainingSessions,
    knowledgeMetrics,
    activeTrainingSession,
    selectedTrainingPhase,
    setSelectedTrainingPhase,
    learningLoading,
    ethicsProgress,
    ethicalFoundations,
    omlearnSurveys,
    ethicsLoading,
    startTrainingSession,
    stopTrainingSession,
    refreshOMAIData,
    importOMLearnResponses,
  };
}
