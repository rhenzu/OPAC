import { ref, push, serverTimestamp } from 'firebase/database';
import { database } from '../firebase';
import emailjs from '@emailjs/browser';

// EmailJS service configuration 
const EMAILJS_SERVICE_ID = 'service_opac'; // Update with your actual EmailJS service ID
const EMAILJS_TEMPLATE_ID = 'template_announcement'; // Update with your actual template ID for announcements
const EMAILJS_REGISTRATION_TEMPLATE_ID = 'template_registration'; // Update with your actual template ID for registration
const EMAILJS_PUBLIC_KEY = 'iQTp8uIu4x7k4d43p'; // Update with your actual public key

/**
 * Creates a fetch request with a timeout
 * @param url The URL to fetch
 * @param options Fetch options
 * @param timeout Timeout in milliseconds
 * @returns Promise resolving to the fetch response
 */
const fetchWithTimeout = (url: string, options: RequestInit, timeout = 10000) => {
  return Promise.race([
    fetch(url, options),
    new Promise<Response>((_, reject) => 
      setTimeout(() => reject(new Error(`Request timed out after ${timeout}ms`)), timeout)
    ) as Promise<Response>
  ]);
};

/**
 * Add a notification to the system
 * @param title Notification title
 * @param message Notification message
 * @param type Type of notification (info, warning, error, success)
 * @param link Optional link to navigate to when clicked
 */
