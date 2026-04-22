/**
 * Church Publishing Guide Page
 * Instructions for churches on how to publish announcements for Orthodox Metrics import
 */

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Button,
  Stack,
  Alert,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { Download as DownloadIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

const ChurchPublishingGuide: React.FC = () => {
  const theme = useTheme();

  const handleDownloadMarkdown = () => {
    const markdownContent = generateMarkdownGuide();
    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'orthodoxmetrics-publishing-guide.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            Publishing Announcements for Orthodox Metrics Import
          </Typography>
          <Typography variant="body1" color="text.secondary">
            This guide explains how to format your church announcements so they can be automatically imported into Orthodox Metrics.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadMarkdown}
            sx={{ mt: 2 }}
          >
            Download Guide (Markdown)
          </Button>
        </Box>

        <Divider />

        {/* Supported Formats */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
            Supported Formats
          </Typography>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'success.main' }}>
                  <CheckCircleIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Preferred: RSS/JSON Feed
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Structured data feeds with stable fields. Best for automated parsing and updates.
                </Typography>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'info.main' }}>
                  <CheckCircleIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Acceptable: Standardized HTML Blocks
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  HTML elements with required selectors and data attributes. Good for existing websites.
                </Typography>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'warning.main' }}>
                  <CheckCircleIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Minimum: Plain Text Template
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Strict plain-text format. Requires exact formatting but works with any system.
                </Typography>
              </CardContent>
            </Card>
          </Stack>
        </Paper>

        {/* Required Fields */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
            Required Fields by Record Type
          </Typography>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Baptism Records
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="type" secondary="Must be 'baptism' or 'Baptism'" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="date" secondary="Date of baptism/reception (YYYY-MM-DD or MM/DD/YYYY)" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="person name" secondary="First name and last name (or full name)" />
                </ListItem>
              </List>
            </Box>

            <Divider />

            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Marriage Records
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="type" secondary="Must be 'marriage' or 'Marriage'" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="date" secondary="Date of marriage (YYYY-MM-DD or MM/DD/YYYY)" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="groom name" secondary="Groom's first and last name" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="bride name" secondary="Bride's first and last name" />
                </ListItem>
              </List>
            </Box>

            <Divider />

            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Funeral Records
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="type" secondary="Must be 'funeral' or 'Funeral'" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="death/burial date" secondary="At least one date required (death date OR burial date)" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="deceased name" secondary="First and last name of the deceased" />
                </ListItem>
              </List>
            </Box>
          </Stack>
        </Paper>

        {/* Format Examples */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
            Format Examples
          </Typography>
          <Stack spacing={3} sx={{ mt: 2 }}>
            {/* JSON Example */}
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                JSON Feed Format
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  overflow: 'auto',
                }}
              >
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`{
  "items": [
    {
      "event_id": "baptism-2025-001",
      "type": "baptism",
      "date": "2025-01-15",
      "first_name": "John",
      "last_name": "Doe",
      "birth_date": "2024-12-01",
      "sponsors": "Jane Smith, Bob Johnson",
      "parents": "John Doe Sr., Mary Doe"
    },
    {
      "event_id": "marriage-2025-002",
      "type": "marriage",
      "date": "2025-02-20",
      "groom_first_name": "Michael",
      "groom_last_name": "Brown",
      "bride_first_name": "Sarah",
      "bride_last_name": "Williams"
    }
  ]
}`}
                </pre>
              </Paper>
            </Box>

            {/* HTML Example */}
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                HTML Format with Data Attributes
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  overflow: 'auto',
                }}
              >
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`<article class="om-announcement" 
         data-type="baptism" 
         data-date="2025-01-15"
         data-event-id="baptism-2025-001">
  <h3>Baptism</h3>
  <p><strong>Date:</strong> January 15, 2025</p>
  <p><strong>Name:</strong> John Doe</p>
  <p><strong>Birth Date:</strong> December 1, 2024</p>
  <p><strong>Sponsors:</strong> Jane Smith, Bob Johnson</p>
  <p><strong>Parents:</strong> John Doe Sr., Mary Doe</p>
</article>`}
                </pre>
              </Paper>
            </Box>

            {/* Plain Text Example */}
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Plain Text Template Format
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  overflow: 'auto',
                }}
              >
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{`TYPE: baptism
DATE: 2025-01-15
FIRST_NAME: John
LAST_NAME: Doe
BIRTH_DATE: 2024-12-01
SPONSORS: Jane Smith, Bob Johnson
PARENTS: John Doe Sr., Mary Doe

---`}
                </pre>
              </Paper>
            </Box>
          </Stack>
        </Paper>

        {/* Corrections and Updates */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
            Corrections and Updates
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2" component="div">
              <strong>Recommended:</strong> Include a stable <code>event_id</code> field in your announcements.
              This allows Orthodox Metrics to:
              <ul style={{ marginTop: 8, marginBottom: 0 }}>
                <li>Detect and update existing records when corrections are made</li>
                <li>Prevent duplicate imports of the same event</li>
                <li>Track changes over time</li>
              </ul>
            </Typography>
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            When you need to correct an announcement, republish it with the same <code>event_id</code> but updated information.
            Orthodox Metrics will automatically update the existing record instead of creating a duplicate.
          </Typography>
        </Paper>

        {/* Best Practices */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
            Best Practices
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="Use consistent date formats"
                secondary="YYYY-MM-DD is preferred, but MM/DD/YYYY is also accepted"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Include full names"
                secondary="First and last names should be clearly separated"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Publish announcements promptly"
                secondary="Import runs on a schedule; publish within 24 hours of the event for best results"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Test your format"
                secondary="Use the validation feature in the admin panel to verify your format works correctly"
              />
            </ListItem>
          </List>
        </Paper>
      </Stack>
    </Box>
  );
};

