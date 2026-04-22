import { Paper, Typography, List, ListItem, ListItemIcon, ListItemText, Box } from '@mui/material';
import { IconDroplet, IconHeart, IconCross } from '@tabler/icons-react';

interface ActivityItem {
  name: string;
  type: 'baptism' | 'marriage' | 'funeral';
  date: string;
}

interface Props {
  data: ActivityItem[];
}

const typeConfig = {
  baptism: { icon: IconDroplet, color: '#1e88e5', label: 'Baptism' },
  marriage: { icon: IconHeart, color: '#e91e63', label: 'Marriage' },
  funeral: { icon: IconCross, color: '#7b1fa2', label: 'Funeral' },
};

const RecentActivityList = ({ data }: Props) => {
  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <Typography variant="h6" fontWeight={600} mb={1}>Recent Records</Typography>
      {data.length > 0 ? (
        <List dense disablePadding>
          {data.map((item, i) => {
            const cfg = typeConfig[item.type] || typeConfig.baptism;
            const Icon = cfg.icon;
            const dateStr = item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
            return (
              <ListItem key={i} disablePadding sx={{ py: 0.75 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: `${cfg.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={16} color={cfg.color} />
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={item.name}
                  secondary={`${cfg.label} · ${dateStr}`}
                  primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItem>
            );
          })}
        </List>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'text.secondary' }}>
          <Typography variant="body2">No recent records</Typography>
        </Box>
      )}
    </Paper>
  );
};

export default RecentActivityList;
