import { ref, get } from 'firebase/database';
import { database } from '../firebase';
import { addNotification } from './notificationUtils';
import { createOverdueNotification } from './emailUtils';

interface Student {
  id: string;
  studentId: string;
  name: string;
}

interface Book {
  id: string;
  title: string;
  dueDate: string;
  daysOverdue: number;
  fine: number;
}

interface StudentWithOverdueBooks {
  studentId: string;
  name: string;
  overdueBooks: Book[];
}

/**
 * Check for overdue books and send notifications
 * @returns Promise with check results
 */
export const checkOverdueBooks = async (): Promise<{
  studentsWithOverdueBooks: StudentWithOverdueBooks[];
}> => {
  try {
    const studentsWithOverdueBooks: StudentWithOverdueBooks[] = [];
    
    // Get all borrows
    const borrowsRef = ref(database, 'borrows');
    const borrowsSnapshot = await get(borrowsRef);
    
    if (!borrowsSnapshot.exists()) {
      return { studentsWithOverdueBooks };
    }
    
    const borrows = borrowsSnapshot.val();
    const today = new Date();
    
    // Get all students
    const studentsRef = ref(database, 'students');
    const studentsSnapshot = await get(studentsRef);
    const students: Record<string, Student> = studentsSnapshot.exists() ? studentsSnapshot.val() : {};
    
    // Get all books
    const booksRef = ref(database, 'books');
    const booksSnapshot = await get(booksRef);
    const books = booksSnapshot.exists() ? booksSnapshot.val() : {};
    
    // Group overdue books by student
    const overdueByStudent = new Map<string, Book[]>();
    
    for (const [borrowId, borrow] of Object.entries(borrows)) {
      const { studentId, bookId, dueDate, returned } = borrow as any;
      
      if (!returned && new Date(dueDate) < today) {
        const book = books[bookId];
        if (book) {
          const daysOverdue = Math.ceil((today.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
          const fine = daysOverdue * 5; // Assuming ₱5 per day fine
          
          const overdueBook: Book = {
            id: bookId,
            title: book.title,
            dueDate,
            daysOverdue,
            fine
          };
          
          if (!overdueByStudent.has(studentId)) {
            overdueByStudent.set(studentId, []);
          }
          overdueByStudent.get(studentId)?.push(overdueBook);
        }
      }
    }
    
    // Create notifications for each student with overdue books
    Array.from(overdueByStudent.entries()).forEach(([studentId, overdueBooks]) => {
      const student = Object.values(students).find(s => s.studentId === studentId);
      
      if (student) {
        studentsWithOverdueBooks.push({
          studentId: student.studentId,
          name: student.name,
          overdueBooks
        });
        
        // Create and send notification
        createOverdueNotification(
          student.studentId,
          student.name,
          overdueBooks
        );
        
        // Add system notification
        const bookCount = overdueBooks.length;
        const bookText = bookCount === 1 ? '1 book' : `${bookCount} books`;
        
        addNotification(
          `Overdue Books`,
          `${student.name} has ${bookText} overdue`,
          'warning'
        );
      }
    });
    
    console.log(`Found ${studentsWithOverdueBooks.length} students with overdue books`);
    return { studentsWithOverdueBooks };
  } catch (error) {
    console.error('Error checking overdue books:', error);
    return { studentsWithOverdueBooks: [] };
  }
};

/**
 * Schedule regular checks for overdue books and send notifications
 * @param intervalHours How often to check for overdue books (in hours)
 * @returns The interval ID that can be used to clear the schedule
 */
export const scheduleOverdueChecks = (intervalHours = 24): NodeJS.Timeout => {
  console.log(`Scheduling overdue book checks every ${intervalHours} hours`);
  
  // Run once immediately
  checkOverdueBooks().catch(err => console.error('Error in scheduled overdue check:', err));
  
  // Then schedule regular checks
  const intervalMs = intervalHours * 60 * 60 * 1000;
  return setInterval(() => {
    checkOverdueBooks().catch(err => console.error('Error in scheduled overdue check:', err));
  }, intervalMs);
};

export default {
  checkOverdueBooks,
  scheduleOverdueChecks
}; 