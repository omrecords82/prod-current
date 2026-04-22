/**
 * SSLCertificatePage.tsx — SSL Certificate Management under Platform Configuration
 */

import apiClient from '@/api/utils/axiosInstance';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import {
    ArrowBack as BackIcon,
    CheckCircle as CheckIcon,
    Error as ErrorIcon,
    Refresh as RefreshIcon,
    Security as SecurityIcon,
    Upload as UploadIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';
import {
    Alert,
    alpha,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    Paper,
    Step,
    StepLabel,
    Stepper,
    TextField,
    Typography,
    useTheme,
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface CertInfo {
    validFrom?: string;
    validTo?: string;
    subject?: string;
    issuer?: string;
    serial?: string;
    fingerprint?: string;
    daysUntilExpiry?: number;
    isExpired?: boolean;
    isExpiringSoon?: boolean;
    lastModified?: string;
    fileSize?: number;
    filePath?: string;
    label?: string;
    error?: string;
}

interface CertData {
    local: CertInfo;
    remote: CertInfo;
    stagedFiles: string[];
}

interface StepResult {
    success: boolean;
    message: string;
    data?: { steps?: string[]; files?: Array<{ name: string; type: string; info?: string }> };
}

const SSLCertificatePage: React.FC = () => {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const navigate = useNavigate();
    const color = '#e65100';

    const [certData, setCertData] = useState<CertData | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [actionResult, setActionResult] = useState<StepResult | null>(null);
    const [privateKey, setPrivateKey] = useState('');
    const [activeStep, setActiveStep] = useState(0);

    const BCrumb = [
        { to: '/', title: 'Home' },
        { to: '/admin/control-panel', title: 'Control Panel' },
        { to: '/admin/control-panel/system-server', title: 'System & Server' },
        { to: '/admin/control-panel/system-server/platform-config', title: 'Platform Configuration' },
        { title: 'SSL Certificates' },
    ];

    const fetchCertStatus = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await apiClient.get('/admin/ssl-certificates');
            if (data.success) setCertData(data.data);
        } catch (err) {
            console.error('Failed to fetch cert status:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCertStatus(); }, [fetchCertStatus]);

    const runAction = async (endpoint: string, body?: object) => {
        const actionName = endpoint.split('/').pop() || endpoint;
        setActionLoading(actionName);
        setActionResult(null);
        try {
            const { data } = await apiClient.post(`/admin/ssl-certificates/${endpoint}`, body);
            setActionResult(data);
            if (data.success) fetchCertStatus();
        } catch (err: any) {
            setActionResult({
                success: false,
                message: err.response?.data?.message || err.message,
            });
        } finally {
            setActionLoading(null);
        }
    };

    const renderCertCard = (cert: CertInfo) => {
        if (cert.error) {
            return (
                <Alert severity="error" sx={{ mb: 1 }}>
                    Unable to read certificate: {cert.error}
                </Alert>
            );
        }

        const statusColor = cert.isExpired ? 'error' : cert.isExpiringSoon ? 'warning' : 'success';
        const statusLabel = cert.isExpired ? 'EXPIRED' : cert.isExpiringSoon ? 'Expiring Soon' : 'Valid';
        const StatusIcon = cert.isExpired ? ErrorIcon : cert.isExpiringSoon ? WarningIcon : CheckIcon;

        return (
            <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <StatusIcon color={statusColor} />
                    <Chip label={statusLabel} color={statusColor} size="small" variant="outlined" />
                    {cert.daysUntilExpiry !== undefined && (
                        <Typography variant="body2" color="text.secondary">
                            {cert.isExpired
                                ? `Expired ${Math.abs(cert.daysUntilExpiry)} days ago`
                                : `${cert.daysUntilExpiry} days remaining`}
                        </Typography>
                    )}
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 0.5, fontSize: '0.85rem' }}>
                    {[
                        ['Subject', cert.subject],
                        ['Issuer', cert.issuer],
                        ['Valid From', cert.validFrom],
                        ['Valid To', cert.validTo],
                        ['Serial', cert.serial],
                        ['SHA-256', cert.fingerprint],
                        ['File', cert.filePath],
                        ['Last Modified', cert.lastModified ? new Date(cert.lastModified).toLocaleString() : undefined],
                    ]
                        .filter(([, v]) => v)
                        .map(([label, value]) => (
                            <React.Fragment key={label as string}>
                                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                    {label}
                                </Typography>
                                <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: label === 'SHA-256' ? 'monospace' : undefined, fontSize: label === 'SHA-256' ? '0.75rem' : undefined }}>
                                    {value}
                                </Typography>
                            </React.Fragment>
                        ))}
                </Box>
            </Box>
        );
    };

    const installSteps = [
        'Extract certificates from zip',
        'Upload private key (if needed)',
        'Install to servers',
        'Reload Nginx',
    ];

    return (
        <PageContainer title="SSL Certificates" description="Manage SSL/TLS certificates for orthodoxmetrics.com">
            <Breadcrumb title="SSL Certificates" items={BCrumb} />
            <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1000 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                    <IconButton onClick={() => navigate('/admin/control-panel/system-server/platform-config')} sx={{ bgcolor: alpha(color, 0.08), color }}>
                        <BackIcon />
                    </IconButton>
                    <Box sx={{ width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2, bgcolor: alpha(color, isDark ? 0.15 : 0.08), color, flexShrink: 0 }}>
                        <SecurityIcon sx={{ fontSize: 40 }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h5" fontWeight={700}>SSL Certificate Management</Typography>
                        <Typography variant="body2" color="text.secondary">View, update, and install SSL/TLS certificates for orthodoxmetrics.com</Typography>
                    </Box>
                    <IconButton onClick={fetchCertStatus} disabled={loading}>
                        <RefreshIcon />
                    </IconButton>
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
                ) : (
                    <>
                        {/* Current Certificate Status */}
                        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Current Certificate Status</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 4 }}>
                            {certData && ['remote', 'local'].map((key) => {
                                const cert = certData[key as keyof CertData] as CertInfo;
                                return (
                                    <Paper key={key} elevation={0} sx={{ p: 2.5, border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`, borderRadius: 2 }}>
                                        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                                            {cert.label || key}
                                        </Typography>
                                        {renderCertCard(cert)}
                                    </Paper>
                                );
                            })}
                        </Box>

                        <Divider sx={{ my: 3 }} />

                        {/* Certificate Update Pipeline */}
                        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Update Certificate</Typography>
                        <Paper elevation={0} sx={{ p: 3, border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`, borderRadius: 2, mb: 3 }}>
                            <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
                                {installSteps.map((label) => (
                                    <Step key={label}><StepLabel>{label}</StepLabel></Step>
                                ))}
                            </Stepper>

                            {/* Step 1: Extract */}
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                                    Step 1: Extract Certificates from ZIP
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                    Extracts <code>docs/orthodoxmetrics.com-certificates.zip</code> to a staging area for review before installation.
                                </Typography>
                                <Button
                                    variant="outlined"
                                    startIcon={actionLoading === 'extract' ? <CircularProgress size={16} /> : <UploadIcon />}
                                    disabled={!!actionLoading}
                                    onClick={() => { setActiveStep(0); runAction('extract'); }}
                                >
                                    Extract Certificates
                                </Button>
                            </Box>

                            {/* Step 2: Private Key */}
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                                    Step 2: Upload Private Key (if changed)
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                    Only needed if the private key has changed. If renewing with the same CSR, skip this step.
                                </Typography>
                                <TextField
                                    multiline
                                    rows={4}
                                    fullWidth
                                    placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                                    value={privateKey}
                                    onChange={(e) => setPrivateKey(e.target.value)}
                                    sx={{ mb: 1.5, fontFamily: 'monospace', fontSize: '0.8rem' }}
                                    InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
                                />
                                <Button
                                    variant="outlined"
                                    startIcon={actionLoading === 'upload-key' ? <CircularProgress size={16} /> : <UploadIcon />}
                                    disabled={!!actionLoading || !privateKey.trim()}
                                    onClick={() => { setActiveStep(1); runAction('upload-key', { keyContent: privateKey }); }}
                                >
                                    Upload Private Key
                                </Button>
                            </Box>

                            {/* Step 3: Install */}
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                                    Step 3: Build Fullchain & Install
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                    Combines cert + intermediate + root into a fullchain, then copies to both the internal server (.239) and the SSL proxy (.221).
                                </Typography>
                                <Button
                                    variant="contained"
                                    color="warning"
                                    startIcon={actionLoading === 'install' ? <CircularProgress size={16} /> : <SecurityIcon />}
                                    disabled={!!actionLoading}
                                    onClick={() => { setActiveStep(2); runAction('install'); }}
                                >
                                    Install Certificates
                                </Button>
                            </Box>

                            {/* Step 4: Reload */}
                            <Box>
                                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                                    Step 4: Reload Nginx
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                    Reload the Nginx service on the SSL proxy to activate the new certificates. Verifies the live certificate afterward.
                                </Typography>
                                <Button
                                    variant="contained"
                                    color="success"
                                    startIcon={actionLoading === 'reload-nginx' ? <CircularProgress size={16} /> : <RefreshIcon />}
                                    disabled={!!actionLoading}
                                    onClick={() => { setActiveStep(3); runAction('reload-nginx'); }}
                                >
                                    Reload Nginx
                                </Button>
                            </Box>
                        </Paper>

                        {/* Action Result */}
                        {actionResult && (
                            <Alert severity={actionResult.success ? 'success' : 'error'} sx={{ mb: 2 }}>
                                <Typography variant="body2" fontWeight={600}>{actionResult.message}</Typography>
                                {actionResult.data?.steps && (
                                    <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                                        {actionResult.data.steps.map((step, i) => (
                                            <li key={i}><Typography variant="body2">{step}</Typography></li>
                                        ))}
                                    </Box>
                                )}
                                {actionResult.data?.files && (
                                    <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                                        {actionResult.data.files.map((f, i) => (
                                            <li key={i}>
                                                <Typography variant="body2">
                                                    <strong>{f.name}</strong> ({f.type}){f.info ? ` — ${f.info}` : ''}
                                                </Typography>
                                            </li>
                                        ))}
                                    </Box>
                                )}
                            </Alert>
                        )}

                        {/* Staged Files */}
                        {certData?.stagedFiles && certData.stagedFiles.length > 0 && (
                            <Paper elevation={0} sx={{ p: 2, border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`, borderRadius: 2 }}>
                                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Staged Files</Typography>
                                {certData.stagedFiles.map((f) => (
                                    <Chip key={f} label={f} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                                ))}
                            </Paper>
                        )}
                    </>
                )}
            </Box>
        </PageContainer>
    );
};

export default SSLCertificatePage;
