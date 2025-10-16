// Interface for notification data
export interface NotificationData {
  studentId: string;
  studentName: string;
  message: string;
  type: 'borrow' | 'overdue' | 'return';
}

/**
 * Log a notification message
 * @param data Notification data object
 */
export const logNotification = (data: NotificationData) => {
  const timestamp = new Date().toLocaleString();
  console.log(`[${timestamp}] ${data.type.toUpperCase()} Notification for ${data.studentName} (ID: ${data.studentId}):`);
  console.log(data.message);
  console.log('-'.repeat(50));
};

/**
 * Create a borrowing notification
 * @param studentId Student ID
 * @param studentName Student name
 * @param books Array of borrowed book information
 * @param dueDate Due date for the borrowed books
 */
export const createBorrowingNotification = (
  studentId: string,
  studentName: string,
  books: { title: string; author: string; accessionNumber: string }[],
  dueDate: string
) => {
  const message = `
Books borrowed:
${books.map(book => `- ${book.title} by ${book.author} (Accession: ${book.accessionNumber})`).join('\n')}

Due Date: ${dueDate}

Please return these items by the due date to avoid overdue fines.`;

  logNotification({
    studentId,
    studentName,
    message,
    type: 'borrow'
  });
};

/**
 * Create an overdue notification
 * @param studentId Student ID
 * @param studentName Student name
 * @param books Array of overdue book information
 */
export const createOverdueNotification = (
  studentId: string,
  studentName: string,
  books: { title: string; dueDate: string; daysOverdue: number; fine: number }[]
) => {
  const totalFine = books.reduce((sum, book) => sum + book.fine, 0);

  const message = `
Overdue books:
${books.map(book => `- ${book.title} (Due: ${book.dueDate}, Overdue: ${book.daysOverdue} days, Fine: ₱${book.fine.toFixed(2)})`).join('\n')}

Total Fine: ₱${totalFine.toFixed(2)}

Please return these items as soon as possible to avoid additional fines.`;

  logNotification({
    studentId,
    studentName,
    message,
    type: 'overdue'
  });
};

/**
 * Create bulk overdue notifications
 * @param students Array of student information with their overdue books
 */
export const createBulkOverdueNotifications = (
  students: { 
    studentId: string;
    name: string; 
    books: { 
      title: string; 
      dueDate: string; 
      daysOverdue: number; 
      fine: number 
    }[] 
  }[]
) => {
  students.forEach(student => {
    createOverdueNotification(
      student.studentId,
      student.name,
      student.books
    );
  });
};

export default {
  logNotification,
  createBorrowingNotification,
  createOverdueNotification,
  createBulkOverdueNotifications
}; 