/**
 * Generate markdown content for download
 */
function generateMarkdownGuide(): string {
  return `# Publishing Announcements for Orthodox Metrics Import

This guide explains how to format your church announcements so they can be automatically imported into Orthodox Metrics.

## Supported Formats

### Preferred: RSS/JSON Feed
Structured data feeds with stable fields. Best for automated parsing and updates.

### Acceptable: Standardized HTML Blocks
HTML elements with required selectors and data attributes. Good for existing websites.

### Minimum: Plain Text Template
Strict plain-text format. Requires exact formatting but works with any system.

## Required Fields by Record Type

### Baptism Records
- **type**: Must be 'baptism' or 'Baptism'
- **date**: Date of baptism/reception (YYYY-MM-DD or MM/DD/YYYY)
- **person name**: First name and last name (or full name)

### Marriage Records
- **type**: Must be 'marriage' or 'Marriage'
- **date**: Date of marriage (YYYY-MM-DD or MM/DD/YYYY)
- **groom name**: Groom's first and last name
- **bride name**: Bride's first and last name

### Funeral Records
- **type**: Must be 'funeral' or 'Funeral'
- **death/burial date**: At least one date required (death date OR burial date)
- **deceased name**: First and last name of the deceased

## Format Examples

### JSON Feed Format

\`\`\`json
{
  "items": [
    {
      "event_id": "baptism-2025-001",
      "type": "baptism",
      "date": "2025-01-15",
      "first_name": "John",
      "last_name": "Doe",
      "birth_date": "2024-12-01",
      "sponsors": "Jane Smith, Bob Johnson",
      "parents": "John Doe Sr., Mary Doe"
    },
    {
      "event_id": "marriage-2025-002",
      "type": "marriage",
      "date": "2025-02-20",
      "groom_first_name": "Michael",
      "groom_last_name": "Brown",
      "bride_first_name": "Sarah",
      "bride_last_name": "Williams"
    }
  ]
}
\`\`\`

### HTML Format with Data Attributes

\`\`\`html
<article class="om-announcement" 
         data-type="baptism" 
         data-date="2025-01-15"
         data-event-id="baptism-2025-001">
  <h3>Baptism</h3>
  <p><strong>Date:</strong> January 15, 2025</p>
  <p><strong>Name:</strong> John Doe</p>
  <p><strong>Birth Date:</strong> December 1, 2024</p>
  <p><strong>Sponsors:</strong> Jane Smith, Bob Johnson</p>
  <p><strong>Parents:</strong> John Doe Sr., Mary Doe</p>
</article>
\`\`\`

### Plain Text Template Format

\`\`\`
TYPE: baptism
DATE: 2025-01-15
FIRST_NAME: John
LAST_NAME: Doe
BIRTH_DATE: 2024-12-01
SPONSORS: Jane Smith, Bob Johnson
PARENTS: John Doe Sr., Mary Doe

---
\`\`\`

## Corrections and Updates

**Recommended:** Include a stable \`event_id\` field in your announcements. This allows Orthodox Metrics to:
- Detect and update existing records when corrections are made
- Prevent duplicate imports of the same event
- Track changes over time

When you need to correct an announcement, republish it with the same \`event_id\` but updated information. Orthodox Metrics will automatically update the existing record instead of creating a duplicate.

## Best Practices

1. **Use consistent date formats**: YYYY-MM-DD is preferred, but MM/DD/YYYY is also accepted
2. **Include full names**: First and last names should be clearly separated
3. **Publish announcements promptly**: Import runs on a schedule; publish within 24 hours of the event for best results
4. **Test your format**: Use the validation feature in the admin panel to verify your format works correctly

## Support

For questions or assistance, contact your Orthodox Metrics administrator or refer to the admin documentation.
`;
}

export default ChurchPublishingGuide;
