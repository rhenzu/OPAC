/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';
import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'aianoelarguelles1008@gmail.com', // Should use environment variables in production
    pass: functions.config().email?.password || 'zrdmzppazyusheec' // Use Firebase environment variables
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Announcement endpoint
app.post('/send-announcement', (req: express.Request, res: express.Response) => {
  (async () => {
    try {
      const { subject, message, recipientType, recipients, attachmentUrl } = req.body;
      
      console.log('Received announcement request:', { 
        subject, 
        recipientType, 
        recipients: Array.isArray(recipients) ? recipients.length : 'single' 
      });
      
      if (!subject || !message || !recipientType) {
        console.error('Missing required announcement data:', { 
          subject, 
          message: !!message, 
          recipientType 
        });
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required announcement data'
        });
      }
      
      let emailAddresses: string[] = [];
      
      // Determine recipients based on the type
      if (recipientType === 'all') {
        emailAddresses = recipients as string[];
      } else if (recipientType === 'selected' && Array.isArray(recipients)) {
        emailAddresses = recipients;
      } else if (recipientType === 'single' && typeof recipients === 'string') {
        emailAddresses = [recipients];
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid recipient type or recipient data'
        });
      }
      
      if (emailAddresses.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid recipients specified'
        });
      }
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976d2;">Library Announcement</h2>
          <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 4px;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          ${attachmentUrl ? `
            <div style="margin: 20px 0;">
              <a href="${attachmentUrl}" style="display: inline-block; background-color: #1976d2; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px;">
                View Attachment
              </a>
            </div>
          ` : ''}
          <p style="margin-top: 30px; color: #666; font-size: 0.9em;">
            This is an automated message from the Library Management System. Please do not reply to this email.
          </p>
        </div>
      `;

      const textContent = `
Library Announcement

${message}

${attachmentUrl ? `Attachment: ${attachmentUrl}` : ''}

