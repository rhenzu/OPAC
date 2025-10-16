import React from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Divider,
  Grid,
  Card,
  CardContent,
  useTheme,
  alpha,
} from '@mui/material';
import {
  MenuBook as MenuBookIcon,
  LibraryBooks as LibraryBooksIcon,
  Info as InfoIcon,
  School as SchoolIcon,
} from '@mui/icons-material';

const About: React.FC = () => {
  const theme = useTheme();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <InfoIcon sx={{ fontSize: 28, mr: 1, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            About the Library
          </Typography>
        </Box>
        <Divider sx={{ mb: 4 }} />

        <Typography variant="body1" paragraph>
          Welcome to our Online Public Access Catalog (OPAC) system. This modern library management system 
          provides an efficient and user-friendly interface for students and staff to access library resources.
        </Typography>

        <Typography variant="body1" paragraph>
          Our library catalog contains a wide variety of books across different categories including fiction, 
          non-fiction, science, history, mathematics, literature, computer science, reference materials, 
          and biographies.
        </Typography>

        <Box sx={{ my: 4 }}>
          <Typography variant="h5" gutterBottom>
            <SchoolIcon sx={{ fontSize: 24, mr: 1, verticalAlign: 'text-bottom', color: 'primary.main' }} />
            Mission
          </Typography>
          <Typography variant="body1" paragraph>
            Our mission is to provide a comprehensive and accessible library service that supports 
            educational excellence, promotes lifelong learning, and enriches the intellectual and cultural 
            life of our community.
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            <LibraryBooksIcon sx={{ fontSize: 24, mr: 1, verticalAlign: 'text-bottom', color: 'primary.main' }} />
            Services
          </Typography>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ height: '100%', bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Book Borrowing</Typography>
                  <Typography variant="body2">
                    Students can borrow books for up to two weeks and can extend the borrowing period if needed.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ height: '100%', bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Online Catalog</Typography>
                  <Typography variant="body2">
                    Search for books by title, author, or category and check availability in real-time.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ height: '100%', bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Reference Services</Typography>
                  <Typography variant="body2">
                    Librarians are available to assist with research needs and locating materials.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            <MenuBookIcon sx={{ fontSize: 24, mr: 1, verticalAlign: 'text-bottom', color: 'primary.main' }} />
            Library Hours
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`, pb: 1 }}>
              <Typography variant="body1" fontWeight="medium">Monday - Friday</Typography>
              <Typography variant="body1">8:00 AM - 8:00 PM</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`, pb: 1 }}>
              <Typography variant="body1" fontWeight="medium">Saturday</Typography>
              <Typography variant="body1">9:00 AM - 5:00 PM</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`, pb: 1 }}>
              <Typography variant="body1" fontWeight="medium">Sunday</Typography>
              <Typography variant="body1">Closed</Typography>
            </Box>
          </Box>
        </Box>

        <Box>
          <Typography variant="h5" gutterBottom>
            Contact
          </Typography>
          <Typography variant="body1">
            For any inquiries, please contact the library staff at:
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Email: library@example.edu
          </Typography>
          <Typography variant="body1">
            Phone: (123) 456-7890
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default About; 