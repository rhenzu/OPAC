import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Email as EmailIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { ref, get, push, update } from 'firebase/database';
import { database } from '../../firebase';
import { createBulkOverdueNotifications } from '../../utils/emailUtils';
import { sendStudentNotification, sendOverdueNotification } from '../../utils/mailer';

interface OverdueBook {
  title: string;
  dueDate: string;
  daysOverdue: number;
  fine: number;
}

interface StudentOverdue {
  studentId: string;
  name: string;
  email: string;
  books: OverdueBook[];
}

// Add interface for student data from Firebase
interface StudentData {
  studentId: string;
  name: string;
  [key: string]: any; // for other properties
}

const OverdueNotifications: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [overdueData, setOverdueData] = useState<StudentOverdue[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [sendResult, setSendResult] = useState<{ success: number; failed: number } | null>(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [emailSubject, setEmailSubject] = useState('Library Notification: Overdue Books');
  const [emailTemplate, setEmailTemplate] = useState(`Dear {studentName},

This is a friendly reminder that you have overdue book(s) from our library.
Please return them as soon as possible to avoid additional fines.

Thank you,
Library Management Team`);
  const [sending, setSending] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  useEffect(() => {
    loadOverdueData();
  }, []);

  const loadOverdueData = async () => {
    try {
      setLoading(true);
      setError('');

      // Get all borrows
      const borrowsRef = ref(database, 'borrows');
      const borrowsSnapshot = await get(borrowsRef);

      if (!borrowsSnapshot.exists()) {
        setOverdueData([]);
        return;
      }

      const borrows = borrowsSnapshot.val();
      const today = new Date();
      console.log('Checking for overdue books, today is:', today.toISOString());
      console.log('Total borrows found:', Object.keys(borrows).length);

      // Get all students
      const studentsRef = ref(database, 'students');
      const studentsSnapshot = await get(studentsRef);
      const students: Record<string, StudentData> = studentsSnapshot.exists() ? studentsSnapshot.val() : {};
      console.log('Total students found:', Object.keys(students).length);
      console.log('Students data:', students);

      // Get all books
      const booksRef = ref(database, 'books');
      const booksSnapshot = await get(booksRef);
      const books = booksSnapshot.exists() ? booksSnapshot.val() : {};
      console.log('Total books found:', Object.keys(books).length);

      // Process overdue books
      const overdueByStudent = new Map<string, OverdueBook[]>();

      Object.entries(borrows).forEach(([borrowId, borrow]: [string, any]) => {
        console.log(`Processing borrow record ${borrowId}:`, borrow);
        
        // Skip returned books
        if (borrow.status === 'returned' || borrow.returnDate) {
          console.log(`Skipping returned book in borrow record ${borrowId}`);
          return;
        }

        const dueDate = new Date(borrow.dueDate);
        const isOverdue = today.getTime() > dueDate.getTime();
        console.log(`Borrow ${borrowId}: Due date ${dueDate.toISOString()}, Is overdue: ${isOverdue}`);

        if (isOverdue) {
          console.log(`Found overdue book in borrow record ${borrowId}. Due date: ${dueDate.toISOString()}`);
          const book = books[borrow.bookId];
          if (book) {
            const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            const fine = daysOverdue * 5; // ₱5 per day

            const overdueBook: OverdueBook = {
              title: book.title,
              dueDate: new Date(borrow.dueDate).toLocaleDateString(),
              daysOverdue,
              fine
            };

            if (!overdueByStudent.has(borrow.studentId)) {
              overdueByStudent.set(borrow.studentId, []);
            }
            overdueByStudent.get(borrow.studentId)?.push(overdueBook);
            console.log(`Added overdue book "${book.title}" for student ${borrow.studentId}, ${daysOverdue} days overdue`);
          } else {
            console.log(`Book not found for ID ${borrow.bookId}`);
          }
        } else {
          console.log(`Book in borrow record ${borrowId} is not overdue. Due date: ${dueDate.toISOString()}`);
        }
      });

      // Create final data structure
      const overdueStudents: StudentOverdue[] = [];

      overdueByStudent.forEach((books, studentId) => {
        // Try to find student by studentId first, then by the key itself
        let student: StudentData | undefined = students[studentId];
        
        if (!student) {
          // If not found by key, search through all students
          const studentsArray = Object.values(students) as StudentData[];
          student = studentsArray.find(s => s.studentId === studentId || s.id === studentId);
        }
        
        if (student) {
          overdueStudents.push({
            studentId: student.studentId || student.id || studentId,
            name: student.name,
            email: student.email,
            books
          });
          console.log(`Added student ${student.name} (${student.studentId || student.id || studentId}) with ${books.length} overdue books`);
        } else {
          console.log(`Could not find student data for ID ${studentId}`);
        }
      });

      console.log(`Found ${overdueStudents.length} students with overdue books`);
      console.log('Overdue students data:', overdueStudents);
      setOverdueData(overdueStudents);
    } catch (error) {
      console.error('Error loading overdue data:', error);
      setError('Failed to load overdue data');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedStudents(overdueData.map(student => student.studentId));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleSendNotifications = async () => {
    if (selectedStudents.length === 0) return;
    
    setSending(true);
    let successCount = 0;
    let failedCount = 0;
    
    try {
      // Process each selected student
      for (const studentId of selectedStudents) {
        const student = overdueData.find(d => d.studentId === studentId);
        if (!student || !student.email) {
          failedCount++;
          continue;
        }

        // Create the message for this student
        const booksMessage = student.books
          .map(book => `- ${book.title} (Due: ${book.dueDate}, Days Overdue: ${book.daysOverdue}, Fine: ₱${book.fine.toFixed(2)})`)
          .join('\n');

        const totalFine = student.books.reduce((sum, book) => sum + book.fine, 0);
        
        const message = `${emailTemplate.replace('{studentName}', student.name)}

Your Overdue Books:
${booksMessage}

Total Fine: ₱${totalFine.toFixed(2)}

Please return these items as soon as possible to avoid additional fines.`;

        try {
          // Use the improved sendOverdueNotification function
          const overdueBooks = student.books.map(book => ({
            title: book.title,
            author: 'Unknown Author', // We don't have author in this context
            accessionNumber: 'N/A', // We don't have accession number in this context
            dueDate: book.dueDate,
            daysOverdue: book.daysOverdue,
            fine: book.fine
          }));
          
          await sendOverdueNotification(
            student.email,
            student.name,
            overdueBooks,
            totalFine
          );
          successCount++;
        } catch (error) {
          console.error(`Failed to send email to ${student.email}:`, error);
          failedCount++;
        }
      }

      // Update the send result
      setSendResult({ success: successCount, failed: failedCount });
      
      // Show success message
      setSnackbarMessage(`Successfully sent ${successCount} notifications${failedCount > 0 ? `, ${failedCount} failed` : ''}`);
      setSnackbarSeverity(failedCount > 0 ? 'error' : 'success');
      setSnackbarOpen(true);
      
      // Create system notifications
      createBulkOverdueNotifications(
        overdueData.filter(student => selectedStudents.includes(student.studentId))
      );
      
    } catch (error) {
      console.error('Error sending notifications:', error);
      setSnackbarMessage('Failed to send notifications');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setSending(false);
    }
  };

  // Open notification dialog
  const handleOpenNotification = () => {
    setNotificationOpen(true);
  };
  
  // Close notification dialog
  const handleCloseNotification = () => {
    setNotificationOpen(false);
    setSendResult(null);
  };

  // Show snackbar message
  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };
  
  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Create test overdue data
  const createTestOverdueData = async () => {
    try {
      setLoading(true);
      
      // First, get existing students and books
      const studentsRef = ref(database, 'students');
      const studentsSnapshot = await get(studentsRef);
      const students = studentsSnapshot.exists() ? studentsSnapshot.val() : {};
      
      const booksRef = ref(database, 'books');
      const booksSnapshot = await get(booksRef);
      const books = booksSnapshot.exists() ? booksSnapshot.val() : {};
      
      if (Object.keys(students).length === 0) {
        setError('No students found. Please add students first.');
        return;
      }
      
      if (Object.keys(books).length === 0) {
        setError('No books found. Please add books first.');
        return;
      }
      
      // Get first student and first book
      const studentIds = Object.keys(students);
      const bookIds = Object.keys(books);
      const studentId = studentIds[0];
      const bookId = bookIds[0];
      
      // Create a borrow record with a past due date
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5); // 5 days ago
      
      const borrowData = {
        studentId: studentId,
        bookId: bookId,
        borrowDate: new Date().toISOString(),
        dueDate: pastDate.toISOString(), // Past date to make it overdue
        status: 'borrowed',
        returnDate: null
      };
      
      const borrowsRef = ref(database, 'borrows');
      await push(borrowsRef, borrowData);
      
      setSuccess('Test overdue data created successfully!');
      setSnackbarMessage('Test overdue data created successfully!');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      
      // Reload the data
      await loadOverdueData();
      
    } catch (error) {
      console.error('Error creating test data:', error);
      setError('Failed to create test data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">
          Overdue Books Notifications
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadOverdueData}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {sendResult && (
        <Alert severity={sendResult.failed > 0 ? 'warning' : 'success'} sx={{ mb: 2 }}>
          Notifications processed: {sendResult.success} successful, {sendResult.failed} failed
        </Alert>
      )}

      {overdueData.length > 0 ? (
        <>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSendNotifications}
              disabled={selectedStudents.length === 0 || loading}
            >
              Process Notifications ({selectedStudents.length})
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedStudents.length === overdueData.length}
                      indeterminate={selectedStudents.length > 0 && selectedStudents.length < overdueData.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>Student</TableCell>
                  <TableCell>Overdue Books</TableCell>
                  <TableCell>Total Fine</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {overdueData.map((student) => (
                  <TableRow key={student.studentId}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedStudents.includes(student.studentId)}
                        onChange={() => handleSelectStudent(student.studentId)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">{student.name}</Typography>
                      <Typography variant="body2" color="textSecondary">ID: {student.studentId}</Typography>
                    </TableCell>
                    <TableCell>
                      {student.books.map((book, index) => (
                        <Box key={index} sx={{ mb: 1 }}>
                          <Typography variant="body2">
                            {book.title}
                          </Typography>
                          <Typography variant="caption" color="error">
                            {book.daysOverdue} days overdue (Due: {book.dueDate})
                          </Typography>
                        </Box>
                      ))}
                    </TableCell>
                    <TableCell>
                      ₱{student.books.reduce((sum, book) => sum + book.fine, 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            No overdue books found
          </Alert>
          <Button
            variant="outlined"
            color="primary"
            onClick={createTestOverdueData}
            sx={{ mb: 2 }}
          >
            Create Test Overdue Data
          </Button>
        </Box>
      )}

      {/* Notification Dialog */}
      <Dialog
        open={notificationOpen}
        onClose={handleCloseNotification}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Send Overdue Book Notifications
          <IconButton
            onClick={handleCloseNotification}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {sendResult ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Notifications Sent
              </Typography>
              <Typography variant="body1">
                Successfully sent: {sendResult.success}
              </Typography>
              {sendResult.failed > 0 && (
                <Typography variant="body1" color="error">
                  Failed: {sendResult.failed}
                </Typography>
              )}
              <Button
                variant="contained"
                onClick={handleCloseNotification}
                sx={{ mt: 2 }}
              >
                Close
              </Button>
            </Box>
          ) : (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Selected Students: {selectedStudents.length}
                </Typography>
                
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  {selectedStudents.map(studentId => {
                    const student = overdueData.find(d => d.studentId === studentId);
                    if (!student) return null;
                    return (
                      <Grid item xs={12} sm={6} md={4} key={student.studentId}>
                        <Card variant="outlined" sx={{ height: '100%' }}>
                          <CardContent>
                            <Typography variant="subtitle1">{student.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Overdue Books: {student.books.length}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle1" gutterBottom>
                  Email Settings
                </Typography>
                
                <TextField
                  margin="dense"
                  label="Subject"
                  fullWidth
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  sx={{ mb: 2 }}
                />
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Custom message (optional):
                </Typography>
                
                <TextField
                  margin="dense"
                  multiline
                  rows={6}
                  fullWidth
                  placeholder="Add a custom message to include in the email"
                  value={emailTemplate}
                  onChange={(e) => setEmailTemplate(e.target.value)}
                  sx={{ mb: 2 }}
                />
              </Box>
            </>
          )}
        </DialogContent>
        
        {!sendResult && (
          <DialogActions>
            <Button onClick={handleCloseNotification}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={sending ? <CircularProgress size={16} /> : <SendIcon />}
              onClick={handleSendNotifications}
              disabled={sending || selectedStudents.length === 0}
            >
              {sending ? 'Sending...' : 'Send Notifications'}
            </Button>
          </DialogActions>
        )}
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OverdueNotifications; 