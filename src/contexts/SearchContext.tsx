import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { ref, get, query, orderByChild, startAt, endAt } from 'firebase/database';
import { database } from '../firebase';

// Define search categories
export type SearchCategory = 'books' | 'students' | 'borrowed' | 'all';

// Define search result structure for different entities
interface BookSearchResult {
  id: string;
  type: 'book';
  title: string;
  author: string;
  isbn: string;
  available: number;
  category?: string;
  thumbnail?: string;
}

interface StudentSearchResult {
  id: string;
  type: 'student';
  name: string;
  grade: string;
  section: string;
  studentId: string;
  thumbnail?: string;
}

interface BorrowingSearchResult {
  id: string;
  type: 'borrowing';
  bookId: string;
  bookTitle: string;
  studentId: string;
  studentName: string;
  borrowDate: string;
  dueDate: string;
  returnDate: string | null;
}

export type SearchResult = BookSearchResult | StudentSearchResult | BorrowingSearchResult;

interface SearchContextType {
  searchTerm: string;
  searchCategory: SearchCategory;
  searchResults: SearchResult[];
  isSearching: boolean;
  setSearchTerm: (term: string) => void;
  setSearchCategory: (category: SearchCategory) => void;
  performSearch: (term?: string, category?: SearchCategory) => Promise<void>;
  clearSearch: () => void;
}

const SearchContext = createContext<SearchContextType>({
  searchTerm: '',
  searchCategory: 'all',
  searchResults: [],
  isSearching: false,
  setSearchTerm: () => {},
  setSearchCategory: () => {},
  performSearch: async () => {},
  clearSearch: () => {},
});

export const useSearch = () => useContext(SearchContext);

interface SearchProviderProps {
  children: ReactNode;
}