export const addNotification = async (
  title: string,
  message: string,
  type: 'info' | 'warning' | 'error' | 'success',
  link?: string
) => {
  try {
    const notificationsRef = ref(database, 'notifications');
    await push(notificationsRef, {
      title,
      message,
      type,
      link,
      read: false,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error adding notification:', error);
  }
};

/**
 * Add an info notification
 */
export const addInfoNotification = (title: string, message: string, link?: string) => {
  return addNotification(title, message, 'info', link);
};

/**
 * Add a success notification
 */
export const addSuccessNotification = (title: string, message: string, link?: string) => {
  return addNotification(title, message, 'success', link);
};

/**
 * Add a warning notification
 */
export const addWarningNotification = (title: string, message: string, link?: string) => {
  return addNotification(title, message, 'warning', link);
};

/**
 * Add an error notification
 */
export const addErrorNotification = (title: string, message: string, link?: string) => {
  return addNotification(title, message, 'error', link);
};

/**
 * Add a book-related notification
 */
export const addBookNotification = (action: string, bookTitle: string) => {
  return addSuccessNotification(
    'Book ' + action,
    `The book "${bookTitle}" was successfully ${action.toLowerCase()}.`,
    '/admin/books'
  );
};

/**
 * Add a student-related notification
 */
export const addStudentNotification = (action: string, studentName: string) => {
  return addSuccessNotification(
    'Student ' + action,
    `The student "${studentName}" was successfully ${action.toLowerCase()}.`,
    '/admin/students'
  );
};

/**
 * Add a borrowing-related notification
 */
export const addBorrowingNotification = (action: string, bookTitle: string, studentName: string) => {
  return addSuccessNotification(
    'Book ' + action,
    `The book "${bookTitle}" was successfully ${action.toLowerCase()} by ${studentName}.`,
    '/admin/borrow-return'
  );
};

/**
 * Add a fines-related notification
 */
export const addFinesNotification = (action: string, studentName: string, amount: number) => {
  return addSuccessNotification(
    'Fine ' + action,
    `A fine of $${amount.toFixed(2)} was ${action.toLowerCase()} for ${studentName}.`,
    '/admin/fines'
  );
};

/**
 * Create demo notifications for testing the notification system
 */
export const createDemoNotifications = async () => {
  // Only create demo notifications if there are none in the database
  try {
    const notificationsRef = ref(database, 'notifications');
    const snapshot = await push(notificationsRef, {
      title: 'Welcome to the Library System',
      message: 'The notification system is now active. You will receive updates here.',
      type: 'info',
      link: '/admin',
      read: false,
      timestamp: Date.now(),
    });
    
    // Add some delay between notifications for better ux
    setTimeout(async () => {
      await push(notificationsRef, {
        title: 'Book Due Soon',
        message: 'Two books will be due in the next 3 days',
        type: 'warning',
        link: '/admin/borrowed-books',
        read: false,
        timestamp: Date.now() - 1000 * 60 * 5, // 5 minutes ago
      });
    }, 500);
    
    setTimeout(async () => {
      await push(notificationsRef, {
        title: 'New Feature Available',
        message: 'You can now print student ID cards directly from the student profile',
        type: 'success',
        link: '/admin/students',
        read: false,
        timestamp: Date.now() - 1000 * 60 * 30, // 30 minutes ago
      });
    }, 1000);
  } catch (error) {
    console.error('Error creating demo notifications:', error);
  }
};

/**
 * Fallback method to send a registration email using EmailJS
 * This is used when the primary server method fails
 */
const sendRegistrationEmailViaEmailJS = async (
  studentEmail: string,
  studentName: string,
  studentDetails: {
    studentId: string;
    course: string;
    yearLevel: string;
    section?: string;
    address?: string;
    registrationDate: string;
  }
): Promise<{ 
  success: boolean; 
  message: string;
  error?: string;
}> => {
  try {
    const templateParams = {
      to_email: studentEmail,
      student_name: studentName,
      student_id: studentDetails.studentId,
      course: studentDetails.course,
      year_level: studentDetails.yearLevel,
      section: studentDetails.section || 'N/A',
      address: studentDetails.address || 'N/A',
      registration_date: studentDetails.registrationDate
    };
    
    const result = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_REGISTRATION_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );
    
    console.log('EmailJS sent registration email to:', studentEmail, 'Status:', result.status);
    
    return {
      success: true,
      message: 'Registration email sent successfully using fallback method'
    };
  } catch (error) {
    console.error('Error in EmailJS fallback method for registration:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error in fallback method';
    return {
      success: false,
      error: errorMessage,
      message: `Error in fallback method: ${errorMessage}`
    };
  }
};

/**
 * Send a registration confirmation email to a student
 * @param studentEmail Student's email address
 * @param studentName Student's name
 * @param studentDetails Student details (studentId, course, yearLevel, etc.)
 * @returns Promise resolving to the email sending result
 */
export const sendRegistrationEmail = async (
  studentEmail: string,
  studentName: string,
  studentDetails: {
    studentId: string;
    course: string;
    yearLevel: string;
    section?: string;
    address?: string;
    registrationDate: string;
  }
): Promise<{ 
  success: boolean; 
  message?: string;
  error?: string;
  result?: any;
}> => {
  try {
    // Make sure we have a valid email address
    if (!studentEmail || !studentEmail.includes('@')) {
      return { 
        success: false, 
        error: 'Invalid email address' 
      };
    }
    
    console.log('Sending registration email to:', studentEmail);
    
    // Get the base URL dynamically or use the server URL directly to avoid CORS issues
    const baseUrl = window.location.origin.includes('localhost') 
      ? 'http://localhost:3001' 
      : 'https://us-central1-opacfinal.cloudfunctions.net'; // Using Firebase Functions
    
    // Add additional error handling and logging
    console.log('Sending registration email using base URL:', baseUrl);
    
    try {
      // Use the fetchWithTimeout helper with a 10 second timeout
      const response = await fetchWithTimeout(
        `${baseUrl}/api/send-registration-confirmation`, 
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            studentEmail,
            studentName,
            studentDetails: {
              studentId: studentDetails.studentId,
              course: studentDetails.course,
              yearLevel: studentDetails.yearLevel,
              section: studentDetails.section || '',
              address: studentDetails.address || '',
              registrationDate: studentDetails.registrationDate
            }
          }),
        },
        10000 // 10 second timeout
      );

      // Check content type before parsing as JSON
      const contentType = response.headers.get('content-type');
      let emailResult;
      
      if (contentType && contentType.includes('application/json')) {
        try {
          emailResult = await response.json();
        } catch (jsonError) {
          console.error('Failed to parse JSON response:', jsonError);
          const text = await response.text();
          console.error('Raw response:', text.substring(0, 150) + '...');
          throw new Error('Failed to parse server response as JSON');
        }
      } else {
        // For non-JSON responses, use text instead
        try {
          const text = await response.text();
          console.error('Received non-JSON response:', text.substring(0, 150) + '...');
          throw new Error('Server returned non-JSON response');
        } catch (textError) {
          console.error('Failed to read response text:', textError);
          throw new Error('Failed to read server response');
        }
      }
      
      if (!response.ok) {
        throw new Error(emailResult?.message || 'Failed to send registration email');
      }
      
      console.log('Email sending result:', emailResult);
      return { success: true, result: emailResult };
    } catch (fetchError) {
      // If fetch fails completely (network error, etc.), try the fallback
      console.error('Fetch error in primary registration email method:', fetchError);
      console.log('Trying fallback EmailJS method for registration email...');
      
      const fallbackResult = await sendRegistrationEmailViaEmailJS(studentEmail, studentName, studentDetails);
      
      if (fallbackResult.success) {
        console.log('Registration email sent successfully using fallback method');
        return fallbackResult;
      } else {
        // Both methods failed
        const errorMessage = `Primary method: ${fetchError instanceof Error ? fetchError.message : 'Unknown fetch error'}, Fallback method: ${fallbackResult.error}`;
        console.error('All registration email methods failed:', errorMessage);
        return { 
          success: false, 
          error: errorMessage
        };
      }
    }
  } catch (error) {
    console.error('Error sending registration email:', error);
    
    // Add more detailed error information to help with debugging
    let errorMessage = 'Unknown error sending registration email';
    if (error instanceof Error) {
      errorMessage = error.message;
      // Add special handling for network errors
      if (error.message.includes('Failed to fetch') || error.message.includes('Network') || error.message.includes('net::')) {
        errorMessage = 'Network error: Unable to connect to the registration email server. Please check your internet connection and try again.';
      }
    }
    
    return { 
      success: false, 
      error: errorMessage 
    };
  }
};

