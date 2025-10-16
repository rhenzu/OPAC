import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
  Paper,
  Card,
  CardContent,
  Typography,
  Avatar,
  useTheme,
  Button,
  alpha,
  IconButton,
  Divider,
  LinearProgress,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  LibraryBooks,
  Group,
  BookOnline,
  Warning,
  Book as BookIcon,
  TrendingUp,
  ArrowForward,
  History,
  MenuBook,
  CalendarToday,
  MoreHoriz,
  PersonAdd,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  SwapHoriz as SwapHorizIcon,
  Gavel as FinesIcon,
  Menu as MenuIcon,
  ArrowUpward,
  ArrowDownward,
  Description,
  Visibility,
  CallToAction,
  Email as EmailIcon,
  Email,
  Dashboard,
  Assignment,
  Settings,
  Notifications,
  Assessment,
  MonetizationOn,
} from '@mui/icons-material';
import { database } from '../../firebase';
import { ref, get, query, orderByChild, limitToLast } from 'firebase/database';
import { useThemeContext } from '../../contexts/ThemeContext';
import { calculateAndUpdateFines } from '../../utils/fineUtils';

interface DashboardStats {
  totalBooks: number;
  availableBooks: number;
  totalStudents: number;
  borrowedBooks: number;
  overdueBooks: number;
}

interface ActivityRecord {
  id: string;
  type: 'borrow' | 'return' | 'add_book' | 'add_student'; 
  title?: string;
  studentName?: string;
  timestamp: string;
  bookId?: string;
  studentId?: string;
  bookTitle?: string;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { darkMode } = useThemeContext();
  const [stats, setStats] = useState<DashboardStats>({
    totalBooks: 0,
    availableBooks: 0,
    totalStudents: 0,
    borrowedBooks: 0,
    overdueBooks: 0,
  });
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
    loadRecentActivities();
    
    // Check for overdue books and calculate fines when dashboard loads
    const checkOverdueAndCalculateFines = async () => {
      try {
        console.log('Checking for overdue books and calculating fines...');
        const finesProcessed = await calculateAndUpdateFines();
        if (finesProcessed > 0) {
          console.log(`Processed ${finesProcessed} fine records`);
        } else {
          console.log('No new fines to calculate');
        }
      } catch (error) {
        console.error('Error calculating fines:', error);
      }
    };
    
    checkOverdueAndCalculateFines();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const booksSnapshot = await get(ref(database, 'books'));
      const studentsSnapshot = await get(ref(database, 'students'));
      const borrowedSnapshot = await get(ref(database, 'borrows'));

      const books = booksSnapshot.val() || {};
      const students = studentsSnapshot.val() || {};
      const borrowed = borrowedSnapshot.val() || {};

      const totalBooks = Object.keys(books).length;
      const availableBooks = Object.values(books).reduce((acc: number, book: any) => acc + book.available, 0);
      const totalStudents = Object.keys(students).length;
      
      const borrowedBooks = Object.values(borrowed).filter((book: any) => !book.returnDate).length;
      const now = new Date();
      const overdueBooks = Object.values(borrowed).filter((book: any) => {
        return !book.returnDate && new Date(book.dueDate) < now;
      }).length;

