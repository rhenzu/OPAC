import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  Chip,
  CircularProgress,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  alpha,
  Button,
  Skeleton
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  MenuBook as BookIcon,
  TrendingUp as TrendingIcon,
  LocalLibrary as LibraryIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { ref, get, query, orderByChild, startAt, endAt } from 'firebase/database';
import { database } from '../../firebase';

// Interface for Book type
interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  description?: string;
  category?: string;
  program?: string;
  available: number;
  total?: number;
  thumbnail?: string;
  publisher?: string;
  publishedYear?: string;
  createdAt?: number;
}

const StudentHome: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [program, setProgram] = useState('all');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [featuredBooks, setFeaturedBooks] = useState<Book[]>([]);
  const [recentlyAddedBooks, setRecentlyAddedBooks] = useState<Book[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const booksPerPage = 8;

  // Handle book click to navigate to details
  const handleBookClick = (bookId: string) => {
    navigate(`/book/${bookId}`);
  };

  // Available categories (could be fetched from database)
  const categories = [
    'all',
    'fiction',
    'non-fiction',
    'science',
    'history',
    'mathematics',
    'literature',
    'computer science',
    'reference',
    'biography'
  ];

  // Available programs/courses
  const programs = [
    'all',
    'BSIT',
    'BSHM',
    'BSBA',
    'BSCRIM',
    'BSED',
    'BEED',
    'SOICT',
    'SOCJ',
    'SOBM',
    'SOHM',
    'SOTE'
  ];

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Handle category change
  const handleCategoryChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    setCategory(e.target.value as string);
  };

  // Handle program change
  const handleProgramChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    setProgram(e.target.value as string);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    fetchRecentBooks();
  };

  // Search books function
  const searchBooks = async () => {
    if (!searchTerm.trim() && category === 'all' && program === 'all') {
      // If no search term and both filters are all, show recent books
      await fetchRecentBooks();
      return;
    }

    setLoading(true);
    try {
      // Get books from Firebase
      const booksRef = ref(database, 'books');
      const snapshot = await get(booksRef);
      
      if (!snapshot.exists()) {
        setSearchResults([]);
        return;
      }

      const books = snapshot.val();
      // Filter books based on search term, category, and program
      const filteredBooks = Object.entries(books)
        .filter(([_, book]: [string, any]) => {
          const bookData = book as any;
          // Match by title, author, ISBN, or description
          const matchTitle = bookData.title && 
            bookData.title.toLowerCase().includes(searchTerm.toLowerCase());
          const matchAuthor = bookData.author && 
            bookData.author.toLowerCase().includes(searchTerm.toLowerCase());
          const matchISBN = bookData.isbn && 
            bookData.isbn.toLowerCase().includes(searchTerm.toLowerCase());
          const matchDesc = bookData.description && 
            bookData.description.toLowerCase().includes(searchTerm.toLowerCase());
          
          // Filter by category if not 'all'
          const matchCategory = category === 'all' || 
            (bookData.category && 
            bookData.category.toLowerCase() === category.toLowerCase());
          
          // Filter by program if not 'all'
          const matchProgram = program === 'all' || 
            (bookData.program && 
            bookData.program.toLowerCase().includes(program.toLowerCase()));
          
          return (matchTitle || matchAuthor || matchISBN || matchDesc) && matchCategory && matchProgram;
        })
        .map(([id, book]: [string, any]) => ({
          id,
          title: book.title || 'Unknown Title',
          author: book.author || 'Unknown Author',
          isbn: book.isbn || '',
          description: book.description || '',
          category: book.category || '',
          program: book.program || '',
          available: book.available || 0,
          total: book.quantity || 0,
          thumbnail: book.imageData || '', // Use the imageData field from the database
          publisher: book.publication || '',
          publishedYear: book.copyright || '',
          createdAt: book.createdAt
        }));
      
      setSearchResults(filteredBooks);
      setCurrentPage(1); // Reset to first page when search results change
    } catch (error) {
      console.error('Error searching books:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all registered books from the database
  const fetchRecentBooks = async () => {
    setLoading(true);
    try {
      const booksRef = ref(database, 'books');
      const snapshot = await get(booksRef);
      
      if (!snapshot.exists()) {
        setSearchResults([]);
        return;
      }

      const books = snapshot.val();
      const booksList = Object.entries(books).map(([id, book]: [string, any]) => ({
        id,
        title: book.title || 'Unknown Title',
        author: book.author || 'Unknown Author',
        isbn: book.isbn || '',
        description: book.description || '',
        category: book.category || '',
        program: book.program || '',
        available: book.available || 0,
        total: book.quantity || 0,
        thumbnail: book.imageData || '', // Use the imageData field from the database
        publisher: book.publication || '',
        publishedYear: book.copyright || '',
        createdAt: book.createdAt
      }));
      
      // Sort by recently added (using Firebase ID as fallback)
      const sortedBooks = booksList.sort((a, b) => {
        // Use createdAt if available, otherwise fall back to id
        if (a.createdAt && b.createdAt) {
          return b.createdAt - a.createdAt;
        }
        return b.id.localeCompare(a.id); // Sort in descending order (newest first)
      });
      
      setSearchResults(sortedBooks); // Display all books, not just a subset
    } catch (error) {
      console.error('Error fetching books:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch featured books
  const fetchFeaturedBooks = async () => {
    setLoadingFeatured(true);
    try {
      const booksRef = ref(database, 'books');
      const snapshot = await get(booksRef);
      
      if (!snapshot.exists()) {
        setFeaturedBooks([]);
        return;
      }

      const books = snapshot.val();
      const booksList = Object.entries(books).map(([id, book]: [string, any]) => ({
        id,
        title: book.title || 'Unknown Title',
        author: book.author || 'Unknown Author',
        isbn: book.isbn || '',
        description: book.description || '',
        category: book.category || '',
        available: book.available || 0,
        total: book.quantity || 0,
        thumbnail: book.imageData || '', // Use imageData from the database
        publisher: book.publication || '', // Use publication from the database
        publishedYear: book.copyright || '', // Use copyright from the database
        createdAt: book.createdAt
      }));
      
      // For now just get 4 random books as featured
      const shuffled = [...booksList].sort(() => 0.5 - Math.random());
      setFeaturedBooks(shuffled.slice(0, 4));
      
    } catch (error) {
      console.error('Error fetching featured books:', error);
      setFeaturedBooks([]);
    } finally {
      setLoadingFeatured(false);
    }
  };

  // Handle search form submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchBooks();
  };

  // Handle pagination
  const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Get current books for pagination
  const indexOfLastBook = currentPage * booksPerPage;
  const indexOfFirstBook = indexOfLastBook - booksPerPage;
  const currentBooks = searchResults.slice(indexOfFirstBook, indexOfLastBook);

  // Load books on initial render
  useEffect(() => {
    fetchRecentBooks();
    fetchFeaturedBooks();
  }, []);

  // Book card component for reuse
  const BookCard = ({ book }: { book: Book }) => (
    <Card
      elevation={1}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        boxShadow: theme.shadows[2],
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: theme.shadows[8],
        },
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <CardActionArea
        sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
        onClick={() => handleBookClick(book.id)}
      >
        {book.thumbnail ? (
          <CardMedia
            component="img"
            height="200"
            image={book.thumbnail}
            alt={book.title}
            sx={{ 
              objectFit: 'contain', 
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
              padding: 1
            }}
          />
        ) : (
          <Box
            sx={{
              height: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
            }}
          >
            <BookIcon sx={{ fontSize: 60, color: alpha(theme.palette.text.secondary, 0.4) }} />
          </Box>
        )}
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography variant="h6" component="div" gutterBottom noWrap fontWeight="medium">
            {book.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            by {book.author}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
            {book.category && (
              <Chip
                label={book.category}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            <Chip
              label={`${book.available} available`}
              size="small"
              color={book.available > 0 ? "success" : "error"}
              variant={book.available > 0 ? "filled" : "outlined"}
            />
          </Box>
          {book.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {book.description}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );

  return (
    <Box>
      {/* Hero section with search */}
      <Paper
        elevation={0}
        sx={{
          mb: 6,
          py: 10,
          px: 4,
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden',
          background: theme.palette.mode === 'dark' 
            ? `linear-gradient(135deg, ${alpha(theme.palette.primary.dark, 0.9)}, ${alpha(theme.palette.secondary.dark, 0.9)})`
            : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.9)}, ${alpha(theme.palette.secondary.main, 0.9)})`,
          color: '#fff',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'url("https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.2,
            zIndex: 0
          }
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 900, mx: 'auto', textAlign: 'center' }}>
          <Typography variant="h2" component="h1" gutterBottom fontWeight="bold" sx={{ textShadow: '0px 2px 4px rgba(0,0,0,0.2)' }}>
            WELCOME TO PCC LIBRARY
          </Typography>
          
          <Typography variant="h4" paragraph sx={{ mb: 4, textShadow: '0px 1px 2px rgba(0,0,0,0.2)' }}>
            Online Public Access Catalog
          </Typography>
          
          <Box 
            component="form" 
            onSubmit={handleSearchSubmit}
            sx={{ 
              mt: 4,
              maxWidth: 1000,
              mx: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              p: 3,
              bgcolor: alpha(theme.palette.background.paper, 0.95),
              borderRadius: 3,
              boxShadow: theme.shadows[12],
              backdropFilter: 'blur(10px)',
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
          >
            {/* Search Input Row */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  color: theme.palette.text.secondary,
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  ml: 1
                }}
              >
                Search Library
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search by title, author, ISBN, or description..."
                value={searchTerm}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: theme.palette.primary.main, fontSize: '1.2rem' }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton 
                        size="small" 
                        onClick={handleClearSearch}
                        sx={{
                          bgcolor: alpha(theme.palette.error.main, 0.1),
                          color: theme.palette.error.main,
                          '&:hover': {
                            bgcolor: alpha(theme.palette.error.main, 0.2),
                          }
                        }}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: 56,
                    borderRadius: 2,
                    bgcolor: theme.palette.background.paper,
                    transition: 'all 0.3s ease',
                    '& fieldset': {
                      borderColor: alpha(theme.palette.divider, 0.3),
                      borderWidth: 2,
                    },
                    '&:hover fieldset': {
                      borderColor: alpha(theme.palette.primary.main, 0.5),
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: theme.palette.primary.main,
                      boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
                    },
                  },
                  '& .MuiInputBase-input': {
                    fontSize: '1rem',
                    fontWeight: 400,
                    '&::placeholder': {
                      color: alpha(theme.palette.text.secondary, 0.7),
                      opacity: 1,
                    },
                  },
                }}
              />
            </Box>

            {/* Filters Row */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  color: theme.palette.text.secondary,
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  ml: 1
                }}
              >
                Filter Results
              </Typography>
              
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
                alignItems: 'stretch'
              }}>
                {/* Category Filter */}
                <FormControl 
                  sx={{ 
                    flex: 1,
                    minWidth: 200,
                    '& .MuiOutlinedInput-root': {
                      height: 48,
                      borderRadius: 2,
                      bgcolor: theme.palette.background.paper,
                      transition: 'all 0.3s ease',
                      '& fieldset': {
                        borderColor: alpha(theme.palette.divider, 0.3),
                        borderWidth: 2,
                      },
                      '&:hover fieldset': {
                        borderColor: alpha(theme.palette.primary.main, 0.5),
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: theme.palette.primary.main,
                        boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: theme.palette.text.primary,
                      fontWeight: 500,
                      fontSize: '0.875rem',
                      '&.Mui-focused': {
                        color: theme.palette.primary.main,
                      },
                      '&.MuiInputLabel-shrink': {
                        color: theme.palette.primary.main,
                        fontWeight: 600,
                      },
                    },
                  }}
                >
                  <InputLabel>📚 Category</InputLabel>
                  <Select
                    value={category}
                    onChange={handleCategoryChange as any}
                    label="📚 Category"
                    sx={{ 
                      '& .MuiSelect-select': {
                        color: theme.palette.text.primary,
                        fontWeight: 500,
                      },
                      '& .MuiSelect-icon': {
                        color: theme.palette.primary.main,
                      },
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          bgcolor: theme.palette.background.paper,
                          boxShadow: theme.shadows[12],
                          borderRadius: 2,
                          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                          mt: 1,
                          '& .MuiMenuItem-root': {
                            py: 1.5,
                            px: 2,
                            borderRadius: 1,
                            mx: 1,
                            my: 0.5,
                            fontWeight: 500,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              bgcolor: alpha(theme.palette.primary.main, 0.08),
                              transform: 'translateX(4px)',
                            },
                            '&.Mui-selected': {
                              bgcolor: alpha(theme.palette.primary.main, 0.15),
                              color: theme.palette.primary.main,
                              fontWeight: 600,
                              '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.2),
                              },
                            },
                          },
                        },
                      },
                    }}
                  >
                    {categories.map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                {/* Program Filter */}
                <FormControl 
                  sx={{ 
                    flex: 1,
                    minWidth: 200,
                    '& .MuiOutlinedInput-root': {
                      height: 48,
                      borderRadius: 2,
                      bgcolor: theme.palette.background.paper,
                      transition: 'all 0.3s ease',
                      '& fieldset': {
                        borderColor: alpha(theme.palette.divider, 0.3),
                        borderWidth: 2,
                      },
                      '&:hover fieldset': {
                        borderColor: alpha(theme.palette.primary.main, 0.5),
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: theme.palette.primary.main,
                        boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: theme.palette.text.primary,
                      fontWeight: 500,
                      fontSize: '0.875rem',
                      '&.Mui-focused': {
                        color: theme.palette.primary.main,
                      },
                      '&.MuiInputLabel-shrink': {
                        color: theme.palette.primary.main,
                        fontWeight: 600,
                      },
                    },
                  }}
                >
                  <InputLabel>🎓 Program</InputLabel>
                  <Select
                    value={program}
                    onChange={handleProgramChange as any}
                    label="🎓 Program"
                    sx={{ 
                      '& .MuiSelect-select': {
                        color: theme.palette.text.primary,
                        fontWeight: 500,
                      },
                      '& .MuiSelect-icon': {
                        color: theme.palette.primary.main,
                      },
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          bgcolor: theme.palette.background.paper,
                          boxShadow: theme.shadows[12],
                          borderRadius: 2,
                          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                          mt: 1,
                          '& .MuiMenuItem-root': {
                            py: 1.5,
                            px: 2,
                            borderRadius: 1,
                            mx: 1,
                            my: 0.5,
                            fontWeight: 500,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              bgcolor: alpha(theme.palette.primary.main, 0.08),
                              transform: 'translateX(4px)',
                            },
                            '&.Mui-selected': {
                              bgcolor: alpha(theme.palette.primary.main, 0.15),
                              color: theme.palette.primary.main,
                              fontWeight: 600,
                              '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.2),
                              },
                            },
                          },
                        },
                      },
                    }}
                  >
                    {programs.map((prog) => (
                      <MenuItem key={prog} value={prog}>
                        {prog.charAt(0).toUpperCase() + prog.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Search Button */}
                <Button
                  type="submit"
                  variant="contained" 
                  size="large"
                  startIcon={<SearchIcon />}
                  sx={{ 
                    bgcolor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    height: 48,
                    minWidth: { xs: '100%', sm: 140 },
                    borderRadius: 2,
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    textTransform: 'none',
                    boxShadow: theme.shadows[4],
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      bgcolor: theme.palette.primary.dark,
                      boxShadow: theme.shadows[8],
                      transform: 'translateY(-2px)',
                    },
                    '&:active': {
                      transform: 'translateY(0px)',
                    },
                  }}
                >
                  Search Books
                </Button>
              </Box>
            </Box>

            {/* Quick Filter Chips */}
            {(searchTerm || category !== 'all' || program !== 'all') && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    color: theme.palette.text.secondary,
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    ml: 1
                  }}
                >
                  Active Filters
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {searchTerm && (
                    <Chip
                      label={`Search: "${searchTerm}"`}
                      onDelete={handleClearSearch}
                      color="primary"
                      variant="outlined"
                      size="small"
                      sx={{ 
                        borderRadius: 2,
                        fontWeight: 500,
                        '& .MuiChip-deleteIcon': {
                          color: theme.palette.primary.main,
                        },
                      }}
                    />
                  )}
                  {category !== 'all' && (
                    <Chip
                      label={`Category: ${category.charAt(0).toUpperCase() + category.slice(1)}`}
                      onDelete={() => handleCategoryChange({ target: { value: 'all' } } as any)}
                      color="secondary"
                      variant="outlined"
                      size="small"
                      sx={{ 
                        borderRadius: 2,
                        fontWeight: 500,
                        '& .MuiChip-deleteIcon': {
                          color: theme.palette.secondary.main,
                        },
                      }}
                    />
                  )}
                  {program !== 'all' && (
                    <Chip
                      label={`Program: ${program.charAt(0).toUpperCase() + program.slice(1)}`}
                      onDelete={() => handleProgramChange({ target: { value: 'all' } } as any)}
                      color="info"
                      variant="outlined"
                      size="small"
                      sx={{ 
                        borderRadius: 2,
                        fontWeight: 500,
                        '& .MuiChip-deleteIcon': {
                          color: theme.palette.info.main,
                        },
                      }}
                    />
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>
      
      {/* Main Content Area */}
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
        {/* Display featured books section only when not searching */}
        {!searchTerm && category === 'all' && (
          <>
            {/* Featured Books Section */}
            <Box sx={{ mb: 8 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <TrendingIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h5" component="h2" fontWeight="bold">
                  Featured Books
                </Typography>
              </Box>
              
              <Grid container spacing={3}>
                {loadingFeatured ? (
                  Array.from(new Array(4)).map((_, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                      <Card sx={{ height: '100%', borderRadius: 2 }}>
                        <Skeleton variant="rectangular" height={200} />
                        <CardContent>
                          <Skeleton variant="text" height={32} />
                          <Skeleton variant="text" />
                          <Skeleton variant="text" width="60%" />
                        </CardContent>
                      </Card>
                    </Grid>
                  ))
                ) : featuredBooks.length > 0 ? (
                  featuredBooks.map(book => (
                    <Grid item key={book.id} xs={12} sm={6} md={3}>
                      <BookCard book={book} />
                    </Grid>
                  ))
                ) : (
                  <Box sx={{ textAlign: 'center', py: 5, width: '100%' }}>
                    <Typography>No featured books available.</Typography>
                  </Box>
                )}
              </Grid>
            </Box>

            {/* All Books Section */}
            <Box sx={{ mb: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <BookIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h5" component="h2" fontWeight="bold">
                  All Library Books {!loading && `(${searchResults.length})`}
                </Typography>
              </Box>
              
              {loading ? (
                <Box display="flex" justifyContent="center" my={8}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  <Grid container spacing={3}>
                    {currentBooks.map((book) => (
                      <Grid item key={book.id} xs={12} sm={6} md={3}>
                        <BookCard book={book} />
                      </Grid>
                    ))}
                  </Grid>
                  
                  {/* Pagination */}
                  {searchResults.length > booksPerPage && (
                    <Box display="flex" justifyContent="center" mt={6}>
                      <Pagination
                        count={Math.ceil(searchResults.length / booksPerPage)}
                        page={currentPage}
                        onChange={handlePageChange}
                        color="primary"
                        size="large"
                        showFirstButton
                        showLastButton
                      />
                    </Box>
                  )}
                  
                  {searchResults.length === 0 && (
                    <Paper sx={{ textAlign: 'center', py: 8, borderRadius: 2 }}>
                      <BookIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                      <Typography variant="h6" color="text.secondary">
                        No books available in the library
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Check back later for new additions
                      </Typography>
                    </Paper>
                  )}
                </>
              )}
            </Box>
          </>
        )}

        {/* Search Results Section */}
        {(searchTerm || category !== 'all') && (
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <SearchIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h5" component="h2" fontWeight="bold">
                Search Results ({searchResults.length})
              </Typography>
            </Box>
            
            {loading ? (
              <Box display="flex" justifyContent="center" my={8}>
                <CircularProgress />
              </Box>
            ) : searchResults.length > 0 ? (
              <>
                <Grid container spacing={3}>
                  {currentBooks.map((book) => (
                    <Grid item key={book.id} xs={12} sm={6} md={3}>
                      <BookCard book={book} />
                    </Grid>
                  ))}
                </Grid>
                
                {/* Pagination */}
                {searchResults.length > booksPerPage && (
                  <Box display="flex" justifyContent="center" mt={6}>
                    <Pagination
                      count={Math.ceil(searchResults.length / booksPerPage)}
                      page={currentPage}
                      onChange={handlePageChange}
                      color="primary"
                      size="large"
                      showFirstButton
                      showLastButton
                    />
                  </Box>
                )}
              </>
            ) : (
              <Paper sx={{ textAlign: 'center', py: 8, borderRadius: 2 }}>
                <BookIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No books found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Try a different search term or category
                </Typography>
              </Paper>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default StudentHome;