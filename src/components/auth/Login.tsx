import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  LibraryBooks,
} from '@mui/icons-material';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeContext } from '../../contexts/ThemeContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userLoading } = useAuth();
  const { darkMode } = useThemeContext();
  
  // Get the redirect path from location state or default to admin dashboard
  const from = (location.state as any)?.from?.pathname || '/admin';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      
      // Just sign in with Firebase Auth - the AuthContext will handle the rest
      await signInWithEmailAndPassword(auth, email, password);
      
      // Navigation will happen automatically via the useEffect in AuthContext
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Handle different error codes
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setError('Invalid email or password');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later.');
      } else {
        setError('Failed to sign in: ' + (error.message || error.code || 'Unknown error'));
      }
      setLoading(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleOpenForgotPassword = () => {
    setResetEmail(email); // Pre-fill with login email if available
    setForgotPasswordOpen(true);
    setResetSuccess(false);
    setResetError('');
  };

  const handleCloseForgotPassword = () => {
    setForgotPasswordOpen(false);
  };

  const handleResetPassword = async () => {
    if (!resetEmail || !resetEmail.includes('@')) {
      setResetError('Please enter a valid email address');
      return;
    }

    try {
      setResetLoading(true);
      setResetError('');
      
      console.log('Attempting to send password reset email to:', resetEmail);
      
      // Configure actionCodeSettings to specify the URL to redirect to after password reset
      const actionCodeSettings = {
        url: window.location.origin + '/login', // Redirect back to login page after reset
        handleCodeInApp: false
      };
      
      await sendPasswordResetEmail(auth, resetEmail, actionCodeSettings);
      console.log('Password reset email sent successfully');
      
      setResetSuccess(true);
      setResetLoading(false);
    } catch (error: any) {
      console.error('Password reset error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      setResetLoading(false);
      
      if (error.code === 'auth/user-not-found') {
        setResetError('No account found with this email address');
      } else if (error.code === 'auth/invalid-email') {
        setResetError('The email address is not valid');
      } else if (error.code === 'auth/too-many-requests') {
        setResetError('Too many requests. Please try again later');
      } else if (error.code === 'auth/network-request-failed') {
        setResetError('Network error. Please check your internet connection');
      } else {
        setResetError('Failed to send reset email: ' + (error.message || error.code || 'Unknown error'));
      }
    }
  };

  // If already logged in and not loading, redirect to admin
  useEffect(() => {
    if (!userLoading && currentUser) {
      navigate(from, { replace: true });
    }
  }, [currentUser, userLoading, navigate, from]);

  return (
    <Container maxWidth="sm" sx={{ height: '100vh', display: 'flex', alignItems: 'center' }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          width: '100%',
          borderRadius: 2,
          backgroundColor: darkMode ? 'background.paper' : 'white',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
          <LibraryBooks sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
            OPAC System
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Sign in to access the library management system
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleLogin} noValidate>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleTogglePasswordVisibility}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2, py: 1.5 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Sign In'}
          </Button>
          
          <Box sx={{ textAlign: 'center' }}>
            <Link
              component="button"
              variant="body2"
              onClick={handleOpenForgotPassword}
              sx={{ cursor: 'pointer' }}
            >
              Forgot Password?
            </Link>
          </Box>
        </Box>
        
        <Typography variant="body2" textAlign="center" mt={3} color="text.secondary">
          Only authorized users can access this system.
        </Typography>
      </Paper>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotPasswordOpen} onClose={handleCloseForgotPassword}>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter your email address below. We'll send you a link to reset your password.
          </DialogContentText>
          {resetSuccess && (
            <Alert severity="success" sx={{ mt: 2, mb: 1 }}>
              Password reset email sent! Please check your inbox (and spam/junk folder) for further instructions.
              <Box mt={1}>
                If you don't receive the email within a few minutes:
                <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                  <li>Check your spam or junk folder</li>
                  <li>Verify you entered the correct email address</li>
                  <li>Make sure you're using the email address associated with your account</li>
                </ul>
              </Box>
            </Alert>
          )}
          {resetError && (
            <Alert severity="error" sx={{ mt: 2, mb: 1 }}>
              {resetError}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            id="reset-email"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            disabled={resetLoading || resetSuccess}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForgotPassword}>Cancel</Button>
          <Button 
            onClick={handleResetPassword} 
            variant="contained" 
            disabled={resetLoading || resetSuccess}
          >
            {resetLoading ? <CircularProgress size={24} /> : 'Reset Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Login; 