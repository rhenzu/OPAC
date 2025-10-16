import { ref, get, update, push, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../firebase';
import { addFinesNotification } from './notificationUtils';

/**
 * Interface for borrowed book records
 */
interface BorrowRecord {
  id?: string;
  bookId: string;
  studentId: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'borrowed' | 'returned' | 'overdue';
  returned: boolean;
  daysOverdue?: number;
}

/**
 * Interface for student data
 */
interface Student {
  id: string;
  name: string;
  studentId: string;
  course: string;
  email?: string;
}

/**
 * Interface for book data
 */
interface Book {
  id: string;
  title: string;
  author: string;
  accessionNumber: string;
}

/**
 * Interface for fine records
 */
interface FineRecord {
  id?: string;
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

/**
 * Calculate and update fines for all overdue books
 * @returns The number of fines processed
 */
export const calculateAndUpdateFines = async (): Promise<number> => {
  try {
    // Get library rules for fine calculation
    const rulesRef = ref(database, 'librarySettings');
    const rulesSnapshot = await get(rulesRef);
    const libraryRules = rulesSnapshot.exists() 
      ? rulesSnapshot.val() 
      : { finePerDay: 5 }; // Default to 5 pesos per day
    
    // Get all borrow records
    const borrowsRef = ref(database, 'borrows');
    const borrowsSnapshot = await get(borrowsRef);
    
    if (!borrowsSnapshot.exists()) {
      return 0;
    }
    
    // Get existing fines to avoid duplicates
    const finesRef = ref(database, 'fines');
    const finesSnapshot = await get(finesRef);
    const existingFines: Record<string, FineRecord> = finesSnapshot.exists() ? finesSnapshot.val() : {};
    
    const borrows = borrowsSnapshot.val() as Record<string, BorrowRecord>;
    const today = new Date();
    const fineUpdates: Record<string, any> = {};
    const newFines: FineRecord[] = [];
    
    // First update overdue status for all borrows
    const statusUpdates: Record<string, any> = {};
    
    for (const [borrowId, borrow] of Object.entries(borrows)) {
      const dueDate = new Date(borrow.dueDate);
      
      // Skip if already returned
      if (borrow.returned) continue;
      
      // Check if overdue
      if (today > dueDate && borrow.status !== 'overdue') {
        statusUpdates[`borrows/${borrowId}/status`] = 'overdue';
        // Update local borrow object to reflect the status change
        borrow.status = 'overdue';
      }
    }
    
    // Apply status updates if needed
    if (Object.keys(statusUpdates).length > 0) {
      console.log(`Updating ${Object.keys(statusUpdates).length} borrows to overdue status`);
      await update(ref(database), statusUpdates);
    }
    
    // Now calculate fines for all overdue books
    let processedCount = 0;
    for (const [borrowId, borrow] of Object.entries(borrows)) {
      const dueDate = new Date(borrow.dueDate);
      const returnDate = borrow.returnDate ? new Date(borrow.returnDate) : null;
      
      // Check for overdue status - process both returned overdue books AND current overdue books
      const isOverdue = borrow.status === 'overdue' || 
                        (returnDate && returnDate.getTime() > dueDate.getTime()) || 
                        (!returnDate && today.getTime() > dueDate.getTime());
      
      // Skip if not overdue
      if (!isOverdue) {
        console.log(`Book ID ${borrow.bookId} is not overdue. Status: ${borrow.status}, Due date: ${dueDate.toISOString()}, Today: ${today.toISOString()}`);
        continue;
      }

      console.log(`Found overdue book ID ${borrow.bookId} for student ${borrow.studentId}. Days overdue: ${Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))}`);
      
      // Calculate days overdue
      const endDate = returnDate || today;
      const daysOverdue = Math.max(0, Math.floor((endDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Only process if there are actual days overdue
      if (daysOverdue > 0) {
        processedCount++;
        console.log(`Processing fine for borrowId: ${borrowId}, days overdue: ${daysOverdue}`);
        
        // Get student details
        const studentRef = ref(database, `students/${borrow.studentId}`);
        const studentSnapshot = await get(studentRef);
        
        if (!studentSnapshot.exists()) {
          console.log(`Student ID ${borrow.studentId} not found, skipping fine`);
          continue;
        }
        
        const student: Student = {
          id: borrow.studentId,
          ...studentSnapshot.val()
        };
        
        // Get book details
        const bookRef = ref(database, `books/${borrow.bookId}`);
        const bookSnapshot = await get(bookRef);
        
        if (!bookSnapshot.exists()) {
          console.log(`Book ID ${borrow.bookId} not found, skipping fine`);
          continue;
        }
        
        const book: Book = {
          id: borrow.bookId,
          ...bookSnapshot.val()
        };
        
        // Check if this borrow already has a fine
        const existingFineEntry = Object.entries(existingFines).find(([_, fine]) => 
          fine.studentId === borrow.studentId && 
          fine.bookId === borrow.bookId && 
          fine.dueDate === borrow.dueDate
        );
        
        if (existingFineEntry) {
          const [fineId, existingFine] = existingFineEntry;
          const fineAmount = daysOverdue * libraryRules.finePerDay;
          
          // Only update if fine amount has changed or return status has changed
          if (existingFine.fineAmount !== fineAmount || 
              (returnDate && !existingFine.returnDate)) {
            
            const updatedFine = {
              ...existingFine,
              daysOverdue,
              fineAmount,
              returnDate: returnDate ? returnDate.toISOString() : existingFine.returnDate
            };
            
            fineUpdates[`fines/${fineId}`] = updatedFine;
            console.log(`Updating existing fine ${fineId} to amount: ₱${fineAmount}`);
          }
        } else {
          // Create new fine record
          const fineAmount = daysOverdue * libraryRules.finePerDay;
          
          const newFine: FineRecord = {
            studentId: borrow.studentId,
            studentName: student.name,
            course: student.course,
            bookId: borrow.bookId,
            bookTitle: book.title,
            dueDate: borrow.dueDate,
            returnDate: returnDate ? returnDate.toISOString() : undefined,
            daysOverdue,
            fineAmount,
            paid: false,
            createdAt: new Date().toISOString()
          };
          
          newFines.push(newFine);
          console.log(`Creating new fine for ${student.name}, book: ${book.title}, amount: ₱${fineAmount}`);
        }
        
        // Also update the borrow record with days overdue
        fineUpdates[`borrows/${borrowId}/daysOverdue`] = daysOverdue;
      }
    }
    
    // Update existing fines
    if (Object.keys(fineUpdates).length > 0) {
      console.log(`Updating ${Object.keys(fineUpdates).length} records in the database`);
      await update(ref(database), fineUpdates);
    }
    
    // Create new fines
    for (const newFine of newFines) {
      console.log(`Creating new fine for student: ${newFine.studentName}, amount: ₱${newFine.fineAmount}`);
      const newFineRef = ref(database, 'fines');
      const fineId = await push(newFineRef, newFine).key;
      
      if (fineId) {
        // Create a notification for the new fine
        await addFinesNotification(
          'Added',
          newFine.studentName,
          newFine.fineAmount
        );
      }
    }
    
    return Object.keys(fineUpdates).length + newFines.length;
  } catch (error) {
    console.error('Error calculating fines:', error);
    return 0;
  }
};

/**
 * Get total fines for a student
 * @param studentId The student ID to check
 * @returns Total unpaid fines amount
 */
export const getStudentTotalFines = async (studentId: string): Promise<number> => {
  try {
    const finesRef = query(
      ref(database, 'fines'),
      orderByChild('studentId'),
      equalTo(studentId)
    );
    
    const snapshot = await get(finesRef);
    
    if (!snapshot.exists()) {
      return 0;
    }
    
    const fines = snapshot.val();
    let totalFines = 0;
    
    for (const fineId in fines) {
      const fine = fines[fineId];
      if (!fine.paid) {
        totalFines += fine.fineAmount;
      }
    }
    
    return totalFines;
  } catch (error) {
    console.error('Error getting student fines:', error);
    return 0;
  }
};

/**
 * Check if a student has any unpaid fines
 * @param studentId The student ID to check
 * @returns True if the student has unpaid fines
 */
export const hasUnpaidFines = async (studentId: string): Promise<boolean> => {
  const totalFines = await getStudentTotalFines(studentId);
  return totalFines > 0;
}; 