/**
 * Fallback method to send an announcement using EmailJS
 * This is used when the primary server method fails
 */
const sendAnnouncementViaEmailJS = async (
  subject: string,
  message: string,
  recipients: string[] | string
): Promise<{ 
  success: boolean; 
  message: string; 
  failedRecipients?: string[];
  error?: string;
}> => {
  try {
    // EmailJS can only send to one recipient at a time, so we need to loop
    const emails = Array.isArray(recipients) ? recipients : [recipients];
    const results = [];
    const failedRecipients = [];
    
    for (const email of emails) {
      try {
        const templateParams = {
          to_email: email,
          subject: subject,
          message: message,
        };
        
        const result = await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          templateParams,
          EMAILJS_PUBLIC_KEY
        );
        
        console.log('EmailJS sent announcement to:', email, 'Status:', result.status);
        results.push(result);
      } catch (emailError) {
        console.error('EmailJS failed to send to:', email, emailError);
        failedRecipients.push(email);
      }
      
      // Add a small delay between sends to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    if (failedRecipients.length === 0) {
      return {
        success: true,
        message: `Announcement sent successfully to ${emails.length} recipients using fallback method`
      };
    } else if (failedRecipients.length < emails.length) {
      return {
        success: true,
        message: `Announcement sent to ${emails.length - failedRecipients.length} of ${emails.length} recipients using fallback method`,
        failedRecipients
      };
    } else {
      return {
        success: false,
        error: 'Failed to send announcement to any recipients using fallback method',
        message: 'Failed to send announcement to any recipients using fallback method',
        failedRecipients
      };
    }
  } catch (error) {
    console.error('Error in EmailJS fallback method:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error in fallback method';
    return {
      success: false,
      error: errorMessage,
      message: `Error in fallback method: ${errorMessage}`
    };
  }
};

/**
 * Send an announcement to students
 * @param subject The announcement subject
 * @param message The announcement message
 * @param recipientType Type of recipients ('all', 'selected', 'single')
 * @param recipients Array of email addresses or a single email address
 * @param attachmentUrl Optional URL for an attachment
 * @returns Promise resolving to the email sending result
 */
