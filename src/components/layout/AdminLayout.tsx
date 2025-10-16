import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Toolbar,
  Typography,
  Divider,
  useTheme,
  Button,
  useMediaQuery,
  Collapse,
  Avatar,
  Tooltip,
  Badge,
  Paper,
  alpha,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Book as BookIcon,
  SwapHoriz as SwapIcon,
  ExitToApp as LogoutIcon,
  LibraryBooks,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Badge as BadgeIcon,
  QrCode as BarcodeIcon,
  Settings as SettingsIcon,
  AttachMoney as FinesIcon,
  HowToReg as AttendanceIcon,
  List as ListIcon,
  ExpandLess,
  ExpandMore,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  PersonAdd as PersonAddIcon,
  MonitorHeart as MonitorIcon,
  MenuBook as MenuBookIcon,
  BackupTable as BackupTableIcon,
  LocalPrintshop as PrintIcon,
  Assignment as AssignmentIcon,
  Notifications as NotificationsIcon,
  ChevronLeft as ChevronLeftIcon,
  History as HistoryIcon,
  Assessment as AssessmentIcon,
  MonetizationOn as MonetizationOnIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import ViewGeneratedIds from '../admin/ViewGeneratedIds';
import LibrarySettings from '../admin/LibrarySettings';
import SystemMonitorModal from '../admin/SystemMonitorModal';
import GlobalSearch from '../search/GlobalSearch';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

const drawerWidth = 280;

const AdminLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [viewIdsOpen, setViewIdsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [systemMonitorOpen, setSystemMonitorOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode, toggleDarkMode } = useThemeContext();
  const { currentUser, hasPermission, isAdmin, logout } = useAuth();

  // Memoize handlers to prevent recreation on each render
  const handleDrawerToggle = useCallback(() => {
    setMobileOpen(prevState => !prevState);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }, [logout, navigate]);

  // System Monitor handlers
  const openSystemMonitor = useCallback(() => {
    setSystemMonitorOpen(true);
  }, []);
  
  const closeSystemMonitor = useCallback(() => {
    setSystemMonitorOpen(false);
  }, []);

  // Memoize menuItems to prevent recreation on each render
  const menuItems = useMemo(() => [
    { 
      text: 'Dashboard', 
      icon: <DashboardIcon />, 
      path: '/admin',
      permission: null, // Always visible
    },
    { 
      text: 'Students', 
      icon: <PeopleIcon />, 
      path: '/admin/students',
      permission: 'manageStudents' as const,
    },
    { 
      text: 'Books', 
      icon: <MenuBookIcon />, 
      path: '/admin/books',
      permission: 'manageBooks' as const,  
    },
    { 
      text: 'Borrow/Return', 
      icon: <SwapIcon />, 
      path: '/admin/borrow-return',
      permission: 'manageBorrowing' as const,
    },
    { 
      text: 'Borrowed Books', 
      icon: <LibraryBooks />, 
      path: '/admin/borrowed-books',
      permission: 'manageBorrowing' as const,
    },
    { 
      text: 'Student Borrowings', 
      icon: <BackupTableIcon />, 
      path: '/admin/student-borrowings',
      permission: 'manageBorrowing' as const,
    },
    { 
      text: 'Reports', 
      icon: <AssessmentIcon />, 
      path: '/admin/reports',
      permission: 'manageReports' as const,
    },
    { 
      text: 'Announcements', 
      icon: <EmailIcon />, 
      path: '/admin/announcements',
      permission: 'manageStudents' as const,
    },
    { 
      text: 'Overdue Notifications', 
      icon: <MonetizationOnIcon />, 
      path: '/admin/overdue-notifications',
      permission: 'manageBorrowing' as const,
    },
    { 
      text: 'Fine Payments', 
      icon: <FinesIcon />, 
      path: '/admin/fine-payments',
      permission: 'manageBorrowing' as const,
    },
  ], []);

  // Memoize navigation handler
  const handleNavigation = useCallback((path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  }, [navigate, isMobile]);

  // Memoize toggle handlers
  const toggleAttendance = useCallback(() => {
    setAttendanceOpen(prev => !prev);
  }, []);

  const toggleUsers = useCallback(() => {
    setUsersOpen(prev => !prev);
  }, []);

  const openViewIds = useCallback(() => {
    setViewIdsOpen(true);
  }, []);

  const closeViewIds = useCallback(() => {
    setViewIdsOpen(false);
  }, []);

  const openSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  // Memoize the drawer content to prevent unnecessary rerenders
  const drawer = useMemo(() => (
    <Box sx={{ overflow: 'auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box 
        sx={{ 
          p: 3, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: 1,
          background: darkMode ? alpha(theme.palette.primary.dark, 0.15) : alpha(theme.palette.primary.light, 0.15),
          borderBottom: `1px solid ${darkMode ? alpha(theme.palette.primary.main, 0.2) : alpha(theme.palette.primary.main, 0.1)}`,
        }}
      >
        <Avatar 
          sx={{ 
            width: 64, 
            height: 64, 
            bgcolor: theme.palette.primary.main,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          <LibraryBooks sx={{ fontSize: 36, color: 'white' }} />
        </Avatar>
        <Typography variant="h5" fontWeight="600" color="primary" sx={{ mt: 1 }}>
          PCC Library
        </Typography>
        {currentUser && (
          <Paper 
            elevation={0} 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1.5, 
              mt: 2,
              p: 2,
              width: '100%',
              borderRadius: 2,
              backgroundColor: darkMode ? alpha(theme.palette.background.paper, 0.8) : alpha(theme.palette.background.paper, 0.9),
            }}
          >
            <Avatar 
              sx={{ 
                bgcolor: currentUser.role === 'admin' ? theme.palette.primary.main : theme.palette.secondary.main,
                width: 42,
                height: 42,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
            >
              {currentUser.name.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="body1" fontWeight="bold">
                {currentUser.name}
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  backgroundColor: currentUser.role === 'admin' ? theme.palette.primary.main : theme.palette.secondary.main,
                  color: 'white',
                  px: 1,
                  py: 0.5,
                  borderRadius: 4,
                  display: 'inline-block',
                  fontWeight: 'medium',
                }}
              >
                {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}
              </Typography>
            </Box>
          </Paper>
        )}
      </Box>
      <Divider />
      <Box sx={{ flexGrow: 1, overflowY: 'auto', py: 1 }}>
        <List component="nav" sx={{ px: 1 }}>
          {menuItems.map((item) => (
            (!item.permission || hasPermission(item.permission)) && (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => handleNavigation(item.path)}
                  selected={location.pathname === item.path}
                  sx={{
                    borderRadius: 1,
                    '&.Mui-selected': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.15),
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.25),
                      },
                      '& .MuiListItemIcon-root': {
                        color: theme.palette.primary.main
                      },
                      '& .MuiListItemText-primary': {
                        fontWeight: 'bold',
                        color: theme.palette.primary.main
                      }
                    },
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    }
                  }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            )
          ))}
          
          {hasPermission('manageAttendance') && (
            <>
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton 
                  onClick={toggleAttendance}
                  sx={{
                    borderRadius: 1,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    }
                  }}
                >
                  <ListItemIcon><AttendanceIcon /></ListItemIcon>
                  <ListItemText primary="Attendance" />
                  {attendanceOpen ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
              </ListItem>
              <Collapse in={attendanceOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ pl: 2 }}>
                  <ListItem disablePadding sx={{ mb: 0.5 }}>
                    <ListItemButton 
                      onClick={() => handleNavigation('/admin/attendance')}
                      selected={location.pathname === '/admin/attendance'}
                      sx={{
                        borderRadius: 1,
                        pl: 2.5,
                        '&.Mui-selected': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.15),
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.25),
                          },
                          '& .MuiListItemIcon-root': {
                            color: theme.palette.primary.main
                          },
                          '& .MuiListItemText-primary': {
                            fontWeight: 'bold',
                            color: theme.palette.primary.main
                          }
                        },
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}><AttendanceIcon /></ListItemIcon>
                      <ListItemText primary="Record Attendance" />
                    </ListItemButton>
                  </ListItem>
                  <ListItem disablePadding sx={{ mb: 0.5 }}>
                    <ListItemButton 
                      onClick={() => handleNavigation('/admin/list-attendance')}
                      selected={location.pathname === '/admin/list-attendance'}
                      sx={{
                        borderRadius: 1,
                        pl: 2.5,
                        '&.Mui-selected': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.15),
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.25),
                          },
                          '& .MuiListItemIcon-root': {
                            color: theme.palette.primary.main
                          },
                          '& .MuiListItemText-primary': {
                            fontWeight: 'bold',
                            color: theme.palette.primary.main
                          }
                        },
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}><ListIcon /></ListItemIcon>
                      <ListItemText primary="List & Print" />
                    </ListItemButton>
                  </ListItem>
                </List>
              </Collapse>
            </>
          )}
          
          {hasPermission('manageUsers') && (
            <>
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton 
                  onClick={toggleUsers}
                  sx={{
                    borderRadius: 1,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    }
                  }}
                >
                  <ListItemIcon><PersonAddIcon /></ListItemIcon>
                  <ListItemText primary="User Management" />
                  {usersOpen ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
              </ListItem>
              <Collapse in={usersOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding sx={{ pl: 2 }}>
                  <ListItem disablePadding sx={{ mb: 0.5 }}>
                    <ListItemButton 
                      onClick={() => handleNavigation('/admin/users')}
                      selected={location.pathname === '/admin/users'}
                      sx={{
                        borderRadius: 1,
                        pl: 2.5,
                        '&.Mui-selected': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.15),
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.25),
                          },
                          '& .MuiListItemIcon-root': {
                            color: theme.palette.primary.main
                          },
                          '& .MuiListItemText-primary': {
                            fontWeight: 'bold',
                            color: theme.palette.primary.main
                          }
                        },
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}><PersonAddIcon /></ListItemIcon>
                      <ListItemText primary="Add/Edit Users" />
                    </ListItemButton>
                  </ListItem>
                </List>
              </Collapse>
            </>
          )}
        </List>
        
        <Divider sx={{ my: 2 }} />
        
        <List component="nav" sx={{ px: 1 }}>
          <Typography 
            variant="overline" 
            color="text.secondary" 
            sx={{ px: 2, mb: 1, display: 'block', fontWeight: 'medium' }}
          >
            Library Tools
          </Typography>
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton 
              onClick={openSystemMonitor}
              sx={{
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                }
              }}
            >
              <ListItemIcon><MonitorIcon /></ListItemIcon>
              <ListItemText primary="System Monitor" />
            </ListItemButton>
          </ListItem>
          
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton 
              onClick={openViewIds}
              sx={{
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                }
              }}
            >
              <ListItemIcon><BadgeIcon /></ListItemIcon>
              <ListItemText primary="View Generated IDs" />
            </ListItemButton>
          </ListItem>
          
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton 
              onClick={() => handleNavigation('/admin/print-barcodes')}
              sx={{
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                }
              }}
            >
              <ListItemIcon><PrintIcon /></ListItemIcon>
              <ListItemText primary="Print Book Barcodes" />
            </ListItemButton>
          </ListItem>
          
          {hasPermission('manageSettings') && (
            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton 
                onClick={openSettings}
                sx={{
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  }
                }}
              >
                <ListItemIcon><SettingsIcon /></ListItemIcon>
                <ListItemText primary="Library Settings" />
              </ListItemButton>
            </ListItem>
          )}
        </List>
      </Box>
      
      <Box sx={{ p: 2, borderTop: `1px solid ${darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}` }}>
        <Button 
          fullWidth
          variant="contained"
          color="error"
          onClick={handleLogout}
          startIcon={<LogoutIcon />}
          sx={{
            py: 1.2,
            boxShadow: 2,
            backgroundColor: theme.palette.error.main,
            '&:hover': {
              backgroundColor: theme.palette.error.dark,
            }
          }}
        >
          Logout
        </Button>
      </Box>
    </Box>
  ), [
    theme, 
    darkMode,
    currentUser, 
    menuItems, 
    hasPermission, 
    location.pathname, 
    attendanceOpen, 
    usersOpen, 
    handleNavigation,
    toggleAttendance,
    toggleUsers,
    openViewIds,
    openSettings,
    openSystemMonitor,
    handleLogout
  ]);

  const pageTitle = useMemo(() => {
    // Find the title from menuItems or use a default
    return menuItems.find(item => item.path === location.pathname)?.text || 'PCC Library System';
  }, [menuItems, location.pathname]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: darkMode ? '#121212' : '#f8f9fa' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: darkMode ? '#1e1e1e' : 'white',
          borderBottom: `1px solid ${darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.09)'}`,
          height: { xs: 64, sm: 60 },
        }}
      >
        <Toolbar 
          sx={{ 
            height: { xs: 64, sm: 60 },
            minHeight: { xs: 64, sm: 60 },
            px: { xs: 2, sm: 3 },
          }}
        >
          <IconButton
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 1.5, display: { sm: 'none' }, color: 'primary.main' }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography 
            variant="h6"
            component="div" 
            sx={{ 
              fontWeight: 'bold',
              color: darkMode ? theme.palette.primary.light : theme.palette.primary.main,
              display: { xs: 'block', md: 'none' },
            }}
          >
            {pageTitle}
          </Typography>
          
          <Box sx={{ 
            flexGrow: 1, 
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            gap: 2 
          }}>
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                fontWeight: 'bold',
                color: darkMode ? theme.palette.primary.light : theme.palette.primary.main,
                minWidth: 120,
              }}
            >
              {pageTitle}
            </Typography>
            <GlobalSearch />
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title={darkMode ? "Switch to light mode" : "Switch to dark mode"}>
              <IconButton 
                onClick={toggleDarkMode} 
                size="small"
                sx={{ 
                  mr: 1,
                  backgroundColor: darkMode ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.primary.light, 0.2),
                  '&:hover': {
                    backgroundColor: darkMode ? alpha(theme.palette.primary.main, 0.2) : alpha(theme.palette.primary.light, 0.4),
                  }
                }}
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {darkMode ? 
                  <LightModeIcon sx={{ fontSize: 20, color: theme.palette.primary.light }} /> : 
                  <DarkModeIcon sx={{ fontSize: 20, color: theme.palette.primary.main }} />}
              </IconButton>
            </Tooltip>
            
            <Button
              variant="outlined"
              color="primary"
              onClick={openSystemMonitor}
              startIcon={<MonitorIcon sx={{ fontSize: 18 }} />}
              size="small"
              sx={{ 
                display: { xs: 'none', lg: 'flex' }, 
                mr: 1,
                borderRadius: 2,
                fontSize: '0.8rem',
                textTransform: 'none',
                boxShadow: darkMode ? 'none' : '0 2px 5px rgba(0,0,0,0.08)'
              }}
            >
              System Monitor
            </Button>
            
            {hasPermission('manageSettings') && (
              <Button
                variant="outlined"
                color="primary"
                onClick={openSettings}
                startIcon={<SettingsIcon sx={{ fontSize: 18 }} />}
                size="small"
                sx={{ 
                  display: { xs: 'none', lg: 'flex' }, 
                  mr: 0.5,
                  borderRadius: 2,
                  fontSize: '0.8rem',
                  textTransform: 'none',
                  boxShadow: darkMode ? 'none' : '0 2px 5px rgba(0,0,0,0.08)'
                }}
              >
                Settings
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: darkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.09)',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: 8, sm: 7.5 },
        }}
      >
        <Box 
          sx={{ 
            backgroundColor: darkMode ? alpha(theme.palette.background.paper, 0.7) : alpha(theme.palette.background.paper, 0.98),
            borderRadius: 3,
            boxShadow: darkMode ? 'none' : '0 6px 18px rgba(0,0,0,0.08)',
            p: { xs: 2, sm: 3 }
          }}
        >
          <Outlet />
        </Box>
      </Box>

      <ViewGeneratedIds
        open={viewIdsOpen}
        onClose={closeViewIds}
      />

      <LibrarySettings
        open={settingsOpen}
        onClose={closeSettings}
      />
      
      <SystemMonitorModal
        open={systemMonitorOpen}
        onClose={closeSystemMonitor}
      />
    </Box>
  );
};

export default AdminLayout;
