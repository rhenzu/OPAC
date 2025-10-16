const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST'],
  credentials: true
}));


// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error caught:', err);
  res.status(500).json({
    success: false,
    message: 'Server error occurred',
  });
});

// Create a transporter using Gmail SMTP with better error handling
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'aianoelarguelles1008@gmail.com',
    pass: process.env.EMAIL_APP_PASSWORD || 'zrdmzppazyusheec'
  },
  debug: true, // Enable debugging
  logger: true // Log to console
});

// Test the connection with more detailed error reporting
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP connection error:', error);
    console.error('Error code:', error.code);
    console.error('Error response:', error.response);
    console.error('Error message:', error.message);
  } else {
    console.log('SMTP server is ready to send emails');
  }
});

// Email sending endpoint
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;

    const emailOptions = {
      from: {
        name: 'Library Management System',
        address: 'aianoelarguelles1008@gmail.com'
      },
      to: Array.isArray(to) ? to.join(',') : to,
      subject: subject,
      text: text,
      html: html,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    };

    await transporter.sendMail(emailOptions);
    console.log('Email sent successfully');
    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
  }
});

// Borrow notification endpoint
app.post('/api/send-borrow-notification', async (req, res) => {
  try {
    const { studentEmail, studentName, books, dueDate } = req.body;

    const booksList = books.map(book => 
      `- ${book.title} by ${book.author} (Accession: ${book.accessionNumber})`
    ).join('\n');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">Library Book Borrowing Confirmation</h2>
        <p>Dear ${studentName},</p>
        <p>This email confirms that you have borrowed the following book(s):</p>
        <div style="margin: 20px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px;">
          ${books.map(book => 
            `<p style="margin: 5px 0;">• ${book.title} by ${book.author}<br>
            <span style="color: #666; font-size: 0.9em;">Accession Number: ${book.accessionNumber}</span></p>`
          ).join('')}
        </div>
        <p style="color: #d32f2f; font-weight: bold;">Due Date: ${dueDate}</p>
        <p>Please return these items by the due date to avoid overdue fines.</p>
        <p style="margin-top: 30px;">Best regards,<br>Library Management System</p>
      </div>
    `;

    const textContent = `
Dear ${studentName},

This email confirms that you have borrowed the following book(s):

${booksList}

Due Date: ${dueDate}

Please return these items by the due date to avoid overdue fines.

Best regards,
Library Management System
    `;

    const emailOptions = {
      from: {
        name: 'Library Management System',
        address: 'aianoelarguelles1008@gmail.com'
      },
      to: studentEmail,
      subject: 'Library Book Borrowing Confirmation',
      text: textContent,
      html: htmlContent,
      priority: 'high',
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    };

    await transporter.sendMail(emailOptions);
    console.log('Borrow notification sent successfully');
    res.json({ success: true, message: 'Borrow notification sent successfully' });
  } catch (error) {
    console.error('Error sending borrow notification:', error);
    res.status(500).json({ success: false, message: 'Failed to send borrow notification', error: error.message });
  }
});

// Return notification endpoint
app.post('/api/send-return-notification', async (req, res) => {
  try {
    const { studentEmail, studentName, books, returnDate, fineDetails } = req.body;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">Library Book Return Confirmation</h2>
        <p>Dear ${studentName},</p>
        <p>This email confirms that you have returned the following book(s):</p>
        <div style="margin: 20px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px;">
          ${books.map(book => `
            <p style="margin: 5px 0;">
              • ${book.title} by ${book.author}<br>
              <span style="color: #666; font-size: 0.9em;">Accession Number: ${book.accessionNumber}</span><br>
              <span style="color: #666; font-size: 0.9em;">Condition: ${book.condition}</span>
              ${book.daysOverdue ? `
                <br><span style="color: #d32f2f; font-size: 0.9em;">
                  Overdue: ${book.daysOverdue} days (Fine: ₱${book.fine?.toFixed(2)})
                </span>
              ` : ''}
            </p>
          `).join('')}
        </div>
        ${fineDetails ? `
          <div style="margin: 20px 0; padding: 15px; background-color: ${fineDetails.isPaid ? '#e8f5e9' : '#ffebee'}; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0; color: ${fineDetails.isPaid ? '#2e7d32' : '#c62828'};">
              ${fineDetails.isPaid ? 'Fine Payment Received' : 'Outstanding Fine'}
            </h3>
            <p style="margin: 0;">
              Total Fine Amount: ₱${fineDetails.totalAmount.toFixed(2)}<br>
              Status: ${fineDetails.isPaid ? 'PAID' : 'UNPAID'}
            </p>
            ${!fineDetails.isPaid ? `
              <p style="margin: 10px 0 0 0; font-size: 0.9em; color: #d32f2f;">
                Please settle the outstanding fine at the library counter to avoid borrowing restrictions.
              </p>
            ` : ''}
          </div>
        ` : ''}
        <p>Thank you for returning your books${fineDetails ? ' and your attention to the fine payment' : ''}.</p>
        <p style="margin-top: 30px;">Best regards,<br>Library Management System</p>
      </div>
    `;

    const textContent = `
Dear ${studentName},

This email confirms that you have returned the following book(s):

${books.map(book => `
- ${book.title} by ${book.author}
  Accession Number: ${book.accessionNumber}
  Condition: ${book.condition}${book.daysOverdue ? `
  Overdue: ${book.daysOverdue} days (Fine: ₱${book.fine?.toFixed(2)})` : ''}`).join('\n')}

${fineDetails ? `
${fineDetails.isPaid ? 'Fine Payment Received' : 'Outstanding Fine'}
Total Fine Amount: ₱${fineDetails.totalAmount.toFixed(2)}
Status: ${fineDetails.isPaid ? 'PAID' : 'UNPAID'}

${!fineDetails.isPaid ? 'Please settle the outstanding fine at the library counter to avoid borrowing restrictions.' : ''}` : ''}

Thank you for returning your books${fineDetails ? ' and your attention to the fine payment' : ''}.

Best regards,
Library Management System`;

    const emailOptions = {
      from: {
        name: 'Library Management System',
        address: 'aianoelarguelles1008@gmail.com'
      },
      to: studentEmail,
      subject: 'Library Book Return Confirmation',
      text: textContent,
      html: htmlContent,
      priority: 'high',
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    };

    await transporter.sendMail(emailOptions);
    console.log('Return notification sent successfully');
    res.json({ success: true, message: 'Return notification sent successfully' });
  } catch (error) {
    console.error('Error sending return notification:', error);
    res.status(500).json({ success: false, message: 'Failed to send return notification', error: error.message });
  }
});

