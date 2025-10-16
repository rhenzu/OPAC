import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { auth, database } from '../firebase';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { ref, get, set } from 'firebase/database';

export interface UserPermissions {
  manageBooks: boolean;
  manageStudents: boolean;
  manageBorrowing: boolean;
  manageAttendance: boolean;
  viewReports: boolean;
  manageReports: boolean;
  manageUsers: boolean;
  manageSettings: boolean;
}

export interface User {
  uid: string;
  email: string | null;
  name: string;
  role: string;
  permissions: UserPermissions;
}

interface AuthContextType {
  currentUser: User | null;
  userLoading: boolean;
  hasPermission: (permission: keyof UserPermissions) => boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
}

const defaultValue: AuthContextType = {
  currentUser: null,
  userLoading: true,
  hasPermission: () => false,
  isAdmin: false,
  logout: async () => {},
};

// Default permissions for new users
const defaultPermissions: UserPermissions = {
  manageBooks: false,
  manageStudents: false,
  manageBorrowing: false,
  manageAttendance: false,
  viewReports: false,
  manageReports: false,
  manageUsers: false,
  manageSettings: false,
};

export const AuthContext = createContext<AuthContextType>(defaultValue);

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  // Memoize hasPermission function
  const hasPermission = useCallback((permission: keyof UserPermissions) => {
    if (!currentUser) return false;
    
    // Admins have all permissions
    if (currentUser.role === 'admin') return true;
    
    // Check if user has the specific permission
    return currentUser.permissions?.[permission] === true;
  }, [currentUser]);

  // Memoize isAdmin value
  const isAdmin = useMemo(() => currentUser?.role === 'admin', [currentUser]);

  // Memoize logout function
  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  // Handle creating default user data if they exist in Firebase Auth but not in the database
  const createDefaultUserData = useCallback(async (firebaseUser: FirebaseUser) => {
    try {
      // Check if this is the first user (possible admin)
      const usersRef = ref(database, 'users');
      const usersSnapshot = await get(usersRef);
      
      const isFirstUser = !usersSnapshot.exists();
      
      // Create default user data
      const userData = {
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        email: firebaseUser.email,
        role: isFirstUser ? 'admin' : 'staff', // First user is admin
        permissions: isFirstUser ? {
          // Admin gets all permissions
          manageBooks: true,
          manageStudents: true,
          manageBorrowing: true,
          manageAttendance: true,
          viewReports: true,
          manageReports: true,
          manageUsers: true,
          manageSettings: true,
        } : defaultPermissions,
        dateCreated: new Date().toISOString(),
        createdBy: 'system',
      };
      
      // Save to database
      await set(ref(database, `users/${firebaseUser.uid}`), userData);
      
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: userData.name,
        role: userData.role,
        permissions: userData.permissions,
      };
    } catch (error) {
      console.error("Error creating default user data:", error);
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const handleAuthStateChanged = async (firebaseUser: FirebaseUser | null) => {
      if (!isMounted) return;
      
      try {
        if (firebaseUser) {
          // Fetch user data from the database
          const userRef = ref(database, `users/${firebaseUser.uid}`);
          const snapshot = await get(userRef);
          
          let user: User | null = null;
          
          if (snapshot.exists() && isMounted) {
            // User exists in database
            const userData = snapshot.val();
            
            user = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: userData.name || '',
              role: userData.role || 'staff',
              permissions: userData.permissions || defaultPermissions,
            };
          } else if (isMounted) {
            // User exists in Firebase Auth but not in the database
            // Create default user data in the database
            user = await createDefaultUserData(firebaseUser);
          }
          
          if (isMounted && user) {
            setCurrentUser(user);
          } else if (isMounted) {
            console.error("Failed to set up user data for:", firebaseUser.uid);
            setCurrentUser(null);
          }
        } else if (isMounted) {
          setCurrentUser(null);
        }
      } catch (error) {
        console.error("Error handling auth state change:", error);
        if (isMounted) setCurrentUser(null);
      } finally {
        if (isMounted) setUserLoading(false);
      }
    };
    
    setUserLoading(true);
    const unsubscribe = onAuthStateChanged(auth, handleAuthStateChanged);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [createDefaultUserData]);

  // Memoize context value
  const contextValue = useMemo(() => ({
    currentUser,
    userLoading,
    hasPermission,
    isAdmin,
    logout,
  }), [currentUser, userLoading, hasPermission, isAdmin, logout]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}; 