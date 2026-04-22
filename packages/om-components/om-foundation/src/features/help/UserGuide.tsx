import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Grid,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Dashboard as DashboardIcon,
  Description as RecordsIcon,
  CardMembership as CertificateIcon,
  DocumentScanner as OcrIcon,
  CalendarMonth as CalendarIcon,
  Receipt as InvoiceIcon,
  Chat as ChatIcon,
  Person as ProfileIcon,
  AdminPanelSettings as AdminIcon,
  Settings as SettingsIcon,
  Church as ChurchIcon,
  MenuBook as MenuBookIcon,
  Groups as GroupsIcon,
  Notifications as NotificationsIcon,
  Email as EmailIcon,
  HelpOutline as HelpIcon,
  CheckCircleOutline as CheckIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { useAuth } from '@/context/AuthContext';
import PageContainer from '@/shared/ui/PageContainer';

// ── Types ───────────────────────────────────────────────────

interface GuideSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  roles: string[]; // empty = all
  items: GuideItem[];
}

interface GuideItem {
  question: string;
  answer: string;
}

// ── Section Data ────────────────────────────────────────────

const SECTIONS: GuideSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: <DashboardIcon />,
    roles: [],
    items: [
      {
        question: 'How do I log in?',
        answer: 'Visit the login page and enter your email and password. If you\'ve forgotten your password, click "Forgot Password" to receive a reset link via email. Your account is created by your church administrator.',
      },
      {
        question: 'What is the Dashboard?',
        answer: 'The Dashboard is your home screen after logging in. It shows key metrics for your church including recent records, upcoming events, and quick-access links. The dashboard content adapts based on your role — administrators see management tools while clergy see sacramental summaries.',
      },
      {
        question: 'How do I navigate the platform?',
        answer: 'Use the sidebar on the left to access all features organized by category: Records, Administration, Social, and Tools. The top header provides Quick Links for common actions, a notification bell, and your profile menu. You can collapse the sidebar by clicking the menu icon for more screen space.',
      },
      {
        question: 'What are Quick Links?',
        answer: 'Quick Links in the top header give you fast access to frequently used features like Notes, Email, the User Guide (this page), and the Church Portal. They save you time by bypassing sidebar navigation.',
      },
    ],
  },
  {
    id: 'sacramental-records',
    title: 'Sacramental Records',
    icon: <RecordsIcon />,
    roles: [],
    items: [
      {
        question: 'How do I view existing records?',
        answer: 'Navigate to Records in the sidebar and select the record type (Baptism, Marriage, or Funeral). The records grid displays all entries for your church with sortable columns and search functionality. Click any row to see full record details.',
      },
      {
        question: 'How do I create a new record?',
        answer: 'From the records page, click the "Add Record" button. Fill in the required fields (name, date, officiating priest) and any optional fields. Click Save to store the record securely in your church database. All new records are timestamped and attributed to your user account.',
      },
      {
        question: 'Can I edit or delete records?',
        answer: 'Click any record to open its detail view, then use the Edit button to modify fields. All edits are tracked in the audit log with timestamps and the user who made changes. Record deletion may be restricted based on your role — contact your administrator if you need a record removed.',
      },
      {
        question: 'How do I search and filter records?',
        answer: 'Use the search bar at the top of the records grid to search by name, date, or other fields. You can also sort by clicking column headers and apply date range filters. Search supports partial matching so you can find records without typing the full name.',
      },
      {
        question: 'What record types are supported?',
        answer: 'Orthodox Metrics supports three sacramental record types: Baptism (including chrismation details and sponsors/godparents), Marriage (both spouses, witnesses/koumbaroi, license info), and Funeral (deceased information, burial location, memorial dates).',
      },
    ],
  },
  {
    id: 'certificates',
    title: 'Certificates',
    icon: <CertificateIcon />,
    roles: [],
    items: [
      {
        question: 'How do I generate a certificate?',
        answer: 'Navigate to Certificates in the sidebar. Select the certificate type (Baptism, Marriage, or Funeral), then search for and select the specific record. Click "Generate Certificate" to create a professionally formatted document with all record details filled in automatically.',
      },
      {
        question: 'What formats are available?',
        answer: 'Certificates are generated as PDF documents that you can preview on screen, download to your computer, or print directly. The layout includes your church\'s official name, address, and the complete sacramental details from the record.',
      },
      {
        question: 'Can I customize certificate templates?',
        answer: 'Certificate templates use your church\'s official information (name, address, diocese) which is pulled from your church profile. Contact your administrator to ensure church details are up to date, as this information appears on all generated certificates.',
      },
    ],
  },
  {
    id: 'ocr',
    title: 'OCR & Document Scanning',
    icon: <OcrIcon />,
    roles: [],
    items: [
      {
        question: 'What is OCR and how does it work?',
        answer: 'OCR (Optical Character Recognition) lets you digitize historical church ledgers by scanning paper documents. Upload an image of a ledger page, and our system extracts the text and table data automatically. You then review, correct, and import the data into your digital records.',
      },
      {
        question: 'What image formats and quality are needed?',
        answer: 'Supported formats include JPG, PNG, and PDF. For best results, use high-resolution scans (300+ DPI) with even lighting and minimal page skew. The system handles both typed and handwritten text in English and Greek, though handwritten entries may need manual correction.',
      },
      {
        question: 'How does column mapping work?',
        answer: 'After OCR processing, the Column Mapper lets you align detected table columns with database fields (e.g., "Name," "Date of Baptism," "Sponsor"). You can adjust column boundaries visually and save configurations as templates for future pages from the same ledger.',
      },
      {
        question: 'How do I approve and import OCR results?',
        answer: 'After reviewing extracted data and verifying column mappings, click "Approve" to import records into your church database. Imported records appear alongside manually entered ones and are fully editable. The original scan image is preserved for reference.',
      },
    ],
  },
  {
    id: 'calendar',
    title: 'Calendar & Events',
    icon: <CalendarIcon />,
    roles: [],
    items: [
      {
        question: 'How do I view the church calendar?',
        answer: 'Access the Calendar from the sidebar to see upcoming church events, feast days, and scheduled services. Switch between month, week, and day views using the controls at the top. Orthodox feast days and fasting periods are highlighted automatically.',
      },
      {
        question: 'How do I add an event?',
        answer: 'Click on any date in the calendar to create a new event. Enter the event title, time, description, and category (liturgy, meeting, community event, etc.). Events can be set as recurring for regular services like Sunday Liturgy.',
      },
    ],
  },
  {
    id: 'invoices',
    title: 'Invoices & Billing',
    icon: <InvoiceIcon />,
    roles: ['super_admin', 'admin', 'church_admin'],
    items: [
      {
        question: 'How do I view invoices?',
        answer: 'Navigate to Apps > Invoice to see all invoices. The list shows invoice number, date, amount, status (paid, pending, overdue), and client details. Use status filters to find specific invoices quickly.',
      },
      {
        question: 'How do I create an invoice?',
        answer: 'Click "Create Invoice" to generate a new invoice. Fill in client details, add line items with descriptions and amounts, set tax rates and payment terms. The system calculates totals automatically.',
      },
      {
        question: 'Can I download or print invoices?',
        answer: 'Yes — open any invoice detail view and use the download button to save as PDF. You can also duplicate invoices for recurring charges and track payment history in the invoice detail.',
      },
    ],
  },
  {
    id: 'social',
    title: 'Social & Communication',
    icon: <ChatIcon />,
    roles: [],
    items: [
      {
        question: 'How do I use Chat?',
        answer: 'Access Social Chat from the sidebar to send messages to other platform users. Start one-on-one conversations or participate in group chats. Messages are delivered in real-time with read receipts.',
      },
      {
        question: 'How do Friends work?',
        answer: 'Visit the Friends section to see other users on the platform. Send friend requests to connect with colleagues across parishes. Your friends list makes it easy to start chats and stay connected.',
      },
      {
        question: 'How do Notifications work?',
        answer: 'The bell icon in the header shows unread notification count. Click it to open the Notification Center with alerts for new messages, record updates, and system announcements. Mark notifications as read individually or clear them in bulk.',
      },
      {
        question: 'Is there an email feature?',
        answer: 'Yes — the Email app in the sidebar provides an integrated email interface. Access your inbox, compose messages, and manage your church communications without leaving the platform.',
      },
    ],
  },
  {
    id: 'profile',
    title: 'Your Profile',
    icon: <ProfileIcon />,
    roles: [],
    items: [
      {
        question: 'How do I update my profile?',
        answer: 'Click your avatar in the top-right corner and select "My Profile." You can update your display name, email, phone number, and bio. Your profile photo is automatically assigned based on your role in the system.',
      },
      {
        question: 'How do I change my password?',
        answer: 'Access your account settings through the profile menu. Password changes require your current password for security. If you\'ve forgotten your password, use the "Forgot Password" link on the login page to receive a reset email.',
      },
    ],
  },
  {
    id: 'church-admin',
    title: 'Church Administration',
    icon: <ChurchIcon />,
    roles: ['super_admin', 'admin', 'church_admin'],
    items: [
      {
        question: 'How do I set up my church profile?',
        answer: 'Navigate to Admin > Churches to update your church\'s name, address, diocese, and contact information. This data appears on certificates and official documents, so keeping it accurate is important.',
      },
      {
        question: 'How do I manage users?',
        answer: 'Go to Admin > Users to manage platform access. You can invite new users, assign roles (priest, deacon, editor), and deactivate accounts. Each role has specific permissions — editors can enter records while priests can also generate certificates.',
      },
      {
        question: 'What is Field Mapping?',
        answer: 'The Field Mapper (Admin > Field Mapping) lets you customize how record fields are labeled and displayed. Map database fields to your preferred labels, set required fields, and configure display order for data entry forms tailored to your church\'s needs.',
      },
      {
        question: 'How do I view activity logs?',
        answer: 'Admin > Logs shows a complete audit trail of all actions taken on the platform — record creation, edits, user logins, and system events. Use filters to narrow by user, action type, or date range for compliance and accountability.',
      },
    ],
  },
  {
    id: 'admin-tools',
    title: 'Admin Tools',
    icon: <SettingsIcon />,
    roles: ['super_admin'],
    items: [
      {
        question: 'What tools are available for super admins?',
        answer: 'Super administrators have access to the full Admin panel including: Church Management (all churches), User Management (all users across churches), System Settings, Activity Logs, Session Management, Tutorial Management, and Developer Tools.',
      },
      {
        question: 'How do I manage tutorials?',
        answer: 'Navigate to Admin > Tutorials to create, edit, and manage the tutorial system. You can create tutorials targeted at specific audiences (all users, administrators, priests, etc.), define multi-step walkthroughs, and set welcome tutorials that appear on first login.',
      },
      {
        question: 'How do I monitor active sessions?',
        answer: 'Admin > Sessions shows all currently active user sessions across the platform. You can view session details, identify unusual activity, and terminate sessions if needed for security purposes.',
      },
    ],
  },
];