// Registration confirmation endpoint
app.post('/api/send-registration-confirmation', async (req, res) => {
  try {
    const { studentEmail, studentName, studentDetails } = req.body;
    
    console.log('Received registration confirmation request for:', studentEmail);
    
    if (!studentEmail || !studentName || !studentDetails) {
      console.error('Missing required email data:', { studentEmail, studentName, studentDetails: !!studentDetails });
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required email data'
      });
    }

    // Create a base64 encoded barcode image URL using a barcode API
    const barcodeUrl = `https://barcodeapi.org/api/128/${studentDetails.studentId}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1976d2;">Library System Registration Confirmation</h2>
        <p>Dear ${studentName},</p>
        <p>Welcome to our Library Management System! Your registration has been completed successfully.</p>
        
        <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 4px;">
          <h3 style="margin: 0 0 10px 0; color: #1976d2;">Your Registration Details:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666;">Student ID:</td>
              <td style="padding: 8px 0;"><strong>${studentDetails.studentId}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Name:</td>
              <td style="padding: 8px 0;"><strong>${studentName}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Course/Program:</td>
              <td style="padding: 8px 0;"><strong>${studentDetails.course || 'Not specified'}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Email:</td>
              <td style="padding: 8px 0;"><strong>${studentEmail}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Address:</td>
              <td style="padding: 8px 0;"><strong>${studentDetails.address || 'Not specified'}</strong></td>
            </tr>
          </table>
        </div>

        <div style="margin: 20px 0; padding: 15px; background-color: #e3f2fd; border-radius: 4px; text-align: center;">
          <h3 style="margin: 0 0 10px 0; color: #1976d2;">Your Student ID Barcode:</h3>
          <div style="background-color: #ffffff; padding: 15px; display: inline-block; border-radius: 4px;">
            <img src="${barcodeUrl}" alt="Student ID Barcode" style="max-width: 300px; height: auto;">
            <p style="margin: 10px 0 0 0; font-size: 14px;">${studentDetails.studentId}</p>
          </div>
          <p style="margin-top: 15px; font-style: italic; color: #666;">Please save or print this barcode for easy library access.</p>
        </div>

        <div style="margin: 20px 0; padding: 15px; background-color: #e3f2fd; border-radius: 4px;">
          <h3 style="margin: 0 0 10px 0; color: #1976d2;">Library Services Available:</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Borrow up to 3 books at a time</li>
            <li>7-day borrowing period</li>
            <li>Online book catalog access</li>
            <li>Email notifications for due dates and overdue books</li>
          </ul>
        </div>

        <p>You can now use your student ID to borrow books from our library. Please keep this email for your records.</p>
        
        <p style="color: #666; font-style: italic;">Note: Please visit the library with your student ID for any inquiries or assistance.</p>
        
        <p style="margin-top: 30px;">Best regards,<br>Library Management System</p>
      </div>
    `;

    const textContent = `
Welcome to our Library Management System!

Your registration has been completed successfully.

Registration Details:
-------------------
Student ID: ${studentDetails.studentId}
Name: ${studentName}
Course/Program: ${studentDetails.course || 'Not specified'}
Email: ${studentEmail}
Address: ${studentDetails.address || 'Not specified'}

Your Student ID Barcode is available in the HTML version of this email.

Library Services Available:
-------------------------
- Borrow up to 3 books at a time
- 7-day borrowing period
- Online book catalog access
- Email notifications for due dates and overdue books

You can now use your student ID to borrow books from our library. Please keep this email for your records.

Note: Please visit the library with your student ID for any inquiries or assistance.

Best regards,
Library Management System`;

    const emailOptions = {
      from: {
        name: 'Library Management System',
        address: 'aianoelarguelles1008@gmail.com'
      },
      to: studentEmail,
      subject: 'Welcome to Library Management System - Registration Confirmation',
      text: textContent,
      html: htmlContent,
      priority: 'high',
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    };

    try {
      console.log('Attempting to send email to:', studentEmail);
      const info = await transporter.sendMail(emailOptions);
      console.log('Registration confirmation sent successfully', info.messageId);
      return res.json({ success: true, message: 'Registration confirmation sent successfully', messageId: info.messageId });
    } catch (emailError) {
      console.error('SMTP Error:', emailError);
      return res.status(500).json({ 
        success: false, 
        message: `Email server error: ${emailError.message}`, 
        error: emailError.message
      });
    }
  } catch (error) {
    console.error('Error in registration confirmation endpoint:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Failed to send registration confirmation: ${error.message}`, 
      error: error.message
    });
  }
});

