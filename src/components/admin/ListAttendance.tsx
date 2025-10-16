import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Divider,
} from '@mui/material';
import { ref, get, query, orderByChild, startAt, endAt } from 'firebase/database';
import { database } from '../../firebase';
import PrintIcon from '@mui/icons-material/Print';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import * as XLSX from 'xlsx';
import './printStyles.css';

interface AttendanceRecord {
  id?: string;
  studentId: string;
  studentName: string;
  course: string;
  timestamp: string;
  date: string;
  barcode: string;
  status: 'present' | 'absent' | 'in' | 'out';
  studentIdNumber: string;
}

const ListAttendance: React.FC = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filter states
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [courseFilter, setCourseFilter] = useState<string>('');
  const [nameFilter, setNameFilter] = useState<string>('');
  const [courses, setCourses] = useState<string[]>([]);
  
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAttendanceRecords();
  }, []);

  const loadAttendanceRecords = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get all attendance records
      const attendanceRef = ref(database, 'attendance');
      const snapshot = await get(attendanceRef);
      
      if (snapshot.exists()) {
        const records = Object.entries(snapshot.val()).map(([id, data]) => ({
          id,
          ...(data as Omit<AttendanceRecord, 'id'>)
        }));
        
        // Sort by date (newest first)
        const sortedRecords = records.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        
        setAttendanceRecords(sortedRecords);
        setFilteredRecords(sortedRecords);
        
        // Extract unique courses for filter dropdown
        const uniqueCourses = Array.from(new Set(records.map(record => record.course)));
        setCourses(uniqueCourses);
      } else {
        setAttendanceRecords([]);
        setFilteredRecords([]);
      }
    } catch (error) {
      console.error('Error loading attendance records:', error);
      setError('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    try {
      setLoading(true);
      let filtered = [...attendanceRecords];
      
      // Filter by date range
      if (startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        filtered = filtered.filter(record => {
          const recordDate = new Date(record.date);
          return recordDate >= start && recordDate <= end;
        });
      }
      
      // Filter by course
      if (courseFilter) {
        filtered = filtered.filter(record => record.course === courseFilter);
      }
      
      // Filter by student name
      if (nameFilter) {
        const searchTerm = nameFilter.toLowerCase();
        filtered = filtered.filter(record => 
          record.studentName.toLowerCase().includes(searchTerm) || 
          record.studentIdNumber.toLowerCase().includes(searchTerm)
        );
      }
      
      setFilteredRecords(filtered);
      setSuccess(`Found ${filtered.length} attendance records`);
    } catch (error) {
      console.error('Error applying filters:', error);
      setError('Error filtering records');
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate(new Date().toISOString().split('T')[0]);
    setCourseFilter('');
    setNameFilter('');
    setFilteredRecords(attendanceRecords);
  };

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current;
      const originalContents = document.body.innerHTML;
      
      // Create a print-ready layout
      const printLayout = `
        <div class="print-container" id="print-container">
          <div class="print-header">
            <h2>Attendance Records</h2>
            <div class="filter-info">
              <p>Date Range: ${formatDate(startDate)} to ${formatDate(endDate)} ${courseFilter ? `| Course: ${courseFilter}` : ''} ${nameFilter ? `| Search: ${nameFilter}` : ''}</p>
              <p>Total Records: ${filteredRecords.length}</p>
              <p>Printed on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
            </div>
          </div>
          ${printContent.innerHTML}
        </div>
      `;
      
      // Set the document content to our print layout
      document.body.innerHTML = printLayout;
      
      // Trigger the browser print dialog
      window.print();
      
      // Restore the original content when print dialog closes
      document.body.innerHTML = originalContents;
      
      // Re-run any scripts that might be needed (like React)
      window.location.reload();
    } else {
      // Fallback to basic print if the ref isn't available
      window.print();
    }
  };

  const exportToExcel = () => {
    try {
      // Get current date and time for the report
      const exportDate = new Date();
      const formattedExportDate = `${exportDate.toLocaleDateString()} ${exportDate.toLocaleTimeString()}`;
      
      // Create new workbook
      const workbook = XLSX.utils.book_new();
      
      // Create header data for the Excel sheet
      const headerData = [
        ['ATTENDANCE RECORDS'], // Title row
        [''], // Empty row
        [`Date Range: ${formatDate(startDate)} to ${formatDate(endDate)}`], // Date range
        [`Course: ${courseFilter || 'All Courses'}`], // Course filter
        [`Search: ${nameFilter || 'None'}`], // Search filter
        [`Total Records: ${filteredRecords.length}`], // Record count
        [`Generated on: ${formattedExportDate}`], // Timestamp when exported
        [''], // Empty row
        // Column headers
        ['Student Name', 'Student ID', 'Course', 'Date', 'Time', 'Status']
      ];
      
      // Create data rows from filtered records
      const dataRows = [...filteredRecords]
        // Sort by timestamp (newest first)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .map(record => [
          record.studentName,
          record.studentIdNumber,
          record.course,
          new Date(record.date).toLocaleDateString(),
          new Date(record.timestamp).toLocaleTimeString(),
          record.status === 'present' ? 'Present' : 
          record.status === 'absent' ? 'Absent' : 
          record.status === 'in' ? 'Checked In' : 
          record.status === 'out' ? 'Checked Out' : 
          record.status
        ]);
      
      // Combine header and data
      const allRows = [...headerData, ...dataRows];
      
      // Create worksheet from combined data
      const worksheet = XLSX.utils.aoa_to_sheet(allRows);
      
      // Set column widths
      const wscols = [
        { wch: 25 }, // Student Name
        { wch: 15 }, // Student ID
        { wch: 40 }, // Course
        { wch: 15 }, // Date
        { wch: 15 }, // Time
        { wch: 12 }  // Status
      ];
      worksheet['!cols'] = wscols;
      
      // Style the header (merge cells for title)
      worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // Merge title row across all columns
        { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }, // Merge date range row
        { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } }, // Merge course filter row
        { s: { r: 4, c: 0 }, e: { r: 4, c: 5 } }, // Merge search filter row
        { s: { r: 5, c: 0 }, e: { r: 5, c: 5 } }, // Merge record count row
        { s: { r: 6, c: 0 }, e: { r: 6, c: 5 } }  // Merge timestamp row
      ];
      
      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Records');
      
      // Generate filename with date range
      let filename = 'attendance_records';
      if (startDate && endDate) {
        filename += `_${formatDate(startDate).replace(/\//g, '-')}_to_${formatDate(endDate).replace(/\//g, '-')}`;
      }
      filename += '.xlsx';
      
      // Write and download file
      XLSX.writeFile(workbook, filename);
      setSuccess('Attendance records exported successfully with header');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      setError('Failed to export attendance records');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Attendance Records
        </Typography>
        <Typography color="textSecondary" paragraph>
          View, filter, and print attendance records
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Box sx={{ mb: 3 }} className="no-print">
          <Typography variant="h6" gutterBottom>
            Filter Options
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={3}>
              <TextField
                label="Start Date"
                type="date"
                fullWidth
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="End Date"
                type="date"
                fullWidth
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Course</InputLabel>
                <Select
                  value={courseFilter}
                  label="Course"
                  onChange={(e) => setCourseFilter(e.target.value)}
                >
                  <MenuItem value="">All Courses</MenuItem>
                  {courses.map((course, index) => (
                    <MenuItem key={index} value={course}>{course}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Search by Name or ID"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
              />
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              variant="contained" 
              startIcon={<SearchIcon />}
              onClick={applyFilters}
            >
              Apply Filters
            </Button>
            <Button 
              variant="outlined" 
              onClick={resetFilters}
            >
              Reset Filters
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<PrintIcon />}
              onClick={handlePrint}
            >
              Print
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<FileDownloadIcon />}
              onClick={exportToExcel}
            >
              Export to Excel
            </Button>
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} className="no-print" />

        <div ref={printRef} id="print-container">
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }} className="no-print">
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Student Name</TableCell>
                    <TableCell>Student ID</TableCell>
                    <TableCell>Course</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.studentName}</TableCell>
                        <TableCell>{record.studentIdNumber}</TableCell>
                        <TableCell>{record.course}</TableCell>
                        <TableCell>{formatDate(record.date)}</TableCell>
                        <TableCell>{formatTime(record.timestamp)}</TableCell>
                        <TableCell>
                          {record.status === 'present' ? 'Present' : 
                           record.status === 'absent' ? 'Absent' : 
                           record.status === 'in' ? 'Checked In' : 
                           record.status === 'out' ? 'Checked Out' : 
                           record.status}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No attendance records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </div>
      </Paper>
    </Container>
  );
};

export default ListAttendance; 