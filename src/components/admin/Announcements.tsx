import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Grid,
  Alert,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Card,
  CardContent,
} from '@mui/material';
import { ref, get, query, orderByChild } from 'firebase/database';
import { database } from '../../firebase';
import { sendAnnouncement } from '../../utils/notificationUtils';

interface Student {
  id: string;
  name: string;
  email: string;
  course: string;
  yearLevel: string;
  section?: string;
}

const Announcements: React.FC = () => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [recipientType, setRecipientType] = useState<'all' | 'selected' | 'single'>('all');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [selectAll, setSelectAll] = useState(false);
  const [filters, setFilters] = useState({
    course: '',
    yearLevel: '',
    section: '',
  });

  // Fetch students when component mounts
  useEffect(() => {
    loadStudents();
  }, []);

  // Filter students based on the selected filters
  const filteredStudents = students.filter((student) => {
    return (
      (filters.course === '' || student.course === filters.course) &&
      (filters.yearLevel === '' || student.yearLevel === filters.yearLevel) &&
      (filters.section === '' || student.section === filters.section)
    );
  });

  // Get unique values for filters
  const courses = [...new Set(students.map((student) => student.course))].sort();
  const yearLevels = [...new Set(students.map((student) => student.yearLevel))].sort();
  const sections = [...new Set(students.map((student) => student.section || '').filter(Boolean))].sort();

  // Load students from database
  const loadStudents = async () => {
    try {
      setLoading(true);
      const studentsRef = ref(database, 'students');
      const snapshot = await get(studentsRef);
      
      if (snapshot.exists()) {
        const studentsData = snapshot.val();
        const studentsArray = Object.entries(studentsData).map(([id, data]: [string, any]) => ({
          id,
          ...data,
        })) as Student[];
        
        // Only include students with valid emails
        const validStudents = studentsArray.filter(student => 
          student.email && student.email.includes('@')
        );
        
        setStudents(validStudents);
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error('Error loading students:', error);
      setError('Failed to load students. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle selection of all students
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectAll(event.target.checked);
    if (event.target.checked) {
      const filteredIds = filteredStudents.map((student) => student.id);
      setSelectedStudents(filteredIds);
    } else {
      setSelectedStudents([]);
    }
  };

  // Handle selection of individual student
  const handleSelectStudent = (id: string) => {
    setSelectedStudents((prev) => {
      if (prev.includes(id)) {
        // Deselect student
        return prev.filter((studentId) => studentId !== id);
      } else {
        // Select student
        return [...prev, id];
      }
    });
  };

  // Get list of recipient emails based on selection
  const getRecipientEmails = (): string | string[] => {
    if (recipientType === 'all') {
      return students.map((student) => student.email);
    } else if (recipientType === 'selected') {
      return selectedStudents.map((id) => {
        const student = students.find((s) => s.id === id);
        return student ? student.email : '';
      }).filter(Boolean);
    } else {
      // For single recipient (not implemented in UI, but could be added later)
      return '';
    }
  };

  // Handle filters change
  const handleFilterChange = (filter: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [filter]: value,
    }));
    
    // When changing filters, reset the selection
    setSelectedStudents([]);
    setSelectAll(false);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      course: '',
      yearLevel: '',
      section: '',
    });
  };

  // Send announcement
  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      if (!subject || !message) {
        setError('Subject and message are required.');
        return;
      }
      
      const recipients = getRecipientEmails();
      
      if (recipientType === 'selected' && (!selectedStudents.length || !Array.isArray(recipients) || !recipients.length)) {
        setError('Please select at least one student.');
        return;
      }
      
      const result = await sendAnnouncement(
        subject,
        message,
        recipientType,
        recipients,
        attachmentUrl || undefined
      );
      
      if (result.success) {
        setSuccess(`${result.message}`);
        // Clear form fields
        setSubject('');
        setMessage('');
        setAttachmentUrl('');
        setSelectedStudents([]);
        setSelectAll(false);
      } else {
        setError(`Failed to send announcement: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error sending announcement:', error);
      setError(`Error sending announcement: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Send Announcements
        </Typography>
        <Typography color="textSecondary" paragraph>
          Create and send announcements to students via email
        </Typography>

        {/* Announcement Form */}
        <Box component="form" onSubmit={handleSendAnnouncement} sx={{ mb: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                multiline
                rows={6}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Attachment URL (Optional)"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                helperText="Link to a document or resource (optional)"
              />
            </Grid>
          </Grid>

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              startIcon={loading && <CircularProgress size={20} />}
            >
              Send Announcement
            </Button>
          </Box>
        </Box>

        {/* Recipient Selection */}
        <Typography variant="h6" gutterBottom>
          Select Recipients
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Course</InputLabel>
                <Select
                  value={filters.course}
                  label="Course"
                  onChange={(e) => handleFilterChange('course', e.target.value)}
                >
                  <MenuItem value="">All Courses</MenuItem>
                  {courses.map((course) => (
                    <MenuItem key={course} value={course}>
                      {course}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Year Level</InputLabel>
                <Select
                  value={filters.yearLevel}
                  label="Year Level"
                  onChange={(e) => handleFilterChange('yearLevel', e.target.value)}
                >
                  <MenuItem value="">All Year Levels</MenuItem>
                  {yearLevels.map((yearLevel) => (
                    <MenuItem key={yearLevel} value={yearLevel}>
                      {yearLevel}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Section</InputLabel>
                <Select
                  value={filters.section}
                  label="Section"
                  onChange={(e) => handleFilterChange('section', e.target.value)}
                >
                  <MenuItem value="">All Sections</MenuItem>
                  {sections.map((section) => (
                    <MenuItem key={section} value={section}>
                      {section}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3} sx={{ display: 'flex', alignItems: 'center' }}>
              <Button variant="outlined" onClick={clearFilters}>
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </Box>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1">
                {filteredStudents.length} student(s) found
              </Typography>
              <Box>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => setRecipientType('all')}
                  sx={{ mr: 1 }}
                  disabled={recipientType === 'all'}
                >
                  Send to All
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => setRecipientType('selected')}
                  disabled={recipientType === 'selected'}
                >
                  Send to Selected
                </Button>
              </Box>
            </Box>

            <Alert severity="info" sx={{ mb: 2 }}>
              Current mode: <strong>{recipientType === 'all' ? 'Sending to all students' : 'Sending only to selected students'}</strong>
            </Alert>

            {recipientType === 'selected' && (
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectAll}
                          onChange={handleSelectAll}
                          inputProps={{ 'aria-label': 'select all' }}
                        />
                      </TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Course</TableCell>
                      <TableCell>Year Level</TableCell>
                      <TableCell>Section</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow
                        key={student.id}
                        hover
                        onClick={() => handleSelectStudent(student.id)}
                        selected={selectedStudents.includes(student.id)}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedStudents.includes(student.id)}
                            onChange={() => handleSelectStudent(student.id)}
                            inputProps={{ 'aria-labelledby': `student-${student.id}` }}
                          />
                        </TableCell>
                        <TableCell id={`student-${student.id}`}>{student.name}</TableCell>
                        <TableCell>{student.email}</TableCell>
                        <TableCell>{student.course}</TableCell>
                        <TableCell>{student.yearLevel}</TableCell>
                        <TableCell>{student.section || '-'}</TableCell>
                      </TableRow>
                    ))}
                    {filteredStudents.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          No students found matching the selected filters
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {recipientType === 'selected' && selectedStudents.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Selected Students ({selectedStudents.length}):
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedStudents.map((id) => {
                    const student = students.find((s) => s.id === id);
                    return student ? (
                      <Chip
                        key={id}
                        label={`${student.name} (${student.email})`}
                        onDelete={() => handleSelectStudent(id)}
                        color="primary"
                        variant="outlined"
                      />
                    ) : null;
                  })}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      </Paper>
    </Container>
  );
};

export default Announcements; 