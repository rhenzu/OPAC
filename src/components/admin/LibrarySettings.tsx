import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  InputAdornment,
} from '@mui/material';
import { ref, get, set } from 'firebase/database';
import { database } from '../../firebase';

interface LibrarySettingsProps {
  open: boolean;
  onClose: () => void;
}

interface LibraryRules {
  borrowDurationDays: number;
  finePerDay: number;
  maxBooksPerStudent: number;
}

const LibrarySettings: React.FC<LibrarySettingsProps> = ({ open, onClose }) => {
  const [settings, setSettings] = useState<LibraryRules>({
    borrowDurationDays: 7,
    finePerDay: 5,
    maxBooksPerStudent: 3,
  });
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const settingsRef = ref(database, 'librarySettings');
      const snapshot = await get(settingsRef);
      if (snapshot.exists()) {
        setSettings(snapshot.val());
      }
    } catch (error) {
      setError('Failed to load settings');
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');

      // Validate inputs
      if (settings.borrowDurationDays < 1) {
        setError('Borrow duration must be at least 1 day');
        return;
      }
      if (settings.finePerDay < 0) {
        setError('Fine amount cannot be negative');
        return;
      }
      if (settings.maxBooksPerStudent < 1) {
        setError('Maximum books per student must be at least 1');
        return;
      }

      const settingsRef = ref(database, 'librarySettings');
      await set(settingsRef, settings);
      setSuccess('Settings saved successfully');
    } catch (error) {
      setError('Failed to save settings');
      console.error('Error saving settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    setSuccess('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Library Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          
          <Typography variant="subtitle2" gutterBottom>
            Book Borrowing Rules
          </Typography>
          
          <TextField
            fullWidth
            label="Borrow Duration"
            type="number"
            value={settings.borrowDurationDays}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              borrowDurationDays: parseInt(e.target.value) || 0
            }))}
            InputProps={{
              endAdornment: <InputAdornment position="end">days</InputAdornment>,
            }}
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label="Maximum Books per Student"
            type="number"
            value={settings.maxBooksPerStudent}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              maxBooksPerStudent: parseInt(e.target.value) || 0
            }))}
            InputProps={{
              endAdornment: <InputAdornment position="end">books</InputAdornment>,
            }}
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label="Fine Amount per Day"
            type="number"
            value={settings.finePerDay}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              finePerDay: parseFloat(e.target.value) || 0
            }))}
            InputProps={{
              startAdornment: <InputAdornment position="start">₱</InputAdornment>,
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={isLoading}
        >
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LibrarySettings; 