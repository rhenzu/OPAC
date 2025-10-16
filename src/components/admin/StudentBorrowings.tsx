import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
  Alert,
  Chip,
  Button,
  IconButton,
  Divider,
  Avatar,
  Tooltip,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import {
  Search as SearchIcon,
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon,
  Book as BookIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Notifications as NotificationsIcon,
  Email as EmailIcon,
  NotificationImportant as NotificationImportantIcon,
} from '@mui/icons-material';
import { ref, get, update } from 'firebase/database';
import { database } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { sendOverdueNotification } from '../../utils/mailer';

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  coverUrl?: string;
}

interface BorrowRecord {
  id: string;
  bookId: string;
  studentId: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'borrowed' | 'returned' | 'overdue';
  book?: Book;
}

interface Student {
  id: string;
  name: string;
  email: string;
  grade: string;
  section: string;
  borrowedBooks: BorrowRecord[];
  hasOverdue: boolean;
}

interface BorrowData {
  bookId: string;
  studentId: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'borrowed' | 'returned' | 'overdue';
}

interface BookData {
  title: string;
  author: string;
  isbn: string;
  coverUrl?: string;
  [key: string]: any; // For other book properties we might not be using
}

interface StudentData {
  name: string;
  email: string;
  grade: string;
  section: string;
  [key: string]: any; // For other student properties we might not be using
}

interface NotificationLog {
  studentId: string;
  studentName: string;
  studentEmail: string;
  date: string;
  books: Array<{
    title: string;
    dueDate: string;
    daysOverdue: number;
    fine: number;
  }>;
  totalFine: number;
  status: 'success' | 'failed';
  error?: string;
}

