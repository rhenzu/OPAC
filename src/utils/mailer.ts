// Interface for email data
export interface EmailData {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

interface BorrowedBook {
  title: string;
  author: string;
  accessionNumber: string;
}

interface OverdueBook extends BorrowedBook {
  dueDate: string;
  daysOverdue: number;
  fine: number;
}

interface OverdueRecord {
  studentEmail: string;
  studentName: string;
  books: OverdueBook[];
  totalFine: number;
}

const API_URL = 'http://localhost:3001'; // Update this if your server runs on a different port

/**
 * Send an email using the backend API
 * @param emailData The email data containing recipient(s), subject, and content
 * @returns Promise that resolves when email is sent
 */
export const sendEmail = async (emailData: EmailData): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to send email');
    }
    
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Send a notification email to a student
 * @param studentEmail Student's email address
 * @param studentName Student's name
 * @param subject Email subject
 * @param message Email message
 */
export const sendStudentNotification = async (
  studentEmail: string,
  studentName: string,
  subject: string,
  message: string
): Promise<void> => {
  try {
    await sendEmail({
      to: studentEmail,
      subject: subject,
      text: `Dear ${studentName},\n\n${message}\n\nBest regards,\nLibrary Management System`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976d2;">Library Notification</h2>
          <p>Dear ${studentName},</p>
          <div style="margin: 20px 0;">
            ${message}
          </div>
          <p style="margin-top: 30px;">Best regards,<br>Library Management System</p>
        </div>
      `
    });
  } catch (error) {
    console.error('Error sending student notification:', error);
    throw error;
  }
};

/**
 * Send a borrow confirmation email to a student
 * @param studentEmail Student's email address
 * @param studentName Student's name
 * @param books Array of borrowed books
 * @param dueDate Due date for the borrowed books
 */
export const sendBorrowNotification = async (
  studentEmail: string,
  studentName: string,
  books: BorrowedBook[],
  dueDate: string
): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/api/send-borrow-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studentEmail,
        studentName,
        books,
        dueDate
      })
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to send borrow notification');
    }
    
    console.log('Borrow notification sent successfully');
  } catch (error) {
    console.error('Error sending borrow notification:', error);
    throw error;
  }
};

/**
 * Send a return confirmation email to a student
 * @param studentEmail Student's email address
 * @param studentName Student's name
 * @param books Array of returned books
 * @param returnDate Return date
 * @param fineDetails Optional fine details if there are overdue books
 */
export const sendReturnNotification = async (
  studentEmail: string,
  studentName: string,
  books: { title: string; author: string; accessionNumber: string; condition: string; daysOverdue?: number; fine?: number }[],
  returnDate: string,
  fineDetails?: { totalAmount: number; isPaid: boolean }
): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/api/send-return-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studentEmail,
        studentName,
        books,
        returnDate,
        fineDetails
      })
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to send return notification');
    }
    
    console.log('Return notification sent successfully');
  } catch (error) {
    console.error('Error sending return notification:', error);
    throw error;
  }
};

/**
 * Send a registration confirmation email to a new student
 * @param studentEmail Student's email address
 * @param studentName Student's name
 * @param studentDetails Student registration details
 */
export const sendRegistrationConfirmation = async (
  studentEmail: string,
  studentName: string,
  studentDetails: {
    studentId: string;
    course: string;
    address: string;
  }
): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}/api/send-registration-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studentEmail,
        studentName,
        studentDetails
      })
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to send registration confirmation');
    }
    
    console.log('Registration confirmation sent successfully');
  } catch (error) {
    console.error('Error sending registration confirmation:', error);
    throw error;
  }
};

/**
 * Send an overdue notification email to a student
 * @param studentEmail Student's email address
 * @param studentName Student's name
 * @param books Array of overdue books
 * @param totalFine Total fine amount
 */
export const sendOverdueNotification = async (
  studentEmail: string,
  studentName: string,
  books: Array<{
    title: string;
    author: string;
    accessionNumber: string;
    dueDate: string;
    daysOverdue: number;
    fine: number;
  }>,
  totalFine: number
): Promise<void> => {
  try {
    // First try the local server if available
    if (window.location.origin.includes('localhost')) {
      try {
        const response = await fetch(`${API_URL}/api/send-overdue-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            studentEmail,
            studentName,
            books,
            totalFine
          })
        });

        const data = await response.json();
        
        if (data.success) {
          console.log('Overdue notification sent successfully via local server');
          return;
        } else {
          throw new Error(data.message || 'Failed to send overdue notification');
        }
      } catch (serverError) {
        console.warn('Local server failed, trying EmailJS fallback:', serverError);
        // Fall through to EmailJS fallback
      }
    }

    // Fallback to EmailJS using the announcement template
    console.log('Using EmailJS for overdue notification');
    const emailjs = (await import('@emailjs/browser')).default;
    
    const EMAILJS_SERVICE_ID = 'service_opac';
    const EMAILJS_TEMPLATE_ID = 'template_announcement'; // Use existing announcement template
    const EMAILJS_PUBLIC_KEY = 'iQTp8uIu4x7k4d43p';

    // Create the email content
    const booksList = books.map(book => 
      `• ${book.title} by ${book.author}
    Accession Number: ${book.accessionNumber}
    Due Date: ${new Date(book.dueDate).toLocaleDateString()}
    Days Overdue: ${book.daysOverdue}
    Fine: ₱${book.fine.toFixed(2)}`
    ).join('\n\n');

    const message = `Dear ${studentName},

Our records indicate that you have overdue book(s) from the library. Please return them as soon as possible to avoid additional fines.

OVERDUE BOOKS:
${booksList}

TOTAL FINE AMOUNT: ₱${totalFine.toFixed(2)}

IMPORTANT NOTICE:
• Please return the overdue items to the library as soon as possible
• Fines will continue to accumulate until books are returned
• Your borrowing privileges may be suspended until all overdue items are returned

If you have already returned these items, please disregard this notice and contact the library to resolve any discrepancies.

Best regards,
Library Management System`;

    const templateParams = {
      to_email: studentEmail,
      subject: '⚠️ Library Books Overdue Notice',
      message: message
    };

    const result = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    console.log('Overdue notification sent successfully via EmailJS:', result.status);
  } catch (error) {
    console.error('Error sending overdue notification:', error);
    throw error;
  }
};

export default {
  sendEmail,
  sendStudentNotification,
  sendBorrowNotification,
  sendReturnNotification,
  sendRegistrationConfirmation,
  sendOverdueNotification
}; 