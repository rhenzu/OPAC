# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

## Announcement System Configuration

### EmailJS Configuration (Fallback Method)

To ensure emails can be sent even if the main server is down, follow these steps to configure EmailJS:

1. Create an account at [EmailJS](https://www.emailjs.com/)
2. Create a new service using your Gmail account and name it "service_opac"
3. Create a new template named "template_announcement" with the following content:

```html
<h2>Library Announcement</h2>
<div>
  <p>Subject: {{subject}}</p>
  <div>
    {{message}}
  </div>
  <p style="margin-top: 30px; color: #666; font-size: 0.9em;">
    This is an automated message from the Library Management System. Please do not reply to this email.
  </p>
</div>
```

4. Configure the announcement template to use the following parameters:
   - `to_email`: Recipient's email
   - `subject`: Announcement subject
   - `message`: Announcement message

5. Create another template named "template_registration" with the following content:

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #1976d2;">Welcome to the Library Management System</h2>
  <p>Hello {{student_name}},</p>
  <p>Your registration with the Library Management System is now complete!</p>
  
  <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 4px;">
    <h3 style="margin-top: 0;">Your Registration Details:</h3>
    <p><strong>Student ID:</strong> {{student_id}}</p>
    <p><strong>Course:</strong> {{course}}</p>
    <p><strong>Year Level:</strong> {{year_level}}</p>
    <p><strong>Section:</strong> {{section}}</p>
    <p><strong>Address:</strong> {{address}}</p>
    <p><strong>Registration Date:</strong> {{registration_date}}</p>
  </div>
  
  <p>You can now borrow books, access resources, and use all library services.</p>
  <p>If you have any questions, please visit the library or contact the librarian.</p>
  
  <p style="margin-top: 30px; color: #666; font-size: 0.9em;">
    This is an automated message from the Library Management System. Please do not reply to this email.
  </p>
</div>
```

6. Configure the registration template to use the following parameters:
   - `to_email`: Student's email
   - `student_name`: Student's name
   - `student_id`: Student ID
   - `course`: Student's course
   - `year_level`: Student's year level
   - `section`: Student's section
   - `address`: Student's address
   - `registration_date`: Date of registration

7. Get your EmailJS public key and update the following constants in `src/utils/notificationUtils.ts`:
   - `EMAILJS_SERVICE_ID`
   - `EMAILJS_TEMPLATE_ID`
   - `EMAILJS_REGISTRATION_TEMPLATE_ID`
   - `EMAILJS_PUBLIC_KEY`

This configuration ensures that emails can still be sent even if the primary server is down.
