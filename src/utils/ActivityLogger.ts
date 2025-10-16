import { database } from '../firebase';
import { ref, push, serverTimestamp } from 'firebase/database';

// Ensure this file is treated as a module
export {}

export type ActivityType = 'borrow' | 'return' | 'add_book' | 'add_student';

interface ActivityRecord {
  type: ActivityType;
  timestamp: string;
  bookId?: string;
  bookTitle?: string;
  studentId?: string;
  studentName?: string;
  userId?: string;
  details?: Record<string, any>;
}

const logActivity = async (activity: Omit<ActivityRecord, 'timestamp'>) => {
  try {
    const activitiesRef = ref(database, 'activities');
    
    // Add the current timestamp
    const activityWithTimestamp: ActivityRecord = {
      ...activity,
      timestamp: new Date().toISOString(),
    };
    
    await push(activitiesRef, activityWithTimestamp);
    console.log(`Activity logged: ${activity.type}`);
    return true;
  } catch (error) {
    console.error('Error logging activity:', error);
    return false;
  }
};

export const logBorrowActivity = async (
  bookId: string, 
  bookTitle: string, 
  studentId: string, 
  studentName: string,
  userId?: string
) => {
  return logActivity({
    type: 'borrow',
    bookId,
    bookTitle,
    studentId,
    studentName,
    userId
  });
};

export const logReturnActivity = async (
  bookId: string, 
  bookTitle: string, 
  studentId: string, 
  studentName: string,
  condition?: string,
  userId?: string
) => {
  return logActivity({
    type: 'return',
    bookId,
    bookTitle,
    studentId,
    studentName,
    userId,
    details: { condition }
  });
};

export const logAddBookActivity = async (
  bookId: string,
  bookTitle: string,
  userId?: string
) => {
  return logActivity({
    type: 'add_book',
    bookId,
    bookTitle,
    userId
  });
};

export const logAddStudentActivity = async (
  studentId: string,
  studentName: string,
  userId?: string
) => {
  return logActivity({
    type: 'add_student',
    studentId,
    studentName,
    userId
  });
};

const ActivityLogger = {
  logBorrowActivity,
  logReturnActivity,
  logAddBookActivity,
  logAddStudentActivity
};

export default ActivityLogger; 