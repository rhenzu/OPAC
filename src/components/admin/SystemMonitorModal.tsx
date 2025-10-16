import React, { useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  useMediaQuery,
  useTheme,
  Typography,
  Divider,
  alpha,
  Fade,
  Backdrop
} from '@mui/material';
import { Close as CloseIcon, MonitorHeart } from '@mui/icons-material';
import SystemMonitor from './SystemMonitor';
import { useThemeContext } from '../../contexts/ThemeContext';

interface SystemMonitorModalProps {
  open: boolean;
  onClose: () => void;
}

const SystemMonitorModal: React.FC<SystemMonitorModalProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const { darkMode } = useThemeContext();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  
  // This effect is to handle performance optimization
  // In a real application, you might want to disconnect WebSocket when modal is closed
  // and reconnect when it's opened to save resources
  useEffect(() => {
    // In a production app with real WebSocket, you would:
    // - Start WebSocket connection when modal opens
    // - Pause or close WebSocket connection when modal closes
    
    // For example:
    // if (open) {
    //   startWebSocketConnection();
    // } else {
    //   pauseWebSocketConnection();
    // }
    
    return () => {
      // Cleanup WebSocket on component unmount if needed
    };
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={fullScreen}
      aria-labelledby="system-monitor-dialog-title"
      TransitionComponent={Fade}
      TransitionProps={{
        timeout: 400
      }}
      BackdropComponent={Backdrop}
      BackdropProps={{
        timeout: 500,
        sx: {
          backdropFilter: 'blur(3px)',
          backgroundColor: alpha(theme.palette.background.paper, 0.8)
        }
      }}
      PaperProps={{
        elevation: 24,
        sx: {
          borderRadius: { xs: 0, sm: 3 },
          bgcolor: darkMode ? alpha('#121212', 0.95) : theme.palette.background.paper,
          backgroundImage: darkMode 
            ? `linear-gradient(to bottom right, ${alpha(theme.palette.primary.dark, 0.05)}, ${alpha(theme.palette.background.paper, 0.95)})`
            : `linear-gradient(to bottom right, ${alpha(theme.palette.primary.light, 0.02)}, ${alpha(theme.palette.background.paper, 0.98)})`,
          border: darkMode ? `1px solid ${alpha(theme.palette.primary.dark, 0.2)}` : 'none',
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle id="system-monitor-dialog-title" sx={{ p: 0 }}>
        <Box 
          display="flex" 
          justifyContent="space-between"
          alignItems="center"
          sx={{ 
            px: 3, 
            py: 2,
            borderBottom: `1px solid ${darkMode ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.divider, 0.8)}`,
            bgcolor: darkMode ? alpha(theme.palette.primary.dark, 0.1) : alpha(theme.palette.primary.light, 0.05)
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <MonitorHeart sx={{ 
              color: theme.palette.primary.main, 
              fontSize: 30 
            }} />
            <Typography 
              variant="h5" 
              component="div" 
              sx={{ 
                fontWeight: 'bold', 
                color: darkMode ? theme.palette.primary.light : theme.palette.primary.main 
              }}
            >
              System Monitor
            </Typography>
          </Box>
          <IconButton
            edge="end"
            onClick={onClose}
            aria-label="close"
            sx={{
              bgcolor: darkMode ? alpha(theme.palette.background.paper, 0.2) : alpha(theme.palette.background.paper, 0.6),
              '&:hover': {
                bgcolor: darkMode ? alpha(theme.palette.background.paper, 0.3) : alpha(theme.palette.background.paper, 0.8),
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
          {/* Only render SystemMonitor when modal is open to save resources */}
          {open && <SystemMonitor />}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default SystemMonitorModal; 