      setStats({
        totalBooks,
        availableBooks,
        totalStudents,
        borrowedBooks,
        overdueBooks,
      });
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      setLoading(false);
    }
  };

  const loadRecentActivities = async () => {
    try {
      // Get activities directly from the activities collection
      const activitiesRef = query(ref(database, 'activities'), orderByChild('timestamp'), limitToLast(5));
      const activitiesSnapshot = await get(activitiesRef);
      
      const activityRecords: ActivityRecord[] = [];
      
      if (activitiesSnapshot.exists()) {
        const activities = activitiesSnapshot.val();
        
        // Process activity records
        for (const [id, activity] of Object.entries(activities) as [string, any][]) {
          activityRecords.push({
            id,
            type: activity.type,
            timestamp: activity.timestamp,
            bookId: activity.bookId,
            studentId: activity.studentId,
            bookTitle: activity.bookTitle,
            studentName: activity.studentName,
          });
        }
      }
      
      // Sort by timestamp (newest first)
      activityRecords.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      setActivities(activityRecords);
    } catch (error) {
      console.error('Error loading recent activities:', error);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    icon, 
    color,
    secondaryText
  }: { 
    title: string; 
    value: number; 
    icon: React.ReactNode; 
    color: string;
    secondaryText?: string;
  }) => (
    <Card 
      elevation={0}
      sx={{ 
        height: '100%', 
        borderRadius: 3,
        border: `1px solid ${darkMode ? alpha(color, 0.2) : alpha(color, 0.15)}`,
        backgroundColor: darkMode ? alpha(color, 0.07) : alpha(color, 0.03),
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 6px 20px ${alpha(color, 0.2)}`,
        }
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: darkMode ? alpha(color, 0.9) : color }}>
            {title}
          </Typography>
          <Avatar sx={{ backgroundColor: alpha(color, 0.2) }}>
            {icon}
          </Avatar>
        </Box>
        <Typography variant="h3" component="div" sx={{ fontWeight: 700, mb: 1, color: darkMode ? alpha(color, 0.9) : color }}>
          {value}
        </Typography>
        {secondaryText && (
          <Typography variant="body2" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TrendingUp fontSize="small" sx={{ color: theme.palette.success.main }} />
            {secondaryText}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  const QuickActionCard = ({ icon, title, description, onClick }: { 
    icon: React.ReactNode; 
    title: string; 
    description: string;
    onClick: () => void;
  }) => (
    <Card 
      elevation={0}
      sx={{
        cursor: 'pointer',
        height: '100%',
        borderRadius: 3,
        backgroundColor: darkMode ? alpha(theme.palette.background.paper, 0.6) : theme.palette.background.paper,
        border: `1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.1)',
          '& .arrow-icon': {
            transform: 'translateX(4px)',
          }
        },
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
            {icon}
          </Avatar>
          <Typography variant="h6" fontWeight="600">
            {title}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <IconButton 
            size="small" 
            sx={{ 
              color: theme.palette.primary.main,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
            }}
          >
            <ArrowForward className="arrow-icon" sx={{ transition: 'transform 0.2s ease-in-out' }} />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );

  const RecentActivity = () => {
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      
      // Check if date is today
      if (date.toDateString() === now.toDateString()) {
        return `Today, ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
      } 
      // Check if date is yesterday
      else if (date.toDateString() === yesterday.toDateString()) {
        return `Yesterday, ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
      } 
      // Otherwise return the full date
      else {
        return date.toLocaleDateString() + ', ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      }
    };
    
    return (
      <Card 
        elevation={0}
        sx={{ 
          height: '100%', 
          borderRadius: 3,
          border: `1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
          backgroundColor: darkMode ? alpha(theme.palette.background.paper, 0.6) : theme.palette.background.paper,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="600">
              Recent Activities
            </Typography>
            <IconButton size="small">
              <MoreHoriz />
            </IconButton>
          </Box>
          <Stack spacing={2}>
            {activities.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                No recent activities found
              </Typography>
            ) : (
              activities.map((activity, index) => (
                <React.Fragment key={activity.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ 
                      bgcolor: alpha(
                        activity.type === 'borrow' 
                          ? theme.palette.info.main 
                          : activity.type === 'return' 
                            ? theme.palette.warning.main 
                            : theme.palette.primary.main, 
                        0.1
                      ) 
                    }}>
                      {activity.type === 'borrow' && (
                        <BookOnline sx={{ color: theme.palette.info.main }} />
                      )}
                      {activity.type === 'return' && (
                        <History sx={{ color: theme.palette.warning.main }} />
                      )}
                      {activity.type === 'add_book' && (
                        <MenuBook sx={{ color: theme.palette.primary.main }} />
                      )}
                      {activity.type === 'add_student' && (
                        <PersonAdd sx={{ color: theme.palette.success.main }} />
                      )}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {activity.type === 'borrow' && `Book borrowed: "${activity.bookTitle}"`}
                        {activity.type === 'return' && `Book returned: "${activity.bookTitle}"`}
                        {activity.type === 'add_book' && `New book added: "${activity.title}"`}
                        {activity.type === 'add_student' && `New student registered: "${activity.studentName}"`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarToday fontSize="inherit" /> {formatDate(activity.timestamp)}
                      </Typography>
                    </Box>
                  </Box>
                  {index < activities.length - 1 && <Divider />}
                </React.Fragment>
              ))
            )}
          </Stack>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <Button 
              variant="text" 
              endIcon={<ArrowForward />}
              onClick={() => navigate('/admin/activities')}
            >
              View All Activities
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const LibraryUsage = () => {
    const availablePercentage = Math.round((stats.availableBooks / stats.totalBooks) * 100) || 0;
    const borrowedPercentage = Math.round((stats.borrowedBooks / stats.totalBooks) * 100) || 0;
    
    return (
      <Card 
        elevation={0}
        sx={{ 
          height: '100%', 
          borderRadius: 3,
          border: `1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
          backgroundColor: darkMode ? alpha(theme.palette.background.paper, 0.6) : theme.palette.background.paper,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight="600" sx={{ mb: 3 }}>
            Library Usage
          </Typography>
          
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" fontWeight="medium">
                Available Books
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {availablePercentage}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={availablePercentage} 
              sx={{ 
                height: 8, 
                borderRadius: 4,
                backgroundColor: alpha(theme.palette.success.main, 0.2),
                '& .MuiLinearProgress-bar': {
                  backgroundColor: theme.palette.success.main,
                }
              }} 
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {stats.availableBooks} of {stats.totalBooks} books available
            </Typography>
          </Box>
          
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" fontWeight="medium">
                Borrowed Books
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {borrowedPercentage}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={borrowedPercentage} 
              sx={{ 
                height: 8, 
                borderRadius: 4,
                backgroundColor: alpha(theme.palette.info.main, 0.2),
                '& .MuiLinearProgress-bar': {
                  backgroundColor: theme.palette.info.main,
                }
              }} 
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {stats.borrowedBooks} books currently borrowed
            </Typography>
          </Box>
          
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" fontWeight="medium">
                Overdue Books
              </Typography>
              <Typography variant="body2" fontWeight="bold" color="error.main">
                {stats.overdueBooks}
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={(stats.overdueBooks / stats.totalBooks) * 100} 
              sx={{ 
                height: 8, 
                borderRadius: 4,
                backgroundColor: alpha(theme.palette.error.main, 0.2),
                '& .MuiLinearProgress-bar': {
                  backgroundColor: theme.palette.error.main,
                }
              }} 
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {stats.overdueBooks} books are overdue
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const QuickActions = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <QuickActionCard
          icon={<SwapHorizIcon fontSize="large" />}
          title="Borrow/Return"
          description="Manage book borrowing and returning"
          onClick={() => navigate('/admin/borrow-return')}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <QuickActionCard
          icon={<BookIcon fontSize="large" />}
          title="Add Books"
          description="Add new books to the library"
          onClick={() => navigate('/admin/books')}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <QuickActionCard
          icon={<PeopleIcon fontSize="large" />}
          title="Manage Students"
          description="Add or edit student information"
          onClick={() => navigate('/admin/students')}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <QuickActionCard
          icon={<EmailIcon fontSize="large" />}
          title="Send Announcements"
          description="Send emails to registered students"
          onClick={() => navigate('/admin/announcements')}
        />
      </Grid>
    </Grid>
  );

  const menuItems = [
    { 
      text: 'Book Management', 
      icon: <BookIcon sx={{ color: theme.palette.primary.main }} />, 
      path: '/admin/books', 
      description: 'Add, edit, and manage books in the library' 
    },
    { 
      text: 'Student Management', 
      icon: <PeopleIcon sx={{ color: theme.palette.secondary.main }} />, 
      path: '/admin/students', 
      description: 'Manage student records and IDs' 
    },
    { 
      text: 'Borrow/Return', 
      icon: <SwapHorizIcon sx={{ color: theme.palette.info.main }} />, 
      path: '/admin/borrow-return', 
      description: 'Process book borrowing and returns' 
    },
    { 
      text: 'Fine Payments', 
      icon: <FinesIcon sx={{ color: theme.palette.warning.main }} />, 
      path: '/admin/fine-payments', 
      description: 'Manage and collect fine payments' 
    },
    { 
      text: 'Borrowed Books', 
      icon: <Description sx={{ color: theme.palette.info.main }} />, 
      path: '/admin/borrowed-books', 
      description: 'View all currently borrowed books' 
    },
    { 
      text: 'Overdue Notifications', 
      icon: <MonetizationOn sx={{ color: theme.palette.error.main }} />, 
      path: '/admin/overdue-notifications', 
      description: 'View and manage overdue books' 
    },
  ];

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{ 
            fontWeight: 700, 
            mb: 1,
            color: darkMode ? theme.palette.primary.light : theme.palette.primary.main
          }}
        >
          Welcome to PCC Library
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Manage your library system efficiently with our comprehensive dashboard.
        </Typography>
      </Box>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6} lg={3}>
          <StatCard
            title="Total Books"
            value={stats.totalBooks}
            icon={<LibraryBooks sx={{ color: theme.palette.primary.main }} />}
            color={theme.palette.primary.main}
            secondaryText="5 books added this week"
          />
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <StatCard
            title="Total Students"
            value={stats.totalStudents}
            icon={<Group sx={{ color: theme.palette.secondary.main }} />}
            color={theme.palette.secondary.main}
            secondaryText="10 new students this month"
          />
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <StatCard
            title="Books Borrowed"
            value={stats.borrowedBooks}
            icon={<BookOnline sx={{ color: theme.palette.info.main }} />}
            color={theme.palette.info.main}
            secondaryText="15 transactions today"
          />
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <StatCard
            title="Overdue Books"
            value={stats.overdueBooks}
            icon={<Warning sx={{ color: theme.palette.error.main }} />}
            color={theme.palette.error.main}
            secondaryText="3 due this week"
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <LibraryUsage />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <RecentActivity />
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ mb: 2, mt: 2 }}>
            <Typography variant="h5" fontWeight="600" color="primary">
              Quick Actions
            </Typography>
          </Box>
          <QuickActions />
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;