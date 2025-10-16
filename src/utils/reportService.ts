import { ref, get, query, orderByChild, startAt, endAt, equalTo } from 'firebase/database';
import { database } from '../firebase';

export interface BorrowRecord {
  id: string;
  bookId: string;
  studentId: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'borrowed' | 'returned' | 'overdue';
  returned: boolean;
  daysOverdue?: number;
  book?: {
    id: string;
    title: string;
    author: string;
    isbn: string;
    accessionNumber: string;
    category?: string;
  };
  student?: {
    id: string;
    name: string;
    email: string;
    course: string;
    studentId: string;
  };
}

export interface BookRecord {
  id: string;
  title: string;
  author: string;
  isbn: string;
  quantity: number;
  available: number;
  accessionNumber: string;
  category?: string;
  copyright?: string;
  publication?: string;
  pages?: number;
  createdAt?: number;
  status: 'available' | 'borrowed' | 'overdue';
}

export interface StudentRecord {
  id: string;
  name: string;
  email: string;
  course: string;
  studentId: string;
  barcode: string;
  totalBorrows?: number;
  activeBorrows?: number;
  overdueBooks?: number;
  totalFines?: number;
}

export interface FineRecord {
  id: string;
  studentId: string;
  studentName: string;
  course: string;
  bookId: string;
  bookTitle: string;
  dueDate: string;
  returnDate?: string;
  daysOverdue: number;
  fineAmount: number;
  paid: boolean;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  course: string;
  timestamp: string;
  date: string;
  barcode: string;
  status: 'present' | 'absent' | 'in' | 'out';
  studentIdNumber: string;
}

export class ReportService {
  // Borrowing Reports
  static async getCurrentBorrows(filters: Record<string, any> = {}): Promise<BorrowRecord[]> {
    try {
      const borrowsRef = ref(database, 'borrows');
      const snapshot = await get(borrowsRef);
      
      if (!snapshot.exists()) {
        return [];
      }

      const borrows = snapshot.val();
      const borrowRecords: BorrowRecord[] = [];

      for (const [id, borrow] of Object.entries(borrows)) {
        const borrowData = borrow as any;
        
        // Skip returned books
        if (borrowData.returned) continue;

        // Apply status filter
        if (filters.status && filters.status !== 'All') {
          if (filters.status === 'Borrowed' && borrowData.status !== 'borrowed') continue;
          if (filters.status === 'Overdue' && borrowData.status !== 'overdue') continue;
        }

        // Apply student ID filter
        if (filters.studentId && !borrowData.studentId.includes(filters.studentId)) continue;

        // Apply date range filter
        if (filters.dateRange_start || filters.dateRange_end) {
          const borrowDate = new Date(borrowData.borrowDate);
          
          if (filters.dateRange_start) {
            const startDate = new Date(filters.dateRange_start);
            if (borrowDate < startDate) continue;
          }
          
          if (filters.dateRange_end) {
            const endDate = new Date(filters.dateRange_end);
            endDate.setHours(23, 59, 59, 999); // Include the entire end date
            if (borrowDate > endDate) continue;
          }
        }

        // Fetch book details
        const bookRef = ref(database, `books/${borrowData.bookId}`);
        const bookSnapshot = await get(bookRef);
        let book = null;
        if (bookSnapshot.exists()) {
          book = {
            id: borrowData.bookId,
            ...bookSnapshot.val()
          };
        }

        // Fetch student details
        const studentRef = ref(database, `students/${borrowData.studentId}`);
        const studentSnapshot = await get(studentRef);
        let student = null;
        if (studentSnapshot.exists()) {
          student = {
            id: borrowData.studentId,
            ...studentSnapshot.val()
          };
        }

        borrowRecords.push({
          id,
          ...borrowData,
          book,
          student,
        });
      }

      return borrowRecords.sort((a, b) => new Date(b.borrowDate).getTime() - new Date(a.borrowDate).getTime());
    } catch (error) {
      console.error('Error fetching current borrows:', error);
      return [];
    }
  }

