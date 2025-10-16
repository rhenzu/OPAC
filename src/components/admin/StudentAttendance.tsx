import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Card,
  CardContent,
  Grid,
  IconButton,
  TextField,
  Button,
  Switch,
  FormControlLabel,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { ref, get, push, query, orderByChild, equalTo, remove, set } from 'firebase/database';
import { database } from '../../firebase';

interface Student {
  id: string;
  name: string;
  studentId: string;
  course: string;
  barcode: string;
}

interface AttendanceRecord {
  id?: string;
  studentId: string;
  studentName: string;
  course: string;
  timestamp: string;
  date: string;
  barcode: string;
  status: 'in' | 'out';
  studentIdNumber: string;
  timeIn?: string;
  timeOut?: string;
}

const StudentAttendance: React.FC = () => {
  const [studentBarcode, setStudentBarcode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [detectedStatus, setDetectedStatus] = useState<'in' | 'out' | null>(null);

  useEffect(() => {
    loadTodayAttendance();
  }, []);

  const loadTodayAttendance = async () => {
    try {
      setLoading(true);
      
      // Get today's date in local timezone
      const now = new Date();
      const today = now.getFullYear() + '-' + 
                   String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(now.getDate()).padStart(2, '0');
      
      console.log('Loading attendance for date:', today);
      console.log('Current timestamp:', now.toISOString());
      
      const attendanceRef = ref(database, 'attendance');
      
      // Try to get all attendance records first, then filter by date
      const snapshot = await get(attendanceRef);
      
      if (snapshot.exists()) {
        const allRecords = Object.entries(snapshot.val()).map(([id, data]) => ({
          id,
          ...(data as Omit<AttendanceRecord, 'id'>)
        }));
        
        console.log('All attendance records:', allRecords);
        console.log('Total records found:', allRecords.length);
        
        // Filter records for today - check both date field and timestamp
        const todayRecords = allRecords.filter(record => {
          const recordDate = record.date;
          const timestampDate = record.timestamp ? record.timestamp.split('T')[0] : null;
          
          console.log(`Record ${record.id}: date=${recordDate}, timestampDate=${timestampDate}, today=${today}`);
          
          return recordDate === today || timestampDate === today;
        });
        
        console.log('Today\'s filtered records:', todayRecords);
        console.log('Today\'s records count:', todayRecords.length);
        
        setTodayAttendance(todayRecords.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ));
      } else {
        console.log('No attendance records found in database');
        setTodayAttendance([]);
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
      setError('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  const findStudentByBarcode = async (barcode: string): Promise<Student | null> => {
    try {
      console.log('Searching for student with barcode:', barcode);
      const studentsRef = ref(database, 'students');
      
      // Attempt to find the student directly without query first
      const snapshot = await get(studentsRef);
      if (snapshot.exists()) {
        const students = snapshot.val();
        // Manual search through students when index is not available
        for (const id in students) {
          if (students[id].barcode === barcode || students[id].studentId === barcode) {
            console.log('Found student by manual search');
            return {
              id,
              ...students[id]
            };
          }
        }
      }
      
      console.log('Student not found:', barcode);
      return null;
    } catch (error) {
      console.error('Error details:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check for indexing error
      if (errorMessage.includes("Index not defined") || errorMessage.includes("indexOn")) {
        console.error('Firebase indexing error. Please update your database rules.');
        throw new Error('Database not properly configured. Please contact administrator to add necessary database indexes.');
      }
      
      throw new Error(`Failed to search for student: ${errorMessage}`);
    }
  };

  const detectAttendanceStatus = async (studentId: string): Promise<'in' | 'out'> => {
    try {
      // Get today's date in local timezone (same logic as loadTodayAttendance)
      const now = new Date();
      const today = now.getFullYear() + '-' + 
                   String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(now.getDate()).padStart(2, '0');
      
      console.log('Detecting attendance status for student:', studentId, 'on date:', today);
      
      const attendanceRef = ref(database, 'attendance');
      
      // Get all attendance records first, then filter (same approach as loadTodayAttendance)
      const snapshot = await get(attendanceRef);
      
      if (snapshot.exists()) {
        const allRecords = Object.entries(snapshot.val()).map(([id, data]) => ({
          id,
          ...(data as Omit<AttendanceRecord, 'id'>)
        }));
        
        // Filter records for today and this specific student
        const todayStudentRecords = allRecords.filter(record => {
          const recordDate = record.date;
          const timestampDate = record.timestamp ? record.timestamp.split('T')[0] : null;
          const isToday = recordDate === today || timestampDate === today;
          const isThisStudent = record.studentId === studentId;
          
          return isToday && isThisStudent;
        });
        
        console.log(`Found ${todayStudentRecords.length} records for student ${studentId} today:`, todayStudentRecords);
        
        // Get the most recent record for this student today
        if (todayStudentRecords.length > 0) {
          // Sort by timestamp to get the most recent record
          const sortedRecords = todayStudentRecords.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          const lastRecord = sortedRecords[0];
          
          console.log('Last record for student:', lastRecord);
          
          // If the last record was 'in', suggest 'out', otherwise suggest 'in'
          const nextStatus = lastRecord.status === 'in' ? 'out' : 'in';
          console.log(`Last status was '${lastRecord.status}', suggesting '${nextStatus}'`);
          
          return nextStatus;
        }
      }
      
      console.log('No records found for student today, defaulting to "in"');
      return 'in'; // Default to check-in if no records found
    } catch (error) {
      console.error('Error detecting attendance status:', error);
      return 'in'; // Default to check-in on error
    }
  };

  const handleStudentScan = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      try {
        setLoading(true);
        setError('');
        setSuccess('');
        setDetectedStatus(null);

        const cleanBarcode = studentBarcode.trim();
        if (!cleanBarcode) {
          setError('Please scan a valid barcode');
          setLoading(false);
          return;
        }

        console.log('Processing barcode:', cleanBarcode);
        
        // Find student by barcode
        let student: Student | null = null;
        try {
          student = await findStudentByBarcode(cleanBarcode);
        } catch (searchError) {
          console.error('Error in student search:', searchError);
          setError(`${searchError instanceof Error ? searchError.message : 'Failed to search for student'}`);
          setLoading(false);
          return;
        }
        
        if (!student) {
          setError('Student not found. Please scan a valid student barcode or ID');
          setLoading(false);
          return;
        }

        console.log('Found student:', student);

        // Validate student data
        if (!student.name || !student.course || !student.studentId) {
          console.error('Incomplete student data:', student);
          setError('Student record is incomplete. Please update student information.');
          setLoading(false);
          return;
        }

        // Automatically detect if student should be logged in or out
        const currentStatus = await detectAttendanceStatus(student.id);
        setDetectedStatus(currentStatus);

        // Create timestamp and date values
        const timestamp = new Date().toISOString();
        const today = timestamp.split('T')[0];

        // No need to check for existing records - allow unlimited recordings
        console.log('Recording attendance for student:', student.name, 'Status:', currentStatus);
        
        // Create a new attendance record (unlimited recordings allowed)
        const attendanceRecord: Omit<AttendanceRecord, 'id'> = {
          studentId: student.id,
          studentName: student.name || 'Unknown Student',
          course: student.course || 'Unknown Course',
          timestamp: timestamp,
          date: today,
          barcode: student.barcode || '',
          status: currentStatus,
          studentIdNumber: student.studentId || 'No ID',
          ...(currentStatus === 'in' ? { timeIn: timestamp } : { timeOut: timestamp })
        };

        console.log('Recording attendance:', attendanceRecord);
        
        try {
          // Create a new attendance record
          const newAttendanceRef = ref(database, 'attendance');
          const result = await push(newAttendanceRef, attendanceRecord);
          
          if (result.key) {
            console.log('Attendance recorded successfully with key:', result.key);
            const actionText = currentStatus === 'in' ? 'Time-in' : 'Time-out';
            setSuccess(`${actionText} recorded for ${student.name} (ID: ${student.studentId})`);
            await loadTodayAttendance();
          } else {
            throw new Error('Failed to get confirmation of saved record');
          }
        } catch (saveError) {
          console.error('Error saving attendance:', saveError);
          const errorMessage = saveError instanceof Error ? saveError.message : 'Unknown database error';
          setError(`Failed to save attendance record: ${errorMessage}`);
        }
      } catch (error: any) {
        console.error('Detailed error recording attendance:', error);
        setError(`Error recording attendance: ${error?.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
        setStudentBarcode('');
      }
    }
  };

  const handleDeleteAttendance = async (recordId: string, studentName: string) => {
    try {
      setLoading(true);
      const attendanceRef = ref(database, `attendance/${recordId}`);
      await remove(attendanceRef);
      setSuccess(`Attendance record deleted for ${studentName}`);
      await loadTodayAttendance();
    } catch (error: any) {
      console.error('Error deleting attendance:', error);
      setError(error?.message || 'Error deleting attendance record');
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceDuration = (record: AttendanceRecord) => {
    if (!record.timeIn || !record.timeOut) return 'N/A';
    
    const timeInMs = new Date(record.timeIn).getTime();
    const timeOutMs = new Date(record.timeOut).getTime();
    const durationMs = timeOutMs - timeInMs;
    
    // Format duration as hours and minutes
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const formatTime = (timestamp: string) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Record Student Attendance
        </Typography>
        <Typography color="textSecondary" paragraph>
          Scan student barcodes to record unlimited time-in and time-out entries
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Scan Student Barcode
                </Typography>
                
                {detectedStatus && (
                  <Alert severity="info" sx={{ mt: 1, mb: 1 }}>
                    Suggested action: {detectedStatus === 'in' ? 'Time In' : 'Time Out'} (based on last recorded activity)
                  </Alert>
                )}
                
                <TextField
                  fullWidth
                  value={studentBarcode}
                  onChange={(e) => setStudentBarcode(e.target.value)}
                  onKeyPress={handleStudentScan}
                  placeholder="Scan the student's barcode"
                  autoComplete="off"
                  autoFocus
                  helperText="Each scan records a new time-in or time-out entry (unlimited recordings allowed)"
                />

                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
                
                {loading && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <CircularProgress />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Today's Attendance
                </Typography>
                {todayAttendance.length > 0 ? (
                  <List>
                    {todayAttendance.map((record, index) => (
                      <React.Fragment key={record.id}>
                        <ListItem
                          secondaryAction={
                            <IconButton 
                              edge="end" 
                              aria-label="delete"
                              onClick={() => handleDeleteAttendance(record.id!, record.studentName)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          }
                        >
                          <ListItemText
                            primary={
                              <Box>
                                <Typography variant="subtitle1" component="span" fontWeight="bold">
                                  {record.studentName}
                                </Typography>
                                <Typography variant="body2" component="span" color="textSecondary" sx={{ ml: 1 }}>
                                  (ID: {record.studentIdNumber})
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="body2" color="textSecondary" gutterBottom>
                                  <strong>Course:</strong> {record.course}
                                </Typography>
                                
                                <Box sx={{ 
                                  backgroundColor: record.status === 'in' ? '#e3f2fd' : '#e8f5e8',
                                  padding: 1,
                                  borderRadius: 1,
                                  border: `1px solid ${record.status === 'in' ? '#2196f3' : '#4caf50'}`,
                                  mb: 1
                                }}>
                                  <Typography variant="body2" sx={{ 
                                    color: record.status === 'in' ? '#1976d2' : '#388e3c',
                                    fontWeight: 'bold',
                                    mb: 0.5
                                  }}>
                                    🔑 LOGIN STATUS: {record.status === 'in' ? '✅ LOGGED IN' : '🚪 LOGGED OUT'}
                                  </Typography>
                                  
                                  {record.status === 'in' && record.timeIn && (
                                    <Typography variant="body2" sx={{ color: '#1976d2' }}>
                                      📅 Login Time: <strong>{formatTime(record.timeIn)}</strong>
                                    </Typography>
                                  )}
                                  
                                  {record.status === 'out' && (
                                    <>
                                      <Typography variant="body2" sx={{ color: '#388e3c' }}>
                                        📅 Login Time: <strong>{record.timeIn ? formatTime(record.timeIn) : 'N/A'}</strong>
                                      </Typography>
                                      <Typography variant="body2" sx={{ color: '#388e3c' }}>
                                        🚪 Logout Time: <strong>{record.timeOut ? formatTime(record.timeOut) : 'N/A'}</strong>
                                      </Typography>
                                      <Typography variant="body2" sx={{ color: '#388e3c' }}>
                                        ⏱️ Session Duration: <strong>{getAttendanceDuration(record)}</strong>
                                      </Typography>
                                    </>
                                  )}
                                </Box>
                                
                                <Typography variant="caption" color="textSecondary">
                                  Last Activity: {formatTime(record.timestamp)}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < todayAttendance.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Typography color="textSecondary">No attendance records for today</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default StudentAttendance;