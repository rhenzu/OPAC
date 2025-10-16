import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  ArrowBack as ArrowBackIcon,
  RemoveRedEye as ViewIcon,
  Book as BookIcon,
  AttachMoney as MoneyIcon,
  Refresh as RefreshIcon,
  CalendarToday as CalendarIcon,
  Email as EmailIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { ref, get, update, remove } from 'firebase/database';
import { database } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { calculateAndUpdateFines } from '../../utils/fineUtils';
import { sendOverdueNotification } from '../../utils/mailer';

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  coverUrl?: string;
  accessionNumber?: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  grade?: string;
  section?: string;
  studentId?: string;
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
  student?: Student;
}

const BorrowedBooks: React.FC = () => {
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<BorrowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<BorrowRecord | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<BorrowRecord | null>(null);

  const navigate = useNavigate();

  const calculateDaysOverdue = useCallback((dueDate: string, returnDate?: string) => {
    const today = new Date();
    const due = new Date(dueDate);

    if (returnDate) return 0;
    if (today <= due) return 0;

    const diffTime = Math.abs(today.getTime() - due.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, []);

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [borrowsSnapshot, studentsSnapshot, booksSnapshot] = await Promise.all([
        get(ref(database, 'borrows')),
        get(ref(database, 'students')),
        get(ref(database, 'books')),
      ]);

      if (!borrowsSnapshot.exists()) {
        setRecords([]);
        setFilteredRecords([]);
        setLoading(false);
        return;
      }

      const borrowsData = borrowsSnapshot.val();
      const studentsData = studentsSnapshot.exists() ? studentsSnapshot.val() : {};
      const booksData = booksSnapshot.exists() ? booksSnapshot.val() : {};

      let borrowRecords: BorrowRecord[] = [];
      const updates: Record<string, any> = {};
      const today = new Date();

      for (const id in borrowsData) {
        const record = borrowsData[id];
        if (record.status === 'returned') continue;

        const dueDate = new Date(record.dueDate);
        const isOverdue = !record.returnDate && today.getTime() > dueDate.getTime();

        // CORRECTED ORDER: Spread first, then set id
        let student: Student | null = studentsData[record.studentId]
          ? { ...studentsData[record.studentId], id: record.studentId }
          : null;

        if (!student) {
          const studentsArray: Student[] = Object.values(studentsData);
          const foundStudent = studentsArray.find(s => s.studentId === record.studentId || s.id === record.studentId);

          // CORRECTED ORDER: Spread first, then set id
          student = foundStudent ? { ...foundStudent, id: record.studentId } : {
            id: record.studentId,
            name: 'Unknown Student',
            email: 'unknown@example.com',
            studentId: record.studentId,
          };
        }

        const book: Book | null = booksData[record.bookId]
          ? { id: record.bookId, ...booksData[record.bookId] }
          : {
              id: record.bookId,
              title: 'Unknown Book',
              author: 'Unknown Author',
              isbn: 'N/A',
              accessionNumber: record.bookId,
            };

        if (isOverdue && record.status !== 'overdue') {
          updates[`borrows/${id}/status`] = 'overdue';
          record.status = 'overdue';
        }
        
        const fullRecord: BorrowRecord = {
          id,
          ...record,
          student,
          book,
          status: isOverdue ? 'overdue' : record.status,
        };
        borrowRecords.push(fullRecord);
      }

      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates);
      }

      borrowRecords.sort((a, b) => new Date(b.borrowDate).getTime() - new Date(a.borrowDate).getTime());
      setRecords(borrowRecords);
      setFilteredRecords(borrowRecords);
    } catch (error) {
      console.error('Error loading borrowed books:', error);
      setError('Failed to load borrowed books. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
    const updateFines = async () => {
      try {
        await calculateAndUpdateFines();
      } catch (error) {
        console.error('Error calculating fines:', error);
      }
    };
    updateFines();
  }, [loadRecords]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRecords(records);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = records.filter(
      (record) =>
        record.student?.name.toLowerCase().includes(query) ||
        record.student?.id.toLowerCase().includes(query) ||
        record.book?.title.toLowerCase().includes(query) ||
        record.book?.author.toLowerCase().includes(query) ||
        record.book?.isbn.toLowerCase().includes(query)
    );
    setFilteredRecords(filtered);
  }, [searchQuery, records]);

  const handleOpenDetails = (record: BorrowRecord) => {
    setSelectedRecord(record);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedRecord(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'borrowed': return 'primary';
      case 'returned': return 'success';
      case 'overdue': return 'error';
      default: return 'default';
    }
  };
  
  const handleOpenDeleteDialog = (record: BorrowRecord) => {
    setRecordToDelete(record);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setRecordToDelete(null);
    setDeleteDialogOpen(false);
  };

  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;

    try {
      const recordRef = ref(database, `borrows/${recordToDelete.id}`);
      await remove(recordRef);
      
      setRecords(prev => prev.filter(r => r.id !== recordToDelete.id));

      const successAlert = document.createElement('div');
      successAlert.innerHTML = `<div style="position: fixed; top: 20px; right: 20px; background-color: #4caf50; color: white; padding: 16px; border-radius: 4px; z-index: 9999;">Record deleted successfully.</div>`;
      document.body.appendChild(successAlert);
      setTimeout(() => successAlert.remove(), 3000);

    } catch (err) {
      console.error("Error deleting record:", err);
      setError("Failed to delete the borrow record. Please try again.");
    } finally {
      handleCloseDeleteDialog();
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 2, mb: 4 }}>
      <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={() => navigate('/admin/borrow-return')} sx={{ mr: 2 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5" component="h2" fontWeight="bold" color="primary">
              Currently Borrowed Books
            </Typography>
          </Box>
        </Box>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search by student name, ID, book title, author or ISBN..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 3 }}
        />
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : filteredRecords.length === 0 ? (
          <Alert severity="info">No borrowed books found.</Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Student</TableCell>
                  <TableCell>Book</TableCell>
                  <TableCell>Borrow Date</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Days Overdue</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRecords.map((record) => {
                  const daysOverdue = calculateDaysOverdue(record.dueDate);
                  return (
                    <TableRow key={record.id}>
                      <TableCell>
                        <Typography variant="body1" fontWeight="medium">{record.student?.name || 'Unknown'}</Typography>
                        <Typography variant="body2" color="text.secondary">ID: {record.student?.studentId || 'N/A'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body1" fontWeight="medium">{record.book?.title || 'Unknown'}</Typography>
                        <Typography variant="body2" color="text.secondary">{record.book?.author || 'Unknown'}</Typography>
                      </TableCell>
                      <TableCell>{formatDate(record.borrowDate)}</TableCell>
                      <TableCell>{formatDate(record.dueDate)}</TableCell>
                      <TableCell>
                        <Chip
                          label={record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          color={getStatusColor(record.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        {record.status === 'overdue' ? (
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                            {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'}
                          </Typography>
                        ) : ('-')}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton size="small" color="primary" onClick={() => handleOpenDetails(record)}>
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Record">
                          <IconButton size="small" color="error" onClick={() => handleOpenDeleteDialog(record)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
      <Dialog open={detailsOpen} onClose={handleCloseDetails} maxWidth="sm" fullWidth>
        <DialogTitle>Borrow Details</DialogTitle>
        <DialogContent dividers>
          {selectedRecord && (
            <Box>
                <Typography variant="subtitle1" fontWeight="bold">Book Details</Typography>
                <Typography><strong>Title:</strong> {selectedRecord.book?.title || 'N/A'}</Typography>
                <Typography><strong>Author:</strong> {selectedRecord.book?.author || 'N/A'}</Typography>
                <Typography variant="subtitle1" fontWeight="bold" sx={{mt: 2}}>Student Details</Typography>
                <Typography><strong>Name:</strong> {selectedRecord.student?.name || 'N/A'}</Typography>
                <Typography><strong>ID:</strong> {selectedRecord.student?.studentId || 'N/A'}</Typography>
                <Typography variant="subtitle1" fontWeight="bold" sx={{mt: 2}}>Borrowing Info</Typography>
                <Typography><strong>Borrow Date:</strong> {formatDate(selectedRecord.borrowDate)}</Typography>
                <Typography><strong>Due Date:</strong> {formatDate(selectedRecord.dueDate)}</Typography>
                {selectedRecord.status === 'overdue' && (
                    <Typography color="error">
                        This book is {calculateDaysOverdue(selectedRecord.dueDate)} days overdue.
                    </Typography>
                )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
            <Typography>
                Are you sure you want to permanently delete the borrow record for 
                <strong> "{recordToDelete?.book?.title || 'this book'}"</strong> borrowed by 
                <strong> {recordToDelete?.student?.name || 'this student'}</strong>?
            </Typography>
            <Typography color="error" sx={{ mt: 2, fontWeight: 'bold' }}>
                This action cannot be undone.
            </Typography>
        </DialogContent>
        <DialogActions>
            <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
            <Button onClick={handleDeleteRecord} color="error" variant="contained">
                Delete
            </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BorrowedBooks;