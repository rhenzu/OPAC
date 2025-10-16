import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Container,
  Tabs,
  Tab,
  CardActions,
  Divider,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Input,
  FormHelperText,
  Chip,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
} from '@mui/material';
import { Delete as DeleteIcon, MenuBook as MenuBookIcon, People as PeopleIcon, List as ListIcon, Person as PersonIcon, Add as AddIcon, Clear as ClearIcon, Info as InfoIcon, CheckCircleOutline as CheckCircleOutlineIcon, WarningAmber as WarningAmberIcon, BrokenImage as BrokenImageIcon, AssignmentReturned as AssignmentReturnedIcon, SentimentDissatisfied as SentimentDissatisfiedIcon, CenterFocusStrong as CenterFocusStrongIcon, LibraryBooks as LibraryBooksIcon, ClearAll as ClearAllIcon, LocalLibrary as LocalLibraryIcon, Warning as WarningIcon, Print as PrintIcon, Done as DoneIcon } from '@mui/icons-material';
import { ref, get, set, push, update, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../../firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import ActivityLogger from '../../utils/ActivityLogger';
import { addBorrowingNotification, addFinesNotification } from '../../utils/notificationUtils';
import { calculateAndUpdateFines } from '../../utils/fineUtils';
import { createBorrowingNotification } from '../../utils/emailUtils';
import MoneyIcon from '@mui/icons-material/Money';
import { sendBorrowNotification, sendReturnNotification, sendRegistrationConfirmation } from '../../utils/mailer';

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  status: 'available' | 'borrowed';
  accessionNumber: string;
  barcode: string;
  quantity: number;
  available: number;
}

interface Student {
  id: string;
  name: string;
  course: string;
  studentId: string;
  address: string;
  email: string;
}

interface BorrowRecord {
  bookId: string;
  studentId: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'borrowed' | 'returned' | 'overdue';
  returned: boolean;
  returnCondition?: 'good' | 'bad' | 'damaged';
  studentName?: string;
}

interface LibraryRules {
  borrowDurationDays: number;
  finePerDay: number;
  maxBooksPerStudent: number;
}

interface BookEntry {
  id: string;
  data: Omit<Book, 'id'>;
}

interface BorrowedBook {
  borrowId: string;
  id: string;  // Book ID
  title: string;
  author: string;
  accessionNumber: string;
  dueDate: string;
  borrowDate?: string; // Make borrowDate optional in BorrowedBook
  isbn?: string;
  barcode?: string; 
  status: 'available' | 'borrowed' | 'returned' | 'overdue'; // Add 'returned' | 'overdue'
  quantity?: number;
  available?: number;
  returnCondition?: 'good' | 'bad' | 'damaged';
  studentId: string;
  studentName: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Constants for barcode scanning
const SCANNER_MAX_DELAY = 50; // Max delay between keystrokes for a scanner (milliseconds)
const MIN_BARCODE_LENGTH = 3; // Minimum barcode length to be considered valid

const BorrowReturn: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [tabValue, setTabValue] = useState(0);
  const [bookBarcode, setBookBarcode] = useState('');
  const [studentBarcode, setStudentBarcode] = useState('');
  const [scannedBooks, setScannedBooks] = useState<Book[]>([]);
  const [scannedStudent, setScannedStudent] = useState<Student | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [libraryRules, setLibraryRules] = useState<LibraryRules>({
    borrowDurationDays: 7,
    finePerDay: 5,
    maxBooksPerStudent: 3,
  });
  const [isReturnMode, setIsReturnMode] = useState(false);
  const [borrowedBooks, setBorrowedBooks] = useState<BorrowedBook[]>([]);
  const [selectedBookConditions, setSelectedBookConditions] = useState<Record<string, 'good' | 'bad' | 'damaged'>>({});
  const studentInputRef = useRef<HTMLInputElement>(null);
  const bookInputRef = useRef<HTMLInputElement>(null);
  
  // Add scanner detection state
  const [lastInputTime, setLastInputTime] = useState<number>(0);
  const [isScannerInput, setIsScannerInput] = useState<boolean>(false);
  const scanBuffer = useRef<string>('');

  // Add states for manual book entry
  const [openManualDialog, setOpenManualDialog] = useState(false);
  const [openManualStudentDialog, setOpenManualStudentDialog] = useState(false);
  const [manualBookData, setManualBookData] = useState<{
    title: string;
    author: string;
    accessionNumber: string;
    isbn: string;
  }>({
    title: '',
    author: '',
    accessionNumber: '',
    isbn: ''
  });
  const [manualStudentData, setManualStudentData] = useState<{
    name: string;
    studentId: string;
    course: string;
    address: string;
    email: string;
  }>({
    name: '',
    studentId: '',
    course: '',
    address: '',
    email: ''
  });
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string>('');
  const [lastScannedStudentBarcode, setLastScannedStudentBarcode] = useState<string>('');

  // Add diagnostic state
  const [diagnosticMessage, setDiagnosticMessage] = useState<string>('');
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  // Add a new state to track if a barcode was redirected
  const [redirectedToStudent, setRedirectedToStudent] = useState<boolean>(false);
  const [redirectedToBook, setRedirectedToBook] = useState<boolean>(false);
  
  // Initialize barcode pattern analysis states with defaults
  const [bookPatterns, setBookPatterns] = useState<{
    lengthRange: [number, number];
    hasLetters: boolean;
    commonPrefixes: string[];
  }>({
    lengthRange: [8, 20], // Default for book barcodes
    hasLetters: true,
    commonPrefixes: []
  });
  
  const [studentPatterns, setStudentPatterns] = useState<{
    lengthRange: [number, number];
    hasLetters: boolean;
    commonPrefixes: string[];
  }>({
    lengthRange: [3, 10], // Default for student IDs
    hasLetters: false,
    commonPrefixes: []
  });
  
  // Define CSS keyframes for the animation
  const fadeAnimation = `
    @keyframes fadeBackground {
      0% { background-color: rgba(76, 175, 80, 0.2); }
      100% { background-color: transparent; }
    }
  `;
  
  // Add useEffect to check if student limit is reached
  const [isStudentBorrowLimitReached, setIsStudentBorrowLimitReached] = useState<boolean>(false);
  
  // Add initialization effect at component mount
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        setLoading(true);
        
        // Load library rules
        await loadLibraryRules();
        
        // Analyze barcode patterns from the database
        await analyzeAndLearnBarcodePatterns();
        
