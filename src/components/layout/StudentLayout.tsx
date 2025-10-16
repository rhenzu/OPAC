import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Container,
  CssBaseline,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
  Button,
  Avatar,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Badge,
  Divider,
  useMediaQuery
} from '@mui/material';
import { 
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  InfoOutlined as InfoIcon,
  Menu as MenuIcon,
  Home as HomeIcon,
  Search as SearchIcon,
  MenuBook as MenuBookIcon,
  Person as PersonIcon,
  Login as LoginIcon
} from '@mui/icons-material';
import { useThemeContext } from '../../contexts/ThemeContext';

const StudentLayout: React.FC = () => {
  const theme = useTheme();
  const location = useLocation();
  const { darkMode, toggleDarkMode } = useThemeContext();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  
  const navItems = [
    { text: 'Home', icon: <HomeIcon />, path: '/' },
    { text: 'Browse', icon: <SearchIcon />, path: '/browse' },
    { text: 'About', icon: <InfoIcon />, path: '/about' },
  ];

  const drawer = (
    <Box sx={{ width: 250 }} onClick={handleDrawerToggle}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        p: 2, 
        bgcolor: alpha(theme.palette.primary.main, 0.1) 
      }}>
        <MenuBookIcon color="primary" sx={{ fontSize: 36, mr: 1 }} />
        <Typography variant="h6" color="primary" fontWeight="bold">
          PCC LIBRARY
        </Typography>
      </Box>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton 
              component={Link} 
              to={item.path}
              selected={location.pathname === item.path}
              sx={{
                '&.Mui-selected': {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  borderLeft: `4px solid ${theme.palette.primary.main}`,
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.15),
                  }
                },
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                }
              }}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <CssBaseline />
      
      {/* App bar */}
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{
          backgroundColor: theme.palette.mode === 'dark' 
            ? alpha(theme.palette.background.paper, 0.9) 
            : alpha(theme.palette.background.paper, 0.9),
          backdropFilter: 'blur(8px)',
          color: theme.palette.text.primary,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
        }}
      >
        <Container maxWidth="lg">
          <Toolbar sx={{ px: { xs: 0 } }}>
            {/* Logo and title */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {isMobile && (
                <IconButton
                  color="inherit"
                  aria-label="open drawer"
                  edge="start"
                  onClick={handleDrawerToggle}
                  sx={{ mr: 1 }}
                >
                  <MenuIcon />
                </IconButton>
              )}
              <MenuBookIcon color="primary" sx={{ mr: 1, fontSize: 32 }} />
              <Typography 
                variant="h5" 
                component={Link}
                to="/"
                sx={{ 
                  fontWeight: 'bold', 
                  color: theme.palette.primary.main,
                  display: 'flex',
                  alignItems: 'center',
                  textDecoration: 'none'
                }}
              >
                PCC LIBRARY
              </Typography>
            </Box>
            
            {/* Navigation for desktop */}
            {!isMobile && (
              <Box sx={{ ml: 4, display: 'flex' }}>
                {navItems.map((item) => (
                  <Button 
                    key={item.text}
                    component={Link}
                    to={item.path}
                    color={location.pathname === item.path ? "primary" : "inherit"}
                    sx={{ 
                      mx: 1,
                      fontWeight: location.pathname === item.path ? 'bold' : 'normal',
                      position: 'relative',
                      '&::after': location.pathname === item.path ? {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: '20%',
                        width: '60%',
                        height: 3,
                        bgcolor: theme.palette.primary.main,
                        borderRadius: 3
                      } : {}
                    }}
                    startIcon={item.icon}
                  >
                    {item.text}
                  </Button>
                ))}
              </Box>
            )}
            
            {/* Spacer */}
            <Box sx={{ flexGrow: 1 }} />
            
            {/* Right side actions */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {/* Theme toggle */}
              <Tooltip title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
                <IconButton onClick={toggleDarkMode} color="inherit" sx={{ ml: 1 }}>
                  {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
                </IconButton>
              </Tooltip>
              
              {/* Login button or User profile */}
              <Button 
                component={Link}
                to="/login"
                color="primary"
                variant="outlined"
                startIcon={<LoginIcon />}
                sx={{ 
                  ml: 2,
                  borderRadius: '20px',
                  display: { xs: 'none', sm: 'flex' }
                }}
              >
                Login
              </Button>
              
              <IconButton color="inherit" sx={{ display: { xs: 'flex', sm: 'none' }, ml: 1 }}>
                <PersonIcon />
              </IconButton>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: 250, boxSizing: 'border-box' },
        }}
      >
        {drawer}
      </Drawer>
      
      {/* Main content */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          py: 3, 
          backgroundColor: theme.palette.background.default
        }}
      >
        {location.pathname === '/' ? (
          <Outlet />
        ) : (
          <Container maxWidth="lg">
            <Outlet />
          </Container>
        )}
      </Box>
      
      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 4,
          px: 2,
          mt: 'auto',
          backgroundColor: theme.palette.background.paper,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'center', md: 'flex-start' } }}>
            <Box sx={{ mb: { xs: 3, md: 0 }, textAlign: { xs: 'center', md: 'left' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', md: 'flex-start' }, mb: 1 }}>
                <MenuBookIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="primary" fontWeight="bold">
                  PCC LIBRARY System
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Your gateway to knowledge and resources
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                Quick Links
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}>
                <Link to="/" style={{ color: theme.palette.text.secondary, textDecoration: 'none' }}>Home</Link>
                <Link to="/books" style={{ color: theme.palette.text.secondary, textDecoration: 'none' }}>Books</Link>
                <Link to="/about" style={{ color: theme.palette.text.secondary, textDecoration: 'none' }}>About</Link>
              </Box>
            </Box>
          </Box>
          
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              © {new Date().getFullYear()} PCC LIBRARY System - All Rights Reserved
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              Developed by Aia Noel Arguelles
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default StudentLayout;