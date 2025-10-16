import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Assessment as ReportIcon,
  Book as BookIcon,
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
  HowToReg as AttendanceIcon,
  Print as PrintIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  LibraryBooks as LibraryIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { ref, get, query, orderByChild, startAt, endAt, equalTo } from 'firebase/database';
import { database } from '../../firebase';
import { ReportService } from '../../utils/reportService';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface ReportData {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'borrowing' | 'inventory' | 'student' | 'financial' | 'attendance';
  data: any[];
  filters: ReportFilter[];
}

interface ReportFilter {
  id: string;
  label: string;
  type: 'date' | 'dateRange' | 'select' | 'text' | 'number';
  options?: string[];
  required?: boolean;
}

const Reports: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [filteredData, setFilteredData] = useState<any[]>([]);

  // Report definitions
  const reports: ReportData[] = [
    // Borrowing Reports
    {
      id: 'current-borrows',
      title: 'Current Borrowings',
      description: 'List of all currently borrowed books with student details',
      icon: <BookIcon />,
      category: 'borrowing',
      data: [],
      filters: [
        { id: 'status', label: 'Status', type: 'select', options: ['All', 'Borrowed', 'Overdue'], required: false },
        { id: 'dateRange', label: 'Borrow Date Range', type: 'dateRange', required: false },
        { id: 'studentId', label: 'Student ID', type: 'text', required: false },
      ],
    },
    {
      id: 'overdue-books',
      title: 'Overdue Books',
      description: 'Books that are past their due date with fine calculations',
      icon: <WarningIcon />,
      category: 'borrowing',
      data: [],
      filters: [
        { id: 'daysOverdue', label: 'Days Overdue', type: 'number', required: false },
        { id: 'studentId', label: 'Student ID', type: 'text', required: false },
      ],
    },
    {
      id: 'borrowing-history',
      title: 'Borrowing History',
      description: 'Complete history of all book borrowings and returns',
      icon: <ScheduleIcon />,
      category: 'borrowing',
      data: [],
      filters: [
        { id: 'dateRange', label: 'Date Range', type: 'dateRange', required: true },
        { id: 'status', label: 'Status', type: 'select', options: ['All', 'Borrowed', 'Returned', 'Overdue'], required: false },
        { id: 'studentId', label: 'Student ID', type: 'text', required: false },
        { id: 'bookId', label: 'Book Title', type: 'text', required: false },
      ],
    },
    // Inventory Reports
    {
      id: 'book-catalog',
      title: 'Book Catalog',
      description: 'Complete catalog of all books in the library',
      icon: <LibraryIcon />,
      category: 'inventory',
      data: [],
      filters: [
        { id: 'category', label: 'Category', type: 'select', options: ['All', 'Fiction', 'Non-Fiction', 'Reference', 'Textbook'], required: false },
        { id: 'program', label: 'Program', type: 'select', options: ['All', 'SOICT', 'SOCJ', 'SOBM', 'SOHM', 'SOTE'], required: false },
        { id: 'status', label: 'Status', type: 'select', options: ['All', 'Available', 'Borrowed', 'Maintenance'], required: false },
        { id: 'author', label: 'Author', type: 'text', required: false },
      ],
    },
    // Student Reports
    {
      id: 'student-activity',
      title: 'Student Activity',
      description: 'Student borrowing activity and statistics',
      icon: <PeopleIcon />,
      category: 'student',
      data: [],
      filters: [
        { id: 'course', label: 'Course', type: 'text', required: false },
        { id: 'dateRange', label: 'Date Range', type: 'dateRange', required: false },
        { id: 'studentId', label: 'Student ID', type: 'text', required: false },
      ],
    },
    // Financial Reports
    {
      id: 'fines-collection',
      title: 'Fines Collection',
      description: 'Outstanding fines and payment records',
      icon: <MoneyIcon />,
      category: 'financial',
      data: [],
      filters: [
        { id: 'status', label: 'Payment Status', type: 'select', options: ['All', 'Paid', 'Unpaid'], required: false },
        { id: 'dateRange', label: 'Date Range', type: 'dateRange', required: false },
        { id: 'studentId', label: 'Student ID', type: 'text', required: false },
      ],
    },
    // Attendance Reports
    {
      id: 'daily-attendance',
      title: 'Daily Attendance',
      description: 'Daily attendance records of students',
      icon: <AttendanceIcon />,
      category: 'attendance',
      data: [],
      filters: [
        { id: 'dateRange', label: 'Date Range', type: 'dateRange', required: true },
        { id: 'course', label: 'Course', type: 'text', required: false },
        { id: 'status', label: 'Status', type: 'select', options: ['All', 'Present', 'Absent'], required: false },
      ],
    },
  ];

  const handleOpenReport = (report: ReportData) => {
    setSelectedReport(report);
    setReportDialogOpen(true);
    setFilters({});
    setReportData([]);
    setFilteredData([]);
  };

  const handleCloseReport = () => {
    setReportDialogOpen(false);
    setSelectedReport(null);
    setFilters({});
    setReportData([]);
    setFilteredData([]);
  };

  const handleGenerateReport = async () => {
    if (!selectedReport) return;

    try {
      setLoading(true);
      let data: any[] = [];

      // Generate data based on report type
      switch (selectedReport.id) {
        case 'current-borrows':
          data = await ReportService.getCurrentBorrows(filters);
          break;
        case 'overdue-books':
          data = await ReportService.getOverdueBooks(filters);
          break;
        case 'borrowing-history':
          data = await ReportService.getBorrowingHistory(filters);
          break;
        case 'book-catalog':
          data = await ReportService.getBookCatalog(filters);
          break;
        case 'student-activity':
          data = await ReportService.getStudentActivity(filters);
          break;
        case 'fines-collection':
          data = await ReportService.getFinesCollection(filters);
          break;
        case 'daily-attendance':
          data = await ReportService.getDailyAttendance(filters);
          break;
        default:
          data = [];
      }

      setReportData(data);
      setFilteredData(data);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    if (!selectedReport || filteredData.length === 0) return;
    
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.text(selectedReport.title, 14, 22);
      
      // Add generation date
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
      
      // Add filter information if any
      const activeFilters = Object.entries(filters).filter(([key, value]) => value && value !== '');
      let yPosition = 40;
      if (activeFilters.length > 0) {
        doc.text('Filters Applied:', 14, 40);
        yPosition = 48;
        activeFilters.forEach(([key, value]) => {
          const filter = selectedReport.filters.find(f => f.id === key);
          if (filter) {
            doc.text(`${filter.label}: ${value}`, 20, yPosition);
            yPosition += 6;
          }
        });
        yPosition += 6;
      }
      
      // Prepare data for the table based on report type
      let tableData: any[][] = [];
      let headers: string[] = [];
      
      if (filteredData.length > 0) {
        // Define headers and data extraction based on report type
        switch (selectedReport.id) {
          case 'current-borrows':
            headers = ['Student ID', 'Student Name', 'Book Title', 'Author', 'Borrow Date', 'Due Date', 'Status'];
            tableData = filteredData.map(item => [
              item.student?.studentId || item.studentId || 'N/A',
              item.student?.name || 'N/A',
              item.book?.title || 'N/A',
              item.book?.author || 'N/A',
              item.borrowDate ? new Date(item.borrowDate).toLocaleDateString() : 'N/A',
              item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'N/A',
              item.status || 'N/A'
            ]);
            break;
            
          case 'overdue-books':
            headers = ['Student ID', 'Student Name', 'Book Title', 'Due Date', 'Days Overdue', 'Fine Amount'];
            tableData = filteredData.map(item => [
              item.student?.studentId || item.studentId || 'N/A',
              item.student?.name || 'N/A',
              item.book?.title || 'N/A',
              item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'N/A',
              item.daysOverdue || '0',
              `₱${((item.daysOverdue || 0) * 5).toFixed(2)}`
            ]);
            break;
            
          case 'borrowing-history':
            headers = ['Student ID', 'Student Name', 'Book Title', 'Borrow Date', 'Due Date', 'Return Date', 'Status'];
            tableData = filteredData.map(item => [
              item.student?.studentId || item.studentId || 'N/A',
              item.student?.name || 'N/A',
              item.book?.title || 'N/A',
              item.borrowDate ? new Date(item.borrowDate).toLocaleDateString() : 'N/A',
              item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'N/A',
              item.returnDate ? new Date(item.returnDate).toLocaleDateString() : 'Not Returned',
              item.status || 'N/A'
            ]);
            break;
            
          case 'book-catalog':
            headers = ['Accession No.', 'Title', 'Author', 'ISBN', 'Category', 'Quantity', 'Available', 'Status'];
            tableData = filteredData.map(item => [
              item.accessionNumber || 'N/A',
              item.title || 'N/A',
              item.author || 'N/A',
              item.isbn || 'N/A',
              item.category || 'N/A',
              item.quantity || '0',
              item.available || '0',
              item.status || 'N/A'
            ]);
            break;
            
          case 'student-activity':
            headers = ['Student ID', 'Name', 'Course', 'Total Borrows', 'Active Borrows', 'Overdue Books', 'Total Fines'];
            tableData = filteredData.map(item => [
              item.studentId || 'N/A',
              item.name || 'N/A',
              item.course || 'N/A',
              item.totalBorrows || '0',
              item.activeBorrows || '0',
              item.overdueBooks || '0',
              `₱${(item.totalFines || 0).toFixed(2)}`
            ]);
            break;
            
          case 'fines-collection':
            headers = ['Student ID', 'Student Name', 'Book Title', 'Due Date', 'Days Overdue', 'Fine Amount', 'Status'];
            tableData = filteredData.map(item => [
              item.studentId || 'N/A',
              item.studentName || 'N/A',
              item.bookTitle || 'N/A',
              item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'N/A',
              item.daysOverdue || '0',
              `₱${(item.fineAmount || 0).toFixed(2)}`,
              item.paid ? 'Paid' : 'Unpaid'
            ]);
            break;
            
          case 'daily-attendance':
            headers = ['Student ID', 'Student Name', 'Course', 'Time In', 'Status'];
            tableData = filteredData.map(item => [
              item.studentIdNumber || item.studentId || 'N/A',
              item.studentName || 'N/A',
              item.course || 'N/A',
              item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'N/A',
              item.status || 'N/A'
            ]);
            break;
            
          default:
            // Fallback to original method for unknown report types
            const firstItem = filteredData[0];
            headers = Object.keys(firstItem);
            tableData = filteredData.map(item => 
              headers.map(header => {
                const value = item[header];
                if (value === null || value === undefined) return '';
                if (typeof value === 'object') return JSON.stringify(value);
                return String(value);
              })
            );
        }
      }
      
      // Add table if there's data
      if (tableData.length > 0) {
        autoTable(doc, {
          head: [headers],
          body: tableData,
          startY: yPosition + 10,
          styles: { 
            fontSize: 9,
            cellPadding: 3,
            overflow: 'linebreak',
            halign: 'left'
          },
          headStyles: { 
            fillColor: [25, 118, 210],
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'center'
          },
          alternateRowStyles: { 
            fillColor: [245, 245, 245] 
          },
          columnStyles: {
            0: { cellWidth: 25 }, // Student ID / Accession No
            1: { cellWidth: 35 }, // Name / Title
            2: { cellWidth: 30 }, // Course / Author
            3: { cellWidth: 25 }, // Date fields
            4: { cellWidth: 25 }, // Date fields
            5: { cellWidth: 25 }, // Status / Amount
            6: { cellWidth: 20 }  // Additional fields
          },
          margin: { top: 20, left: 14, right: 14 },
          tableWidth: 'auto',
          theme: 'striped'
        });
      } else {
        doc.text('No data available for the selected filters.', 14, yPosition + 20);
      }
      
      // Save the PDF
      doc.save(`${selectedReport.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <ReportIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Generate Reports
          </Typography>
        </Box>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Select a report type below and generate a PDF report with your data.
        </Typography>

        {/* Report Selection */}
        <Grid container spacing={3}>
          {reports.map((report) => (
            <Grid item xs={12} sm={6} md={4} key={report.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  }
                }}
                onClick={() => handleOpenReport(report)}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box 
                      sx={{ 
                        p: 1, 
                        borderRadius: 1, 
                        backgroundColor: 'primary.light',
                        mr: 2 
                      }}
                    >
                      {report.icon}
                    </Box>
                    <Typography variant="h6" component="h2">
                      {report.title}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {report.description}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button 
                    size="small" 
                    startIcon={<PrintIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenReport(report);
                    }}
                    variant="contained"
                    fullWidth
                  >
                    Generate PDF
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Report Generation Dialog */}
        <Dialog 
          open={reportDialogOpen} 
          onClose={handleCloseReport}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {selectedReport?.icon}
              <Typography variant="h6" sx={{ ml: 1 }}>
                {selectedReport?.title}
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedReport && (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  {selectedReport.description}
                </Typography>

                {/* Filters */}
                {selectedReport.filters.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      <FilterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Filters (Optional)
                    </Typography>
                    <Grid container spacing={2}>
                      {selectedReport.filters.map((filter) => (
                        <Grid item xs={12} sm={6} key={filter.id}>
                          {filter.type === 'select' ? (
                            <FormControl fullWidth size="small">
                              <InputLabel>{filter.label}</InputLabel>
                              <Select
                                value={filters[filter.id] || ''}
                                label={filter.label}
                                onChange={(e) => setFilters(prev => ({
                                  ...prev,
                                  [filter.id]: e.target.value
                                }))}
                              >
                                {filter.options?.map((option) => (
                                  <MenuItem key={option} value={option}>
                                    {option}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          ) : filter.type === 'date' ? (
                            <TextField
                              fullWidth
                              size="small"
                              type="date"
                              label={filter.label}
                              value={filters[filter.id] || ''}
                              onChange={(e) => setFilters(prev => ({
                                ...prev,
                                [filter.id]: e.target.value
                              }))}
                              InputLabelProps={{ shrink: true }}
                            />
                          ) : filter.type === 'dateRange' ? (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <TextField
                                fullWidth
                                size="small"
                                type="date"
                                label="Start Date"
                                value={filters[`${filter.id}_start`] || ''}
                                onChange={(e) => setFilters(prev => ({
                                  ...prev,
                                  [`${filter.id}_start`]: e.target.value
                                }))}
                                InputLabelProps={{ shrink: true }}
                              />
                              <TextField
                                fullWidth
                                size="small"
                                type="date"
                                label="End Date"
                                value={filters[`${filter.id}_end`] || ''}
                                onChange={(e) => setFilters(prev => ({
                                  ...prev,
                                  [`${filter.id}_end`]: e.target.value
                                }))}
                                InputLabelProps={{ shrink: true }}
                              />
                            </Box>
                          ) : (
                            <TextField
                              fullWidth
                              size="small"
                              type={filter.type}
                              label={filter.label}
                              value={filters[filter.id] || ''}
                              onChange={(e) => setFilters(prev => ({
                                ...prev,
                                [filter.id]: e.target.value
                              }))}
                            />
                          )}
                        </Grid>
                      ))}
                    </Grid>
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={handleGenerateReport}
                        disabled={loading}
                        size="small"
                      >
                        {loading ? <CircularProgress size={20} /> : 'Load Data'}
                      </Button>
                      <Button
                        variant="text"
                        onClick={() => setFilters({})}
                        size="small"
                      >
                        Clear Filters
                      </Button>
                    </Box>
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />

                {/* Report Results */}
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">
                        Report Data ({filteredData.length} records)
                      </Typography>
                    </Box>

                    {filteredData.length === 0 ? (
                      <Alert severity="info">
                        No data found for the selected filters. Try adjusting your filter criteria or click "Load Data" to generate the report.
                      </Alert>
                    ) : (
                      <Alert severity="success" sx={{ mb: 2 }}>
                        Data loaded successfully! Click "Generate PDF" to download your report.
                      </Alert>
                    )}
                  </>
                )}
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseReport}>Close</Button>
            {filteredData.length > 0 && (
              <Button
                onClick={exportToPDF}
                startIcon={<PrintIcon />}
                variant="contained"
                color="primary"
              >
                Generate PDF
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
};

export default Reports;