import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboard from './components/admin/AdminDashboard';
import BorrowReturn from './components/admin/BorrowReturn';
import StudentAttendance from './components/admin/StudentAttendance';
import ListAttendance from './components/admin/ListAttendance';
import UserManagement from './components/admin/UserManagement';
import BorrowedBooks from './components/admin/BorrowedBooks';
import StudentBorrowings from './components/admin/StudentBorrowings';
import BookManagement from './components/admin/BookManagement';
import StudentManagement from './components/admin/StudentManagement';
import FinePayments from './components/admin/FinePayments';
import PrintBarcodes from './components/admin/PrintBarcodes';
import OverdueNotifications from './components/admin/OverdueNotifications';
import Announcements from './components/admin/Announcements';
import Reports from './components/admin/Reports';
import AllActivities from './components/admin/AllActivities';
import Login from './components/auth/Login';
import AdminLayout from './components/layout/AdminLayout';
import StudentLayout from './components/layout/StudentLayout';
import StudentHome from './components/student/StudentHome';
import BookDetail from './components/student/BookDetail';
import Browse from './components/student/Browse';
import About from './components/student/About';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { SearchProvider } from './contexts/SearchContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { scheduleOverdueChecks } from './utils/overdueScheduler';

// Augment the theme palette to include custom properties
declare module '@mui/material/styles' {
  interface PaletteColor {
    lightest?: string;
  }
  
  interface SimplePaletteColorOptions {
    lightest?: string;
  }
}

// Loader component for Suspense fallback
const Loader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    Loading...
  </div>
);

const AppContent = () => {
  // Set up overdue book checker
  useEffect(() => {
    // Check for overdue books and send notifications every 12 hours
    const intervalId = scheduleOverdueChecks(12);
    
    // Clean up interval when component unmounts
    return () => clearInterval(intervalId);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Student Routes */}
        <Route path="/" element={<StudentLayout />}>
          <Route index element={<StudentHome />} />
          <Route path="book/:bookId" element={<BookDetail />} />
          <Route path="browse" element={<Browse />} />
          <Route path="about" element={<About />} />
        </Route>
        
        {/* Admin Routes */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route 
            path="books" 
            element={
              <ProtectedRoute requiredPermission="manageBooks">
                <BookManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="print-barcodes" 
            element={
              <ProtectedRoute requiredPermission="manageBooks">
                <PrintBarcodes />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="students" 
            element={
              <ProtectedRoute requiredPermission="manageStudents">
                <StudentManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="borrow-return" 
            element={
              <ProtectedRoute requiredPermission="manageBorrowing">
                <BorrowReturn />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="borrowed-books" 
            element={
              <ProtectedRoute requiredPermission="manageBorrowing">
                <BorrowedBooks />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="student-borrowings" 
            element={
              <ProtectedRoute requiredPermission="manageBorrowing">
                <StudentBorrowings />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="reports" 
            element={
              <ProtectedRoute requiredPermission="manageReports">
                <Reports />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="overdue-notifications" 
            element={
              <ProtectedRoute requiredPermission="manageBorrowing">
                <OverdueNotifications />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="announcements" 
            element={
              <ProtectedRoute requiredPermission="manageStudents">
                <Announcements />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="attendance" 
            element={
              <ProtectedRoute requiredPermission="manageAttendance">
                <StudentAttendance />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="list-attendance" 
            element={
              <ProtectedRoute requiredPermission="manageAttendance">
                <ListAttendance />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="users" 
            element={
              <ProtectedRoute requiredPermission="manageUsers" adminOnly={true}>
                <UserManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="fine-payments" 
            element={
              <ProtectedRoute requiredPermission="manageBorrowing">
                <FinePayments />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="activities" 
            element={
              <ProtectedRoute requiredPermission="manageBorrowing">
                <AllActivities />
              </ProtectedRoute>
            } 
          />
        </Route>
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SearchProvider>
          <NotificationProvider>
            <Suspense fallback={<Loader />}>
              <AppContent />
            </Suspense>
          </NotificationProvider>
        </SearchProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;