This is an automated message from the Library Management System. Please do not reply to this email.
      `;

      // Send emails in batches to avoid overloading the mail server
      const batchSize = 50;
      const results = [];
      const failedRecipients: string[] = [];

      for (let i = 0; i < emailAddresses.length; i += batchSize) {
        const batch = emailAddresses.slice(i, i + batchSize);
        
        try {
          const emailOptions = {
            from: {
              name: 'Library Management System',
              address: 'aianoelarguelles1008@gmail.com'
            },
            bcc: batch, // Use BCC for privacy
            subject: subject,
            text: textContent,
            html: htmlContent,
            // Use valid priority values
            priority: 'high' as 'high' | 'normal' | 'low',
            headers: {
              'X-Priority': '1',
              'X-MSMail-Priority': 'High',
              'Importance': 'high'
            }
          };

          const result = await transporter.sendMail(emailOptions);
          results.push(result);
          console.log(`Batch ${i/batchSize + 1} sent successfully to ${batch.length} recipients`);
        } catch (error) {
          console.error(`Error sending batch ${i/batchSize + 1}:`, error);
          failedRecipients.push(...batch);
        }
      }

      if (failedRecipients.length === 0) {
        res.json({ 
          success: true, 
          message: `Announcement sent successfully to ${emailAddresses.length} recipients` 
        });
      } else if (failedRecipients.length < emailAddresses.length) {
        res.json({ 
          success: true, 
          message: `Announcement sent to ${emailAddresses.length - failedRecipients.length} recipients with ${failedRecipients.length} failures`, 
          failedRecipients
        });
      } else {
        throw new Error('Failed to send announcement to any recipients');
      }
    } catch (error: unknown) {
      console.error('Error sending announcement:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send announcement', 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })().catch(error => {
    console.error('Unhandled promise rejection:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        message: 'Server error occurred',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
});

// Additional route for the /api/send-announcement path to match frontend requests
app.post('/api/send-announcement', (req: express.Request, res: express.Response) => {
  (async () => {
    try {
      const { subject, message, recipientType, recipients, attachmentUrl } = req.body;
      
      console.log('Received announcement request via /api/ path:', { 
        subject, 
        recipientType, 
        recipients: Array.isArray(recipients) ? recipients.length : 'single' 
      });
      
      if (!subject || !message || !recipientType) {
        console.error('Missing required announcement data:', { 
          subject, 
          message: !!message, 
          recipientType 
        });
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required announcement data'
        });
      }
      
      let emailAddresses: string[] = [];
      
      // Determine recipients based on the type
      if (recipientType === 'all') {
        emailAddresses = recipients as string[];
      } else if (recipientType === 'selected' && Array.isArray(recipients)) {
        emailAddresses = recipients;
      } else if (recipientType === 'single' && typeof recipients === 'string') {
        emailAddresses = [recipients];
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid recipient type or recipient data'
        });
      }
      
      if (emailAddresses.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid recipients specified'
        });
      }
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976d2;">Library Announcement</h2>
          <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 4px;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          ${attachmentUrl ? `
            <div style="margin: 20px 0;">
              <a href="${attachmentUrl}" style="display: inline-block; background-color: #1976d2; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px;">
                View Attachment
              </a>
            </div>
          ` : ''}
          <p style="margin-top: 30px; color: #666; font-size: 0.9em;">
            This is an automated message from the Library Management System. Please do not reply to this email.
          </p>
        </div>
      `;

      const textContent = `
Library Announcement

${message}

${attachmentUrl ? `Attachment: ${attachmentUrl}` : ''}

This is an automated message from the Library Management System. Please do not reply to this email.
      `;

      // Send emails in batches to avoid overloading the mail server
      const batchSize = 50;
      const results = [];
      const failedRecipients: string[] = [];

      for (let i = 0; i < emailAddresses.length; i += batchSize) {
        const batch = emailAddresses.slice(i, i + batchSize);
        
        try {
          const emailOptions = {
            from: {
              name: 'Library Management System',
              address: 'aianoelarguelles1008@gmail.com'
            },
            bcc: batch, // Use BCC for privacy
            subject: subject,
            text: textContent,
            html: htmlContent,
            // Use valid priority values
            priority: 'high' as 'high' | 'normal' | 'low',
            headers: {
              'X-Priority': '1',
              'X-MSMail-Priority': 'High',
              'Importance': 'high'
            }
          };

          const result = await transporter.sendMail(emailOptions);
          results.push(result);
          console.log(`Batch ${i/batchSize + 1} sent successfully to ${batch.length} recipients`);
        } catch (error) {
          console.error(`Error sending batch ${i/batchSize + 1}:`, error);
          failedRecipients.push(...batch);
        }
      }

      if (failedRecipients.length === 0) {
        res.json({ 
          success: true, 
          message: `Announcement sent successfully to ${emailAddresses.length} recipients` 
        });
      } else if (failedRecipients.length < emailAddresses.length) {
        res.json({ 
          success: true, 
          message: `Announcement sent to ${emailAddresses.length - failedRecipients.length} recipients with ${failedRecipients.length} failures`, 
          failedRecipients
        });
      } else {
        throw new Error('Failed to send announcement to any recipients');
      }
    } catch (error: unknown) {
      console.error('Error sending announcement via /api/ path:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send announcement', 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })().catch(error => {
    console.error('Unhandled promise rejection in /api path:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        message: 'Server error occurred',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
});

// Registration confirmation email endpoint
app.post('/api/send-registration-confirmation', (req: express.Request, res: express.Response) => {
  (async () => {
    try {
      const { studentEmail, studentName, studentDetails } = req.body;
      
      console.log('Received registration email request:', { 
        studentEmail, 
        studentName, 
        studentDetails: studentDetails ? 'provided' : 'missing'
      });
      
      if (!studentEmail || !studentName || !studentDetails) {
        console.error('Missing required registration data');
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required registration data'
        });
      }
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976d2;">Welcome to the Library Management System</h2>
          <p>Hello ${studentName},</p>
          <p>Your registration with the Library Management System is now complete!</p>
          
          <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 4px;">
            <h3 style="margin-top: 0;">Your Registration Details:</h3>
            <p><strong>Student ID:</strong> ${studentDetails.studentId}</p>
            <p><strong>Course:</strong> ${studentDetails.course}</p>
            <p><strong>Year Level:</strong> ${studentDetails.yearLevel}</p>
            ${studentDetails.section ? `<p><strong>Section:</strong> ${studentDetails.section}</p>` : ''}
            ${studentDetails.address ? `<p><strong>Address:</strong> ${studentDetails.address}</p>` : ''}
            <p><strong>Registration Date:</strong> ${studentDetails.registrationDate}</p>
          </div>
          
          <p>You can now borrow books, access resources, and use all library services.</p>
          <p>If you have any questions, please visit the library or contact the librarian.</p>
          
          <p style="margin-top: 30px; color: #666; font-size: 0.9em;">
            This is an automated message from the Library Management System. Please do not reply to this email.
          </p>
        </div>
      `;

      const textContent = `
Welcome to the Library Management System

Hello ${studentName},

Your registration with the Library Management System is now complete!

Your Registration Details:
- Student ID: ${studentDetails.studentId}
- Course: ${studentDetails.course}
- Year Level: ${studentDetails.yearLevel}
${studentDetails.section ? `- Section: ${studentDetails.section}\n` : ''}
${studentDetails.address ? `- Address: ${studentDetails.address}\n` : ''}
- Registration Date: ${studentDetails.registrationDate}

You can now borrow books, access resources, and use all library services.
If you have any questions, please visit the library or contact the librarian.

This is an automated message from the Library Management System. Please do not reply to this email.
      `;

      const emailOptions = {
        from: {
          name: 'Library Management System',
          address: 'aianoelarguelles1008@gmail.com'
        },
        to: studentEmail,
        subject: 'Welcome to the Library Management System',
        text: textContent,
        html: htmlContent,
        priority: 'high' as 'high' | 'normal' | 'low',
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high'
        }
      };

      const result = await transporter.sendMail(emailOptions);
      console.log('Registration email sent successfully:', result.messageId);
      
      res.json({ 
        success: true, 
        message: 'Registration confirmation email sent successfully',
        messageId: result.messageId
      });
    } catch (error: unknown) {
      console.error('Error sending registration email:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send registration email', 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })().catch(error => {
    console.error('Unhandled promise rejection in registration email:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        message: 'Server error occurred',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
});

// Test endpoint
app.get('/test', (req: express.Request, res: express.Response) => {
  res.json({ success: true, message: 'API server is running!' });
});

// Additional test endpoint at the /api path to match frontend expectations
app.get('/api/test', (req: express.Request, res: express.Response) => {
  res.json({ success: true, message: 'API server is running at /api path!' });
});

// Global error handler
app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      message: 'Server error occurred',
      error: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

// Export the API as a Firebase Function
export const api = functions.https.onRequest(app);
