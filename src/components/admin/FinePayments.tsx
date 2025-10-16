import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  InputAdornment,
} from '@mui/material';
import { 
  Search as SearchIcon,
  AttachMoney as MoneyIcon,
  Print as PrintIcon,
  Done as DoneIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
  ReceiptLong as ReceiptLongIcon,
} from '@mui/icons-material';
import { ref, get, update } from 'firebase/database';
import { database } from '../../firebase';

interface FinePayment {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  details: {
    title: string;
    days: number;
    fine: number;
  }[];
  date: string;
  paid: boolean;
  paymentDate?: string;
  receiptNumber?: string;
}

const FinePayments: React.FC = () => {
  const [fineRecords, setFineRecords] = useState<FinePayment[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<FinePayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPaid, setShowPaid] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalUnpaid, setTotalUnpaid] = useState(0);
  
  // Payment dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<FinePayment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  
  // Receipt dialog
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);

  useEffect(() => {
    loadFines();
  }, []);

  useEffect(() => {
    // Filter records based on search query and paid/unpaid filter
    let filtered = [...fineRecords];
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(record => 
        record.studentName.toLowerCase().includes(query) ||
        record.id.toLowerCase().includes(query) ||
        record.details?.some(detail => detail.title.toLowerCase().includes(query)) || false
      );
    }
    
    // Apply paid/unpaid filter
    filtered = filtered.filter(record => showPaid ? true : !record.paid);
    
    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setFilteredRecords(filtered);
  }, [fineRecords, searchQuery, showPaid]);

  // Memoize the calculateTotals function with useCallback
  const calculateTotals = useCallback(() => {
    let total = 0;
    let paid = 0;
    let unpaid = 0;

    fineRecords.forEach(record => {
      // Ensure amount is a number
      const amount = typeof record.amount === 'number' ? record.amount : 0;
      total += amount;
      if (record.paid) {
        paid += amount;
      } else {
        unpaid += amount;
      }
    });

    setTotalAmount(total);
    setTotalPaid(paid);
    setTotalUnpaid(unpaid);
  }, [fineRecords]);

  useEffect(() => {
    // Calculate totals
    calculateTotals();
  }, [calculateTotals]);

  const loadFines = async () => {
    try {
      setLoading(true);
      setError('');
      
      const finesRef = ref(database, 'fines');
      const snapshot = await get(finesRef);
      
      if (!snapshot.exists()) {
        setFineRecords([]);
        setSuccess('No fine records found in the system.');
        return;
      }
      
      const finesData = snapshot.val();
      const fines: FinePayment[] = [];
      
      for (const id in finesData) {
        // Ensure every record has a details array
        const fineRecord = finesData[id];
        
        // Calculate the total fine amount from details if amount is not provided
        let amount = fineRecord.amount;
        if (amount === undefined || amount === 0) {
          const details = fineRecord.details || [];
          amount = details.reduce((sum: number, detail: any) => {
            const fine = detail.fine ? Number(detail.fine) : 0;
            return sum + fine;
          }, 0);
        }
        
        fines.push({
          id,
          ...fineRecord,
          // If details is undefined, initialize it as an empty array
          details: fineRecord.details || [],
          // Ensure amount is set properly
          amount: amount
        });
      }
      
      setFineRecords(fines);
    } catch (err) {
      console.error('Error loading fines:', err);
      setError('Failed to load fine records. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = (payment: FinePayment) => {
    setSelectedPayment(payment);
    setPaymentAmount(payment.amount !== undefined ? payment.amount.toString() : '0');
    setReceiptNumber(generateReceiptNumber());
    setPaymentDialogOpen(true);
  };

  const generateReceiptNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `FP-${year}${month}${day}-${random}`;
  };

  const handleProcessPayment = async () => {
    if (!selectedPayment) return;
    
    try {
      setLoading(true);
      
      // Update the fine record
      const fineRef = ref(database, `fines/${selectedPayment.id}`);
      await update(fineRef, {
        paid: true,
        paymentDate: new Date().toISOString(),
        receiptNumber: receiptNumber
      });
      
      // Update the local state
      const updatedRecords = fineRecords.map(record => {
        if (record.id === selectedPayment.id) {
          return {
            ...record,
            paid: true,
            paymentDate: new Date().toISOString(),
            receiptNumber: receiptNumber
          };
        }
        return record;
      });
      
      setFineRecords(updatedRecords);
      setSuccess(`Payment of ₱${(selectedPayment.amount || 0).toFixed(2)} processed successfully. Receipt number: ${receiptNumber}`);
      
      // Close the dialog
      setPaymentDialogOpen(false);
      
      // Show receipt
      setReceiptDialogOpen(true);
    } catch (err) {
      console.error('Error processing payment:', err);
      setError('Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!selectedPayment) return;
    
    const receiptWindow = window.open('', '_blank');
    if (!receiptWindow) {
      setError('Failed to open print window. Please check your popup blocker settings.');
      return;
    }
    
    const receiptDate = selectedPayment.paymentDate ? new Date(selectedPayment.paymentDate).toLocaleDateString() : new Date().toLocaleDateString();
    
    const receiptHTML = `
      <html>
        <head>
          <title>Fine Payment Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .receipt { max-width: 700px; margin: 0 auto; padding: 20px; border: 1px solid #ccc; }
            .header { text-align: center; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; }
            .subtitle { font-size: 16px; color: #666; }
            .info { margin-bottom: 20px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .label { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="title">Fine Payment Receipt</div>
              <div class="subtitle">Library Management System</div>
            </div>
            
            <div class="info">
              <div class="info-row">
                <span class="label">Receipt No:</span>
                <span>${selectedPayment.receiptNumber || receiptNumber}</span>
              </div>
              <div class="info-row">
                <span class="label">Date:</span>
                <span>${receiptDate}</span>
              </div>
              <div class="info-row">
                <span class="label">Student Name:</span>
                <span>${selectedPayment.studentName}</span>
              </div>
              <div class="info-row">
                <span class="label">Student ID:</span>
                <span>${selectedPayment.studentId}</span>
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Book Title</th>
                  <th>Days Overdue</th>
                  <th>Fine (₱)</th>
                </tr>
              </thead>
              <tbody>
                ${selectedPayment.details.map((detail, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${detail.title}</td>
                    <td>${detail.days}</td>
                    <td>₱${(detail.fine || 0).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div class="total">
              Total Amount Paid: ₱${(selectedPayment.amount || 0).toFixed(2)}
            </div>
            
            <div class="footer">
              <p>Thank you for your payment.</p>
              <p>This is a computer-generated receipt and does not require a signature.</p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <button onclick="window.print()">Print Receipt</button>
          </div>
        </body>
      </html>
    `;
    
    receiptWindow.document.open();
    receiptWindow.document.write(receiptHTML);
    receiptWindow.document.close();
    receiptWindow.focus();
  };

  const downloadPaymentReport = () => {
    // Create CSV content
    let csvContent = "Receipt Number,Date,Student ID,Student Name,Amount,Status\n";
    
    filteredRecords.forEach(record => {
      csvContent += `${record.receiptNumber || "N/A"},`;
      csvContent += `${record.paymentDate ? new Date(record.paymentDate).toLocaleDateString() : 
        new Date(record.date).toLocaleDateString()},`;
      csvContent += `${record.studentId},`;
      csvContent += `"${record.studentName}",`;
      csvContent += `₱${(record.amount || 0).toFixed(2)},`;
      csvContent += `${record.paid ? "PAID" : "UNPAID"}\n`;
    });
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `fine_payments_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Fine Payment Inventory
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Fines
              </Typography>
              <Typography variant="h4">
                ₱{(totalAmount || 0).toFixed(2)}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {fineRecords.length} fine records
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Paid
              </Typography>
              <Typography variant="h4">
                ₱{(totalPaid || 0).toFixed(2)}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {fineRecords.filter(r => r.paid).length} payments received
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Unpaid
              </Typography>
              <Typography variant="h4">
                ₱{(totalUnpaid || 0).toFixed(2)}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {fineRecords.filter(r => !r.paid).length} payments pending
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              placeholder="Search by student name or book title"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Payment Status</InputLabel>
              <Select
                value={showPaid ? "all" : "unpaid"}
                label="Payment Status"
                onChange={(e) => setShowPaid(e.target.value === "all")}
              >
                <MenuItem value="all">All Records</MenuItem>
                <MenuItem value="unpaid">Unpaid Only</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={downloadPaymentReport}
              sx={{ mr: 1 }}
            >
              Export CSV
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<ReceiptLongIcon />}
              onClick={loadFines}
            >
              Refresh Data
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Content */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="fines table">
            <TableHead>
              <TableRow>
                <TableCell>Student</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Books</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <TableRow key={record.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell component="th" scope="row">
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {record.studentName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {record.studentId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(record.date).toLocaleDateString()}
                      </Typography>
                      {record.paid && record.paymentDate && (
                        <Typography variant="caption" color="success.main">
                          Paid: {new Date(record.paymentDate).toLocaleDateString()}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {record.details.length} {record.details.length === 1 ? 'book' : 'books'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" component="div" sx={{ maxWidth: 200, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {record.details.map(d => d.title).join(', ')}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        ₱{(record.amount || 0).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {record.paid ? (
                        <Chip
                          label="PAID"
                          color="success"
                          size="small"
                          icon={<DoneIcon />}
                        />
                      ) : (
                        <Chip
                          label="UNPAID"
                          color="error"
                          size="small"
                          icon={<CloseIcon />}
                        />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {record.paid ? (
                        <Tooltip title="Print Receipt">
                          <IconButton
                            color="primary"
                            onClick={() => {
                              setSelectedPayment(record);
                              handlePrintReceipt();
                            }}
                          >
                            <PrintIcon />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Record Payment">
                          <IconButton
                            color="primary"
                            onClick={() => handlePayment(record)}
                          >
                            <MoneyIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <Typography variant="body1" color="text.secondary">
                      No fine records found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {searchQuery ? 'Try a different search term' : 'Fine records will appear here'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Messages */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {success}
        </Alert>
      )}

      {/* Payment Dialog */}
      <Dialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        aria-labelledby="payment-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="payment-dialog-title">Record Fine Payment</DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <>
              <Grid container spacing={2} sx={{ mb: 2, mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Student:
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    {selectedPayment.studentName}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Student ID:
                  </Typography>
                  <Typography variant="body1">
                    {selectedPayment.studentId}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Books ({selectedPayment.details?.length || 0}):
                  </Typography>
                  <Typography variant="body1">
                    {selectedPayment.details?.map(d => d.title).join(', ') || 'No book details available'}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                Payment Details
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Amount"
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                      readOnly: true, // Amount is fixed to the fine amount
                    }}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Receipt Number"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Payment Date"
                    type="text"
                    value={new Date().toLocaleDateString()}
                    fullWidth
                    InputProps={{
                      readOnly: true,
                    }}
                  />
                </Grid>
              </Grid>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleProcessPayment} 
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Process Payment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog
        open={receiptDialogOpen}
        onClose={() => setReceiptDialogOpen(false)}
        aria-labelledby="receipt-dialog-title"
        maxWidth="md"
        fullWidth
      >
        <DialogTitle id="receipt-dialog-title">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Payment Receipt</Typography>
            {selectedPayment && (
              <Chip 
                color="success" 
                label={`PAID: ₱${(selectedPayment.amount || 0).toFixed(2)}`} 
                icon={<DoneIcon />}
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <>
              <Alert severity="success" sx={{ mb: 3 }}>
                Payment recorded successfully! Receipt number: {selectedPayment.receiptNumber || receiptNumber}
              </Alert>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Student:
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'medium', mb: 1 }}>
                        {selectedPayment.studentName} (ID: {selectedPayment.studentId})
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary">
                        Date:
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        {new Date().toLocaleDateString()}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary">
                        Receipt Number:
                      </Typography>
                      <Typography variant="body1">
                        {selectedPayment.receiptNumber || receiptNumber}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ mb: 2, height: '100%' }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Payment Details:
                      </Typography>
                      <Typography variant="h5" sx={{ color: 'success.main', fontWeight: 'bold', mb: 1 }}>
                        ₱{(selectedPayment.amount || 0).toFixed(2)}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary">
                        Number of Books:
                      </Typography>
                      <Typography variant="body1">
                        {selectedPayment.details?.length || 0} {selectedPayment.details?.length === 1 ? 'book' : 'books'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Book Details
              </Typography>
              
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Book Title</TableCell>
                      <TableCell align="right">Days Overdue</TableCell>
                      <TableCell align="right">Fine Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedPayment.details?.map((detail, index) => (
                      <TableRow key={index}>
                        <TableCell>{detail.title}</TableCell>
                        <TableCell align="right">{detail.days}</TableCell>
                        <TableCell align="right">₱{(detail.fine || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    )) || (
                      <TableRow>
                        <TableCell colSpan={3} align="center">No book details available</TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell colSpan={2} align="right" sx={{ fontWeight: 'bold' }}>
                        Total:
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        ₱{(selectedPayment.amount || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReceiptDialogOpen(false)}>Close</Button>
          <Button 
            onClick={handlePrintReceipt} 
            variant="contained" 
            color="primary"
            startIcon={<PrintIcon />}
          >
            Print Receipt
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FinePayments; 