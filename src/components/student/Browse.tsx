import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActionArea,
  Box,
  TextField,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Divider,
  Pagination,
  Chip,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  MenuBook as BookIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { ref, get } from 'firebase/database';
import { database } from '../../firebase';

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category?: string;
  available: number;
  quantity: number;
  imageData?: string;
  publication?: string;
  copyright?: string;
  createdAt?: number;
  accessionNumber: string;
}

const Browse: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [category, setCategory] = useState('all');
  const [filterOptions, setFilterOptions] = useState({
    authors: [] as string[],
    categories: [] as string[],
  });
  const booksPerPage = 12;

  // Load books on component mount
  useEffect(() => {
    loadBooks();
  }, []);

  // Filter books whenever search term or category changes
  useEffect(() => {
    filterBooks();
  }, [books, searchTerm, category]);

  const loadBooks = async () => {
    setLoading(true);
    try {
      const booksRef = ref(database, 'books');
      const snapshot = await get(booksRef);
      if (snapshot.exists()) {
        const booksData = snapshot.val();
        const booksArray = Object.entries(booksData).map(([id, data]: [string, any]) => ({
          id,
          ...data,
        }));
        
        // Sort books by newest first
        const sortedBooks = booksArray.sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return b.createdAt - a.createdAt;
          }
          return b.id.localeCompare(a.id);
        });
        
        setBooks(sortedBooks);
        setFilteredBooks(sortedBooks);
        extractFilterOptions(sortedBooks);
      } else {
        setBooks([]);
        setFilteredBooks([]);
      }
    } catch (error) {
      console.error('Error loading books:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractFilterOptions = (books: Book[]) => {
    const authors = new Set<string>();
    const categories = new Set<string>();
    
    books.forEach(book => {
      if (book.author) authors.add(book.author);
      if (book.category) categories.add(book.category);
    });
    
    setFilterOptions({
      authors: Array.from(authors).sort(),
      categories: Array.from(categories).sort(),
    });
  };

  const filterBooks = () => {
    let result = [...books];
    
    // Apply text search
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase();
      result = result.filter(book => 
        book.title.toLowerCase().includes(searchTermLower) ||
        book.author.toLowerCase().includes(searchTermLower) ||
        (book.isbn && book.isbn.toLowerCase().includes(searchTermLower)) ||
        (book.accessionNumber && book.accessionNumber.toLowerCase().includes(searchTermLower))
      );
    }
    
    // Apply category filter
    if (category !== 'all') {
      result = result.filter(book => book.category === category);
    }
    
    setFilteredBooks(result);
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleCategoryChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    setCategory(e.target.value as string);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setCategory('all');
  };

  const handleBookClick = (bookId: string) => {
    navigate(`/book/${bookId}`);
  };

  // Pagination
  const indexOfLastBook = currentPage * booksPerPage;
  const indexOfFirstBook = indexOfLastBook - booksPerPage;
  const currentBooks = filteredBooks.slice(indexOfFirstBook, indexOfLastBook);
  const totalPages = Math.ceil(filteredBooks.length / booksPerPage);

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Browse Library Books
        </Typography>
        <Divider sx={{ mb: 3 }} />

        {/* Search and Filter Section */}
        <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by title, author, or ISBN..."
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton onClick={clearSearch} size="small">
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>Category</InputLabel>
              <Select
                value={category}
                onChange={handleCategoryChange as any}
                label="Category"
              >
                <MenuItem value="all">All Categories</MenuItem>
                {filterOptions.categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Results count */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Showing {filteredBooks.length} of {books.length} books
          </Typography>
          {(searchTerm || category !== 'all') && (
            <Chip 
              label="Clear Filters" 
              onClick={clearSearch}
              size="small"
              icon={<ClearIcon />}
            />
          )}
        </Box>

        {/* Loading indicator */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* No results message */}
        {!loading && filteredBooks.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <BookIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No books found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your search or filter criteria
            </Typography>
          </Box>
        )}

        {/* Books grid */}
        <Grid container spacing={3}>
          {currentBooks.map((book) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={book.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  }
                }}
              >
                <CardActionArea onClick={() => handleBookClick(book.id)} sx={{ flexGrow: 1 }}>
                  {book.imageData ? (
                    <CardMedia
                      component="img"
                      height="200"
                      image={book.imageData}
                      alt={book.title}
                      sx={{ objectFit: 'contain', bgcolor: alpha(theme.palette.primary.main, 0.05) }}
                    />
                  ) : (
                    <Box 
                      sx={{ 
                        height: 200, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        bgcolor: alpha(theme.palette.primary.main, 0.05)
                      }}
                    >
                      <ImageIcon sx={{ fontSize: 60, color: alpha(theme.palette.text.secondary, 0.4) }} />
                    </Box>
                  )}
                  <CardContent>
                    <Typography gutterBottom variant="h6" component="h2" noWrap>
                      {book.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {book.author}
                    </Typography>
                    {book.category && (
                      <Chip 
                        label={book.category} 
                        size="small" 
                        sx={{ mt: 1, fontSize: '0.7rem' }} 
                      />
                    )}
                    <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color={book.available > 0 ? 'success.main' : 'error.main'}>
                        {book.available > 0 ? `${book.available} available` : 'Not available'}
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination 
              count={totalPages} 
              page={currentPage} 
              onChange={handlePageChange} 
              color="primary" 
              showFirstButton 
              showLastButton
            />
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default Browse; 