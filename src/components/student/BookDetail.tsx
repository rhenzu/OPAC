import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  Chip,
  Breadcrumbs,
  Link,
  Divider,
  CircularProgress,
  Skeleton,
  useTheme,
  alpha
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  MenuBook as BookIcon,
  Category as CategoryIcon,
  Person as AuthorIcon,
  Bookmark as ISBNIcon,
  LocalLibrary as PublisherIcon,
  CalendarToday as YearIcon
} from '@mui/icons-material';
import { ref, get } from 'firebase/database';
import { database } from '../../firebase';

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  description?: string;
  category?: string;
  available: number;
  total?: number;
  thumbnail?: string;
  publisher?: string;
  publishedYear?: string;
}

const BookDetail: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookDetails = async () => {
      if (!bookId) {
        setError('Book ID is missing');
        setLoading(false);
        return;
      }

      try {
        const bookRef = ref(database, `books/${bookId}`);
        const snapshot = await get(bookRef);
        
        if (!snapshot.exists()) {
          setError('Book not found');
          setLoading(false);
          return;
        }

        const bookData = snapshot.val();
        setBook({
          id: bookId,
          title: bookData.title || 'Unknown Title',
          author: bookData.author || 'Unknown Author',
          isbn: bookData.isbn || '',
          description: bookData.description || 'No description available.',
          category: bookData.category || '',
          available: bookData.available || 0,
          total: bookData.quantity || 0,
          thumbnail: bookData.imageData || '',
          publisher: bookData.publication || 'Unknown Publisher',
          publishedYear: bookData.copyright || ''
        });
      } catch (err) {
        console.error('Error fetching book details:', err);
        setError('Failed to load book details');
      } finally {
        setLoading(false);
      }
    };

    fetchBookDetails();
  }, [bookId]);

  const handleBack = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Skeleton variant="rectangular" width="100%" height={400} />
            </Grid>
            <Grid item xs={12} md={8}>
              <Skeleton variant="text" height={60} width="80%" />
              <Skeleton variant="text" height={30} width="60%" />
              <Box sx={{ mt: 3 }}>
                <Skeleton variant="text" height={20} width="40%" />
                <Skeleton variant="text" height={20} width="30%" />
              </Box>
              <Box sx={{ mt: 3 }}>
                <Skeleton variant="rectangular" height={120} width="100%" />
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Container>
    );
  }

  if (error || !book) {
    return (
      <Container maxWidth="lg">
        <Paper sx={{ p: 4, mt: 4, textAlign: 'center' }}>
          <Typography variant="h5" color="error">
            {error || 'Something went wrong'}
          </Typography>
          <Button 
            startIcon={<BackIcon />} 
            onClick={handleBack}
            variant="outlined"
            sx={{ mt: 2 }}
          >
            Back to Search
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link 
            color="inherit" 
            onClick={handleBack} 
            sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <BackIcon fontSize="small" sx={{ mr: 0.5 }} />
            Back to Search
          </Link>
          <Typography color="text.primary">{book.title}</Typography>
        </Breadcrumbs>
      
        <Paper 
          elevation={1} 
          sx={{ 
            p: { xs: 2, md: 4 },
            borderRadius: 2,
            bgcolor: theme.palette.background.paper
          }}
        >
          <Grid container spacing={4}>
            {/* Book cover */}
            <Grid item xs={12} md={4}>
              <Box
                sx={{
                  width: '100%',
                  height: '400px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)',
                  borderRadius: 2,
                  overflow: 'hidden'
                }}
              >
                {book.thumbnail ? (
                  <img 
                    src={book.thumbnail} 
                    alt={book.title}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }}
                  />
                ) : (
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <BookIcon sx={{ fontSize: 80, color: 'text.secondary', opacity: 0.3 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      No image available
                    </Typography>
                  </Box>
                )}
              </Box>
              
              {/* Availability status */}
              <Box 
                sx={{ 
                  mt: 2, 
                  p: 2, 
                  borderRadius: 1,
                  bgcolor: book.available > 0 
                    ? alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.1 : 0.05)
                    : alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.1 : 0.05)
                }}
              >
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    fontWeight: 'medium',
                    color: book.available > 0 ? theme.palette.success.main : theme.palette.error.main
                  }}
                >
                  {book.available > 0 
                    ? `${book.available} of ${book.total} copies available`
                    : 'Currently unavailable'}
                </Typography>
              </Box>
            </Grid>
            
            {/* Book details */}
            <Grid item xs={12} md={8}>
              <Typography variant="h4" component="h1" gutterBottom>
                {book.title}
              </Typography>
              
              <Typography variant="h6" gutterBottom color="text.secondary">
                by {book.author}
              </Typography>
              
              {/* Category */}
              {book.category && (
                <Chip
                  icon={<CategoryIcon fontSize="small" />}
                  label={book.category}
                  sx={{ mr: 1, mb: 1 }}
                />
              )}
              
              <Divider sx={{ my: 3 }} />
              
              {/* Book metadata */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {/* ISBN */}
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ISBNIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      ISBN: {book.isbn || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>
                
                {/* Publisher */}
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PublisherIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Publisher: {book.publisher || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>
                
                {/* Published Year */}
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <YearIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Published: {book.publishedYear || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>
                
                {/* Author details */}
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <AuthorIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Author: {book.author}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 3 }} />
              
              {/* Description */}
              <Typography variant="h6" gutterBottom>
                Description
              </Typography>
              <Typography variant="body1" paragraph>
                {book.description}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Container>
  );
};

export default BookDetail; 