  static async getOverdueBooks(filters: Record<string, any> = {}): Promise<BorrowRecord[]> {
    try {
      const borrowsRef = ref(database, 'borrows');
      const snapshot = await get(borrowsRef);
      
      if (!snapshot.exists()) {
        return [];
      }

      const borrows = snapshot.val();
      const overdueRecords: BorrowRecord[] = [];

      for (const [id, borrow] of Object.entries(borrows)) {
        const borrowData = borrow as any;
        
        // Skip returned books and non-overdue books
        if (borrowData.returned || borrowData.status !== 'overdue') continue;

        // Apply days overdue filter
        if (filters.daysOverdue) {
          const daysOverdue = borrowData.daysOverdue || 0;
          if (daysOverdue < parseInt(filters.daysOverdue)) continue;
        }

        // Apply student ID filter
        if (filters.studentId && !borrowData.studentId.includes(filters.studentId)) continue;

        // Fetch book details
        const bookRef = ref(database, `books/${borrowData.bookId}`);
        const bookSnapshot = await get(bookRef);
        let book = null;
        if (bookSnapshot.exists()) {
          book = {
            id: borrowData.bookId,
            ...bookSnapshot.val()
          };
        }

        // Fetch student details
        const studentRef = ref(database, `students/${borrowData.studentId}`);
        const studentSnapshot = await get(studentRef);
        let student = null;
        if (studentSnapshot.exists()) {
          student = {
            id: borrowData.studentId,
            ...studentSnapshot.val()
          };
        }

        overdueRecords.push({
          id,
          ...borrowData,
          book,
          student,
        });
      }

      return overdueRecords.sort((a, b) => (b.daysOverdue || 0) - (a.daysOverdue || 0));
    } catch (error) {
      console.error('Error fetching overdue books:', error);
      return [];
    }
  }

  static async getBorrowingHistory(filters: Record<string, any> = {}): Promise<BorrowRecord[]> {
    try {
      const borrowsRef = ref(database, 'borrows');
      const snapshot = await get(borrowsRef);
      
      if (!snapshot.exists()) {
        return [];
      }

      const borrows = snapshot.val();
      const historyRecords: BorrowRecord[] = [];

      for (const [id, borrow] of Object.entries(borrows)) {
        const borrowData = borrow as any;

        // Apply status filter
        if (filters.status && filters.status !== 'All') {
          if (filters.status === 'Borrowed' && borrowData.status !== 'borrowed') continue;
          if (filters.status === 'Returned' && borrowData.status !== 'returned') continue;
          if (filters.status === 'Overdue' && borrowData.status !== 'overdue') continue;
        }

        // Apply student ID filter
        if (filters.studentId && !borrowData.studentId.includes(filters.studentId)) continue;

        // Apply book title filter
        if (filters.bookId) {
          // We'll need to fetch book details to check title
          const bookRef = ref(database, `books/${borrowData.bookId}`);
          const bookSnapshot = await get(bookRef);
          if (bookSnapshot.exists()) {
            const book = bookSnapshot.val();
            if (!book.title.toLowerCase().includes(filters.bookId.toLowerCase())) continue;
          }
        }

        // Apply date range filter
        if (filters.dateRange_start || filters.dateRange_end) {
          const borrowDate = new Date(borrowData.borrowDate);
          
          if (filters.dateRange_start) {
            const startDate = new Date(filters.dateRange_start);
            if (borrowDate < startDate) continue;
          }
          
          if (filters.dateRange_end) {
            const endDate = new Date(filters.dateRange_end);
            endDate.setHours(23, 59, 59, 999); // Include the entire end date
            if (borrowDate > endDate) continue;
          }
        }

        // Fetch book details
        const bookRef = ref(database, `books/${borrowData.bookId}`);
        const bookSnapshot = await get(bookRef);
        let book = null;
        if (bookSnapshot.exists()) {
          book = {
            id: borrowData.bookId,
            ...bookSnapshot.val()
          };
        }

        // Fetch student details
        const studentRef = ref(database, `students/${borrowData.studentId}`);
        const studentSnapshot = await get(studentRef);
        let student = null;
        if (studentSnapshot.exists()) {
          student = {
            id: borrowData.studentId,
            ...studentSnapshot.val()
          };
        }

        historyRecords.push({
          id,
          ...borrowData,
          book,
          student,
        });
      }

      return historyRecords.sort((a, b) => new Date(b.borrowDate).getTime() - new Date(a.borrowDate).getTime());
    } catch (error) {
      console.error('Error fetching borrowing history:', error);
      return [];
    }
  }

  static async getPopularBooks(filters: Record<string, any> = {}): Promise<any[]> {
    try {
      const borrowsRef = ref(database, 'borrows');
      const snapshot = await get(borrowsRef);
      
      if (!snapshot.exists()) {
        return [];
      }

      const borrows = snapshot.val();
      const bookBorrowCounts: Record<string, { book: any; count: number; lastBorrowed: string }> = {};

      for (const [id, borrow] of Object.entries(borrows)) {
        const borrowData = borrow as any;

        // Apply date range filter
        if (filters.dateRange) {
          const borrowDate = new Date(borrowData.borrowDate);
          const filterDate = new Date(filters.dateRange);
          if (borrowDate < filterDate) continue;
        }

        if (!bookBorrowCounts[borrowData.bookId]) {
          // Fetch book details
          const bookRef = ref(database, `books/${borrowData.bookId}`);
          const bookSnapshot = await get(bookRef);
          if (bookSnapshot.exists()) {
            bookBorrowCounts[borrowData.bookId] = {
              book: {
                id: borrowData.bookId,
                ...bookSnapshot.val()
              },
              count: 0,
              lastBorrowed: borrowData.borrowDate
            };
          }
        }

        bookBorrowCounts[borrowData.bookId].count++;
        if (new Date(borrowData.borrowDate) > new Date(bookBorrowCounts[borrowData.bookId].lastBorrowed)) {
          bookBorrowCounts[borrowData.bookId].lastBorrowed = borrowData.borrowDate;
        }
      }

      const popularBooks = Object.values(bookBorrowCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, filters.limit ? parseInt(filters.limit) : 10);

      return popularBooks;
    } catch (error) {
      console.error('Error fetching popular books:', error);
      return [];
    }
  }