// Overdue notification endpoint for single student
app.post('/api/send-overdue-notification', async (req, res) => {
  try {
    const { studentEmail, studentName, books, totalFine } = req.body;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d32f2f;">Library Book Overdue Notice</h2>
        <p>Dear ${studentName},</p>
        <p>Our records indicate that you have overdue book(s) from the library. Please return them as soon as possible to avoid additional fines.</p>
        
        <div style="margin: 20px 0; padding: 15px; background-color: #ffebee; border-radius: 4px;">
          <h3 style="margin: 0 0 10px 0; color: #c62828;">Overdue Books:</h3>
          ${books.map(book => `
            <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #ffcdd2;">
              <p style="margin: 5px 0;">
                <strong>${book.title}</strong> by ${book.author}<br>
                <span style="color: #666; font-size: 0.9em;">Accession Number: ${book.accessionNumber}</span><br>
                <span style="color: #d32f2f; font-size: 0.9em;">
                  Due Date: ${new Date(book.dueDate).toLocaleDateString()}<br>
                  Days Overdue: ${book.daysOverdue}<br>
                  Fine Accumulated: ₱${book.fine.toFixed(2)}
                </span>
              </p>
            </div>
          `).join('')}
          
          <div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #ffcdd2;">
            <h4 style="color: #c62828; margin: 0;">Total Fine Amount: ₱${totalFine.toFixed(2)}</h4>
          </div>
        </div>

        <div style="margin: 20px 0; padding: 15px; background-color: #fff3e0; border-radius: 4px;">
          <h3 style="margin: 0 0 10px 0; color: #e65100;">Important Notice:</h3>
          <ul style="margin: 0; padding-left: 20px; color: #e65100;">
            <li>Please return the overdue items to the library as soon as possible</li>
            <li>Fines will continue to accumulate until books are returned</li>
            <li>Your borrowing privileges may be suspended until all overdue items are returned</li>
          </ul>
        </div>

        <p>If you have already returned these items, please disregard this notice and contact the library to resolve any discrepancies.</p>
        
        <p style="margin-top: 30px;">Best regards,<br>Library Management System</p>
      </div>
    `;

    const textContent = `
Dear ${studentName},

Our records indicate that you have overdue book(s) from the library. Please return them as soon as possible to avoid additional fines.

Overdue Books:
${books.map(book => `
- ${book.title} by ${book.author}
  Accession Number: ${book.accessionNumber}
  Due Date: ${new Date(book.dueDate).toLocaleDateString()}
  Days Overdue: ${book.daysOverdue}
  Fine Accumulated: ₱${book.fine.toFixed(2)}`).join('\n')}

Total Fine Amount: ₱${totalFine.toFixed(2)}

Important Notice:
- Please return the overdue items to the library as soon as possible
- Fines will continue to accumulate until books are returned
- Your borrowing privileges may be suspended until all overdue items are returned

If you have already returned these items, please disregard this notice and contact the library to resolve any discrepancies.

Best regards,
Library Management System`;

    const emailOptions = {
      from: {
        name: 'Library Management System',
        address: 'aianoelarguelles1008@gmail.com'
      },
      to: studentEmail,
      subject: '⚠️ Library Books Overdue Notice',
      text: textContent,
      html: htmlContent,
      priority: 'high',
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    };

    await transporter.sendMail(emailOptions);
    console.log('Overdue notification sent successfully');
    res.json({ success: true, message: 'Overdue notification sent successfully' });
  } catch (error) {
    console.error('Error sending overdue notification:', error);
    res.status(500).json({ success: false, message: 'Failed to send overdue notification', error: error.message });
  }
});

// Bulk overdue notifications endpoint
app.post('/api/send-bulk-overdue-notifications', async (req, res) => {
  try {
    const { overdueRecords } = req.body;
    const results = [];

    for (const record of overdueRecords) {
      const { studentEmail, studentName, books, totalFine } = record;

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #d32f2f;">Library Book Overdue Notice</h2>
          <p>Dear ${studentName},</p>
          <p>Our records indicate that you have overdue book(s) from the library. Please return them as soon as possible to avoid additional fines.</p>
          
          <div style="margin: 20px 0; padding: 15px; background-color: #ffebee; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0; color: #c62828;">Overdue Books:</h3>
            ${books.map(book => `
              <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #ffcdd2;">
                <p style="margin: 5px 0;">
                  <strong>${book.title}</strong> by ${book.author}<br>
                  <span style="color: #666; font-size: 0.9em;">Accession Number: ${book.accessionNumber}</span><br>
                  <span style="color: #d32f2f; font-size: 0.9em;">
                    Due Date: ${new Date(book.dueDate).toLocaleDateString()}<br>
                    Days Overdue: ${book.daysOverdue}<br>
                    Fine Accumulated: ₱${book.fine.toFixed(2)}
                  </span>
                </p>
              </div>
            `).join('')}
            
            <div style="margin-top: 20px; padding-top: 15px; border-top: 2px solid #ffcdd2;">
              <h4 style="color: #c62828; margin: 0;">Total Fine Amount: ₱${totalFine.toFixed(2)}</h4>
            </div>
          </div>

          <div style="margin: 20px 0; padding: 15px; background-color: #fff3e0; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0; color: #e65100;">Important Notice:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #e65100;">
              <li>Please return the overdue items to the library as soon as possible</li>
              <li>Fines will continue to accumulate until books are returned</li>
              <li>Your borrowing privileges may be suspended until all overdue items are returned</li>
            </ul>
          </div>

          <p>If you have already returned these items, please disregard this notice and contact the library to resolve any discrepancies.</p>
          
          <p style="margin-top: 30px;">Best regards,<br>Library Management System</p>
        </div>
      `;

      const textContent = `
Dear ${studentName},

Our records indicate that you have overdue book(s) from the library. Please return them as soon as possible to avoid additional fines.

Overdue Books:
${books.map(book => `
- ${book.title} by ${book.author}
  Accession Number: ${book.accessionNumber}
  Due Date: ${new Date(book.dueDate).toLocaleDateString()}
  Days Overdue: ${book.daysOverdue}
  Fine Accumulated: ₱${book.fine.toFixed(2)}`).join('\n')}

Total Fine Amount: ₱${totalFine.toFixed(2)}

Important Notice:
- Please return the overdue items to the library as soon as possible
- Fines will continue to accumulate until books are returned
- Your borrowing privileges may be suspended until all overdue items are returned

If you have already returned these items, please disregard this notice and contact the library to resolve any discrepancies.

Best regards,
Library Management System`;

      try {
        await transporter.sendMail({
          from: {
            name: 'Library Management System',
            address: 'aianoelarguelles1008@gmail.com'
          },
          to: studentEmail,
          subject: '⚠️ Library Books Overdue Notice',
          text: textContent,
          html: htmlContent,
          priority: 'high',
          headers: {
            'X-Priority': '1',
            'X-MSMail-Priority': 'High',
            'Importance': 'high'
          }
        });

        results.push({
          studentEmail,
          success: true,
          message: 'Notification sent successfully'
        });
      } catch (error) {
        results.push({
          studentEmail,
          success: false,
          message: error.message
        });
      }
    }

    const allSuccessful = results.every(result => result.success);
    if (allSuccessful) {
      res.json({ 
        success: true, 
        message: 'All overdue notifications sent successfully',
        results 
      });
    } else {
      res.json({ 
        success: false, 
        message: 'Some notifications failed to send',
        results 
      });
    }
  } catch (error) {
    console.error('Error sending bulk overdue notifications:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process bulk notifications', 
      error: error.message 
    });
  }
});

