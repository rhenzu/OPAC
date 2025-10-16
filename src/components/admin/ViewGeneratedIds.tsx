import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
} from '@mui/material';
import { Print as PrintIcon, Delete as DeleteIcon } from '@mui/icons-material';
import Barcode from 'react-barcode';
import { ref, get, remove } from 'firebase/database';
import { database } from '../../firebase';
import './printStyles.css';

interface ViewGeneratedIdsProps {
  open: boolean;
  onClose: () => void;
}

interface GeneratedStudent {
  id: string;
  name: string;
  studentId: string;
  course: string;
  yearLevel: string;
  generatedDate: string;
  address?: string;
}

const chunk = <T,>(arr: T[], size: number): T[][] => {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
};

const ViewGeneratedIds: React.FC<ViewGeneratedIdsProps> = ({ open, onClose }) => {
  const [generatedIds, setGeneratedIds] = useState<GeneratedStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<GeneratedStudent | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showMultiplePreview, setShowMultiplePreview] = useState(false);

  useEffect(() => {
    if (open) {
      loadGeneratedIds();
    }
  }, [open]);

  const loadGeneratedIds = async () => {
    try {
      const generatedIdsRef = ref(database, 'generatedIds');
      const snapshot = await get(generatedIdsRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const idsArray = Object.entries(data).map(([id, value]: [string, any]) => ({
          id,
          ...value,
        }));
        setGeneratedIds(idsArray.sort((a, b) => 
          new Date(b.generatedDate).getTime() - new Date(a.generatedDate).getTime()
        ));
      }
    } catch (error) {
      console.error('Error loading generated IDs:', error);
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedIds(generatedIds.map(student => student.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(selectedId => selectedId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handlePrintSelected = () => {
    setShowMultiplePreview(true);
  };

  const handlePrintMultiple = () => {
    const printContent = document.getElementById('multiple-id-preview');
    if (printContent) {
      const originalContents = document.body.innerHTML;
      
      // Create a wrapper with proper styling
      const printWrapper = document.createElement('div');
      printWrapper.id = 'print-container';
      printWrapper.style.padding = '0';
      printWrapper.style.margin = '0';
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

  const handlePrint = () => {
    const printContent = document.getElementById('id-card-preview');
    if (printContent) {
      const originalContents = document.body.innerHTML;
      
      // Create a wrapper with proper styling
      const printWrapper = document.createElement('div');
      printWrapper.id = 'print-container';
      printWrapper.style.padding = '0';
      printWrapper.style.margin = '0';
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

  const handleViewId = (student: GeneratedStudent) => {
    setSelectedStudent(student);
    setShowPreview(true);
  };

  const handleBack = () => {
    setSelectedStudent(null);
    setShowPreview(false);
  };

  const handleClose = () => {
    setSelectedStudent(null);
    setShowPreview(false);
    onClose();
  };

  const handleDeleteGeneratedId = async (id: string, studentId: string) => {
    if (window.confirm('Are you sure you want to delete this generated ID?')) {
      try {
        await remove(ref(database, `generatedIds/${id}`));
        // Reload the generated IDs list
        loadGeneratedIds();
      } catch (error) {
        console.error('Error deleting generated ID:', error);
      }
    }
  };

  const renderIdCard = (student: GeneratedStudent) => (
    <Card sx={{ 
      width: '8.5cm',
      height: '5.4cm',
      border: '1px solid #000',
      borderRadius: 0,
      overflow: 'hidden',
      backgroundColor: '#fff',
      position: 'relative',
      p: 1,
      mb: 0.5,
      mx: 0
    }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        width: '100%',
        mb: 1,
        py: 0.5
      }}>
        {/* LGU Logo */}
        <Box sx={{ 
          width: '1.2cm', 
          height: '1.2cm',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          borderRadius: '4px',
          overflow: 'hidden',
          p: 0.2
        }}>
          <img 
            src="/images/LGU.jpg" 
            alt="LGU Logo" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'contain',
              maxWidth: '100%',
              backgroundColor: '#ffffff'
            }} 
          />
        </Box>
        
        {/* School Name */}
        <Box sx={{ 
          textAlign: 'center', 
          flex: 1, 
          mx: 2,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <Typography sx={{ 
            fontSize: '16px', 
            fontWeight: 'bold',
            lineHeight: 1.2,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            PASSI CITY COLLEGE
          </Typography>
          <Typography sx={{ 
            fontSize: '11px',
            lineHeight: 1.2,
            mt: 0.2
          }}>
            Passi City, Iloilo
          </Typography>
        </Box>

        {/* PCC Logo */}
        <Box sx={{ 
          width: '1.2cm', 
          height: '1.2cm',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          borderRadius: '4px',
          overflow: 'hidden',
          p: 0.2
        }}>
          <img 
            src="/images/pcc.jpg" 
            alt="PCC Logo" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'contain',
              maxWidth: '100%',
              backgroundColor: '#ffffff'
            }} 
          />
        </Box>
      </Box>

      <Box sx={{ 
        display: 'flex', 
        gap: 1.5,
        mt: 0.2
      }}>
        {/* Left column with photo and barcode */}
        <Box sx={{ 
          width: '2.5cm', 
          display: 'flex', 
          flexDirection: 'column'
        }}>
          {/* Photo box */}
          <Box sx={{ 
            width: '2.5cm',
            height: '2.5cm',
            border: '1px solid #000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff',
            mb: 0.5
          }}>
            <Typography variant="caption" sx={{ textAlign: 'center' }}>
              1x1 Photo
            </Typography>
          </Box>
          
          {/* Barcode under photo box */}
          <Box sx={{ width: '100%', height: '0.8cm' }}>
            <Barcode
              value={student.studentId}
              width={0.8}
              height={15}
              fontSize={0}
              displayValue={false}
              background="#fff"
            />
          </Box>
        </Box>

        {/* Right column with card info */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* LIBRARY CARD Title */}
          <Typography sx={{ 
            fontSize: '16px',
            fontWeight: 'bold',
            mb: 0.8,
            textTransform: 'uppercase'
          }}>
            LIBRARY CARD
          </Typography>

          {/* Student info fields */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
            {/* Name */}
            <Box sx={{ display: 'flex' }}>
              <Typography sx={{ fontSize: '11px', width: '60px', fontWeight: 'medium' }}>Name</Typography>
              <Box sx={{ 
                borderBottom: '1px solid #000', 
                width: '100%',
                minHeight: 16,
                display: 'flex',
                alignItems: 'center'
              }}>
                <Typography sx={{ fontSize: '10px' }}>
                  {student.name}
                </Typography>
              </Box>
            </Box>

            {/* Address */}
            <Box sx={{ display: 'flex' }}>
              <Typography sx={{ fontSize: '11px', width: '60px', fontWeight: 'medium' }}>Address</Typography>
              <Box sx={{ 
                borderBottom: '1px solid #000', 
                width: '100%',
                minHeight: 16,
                display: 'flex',
                alignItems: 'center'
              }}>
                <Typography sx={{ fontSize: '10px' }}>
                  {student.address || ''}
                </Typography>
              </Box>
            </Box>

            {/* Signature */}
            <Box sx={{ display: 'flex' }}>
              <Typography sx={{ fontSize: '11px', width: '60px', fontWeight: 'medium' }}>Signature</Typography>
              <Box sx={{ 
                borderBottom: '1px solid #000', 
                width: '100%',
                minHeight: 16 
              }} />
            </Box>
          </Box>
        </Box>
      </Box>
      
      {/* ID Number */}
      <Box sx={{ 
        position: 'absolute',
        bottom: '0.2cm',
        width: '100%',
        textAlign: 'center'
      }}>
        <Typography sx={{ 
          fontSize: '8px',
          color: '#000'
        }}>
          ID No. {student.studentId}
        </Typography>
      </Box>
    </Card>
  );

  const renderIdCardBack = (student: GeneratedStudent) => (
    <Card sx={{ 
      width: '8.5cm',
      height: '5.4cm',
      border: '1px solid #000',
      borderRadius: 0,
      overflow: 'hidden',
      backgroundColor: '#fff',
      position: 'relative',
      p: 1,
      mb: 0.5,
      mx: 0
    }}>
      {/* Renewal Chart Title */}
      <Typography sx={{ 
        fontSize: '14px',
        fontWeight: 'bold',
        mb: 0.8,
        textTransform: 'uppercase',
        textAlign: 'center'
      }}>
        RENEWAL CHART
      </Typography>

      {/* Renewal Table */}
      <Box sx={{ 
        width: '100%',
        mb: 1
      }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          fontSize: '10px',
          border: '1px solid #000'
        }}>
          <thead>
            <tr>
              <th style={{ 
                border: '1px solid #000', 
                padding: '4px',
                width: '25%',
                textAlign: 'center'
              }}>
                SCHOOL YEAR
              </th>
              <th style={{ 
                border: '1px solid #000', 
                padding: '4px',
                width: '25%',
                textAlign: 'center'
              }}>
                1ST SEM
              </th>
              <th style={{ 
                border: '1px solid #000', 
                padding: '4px',
                width: '25%',
                textAlign: 'center'
              }}>
                2ND SEM
              </th>
              <th style={{ 
                border: '1px solid #000', 
                padding: '4px',
                width: '25%',
                textAlign: 'center'
              }}>
                SUMMER
              </th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4].map((row) => (
              <tr key={row}>
                <td style={{ border: '1px solid #000', padding: '4px', height: '20px' }}></td>
                <td style={{ border: '1px solid #000', padding: '4px' }}></td>
                <td style={{ border: '1px solid #000', padding: '4px' }}></td>
                <td style={{ border: '1px solid #000', padding: '4px' }}></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>

      {/* Important Notes */}
      <Box sx={{ fontSize: '9px', mb: 0.5 }}>
        <Typography component="div" sx={{ fontWeight: 'bold', fontSize: '11px' }}>
          IMPORTANT:
        </Typography>
        <Box component="ul" sx={{ margin: 0, paddingLeft: '15px', lineHeight: 1.3 }}>
          <li>The holder of this card is a bonafide student of the Passi City College.</li>
          <li>The owner of this card is subjected to the rules and regulations of the library.</li>
        </Box>
      </Box>
    </Card>
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {showPreview || showMultiplePreview ? 'Student ID Card' : 'Generated Student IDs'}
        {(showPreview || showMultiplePreview) && (
          <IconButton
            onClick={showMultiplePreview ? handlePrintMultiple : handlePrint}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <PrintIcon />
          </IconButton>
        )}
      </DialogTitle>
      <DialogContent>
        {!showPreview && !showMultiplePreview ? (
          <>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={handlePrintSelected}
                disabled={selectedIds.length === 0}
              >
                Print Selected ({selectedIds.length})
              </Button>
            </Box>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedIds.length === generatedIds.length}
                        indeterminate={selectedIds.length > 0 && selectedIds.length < generatedIds.length}
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Student ID</TableCell>
                    <TableCell>Address</TableCell>
                    <TableCell>Course</TableCell>
                    <TableCell>Year Level</TableCell>
                    <TableCell>Generated Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {generatedIds.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedIds.includes(student.id)}
                          onChange={() => handleSelectOne(student.id)}
                        />
                      </TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.studentId}</TableCell>
                      <TableCell>{student.address || ''}</TableCell>
                      <TableCell>{student.course}</TableCell>
                      <TableCell>{student.yearLevel}</TableCell>
                      <TableCell>
                        {new Date(student.generatedDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => handleViewId(student)}
                          startIcon={<PrintIcon />}
                        >
                          View & Print
                        </Button>
                        <IconButton 
                          color="error" 
                          size="small"
                          onClick={() => handleDeleteGeneratedId(student.id, student.studentId)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : showMultiplePreview ? (
          <Box id="multiple-id-preview" sx={{ p: 0 }}>
            {chunk(
              selectedIds.map((id) => generatedIds.find((s) => s.id === id) as GeneratedStudent),
              2 // Show 2 students per page
            ).map((pageStudents, pageIndex) => (
              <Box key={pageIndex} sx={{ mb: 2, display: 'flex', flexDirection: 'column' }}>
                {pageStudents.map((student) => (
                  <Box key={student.id} sx={{ mb: 1.5, display: 'flex', justifyContent: 'center' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                      {renderIdCard(student)}
                      {renderIdCardBack(student)}
                    </Box>
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        ) : (
          <Box id="id-card-preview" sx={{ p: 0 }}>
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                {selectedStudent && renderIdCard(selectedStudent)}
                {selectedStudent && renderIdCardBack(selectedStudent)}
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {showPreview || showMultiplePreview ? (
          <>
            <Button onClick={() => {
              setShowPreview(false);
              setShowMultiplePreview(false);
              setSelectedStudent(null);
            }}>
              Back to List
            </Button>
            <Button 
              onClick={showMultiplePreview ? handlePrintMultiple : handlePrint} 
              variant="contained" 
              startIcon={<PrintIcon />}
            >
              Print ID{selectedIds.length > 1 ? 's' : ''}
            </Button>
          </>
        ) : (
          <Button onClick={handleClose}>Close</Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ViewGeneratedIds;