const ROLE_CARDS = [
  {
    role: 'Church Admin',
    icon: <AdminIcon sx={{ fontSize: 40 }} />,
    description: 'Manage users, configure church settings, map fields, and oversee all records.',
    sections: ['getting-started', 'sacramental-records', 'certificates', 'church-admin', 'invoices'],
    color: '#1976d2',
  },
  {
    role: 'Priest / Deacon',
    icon: <MenuBookIcon sx={{ fontSize: 40 }} />,
    description: 'Create sacramental records, generate certificates, and manage parish activities.',
    sections: ['getting-started', 'sacramental-records', 'certificates', 'calendar'],
    color: '#7b1fa2',
  },
  {
    role: 'Editor',
    icon: <RecordsIcon sx={{ fontSize: 40 }} />,
    description: 'Enter and edit sacramental records, use OCR to digitize historical ledgers.',
    sections: ['getting-started', 'sacramental-records', 'ocr'],
    color: '#388e3c',
  },
  {
    role: 'New User',
    icon: <GroupsIcon sx={{ fontSize: 40 }} />,
    description: 'Get oriented with the dashboard, explore features, and connect with your parish.',
    sections: ['getting-started', 'social', 'profile'],
    color: '#f57c00',
  },
];

const FAQ_ITEMS = [
  {
    q: 'What browsers are supported?',
    a: 'Orthodox Metrics works best in modern browsers: Chrome, Firefox, Safari, and Edge. We recommend keeping your browser updated for the best experience.',
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. All data is transmitted over encrypted HTTPS connections, stored in secure databases with access controls, and backed up regularly. Each church\'s data is isolated in its own database for maximum privacy.',
  },
  {
    q: 'Can multiple people use the system at the same time?',
    a: 'Absolutely. Orthodox Metrics is a multi-user platform — multiple staff members can work simultaneously with their own accounts and permissions. Changes are reflected in real-time.',
  },
  {
    q: 'How do I get help if I\'m stuck?',
    a: 'Check this User Guide first for answers. You can also look for tutorial popups that appear for new features. For direct support, contact your church administrator or reach out to the Orthodox Metrics support team.',
  },
  {
    q: 'Can I access the platform on mobile?',
    a: 'The platform is responsive and works on tablets and mobile devices, though the full desktop experience is recommended for data entry and administrative tasks.',
  },
];