  // Inventory Reports
  static async getBookCatalog(filters: Record<string, any> = {}): Promise<BookRecord[]> {
    try {
      const booksRef = ref(database, 'books');
      const snapshot = await get(booksRef);
      
      if (!snapshot.exists()) {
        return [];
      }

      const books = snapshot.val();
      const bookRecords: BookRecord[] = [];

      for (const [id, book] of Object.entries(books)) {
        const bookData = book as any;

        // Apply category filter
        if (filters.category && filters.category !== 'All') {
          if (bookData.category !== filters.category) continue;
        }

        // Apply program filter
        if (filters.program && filters.program !== 'All') {
          if (bookData.program !== filters.program) continue;
        }

        // Apply author filter
        if (filters.author && !bookData.author.toLowerCase().includes(filters.author.toLowerCase())) continue;

        // Apply availability filter
        if (filters.status && filters.status !== 'All') {
          if (filters.status === 'Available' && bookData.available === 0) continue;
          if (filters.status === 'Borrowed' && bookData.available > 0) continue;
        }

        // Determine book status
        let status: 'available' | 'borrowed' | 'overdue' = 'available';
        if (bookData.available === 0) {
          status = 'borrowed';
        }

        bookRecords.push({
          id,
          ...bookData,
          status,
        });
      }

      return bookRecords.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (error) {
      console.error('Error fetching book catalog:', error);
      return [];
    }
  }

  // Student Reports
  static async getStudentActivity(filters: Record<string, any> = {}): Promise<StudentRecord[]> {
    try {
      const studentsRef = ref(database, 'students');
      const studentsSnapshot = await get(studentsRef);
      
      if (!studentsSnapshot.exists()) {
        return [];
      }

      const students = studentsSnapshot.val();
      const studentRecords: StudentRecord[] = [];

      for (const [id, student] of Object.entries(students)) {
        const studentData = student as any;

        // Apply course filter
        if (filters.course && !studentData.course.toLowerCase().includes(filters.course.toLowerCase())) continue;

        // Apply student ID filter
        if (filters.studentId && !studentData.studentId.includes(filters.studentId)) continue;

        // Get borrowing statistics
        const borrowsRef = ref(database, 'borrows');
        const borrowsSnapshot = await get(borrowsRef);
        let totalBorrows = 0;
        let activeBorrows = 0;
        let overdueBooks = 0;

        if (borrowsSnapshot.exists()) {
          const borrows = borrowsSnapshot.val();
          for (const borrow of Object.values(borrows)) {
            const borrowData = borrow as any;
            if (borrowData.studentId === id) {
              // Apply date range filter for student activity
              if (filters.dateRange_start || filters.dateRange_end) {
                const borrowDate = new Date(borrowData.borrowDate);
                
                if (filters.dateRange_start) {
                  const startDate = new Date(filters.dateRange_start);
                  if (borrowDate < startDate) continue;
                }
                
                if (filters.dateRange_end) {
                  const endDate = new Date(filters.dateRange_end);
                  endDate.setHours(23, 59, 59, 999); // Include the entire end date
                  if (borrowDate > endDate) continue;
                }
              }
              
              totalBorrows++;
              if (!borrowData.returned) {
                activeBorrows++;
                if (borrowData.status === 'overdue') {
                  overdueBooks++;
                }
              }
            }
          }
        }

        // Get fines
        const finesRef = ref(database, 'fines');
        const finesSnapshot = await get(finesRef);
        let totalFines = 0;

        if (finesSnapshot.exists()) {
          const fines = finesSnapshot.val();
          for (const fine of Object.values(fines)) {
            const fineData = fine as any;
            if (fineData.studentId === id && !fineData.paid) {
              totalFines += fineData.fineAmount || 0;
            }
          }
        }

        studentRecords.push({
          id,
          ...studentData,
          totalBorrows,
          activeBorrows,
          overdueBooks,
          totalFines,
        });
      }

      return studentRecords.sort((a, b) => (b.totalBorrows || 0) - (a.totalBorrows || 0));
    } catch (error) {
      console.error('Error fetching student activity:', error);
      return [];
    }
  }

  // Financial Reports
  static async getFinesCollection(filters: Record<string, any> = {}): Promise<FineRecord[]> {
    try {
      const finesRef = ref(database, 'fines');
      const snapshot = await get(finesRef);
      
      if (!snapshot.exists()) {
        return [];
      }

      const fines = snapshot.val();
      const fineRecords: FineRecord[] = [];

      for (const [id, fine] of Object.entries(fines)) {
        const fineData = fine as any;

        // Apply date range filter
        if (filters.dateRange_start || filters.dateRange_end) {
          const fineDate = new Date(fineData.createdAt);
          
          if (filters.dateRange_start) {
            const startDate = new Date(filters.dateRange_start);
            if (fineDate < startDate) continue;
          }
          
          if (filters.dateRange_end) {
            const endDate = new Date(filters.dateRange_end);
            endDate.setHours(23, 59, 59, 999); // Include the entire end date
            if (fineDate > endDate) continue;
          }
        }

        // Apply payment status filter
        if (filters.status && filters.status !== 'All') {
          if (filters.status === 'Paid' && !fineData.paid) continue;
          if (filters.status === 'Unpaid' && fineData.paid) continue;
        }

        // Apply student ID filter
        if (filters.studentId && !fineData.studentId.includes(filters.studentId)) continue;

        fineRecords.push({
          id,
          ...fineData,
        });
      }

      return fineRecords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error('Error fetching fines collection:', error);
      return [];
    }
  }

  // Attendance Reports
  static async getDailyAttendance(filters: Record<string, any> = {}): Promise<AttendanceRecord[]> {
    try {
      const attendanceRef = ref(database, 'attendance');
      const snapshot = await get(attendanceRef);
      
      if (!snapshot.exists()) {
        return [];
      }

      const attendance = snapshot.val();
      const attendanceRecords: AttendanceRecord[] = [];

      for (const [id, record] of Object.entries(attendance)) {
        const recordData = record as any;

        // Apply date range filter
        if (filters.dateRange_start || filters.dateRange_end) {
          const recordDate = new Date(recordData.date);
          
          if (filters.dateRange_start) {
            const startDate = new Date(filters.dateRange_start);
            if (recordDate < startDate) continue;
          }
          
          if (filters.dateRange_end) {
            const endDate = new Date(filters.dateRange_end);
            endDate.setHours(23, 59, 59, 999); // Include the entire end date
            if (recordDate > endDate) continue;
          }
        }

        // Apply course filter
        if (filters.course && !recordData.course.toLowerCase().includes(filters.course.toLowerCase())) continue;

        // Apply status filter
        if (filters.status && filters.status !== 'All') {
          if (recordData.status !== filters.status.toLowerCase()) continue;
        }

        attendanceRecords.push({
          id,
          ...recordData,
        });
      }

      return attendanceRecords.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Error fetching daily attendance:', error);
      return [];
    }
  }

  static async getAttendanceSummary(filters: Record<string, any> = {}): Promise<any[]> {
    try {
      const attendanceRecords = await this.getDailyAttendance(filters);
      
      // Group by the specified criteria
      const groupBy = filters.groupBy || 'Daily';
      const groupedData: Record<string, any> = {};

      attendanceRecords.forEach(record => {
        let key = '';
        const date = new Date(record.date);
        
        switch (groupBy) {
          case 'Daily':
            key = record.date;
            break;
          case 'Weekly':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toISOString().split('T')[0];
            break;
          case 'Monthly':
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            break;
          case 'Course':
            key = record.course;
            break;
          default:
            key = record.date;
        }

        if (!groupedData[key]) {
          groupedData[key] = {
            period: key,
            total: 0,
            present: 0,
            absent: 0,
            checkedIn: 0,
            checkedOut: 0,
            courses: new Set(),
          };
        }

        groupedData[key].total++;
        groupedData[key].courses.add(record.course);

        switch (record.status) {
          case 'present':
            groupedData[key].present++;
            break;
          case 'absent':
            groupedData[key].absent++;
            break;
          case 'in':
            groupedData[key].checkedIn++;
            break;
          case 'out':
            groupedData[key].checkedOut++;
            break;
        }
      });

      return Object.values(groupedData).map(item => {
        return {
          period: item.period,
          total: item.total,
          present: item.present,
          absent: item.absent,
          checkedIn: item.checkedIn,
          checkedOut: item.checkedOut,
          courses: Array.from(item.courses),
        };
      });
    } catch (error) {
      console.error('Error fetching attendance summary:', error);
      return [];
    }
  }
}