export const SearchProvider: React.FC<SearchProviderProps> = ({ children }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchCategory, setSearchCategory] = useState<SearchCategory>('all');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Clear search results
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchResults([]);
  }, []);

  // Search books
  const searchBooks = useCallback(async (term: string): Promise<BookSearchResult[]> => {
    // Filter by title, author, isbn or category
    const booksRef = ref(database, 'books');
    const snapshot = await get(booksRef);
    
    if (!snapshot.exists()) return [];

    const books = snapshot.val();
    // Convert to array and filter
    return Object.entries(books)
      .filter(([_, book]: [string, any]) => {
        const bookData = book as any;
        const matchTitle = bookData.title && bookData.title.toLowerCase().includes(term.toLowerCase());
        const matchAuthor = bookData.author && bookData.author.toLowerCase().includes(term.toLowerCase());
        const matchISBN = bookData.isbn && bookData.isbn.toLowerCase().includes(term.toLowerCase());
        const matchCategory = bookData.category && bookData.category.toLowerCase().includes(term.toLowerCase());
        
        return matchTitle || matchAuthor || matchISBN || matchCategory;
      })
      .map(([id, book]: [string, any]) => ({
        id,
        type: 'book' as const,
        title: book.title || '',
        author: book.author || '',
        isbn: book.isbn || '',
        available: book.available || 0,
        category: book.category || '',
        thumbnail: book.thumbnail || '',
      }));
  }, []);

  // Search students
  const searchStudents = useCallback(async (term: string): Promise<StudentSearchResult[]> => {
    // Filter by name, grade, section, or studentId
    const studentsRef = ref(database, 'students');
    const snapshot = await get(studentsRef);
    
    if (!snapshot.exists()) return [];

    const students = snapshot.val();
    // Convert to array and filter
    return Object.entries(students)
      .filter(([_, student]: [string, any]) => {
        const studentData = student as any;
        const matchName = studentData.name && studentData.name.toLowerCase().includes(term.toLowerCase());
        const matchGrade = studentData.grade && studentData.grade.toLowerCase().includes(term.toLowerCase());
        const matchSection = studentData.section && studentData.section.toLowerCase().includes(term.toLowerCase());
        const matchStudentId = studentData.studentId && studentData.studentId.toLowerCase().includes(term.toLowerCase());
        
        return matchName || matchGrade || matchSection || matchStudentId;
      })
      .map(([id, student]: [string, any]) => ({
        id,
        type: 'student' as const,
        name: student.name || '',
        grade: student.grade || '',
        section: student.section || '',
        studentId: student.studentId || '',
        thumbnail: student.thumbnail || '',
      }));
  }, []);

  // Search borrowings
  const searchBorrowings = useCallback(async (term: string): Promise<BorrowingSearchResult[]> => {
    // Get all borrowings
    const borrowingsRef = ref(database, 'borrowed');
    const borrowingsSnapshot = await get(borrowingsRef);
    
    if (!borrowingsSnapshot.exists()) return [];

    // Get books and students to join data
    const booksRef = ref(database, 'books');
    const studentsRef = ref(database, 'students');
    const [booksSnapshot, studentsSnapshot] = await Promise.all([
      get(booksRef),
      get(studentsRef)
    ]);

    const books = booksSnapshot.exists() ? booksSnapshot.val() : {};
    const students = studentsSnapshot.exists() ? studentsSnapshot.val() : {};
    const borrowings = borrowingsSnapshot.val();
    
    // Convert to array and filter
    return Object.entries(borrowings)
      .filter(([_, borrowing]: [string, any]) => {
        const borrowingData = borrowing as any;
        const book = books[borrowingData.bookId] || {};
        const student = students[borrowingData.studentId] || {};
        
        const matchBookTitle = book.title && book.title.toLowerCase().includes(term.toLowerCase());
        const matchStudentName = student.name && student.name.toLowerCase().includes(term.toLowerCase());
        const matchDueDate = borrowingData.dueDate && borrowingData.dueDate.toLowerCase().includes(term.toLowerCase());
        const matchBorrowDate = borrowingData.borrowDate && borrowingData.borrowDate.toLowerCase().includes(term.toLowerCase());
        
        return matchBookTitle || matchStudentName || matchDueDate || matchBorrowDate;
      })
      .map(([id, borrowing]: [string, any]) => {
        const book = books[borrowing.bookId] || {};
        const student = students[borrowing.studentId] || {};
        
        return {
          id,
          type: 'borrowing' as const,
          bookId: borrowing.bookId || '',
          bookTitle: book.title || 'Unknown Book',
          studentId: borrowing.studentId || '',
          studentName: student.name || 'Unknown Student',
          borrowDate: borrowing.borrowDate || '',
          dueDate: borrowing.dueDate || '',
          returnDate: borrowing.returnDate || null,
        };
      });
  }, []);

  // Perform search across all or specific categories
  const performSearch = useCallback(async (term?: string, category?: SearchCategory) => {
    const searchFor = term !== undefined ? term : searchTerm;
    const categoryToSearch = category !== undefined ? category : searchCategory;
    
    if (!searchFor || searchFor.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      let results: SearchResult[] = [];
      
      if (categoryToSearch === 'all' || categoryToSearch === 'books') {
        const bookResults = await searchBooks(searchFor);
        results = [...results, ...bookResults];
      }
      
      if (categoryToSearch === 'all' || categoryToSearch === 'students') {
        const studentResults = await searchStudents(searchFor);
        results = [...results, ...studentResults];
      }
      
      if (categoryToSearch === 'all' || categoryToSearch === 'borrowed') {
        const borrowingResults = await searchBorrowings(searchFor);
        results = [...results, ...borrowingResults];
      }
      
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchTerm, searchCategory, searchBooks, searchStudents, searchBorrowings]);

  // Auto-search when term or category changes
  useEffect(() => {
    if (searchTerm && searchTerm.trim().length >= 2) {
      const timer = setTimeout(() => {
        performSearch();
      }, 300);
      
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, searchCategory, performSearch]);

  const value = {
    searchTerm,
    searchCategory,
    searchResults,
    isSearching,
    setSearchTerm,
    setSearchCategory,
    performSearch,
    clearSearch,
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
}; 