// ── Component ───────────────────────────────────────────────

const UserGuide: React.FC = () => {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | false>(false);

  // Get current user role for filtering
  const { user } = useAuth();
  const userRole = user?.role || '';

  const isRoleVisible = (roles: string[]) => {
    if (roles.length === 0) return true;
    if (userRole === 'super_admin') return true;
    return roles.includes(userRole);
  };

  // Filter sections based on search and role
  const filteredSections = useMemo(() => {
    const q = search.toLowerCase().trim();
    return SECTIONS.filter((section) => {
      if (!isRoleVisible(section.roles)) return false;
      if (!q) return true;
      // Match section title or any item question/answer
      if (section.title.toLowerCase().includes(q)) return true;
      return section.items.some(
        (item) =>
          item.question.toLowerCase().includes(q) ||
          item.answer.toLowerCase().includes(q)
      );
    }).map((section) => {
      if (!q) return section;
      // Filter items within section if searching
      const matchedItems = section.items.filter(
        (item) =>
          item.question.toLowerCase().includes(q) ||
          item.answer.toLowerCase().includes(q) ||
          section.title.toLowerCase().includes(q)
      );
      return { ...section, items: matchedItems.length > 0 ? matchedItems : section.items };
    });
  }, [search, userRole]);

  const filteredFaq = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return FAQ_ITEMS;
    return FAQ_ITEMS.filter(
      (f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
    );
  }, [search]);

  const handleAccordionChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <PageContainer title="User Guide" description="Orthodox Metrics documentation and help center">
      <Box sx={{ pb: 6 }}>
        {/* Hero Header */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 5 },
            mb: 4,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            color: 'white',
            textAlign: 'center',
          }}
        >
          <HelpIcon sx={{ fontSize: 48, mb: 1, opacity: 0.9 }} />
          <Typography variant="h3" fontWeight={700} gutterBottom>
            Orthodox Metrics User Guide
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, mb: 3, fontWeight: 400 }}>
            Everything you need to know about managing your church on the platform
          </Typography>
          <TextField
            placeholder="Search documentation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            variant="outlined"
            size="medium"
            sx={{
              maxWidth: 500,
              width: '100%',
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(255,255,255,0.95)',
                borderRadius: 2,
                '& fieldset': { border: 'none' },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
        </Paper>

        {/* Role Quick Start Cards */}
        {!search && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" fontWeight={600} gutterBottom sx={{ mb: 2 }}>
              Quick Start by Role
            </Typography>
            <Grid container spacing={2}>
              {ROLE_CARDS.map((card) => (
                <Grid item xs={12} sm={6} md={3} key={card.role}>
                  <Card
                    elevation={0}
                    sx={{
                      height: '100%',
                      border: `1px solid ${theme.palette.divider}`,
                      borderTop: `3px solid ${card.color}`,
                      transition: 'box-shadow 0.2s',
                      '&:hover': { boxShadow: theme.shadows[4] },
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center', p: 2.5 }}>
                      <Box sx={{ color: card.color, mb: 1 }}>{card.icon}</Box>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        {card.role}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, minHeight: 40 }}>
                        {card.description}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}>
                        {card.sections.map((sId) => {
                          const sec = SECTIONS.find((s) => s.id === sId);
                          return sec ? (
                            <Chip
                              key={sId}
                              label={sec.title}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: 22 }}
                              onClick={() => {
                                setExpanded(sId);
                                document.getElementById(`section-${sId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }}
                            />
                          ) : null;
                        })}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Documentation Sections */}
        <Typography variant="h5" fontWeight={600} gutterBottom sx={{ mb: 2 }}>
          {search ? `Search Results (${filteredSections.reduce((a, s) => a + s.items.length, 0)} matches)` : 'Documentation'}
        </Typography>

        {filteredSections.length === 0 ? (
          <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
            <Typography color="text.secondary">
              No results found for "{search}". Try different keywords.
            </Typography>
          </Paper>
        ) : (
          filteredSections.map((section) => (
            <Accordion
              key={section.id}
              id={`section-${section.id}`}
              expanded={expanded === section.id || !!search}
              onChange={handleAccordionChange(section.id)}
              elevation={0}
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: '8px !important',
                mb: 1.5,
                '&:before': { display: 'none' },
                overflow: 'hidden',
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  '& .MuiAccordionSummary-content': {
                    alignItems: 'center',
                    gap: 1.5,
                  },
                }}
              >
                <Box sx={{ color: theme.palette.primary.main, display: 'flex', alignItems: 'center' }}>
                  {section.icon}
                </Box>
                <Typography variant="h6" fontWeight={600} sx={{ flexGrow: 1 }}>
                  {section.title}
                </Typography>
                {section.roles.length > 0 && (
                  <Chip
                    label={section.roles.includes('super_admin') && section.roles.length === 1 ? 'Super Admin' : 'Admin+'}
                    size="small"
                    color="warning"
                    variant="outlined"
                    sx={{ mr: 1 }}
                  />
                )}
                <Chip label={`${section.items.length} topics`} size="small" variant="outlined" />
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <List disablePadding>
                  {section.items.map((item, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <Divider component="li" />}
                      <ListItem alignItems="flex-start" sx={{ px: 0, py: 1.5 }}>
                        <ListItemIcon sx={{ mt: 0.5, minWidth: 36 }}>
                          <CheckIcon color="success" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                              {item.question}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                              {item.answer}
                            </Typography>
                          }
                        />
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          ))
        )}

        {/* FAQ Section */}
        {filteredFaq.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h5" fontWeight={600} gutterBottom sx={{ mb: 2 }}>
              Frequently Asked Questions
            </Typography>
            {filteredFaq.map((faq, idx) => (
              <Accordion
                key={idx}
                elevation={0}
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: '8px !important',
                  mb: 1,
                  '&:before': { display: 'none' },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography fontWeight={600}>{faq.q}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {faq.a}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}

        {/* Footer Help */}
        <Paper
          elevation={0}
          sx={{
            mt: 4,
            p: 3,
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            textAlign: 'center',
            bgcolor: theme.palette.action.hover,
          }}
        >
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Need more help?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Contact your church administrator for account-related questions, or reach out to the Orthodox Metrics support team for technical assistance.
          </Typography>
        </Paper>

      </Box>
    </PageContainer>
  );
};

export default UserGuide;