        console.log("Component initialization complete");
        setDiagnosticMessage("Barcode scanner system initialized successfully.");
      } catch (error) {
        console.error("Error initializing component:", error);
        setError("Failed to initialize barcode scanner system. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };
    
    initializeComponent();
  }, []);
  
  // Add these functions after the loadLibraryRules function:

  // Function to analyze and learn barcode patterns from the database
  const analyzeAndLearnBarcodePatterns = async () => {
    try {
      console.log("Analyzing book and student barcode patterns...");
      
      // Analyze book barcodes
      const bookPatternsResult = await analyzeBooksDatabase();
      // Analyze student IDs
      const studentPatternsResult = await analyzeStudentsDatabase();
      
      console.log("Book barcode patterns:", bookPatternsResult);
      console.log("Student ID patterns:", studentPatternsResult);
      
      // Save the patterns to state
      setBookPatterns(bookPatternsResult);
      setStudentPatterns(studentPatternsResult);
      
      return {
        bookPatterns: bookPatternsResult,
        studentPatterns: studentPatternsResult
      };
    } catch (error) {
      console.error("Error analyzing barcode patterns:", error);
      return null;
    }
  };
  
  // Function to analyze book barcodes in the database
  const analyzeBooksDatabase = async (): Promise<{
    lengthRange: [number, number];
    hasLetters: boolean;
    commonPrefixes: string[];
  }> => {
    const booksRef = ref(database, 'books');
    const snapshot = await get(booksRef);
    
    if (!snapshot.exists()) {
      return {
        lengthRange: [10, 20], // Default assumptions
        hasLetters: true,
        commonPrefixes: []
      };
    }
    
    const books = snapshot.val();
    const accessionNumbers = Object.values(books).map((book: any) => book.accessionNumber);
    
    // Find min and max lengths
    const lengths = accessionNumbers.map(num => num?.length || 0).filter(len => len > 0);
    const minLength = Math.min(...lengths);
    const maxLength = Math.max(...lengths);
    
    // Check if barcodes contain letters
    const hasLetters = accessionNumbers.some(num => /[A-Za-z]/.test(num || ''));
    
    // Find common prefixes
    const prefixes = accessionNumbers
      .filter(Boolean)
      .map(num => num.substring(0, 2))
      .reduce((acc: Record<string, number>, prefix) => {
        acc[prefix] = (acc[prefix] || 0) + 1;
        return acc;
      }, {});
    
    // Get the most common prefixes
    const commonPrefixes = Object.entries(prefixes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([prefix]) => prefix);
    
    return {
      lengthRange: [minLength, maxLength],
      hasLetters,
      commonPrefixes
    };
  };
  
  // Function to analyze student IDs in the database
  const analyzeStudentsDatabase = async (): Promise<{
    lengthRange: [number, number];
    hasLetters: boolean;
    commonPrefixes: string[];
  }> => {
    const studentsRef = ref(database, 'students');
    const snapshot = await get(studentsRef);
    
    if (!snapshot.exists()) {
      return {
        lengthRange: [1, 6], // Default assumptions for student IDs
        hasLetters: false,
        commonPrefixes: []
      };
    }
    
    const students = snapshot.val();
    const studentIds = Object.values(students).map((student: any) => student.studentId);
    
    // Find min and max lengths
    const lengths = studentIds.map(id => id?.length || 0).filter(len => len > 0);
    const minLength = Math.min(...lengths);
    const maxLength = Math.max(...lengths);
    
    // Check if IDs contain letters
    const hasLetters = studentIds.some(id => /[A-Za-z]/.test(id || ''));
    
    // Find common prefixes
    const prefixes = studentIds
      .filter(Boolean)
      .map(id => id.substring(0, Math.min(2, id.length)))
      .reduce((acc: Record<string, number>, prefix) => {
        acc[prefix] = (acc[prefix] || 0) + 1;
        return acc;
      }, {});
    
    // Get the most common prefixes
    const commonPrefixes = Object.entries(prefixes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([prefix]) => prefix);
    
    return {
      lengthRange: [minLength, maxLength],
      hasLetters,
      commonPrefixes
    };
  };
  
  // Update the useEffect hook to analyze barcode patterns on component load
  useEffect(() => {
    loadLibraryRules();
    
    // Learn barcode patterns
    analyzeAndLearnBarcodePatterns().then(patterns => {
      console.log("Barcode pattern analysis completed");
    }).catch(error => {
      console.error("Error in barcode pattern analysis:", error);
    });
    
    // Set focus on appropriate input field
    if (isReturnMode) {
      setTimeout(() => {
        if (studentInputRef.current) {
          studentInputRef.current.focus();
        }
      }, 100);
    } else {
      setTimeout(() => {
        if (bookInputRef.current) {
          bookInputRef.current.focus();
        }
      }, 100);
    }
  }, [isReturnMode]);
  
  // Update the isLikelyStudentId function to better detect student IDs
  const isLikelyStudentId = (barcode: string): boolean => {
    if (!barcode || barcode.length === 0) return false;
    
    // Very short numeric IDs are most likely student IDs (like "1", "2", "123", etc.)
    if (barcode.length <= 3 && /^\d+$/.test(barcode)) {
      console.log(`Barcode "${barcode}" identified as student ID (short numeric)`);
      return true;
    }
    
    // Check known student ID patterns
    // If student IDs in your system follow specific patterns, add them here
    if (/^S\d+$/.test(barcode) || /^ST\d+$/.test(barcode)) {
      console.log(`Barcode "${barcode}" identified as student ID (matches pattern S/ST+digits)`);
      return true;
    }
    
    // Simple length-based heuristic
    // Student IDs tend to be shorter than book barcodes
    if (barcode.length <= 5 && /^\d+$/.test(barcode)) {
      console.log(`Barcode "${barcode}" identified as student ID (short digit-only)`);
      return true;
    }
    
    // Known student ID prefixes from your systems
    const knownStudentPrefixes = ['STU', 'ID', '20', '19'];
    if (knownStudentPrefixes.some(prefix => barcode.startsWith(prefix))) {
      console.log(`Barcode "${barcode}" identified as student ID (known prefix)`);
      return true;
    }
    
    // If nothing matched, it's probably not a student ID
    return false;
  };
  
  // Improve the isLikelyBookBarcode function for better detection
  const isLikelyBookBarcode = (barcode: string): boolean => {
    if (!barcode || barcode.length === 0) return false;
    
    // If it's a student ID, it's not a book
    if (isLikelyStudentId(barcode)) {
      return false;
    }
    
    // Book barcodes are typically longer
    if (barcode.length >= 8) {
      console.log(`Barcode "${barcode}" identified as book barcode (long)`);
      return true;
    }
    
    // ISBN pattern (10 or 13 digits, may contain hyphens)
    if (/^(?:\d+-?){3,}\d+$/.test(barcode)) {
      console.log(`Barcode "${barcode}" identified as book barcode (ISBN pattern)`);
      return true;
    }
    
    // Book barcodes often have alphanumeric patterns
    if (/^[A-Z]\d+$/.test(barcode) || /^[A-Z]{2,}\d+$/.test(barcode)) {
      console.log(`Barcode "${barcode}" identified as book barcode (alpha+numeric pattern)`);
      return true;
    }
    
    // Known book barcode prefixes
    const knownBookPrefixes = ['B', 'BK', 'ISBN', 'ACC'];
    if (knownBookPrefixes.some(prefix => barcode.startsWith(prefix))) {
      console.log(`Barcode "${barcode}" identified as book barcode (known prefix)`);
      return true;
    }
    
    // Check if barcode looks like an accession number
    if (/^[A-Z0-9]{2,}-\d+$/.test(barcode)) {
      console.log(`Barcode "${barcode}" identified as book barcode (accession number pattern)`);
      return true;
    }
    
    // If nothing specific matched but it's longer than typical student IDs, assume it's a book
    if (barcode.length > 5) {
      console.log(`Barcode "${barcode}" identified as book barcode (default assumption for longer codes)`);
      return true;
    }
    
    // When in doubt, assume it's not a book
    return false;
  };

  const loadLibraryRules = async () => {
    try {
      const rulesRef = ref(database, 'librarySettings');
      const snapshot = await get(rulesRef);
      if (snapshot.exists()) {
        setLibraryRules(snapshot.val());
      }
    } catch (error) {
      console.error('Error loading library rules:', error);
    }
  };

  // Add fetchStudentBorrowedBooks function
  const fetchStudentBorrowedBooks = async (studentId: string) => {
    try {
      setLoading(true);
      setError('');
      setBorrowedBooks([]);
      
      console.log(`Fetching borrowed books for student ID: ${studentId}`);
      
      // Get all borrow records
      const borrowsRef = ref(database, 'borrows');
      const borrowsSnapshot = await get(borrowsRef);
      
      if (!borrowsSnapshot.exists()) {
        console.log('No borrow records found in database');
        return;
      }
      
      const borrows = borrowsSnapshot.val();
      console.log('All borrows in database:', Object.keys(borrows).length);
      
      // Debug logging - check all borrows to see student IDs 
      console.log('Checking all student IDs in borrows:');
      const studentIds = new Set();
      Object.values(borrows).forEach((borrow: any) => {
        studentIds.add(borrow.studentId);
        if (borrow.studentId === studentId) {
          console.log(`Found matching entry, returned status: ${borrow.returned}`);
        }
      });
      console.log('All student IDs in database:', Array.from(studentIds));
      
      // Filter to get this student's borrowed books that haven't been returned
      const studentBorrows = Object.entries(borrows)
        .filter(([_, borrow]: [string, any]) => {
          // Add more flexible string comparison to handle potential type mismatches
          const studentIdMatch = String(borrow.studentId) === String(studentId);
          const notReturned = borrow.returned === false;
          console.log(`Checking borrow record - ID Match: ${studentIdMatch}, Not Returned: ${notReturned}`);
          return studentIdMatch && notReturned;
        })
        .map(([id, borrow]: [string, any]) => ({
          borrowId: id,
          ...borrow
        }));
      
      console.log(`Found ${studentBorrows.length} borrowed books for student`);
      
      if (studentBorrows.length === 0) {
        return;
      }
      
      // Fetch book details for each borrowed book
      const borrowedBooksDetails: BorrowedBook[] = [];
      
      for (const borrow of studentBorrows) {
        const bookRef = ref(database, `books/${borrow.bookId}`);
        console.log(`Fetching book details for ID: ${borrow.bookId}`);
        const bookSnapshot = await get(bookRef);
        
        if (bookSnapshot.exists()) {
          const bookData = bookSnapshot.val();
          console.log(`Found book: ${bookData.title}`);
          
          // Create borrowed book record
          const borrowedBook: BorrowedBook = {
            borrowId: borrow.borrowId,
            id: borrow.bookId,
            title: bookData.title,
            author: bookData.author,
            accessionNumber: bookData.accessionNumber || '',
            dueDate: borrow.dueDate,
            borrowDate: borrow.borrowDate,
            isbn: bookData.isbn,
            barcode: bookData.barcode,
            status: new Date(borrow.dueDate) < new Date() ? 'overdue' : 'borrowed',
            quantity: bookData.quantity,
            available: bookData.available,
            studentId: borrow.studentId,
            studentName: scannedStudent?.name || '',
          };
          
          borrowedBooksDetails.push(borrowedBook);
        } else {
          console.error(`Book not found with ID: ${borrow.bookId}`);
        }
      }
      
      // Sort by overdue status (overdue first) and then by due date (earliest first)
      borrowedBooksDetails.sort((a, b) => {
        // First check overdue status
        const aIsOverdue = new Date(a.dueDate) < new Date();
        const bIsOverdue = new Date(b.dueDate) < new Date();
        
        if (aIsOverdue && !bIsOverdue) return -1;
        if (!aIsOverdue && bIsOverdue) return 1;
        
        // If both same overdue status, sort by due date
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
      
      // Make sure borrowedBooks state is updated even if empty
      console.log(`Setting ${borrowedBooksDetails.length} borrowed books in state`);
      setBorrowedBooks(borrowedBooksDetails);
      
      if (borrowedBooksDetails.length === 0) {
        console.log('No borrowed books found after checking database');
        setSuccess(`No borrowed books found for ${scannedStudent?.name || studentId}`);
      }
    } catch (error) {
      console.error('Error fetching borrowed books:', error);
      setError(`Failed to fetch borrowed books: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Add checkForOverdueBooks function
  const checkForOverdueBooks = async (studentId: string): Promise<boolean> => {
    try {
      const borrowsRef = ref(database, 'borrows');
      const snapshot = await get(borrowsRef);
      
      if (!snapshot.exists()) {
        return false;
      }
      
      const borrows = snapshot.val();
      const today = new Date();
      
      // Check for any overdue books
      const hasOverdueBooks = Object.values(borrows).some((borrow: any) => {
        return (
          borrow.studentId === studentId &&
          !borrow.returned &&
          new Date(borrow.dueDate) < today
        );
      });
      
      return hasOverdueBooks;
    } catch (error) {
      console.error('Error checking for overdue books:', error);
      return false;
    }
  };

  // Add handleBookBarcodeChange function
  const handleBookBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const currentTime = new Date().getTime();
    
    // Detect if this is likely scanner input (fast typing)
    if (lastInputTime > 0 && currentTime - lastInputTime < SCANNER_MAX_DELAY) {
      setIsScannerInput(true);
      scanBuffer.current += value.slice(bookBarcode.length); // Append new characters
    } else {
      setIsScannerInput(false);
      scanBuffer.current = ''; // Reset buffer for manual input
    }
    
    setLastInputTime(currentTime);
    setBookBarcode(value);
    
    // Clear any errors when user starts typing again
    if (error && (error.includes('Book') || error.includes('book'))) {
      setError('');
    }
    
    // Auto-submit if it's scanner input and we have a terminator character
    // or if the input stopped coming rapidly
    if (isScannerInput && value.length >= MIN_BARCODE_LENGTH) {
      if (value.endsWith('\n') || value.endsWith('\r') || value.endsWith('\t')) {
        // Process the scan automatically without Enter key
        const cleanValue = value.replace(/[\r\n\t]/g, '');
        setBookBarcode(cleanValue);
        
        // Use setTimeout to ensure state is updated before processing
        setTimeout(() => {
          const event = { key: 'Enter' } as React.KeyboardEvent<HTMLInputElement>;
          handleBookScan(event);
        }, 10);
      }
    }
  };

  // Add toggleMode function
  const toggleMode = () => {
    // Toggle between borrow and return modes
    const newMode = !isReturnMode;
    setIsReturnMode(newMode);
    
    // Sync tab value with mode
    setTabValue(newMode ? 1 : 0);
    
    // Clear states when switching modes
    setScannedBooks([]);
    setScannedStudent(null);
    setBorrowedBooks([]);
    setBookBarcode('');
    setStudentBarcode('');
    setError('');
    setSuccess('');
    setSelectedBookConditions({});
    
    // Focus on the appropriate input field
    setTimeout(() => {
      if (newMode) { // Return mode
        if (studentInputRef.current) {
          studentInputRef.current.focus();
        }
      } else { // Borrow mode
        if (bookInputRef.current) {
          bookInputRef.current.focus();
        }
      }
    }, 100);
  };

  // Add back the student borrow limit check
  useEffect(() => {
    if (scannedStudent && scannedBooks.length >= libraryRules.maxBooksPerStudent) {
      setIsStudentBorrowLimitReached(true);
    } else {
      setIsStudentBorrowLimitReached(false);
    }
  }, [scannedStudent, scannedBooks, libraryRules]);

  // Fix the book barcode lookup function to be more flexible with matching
  const findBookByBarcode = async (barcode: string): Promise<BookEntry | null> => {
    try {
      // Clean the barcode input
      const cleanBarcode = barcode.trim();
      console.log('Searching for book with barcode:', cleanBarcode);
      
      const booksRef = ref(database, 'books');
      const snapshot = await get(booksRef);
      
      if (!snapshot.exists()) {
        console.log('No books found in database');
        return null;
      }
      
      const books = snapshot.val();
      console.log('Available books in database:', Object.values(books).length);
      
      // Try exact match first across all relevant fields
      let bookEntry = Object.entries(books).find(([_, book]: [string, any]) => {
        return (
          book.accessionNumber === cleanBarcode || 
          book.isbn === cleanBarcode || 
          book.barcode === cleanBarcode
        );
      });
      
      // If no exact match found, try more flexible matching approaches
      if (!bookEntry) {
        console.log('No exact match found, trying flexible matching...');
        
        // Case-insensitive matching
        bookEntry = Object.entries(books).find(([_, book]: [string, any]) => {
          const lcBarcode = cleanBarcode.toLowerCase();
          return (
            book.accessionNumber?.toLowerCase() === lcBarcode || 
            book.isbn?.toLowerCase() === lcBarcode || 
            book.barcode?.toLowerCase() === lcBarcode
          );
        });
        
        // Try trimming leading zeros
        if (!bookEntry && /^0+/.test(cleanBarcode)) {
          const trimmedBarcode = cleanBarcode.replace(/^0+/, '');
          bookEntry = Object.entries(books).find(([_, book]: [string, any]) => {
            return book.accessionNumber === trimmedBarcode;
          });
        }
        
        // Try numeric-only comparison (strip non-digits)
        if (!bookEntry) {
          const numericBarcode = cleanBarcode.replace(/\D/g, '');
          if (numericBarcode.length > 0) {
            bookEntry = Object.entries(books).find(([_, book]: [string, any]) => {
              const numericAccession = book.accessionNumber?.replace(/\D/g, '') || '';
              return numericAccession === numericBarcode;
            });
          }
        }
      }
      
      if (bookEntry) {
        const [id, data] = bookEntry;
        console.log('Found book:', (data as any).title);
        return { id, data: data as Omit<Book, 'id'> };
      }
      
      console.log('Book not found with barcode:', cleanBarcode);
      return null;
    } catch (error) {
      console.error('Error finding book:', error);
      throw new Error('Failed to search for book');
    }
  };
  
  // Improve student barcode lookup for better matching
  const findStudentByBarcode = async (barcode: string): Promise<{studentId: string, studentData: any} | null> => {
    try {
      // Clean the barcode input
      const cleanBarcode = barcode.trim();
      console.log('Searching for student with barcode:', cleanBarcode);
      
      const studentsRef = ref(database, 'students');
      const snapshot = await get(studentsRef);
      
      if (!snapshot.exists()) {
        console.log('No students found in database');
        return null;
      }
      
      const students = snapshot.val();
      console.log('Available students in database:', Object.values(students).length);
      
      // Log a sample of student IDs for debugging
      console.log('Sample student IDs in database:');
      const sampleStudents = Object.values(students).slice(0, 5);
      sampleStudents.forEach((student: any) => {
        console.log(`ID: ${student.studentId}, Name: ${student.name}, Type: ${typeof student.studentId}`);
      });
      
      // Try exact match first (highest priority)
      let student = Object.entries(students).find(([_, student]: [string, any]) => {
        const exactMatch = student.studentId === cleanBarcode;
        if (exactMatch) {
          console.log('Exact match found:', student.name, student.studentId);
        }
        return exactMatch;
      });
      
      // If no exact match, try case-insensitive match
      if (!student) {
        const lowerBarcode = cleanBarcode.toLowerCase();
        student = Object.entries(students).find(([_, student]: [string, any]) => {
          const studentIdLower = String(student.studentId).toLowerCase();
          const caseInsensitiveMatch = studentIdLower === lowerBarcode;
          if (caseInsensitiveMatch) {
            console.log('Case-insensitive match found:', student.name, student.studentId);
          }
          return caseInsensitiveMatch;
        });
      }
      
      // Try numeric-only match (strip all non-digits)
      if (!student && /\d/.test(cleanBarcode)) {
        const numericBarcode = cleanBarcode.replace(/\D/g, '');
        if (numericBarcode.length > 0) {
          student = Object.entries(students).find(([_, student]: [string, any]) => {
            const studentIdNumeric = String(student.studentId).replace(/\D/g, '');
            const numericMatch = studentIdNumeric === numericBarcode;
            if (numericMatch) {
              console.log('Numeric-only match found:', student.name, student.studentId);
            }
            return numericMatch;
          });
        }
      }
      
      // Try with leading zeros trimmed
      if (!student && /^0+/.test(cleanBarcode)) {
        const trimmedBarcode = cleanBarcode.replace(/^0+/, '');
        student = Object.entries(students).find(([_, student]: [string, any]) => {
          // Check trimmed student ID against trimmed barcode
          const trimmedStudentId = String(student.studentId).replace(/^0+/, '');
          const trimmedMatch = trimmedStudentId === trimmedBarcode;
          if (trimmedMatch) {
            console.log('Trimmed leading zeros match found:', student.name, student.studentId);
          }
          return trimmedMatch;
        });
      }
      
      // Last resort: check if the student ID contains the barcode or vice versa
      if (!student) {
        student = Object.entries(students).find(([_, student]: [string, any]) => {
          const studentIdStr = String(student.studentId);
          const includesMatch = studentIdStr.includes(cleanBarcode) || cleanBarcode.includes(studentIdStr);
          if (includesMatch) {
            console.log('Partial match found:', student.name, student.studentId);
          }
          return includesMatch;
        });
      }
      
      if (student) {
        const [studentId, studentData] = student;
        console.log('Found student:', (studentData as any).name);
        console.log('Student ID:', (studentData as any).studentId);
        console.log('Course:', (studentData as any).course);
        return { studentId, studentData };
      } else {
        // Log more details to help with debugging
        console.log('No student found with barcode:', cleanBarcode);
        console.log('Student ID formats in database:');
        let sampleCount = 0;
        Object.values(students).forEach((student: any) => {
          if (sampleCount < 10) { // Limit to 10 samples to avoid console flooding
            const idType = /^\d+$/.test(student.studentId) ? 'Numeric' : 'Alphanumeric';
            console.log(`ID: ${student.studentId}, Length: ${String(student.studentId).length}, Format: ${idType}, Name: ${student.name}`);
            sampleCount++;
          }
        });
      }
      
      return null;
    } catch (error) {
      console.error('Error finding student:', error);
      return null;
    }
  };

  const handleStudentScan = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    // Reset redirect flag when a student is scanned correctly
    setRedirectedToStudent(false);
    
    if (event.key === 'Enter') {
      setLoading(true);
      setError('');
      setBorrowedBooks([]);
      
      try {
        // Clean up the scanned barcode and ensure it's not empty
        const cleanBarcode = studentBarcode.trim();
        setLastScannedStudentBarcode(cleanBarcode);
        
        if (!cleanBarcode) {
          setError('Please scan or enter a student ID');
          setLoading(false);
          return;
        }
        
        // Log the scanned barcode details
        console.log(`Scanning student barcode: ${cleanBarcode} (Length: ${cleanBarcode.length}, Numeric: ${/^\d+$/.test(cleanBarcode)})`);
        
        // Check if this is likely a book barcode that was scanned in the student field
        if (isLikelyBookBarcode(cleanBarcode)) {
          console.log(`Detected likely book barcode in student field: ${cleanBarcode}`);
          
          // Clear the student barcode field
          setStudentBarcode('');
          setLoading(false);
          
          // Set the book barcode with the scanned value
          setBookBarcode(cleanBarcode);
          
          // Show redirect notification
          setRedirectedToBook(true);
          setSuccess(`Redirected book barcode "${cleanBarcode}" to book field`);
          
          // Focus the book barcode field and trigger a scan
          setTimeout(() => {
            if (bookInputRef.current) {
              bookInputRef.current.focus();
              
              // Trigger the scan
              const event = { key: 'Enter' } as React.KeyboardEvent<HTMLInputElement>;
              handleBookScan(event);
            }
          }, 100);
          
          return;
        }

        const result = await findStudentByBarcode(cleanBarcode);
        
        if (result) {
          const { studentId, studentData } = result;
          const studentWithId = {
            ...studentData,
            id: studentId
          };
          setScannedStudent(studentWithId);
          setStudentBarcode(''); // Clear input after successful scan
          setSuccess(`Student found: ${studentWithId.name} (ID: ${studentWithId.studentId})`);
          
          // Check if we are in return mode (tab value = 1)
          const isInReturnMode = tabValue === 1;
          
          // Focus back on the appropriate input field
          setTimeout(() => {
            if (isInReturnMode) {
              if (studentInputRef.current) {
                studentInputRef.current.focus();
              }
            } else {
              if (bookInputRef.current) {
                bookInputRef.current.focus();
              }
            }
          }, 100);

          // If in return mode, fetch borrowed books
          if (isInReturnMode) {
            console.log('In return mode, fetching borrowed books');
            await fetchStudentBorrowedBooks(studentId);
            
            // Check if we found any borrowed books
            if (borrowedBooks.length === 0) {
              console.log('No borrowed books found for this student in return mode');
              setSuccess(`Student ${studentWithId.name} has no books to return.`);
            } else {
              console.log(`Found ${borrowedBooks.length} borrowed books for return`);
              setSuccess(`Student ${studentWithId.name} has ${borrowedBooks.length} books to return.`);
            }
          } else {
            console.log('In borrow mode, ready to scan books');
          }
        } else {
          console.log('Student not found with ID:', cleanBarcode);
          setError(`Student ID "${cleanBarcode}" not found in the system. Please check the ID and try again.`);
          setScannedStudent(null);
          
          // Add diagnostic info to the error for troubleshooting
          console.log(`Barcode format details: Length=${cleanBarcode.length}, Numeric-only=${cleanBarcode.replace(/\D/g, '')}`);
        }
      } catch (error) {
        console.error('Error scanning student ID:', error);
        setError(`Error processing student ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setScannedStudent(null);
      } finally {
        setLoading(false);
      }
    }
  };

  const checkCurrentlyBorrowedBooks = async (studentId: string): Promise<number> => {
    try {
      const borrowsRef = ref(database, 'borrows');
      const snapshot = await get(borrowsRef);
      if (snapshot.exists()) {
        const borrows = snapshot.val() as Record<string, BorrowRecord>;
        const currentBorrows = Object.values(borrows).filter(
          borrow => borrow.studentId === studentId && !borrow.returned
        );
        return currentBorrows.length;
      }
      return 0;
    } catch (error) {
      console.error('Error checking borrowed books:', error);
      throw new Error('Failed to check currently borrowed books');
    }
  };

  const removeScannedBook = (index: number) => {
    setScannedBooks(prev => prev.filter((_, i) => i !== index));
  };

  const handleBorrow = async () => {
    if (scannedBooks.length === 0 || !scannedStudent) {
      setError('Please scan both books and student ID');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const hasOverdueBooks = await checkForOverdueBooks(scannedStudent.id);
      if (hasOverdueBooks) {
        setError('Cannot borrow new books. Please return overdue books first.');
        return;
      }

      const currentlyBorrowed = await checkCurrentlyBorrowedBooks(scannedStudent.id);
      if (currentlyBorrowed + scannedBooks.length > libraryRules.maxBooksPerStudent) {
        setError(`Cannot borrow more than ${libraryRules.maxBooksPerStudent} books at a time (including currently borrowed books)`);
        return;
      }

      // Verify current availability of all books
      for (const book of scannedBooks) {
        const currentBookRef = ref(database, `books/${book.id}`);
        const currentBookSnapshot = await get(currentBookRef);
        const currentBookData = currentBookSnapshot.val();
        
        if (!currentBookData) {
          setError(`"${book.title}" not found in the library`);
          return;
        }

        if (currentBookData.quantity <= 0) {
          setError(`"${book.title}" is not available in the library`);
          return;
        }

        if (currentBookData.available <= 0) {
          setError(`All copies of "${book.title}" are currently borrowed`);
          return;
        }
      }

      // Process all scanned books
      const borrowRecords = [];
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + libraryRules.borrowDurationDays);
      const dueDateString = dueDate.toLocaleDateString();
      
      for (const book of scannedBooks) {
        const bookRef = ref(database, `books/${book.id}`);
        const { id: bookId, ...bookData } = book;
        
        // Double check the available count before updating
        if (bookData.available > 0) {
          await set(bookRef, {
            ...bookData,
            status: 'borrowed',
            available: bookData.available - 1 // Decrease available count
          });

          const borrowRef = ref(database, 'borrows');
          const borrowData = {
            bookId: book.id,
            studentId: scannedStudent.id,
            borrowDate: new Date().toISOString(),
            dueDate: dueDate.toISOString(),
            status: 'borrowed' as const,
            returned: false
          };
          
          const newBorrowRef = await push(borrowRef, borrowData);
          
          // Store borrow record for notification
          borrowRecords.push({
            title: book.title,
            author: book.author,
            accessionNumber: book.accessionNumber || 'N/A'
          });
          
          // Log the borrow activity
          await ActivityLogger.logBorrowActivity(
            book.id,
            book.title,
            scannedStudent.id,
            scannedStudent.name
          );
        } else {
          throw new Error(`No available copies of "${book.title}"`);
        }
      }
      
      // Create notification with borrowed book details
      createBorrowingNotification(
        scannedStudent.id,
        scannedStudent.name,
        borrowRecords,
        dueDateString
      );

      // Send email notification
      try {
        await sendBorrowNotification(
          scannedStudent.email,
          scannedStudent.name,
          borrowRecords,
          dueDateString
        );
        console.log('Borrow notification email sent successfully');
      } catch (emailError) {
        console.error('Failed to send borrow notification email:', emailError);
        // Don't throw error here, as the borrow operation was successful
      }

      setSuccess(`${scannedBooks.length} books borrowed successfully. Due date: ${dueDateString}`);
      setScannedBooks([]);
      setScannedStudent(null);
    } catch (error) {
      console.error('Error borrowing books:', error);
      setError(error instanceof Error ? error.message : 'Error processing borrow request');
    } finally {
      setLoading(false);
    }
  };

  const handleConditionChange = (borrowId: string, condition: 'good' | 'bad' | 'damaged') => {
    setSelectedBookConditions(prev => ({
      ...prev,
      [borrowId]: condition
    }));
  };

  // Add these state variables to the component
  const [payFineDialogOpen, setPayFineDialogOpen] = useState(false);
  const [currentFineRecord, setCurrentFineRecord] = useState<{
    fineId: string;
    amount: number;
    details: {title: string, days: number, fine: number}[];
  } | null>(null);

  // Add this function to handle immediate payment of fines
  const handlePayFineImmediately = async () => {
    try {
      if (!currentFineRecord || !currentFineRecord.fineId) {
        setError('No fine record found to process payment');
        return;
      }
      
      setLoading(true);
      
      // Generate a receipt number
      const date = new Date();
      const year = date.getFullYear().toString().substr(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const receiptNumber = `FP-${year}${month}${day}-${random}`;
      
      // Update the fine record to mark as paid
      const fineRef = ref(database, `fines/${currentFineRecord.fineId}`);
      await update(fineRef, {
        paid: true,
        paymentDate: new Date().toISOString(),
        receiptNumber: receiptNumber
      });
      
      setSuccess(`Payment processed successfully. Receipt #: ${receiptNumber}`);
      
      // Close the dialog
      setPayFineDialogOpen(false);
      
      // Update the receipt dialog data to show the payment
      setFineReceipt(prev => ({
        ...prev,
        receiptNumber: receiptNumber,
        isPaid: true
      }));
      
      // Now that payment is processed, continue with the book return process
      // We need to get the list of books to return
      try {
        // Re-fetch borrowed books to get the latest data
        if (scannedStudent) {
          await fetchStudentBorrowedBooks(scannedStudent.id);
          
          // Get the list of books to return (ones that were part of the fine)
          const booksToReturn = borrowedBooks.filter(book => {
            const bookInFine = currentFineRecord.details.some(detail => 
              detail.title === book.title
            );
            return bookInFine;
          });
          
          if (booksToReturn.length > 0) {
            // Process the book return now that payment is complete
            await processBookReturn(
              booksToReturn, 
              currentFineRecord.details,
              currentFineRecord.amount,
              true // Mark that fine is already processed
            );
          }
        }
      } catch (returnError) {
        console.error('Error processing return after payment:', returnError);
        setError(`Payment was successful but there was an error completing the return process. Please try returning the books again.`);
      }
      
    } catch (error) {
      console.error('Error processing payment:', error);
      setError(`Failed to process payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Modify the handleReturnSelectedBooks function to store the fine record ID
  const handleReturnSelectedBooks = async (booksToReturn: BorrowedBook[]) => {
    try {
      if (booksToReturn.length === 0) {
        setError('No books selected for return');
        return;
      }
      
      if (!scannedStudent) {
        setError('Student not found. Please scan student ID again.');
        return;
      }
      
      setLoading(true);
      setError('');
      
      const returnDate = new Date();
      let totalFine = 0;
      let hasOverdueBooks = false;
      let overdueDetails: {title: string, days: number, fine: number}[] = [];
      
      // First check if any books are overdue and calculate fines
      for (const book of booksToReturn) {
        const dueDate = new Date(book.dueDate);
        const isOverdue = dueDate < returnDate;
        
        if (isOverdue) {
          const daysOverdue = Math.ceil((returnDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          const fineAmount = daysOverdue * libraryRules.finePerDay;
          
          hasOverdueBooks = true;
          totalFine += fineAmount;
          overdueDetails.push({
            title: book.title,
            days: daysOverdue,
            fine: fineAmount
          });
        }
      }
      
      // If there are overdue books, prompt for payment before proceeding with return
      if (hasOverdueBooks && totalFine > 0) {
        // Store fine details so we can process payment
        setCurrentFineRecord({
          fineId: '', // Will be set when we create the fine record
          amount: totalFine,
          details: overdueDetails
        });
        
        // Create the fine record first
        const finesRef = ref(database, 'fines');
        const newFineRef = push(finesRef);
        const fineId = newFineRef.key || '';
        
        await set(newFineRef, {
          studentId: scannedStudent.id,
          studentName: scannedStudent.name,
          amount: totalFine,
          details: overdueDetails,
          date: returnDate.toISOString(),
          paid: false,
          booksReturned: booksToReturn.map(book => ({
            id: book.id,
            title: book.title,
            daysOverdue: new Date(returnDate).getTime() > new Date(book.dueDate).getTime() ? 
              Math.ceil((new Date(returnDate).getTime() - new Date(book.dueDate).getTime()) / (1000 * 60 * 60 * 24)) : 0
          }))
        });
        
        // Update the fine ID in our current record
        setCurrentFineRecord(prev => ({
          ...prev!,
          fineId
        }));
        
        // Show the payment dialog and halt the return process until payment is processed
        setFineReceipt({
          show: true,
          studentName: scannedStudent.name,
          totalAmount: totalFine,
          books: overdueDetails,
          returnDate: returnDate.toLocaleDateString(),
          isPaid: false
        });
        
        setPayFineDialogOpen(true);
        setLoading(false);
        setError(`These books are overdue with a total fine of ₱${totalFine.toFixed(2)}. Payment must be processed before return.`);
        
        // Return early - the return process will continue after payment
        return;
      }
      
      // If no overdue books or if payment has been processed, continue with the return
      await processBookReturn(booksToReturn, overdueDetails, totalFine, false);
      
    } catch (error) {
      console.error('Error returning books:', error);
      setError(`Failed to return books: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Add new helper method to process the actual return after payment
  const processBookReturn = async (
    booksToReturn: BorrowedBook[], 
    overdueDetails: {title: string, days: number, fine: number}[],
    totalFine: number,
    fineAlreadyProcessed: boolean
  ) => {
    try {
      setLoading(true);
      
      if (!scannedStudent) {
        setError('Student not found. Please scan student ID again.');
        return;
      }
      
      const returnDate = new Date();
      const updates: Record<string, any> = {};
      
      // Prepare return details for email
      const returnedBooks = booksToReturn.map(book => {
        const dueDate = new Date(book.dueDate);
        const isOverdue = dueDate < returnDate;
        const daysOverdue = isOverdue ? 
          Math.ceil((returnDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        const fineAmount = daysOverdue * libraryRules.finePerDay;
        
        return {
          title: book.title,
          author: book.author,
          accessionNumber: book.accessionNumber,
          condition: selectedBookConditions[book.borrowId] || 'good',
          daysOverdue: isOverdue ? daysOverdue : undefined,
          fine: isOverdue ? fineAmount : undefined
        };
      });
      
      for (const book of booksToReturn) {
        // Update the borrow record
        updates[`borrows/${book.borrowId}/returned`] = true;
        updates[`borrows/${book.borrowId}/returnDate`] = returnDate.toISOString();
        updates[`borrows/${book.borrowId}/status`] = 'returned';
        updates[`borrows/${book.borrowId}/condition`] = selectedBookConditions[book.borrowId] || 'good';
        
        if (overdueDetails.length > 0) {
          updates[`borrows/${book.borrowId}/daysOverdue`] = Math.ceil((returnDate.getTime() - new Date(book.dueDate).getTime()) / (1000 * 60 * 60 * 24));
          updates[`borrows/${book.borrowId}/fineAmount`] = totalFine;
        }
        
        // Get the book to update available count
        const bookRef = ref(database, `books/${book.id}`);
        const bookSnapshot = await get(bookRef);
        
        if (bookSnapshot.exists()) {
          const bookData = bookSnapshot.val();
          
          // Update the available count
          updates[`books/${book.id}/available`] = (bookData.available || 0) + 1;
          
          // Create notification
          await addBorrowingNotification(
            'Returned', 
            bookData.title, 
            scannedStudent.name
          );
        }
      }
      
      // Apply all updates at once
      await update(ref(database), updates);
      
      // Create fine notification if needed and not already processed
      if (overdueDetails.length > 0 && totalFine > 0 && !fineAlreadyProcessed) {
        // Add notification about the fine
        await addFinesNotification(
          totalFine.toString(),
          scannedStudent.name,
          booksToReturn.length
        );
      }
      
      // Send return notification email
      try {
        await sendReturnNotification(
          scannedStudent.email,
          scannedStudent.name,
          returnedBooks,
          returnDate.toLocaleDateString(),
          overdueDetails.length > 0 ? {
            totalAmount: totalFine,
            isPaid: true // If we got this far, the fine has been paid if there was one
          } : undefined
        );
        console.log('Return notification email sent successfully');
      } catch (emailError) {
        console.error('Failed to send return notification email:', emailError);
      }
      
      // Set success message 
      if (overdueDetails.length > 0 && totalFine > 0) {
        setSuccess(`Books returned successfully. Fine payment of ₱${totalFine.toFixed(2)} has been processed.`);
      } else {
        setSuccess(`Books returned successfully.`);
      }
      
      // Refresh the student's borrowed books
      await fetchStudentBorrowedBooks(scannedStudent.id);
      
    } catch (error) {
      console.error('Error processing book return:', error);
      setError(`Failed to return books: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleManualBookEntry = () => {
    if (lastScannedBarcode) {
      setManualBookData({
        ...manualBookData,
        accessionNumber: lastScannedBarcode
      });
    }
    setOpenManualDialog(true);
  };

  const handleCloseManualDialog = () => {
    setOpenManualDialog(false);
  };

  const handleManualInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setManualBookData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleManualBookSave = async () => {
    if (!manualBookData.title || !manualBookData.author || !manualBookData.accessionNumber) {
      setError('Please fill in all required fields for the book');
      return;
    }

    try {
      setLoading(true);
      
      // First, add the book to the database
      const booksRef = ref(database, 'books');
      const newBookRef = push(booksRef);
      
      // Create a new book
      const newBook: Omit<Book, 'id'> = {
        title: manualBookData.title,
        author: manualBookData.author,
        accessionNumber: manualBookData.accessionNumber,
        isbn: manualBookData.isbn || '',
        barcode: manualBookData.accessionNumber,
        status: 'available',
        quantity: 1,
        available: 1
      };
      
      // Save the new book
      await set(newBookRef, newBook);
      console.log('Manually added book:', newBook);
      
      // Add to scanned books
      const bookWithId = {
        ...newBook,
        id: newBookRef.key || ''
      };
      
      setScannedBooks(prev => [...prev, bookWithId]);
      setSuccess(`Manually added and scanned: "${newBook.title}" by ${newBook.author}`);
      
      // Close dialog and clear form
      setOpenManualDialog(false);
      setManualBookData({
        title: '',
        author: '',
        accessionNumber: '',
        isbn: ''
      });
      
    } catch (error) {
      console.error('Error adding manual book:', error);
      setError('Failed to add book manually. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handler for manual student entry
  const handleManualStudentEntry = () => {
    if (lastScannedStudentBarcode) {
      setManualStudentData({
        ...manualStudentData,
        studentId: lastScannedStudentBarcode
      });
    }
    setOpenManualStudentDialog(true);
  };

  const handleCloseManualStudentDialog = () => {
    setOpenManualStudentDialog(false);
  };

  const handleManualStudentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setManualStudentData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleManualStudentSave = async () => {
    if (!manualStudentData.name || !manualStudentData.studentId) {
      setError('Please fill in all required fields for the student');
      return;
    }

    try {
      setLoading(true);
      
      // First, add the student to the database
      const studentsRef = ref(database, 'students');
      const newStudentRef = push(studentsRef);
      
      // Create a new student
      const newStudent: Omit<Student, 'id'> = {
        name: manualStudentData.name,
        studentId: manualStudentData.studentId,
        course: manualStudentData.course || '',
        address: manualStudentData.address || '',
        email: manualStudentData.email || ''
      };
      
      // Save the new student
      await set(newStudentRef, newStudent);
      console.log('Manually added student:', newStudent);
      
      // Set as current student
      const studentWithId = {
        ...newStudent,
        id: newStudentRef.key || ''
      };
      
      // Send registration confirmation email if email is provided
      if (newStudent.email) {
        try {
          await sendRegistrationConfirmation(
            newStudent.email,
            newStudent.name,
            {
              studentId: newStudent.studentId,
              course: newStudent.course,
              address: newStudent.address
            }
          );
          console.log('Registration confirmation email sent successfully');
        } catch (emailError) {
          console.error('Failed to send registration email:', emailError);
          // Don't throw error here as the registration was successful
        }
      }
      
      setScannedStudent(studentWithId);
      setSuccess(`Manually added student: "${newStudent.name}" (ID: ${newStudent.studentId})${newStudent.email ? ' and sent welcome email' : ''}`);
      
      // Close dialog and clear form
      setOpenManualStudentDialog(false);
      setManualStudentData({
        name: '',
        studentId: '',
        course: '',
        address: '',
        email: ''
      });
      
      // Focus on the appropriate input field
      setTimeout(() => {
        if (!isReturnMode && bookInputRef.current) {
          bookInputRef.current.focus();
        }
      }, 100);
      
    } catch (error) {
      console.error('Error adding manual student:', error);
      setError('Failed to add student manually. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderScanInputs = () => {
    return (
      <Box sx={{ mb: 2 }}>
        <style>{fadeAnimation}</style>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              variant="outlined"
              label={isReturnMode ? "Scan Student ID (for Return)" : "Scan Student ID"}
              value={studentBarcode}
              onChange={handleStudentBarcodeChange}
              onKeyDown={handleStudentScan}
              inputRef={studentInputRef}
              placeholder="Scan or type student ID"
              disabled={loading}
              autoFocus
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon color="primary" />
                  </InputAdornment>
                ),
                endAdornment: redirectedToStudent && (
                  <InputAdornment position="end">
                    <CheckCircleOutlineIcon color="success" sx={{ animation: 'fadeBackground 2s' }} />
                  </InputAdornment>
                )
              }}
              helperText={
                !scannedStudent ? 
                "Scan student ID barcode or enter manually" : 
                `${scannedStudent.name} (${scannedStudent.course})`
              }
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              variant="outlined"
              label={isReturnMode ? "Book barcode scanning disabled in return mode" : "Scan Book Barcode"}
              value={bookBarcode}
              onChange={handleBookBarcodeChange}
              onKeyDown={handleBookScan}
              inputRef={bookInputRef}
              placeholder="Scan or type book barcode"
              disabled={loading || isReturnMode || isStudentBorrowLimitReached || !scannedStudent}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MenuBookIcon color={isReturnMode ? "disabled" : "primary"} />
                  </InputAdornment>
                ),
                endAdornment: redirectedToBook && (
                  <InputAdornment position="end">
                    <CheckCircleOutlineIcon color="success" sx={{ animation: 'fadeBackground 2s' }} />
                  </InputAdornment>
                )
              }}
              helperText={
                isReturnMode ? 
                "Book scanning disabled in return mode" : 
                (!scannedStudent ? 
                  "Scan student ID first" : 
                  (isStudentBorrowLimitReached ? 
                    `Max books (${libraryRules.maxBooksPerStudent}) reached` : 
                    "Scan book barcode or enter manually"))
              }
            />
          </Grid>
        </Grid>
        
        {/* Barcode scanning diagnostic message display */}
        {showDiagnostics && diagnosticMessage && (
          <Alert severity="info" sx={{ mt: 2, fontSize: '0.85rem' }}>
            <Typography variant="body2">
              <b>Scanner Diagnostics:</b> {diagnosticMessage}
            </Typography>
          </Alert>
        )}
        
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            startIcon={<CenterFocusStrongIcon />}
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            size="small"
          >
            {showDiagnostics ? "Hide Diagnostics" : "Show Diagnostics"}
          </Button>
          
          <Box>
            <Button
              variant="outlined"
              startIcon={<InfoIcon />}
              onClick={runDiagnostics}
              size="small"
              sx={{ mr: 1 }}
            >
              Test Scanner
            </Button>
            
            {isReturnMode ? (
              <Button 
                variant="contained" 
                color="primary"
                onClick={() => toggleMode()}
                startIcon={<LocalLibraryIcon />}
              >
                Switch to Borrow Mode
              </Button>
            ) : (
              <Button 
                variant="contained" 
                color="secondary"
                onClick={() => toggleMode()}
                startIcon={<AssignmentReturnedIcon />}
              >
                Switch to Return Mode
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    );
  };

  // Add a function to set condition for all books at once
  const setAllBookConditions = (condition: 'good' | 'bad' | 'damaged') => {
    const newConditions: Record<string, 'good' | 'bad' | 'damaged'> = {};
    
    borrowedBooks.forEach(book => {
      newConditions[book.borrowId] = condition;
    });
    
    setSelectedBookConditions(newConditions);
  };

  // Fix the return type to properly return ReactNode
  const renderBorrowedBooks = (): React.ReactNode => (
    <Grid item xs={12} md={6}>
      <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flex: '1 0 auto', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <MenuBookIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" gutterBottom>
              Currently Borrowed Books
            </Typography>
          </Box>
          {borrowedBooks.length > 0 ? (
            <>
              <List sx={{ 
                maxHeight: '400px', 
                overflow: 'auto', 
                border: '1px solid #eee', 
                borderRadius: 1, 
                mb: 2,
                '& .MuiListItem-root': {
                  px: 2,
                  py: 1.5
                }
              }}>
                {borrowedBooks.map((book) => (
                  <ListItem
                    key={book.borrowId}
                    divider
                  >
                    <Box sx={{ width: '100%' }}>
                      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                        {book.title}
                        {new Date(book.dueDate) < new Date() && (
                          <Chip 
                            icon={<WarningIcon />} 
                            size="small" 
                            label="OVERDUE" 
                            color="error" 
                            sx={{ ml: 1, height: 24 }} 
                          />
                        )}
                      </Typography>
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        flexWrap: 'wrap'
                      }}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Accession: {book.accessionNumber}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Due Date: {new Date(book.dueDate).toLocaleDateString()}
                            {new Date(book.dueDate) < new Date() && (
                              <Typography component="span" color="error" sx={{ ml: 0.5, fontWeight: 'bold', fontSize: '0.75rem' }}>
                                (OVERDUE: {Math.ceil((new Date().getTime() - new Date(book.dueDate).getTime()) / (1000 * 60 * 60 * 24))} days)
                              </Typography>
                            )}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, mt: { xs: 1, sm: 0 } }}>
                          <FormControl size="small" sx={{ minWidth: 100 }}>
                            <Select
                              displayEmpty
                              value={selectedBookConditions[book.borrowId] || ''}
                              onChange={(e) => handleConditionChange(book.borrowId, e.target.value as 'good' | 'bad' | 'damaged')}
                              sx={{ 
                                height: '32px',
                                fontSize: '0.875rem',
                                '.MuiOutlinedInput-notchedOutline': { 
                                  borderColor: 'rgba(0, 0, 0, 0.23)' 
                                }
                              }}
                              renderValue={(selected) => {
                                if (!selected) {
                                  return <Typography color="text.secondary" sx={{ fontSize: '0.875rem' }}>Condition</Typography>;
                                }
                                return selected.charAt(0).toUpperCase() + selected.slice(1);
                              }}
                            >
                              <MenuItem value="good">Good</MenuItem>
                              <MenuItem value="bad">Bad</MenuItem>
                              <MenuItem value="damaged">Damaged</MenuItem>
                            </Select>
                          </FormControl>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleReturnSelectedBooks([book])}
                            disabled={!selectedBookConditions[book.borrowId]}
                            sx={{ 
                              height: '32px',
                              minWidth: '80px',
                              fontSize: '0.875rem',
                              textTransform: 'none'
                            }}
                          >
                            Return
                          </Button>
                        </Box>
                      </Box>
                      {new Date(book.dueDate) < new Date() && (
                        <Typography variant="body2" color="error.dark" sx={{ mt: 1, fontSize: '0.75rem' }}>
                          <strong>Estimated Fine:</strong> ₱{Math.ceil((new Date().getTime() - new Date(book.dueDate).getTime()) / (1000 * 60 * 60 * 24)) * 5}
                        </Typography>
                      )}
                    </Box>
                  </ListItem>
                ))}
              </List>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                {/* Quick condition selectors */}
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', width: '100%' }}>
                  <Button
                    size="small"
                    variant="outlined"
                    color="success"
                    onClick={() => setAllBookConditions('good')}
                    startIcon={<CheckCircleOutlineIcon />}
                  >
                    All Good
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    onClick={() => setAllBookConditions('bad')}
                    startIcon={<WarningAmberIcon />}
                  >
                    All Bad
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => setAllBookConditions('damaged')}
                    startIcon={<BrokenImageIcon />}
                  >
                    All Damaged
                  </Button>
                </Box>
                
                <Typography variant="body2" color="text.secondary" align="center">
                  {borrowedBooks.some(book => !selectedBookConditions[book.borrowId]) 
                    ? 'Select a condition for all books before returning'
                    : 'All books have conditions selected and are ready to return'}
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  onClick={() => handleReturnSelectedBooks(borrowedBooks)}
                  disabled={borrowedBooks.some(book => !selectedBookConditions[book.borrowId])}
                  sx={{ mt: 1 }}
                  startIcon={<AssignmentReturnedIcon />}
                >
                  Return All {borrowedBooks.length} {borrowedBooks.length === 1 ? 'Book' : 'Books'}
                </Button>
              </Box>
            </>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3, textAlign: 'center' }}>
              <SentimentDissatisfiedIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2, opacity: 0.7 }} />
              <Typography color="textSecondary" variant="h6">
                {scannedStudent ? 'No books currently borrowed' : 'Scan student ID to view borrowed books'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {scannedStudent 
                  ? `${scannedStudent.name} has no borrowed books to return`
                  : 'Please scan a student ID card to view their borrowed books'}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Grid>
  );

  const renderDetails = () => (
    <Grid item xs={12} md={6}>
      <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flex: '1 0 auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" gutterBottom>
              Student Details
            </Typography>
          </Box>
          {scannedStudent ? (
            <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Name</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    {scannedStudent.name}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Student ID</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    {scannedStudent.studentId}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Course</Typography>
                  <Typography variant="body1">
                    {scannedStudent.course || 'Not specified'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Address</Typography>
                  <Typography variant="body1">
                    {scannedStudent.address || 'Not specified'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                  <Typography variant="body1">
                    {scannedStudent.email || 'Not specified'}
                  </Typography>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle2" color="text.secondary" align="center">
                  Borrowing Limits
                </Typography>
                <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {libraryRules.maxBooksPerStudent}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Max Books
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {libraryRules.borrowDurationDays}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Days per Borrow
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3, textAlign: 'center' }}>
              <PersonIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2, opacity: 0.7 }} />
              <Typography color="textSecondary" variant="h6">
                No student ID scanned
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Please scan a valid student ID using the scanner device or manually enter the ID and press Enter
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Grid>
  );

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    // Sync isReturnMode with tab value to ensure consistency
    setIsReturnMode(newValue === 1);
    
    // Clear states when switching modes
    setScannedBooks([]);
    setScannedStudent(null);
    setBorrowedBooks([]);
    setBookBarcode('');
    setStudentBarcode('');
    setError('');
    setSuccess('');
    setSelectedBookConditions({});
    
    // Focus on the appropriate input field
    setTimeout(() => {
      if (newValue === 1) { // Return mode
        if (studentInputRef.current) {
          studentInputRef.current.focus();
        }
      } else { // Borrow mode
        if (bookInputRef.current) {
          bookInputRef.current.focus();
        }
      }
    }, 100);
  };

  function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
  
    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`simple-tabpanel-${index}`}
        aria-labelledby={`simple-tab-${index}`}
        {...other}
      >
        {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
      </div>
    );
  }

  // Render manual book dialog
  const renderManualBookDialog = () => (
    <Dialog open={openManualDialog} onClose={handleCloseManualDialog}>
      <DialogTitle>Manually Add Book</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          The scanned barcode was not found in the database. Fill in the details to add it manually.
        </Typography>
        <TextField
          name="title"
          label="Book Title *"
          value={manualBookData.title}
          onChange={handleManualInputChange}
          fullWidth
          margin="dense"
          required
        />
        <TextField
          name="author"
          label="Author *"
          value={manualBookData.author}
          onChange={handleManualInputChange}
          fullWidth
          margin="dense"
          required
        />
        <TextField
          name="accessionNumber"
          label="Accession Number / Barcode *"
          value={manualBookData.accessionNumber}
          onChange={handleManualInputChange}
          fullWidth
          margin="dense"
          required
        />
        <TextField
          name="isbn"
          label="ISBN"
          value={manualBookData.isbn}
          onChange={handleManualInputChange}
          fullWidth
          margin="dense"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseManualDialog}>Cancel</Button>
        <Button onClick={handleManualBookSave} color="primary" variant="contained">
          Save & Add
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Render manual student dialog
  const renderManualStudentDialog = () => (
    <Dialog open={openManualStudentDialog} onClose={handleCloseManualStudentDialog}>
      <DialogTitle>Manually Add Student</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          The scanned student ID was not found. Fill in the details to add this student.
        </Typography>
        <TextField
          name="name"
          label="Student Name *"
          value={manualStudentData.name}
          onChange={handleManualStudentInputChange}
          fullWidth
          margin="dense"
          required
        />
        <TextField
          name="studentId"
          label="Student ID *"
          value={manualStudentData.studentId}
          onChange={handleManualStudentInputChange}
          fullWidth
          margin="dense"
          required
        />
        <TextField
          name="course"
          label="Course/Program"
          value={manualStudentData.course}
          onChange={handleManualStudentInputChange}
          fullWidth
          margin="dense"
        />
        <TextField
          name="address"
          label="Address"
          value={manualStudentData.address}
          onChange={handleManualStudentInputChange}
          fullWidth
          margin="dense"
        />
        <TextField
          name="email"
          label="Email"
          value={manualStudentData.email}
          onChange={handleManualStudentInputChange}
          fullWidth
          margin="dense"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseManualStudentDialog}>Cancel</Button>
        <Button onClick={handleManualStudentSave} color="primary" variant="contained">
          Save & Add
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Add diagnostic function for troubleshooting
  const runDiagnostics = async () => {
    try {
      setDiagnosticMessage('');
      setShowDiagnostics(true);
      
      // Log platform information
      console.log('Running barcode scanner diagnostics...');
      console.log(`Browser: ${navigator.userAgent}`);
      console.log(`Platform: ${navigator.platform}`);
      
      if (lastScannedBarcode) {
        const barcodeInfo = getBarcodeDataInfo(lastScannedBarcode);
        console.log('Last scanned book barcode analysis:', barcodeInfo);
        
        setDiagnosticMessage(
          `Last book barcode: "${lastScannedBarcode}" (${barcodeInfo.properties.length} chars) - 
          Detected as: ${barcodeInfo.detectedType} - 
          Format: ${barcodeInfo.properties.format}`
        );
      } else if (lastScannedStudentBarcode) {
        const barcodeInfo = getBarcodeDataInfo(lastScannedStudentBarcode);
        console.log('Last scanned student barcode analysis:', barcodeInfo);
        
        setDiagnosticMessage(
          `Last student barcode: "${lastScannedStudentBarcode}" (${barcodeInfo.properties.length} chars) - 
          Detected as: ${barcodeInfo.detectedType} - 
          Format: ${barcodeInfo.properties.format}`
        );
      } else {
        setDiagnosticMessage(
          'No barcodes scanned yet. Try scanning a barcode to see diagnostics.'
        );
      }
      
      // Run on-demand pattern analysis
      const patterns = await analyzeAndLearnBarcodePatterns();
      if (patterns) {
        console.log('Pattern analysis complete:', patterns);
        setDiagnosticMessage(prev => 
          `${prev}\n\nPattern analysis: Book barcodes typically ${patterns.bookPatterns.lengthRange[0]}-${patterns.bookPatterns.lengthRange[1]} chars,
          Student IDs typically ${patterns.studentPatterns.lengthRange[0]}-${patterns.studentPatterns.lengthRange[1]} chars.`
        );
      }
      
    } catch (error) {
      console.error('Error running diagnostics:', error);
      setDiagnosticMessage(`Error running diagnostics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Helper functions for consistent messaging
  const showErrorMessage = (message: string) => {
    setError(message);
    setSuccess('');
    console.error(message);
  };
  
  const showSuccessMessage = (message: string) => {
    setSuccess(message);
    setError('');
    console.log(message);
  };

  // Render tab content based on selected tab
  const renderTabContent = () => {
    // Always derive isReturnMode from tabValue to ensure consistency
    const isInReturnMode = tabValue === 1;
    
    // Ensure consistent state
    if (isReturnMode !== isInReturnMode) {
      setIsReturnMode(isInReturnMode);
    }
    
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, borderBottom: '1px solid #eee', pb: 2 }}>
          <Typography variant="h6">
            {isInReturnMode ? 'Return Books' : 'Borrow Books'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              size="small" 
              startIcon={isInReturnMode ? <MenuBookIcon /> : <ListIcon />}
              color="primary"
              variant="outlined"
              onClick={() => setTabValue(isInReturnMode ? 0 : 1)}
            >
              Switch to {isInReturnMode ? 'Borrow' : 'Return'} Mode
            </Button>
          </Box>
        </Box>
        
        <Typography color="textSecondary" sx={{ mb: 3 }}>
          {isInReturnMode 
            ? 'Scan student ID to view and return borrowed books' 
            : 'Scan student ID first, then scan each book to borrow'}
        </Typography>
        
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {renderScanInputs()}
        
        <Grid container spacing={3}>
          {isInReturnMode && renderBorrowedBooks()}
          {!isInReturnMode && renderBookToBorrow()}
          {renderDetails()}
        </Grid>

        {/* Manual Entry Options */}
        {error && (error.includes('Book not found') || error.includes('book')) && !isInReturnMode && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button 
              startIcon={<AddIcon />} 
              variant="outlined" 
              color="secondary" 
              onClick={handleManualBookEntry}
            >
              Book Not Found? Add Manually
            </Button>
          </Box>
        )}
        
        {error && error.includes('Student') && (
          <Box sx={{ mt: error.includes('Book') ? 1 : 3, display: 'flex', justifyContent: 'center' }}>
            <Button 
              startIcon={<AddIcon />} 
              variant="outlined" 
              color="secondary" 
              onClick={handleManualStudentEntry}
            >
              Student Not Found? Add Manually
            </Button>
          </Box>
        )}
      </Paper>
    );
  };

  // Add handleBorrowBooks as an alias for handleBorrow to fix function reference
  const handleBorrowBooks = () => {
    handleBorrow();
  };

  const renderBookToBorrow = (): React.ReactNode => (
    <Grid item xs={12} md={6}>
      <Card elevation={2} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flex: '1 0 auto', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <LibraryBooksIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              Books to Borrow
            </Typography>
          </Box>
          
          {scannedBooks.length > 0 ? (
            <>
              <List sx={{ 
                maxHeight: '400px', 
                overflow: 'auto', 
                border: '1px solid #eee', 
                borderRadius: 1, 
                mb: 2,
                '& .MuiListItem-root': {
                  px: 2,
                  py: 1.5
                }
              }}>
                {scannedBooks.map((book, index) => (
                  <ListItem
                    key={index}
                    divider
                  >
                    <Box sx={{ width: '100%' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="subtitle2">
                          {book.title}
                        </Typography>
                        <IconButton 
                          size="small" 
                          edge="end" 
                          onClick={() => removeScannedBook(index)}
                          sx={{ color: 'error.main', ml: 1, p: 0.5 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap'
                      }}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Accession: {book.accessionNumber}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Author: {book.author}
                          </Typography>
                        </Box>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            bgcolor: 'primary.light', 
                            color: 'primary.contrastText', 
                            px: 1.5, 
                            py: 0.5, 
                            borderRadius: 1,
                            fontSize: '0.775rem',
                            fontWeight: 'medium',
                            mt: { xs: 1, sm: 0 }
                          }}
                        >
                          Due: {getDateWithOffset(libraryRules.borrowDurationDays)}
                        </Typography>
                      </Box>
                    </Box>
                  </ListItem>
                ))}
              </List>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mb: 1 }}>
                  <Typography variant="body2">Total Books: {scannedBooks.length}</Typography>
                  <Button 
                    color="error" 
                    size="small" 
                    onClick={() => setScannedBooks([])}
                    startIcon={<ClearAllIcon />}
                    variant="outlined"
                  >
                    Clear All
                  </Button>
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  disabled={!scannedStudent || scannedBooks.length === 0}
                  onClick={handleBorrow}
                  startIcon={<LocalLibraryIcon />}
                >
                  Borrow {scannedBooks.length} {scannedBooks.length === 1 ? 'Book' : 'Books'}
                </Button>
              </Box>
            </>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3, textAlign: 'center' }}>
              <SentimentDissatisfiedIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2, opacity: 0.7 }} />
              <Typography color="textSecondary" variant="h6">
                No books added yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Scan book barcodes to add books for borrowing
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Grid>
  );
  
  // Helper function to get a date with offset
  const getDateWithOffset = (daysOffset: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toLocaleDateString();
  };
  
  // Function to clear all scanned books
  const clearScannedBooks = () => {
    setScannedBooks([]);
    showSuccessMessage('All books cleared from borrow list');
    if (bookInputRef.current) {
      bookInputRef.current.focus();
    }
  };

  const [feedbackDetails, setFeedbackDetails] = useState<{
    show: boolean;
    studentName: string;
    bookCount: number;
    hasOverdue: boolean;
    type: 'borrow' | 'return';
  }>({
    show: false,
    studentName: '',
    bookCount: 0,
    hasOverdue: false,
    type: 'borrow'
  });

  // Add back the handler for student barcode input that detects scanner input
  const handleStudentBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const currentTime = new Date().getTime();
    
    // Detect if this is likely scanner input (fast typing)
    if (lastInputTime > 0 && currentTime - lastInputTime < SCANNER_MAX_DELAY) {
      setIsScannerInput(true);
      scanBuffer.current += value.slice(studentBarcode.length); // Append new characters
    } else {
      setIsScannerInput(false);
      scanBuffer.current = ''; // Reset buffer for manual input
    }
    
    setLastInputTime(currentTime);
    setStudentBarcode(value);
    
    // Clear any errors when user starts typing again
    if (error && (error.includes('Student') || error.includes('student'))) {
      setError('');
    }
    
    // Auto-submit if it's scanner input and we have a terminator character
    // or if the input stopped coming rapidly
    if (isScannerInput && value.length >= MIN_BARCODE_LENGTH) {
      if (value.endsWith('\n') || value.endsWith('\r') || value.endsWith('\t')) {
        // Process the scan automatically without Enter key
        const cleanValue = value.replace(/[\r\n\t]/g, '');
        setStudentBarcode(cleanValue);
        
        // Use setTimeout to ensure state is updated before processing
        setTimeout(() => {
          const event = { key: 'Enter' } as React.KeyboardEvent<HTMLInputElement>;
          handleStudentScan(event);
        }, 10);
      }
    }
  };

  const handleBookScan = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    // Reset redirect flag when a book is scanned correctly
    setRedirectedToBook(false);
    
    if (event.key === 'Enter') {
      setLoading(true);
      setError('');
      
      try {
        // Clean up the scanned barcode and ensure it's not empty
        const cleanBarcode = bookBarcode.trim();
        if (!cleanBarcode) {
          setError('Please scan or enter a book barcode');
          setLoading(false);
          return;
        }
        
        // Check if this is likely a student ID that was scanned in the book field
        if (isLikelyStudentId(cleanBarcode)) {
          console.log(`Detected likely student ID in book field: ${cleanBarcode}`);
          
          // Clear the book barcode field
          setBookBarcode('');
          setLoading(false);
          
          // Set the student barcode with the scanned value
          setStudentBarcode(cleanBarcode);
          
          // Show redirect notification
          setRedirectedToStudent(true);
          setSuccess(`Redirected student ID "${cleanBarcode}" to student field`);
          
          // Focus the student barcode field and trigger a scan
          setTimeout(() => {
            if (studentInputRef.current) {
              studentInputRef.current.focus();
              
              // Trigger the scan
              const event = { key: 'Enter' } as React.KeyboardEvent<HTMLInputElement>;
              handleStudentScan(event);
            }
          }, 100);
          
          return;
        }
        
        // Store the last scanned barcode for potential manual entry
        setLastScannedBarcode(cleanBarcode);
        
        // Generate barcode diagnostic info
        const barcodeInfo = getBarcodeDataInfo(cleanBarcode);
        console.log('BOOK SCAN DIAGNOSTIC:', barcodeInfo);
        
        // Show diagnostic info in case of scan issues
        setDiagnosticMessage(`Scanning "${cleanBarcode}" (${barcodeInfo.properties.length} chars, ${barcodeInfo.properties.format})`);
        
        // Check if the barcode is registered in the system
        const bookEntry = await findBookByBarcode(cleanBarcode);
        
        if (!bookEntry) {
          setError(`Book with barcode "${cleanBarcode}" not found in the system. Please check the barcode or add it manually.`);
          setLoading(false);
          return;
        }
        
        // Book found in the system, check if it's already in the scanned books list
        const isAlreadyScanned = scannedBooks.some(book => book.id === bookEntry.id);
        if (isAlreadyScanned) {
          setError(`Book "${bookEntry.data.title}" is already in your list`);
          setLoading(false);
          return;
        }
        
        // Check if book is available for borrowing
        if (bookEntry.data.available <= 0) {
          setError(`No available copies of "${bookEntry.data.title}" for borrowing`);
          setLoading(false);
          return;
        }
        
        // Add the book to the scanned books list
        const bookWithId = {
          ...bookEntry.data,
          id: bookEntry.id
        };
        
        setScannedBooks(prev => [...prev, bookWithId]);
        setBookBarcode(''); // Clear input after successful scan
        setSuccess(`Book added: ${bookEntry.data.title}`);
        
        // Focus back on the book barcode field for the next scan
        setTimeout(() => {
          if (bookInputRef.current) {
            bookInputRef.current.focus();
          }
        }, 100);
        
      } catch (error) {
        console.error('Error scanning book:', error);
        setError(`Error processing book barcode: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    }
  };

  // Add a function to help debug barcode issues - this will be used by the runDiagnostics function
  const getBarcodeDataInfo = (barcode: string) => {
    // Strip any whitespace and control characters
    const cleanBarcode = barcode.trim().replace(/[\r\n\t]/g, '');
    
    // Get properties of the barcode
    const properties = {
      value: cleanBarcode,
      length: cleanBarcode.length,
      isNumeric: /^\d+$/.test(cleanBarcode),
      isAlphanumeric: /^[A-Za-z0-9]+$/.test(cleanBarcode),
      hasLeadingZeros: /^0+/.test(cleanBarcode),
      format: (() => {
        if (/^\d{10}$/.test(cleanBarcode)) return 'Possible ISBN-10';
        if (/^\d{13}$/.test(cleanBarcode)) return 'Possible ISBN-13';
        if (/^\d{1,5}$/.test(cleanBarcode)) return 'Possible Student ID (numeric short)';
        if (/^[A-Za-z]{1,2}\d+$/.test(cleanBarcode)) return 'Possible Book Accession Number';
        return 'Unknown format';
      })(),
    };
    
    // Provide analysis for the barcode
    const detectedType = isLikelyStudentId(cleanBarcode) ? 'Student ID' : 'Book Barcode';
    
    return {
      properties,
      detectedType,
      withoutLeadingZeros: cleanBarcode.replace(/^0+/, ''),
      numericOnly: cleanBarcode.replace(/\D/g, ''),
      lowerCase: cleanBarcode.toLowerCase(),
    };
  };

  // Add the fineReceipt state near the other state variables
  // Add this around line 168 with other state declarations
  const [fineReceipt, setFineReceipt] = useState<{
    show: boolean;
    studentName: string;
    totalAmount: number;
    books: {title: string, days: number, fine: number}[];
    returnDate: string;
    receiptNumber?: string;
    isPaid?: boolean;
  }>({
    show: false,
    studentName: '',
    totalAmount: 0,
    books: [],
    returnDate: ''
  });

  // Add this function to close the fine receipt dialog
  const handleCloseFineReceipt = () => {
    setFineReceipt(prev => ({
      ...prev,
      show: false
    }));
  };

  // Add this function to print the fine receipt
  const handlePrintFineReceipt = () => {
    // Open a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('Failed to open print window. Please check your popup blocker settings.');
      return;
    }

    // Generate receipt HTML content
    const receiptHTML = `
      <html>
        <head>
          <title>Fine Receipt - Library Management System</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .receipt { max-width: 700px; margin: 0 auto; padding: 20px; border: 1px solid #ccc; }
            .header { text-align: center; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; }
            .subtitle { font-size: 16px; color: #666; }
            .info { margin-bottom: 20px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .label { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="title">Library Fine Receipt</div>
              <div class="subtitle">Library Management System</div>
            </div>
            
            <div class="info">
              <div class="info-row">
                <span class="label">Student Name:</span>
                <span>${fineReceipt.studentName}</span>
              </div>
              <div class="info-row">
                <span class="label">Date:</span>
                <span>${fineReceipt.returnDate}</span>
              </div>
              <div class="info-row">
                <span class="label">Receipt No:</span>
                <span>${new Date().getTime().toString().substring(6)}</span>
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Book Title</th>
                  <th>Days Overdue</th>
                  <th>Fine (₱${libraryRules.finePerDay}/day)</th>
                </tr>
              </thead>
              <tbody>
                ${fineReceipt.books.map((book, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${book.title}</td>
                    <td>${book.days}</td>
                    <td>₱${book.fine.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div class="total">
              Total Fine Amount: ₱${fineReceipt.totalAmount.toFixed(2)}
            </div>
            
            <div class="footer">
              <p>Thank you for returning your books. Please pay your fine at the library counter.</p>
              <p>This is a computer-generated receipt and does not require a signature.</p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <button onclick="window.print()">Print Receipt</button>
          </div>
        </body>
      </html>
    `;
    
    // Write to the new window
    printWindow.document.open();
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    
    // Focus the new window
    printWindow.focus();
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <style>{fadeAnimation}</style>
      <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Borrow & Return Management
        </Typography>
        
        {/* Borrow/Return Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="borrow-return-tabs">
            <Tab label="Borrow" />
            <Tab label="Return" />
          </Tabs>
        </Box>
        
        {/* Main Content */}
        {renderTabContent()}
        
        {/* Success/Error Messages */}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
        
        {renderManualBookDialog()}
        {renderManualStudentDialog()}
        
        {/* Status footer to show scanner system information */}
        <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid #eee' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Scan System Status:
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {isScannerInput ? '📊 Scanner input detected' : '⌨️ Manual input mode'} | 
                {bookPatterns.commonPrefixes.length > 0 ? ` 📚 Book patterns learned: ${bookPatterns.commonPrefixes.length}` : ' 📚 Learning book patterns'} |
                {studentPatterns.commonPrefixes.length > 0 ? ` 👤 Student patterns learned: ${studentPatterns.commonPrefixes.length}` : ' 👤 Learning student patterns'}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              <Button 
                size="small" 
                onClick={runDiagnostics} 
                startIcon={<InfoIcon />}
                disabled={loading}
              >
                Diagnostics
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
      
      {/* Diagnostics Dialog */}
      <Dialog open={showDiagnostics} maxWidth="md" fullWidth>
        <DialogTitle>System Diagnostics</DialogTitle>
        <DialogContent>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
            {diagnosticMessage}
          </pre>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDiagnostics(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Fine Receipt Dialog */}
      <Dialog 
        open={fineReceipt.show} 
        maxWidth="md" 
        fullWidth
        onClose={handleCloseFineReceipt}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Fine Receipt</Typography>
            <Chip 
              color={fineReceipt.isPaid ? "success" : "error"} 
              label={fineReceipt.isPaid ? 
                `PAID: ₱${fineReceipt.totalAmount.toFixed(2)}` : 
                `UNPAID: ₱${fineReceipt.totalAmount.toFixed(2)}`} 
              variant="filled"
              icon={fineReceipt.isPaid ? <DoneIcon /> : <ClearIcon />}
              sx={{ fontWeight: 'bold' }} 
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Student: <strong>{fineReceipt.studentName}</strong>
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              Return Date: {fineReceipt.returnDate}
            </Typography>
            {fineReceipt.receiptNumber && (
              <Typography variant="subtitle2" color="success.main">
                Receipt Number: {fineReceipt.receiptNumber}
              </Typography>
            )}
          </Box>

          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Overdue Books
          </Typography>
          
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Book Title</TableCell>
                  <TableCell align="right">Days Overdue</TableCell>
                  <TableCell align="right">Fine Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fineReceipt.books.map((book, index) => (
                  <TableRow key={index}>
                    <TableCell>{book.title}</TableCell>
                    <TableCell align="right">{book.days}</TableCell>
                    <TableCell align="right">₱{book.fine.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={2} align="right" sx={{ fontWeight: 'bold' }}>
                    Total Fine:
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    ₱{fineReceipt.totalAmount.toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Alert severity={fineReceipt.isPaid ? "success" : "info"} sx={{ mb: 2 }}>
            {fineReceipt.isPaid 
              ? "Payment has been recorded. Thank you!" 
              : "The fine must be paid before the student can borrow new books."}
          </Alert>

        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFineReceipt}>Close</Button>
          <Button 
            onClick={handlePrintFineReceipt} 
            variant="contained" 
            color="primary"
            startIcon={<PrintIcon />}
          >
            Print Receipt
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog
        open={payFineDialogOpen}
        onClose={() => setPayFineDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Process Fine Payment
        </DialogTitle>
        <DialogContent>
          {currentFineRecord && (
            <>
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="subtitle1">
                  Overdue books have been returned
                </Typography>
                <Typography variant="body2">
                  A fine of ₱{currentFineRecord.amount.toFixed(2)} has been generated. Would you like to process the payment now?
                </Typography>
              </Alert>
              
              <Box sx={{ my: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Payment Details:
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                  ₱{currentFineRecord.amount.toFixed(2)}
                </Typography>
              </Box>
              
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Book</TableCell>
                      <TableCell align="right">Days Overdue</TableCell>
                      <TableCell align="right">Fine (₱)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentFineRecord.details.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.title}</TableCell>
                        <TableCell align="right">{item.days}</TableCell>
                        <TableCell align="right">{item.fine.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Typography variant="body2" color="text.secondary">
                Recording this payment will update the Fine Payments Inventory system.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setPayFineDialogOpen(false)} 
            color="inherit"
          >
            Pay Later
          </Button>
          <Button 
            onClick={handlePayFineImmediately} 
            variant="contained" 
            color="primary"
            startIcon={<MoneyIcon />}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "Process Payment Now"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BorrowReturn; 