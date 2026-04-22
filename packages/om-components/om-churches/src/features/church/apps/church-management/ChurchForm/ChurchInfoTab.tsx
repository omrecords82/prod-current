/**
 * ChurchInfoTab — Church Identity & Configuration form tab.
 * Extracted from ChurchForm.tsx (Tab 0)
 */
import React from 'react';
import {
    Box,
    Button,
    CardContent,
    Chip,
    CircularProgress,
    FormControl,
    FormControlLabel,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon,
} from '@mui/icons-material';
import {
    IconBuilding,
    IconDatabase,
    IconSettings,
} from '@tabler/icons-react';
import BlankCard from '@/shared/ui/BlankCard';

interface ChurchInfoTabProps {
    formik: any;
    isEdit: boolean;
    loading: boolean;
    id: string | undefined;
    onNavigateBack: () => void;
    onOpenFieldMapper: () => void;
}

const ChurchInfoTab: React.FC<ChurchInfoTabProps> = ({
    formik,
    isEdit,
    loading,
    id,
    onNavigateBack,
    onOpenFieldMapper,
}) => (
    <form onSubmit={formik.handleSubmit}>
        <Grid container spacing={3}>
            {/* Church Identity */}
            <Grid item xs={12} lg={6}>
                <BlankCard sx={{ borderRadius: 3, boxShadow: 3 }}>
                    <CardContent sx={{ p: 3 }}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                mb: 3,
                                pb: 2,
                                borderBottom: '3px solid',
                                borderColor: 'primary.main',
                            }}
                        >
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 2,
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <IconBuilding size={24} />
                            </Box>
                            <Box>
                                <Typography variant="h5" fontWeight={600}>
                                    Church Identity & Contact
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Basic church information
                                </Typography>
                            </Box>
                        </Box>

                        <Stack spacing={3}>
                            <TextField
                                fullWidth label="Church Name" name="name" required
                                value={formik.values.name} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                error={formik.touched.name && Boolean(formik.errors.name)}
                                helperText={formik.touched.name && formik.errors.name}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                            <TextField
                                fullWidth label="Email Address" name="email" type="email" required
                                value={formik.values.email} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                error={formik.touched.email && Boolean(formik.errors.email)}
                                helperText={formik.touched.email && formik.errors.email}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                            <TextField
                                fullWidth label="Phone Number" name="phone"
                                value={formik.values.phone} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                error={formik.touched.phone && Boolean(formik.errors.phone)}
                                helperText={formik.touched.phone && formik.errors.phone}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                            <TextField
                                fullWidth label="Website" name="website" placeholder="https://example.com"
                                value={formik.values.website} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                error={formik.touched.website && Boolean(formik.errors.website)}
                                helperText={formik.touched.website && formik.errors.website}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                            <TextField
                                fullWidth label="Address" name="address" multiline rows={2}
                                value={formik.values.address} onChange={formik.handleChange}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                            {/* Location Row */}
                            <Grid container spacing={2}>
                                <Grid item xs={6} sm={3}>
                                    <TextField fullWidth label="City" name="city" size="small"
                                        value={formik.values.city} onChange={formik.handleChange}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <TextField fullWidth label="State/Province" name="state_province" size="small"
                                        value={formik.values.state_province} onChange={formik.handleChange}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <TextField fullWidth label="Postal Code" name="postal_code" size="small"
                                        value={formik.values.postal_code} onChange={formik.handleChange}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Country</InputLabel>
                                        <Select name="country" value={formik.values.country} onChange={formik.handleChange} label="Country"
                                            sx={{ borderRadius: 2 }}>
                                            <MenuItem value="United States">United States</MenuItem>
                                            <MenuItem value="Canada">Canada</MenuItem>
                                            <MenuItem value="Greece">Greece</MenuItem>
                                            <MenuItem value="Romania">Romania</MenuItem>
                                            <MenuItem value="Russia">Russia</MenuItem>
                                            <MenuItem value="Serbia">Serbia</MenuItem>
                                            <MenuItem value="Bulgaria">Bulgaria</MenuItem>
                                            <MenuItem value="Other">Other</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>
                            <TextField
                                fullWidth label="Description" name="description_multilang" multiline rows={3}
                                value={formik.values.description_multilang} onChange={formik.handleChange}
                                placeholder="Brief description of the church..."
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                        </Stack>
                    </CardContent>
                </BlankCard>
            </Grid>

            {/* Configuration */}
            <Grid item xs={12} lg={6}>
                <BlankCard sx={{ borderRadius: 3, boxShadow: 3 }}>
                    <CardContent sx={{ p: 3 }}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                mb: 3,
                                pb: 2,
                                borderBottom: '3px solid',
                                borderColor: 'success.main',
                            }}
                        >
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 2,
                                    bgcolor: 'success.main',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <IconSettings size={24} />
                            </Box>
                            <Box>
                                <Typography variant="h5" fontWeight={600}>
                                    Configuration
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Settings and preferences
                                </Typography>
                            </Box>
                        </Box>

                        <Stack spacing={3}>
                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    bgcolor: formik.values.is_active ? 'success.50' : 'grey.100',
                                    border: '1px solid',
                                    borderColor: formik.values.is_active ? 'success.main' : 'grey.300',
                                }}
                            >
                                <FormControlLabel
                                    control={<Switch checked={formik.values.is_active} onChange={(e) => formik.setFieldValue('is_active', e.target.checked)} />}
                                    label={<Stack direction="row" spacing={1} alignItems="center"><Typography fontWeight={500}>Church Active</Typography><Chip label={formik.values.is_active ? 'Active' : 'Inactive'} color={formik.values.is_active ? 'success' : 'default'} size="small" /></Stack>}
                                />
                            </Box>

                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Language</InputLabel>
                                        <Select name="preferred_language" value={formik.values.preferred_language} onChange={formik.handleChange} label="Language"
                                            sx={{ borderRadius: 2 }}>
                                            <MenuItem value="en">English</MenuItem>
                                            <MenuItem value="el">Greek</MenuItem>
                                            <MenuItem value="ru">Russian</MenuItem>
                                            <MenuItem value="ro">Romanian</MenuItem>
                                            <MenuItem value="serbian">Serbian</MenuItem>
                                            <MenuItem value="bulgarian">Bulgarian</MenuItem>
                                            <MenuItem value="arabic">Arabic</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={6}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Timezone</InputLabel>
                                        <Select name="timezone" value={formik.values.timezone} onChange={formik.handleChange} label="Timezone"
                                            sx={{ borderRadius: 2 }}>
                                            <MenuItem value="America/New_York">Eastern (ET)</MenuItem>
                                            <MenuItem value="America/Chicago">Central (CT)</MenuItem>
                                            <MenuItem value="America/Denver">Mountain (MT)</MenuItem>
                                            <MenuItem value="America/Los_Angeles">Pacific (PT)</MenuItem>
                                            <MenuItem value="Europe/London">GMT</MenuItem>
                                            <MenuItem value="Europe/Athens">Eastern European (EET)</MenuItem>
                                            <MenuItem value="Europe/Moscow">Moscow (MSK)</MenuItem>
                                            <MenuItem value="UTC">UTC</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={6}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Currency</InputLabel>
                                        <Select name="currency" value={formik.values.currency} onChange={formik.handleChange} label="Currency"
                                            sx={{ borderRadius: 2 }}>
                                            <MenuItem value="USD">USD ($)</MenuItem>
                                            <MenuItem value="EUR">EUR</MenuItem>
                                            <MenuItem value="GBP">GBP</MenuItem>
                                            <MenuItem value="CAD">CAD</MenuItem>
                                            <MenuItem value="RON">RON</MenuItem>
                                            <MenuItem value="RUB">RUB</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={6}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>Calendar Type</InputLabel>
                                        <Select name="calendar_type" value={formik.values.calendar_type} onChange={formik.handleChange} label="Calendar Type"
                                            sx={{ borderRadius: 2 }}>
                                            <MenuItem value="Revised Julian">New Calendar (Revised Julian)</MenuItem>
                                            <MenuItem value="Julian">Old Calendar (Julian)</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField fullWidth label="Tax ID" name="tax_id" size="small"
                                        value={formik.values.tax_id} onChange={formik.handleChange}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                                </Grid>
                            </Grid>

                            <TextField fullWidth label="Database Name" name="database_name" size="small"
                                value={formik.values.database_name} onChange={formik.handleChange}
                                helperText="Unique identifier for church database"
                                InputProps={{ startAdornment: <IconDatabase size={18} style={{ marginRight: 8, opacity: 0.5 }} /> }}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />

                            <FormControl fullWidth size="small">
                                <InputLabel>Default Landing Page</InputLabel>
                                <Select name="default_landing_page" value={formik.values.default_landing_page} onChange={formik.handleChange} label="Default Landing Page"
                                    sx={{ borderRadius: 2 }}>
                                    <MenuItem value="church_records">Church Records</MenuItem>
                                    <MenuItem value="liturgical_calendar">Liturgical Calendar</MenuItem>
                                    <MenuItem value="notes_app">Notes App</MenuItem>
                                    <MenuItem value="dashboard">Dashboard</MenuItem>
                                </Select>
                            </FormControl>

                            <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle1" fontWeight={600} color="info.main" mb={2}>
                                    Record Types
                                </Typography>
                                <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ p: 2, borderRadius: 2, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
                                <FormControlLabel control={<Switch checked={formik.values.has_baptism_records} onChange={(e) => formik.setFieldValue('has_baptism_records', e.target.checked)} size="small" />} label="Baptism" />
                                <FormControlLabel control={<Switch checked={formik.values.has_marriage_records} onChange={(e) => formik.setFieldValue('has_marriage_records', e.target.checked)} size="small" />} label="Marriage" />
                                <FormControlLabel control={<Switch checked={formik.values.has_funeral_records} onChange={(e) => formik.setFieldValue('has_funeral_records', e.target.checked)} size="small" />} label="Funeral" />
                                </Stack>
                            </Box>

                            <Box>
                                <Typography variant="subtitle1" fontWeight={600} color="secondary.main" mb={2}>
                                    Setup Status
                                </Typography>
                                <Stack spacing={1.5} sx={{ p: 2, borderRadius: 2, bgcolor: 'secondary.50', border: '1px solid', borderColor: 'secondary.200' }}>
                                    <FormControlLabel control={<Switch checked={formik.values.setup_complete} onChange={(e) => formik.setFieldValue('setup_complete', e.target.checked)} size="small" />} label="Setup Complete" />
                                </Stack>
                            </Box>

                        </Stack>
                    </CardContent>
                </BlankCard>
            </Grid>

            {/* Action Buttons */}
            <Grid item xs={12}>
                <BlankCard sx={{ borderRadius: 3, boxShadow: 3 }}>
                    <CardContent sx={{ p: 3, bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50' }}>
                        <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
                            <Button 
                                variant="outlined" 
                                startIcon={<ArrowBackIcon />} 
                                onClick={onNavigateBack}
                                sx={{ borderRadius: 2, px: 3, textTransform: 'none', fontWeight: 500 }}
                            >
                                Back to Churches
                            </Button>
                            <Stack direction="row" spacing={2}>
                                {isEdit && (
                                    <Button 
                                        variant="outlined" 
                                        onClick={onOpenFieldMapper}
                                        sx={{ borderRadius: 2, textTransform: 'none' }}
                                    >
                                        DB Table Mapping
                                    </Button>
                                )}
                                <Button 
                                    variant="outlined" 
                                    onClick={() => formik.resetForm()}
                                    sx={{ borderRadius: 2, textTransform: 'none' }}
                                >
                                    Reset
                                </Button>
                                <Button
                                    type="submit" 
                                    variant="contained"
                                    startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                                    disabled={loading}
                                    onClick={() => {
                                        console.log('Update Church button clicked');
                                        console.log('Form valid:', formik.isValid);
                                        console.log('Form errors:', formik.errors);
                                        console.log('Form values:', formik.values);
                                        formik.handleSubmit();
                                    }}
                                    sx={{
                                        borderRadius: 2,
                                        px: 4,
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                                        boxShadow: 4,
                                        '&:hover': {
                                            boxShadow: 8,
                                        },
                                    }}
                                >
                                    {loading ? 'Saving...' : isEdit ? 'Update Church' : 'Create Church'}
                                </Button>
                            </Stack>
                        </Stack>
                    </CardContent>
                </BlankCard>
            </Grid>
        </Grid>
    </form>
);

export default ChurchInfoTab;
