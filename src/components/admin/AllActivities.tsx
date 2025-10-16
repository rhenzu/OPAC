import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Avatar,
  useTheme,
  alpha,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Button,
  Stack,
  Pagination,
  Card,
  CardContent,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  BookOnline,
  History,
  MenuBook,
  PersonAdd,
  CalendarToday,
  FilterAlt,
  Clear,
  Refresh,
  Download,
} from '@mui/icons-material';
import { database } from '../../firebase';
import { ref, get, query, orderByChild } from 'firebase/database';
import { useThemeContext } from '../../contexts/ThemeContext';

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

const AllActivities: React.FC = () => {
  const theme = useTheme();
  const { darkMode } = useThemeContext();
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  // Filters
  const [filters, setFilters] = useState({
    type: '',
    dateFrom: '',
    dateTo: '',
    searchTerm: '',
  });

  useEffect(() => {
    loadAllActivities();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [activities, filters]);

  const loadAllActivities = async () => {
    setLoading(true);
    try {
      const activitiesRef = query(ref(database, 'activities'), orderByChild('timestamp'));
      const activitiesSnapshot = await get(activitiesRef);
      
      const activityRecords: ActivityRecord[] = [];
      
      if (activitiesSnapshot.exists()) {
        const activities = activitiesSnapshot.val();
        
        for (const [id, activity] of Object.entries(activities) as [string, any][]) {
          activityRecords.push({
            id,
            type: activity.type,
            timestamp: activity.timestamp,
            bookId: activity.bookId,
            studentId: activity.studentId,
            bookTitle: activity.bookTitle,
            studentName: activity.studentName,
            title: activity.title,
          });
        }
      }
      
      // Sort by timestamp (newest first)
      activityRecords.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      setActivities(activityRecords);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...activities];

    // Filter by type
    if (filters.type) {
      filtered = filtered.filter(activity => activity.type === filters.type);
    }

    // Filter by date range
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(activity => 
        new Date(activity.timestamp) >= fromDate
      );
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(activity => 
        new Date(activity.timestamp) <= toDate
      );
    }

    // Filter by search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(activity => 
        (activity.bookTitle?.toLowerCase().includes(searchLower)) ||
        (activity.studentName?.toLowerCase().includes(searchLower)) ||
        (activity.title?.toLowerCase().includes(searchLower))
      );
    }

    setFilteredActivities(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      type: '',
      dateFrom: '',
      dateTo: '',
      searchTerm: '',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'borrow':
        return <BookOnline sx={{ color: theme.palette.info.main }} />;
      case 'return':
        return <History sx={{ color: theme.palette.warning.main }} />;
      case 'add_book':
        return <MenuBook sx={{ color: theme.palette.primary.main }} />;
      case 'add_student':
        return <PersonAdd sx={{ color: theme.palette.success.main }} />;
      default:
        return <CalendarToday sx={{ color: theme.palette.grey[500] }} />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'borrow':
        return theme.palette.info.main;
      case 'return':
        return theme.palette.warning.main;
      case 'add_book':
        return theme.palette.primary.main;
      case 'add_student':
        return theme.palette.success.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getActivityDescription = (activity: ActivityRecord) => {
    switch (activity.type) {
      case 'borrow':
        return `Book borrowed: "${activity.bookTitle}"`;
      case 'return':
        return `Book returned: "${activity.bookTitle}"`;
      case 'add_book':
        return `New book added: "${activity.title || activity.bookTitle}"`;
      case 'add_student':
        return `New student registered: "${activity.studentName}"`;
      default:
        return 'Unknown activity';
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentActivities = filteredActivities.slice(startIndex, endIndex);

  const hasActiveFilters = filters.type || filters.dateFrom || filters.dateTo || filters.searchTerm;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          All Activities
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Comprehensive log of all library activities
        </Typography>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <FilterAlt sx={{ mr: 1, color: theme.palette.primary.main }} />
            <Typography variant="h6">Filters</Typography>
          </Box>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Activity Type</InputLabel>
                <Select
                  value={filters.type}
                  label="Activity Type"
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="borrow">Borrow</MenuItem>
                  <MenuItem value="return">Return</MenuItem>
                  <MenuItem value="add_book">Add Book</MenuItem>
                  <MenuItem value="add_student">Add Student</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                label="From Date"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                label="To Date"
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Search (Book/Student/Title)"
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                placeholder="Search activities..."
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Stack direction="row" spacing={1}>
                {hasActiveFilters && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Clear />}
                    onClick={resetFilters}
                  >
                    Clear Filters
                  </Button>
                )}
                <Tooltip title="Refresh Activities">
                  <IconButton onClick={loadAllActivities} color="primary">
                    <Refresh />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Grid>
          </Grid>

          {hasActiveFilters && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Active Filters:
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {filters.type && (
                  <Chip
                    label={`Type: ${filters.type}`}
                    size="small"
                    onDelete={() => handleFilterChange('type', '')}
                  />
                )}
                {filters.dateFrom && (
                  <Chip
                    label={`From: ${filters.dateFrom}`}
                    size="small"
                    onDelete={() => handleFilterChange('dateFrom', '')}
                  />
                )}
                {filters.dateTo && (
                  <Chip
                    label={`To: ${filters.dateTo}`}
                    size="small"
                    onDelete={() => handleFilterChange('dateTo', '')}
                  />
                )}
                {filters.searchTerm && (
                  <Chip
                    label={`Search: ${filters.searchTerm}`}
                    size="small"
                    onDelete={() => handleFilterChange('searchTerm', '')}
                  />
                )}
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Results Summary */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Showing {currentActivities.length} of {filteredActivities.length} activities
          {hasActiveFilters && ` (filtered from ${activities.length} total)`}
        </Typography>
        
        {totalPages > 1 && (
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(_, page) => setCurrentPage(page)}
            color="primary"
            size="small"
          />
        )}
      </Box>

      {/* Activities Table */}
      <Paper sx={{ borderRadius: 2 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Student</TableCell>
                <TableCell>Date & Time</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <Typography>Loading activities...</Typography>
                  </TableCell>
                </TableRow>
              ) : currentActivities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      {hasActiveFilters ? 'No activities match the selected filters' : 'No activities found'}
                    </Typography>
                    {hasActiveFilters && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={resetFilters}
                        sx={{ mt: 1 }}
                      >
                        Clear Filters
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                currentActivities.map((activity) => (
                  <TableRow key={activity.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar
                          sx={{
                            bgcolor: alpha(getActivityColor(activity.type), 0.1),
                            width: 32,
                            height: 32,
                          }}
                        >
                          {getActivityIcon(activity.type)}
                        </Avatar>
                        <Chip
                          label={activity.type.replace('_', ' ').toUpperCase()}
                          size="small"
                          sx={{
                            bgcolor: alpha(getActivityColor(activity.type), 0.1),
                            color: getActivityColor(activity.type),
                            fontWeight: 'medium',
                          }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {getActivityDescription(activity)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {activity.studentName || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarToday fontSize="inherit" />
                        {formatDate(activity.timestamp)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Bottom Pagination */}
      {totalPages > 1 && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(_, page) => setCurrentPage(page)}
            color="primary"
          />
        </Box>
      )}
    </Container>
  );
};

export default AllActivities;