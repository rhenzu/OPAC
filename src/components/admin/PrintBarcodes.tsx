import React, { useState, useEffect } from 'react';
import {
  Container,
  Button,
  Box,
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
  Alert,
} from '@mui/material';
import { Print as PrintIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import Barcode from 'react-barcode';
import { ref, get } from 'firebase/database';
import { database } from '../../firebase';

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  accessionNumber: string;
  barcode: string;
}

const PrintBarcodes: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      const booksRef = ref(database, 'books');
      const snapshot = await get(booksRef);
      if (snapshot.exists()) {
        const booksData = snapshot.val();
        const booksArray = Object.entries(booksData).map(([id, data]: [string, any]) => ({
          id,
          ...data,
        }));
        setBooks(booksArray);
      }
    } catch (error) {
      console.error('Error loading books:', error);
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedBooks(books.map(book => book.id));
    } else {
      setSelectedBooks([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedBooks(prev => {
      if (prev.includes(id)) {
        return prev.filter(selectedId => selectedId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handlePrintSelected = () => {
    setShowPreview(true);
  };

  const handlePrint = () => {
    const printContent = document.getElementById('barcode-preview');
    if (printContent) {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  };

  const handleBack = () => {
    setShowPreview(false);
  };

  const handleGoBack = () => {
    navigate('/admin/books');
  };
  
  const formatBarcode = (barcode: string): string => {
    if (barcode.includes('-')) return barcode;
    
    if (barcode.length > 8) {
      return `${barcode.slice(0, 2)}-${barcode.slice(2, 8)}-${barcode.slice(8)}`;
    }
    
    return barcode;
  };
  
  const generateBookInfo = (book: Book) => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const formattedBarcode = formatBarcode(book.barcode);

    // Generate HTML content for printing
    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Book ID Card</title>
          <style>
            @page {
              size: 3.375in 2.125in;
              margin: 0;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              width: 3.375in;
              height: 2.125in;
              overflow: hidden;
            }
            .card {
              width: 3.375in;
              height: 2.125in;
              background-color: white;
              border: 1px solid #ddd;
              border-radius: 5px;
              box-sizing: border-box;
              padding: 0.15in;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              box-shadow: 0 2px 5px rgba(0,0,0,0.1);
              position: relative;
              overflow: hidden;
            }
            .card-header {
              margin-bottom: 0.1in;
              text-align: center;
              border-bottom: 1px solid #eee;
              padding-bottom: 0.05in;
            }
            .book-title {
              font-size: 12px;
              font-weight: bold;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .book-author {
              font-size: 10px;
              margin-top: 0.05in;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .book-accession {
              font-family: monospace;
              font-size: 10px;
              margin-top: 0.05in;
              text-align: center;
            }
            .barcode-container {
              flex-grow: 1;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .barcode-container svg {
              max-width: 100%;
              height: auto;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .card {
                page-break-after: always;
                border: none;
                box-shadow: none;
              }
            }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        </head>
        <body>
          <div class="card">
            <div class="card-header">
              <div class="book-title">${book.title}</div>
              <div class="book-author">by ${book.author}</div>
            </div>
            <div class="barcode-container">
              <svg class="barcode"></svg>
            </div>
            <div class="book-accession">Accession: ${book.accessionNumber}</div>
          </div>
          <script>
            JsBarcode(".barcode", "${formattedBarcode}", {
              format: "CODE128",
              width: 1.5,
              height: 40,
              displayValue: true,
              fontSize: 8,
              margin: 0
            });
          </script>
        </body>
      </html>
    `;

    // Write content to the new window and print
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.onafterprint = () => {
          printWindow.close();
        };
      }, 500); // Increased timeout to ensure barcode renders
    };
  };
  
  const printMultipleBooks = () => {
    const selectedBooksList = books.filter(book => selectedBooks.includes(book.id));
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Generate HTML content for printing
    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Book ID Cards</title>
          <style>
            @page {
              size: 8.5in 11in;
              margin: 0.25in;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
            }
            .cards-container {
              display: flex;
              flex-wrap: wrap;
              justify-content: flex-start;
              gap: 0.25in;
            }
            .card {
              width: 3.375in;
              height: 2.125in;
              background-color: white;
              border: 1px solid #ddd;
              border-radius: 5px;
              box-sizing: border-box;
              padding: 0.15in;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              box-shadow: 0 2px 5px rgba(0,0,0,0.1);
              position: relative;
              overflow: hidden;
              margin-bottom: 0.25in;
            }
            .card-header {
              margin-bottom: 0.1in;
              text-align: center;
              border-bottom: 1px solid #eee;
              padding-bottom: 0.05in;
            }
            .book-title {
              font-size: 12px;
              font-weight: bold;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .book-author {
              font-size: 10px;
              margin-top: 0.05in;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .book-accession {
              font-family: monospace;
              font-size: 10px;
              margin-top: 0.05in;
              text-align: center;
            }
            .barcode-container {
              flex-grow: 1;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .barcode-container svg {
              max-width: 100%;
              height: auto;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .card {
                break-inside: avoid;
                page-break-inside: avoid;
                border: none;
                box-shadow: none;
              }
            }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        </head>
        <body>
          <div class="cards-container">
            ${selectedBooksList.map((book, index) => `
              <div class="card">
                <div class="card-header">
                  <div class="book-title">${book.title}</div>
                  <div class="book-author">by ${book.author}</div>
                </div>
                <div class="barcode-container">
                  <svg id="barcode-${index}" class="barcode"></svg>
                </div>
                <div class="book-accession">Accession: ${book.accessionNumber}</div>
              </div>
            `).join('')}
          </div>
          
          <script>
            ${selectedBooksList.map((book, index) => `
              JsBarcode("#barcode-${index}", "${formatBarcode(book.barcode)}", {
                format: "CODE128",
                width: 1.5,
                height: 40,
                displayValue: true,
                fontSize: 8,
                margin: 0
              });
            `).join('')}
          </script>
        </body>
      </html>
    `;

    // Write content to the new window and print
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.onafterprint = () => {
          printWindow.close();
        };
      }, 500); // Increased timeout to ensure barcodes render
    };
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton onClick={handleGoBack}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6">
              Print Book Barcodes
            </Typography>
          </Box>
          {selectedBooks.length > 0 && (
            <Button
              variant="contained"
              startIcon={<PrintIcon />}
              onClick={printMultipleBooks}
            >
              Print Selected ({selectedBooks.length})
            </Button>
          )}
        </Box>

        {books.length === 0 ? (
          <Alert severity="info">No books available.</Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedBooks.length === books.length && books.length > 0}
                      indeterminate={selectedBooks.length > 0 && selectedBooks.length < books.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Author</TableCell>
                  <TableCell>ISBN</TableCell>
                  <TableCell>Accession No.</TableCell>
                  <TableCell>Barcode</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {books.map((book) => (
                  <TableRow key={book.id}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedBooks.includes(book.id)}
                        onChange={() => handleSelectOne(book.id)}
                      />
                    </TableCell>
                    <TableCell>{book.title}</TableCell>
                    <TableCell>{book.author}</TableCell>
                    <TableCell>{book.isbn}</TableCell>
                    <TableCell>{book.accessionNumber}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Barcode
                          value={formatBarcode(book.barcode)}
                          width={1}
                          height={40}
                          fontSize={10}
                          margin={0}
                          format="CODE128"
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<PrintIcon />}
                        onClick={() => generateBookInfo(book)}
                      >
                        Print
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
};

export default PrintBarcodes; 