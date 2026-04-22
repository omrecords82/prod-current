/**
 * useChurchLifecycleData — owns the data state for ChurchLifecycleDetailPage.
 *
 * Drains 19 useStates from the parent component (STATE_EXPLOSION refactor —
 * OMD-842). Includes core church data, pipeline data, and template lookups.
 */
import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/api/utils/axiosInstance';
import type {
  CRMChurch,
  CRMContact,
  CRMActivity,
  CRMFollowUp,
  ChurchMember,
  ChurchToken,
  OnboardedChurch,
  OnboardingChecklist,
  OnboardingEmail,
  PipelineActivity,
  PipelineStage,
  ProvisioningChecklist,
  RecordRequirement,
  SampleTemplate,
} from './types';

export interface UseChurchLifecycleDataResult {
  // core
  source: 'crm' | 'onboarded' | 'both';
  unifiedStage: string;
  crm: CRMChurch | null;
  onboarded: OnboardedChurch | null;
  contacts: CRMContact[];
  activities: CRMActivity[];
  followUps: CRMFollowUp[];
  members: ChurchMember[];
  tokens: ChurchToken[];
  checklist: OnboardingChecklist | null;
  stages: PipelineStage[];
  loading: boolean;
  error: string;
  // pipeline extended
  pipelineRequirements: RecordRequirement[];
  pipelineEmails: OnboardingEmail[];
  pipelineActivities: PipelineActivity[];
  provisionChecklist: ProvisioningChecklist | null;
  // templates
  sampleTemplates: SampleTemplate[];
  emailTemplates: { type: string; subject: string; body: string }[];
  // initial notes pulled from data
  initialNotes: string;
  // actions
  fetchDetail: () => Promise<void>;
  fetchStages: () => Promise<void>;
}

export function useChurchLifecycleData(churchId: string | undefined): UseChurchLifecycleDataResult {
  const [source, setSource] = useState<'crm' | 'onboarded' | 'both'>('crm');
  const [unifiedStage, setUnifiedStage] = useState('');
  const [crm, setCrm] = useState<CRMChurch | null>(null);
  const [onboarded, setOnboarded] = useState<OnboardedChurch | null>(null);
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [activities, setActivities] = useState<CRMActivity[]>([]);
  const [followUps, setFollowUps] = useState<CRMFollowUp[]>([]);
  const [members, setMembers] = useState<ChurchMember[]>([]);
  const [tokens, setTokens] = useState<ChurchToken[]>([]);
  const [checklist, setChecklist] = useState<OnboardingChecklist | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pipelineRequirements, setPipelineRequirements] = useState<RecordRequirement[]>([]);
  const [pipelineEmails, setPipelineEmails] = useState<OnboardingEmail[]>([]);
  const [pipelineActivities, setPipelineActivities] = useState<PipelineActivity[]>([]);
  const [provisionChecklist, setProvisionChecklist] = useState<ProvisioningChecklist | null>(null);
  const [sampleTemplates, setSampleTemplates] = useState<SampleTemplate[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<{ type: string; subject: string; body: string }[]>([]);
  const [initialNotes, setInitialNotes] = useState('');

  const fetchDetail = useCallback(async () => {
    if (!churchId) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.get<any>(`/api/admin/church-lifecycle/${churchId}`);

      setSource(data.source || 'crm');
      setUnifiedStage(data.unified_stage || '');
      setCrm(data.crm || null);
      setOnboarded(data.onboarded || null);
      setContacts(data.contacts || []);
      setActivities(data.activities || []);
      setFollowUps(data.followUps || []);
      setMembers(data.members || []);
      setTokens(data.tokens || []);
      setChecklist(data.checklist || null);

      const n = data.crm?.crm_notes || data.onboarded?.notes || '';
      setInitialNotes(n);

      // Fetch extended pipeline data for CRM churches
      if (data.crm?.id) {
        try {
          const [pipeData, tmplData, eTmplData] = await Promise.all([
            apiClient.get<any>(`/api/admin/onboarding-pipeline/${data.crm.id}/detail`),
            apiClient.get<any>('/api/admin/onboarding-pipeline/templates'),
            apiClient.get<any>('/api/admin/onboarding-pipeline/email-templates'),
          ]);
          if (pipeData?.success) {
            setPipelineRequirements(pipeData.requirements || []);
            setPipelineEmails(pipeData.emails || []);
            setPipelineActivities(pipeData.activities || []);
            setProvisionChecklist(pipeData.checklist || null);
          }
          setSampleTemplates(tmplData?.templates || []);
          setEmailTemplates(eTmplData?.templates || []);
        } catch { /* non-critical — pipeline data is supplementary */ }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load church detail');
    } finally {
      setLoading(false);
    }
  }, [churchId]);

  const fetchStages = useCallback(async () => {
    try {
      const data = await apiClient.get<any>('/api/admin/church-lifecycle/stages');
      setStages(data.stages || []);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    fetchDetail();
    fetchStages();
  }, [fetchDetail, fetchStages]);

  return {
    source,
    unifiedStage,
    crm,
    onboarded,
    contacts,
    activities,
    followUps,
    members,
    tokens,
    checklist,
    stages,
    loading,
    error,
    pipelineRequirements,
    pipelineEmails,
    pipelineActivities,
    provisionChecklist,
    sampleTemplates,
    emailTemplates,
    initialNotes,
    fetchDetail,
    fetchStages,
  };
}
