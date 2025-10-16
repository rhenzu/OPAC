import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Typography,
  Box,
  Grid,
  Avatar,
  CardMedia,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider,
  Stack,
  Autocomplete,
  Checkbox,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  Image as ImageIcon,
  CameraAlt as CameraIcon,
  FilterAlt as FilterAltIcon,
  Clear as ClearIcon,
  Print as PrintIcon,
  LocalPrintshop as LocalPrintshopIcon,
} from '@mui/icons-material';
import { ref, push, set, get, remove } from 'firebase/database';
import { database } from '../../firebase';
import { addBookNotification } from '../../utils/notificationUtils';
import JsBarcode from 'jsbarcode';
import Barcode from 'react-barcode';

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  quantity: number;
  available: number;
  accessionNumber: string;
  barcode: string;
  imageData?: string; // Base64 encoded image data
  createdAt?: number; // Optional createdAt timestamp
  copyright?: string; // Year of copyright
  publication?: string; // Publisher/publication details
  pages?: number; // Number of pages
  category?: string; // Book category/genre
  program?: string; // Program/Course field
  callNumber?: string; // Call Number field
}

const BookManagement: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [open, setOpen] = useState(false);
  const [editBook, setEditBook] = useState<Book | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    quantity: '',
    accessionNumber: '',
    imageData: '',
    copyright: '',
    publication: '',
    pages: '',
    category: '',
    program: '',
    callNumber: '',
  });
  
  // Filter state
  const [filters, setFilters] = useState({
    author: '',
    copyright: '',
    publication: '',
    category: '',
    program: '',
  });
  
  // Options for filter dropdowns
  const [filterOptions, setFilterOptions] = useState({
    authors: [] as string[],
    copyrightYears: [] as string[],
    publications: [] as string[],
    categories: [] as string[],
    programs: [] as string[],
  });
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadBooks();
  }, []);
  
  // Filter books whenever filters or books change
  useEffect(() => {
    applyFilters();
  }, [books, filters]);
  
  // Clean up camera resources when component unmounts
  useEffect(() => {
    return () => {
      if (cameraActive) {
        stopCamera();
      }
    };
  }, [cameraActive]);
  
  const applyFilters = () => {
    let result = [...books];
    
    // Apply author filter
    if (filters.author) {
      result = result.filter(book => book.author === filters.author);
    }
    
    // Apply copyright filter
    if (filters.copyright) {
      result = result.filter(book => book.copyright === filters.copyright);
    }
    
    // Apply publication filter
    if (filters.publication) {
      result = result.filter(book => book.publication === filters.publication);
    }
    
    // Apply category filter
    if (filters.category) {
      result = result.filter(book => book.category === filters.category);
    }
    
    // Apply program filter
    if (filters.program) {
      result = result.filter(book => book.program === filters.program);
    }
    
    setFilteredBooks(result);
  };
  
  const resetFilters = () => {
    setFilters({
      author: '',
      copyright: '',
      publication: '',
      category: '',
      program: '',
    });
  };
  
  const extractFilterOptions = (books: Book[]) => {
    const authors = new Set<string>();
    const copyrightYears = new Set<string>();
    const publications = new Set<string>();
    const categories = new Set<string>();
    const programs = new Set<string>();
    
    books.forEach(book => {
      if (book.author) authors.add(book.author);
      if (book.copyright) copyrightYears.add(book.copyright);
      if (book.publication) publications.add(book.publication);
      if (book.category) categories.add(book.category);
      if (book.program) programs.add(book.program);
    });
    
    setFilterOptions({
      authors: Array.from(authors).sort(),
      copyrightYears: Array.from(copyrightYears).sort(),
      publications: Array.from(publications).sort(),
      categories: Array.from(categories).sort(),
      programs: Array.from(programs).sort(),
    });
  };

  const loadBooks = async () => {
    const booksRef = ref(database, 'books');
    const snapshot = await get(booksRef);
    if (snapshot.exists()) {
      const booksData = snapshot.val();
      const booksArray = Object.entries(booksData).map(([id, data]: [string, any]) => ({
        id,
        ...data,
        // Only use createdAt if it exists, otherwise rely on Firebase ID for sorting
        createdAt: data.createdAt || null,
      }));
      
      // Sort books in descending order (newest first)
      const sortedBooks = booksArray.sort((a, b) => {
        // Primary sort by createdAt timestamp (descending) if both exist
        if (a.createdAt && b.createdAt) {
          return b.createdAt - a.createdAt; // Descending order
        }
        
        // If only one has createdAt, prioritize it
        if (a.createdAt && !b.createdAt) {
          return -1; // a comes first (newer)
        }
        if (!a.createdAt && b.createdAt) {
          return 1; // b comes first (newer)
        }
        
        // If neither has createdAt, sort by Firebase ID (descending)
        // Firebase IDs contain a timestamp component that makes newer IDs "greater" than older ones
        return b.id.localeCompare(a.id); // Descending order
      });
      
      setBooks(sortedBooks);
      setFilteredBooks(sortedBooks);
      extractFilterOptions(sortedBooks);
    } else {
      setBooks([]);
      setFilteredBooks([]);
    }
  };

  const handleOpen = (book?: Book) => {
    if (book) {
      setEditBook(book);
      setFormData({
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        quantity: book.quantity.toString(),
        accessionNumber: book.accessionNumber || '',
        imageData: book.imageData || '',
        copyright: book.copyright || '',
        publication: book.publication || '',
        pages: book.pages?.toString() || '',
        category: book.category || '',
        program: book.program || '',
        callNumber: book.callNumber || '',
      });
      setPreviewImage(book.imageData || null);
    } else {
      setEditBook(null);
      setFormData({
        title: '',
        author: '',
        isbn: '',
        quantity: '',
        accessionNumber: '',
        imageData: '',
        copyright: '',
        publication: '',
        pages: '',
        category: '',
        program: '',
        callNumber: '',
      });
      setPreviewImage(null);
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditBook(null);
    setPreviewImage(null);
    if (cameraActive) {
      stopCamera();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (e: React.ChangeEvent<{ name?: string; value: unknown }>) => {
    const name = e.target.name as string;
    const value = e.target.value as string;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPEG, PNG, GIF, or WEBP)');
      return;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      alert('Image size should be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setFormData((prev) => ({
        ...prev,
        imageData: base64String,
      }));
      setPreviewImage(base64String);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setFormData((prev) => ({
      ...prev,
      imageData: '',
    }));
    setPreviewImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Cannot access camera. Please make sure you have camera permissions enabled.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the video frame to the canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert the canvas to a base64 image string
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        setFormData(prev => ({
          ...prev,
          imageData: imageData
        }));
        setPreviewImage(imageData);
        
        // Stop the camera
        stopCamera();
      }
    }
  };

  const generateBarcode = (accessionNumber: string): string => {
    // Remove any existing hyphens and spaces
    const cleanAccession = accessionNumber.replace(/[-\s]/g, '');
    
    // Add hyphens in the correct positions
    const parts = [];
    let remaining = cleanAccession;
    
    // First part (1-2 digits)
    if (remaining.length > 2) {
      parts.push(remaining.slice(0, 2));
      remaining = remaining.slice(2);
    } else {
      parts.push(remaining);
      remaining = '';
    }
    
    // Middle part (up to 6 digits)
    if (remaining.length > 6) {
      parts.push(remaining.slice(0, 6));
      remaining = remaining.slice(6);
    } else if (remaining.length > 0) {
      parts.push(remaining);
      remaining = '';
    }
    
    // Last part (remaining digits)
    if (remaining.length > 0) {
      parts.push(remaining);
    }
    
    // Join with hyphens
    return parts.join('-');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Generate barcode from accession number
    const barcode = generateBarcode(formData.accessionNumber);
    
    const bookData = {
      title: formData.title,
      author: formData.author,
      isbn: formData.isbn,
      quantity: parseInt(formData.quantity),
      available: parseInt(formData.quantity),
      accessionNumber: formData.accessionNumber,
      barcode: barcode,
      status: 'available' as const,
      imageData: formData.imageData || null,
      copyright: formData.copyright || '',
      publication: formData.publication || '',
      pages: formData.pages ? parseInt(formData.pages) : null,
      category: formData.category || '',
      program: formData.program || '',
      callNumber: formData.callNumber || '',
    };

    if (editBook) {
      // When editing, preserve the original createdAt timestamp
      const updatedBookData = {
        ...bookData,
        createdAt: editBook.createdAt || Date.now(), // Keep existing timestamp or set one if it doesn't exist
      };
      await set(ref(database, `books/${editBook.id}`), updatedBookData);
      // Add notification for book update
      await addBookNotification('Updated', bookData.title);
    } else {
      // For new books, add a createdAt timestamp
      const newBookData = {
        ...bookData,
        createdAt: Date.now(),
      };
      await push(ref(database, 'books'), newBookData);
      // Add notification for new book
      await addBookNotification('Added', bookData.title);
    }

    handleClose();
    loadBooks();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this book?')) {
      // Get book data before deleting for notification
      const bookRef = ref(database, `books/${id}`);
      const snapshot = await get(bookRef);
      if (snapshot.exists()) {
        const bookData = snapshot.val();
        await remove(bookRef);
        // Add notification for book deletion
        await addBookNotification('Deleted', bookData.title);
        loadBooks();
      }
    }
  };

  // Add function to handle book selection
  const handleSelectBook = (bookId: string) => {
    setSelectedBooks(prev => {
      if (prev.includes(bookId)) {
        return prev.filter(id => id !== bookId);
      } else {
        return [...prev, bookId];
      }
    });
  };

  // Add function to handle select all
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedBooks(filteredBooks.map(book => book.id));
    } else {
      setSelectedBooks([]);
    }
  };

  const handlePrintBarcodes = () => {
    navigate('/admin/print-barcodes');
  };

  const generateBookInfo = (book: Book) => {
    // Implementation of generateBookInfo function
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2">
            Book Management
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<LocalPrintshopIcon />}
              onClick={handlePrintBarcodes}
              disabled={filteredBooks.length === 0}
            >
              Print Barcode
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleOpen()}
            >
              Add New Book
            </Button>
          </Box>
        </Box>
        
        {/* Filter Section */}
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FilterAltIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="subtitle1">Filter Books</Typography>
            {(filters.author || filters.copyright || filters.publication || filters.category || filters.program) && (
              <Button 
                startIcon={<ClearIcon />} 
                size="small" 
                onClick={resetFilters}
                sx={{ ml: 'auto' }}
              >
                Clear Filters
              </Button>
            )}
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={2.4}>
              <Autocomplete
                value={filters.author}
                onChange={(event, newValue) => {
                  setFilters(prev => ({ ...prev, author: newValue || '' }));
                }}
                options={filterOptions.authors}
                renderInput={(params) => (
                  <TextField {...params} label="Filter by Author" fullWidth size="small" />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Autocomplete
                value={filters.copyright}
                onChange={(event, newValue) => {
                  setFilters(prev => ({ ...prev, copyright: newValue || '' }));
                }}
                options={filterOptions.copyrightYears}
                renderInput={(params) => (
                  <TextField {...params} label="Filter by Copyright Year" fullWidth size="small" />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Autocomplete
                value={filters.publication}
                onChange={(event, newValue) => {
                  setFilters(prev => ({ ...prev, publication: newValue || '' }));
                }}
                options={filterOptions.publications}
                renderInput={(params) => (
                  <TextField {...params} label="Filter by Publication" fullWidth size="small" />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Autocomplete
                value={filters.category}
                onChange={(event, newValue) => {
                  setFilters(prev => ({ ...prev, category: newValue || '' }));
                }}
                options={filterOptions.categories}
                renderInput={(params) => (
                  <TextField {...params} label="Filter by Category" fullWidth size="small" />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Autocomplete
                value={filters.program}
                onChange={(event, newValue) => {
                  setFilters(prev => ({ ...prev, program: newValue || '' }));
                }}
                options={filterOptions.programs}
                renderInput={(params) => (
                  <TextField {...params} label="Filter by Program" fullWidth size="small" />
                )}
              />
            </Grid>
          </Grid>
          
          {/* Active filters */}
          {(filters.author || filters.copyright || filters.publication || filters.category || filters.program) && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Active filters:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {filters.author && (
                  <Chip 
                    label={`Author: ${filters.author}`} 
                    size="small" 
                    onDelete={() => setFilters(prev => ({ ...prev, author: '' }))}
                  />
                )}
                {filters.copyright && (
                  <Chip 
                    label={`Copyright: ${filters.copyright}`} 
                    size="small" 
                    onDelete={() => setFilters(prev => ({ ...prev, copyright: '' }))}
                  />
                )}
                {filters.publication && (
                  <Chip 
                    label={`Publication: ${filters.publication}`} 
                    size="small" 
                    onDelete={() => setFilters(prev => ({ ...prev, publication: '' }))}
                  />
                )}
                {filters.category && (
                  <Chip 
                    label={`Category: ${filters.category}`} 
                    size="small" 
                    onDelete={() => setFilters(prev => ({ ...prev, category: '' }))}
                  />
                )}
                {filters.program && (
                  <Chip 
                    label={`Program: ${filters.program}`} 
                    size="small" 
                    onDelete={() => setFilters(prev => ({ ...prev, program: '' }))}
                  />
                )}
              </Stack>
            </Box>
          )}
          
          {/* Filter stats */}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Showing {filteredBooks.length} of {books.length} books
            </Typography>
          </Box>
        </Paper>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedBooks.length > 0 && selectedBooks.length < filteredBooks.length}
                    checked={selectedBooks.length === filteredBooks.length && filteredBooks.length > 0}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>Cover</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Author</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Program</TableCell>
                <TableCell>ISBN</TableCell>
                <TableCell>Publication</TableCell>
                <TableCell>Accession No.</TableCell>
                <TableCell>Quantity/Available</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredBooks.map((book) => (
                <TableRow key={book.id}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedBooks.includes(book.id)}
                      onChange={() => handleSelectBook(book.id)}
                    />
                  </TableCell>
                  <TableCell>
                    {book.imageData ? (
                      <Avatar 
                        variant="rounded"
                        src={book.imageData}
                        alt={book.title}
                        sx={{ width: 60, height: 80, objectFit: 'cover' }}
                      />
                    ) : (
                      <Avatar variant="rounded" sx={{ width: 60, height: 80, bgcolor: 'grey.300' }}>
                        <ImageIcon />
                      </Avatar>
                    )}
                  </TableCell>
                  <TableCell>{book.title}</TableCell>
                  <TableCell>{book.author}</TableCell>
                  <TableCell>{book.category || 'N/A'}</TableCell>
                  <TableCell>{book.program || 'N/A'}</TableCell>
                  <TableCell>{book.isbn}</TableCell>
                  <TableCell>{book.publication || 'N/A'}</TableCell>
                  <TableCell>{book.accessionNumber}</TableCell>
                  <TableCell>{book.quantity}/{book.available}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Edit Book">
                        <IconButton onClick={() => handleOpen(book)} color="primary" size="small">
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Book">
                        <IconButton onClick={() => handleDelete(book.id)} color="error" size="small">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {filteredBooks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 3 }}>
                    <Typography variant="body1" color="text.secondary">
                      No books match the selected filters
                    </Typography>
                    {(filters.author || filters.copyright || filters.publication || filters.category || filters.program) && (
                      <Button 
                        variant="outlined" 
                        size="small" 
                        onClick={resetFilters}
                        startIcon={<ClearIcon />}
                        sx={{ mt: 1 }}
                      >
                        Clear Filters
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{editBook ? 'Edit Book' : 'Add New Book'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
              <Box 
                sx={{ 
                  width: '100%', 
                  height: 200, 
                  border: '1px dashed grey', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  mb: 1
                }}
              >
                {cameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : previewImage ? (
                  <CardMedia
                    component="img"
                    image={previewImage}
                    alt="Book cover preview"
                    sx={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'contain'
                    }}
                  />
                ) : (
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <ImageIcon sx={{ fontSize: 50, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      No image uploaded
                    </Typography>
                  </Box>
                )}
                
                {/* Hidden canvas for capturing images */}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </Box>
              
              <Box sx={{ display: 'flex', mt: 1, width: '100%', justifyContent: 'center', gap: 1 }}>
                {cameraActive ? (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={captureImage}
                    startIcon={<CameraIcon />}
                  >
                    Capture
                  </Button>
                ) : (
                  <>
                    <input
                      accept="image/*"
                      type="file"
                      id="book-image-upload"
                      onChange={handleImageUpload}
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="book-image-upload">
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={<CloudUploadIcon />}
                        size="small"
                      >
                        Upload
                      </Button>
                    </label>
                    
                    <Button
                      variant="outlined"
                      startIcon={<CameraIcon />}
                      size="small"
                      onClick={startCamera}
                    >
                      Camera
                    </Button>
                    
                    {previewImage && (
                      <Button 
                        variant="outlined" 
                        color="error" 
                        size="small"
                        onClick={clearImage}
                      >
                        Clear
                      </Button>
                    )}
                  </>
                )}
              </Box>
            </Grid>
            
            <Grid item xs={12} md={8}>
              <TextField
                autoFocus
                margin="dense"
                name="title"
                label="Title"
                type="text"
                fullWidth
                value={formData.title}
                onChange={handleInputChange}
              />
              <TextField
                margin="dense"
                name="author"
                label="Author"
                type="text"
                fullWidth
                value={formData.author}
                onChange={handleInputChange}
              />
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    margin="dense"
                    name="isbn"
                    label="ISBN"
                    type="text"
                    fullWidth
                    value={formData.isbn}
                    onChange={handleInputChange}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    margin="dense"
                    name="copyright"
                    label="Copyright Year"
                    type="text"
                    fullWidth
                    value={formData.copyright}
                    onChange={handleInputChange}
                  />
                </Grid>
              </Grid>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    margin="dense"
                    name="publication"
                    label="Publication/Publisher"
                    type="text"
                    fullWidth
                    value={formData.publication}
                    onChange={handleInputChange}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    margin="dense"
                    name="pages"
                    label="Number of Pages"
                    type="number"
                    fullWidth
                    value={formData.pages}
                    onChange={handleInputChange}
                  />
                </Grid>
              </Grid>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth margin="dense">
                    <InputLabel id="book-category-label">Book Category</InputLabel>
                    <Select
                      labelId="book-category-label"
                      name="category"
                      value={formData.category}
                      label="Book Category"
                      onChange={(e) => handleSelectChange(e as any)}
                    >
                      <MenuItem value="">None</MenuItem>
                      <MenuItem value="BSIT BOOKS">BSIT BOOKS</MenuItem>
                      <MenuItem value="HM BOOKS">HM BOOKS</MenuItem>
                      <MenuItem value="GEN ED BOOKS">GEN ED BOOKS</MenuItem>
                      <MenuItem value="SOICT BOOKS">SOICT BOOKS</MenuItem>
                      <MenuItem value="SOCJ BOOKS">SOCJ BOOKS</MenuItem>
                      <MenuItem value="SOBM BOOKS">SOBM BOOKS</MenuItem>
                      <MenuItem value="SOHM BOOKS">SOHM BOOKS</MenuItem>
                      <MenuItem value="SOTE BOOKS">SOTE BOOKS</MenuItem>
                      <MenuItem value="Fiction">Fiction</MenuItem>
                      <MenuItem value="Non-Fiction">Non-Fiction</MenuItem>
                      <MenuItem value="Reference">Reference</MenuItem>
                      <MenuItem value="Textbook">Textbook</MenuItem>
                      <MenuItem value="Biography">Biography</MenuItem>
                      <MenuItem value="Children">Children</MenuItem>
                      <MenuItem value="Science">Science</MenuItem>
                      <MenuItem value="History">History</MenuItem>
                      <MenuItem value="Religion">Religion</MenuItem>
                      <MenuItem value="Art">Art</MenuItem>
                      <MenuItem value="Technology">Technology</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    margin="dense"
                    name="program"
                    label="Program/Course"
                    type="text"
                    fullWidth
                    value={formData.program}
                    onChange={handleInputChange}
                  />
                </Grid>
              </Grid>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    margin="dense"
                    name="accessionNumber"
                    label="Accession Number"
                    type="text"
                    fullWidth
                    value={formData.accessionNumber}
                    onChange={handleInputChange}
                    helperText="This will be automatically converted to a barcode"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    margin="dense"
                    name="callNumber"
                    label="Call Number"
                    type="text"
                    fullWidth
                    value={formData.callNumber}
                    onChange={handleInputChange}
                  />
                </Grid>
              </Grid>
              
              <TextField
                margin="dense"
                name="quantity"
                label="Quantity"
                type="number"
                fullWidth
                value={formData.quantity}
                onChange={handleInputChange}
              />
              
              {formData.accessionNumber && (
                <Box sx={{ mt: 2, mb: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Generated Barcode Preview:
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                    <Barcode
                      value={generateBarcode(formData.accessionNumber)}
                      width={1}
                      height={40}
                      fontSize={12}
                      margin={0}
                      format="CODE128"
                    />
                  </Box>
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editBook ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BookManagement;