const StudentBorrowings: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationStatus, setNotificationStatus] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [sendingNotification, setSendingNotification] = useState<string | null>(null);
  const [selectedStudentsForBulk, setSelectedStudentsForBulk] = useState<string[]>([]);
  const [showBulkConfirmDialog, setShowBulkConfirmDialog] = useState(false);
  const [sendingBulkNotifications, setSendingBulkNotifications] = useState(false);
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const calculateOverdue = useCallback((dueDate: string, returnDate?: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    
    if (returnDate) return false;
    return today > due;
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'borrowed':
        return 'primary';
      case 'returned':
        return 'success';
      case 'overdue':
        return 'error';
      default:
        return 'default';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const loadStudentBorrowings = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch all students
      const studentsRef = ref(database, 'students');
      const studentsSnapshot = await get(studentsRef);
      
      if (!studentsSnapshot.exists()) {
        setStudents([]);
        setFilteredStudents([]);
        setLoading(false);
        return;
      }
      
      const studentsData = studentsSnapshot.val() as Record<string, StudentData>;
      
      // Fetch all borrows
      const borrowsRef = ref(database, 'borrows');
      const borrowsSnapshot = await get(borrowsRef);
      
      let borrowsData: Record<string, BorrowData> = {};
      if (borrowsSnapshot.exists()) {
        borrowsData = borrowsSnapshot.val();
      }
      
      // Fetch all books
      const booksRef = ref(database, 'books');
      const booksSnapshot = await get(booksRef);
      
      let booksData: Record<string, BookData> = {};
      if (booksSnapshot.exists()) {
        booksData = booksSnapshot.val();
      }
      
      // Build student list with their borrowed books
      const studentsList: Student[] = [];
      
      for (const studentId in studentsData) {
        const student = studentsData[studentId];
        
        // Find all borrows for this student
        const studentBorrows: BorrowRecord[] = [];
        let hasOverdueBooks = false;
        
        for (const borrowId in borrowsData) {
          const borrow = borrowsData[borrowId];
          
          if (borrow.studentId === studentId && borrow.status !== 'returned') {
            // Get book details
            const book = booksData[borrow.bookId] || null;
            
            // Check if overdue
            const isOverdue = calculateOverdue(borrow.dueDate);
            if (isOverdue) {
              hasOverdueBooks = true;
            }
            
            studentBorrows.push({
              id: borrowId,
              ...borrow,
              status: isOverdue ? 'overdue' : borrow.status,
              book: book ? { id: borrow.bookId, ...book } : undefined,
            });
          }
        }
        
        // Only add students who have borrowed books
        if (studentBorrows.length > 0) {
          studentsList.push({
            id: studentId,
            ...student,
            borrowedBooks: studentBorrows,
            hasOverdue: hasOverdueBooks,
          });
        }
      }
      
      // Sort students alphabetically
      studentsList.sort((a, b) => a.name.localeCompare(b.name));
      
      setStudents(studentsList);
      setFilteredStudents(studentsList);
    } catch (error) {
      console.error('Error loading student borrowings:', error);
      setError('Failed to load student borrowing data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [calculateOverdue]);

  useEffect(() => {
    loadStudentBorrowings();
  }, [loadStudentBorrowings]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStudents(students);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = students.filter(student => 
      student.name.toLowerCase().includes(query) ||
      student.id.toLowerCase().includes(query) ||
      student.grade.toLowerCase().includes(query) ||
      student.section.toLowerCase().includes(query) ||
      student.borrowedBooks.some(record => 
        record.book?.title.toLowerCase().includes(query) ||
        record.book?.author.toLowerCase().includes(query)
      )
    );
    
    setFilteredStudents(filtered);
  }, [searchQuery, students]);

  // Calculate fine for overdue books
  const calculateFine = (dueDate: string): number => {
    const today = new Date();
    const due = new Date(dueDate);
    
    if (today <= due) return 0;
    
    // Calculate days overdue
    const diffTime = Math.abs(today.getTime() - due.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Fine calculation: ₱5 per day
    return diffDays * 5;
  };

  // Get students with overdue books
  const overdueStudents = students.filter(student => student.hasOverdue);

  // Handle bulk notification confirmation dialog
  const handleOpenBulkDialog = () => {
    // Only show dialog if there are students with overdue books
    if (overdueStudents.length === 0) {
      setNotificationStatus({
        open: true,
        message: 'No students with overdue books to notify',
        severity: 'info',
      });
      return;
    }
    
    setSelectedStudentsForBulk(overdueStudents.map(student => student.id));
    setShowBulkConfirmDialog(true);
  };

  const handleCloseBulkDialog = () => {
    setShowBulkConfirmDialog(false);
  };

  // Handle sending bulk notifications
  const handleSendBulkNotifications = async () => {
    if (selectedStudentsForBulk.length === 0) {
      handleCloseBulkDialog();
      return;
    }

    try {
      setSendingBulkNotifications(true);
      
      // Create an array to hold all notification results
      const notificationLogs: NotificationLog[] = [];
      
      // Prepare notification records for storage
      const overdueNotificationsRef = ref(database, 'overdueNotifications');
      const notificationsToUpdate: Record<string, NotificationLog> = {};
      
      // Send notifications to each selected student
      await Promise.all(
        overdueStudents
          .filter(student => selectedStudentsForBulk.includes(student.id))
          .map(async (student) => {
            try {
              // Prepare overdue books data with fine calculation
              const overdueBooks = student.borrowedBooks
                .filter(record => record.status === 'overdue')
                .map(record => {
                  const daysOverdue = Math.floor(
                    (new Date().getTime() - new Date(record.dueDate).getTime()) / (1000 * 60 * 60 * 24)
                  );
                  const fine = calculateFine(record.dueDate);
                  
                  return {
                    title: record.book?.title || 'Unknown Book',
                    author: record.book?.author || 'Unknown Author',
                    accessionNumber: record.bookId,
                    dueDate: record.dueDate,
                    daysOverdue,
                    fine
                  };
                });
              
              // Calculate total fine
              const totalFine = overdueBooks.reduce((sum, book) => sum + book.fine, 0);
              
              // Send notification
              await sendOverdueNotification(
                student.email,
                student.name,
                overdueBooks,
                totalFine
              );
              
              // Create notification log
              const logEntry: NotificationLog = {
                studentId: student.id,
                studentName: student.name,
                studentEmail: student.email,
                date: new Date().toISOString(),
                books: overdueBooks.map(book => ({
                  title: book.title,
                  dueDate: book.dueDate,
                  daysOverdue: book.daysOverdue,
                  fine: book.fine
                })),
                totalFine,
                status: 'success'
              };
              
              notificationLogs.push(logEntry);
              notificationsToUpdate[`${Date.now()}_${student.id}`] = logEntry;
              
            } catch (error) {
              console.error(`Failed to send notification to ${student.name}:`, error);
              
              // Create failed notification log
              const logEntry: NotificationLog = {
                studentId: student.id,
                studentName: student.name,
                studentEmail: student.email,
                date: new Date().toISOString(),
                books: student.borrowedBooks
                  .filter(record => record.status === 'overdue')
                  .map(record => ({
                    title: record.book?.title || 'Unknown Book',
                    dueDate: record.dueDate,
                    daysOverdue: Math.floor(
                      (new Date().getTime() - new Date(record.dueDate).getTime()) / (1000 * 60 * 60 * 24)
                    ),
                    fine: calculateFine(record.dueDate)
                  })),
                totalFine: student.borrowedBooks
                  .filter(record => record.status === 'overdue')
                  .reduce((sum, record) => sum + calculateFine(record.dueDate), 0),
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error'
              };
              
              notificationLogs.push(logEntry);
              notificationsToUpdate[`${Date.now()}_${student.id}`] = logEntry;
            }
          })
      );
      
      // Save notification logs to database
      await update(overdueNotificationsRef, notificationsToUpdate);
      
      // Calculate results
      const successCount = notificationLogs.filter(log => log.status === 'success').length;
      const failureCount = notificationLogs.filter(log => log.status === 'failed').length;
      
      // Show result notification
      setNotificationStatus({
        open: true,
        message: `Notifications sent: ${successCount} successful, ${failureCount} failed.`,
        severity: failureCount > 0 ? 'warning' : 'success',
      });
      
    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      setNotificationStatus({
        open: true,
        message: `Failed to send notifications: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      });
    } finally {
      setSendingBulkNotifications(false);
      handleCloseBulkDialog();
    }
  };

  // Enhanced notification function with logging to database
  const handleSendOverdueNotification = async (student: Student, event?: React.MouseEvent) => {
    // Prevent accordion from toggling when clicking the button
    if (event) {
      event.stopPropagation();
    }
    
    // Only send for students with overdue books
    if (!student.hasOverdue) return;
    
    try {
      setSendingNotification(student.id);
      
      // Prepare overdue books data with fine calculation
      const overdueBooks = student.borrowedBooks
        .filter(record => record.status === 'overdue')
        .map(record => {
          const daysOverdue = Math.floor(
            (new Date().getTime() - new Date(record.dueDate).getTime()) / (1000 * 60 * 60 * 24)
          );
          const fine = calculateFine(record.dueDate);
          
          return {
            title: record.book?.title || 'Unknown Book',
            author: record.book?.author || 'Unknown Author',
            accessionNumber: record.bookId,
            dueDate: record.dueDate,
            daysOverdue,
            fine
          };
        });
      
      // Calculate total fine
      const totalFine = overdueBooks.reduce((sum, book) => sum + book.fine, 0);
      
      // Send notification
      await sendOverdueNotification(
        student.email,
        student.name,
        overdueBooks,
        totalFine
      );
      
      // Log successful notification to database
      const overdueNotificationsRef = ref(database, `overdueNotifications/${Date.now()}_${student.id}`);
      await update(overdueNotificationsRef, {
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        date: new Date().toISOString(),
        books: overdueBooks.map(book => ({
          title: book.title,
          dueDate: book.dueDate,
          daysOverdue: book.daysOverdue,
          fine: book.fine
        })),
        totalFine,
        status: 'success'
      });
      
      setNotificationStatus({
        open: true,
        message: `Overdue notification sent to ${student.name}. Total fine: ₱${totalFine.toFixed(2)}`,
        severity: 'success',
      });
    } catch (error) {
      console.error('Failed to send overdue notification:', error);
      
      // Log failed notification to database
      try {
        const overdueNotificationsRef = ref(database, `overdueNotifications/${Date.now()}_${student.id}`);
        await update(overdueNotificationsRef, {
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          date: new Date().toISOString(),
          books: student.borrowedBooks
            .filter(record => record.status === 'overdue')
            .map(record => ({
              title: record.book?.title || 'Unknown Book',
              dueDate: record.dueDate,
              daysOverdue: Math.floor(
                (new Date().getTime() - new Date(record.dueDate).getTime()) / (1000 * 60 * 60 * 24)
              ),
              fine: calculateFine(record.dueDate)
            })),
          totalFine: student.borrowedBooks
            .filter(record => record.status === 'overdue')
            .reduce((sum, record) => sum + calculateFine(record.dueDate), 0),
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      } catch (logError) {
        console.error('Failed to log notification error:', logError);
      }
      
      setNotificationStatus({
        open: true,
        message: `Failed to send notification to ${student.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      });
    } finally {
      setSendingNotification(null);
    }
  };

  // Handle closing snackbar
  const handleCloseSnackbar = () => {
    setNotificationStatus(prev => ({ ...prev, open: false }));
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton 
              onClick={() => navigate('/admin/borrow-return')}
              sx={{ mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5" component="h2">
              Students with Borrowed Books
            </Typography>
          </Box>
          
          {/* Add a button for bulk notifications */}
          {overdueStudents.length > 0 && (
            <Button
              variant="contained"
              color="warning"
              startIcon={<NotificationImportantIcon />}
              onClick={handleOpenBulkDialog}
              disabled={loading || sendingBulkNotifications}
            >
              {sendingBulkNotifications ? (
                <>
                  <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                  Sending Notifications...
                </>
              ) : (
                `Notify All Overdue (${overdueStudents.length})`
              )}
            </Button>
          )}
        </Box>

        <Box sx={{ mb: 2 }}>
          {overdueStudents.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body1" fontWeight="medium">
                {overdueStudents.length} student{overdueStudents.length !== 1 && 's'} with overdue books
              </Typography>
              <Typography variant="body2">
                Send notifications to remind students about their overdue books and applicable fines.
              </Typography>
            </Alert>
          )}

          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search by student name, ID, grade, section or book details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : filteredStudents.length === 0 ? (
          <Alert severity="info">No students with borrowed books found.</Alert>
        ) : (
          <Box>
            {filteredStudents.map(student => (
              <Accordion key={student.id} sx={{ mb: 1 }}>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    '&.Mui-expanded': {
                      minHeight: '48px',
                    },
                    '& .MuiAccordionSummary-content.Mui-expanded': {
                      margin: '12px 0',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Avatar 
                      sx={{ 
                        bgcolor: student.hasOverdue ? 'error.main' : 'primary.main',
                        mr: 2 
                      }}
                    >
                      {getInitials(student.name)}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {student.name}
                        {student.hasOverdue && (
                          <WarningIcon sx={{ ml: 1, color: 'error.main', fontSize: 18, verticalAlign: 'text-bottom' }} />
                        )}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ID: {student.id} • Grade: {student.grade}-{student.section} • Books: {student.borrowedBooks.length}
                      </Typography>
                    </Box>
                    <Chip 
                      label={student.hasOverdue ? 'Has Overdue' : 'Active'} 
                      color={student.hasOverdue ? 'error' : 'success'} 
                      size="small" 
                      sx={{ ml: 2 }}
                    />
                    {student.hasOverdue && (
                      <Tooltip title="Send overdue notification">
                        <IconButton 
                          color="warning"
                          onClick={(e) => handleSendOverdueNotification(student, e)}
                          disabled={sendingNotification === student.id}
                          sx={{ ml: 1 }}
                        >
                          {sendingNotification === student.id ? (
                            <CircularProgress size={24} color="warning" />
                          ) : (
                            <EmailIcon />
                          )}
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <Divider sx={{ mb: 2 }} />
                  {student.hasOverdue && (
                    <Box sx={{ mb: 2 }}>
                      <Button
                        variant="outlined"
                        color="warning"
                        startIcon={<NotificationsIcon />}
                        onClick={() => handleSendOverdueNotification(student)}
                        disabled={sendingNotification === student.id}
                        sx={{ mb: 2 }}
                      >
                        {sendingNotification === student.id ? 'Sending Notification...' : 'Notify About Overdue Books'}
                      </Button>
                      
                      {/* Add overdue summary */}
                      <Box sx={{ mt: 2, mb: 3, p: 2, bgcolor: 'error.lightest', borderRadius: 1 }}>
                        <Typography variant="subtitle1" color="error.main" fontWeight="bold" gutterBottom>
                          Overdue Summary
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {student.borrowedBooks
                            .filter(record => record.status === 'overdue')
                            .map(record => {
                              const daysOverdue = Math.floor(
                                (new Date().getTime() - new Date(record.dueDate).getTime()) / (1000 * 60 * 60 * 24)
                              );
                              const fine = calculateFine(record.dueDate);
                              
                              return (
                                <Box key={record.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="body2">
                                    {record.book?.title || 'Unknown Book'} ({formatDate(record.dueDate)})
                                  </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Typography variant="body2" color="error.main" fontWeight="medium">
                                      {daysOverdue} days overdue • ₱{fine.toFixed(2)}
                                    </Typography>
                                  </Box>
                                </Box>
                              );
                            })
                          }
                          <Divider sx={{ my: 1 }} />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body1" fontWeight="bold">
                              Total Fine:
                            </Typography>
                            <Typography variant="body1" color="error.main" fontWeight="bold">
                              ₱{student.borrowedBooks
                                .filter(record => record.status === 'overdue')
                                .reduce((sum, record) => sum + calculateFine(record.dueDate), 0)
                                .toFixed(2)
                              }
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  )}
                  <List disablePadding>
                    {student.borrowedBooks.map(record => (
                      <ListItem
                        key={record.id}
                        sx={{
                          mb: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 1,
                          bgcolor: record.status === 'overdue' ? 'error.lightest' : 'background.paper',
                        }}
                      >
                        <BookIcon sx={{ mr: 2, color: record.status === 'overdue' ? 'error.main' : 'primary.main' }} />
                        <ListItemText
                          primary={
                            <Typography variant="body1" fontWeight="medium">
                              {record.book?.title || 'Unknown Book'}
                            </Typography>
                          }
                          secondary={
                            <>
                              <Typography variant="body2" color="text.secondary" component="span">
                                {record.book?.author || 'Unknown Author'} • 
                              </Typography>
                              <Typography variant="body2" color="text.secondary" component="span">
                                {' Borrowed: '}{formatDate(record.borrowDate)}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                color={record.status === 'overdue' ? 'error.main' : 'text.secondary'} 
                                component="span"
                              >
                                {' • Due: '}{formatDate(record.dueDate)}
                                {record.status === 'overdue' && (
                                  <> • Fine: ₱{calculateFine(record.dueDate).toFixed(2)}</>
                                )}
                              </Typography>
                            </>
                          }
                        />
                        <ListItemSecondaryAction>
                          <Chip
                            label={record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                            color={getStatusColor(record.status)}
                            size="small"
                            sx={{ mr: 1 }}
                          />
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            onClick={() => navigate('/admin/borrow-return', { state: { returnBook: record } })}
                          >
                            Return
                          </Button>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}
      </Paper>

      {/* Notification snackbar */}
      <Snackbar
        open={notificationStatus.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={notificationStatus.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notificationStatus.message}
        </Alert>
      </Snackbar>

      {/* Bulk notification confirmation dialog */}
      <Dialog
        open={showBulkConfirmDialog}
        onClose={handleCloseBulkDialog}
        aria-labelledby="bulk-notification-dialog-title"
      >
        <DialogTitle id="bulk-notification-dialog-title">
          Send Overdue Notifications
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Send email notifications to {selectedStudentsForBulk.length} student{selectedStudentsForBulk.length !== 1 && 's'} with overdue books? 
            Each student will receive details about their overdue books and applicable fines.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBulkDialog} disabled={sendingBulkNotifications}>
            Cancel
          </Button>
          <Button 
            onClick={handleSendBulkNotifications} 
            color="warning"
            variant="contained"
            disabled={sendingBulkNotifications}
            startIcon={sendingBulkNotifications ? <CircularProgress size={20} /> : <NotificationsIcon />}
          >
            {sendingBulkNotifications ? 'Sending...' : 'Send Notifications'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StudentBorrowings; 