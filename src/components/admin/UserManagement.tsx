import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Divider,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import { ref, push, set, get, remove, update } from 'firebase/database';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, database } from '../../firebase';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: UserPermissions;
  dateCreated: string;
  createdBy: string;
}

interface UserPermissions {
  manageBooks: boolean;
  manageStudents: boolean;
  manageBorrowing: boolean;
  manageAttendance: boolean;
  viewReports: boolean;
  manageReports: boolean;
  manageUsers: boolean;
  manageSettings: boolean;
}

const defaultPermissions: UserPermissions = {
  manageBooks: false,
  manageStudents: false,
  manageBorrowing: false,
  manageAttendance: false,
  viewReports: false,
  manageReports: false,
  manageUsers: false,
  manageSettings: false,
};

const adminPermissions: UserPermissions = {
  manageBooks: true,
  manageStudents: true,
  manageBorrowing: true,
  manageAttendance: true,
  viewReports: true,
  manageReports: true,
  manageUsers: true,
  manageSettings: true,
};

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [open, setOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [tabValue, setTabValue] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'staff', // 'admin' or 'staff'
  });

  // Permissions state
  const [permissions, setPermissions] = useState<UserPermissions>(defaultPermissions);

  // Load users on component mount
  useEffect(() => {
    loadUsers();
    const user = auth.currentUser;
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  // Reset form messages after timeout
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
    
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const usersArray = Object.entries(usersData).map(([id, data]: [string, any]) => ({
          id,
          ...data,
        }));
        setUsers(usersArray);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOpen = useCallback((user?: User) => {
    if (user) {
      setEditUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        confirmPassword: '',
        role: user.role,
      });
      setPermissions(user.permissions || defaultPermissions);
    } else {
      setEditUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'staff',
      });
      setPermissions(defaultPermissions);
    }
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setEditUser(null);
    setError('');
    // Reset form after dialog closes
    setTimeout(() => {
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'staff',
      });
      setPermissions(defaultPermissions);
      setTabValue(0);
    }, 200);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleSelectChange = useCallback((e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Set default permissions based on role
    if (name === 'role') {
      if (value === 'admin') {
        setPermissions(adminPermissions);
      } else {
        setPermissions(defaultPermissions);
      }
    }
  }, []);

  const handlePermissionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setPermissions(prev => ({
      ...prev,
      [name]: checked,
    }));
  }, []);

  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  }, []);

  const validateForm = useCallback(() => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return false;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!editUser && (!formData.password || formData.password.length < 6)) {
      setError('Password must be at least 6 characters');
      return false;
    }

    if (!editUser && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  }, [formData, editUser]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (editUser) {
        // Update existing user permissions and role
        const updates: any = {
          role: formData.role,
          permissions: formData.role === 'admin' ? adminPermissions : permissions,
        };

        if (formData.name !== editUser.name) {
          updates.name = formData.name;
        }

        await update(ref(database, `users/${editUser.id}`), updates);
        setSuccess(`User ${formData.name} updated successfully`);
      } else {
        // Create new user
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );

        const newUser = userCredential.user;
        
        // Create user data for database
        const userData = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          permissions: formData.role === 'admin' ? adminPermissions : permissions,
          dateCreated: new Date().toISOString(),
          createdBy: currentUser?.email || 'system',
        };

        // Save user data in realtime database
        await set(ref(database, `users/${newUser.uid}`), userData);
        setSuccess(`User ${formData.name} created successfully`);
      }

      handleClose();
      loadUsers();
    } catch (error: any) {
      console.error('Error creating/updating user:', error);
      setError(error.message || 'Failed to create/update user');
    } finally {
      setLoading(false);
    }
  }, [validateForm, formData, editUser, permissions, currentUser, handleClose, loadUsers]);

  const handleDelete = useCallback(async (user: User) => {
    if (window.confirm(`Are you sure you want to delete ${user.name}?`)) {
      try {
        setLoading(true);
        await remove(ref(database, `users/${user.id}`));
        setSuccess(`User ${user.name} deleted successfully`);
        loadUsers();
      } catch (error: any) {
        console.error('Error deleting user:', error);
        setError(error.message || 'Failed to delete user');
      } finally {
        setLoading(false);
      }
    }
  }, [loadUsers]);

  // Memoize permission labels to avoid recreating on each render
  const permissionLabels = useMemo(() => ({
    manageBooks: 'Manage Books',
    manageStudents: 'Manage Students',
    manageBorrowing: 'Manage Borrowing',
    manageAttendance: 'Manage Attendance',
    viewReports: 'View Reports',
    manageReports: 'Manage Reports',
    manageUsers: 'Manage Users',
    manageSettings: 'Manage Settings',
  }), []);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2">
            User Management
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PersonAddIcon />}
            onClick={() => handleOpen()}
          >
            Add New User
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {loading && !open ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Permissions</TableCell>
                  <TableCell>Date Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip 
                          label={user.role === 'admin' ? 'Admin' : 'Staff'} 
                          color={user.role === 'admin' ? 'primary' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {Object.entries(user.permissions || {}).map(([key, value]) => (
                            value && (
                              <Chip 
                                key={key} 
                                label={permissionLabels[key as keyof UserPermissions]} 
                                size="small" 
                                variant="outlined"
                              />
                            )
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {new Date(user.dateCreated).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <IconButton onClick={() => handleOpen(user)} color="primary" size="small">
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          onClick={() => handleDelete(user)} 
                          color="error" 
                          size="small"
                          disabled={user.id === currentUser?.uid}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Add/Edit User Dialog */}
      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editUser ? `Edit User: ${editUser.name}` : 'Add New User'}
        </DialogTitle>
        <DialogContent dividers>
          <Box component="form" noValidate>
            <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 2 }}>
              <Tab label="User Information" />
              <Tab label="Permissions" />
            </Tabs>

            {tabValue === 0 && (
              <Box>
                <TextField
                  margin="dense"
                  name="name"
                  label="Full Name"
                  type="text"
                  fullWidth
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
                <TextField
                  margin="dense"
                  name="email"
                  label="Email Address"
                  type="email"
                  fullWidth
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={!!editUser}
                />
                {!editUser && (
                  <>
                    <TextField
                      margin="dense"
                      name="password"
                      label="Password"
                      type="password"
                      fullWidth
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                    />
                    <TextField
                      margin="dense"
                      name="confirmPassword"
                      label="Confirm Password"
                      type="password"
                      fullWidth
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                    />
                  </>
                )}
                <FormControl fullWidth margin="dense">
                  <InputLabel>Role</InputLabel>
                  <Select
                    name="role"
                    value={formData.role}
                    label="Role"
                    onChange={handleSelectChange}
                  >
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="staff">Staff</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}

            {tabValue === 1 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Assign Permissions for {formData.name}
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Select the functions this user can access:
                </Typography>
                <FormGroup>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={permissions.manageBooks}
                            onChange={handlePermissionChange}
                            name="manageBooks"
                            disabled={formData.role === 'admin'}
                          />
                        }
                        label="Manage Books"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={permissions.manageStudents}
                            onChange={handlePermissionChange}
                            name="manageStudents"
                            disabled={formData.role === 'admin'}
                          />
                        }
                        label="Manage Students"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={permissions.manageBorrowing}
                            onChange={handlePermissionChange}
                            name="manageBorrowing"
                            disabled={formData.role === 'admin'}
                          />
                        }
                        label="Manage Borrowing"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={permissions.manageAttendance}
                            onChange={handlePermissionChange}
                            name="manageAttendance"
                            disabled={formData.role === 'admin'}
                          />
                        }
                        label="Manage Attendance"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={permissions.viewReports}
                            onChange={handlePermissionChange}
                            name="viewReports"
                            disabled={formData.role === 'admin'}
                          />
                        }
                        label="View Reports"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={permissions.manageReports}
                            onChange={handlePermissionChange}
                            name="manageReports"
                            disabled={formData.role === 'admin'}
                          />
                        }
                        label="Manage Reports"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={permissions.manageUsers}
                            onChange={handlePermissionChange}
                            name="manageUsers"
                            disabled={formData.role === 'admin'}
                          />
                        }
                        label="Manage Users"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={permissions.manageSettings}
                            onChange={handlePermissionChange}
                            name="manageSettings"
                            disabled={formData.role === 'admin'}
                          />
                        }
                        label="Manage Settings"
                      />
                    </Grid>
                  </Grid>
                </FormGroup>
                {formData.role === 'admin' && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Admin users automatically have all permissions.
                  </Alert>
                )}
              </Box>
            )}
          </Box>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : (editUser ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserManagement; 