// Test email endpoint
app.get('/api/test-email', async (req, res) => {
  try {
    const testEmailOptions = {
      from: {
        name: 'Library Management System',
        address: 'aianoelarguelles1008@gmail.com'
      },
      to: 'aianoelarguelles1008@gmail.com', // Send to self as a test
      subject: 'Email System Test',
      text: 'This is a test email to verify the email sending functionality is working.',
      html: '<p>This is a test email to verify the email sending functionality is working.</p>',
    };

    console.log('Sending test email...');
    const info = await transporter.sendMail(testEmailOptions);
    console.log('Test email sent successfully', info.messageId);
    
    res.json({ 
      success: true, 
      message: 'Test email sent successfully', 
      messageId: info.messageId,
      smtpResponse: info.response 
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ 
      success: false, 
      message: `Failed to send test email: ${error.message}`, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Announcement endpoint
app.post('/api/send-announcement', async (req, res) => {
  try {
    const { subject, message, recipientType, recipients, attachmentUrl } = req.body;
    
    console.log('Received announcement request:', { subject, recipientType, recipients: Array.isArray(recipients) ? recipients.length : 'single' });
    
    if (!subject || !message || !recipientType) {
      console.error('Missing required announcement data:', { subject, message: !!message, recipientType });
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required announcement data'
      });
    }
    
    let emailAddresses = [];
    
    // Determine recipients based on the type
    if (recipientType === 'all') {
      // Logic to retrieve all student emails would go here
      // For now, we'll use the provided recipients array
      emailAddresses = recipients;
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
    const failedRecipients = [];

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
          priority: 'high',
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
  } catch (error) {
    console.error('Error sending announcement:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send announcement', 
      error: error.message 
    });
  }
});

// Add this at the end of the file, before starting the server
// Add a global error handler to catch any unhandled errors
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  // Make sure we haven't already sent a response
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      message: 'Server error occurred',
      error: err.message || 'Unknown error'
    });
  }
});

app.listen(80, () => {
  console.log(`Server is running on port ${80}`);
}); 