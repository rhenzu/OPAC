import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Popper,
  ClickAwayListener,
  Divider,
  CircularProgress,
  Chip,
  useTheme,
  alpha,
  Button,
  Menu,
  MenuItem,
  Tooltip,
  ListItemButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Book as BookIcon,
  Person as PersonIcon,
  SwapHoriz as BorrowIcon,
  FilterList as FilterIcon,
  CalendarToday,
} from '@mui/icons-material';
import { useSearch, SearchCategory } from '../../contexts/SearchContext';
import { useThemeContext } from '../../contexts/ThemeContext';

const CATEGORY_ICONS = {
  books: <BookIcon />,
  students: <PersonIcon />,
  borrowed: <BorrowIcon />,
  all: <FilterIcon />,
};

const CATEGORY_LABELS: Record<SearchCategory, string> = {
  books: 'Books',
  students: 'Students',
  borrowed: 'Borrowings',
  all: 'All',
};

const GlobalSearch: React.FC = () => {
  const theme = useTheme();
  const { darkMode } = useThemeContext();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);
  
  const {
    searchTerm,
    searchCategory,
    searchResults,
    isSearching,
    setSearchTerm,
    setSearchCategory,
    clearSearch,
  } = useSearch();

  // Handle input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (e.target.value.length > 0 && !open) {
      setOpen(true);
    }
  };

  // Clear search
  const handleClearSearch = () => {
    clearSearch();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Handle result selection
  const handleResultClick = (result: any) => {
    setOpen(false);
    
    switch (result.type) {
      case 'book':
        navigate(`/admin/books?highlight=${result.id}`);
        break;
      case 'student':
        navigate(`/admin/students?highlight=${result.id}`);
        break;
      case 'borrowing':
        navigate(`/admin/borrow-return?highlight=${result.id}`);
        break;
      default:
        break;
    }
  };

  // Open/close filter menu
  const handleFilterMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setFilterMenuAnchor(event.currentTarget);
  };

  const handleFilterMenuClose = () => {
    setFilterMenuAnchor(null);
  };

  const handleCategorySelect = (category: SearchCategory) => {
    setSearchCategory(category);
    handleFilterMenuClose();
  };

  // Handle clicks outside of the search results
  const handleClickAway = () => {
    setOpen(false);
  };

  // Focus input when escape key is pressed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
      
      // Global shortcut (Ctrl+K or Cmd+K) to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (inputRef.current) {
          inputRef.current.focus();
          setOpen(true);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Automatically open results when there's a search term
  useEffect(() => {
    if (searchTerm && searchTerm.length > 0) {
      setOpen(true);
    }
  }, [searchTerm]);

  // Render result icon based on type
  const renderResultIcon = (type: string) => {
    switch (type) {
      case 'book':
        return <BookIcon sx={{ color: theme.palette.primary.main }} />;
      case 'student':
        return <PersonIcon sx={{ color: theme.palette.secondary.main }} />;
      case 'borrowing':
        return <BorrowIcon sx={{ color: theme.palette.info.main }} />;
      default:
        return <SearchIcon />;
    }
  };

  // Render result item based on its type
  const renderResultItem = (result: any) => {
    switch (result.type) {
      case 'book':
        return (
          <Box>
            <Typography variant="subtitle1" fontWeight="medium" noWrap>
              {result.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {result.author} • ISBN: {result.isbn}
            </Typography>
            <Chip 
              size="small" 
              label={`${result.available} available`} 
              sx={{ 
                mt: 0.5, 
                fontSize: '0.7rem',
                bgcolor: result.available > 0 
                  ? alpha(theme.palette.success.main, 0.1) 
                  : alpha(theme.palette.error.main, 0.1),
                color: result.available > 0 
                  ? theme.palette.success.main 
                  : theme.palette.error.main,
              }}
            />
          </Box>
        );
      case 'student':
        return (
          <Box>
            <Typography variant="subtitle1" fontWeight="medium" noWrap>
              {result.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              Grade {result.grade} - {result.section} • ID: {result.studentId}
            </Typography>
          </Box>
        );
      case 'borrowing':
        return (
          <Box>
            <Typography variant="subtitle1" fontWeight="medium" noWrap>
              {result.bookTitle}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              Borrowed by: {result.studentName}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5, alignItems: 'center' }}>
              <CalendarToday fontSize="small" sx={{ color: theme.palette.info.main, fontSize: '0.8rem' }} />
              <Typography variant="caption" fontWeight="medium" sx={{ display: 'flex', alignItems: 'center' }}>
                Due: {result.dueDate}
              </Typography>
              {!result.returnDate && (
                <Chip 
                  size="small" 
                  label="Active" 
                  sx={{ 
                    fontSize: '0.7rem',
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    color: theme.palette.info.main,
                  }}
                />
              )}
              {result.returnDate && (
                <Chip 
                  size="small" 
                  label="Returned" 
                  sx={{ 
                    fontSize: '0.7rem',
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    color: theme.palette.success.main,
                  }}
                />
              )}
            </Box>
          </Box>
        );
      default:
        return <Typography>{JSON.stringify(result)}</Typography>;
    }
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width: { xs: '100%', sm: 300, md: 400 },
        mx: { xs: 0, sm: 2 },
      }}
      ref={anchorRef}
    >
      <TextField
        fullWidth
        placeholder="Search books, students, borrowings..."
        size="small"
        value={searchTerm}
        onChange={handleSearchChange}
        inputRef={inputRef}
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: darkMode 
              ? alpha(theme.palette.background.paper, 0.6) 
              : alpha(theme.palette.background.paper, 0.8),
            borderRadius: 2,
            '&:hover': {
              backgroundColor: darkMode 
                ? alpha(theme.palette.background.paper, 0.8) 
                : alpha(theme.palette.background.paper, 1),
            },
          },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {searchTerm && (
                <IconButton
                  edge="end"
                  size="small"
                  onClick={handleClearSearch}
                  aria-label="clear search"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
              <Tooltip title="Filter by category">
                <IconButton
                  edge="end"
                  size="small"
                  onClick={handleFilterMenuOpen}
                  aria-label="filter search"
                  color={searchCategory !== 'all' ? 'primary' : 'default'}
                  sx={{ ml: 0.5 }}
                >
                  {CATEGORY_ICONS[searchCategory]}
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={filterMenuAnchor}
                open={Boolean(filterMenuAnchor)}
                onClose={handleFilterMenuClose}
                PaperProps={{
                  sx: {
                    mt: 1.5,
                    boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                    borderRadius: 2,
                  },
                }}
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <MenuItem 
                    key={key} 
                    onClick={() => handleCategorySelect(key as SearchCategory)}
                    selected={searchCategory === key}
                    sx={{ 
                      minWidth: 150,
                      py: 1,
                      '&.Mui-selected': {
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                      },
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: 36 }}>
                      {CATEGORY_ICONS[key as SearchCategory]}
                    </ListItemAvatar>
                    <ListItemText primary={label} />
                  </MenuItem>
                ))}
              </Menu>
            </InputAdornment>
          ),
        }}
      />

      {/* Keyboard shortcut indicator */}
      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          bgcolor: darkMode ? alpha('#fff', 0.1) : alpha('#000', 0.05),
          px: 0.8,
          py: 0.2,
          borderRadius: 1,
          color: 'text.secondary',
          display: { xs: 'none', md: 'block' },
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        Ctrl+K
      </Typography>

      {/* Search results - without transition effect */}
      {open && (isSearching || searchResults.length > 0 || searchTerm.length > 0) && (
        <ClickAwayListener onClickAway={handleClickAway}>
          <Paper
            elevation={8}
            sx={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              width: '100%',
              mt: 1,
              maxHeight: 'calc(100vh - 200px)',
              overflow: 'auto',
              border: darkMode 
                ? `1px solid ${alpha(theme.palette.primary.main, 0.2)}` 
                : 'none',
              borderRadius: 2,
              zIndex: 1300,
            }}
          >
            {isSearching ? (
              <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress size={32} />
              </Box>
            ) : searchResults.length > 0 ? (
              <List sx={{ p: 0 }}>
                {searchResults.slice(0, 20).map((result, index) => (
                  <React.Fragment key={`${result.type}-${result.id}`}>
                    {index > 0 && <Divider component="li" />}
                    <ListItemButton
                      alignItems="flex-start"
                      onClick={() => handleResultClick(result)}
                      sx={{
                        py: 1.5,
                        px: 2,
                        '&:hover': {
                          backgroundColor: darkMode 
                            ? alpha(theme.palette.primary.main, 0.1) 
                            : alpha(theme.palette.primary.light, 0.1),
                        },
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            bgcolor: result.type === 'book'
                              ? alpha(theme.palette.primary.main, 0.1)
                              : result.type === 'student'
                                ? alpha(theme.palette.secondary.main, 0.1)
                                : alpha(theme.palette.info.main, 0.1),
                            color: result.type === 'book'
                              ? theme.palette.primary.main
                              : result.type === 'student'
                                ? theme.palette.secondary.main
                                : theme.palette.info.main,
                          }}
                        >
                          {renderResultIcon(result.type)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={renderResultItem(result)}
                        sx={{ my: 0 }}
                      />
                    </ListItemButton>
                  </React.Fragment>
                ))}
                {searchResults.length > 20 && (
                  <>
                    <Divider />
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {searchResults.length - 20} more results
                      </Typography>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => console.log('View all results')}
                        sx={{ mt: 1 }}
                      >
                        View All Results
                      </Button>
                    </Box>
                  </>
                )}
              </List>
            ) : searchTerm.length > 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body1">No results found</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Try adjusting your search or filter
                </Typography>
              </Box>
            ) : null}
          </Paper>
        </ClickAwayListener>
      )}
    </Box>
  );
};

export default GlobalSearch; 