export const sendAnnouncement = async (
  subject: string,
  message: string,
  recipientType: 'all' | 'selected' | 'single',
  recipients: string[] | string,
  attachmentUrl?: string
): Promise<{ 
  success: boolean; 
  message?: string;
  error?: string;
  failedRecipients?: string[];
}> => {
  try {
    // Make sure we have required fields
    if (!subject || !message || !recipientType) {
      return { 
        success: false, 
        error: 'Missing required fields' 
      };
    }
    
    // Updated to use EmailJS directly as the primary method for production
    // This eliminates the need for Firebase Cloud Functions
    console.log('Using EmailJS to send announcement');
    
    const result = await sendAnnouncementViaEmailJS(subject, message, recipients);
    
    if (result.success) {
      // Add a notification about the announcement being sent
      const recipientCount = typeof recipients === 'string' ? 1 : (recipients as string[]).length;
      addSuccessNotification(
        'Announcement Sent', 
        `Successfully sent announcement "${subject}" to ${recipientCount} recipient(s)`
      );
      
      return { 
        success: true,
        message: result.message 
      };
    } else {
      // If direct EmailJS fails, try using the local server if available
      console.warn('EmailJS method failed:', result.message || 'Unknown error');
      
      if (window.location.origin.includes('localhost')) {
        console.log('Trying local server as fallback...');
        
        // Get the base URL for local server
        const baseUrl = 'http://localhost:3001';
        
        try {
          // Use the fetchWithTimeout helper with a 15 second timeout
          const response = await fetchWithTimeout(
            `${baseUrl}/api/send-announcement`, 
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                subject,
                message,
                recipientType,
                recipients,
                attachmentUrl
              }),
            },
            15000 // 15 second timeout for potentially larger batches
          );
          
          // Check content type before parsing as JSON
          const contentType = response.headers.get('content-type');
          let serverResult;
          
          if (contentType && contentType.includes('application/json')) {
            try {
              serverResult = await response.json();
            } catch (jsonError) {
              console.error('Failed to parse JSON response:', jsonError);
              throw new Error('Failed to parse server response as JSON');
            }
          } else {
            throw new Error('Server returned non-JSON response');
          }
          
          if (serverResult.success) {
            addSuccessNotification(
              'Announcement Sent (Fallback)', 
              serverResult.message || 'Announcement sent via fallback method'
            );
            
            return { 
              success: true,
              message: serverResult.message 
            };
          } else {
            throw new Error(serverResult.message || 'Fallback server method failed');
          }
        } catch (serverError) {
          console.error('Local server fallback failed:', serverError);
          
          // If both methods fail, add an error notification
          addErrorNotification(
            'Announcement Failed',
            `Primary and fallback methods failed: ${serverError instanceof Error ? serverError.message : 'Unknown error'}`
          );
          
          return { 
            success: false, 
            error: `All sending methods failed: ${serverError instanceof Error ? serverError.message : 'Unknown error'}`,
            failedRecipients: result.failedRecipients
          };
        }
      } else {
        // We're not in local env and EmailJS failed - return the error
        addErrorNotification(
          'Announcement Failed',
          `Failed to send: ${result.error || 'Unknown error'}`
        );
        
        return { 
          success: false, 
          error: `EmailJS method failed: ${result.error}`,
          failedRecipients: result.failedRecipients
        };
      }
    }
  } catch (error) {
    console.error('Error sending announcement:', error);
    
    // Add more detailed error information to help with debugging
    let errorMessage = 'Unknown error sending announcement';
    if (error instanceof Error) {
      errorMessage = error.message;
      // Add special handling for network errors
      if (error.message.includes('Failed to fetch') || error.message.includes('Network') || error.message.includes('net::')) {
        errorMessage = 'Network error: Unable to connect to the announcement server. Please check your internet connection and try again.';
      }
    }
    
    // Add an error notification
    addErrorNotification(
      'Announcement Failed',
      errorMessage
    );
    
    return { 
      success: false, 
      error: errorMessage
    };
  }
}; 