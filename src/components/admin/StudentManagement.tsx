import React, { useState, useEffect, useRef } from 'react';
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
  Menu,
  MenuItem,
  Card,
  CardContent,
  Select,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Checkbox,
  FormControlLabel,
  Switch,
  Tooltip,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Print as PrintIcon,
  Badge as BadgeIcon,
  ViewList as ViewListIcon,
  LocalPrintshop as LocalPrintshopIcon,
  FilterList as FilterListIcon,
  QrCode2 as QrCodeIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { ref, push, set, get, remove } from 'firebase/database';
import { database } from '../../firebase';
import Barcode from 'react-barcode';
import { addStudentNotification, sendRegistrationEmail } from '../../utils/notificationUtils';
import ViewGeneratedIds from './ViewGeneratedIds';
import ImageUpload from './ImageUpload';
import './printStyles.css';

interface Student {
  id: string;
  studentId: string;
  name: string;
  email: string;
  course: string;
  yearLevel: string;
  registrationDate: string;
  address?: string;
  section?: string;
  image?: string; // Base64 encoded image
}

const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [open, setOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    course: '',
    yearLevel: '',
    address: '',
    section: '',
    image: '',
  });
  const [viewIdOpen, setViewIdOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [viewGeneratedIdsOpen, setViewGeneratedIdsOpen] = useState(false);
  
  // Add filter states
  const [filters, setFilters] = useState({
    course: '',
    yearLevel: '',
    section: '',
  });

  // Add state for barcode printing
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [printBarcodesOpen, setPrintBarcodesOpen] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const barcodePrintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const studentsRef = ref(database, 'students');
      const snapshot = await get(studentsRef);
      if (snapshot.exists()) {
        const studentsData = snapshot.val();
        const studentsArray = Object.entries(studentsData).map(([id, data]: [string, any]) => ({
          id,
          ...data,
        }));
        // Sort students by registration date in descending order (newest first)
        studentsArray.sort((a, b) => {
          // Primary sort by registration date (newest first)
          const dateComparison = new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime();
          if (dateComparison !== 0) return dateComparison;
          
          // Secondary sort by studentId if registration dates are the same
          return b.studentId.localeCompare(a.studentId);
        });
        setStudents(studentsArray);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const generateStudentId = async () => {
    // Get existing student IDs to find the next sequential number
    const studentsRef = ref(database, 'students');
    const snapshot = await get(studentsRef);
    const students = snapshot.val() || {};
    
    // Extract all existing student IDs that match the 025-XXXX format
    const existingIds = Object.values(students)
      .map((student: any) => student.studentId)
      .filter((id: string) => id && id.startsWith('025-'))
      .map((id: string) => {
        const lastFour = id.split('-')[1];
        return lastFour ? parseInt(lastFour, 10) : 0;
      })
      .filter((num: number) => !isNaN(num));
    
    // Find the next available number (starting from 1)
    let nextNumber = 1;
    while (existingIds.includes(nextNumber)) {
      nextNumber++;
    }
    
    // Format as 4-digit number with leading zeros
    const formattedNumber = nextNumber.toString().padStart(4, '0');
    return `025-${formattedNumber}`;
  };

  const handleOpen = (student?: Student) => {
    if (student) {
      setEditStudent(student);
      setFormData({
        name: student.name,
        email: student.email,
        course: student.course,
        yearLevel: student.yearLevel,
        address: student.address || '',
        section: student.section || '',
        image: student.image || '',
      });
    } else {
      setEditStudent(null);
      setFormData({
        name: '',
        email: '',
        course: '',
        yearLevel: '',
        address: '',
        section: '',
        image: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditStudent(null);
    setFormData({
      name: '',
      email: '',
      course: '',
      yearLevel: '',
      address: '',
      section: '',
      image: '',
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const saveGeneratedId = async (studentData: any) => {
    try {
      const generatedIdsRef = ref(database, 'generatedIds');
      await push(generatedIdsRef, {
        name: studentData.name,
        studentId: studentData.studentId,
        course: studentData.course,
        yearLevel: studentData.yearLevel,
        section: studentData.section,
        address: studentData.address || '',
        generatedDate: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error saving generated ID:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const currentDate = new Date().toISOString();
      const studentData = {
        ...formData,
        studentId: editStudent ? editStudent.studentId : await generateStudentId(),
        registrationDate: editStudent ? editStudent.registrationDate : currentDate,
      };

      if (editStudent) {
        await set(ref(database, `students/${editStudent.id}`), studentData);
        // Add notification for edit
        await addStudentNotification('Updated', studentData.name);
      } else {
        const newStudentRef = await push(ref(database, 'students'), studentData);
        // Save to generatedIds collection only for new students
        await saveGeneratedId(studentData);
        
        // Send registration confirmation email with barcode
        const emailResult = await sendRegistrationEmail(
          studentData.email,
          studentData.name,
          {
            studentId: studentData.studentId,
            course: studentData.course,
            yearLevel: studentData.yearLevel,
            section: studentData.section,
            address: studentData.address,
            registrationDate: currentDate
          }
        );

        if (emailResult.success) {
          alert(`Student ${studentData.name} added successfully and registration email sent to ${studentData.email}`);
        } else {
          alert(`Student ${studentData.name} added successfully but failed to send email: ${emailResult.error || 'Unknown error'}`);
        }

        // Add notification for new student
        await addStudentNotification('Added', studentData.name);
      }

      handleClose();
      loadStudents();
    } catch (error) {
      console.error('Error saving student:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        // Get the student's data before deleting
        const studentRef = ref(database, `students/${id}`);
        const studentSnapshot = await get(studentRef);
        
        if (studentSnapshot.exists()) {
          const studentData = studentSnapshot.val();
          
          // Find and delete the corresponding generated ID
          const generatedIdsRef = ref(database, 'generatedIds');
          const generatedIdsSnapshot = await get(generatedIdsRef);
          
          if (generatedIdsSnapshot.exists()) {
            const generatedIds = generatedIdsSnapshot.val();
            // Find and delete all matching generated IDs
            const deletePromises = Object.entries(generatedIds)
              .filter(([_, genData]: [string, any]) => genData.studentId === studentData.studentId)
              .map(([genId, _]) => remove(ref(database, `generatedIds/${genId}`)));
            
            // Wait for all deletions to complete
            await Promise.all(deletePromises);
          }
          
          // Add notification for deletion
          await addStudentNotification('Deleted', studentData.name);
          
          // Delete the student
          await remove(studentRef);
          loadStudents();
        }
      } catch (error) {
        console.error('Error deleting student:', error);
      }
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>, student: Student) => {
    setAnchorEl(event.currentTarget);
    setSelectedStudent(student);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedStudent(null);
  };

  const handleResendRegistrationEmail = async () => {
    if (!selectedStudent) return;
    
    try {
      const result = await sendRegistrationEmail(
        selectedStudent.email,
        selectedStudent.name,
        {
          studentId: selectedStudent.studentId,
          course: selectedStudent.course,
          yearLevel: selectedStudent.yearLevel,
          section: selectedStudent.section,
          address: selectedStudent.address,
          registrationDate: selectedStudent.registrationDate
        }
      );
      
      if (result.success) {
        alert(`Registration email successfully resent to ${selectedStudent.email}`);
      } else {
        alert(`Failed to resend registration email: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error resending registration email:', error);
      alert(`Failed to resend registration email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    handleMenuClose();
  };

  const handleViewId = () => {
    setViewIdOpen(true);
    handleMenuClose();
  };

  const handleViewGeneratedIdsFromMenu = () => {
    setViewGeneratedIdsOpen(true);
    handleMenuClose();
  };

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current;
      const originalContents = document.body.innerHTML;
      
      // Create a wrapper with proper styling
      const printWrapper = document.createElement('div');
      printWrapper.id = 'print-container';
      printWrapper.innerHTML = printContent.innerHTML;
      
      // Replace document contents with our styled content
      document.body.innerHTML = '';
      document.body.appendChild(printWrapper);
      
      // Print and restore
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  };

  const handleViewGeneratedIds = () => {
    setViewGeneratedIdsOpen(true);
  };

  const handleCloseGeneratedIds = () => {
    setViewGeneratedIdsOpen(false);
  };

  // Course options
  const courseOptions = [
    'SOICT',
    'SOCJ',
    'SOBM',
    'SOHM',
    'SOTE',
  ];

  // Year level options
  const yearLevelOptions = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  
  // Section options (A-F)
  const sectionOptions = ['A', 'B', 'C', 'D', 'E', 'F'];

  // Function to handle filter changes
  const handleFilterChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Function to clear all filters
  const clearFilters = () => {
    setFilters({
      course: '',
      yearLevel: '',
      section: '',
    });
  };

  // Filter students based on selected criteria
  const filteredStudents = students.filter(student => {
    return (
      (filters.course === '' || student.course === filters.course) &&
      (filters.yearLevel === '' || student.yearLevel === filters.yearLevel) &&
      (filters.section === '' || student.section === filters.section)
    );
  });

  // Handle checkbox selection for a student
  const handleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((studentId) => studentId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Handle select all students
  const handleSelectAllStudents = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedStudentIds(filteredStudents.map((student) => student.id));
      setSelectAll(true);
    } else {
      setSelectedStudentIds([]);
      setSelectAll(false);
    }
  };

  // Open barcode print dialog
  const handlePrintBarcodesDialog = () => {
    setPrintBarcodesOpen(true);
  };

  // Close barcode print dialog
  const handleClosePrintBarcodes = () => {
    setPrintBarcodesOpen(false);
  };

  // Print student barcodes
  const handlePrintBarcodes = () => {
    if (barcodePrintRef.current) {
      const printContent = barcodePrintRef.current;
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h2" color="primary">
            Student Management
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<PrintIcon />}
              onClick={handleViewGeneratedIds}
            >
              Generated Student IDs
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<QrCodeIcon />}
              onClick={handlePrintBarcodesDialog}
              disabled={selectedStudentIds.length === 0}
            >
              Print Selected Barcodes ({selectedStudentIds.length})
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleOpen()}
            >
              Add New Student
            </Button>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Course</InputLabel>
              <Select
                name="course"
                value={filters.course}
                onChange={handleFilterChange}
              >
                <MenuItem value="">All Courses</MenuItem>
                {courseOptions.map((course) => (
                  <MenuItem key={course} value={course}>
                    {course}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Year Level</InputLabel>
              <Select
                name="yearLevel"
                value={filters.yearLevel}
                onChange={handleFilterChange}
              >
                <MenuItem value="">All Year Levels</MenuItem>
                {yearLevelOptions.map((yearLevel) => (
                  <MenuItem key={yearLevel} value={yearLevel}>
                    {yearLevel}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Section</InputLabel>
              <Select
                name="section"
                value={filters.section}
                onChange={handleFilterChange}
              >
                <MenuItem value="">All Sections</MenuItem>
                {sectionOptions.map((section) => (
                  <MenuItem key={section} value={section}>
                    {section}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<FilterListIcon />}
            onClick={clearFilters}
          >
            Clear Filters
          </Button>
        </Box>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectAll}
                    onChange={handleSelectAllStudents}
                    indeterminate={
                      selectedStudentIds.length > 0 && 
                      selectedStudentIds.length < filteredStudents.length
                    }
                  />
                </TableCell>
                <TableCell>Photo</TableCell>
                <TableCell>Student ID</TableCell>
                <TableCell>Barcode</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Course</TableCell>
                <TableCell>Year Level</TableCell>
                <TableCell>Section</TableCell>
                <TableCell>Registration Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedStudentIds.includes(student.id)}
                      onChange={() => handleSelectStudent(student.id)}
                    />
                  </TableCell>
                  <TableCell>
                    {student.image ? (
                      <Box
                        component="img"
                        src={student.image}
                        alt={`${student.name} photo`}
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '1px solid #ddd'
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          backgroundColor: '#f0f0f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid #ddd'
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          No Photo
                        </Typography>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>{student.studentId}</TableCell>
                  <TableCell>
                    <Box sx={{ maxWidth: 150 }}>
                      <Barcode 
                        value={student.studentId} 
                        width={1}
                        height={30}
                        fontSize={12}
                        displayValue={false}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.address || ''}</TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>{student.course}</TableCell>
                  <TableCell>{student.yearLevel}</TableCell>
                  <TableCell>{student.section || ''}</TableCell>
                  <TableCell>
                    {new Date(student.registrationDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleOpen(student)} color="primary" size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(student.id)} color="error" size="small">
                      <DeleteIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(event) => handleMenuClick(event, student)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewId}>
          <BadgeIcon sx={{ mr: 1 }} />
          View ID Card
        </MenuItem>
        <MenuItem onClick={handleViewGeneratedIdsFromMenu}>
          <ViewListIcon sx={{ mr: 1 }} />
          View Generated IDs
        </MenuItem>
        <MenuItem onClick={() => {
          handleSelectStudent(selectedStudent?.id || '');
          handlePrintBarcodesDialog();
          handleMenuClose();
        }}>
          <QrCodeIcon sx={{ mr: 1 }} />
          Print Barcode
        </MenuItem>
        <MenuItem onClick={handleResendRegistrationEmail}>
          <EmailIcon sx={{ mr: 1 }} />
          Resend Registration Email
        </MenuItem>
      </Menu>

      <Dialog open={viewIdOpen} onClose={() => setViewIdOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Student ID Card
          <IconButton
            onClick={handlePrint}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <PrintIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box ref={printRef} sx={{ p: 2 }}>
            <Grid container spacing={2}>
              {selectedStudent && (
                <Grid item xs={12} sm={6} md={4}>
                  <Card sx={{ 
                    p: 2, 
                    border: '1px solid #ddd', 
                    borderRadius: 1,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    {selectedStudent.image && (
                      <Box
                        component="img"
                        src={selectedStudent.image}
                        alt={`${selectedStudent.name} photo`}
                        sx={{
                          width: 80,
                          height: 80,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid #ddd',
                          mb: 2
                        }}
                      />
                    )}
                    <Typography variant="subtitle1" gutterBottom sx={{ textAlign: 'center' }}>
                      {selectedStudent.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom sx={{ textAlign: 'center' }}>
                      {selectedStudent.studentId}
                    </Typography>
                    <Box sx={{ mt: 1, width: '100%', display: 'flex', justifyContent: 'center' }}>
                      <Barcode
                        value={selectedStudent.studentId}
                        width={1.5}
                        height={50}
                        fontSize={10}
                        margin={5}
                        background="#fff"
                      />
                    </Box>
                    <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center' }}>
                      {selectedStudent.course} | {selectedStudent.yearLevel} {selectedStudent.section ? `- ${selectedStudent.section}` : ''}
                    </Typography>
                  </Card>
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewIdOpen(false)}>Close</Button>
          <Button onClick={handlePrint} variant="contained" startIcon={<PrintIcon />}>
            Print ID
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={printBarcodesOpen} onClose={handleClosePrintBarcodes} maxWidth="md" fullWidth>
        <DialogTitle>
          Print Student Barcodes
          <IconButton
            onClick={handlePrintBarcodes}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <PrintIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box ref={barcodePrintRef} sx={{ p: 2 }}>
            <Grid container spacing={2}>
              {selectedStudentIds.map(id => {
                const student = students.find(s => s.id === id);
                if (!student) return null;
                
                return (
                  <Grid item xs={12} sm={6} md={4} key={student.id}>
                    <Card sx={{ 
                      p: 2, 
                      border: '1px solid #ddd', 
                      borderRadius: 1,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <Typography variant="subtitle1" gutterBottom sx={{ textAlign: 'center' }}>
                        {student.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ textAlign: 'center' }}>
                        {student.studentId}
                      </Typography>
                      <Box sx={{ mt: 1, width: '100%', display: 'flex', justifyContent: 'center' }}>
                        <Barcode
                          value={student.studentId}
                          width={1.5}
                          height={50}
                          fontSize={10}
                          margin={5}
                          background="#fff"
                        />
                      </Box>
                      <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center' }}>
                        {student.course} | {student.yearLevel} {student.section ? `- ${student.section}` : ''}
                      </Typography>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePrintBarcodes}>Cancel</Button>
          <Button onClick={handlePrintBarcodes} variant="contained" startIcon={<PrintIcon />}>
            Print Barcodes
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editStudent ? 'Edit Student' : 'Add New Student'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              autoFocus
              margin="dense"
              name="name"
              label="Full Name"
              type="text"
              fullWidth
              value={formData.name}
              onChange={handleInputChange}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="address"
              label="Address"
              type="text"
              fullWidth
              value={formData.address}
              onChange={handleInputChange}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="email"
              label="Email Address"
              type="email"
              fullWidth
              value={formData.email}
              onChange={handleInputChange}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
              <InputLabel id="course-label">Course</InputLabel>
              <Select
                labelId="course-label"
                name="course"
                value={formData.course}
                label="Course"
                onChange={handleSelectChange}
              >
                {courseOptions.map((course) => (
                  <MenuItem key={course} value={course}>
                    {course}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
              <InputLabel id="year-level-label">Year Level</InputLabel>
              <Select
                labelId="year-level-label"
                name="yearLevel"
                value={formData.yearLevel}
                label="Year Level"
                onChange={handleSelectChange}
              >
                {yearLevelOptions.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
              <InputLabel id="section-label">Section</InputLabel>
              <Select
                labelId="section-label"
                name="section"
                value={formData.section}
                label="Section"
                onChange={handleSelectChange}
              >
                {sectionOptions.map((section) => (
                  <MenuItem key={section} value={section}>
                    {section}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Student Photo
              </Typography>
              <ImageUpload
                onChange={(base64Image: string) => {
                  setFormData(prev => ({ ...prev, image: base64Image }));
                }}
                value={formData.image}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editStudent ? 'Update' : 'Add'} Student
          </Button>
        </DialogActions>
      </Dialog>

      <ViewGeneratedIds 
        open={viewGeneratedIdsOpen} 
        onClose={handleCloseGeneratedIds} 
      />
    </Container>
  );
};

export default StudentManagement;