// auth.js - Fixed with Persistent Login
import { 
  auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, 
  signOut, onAuthStateChanged, updateProfile 
} from './firebase.js';
import { dbManager } from './database.js';

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.demoUsers = {
      'student@demo.com': { password: 'student123', role: 'student' },
      'faculty@demo.com': { password: 'faculty123', role: 'faculty' },
      'admin@demo.com': { password: 'admin123', role: 'admin' }
    };
    this.init();
  }

  init() {
    // Restore session from localStorage on init
    this.restoreSession();
    
    // Listen for auth state changes
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log('User authenticated:', user.email);
        this.currentUser = user;
        
        // Get additional user data from Firestore
        try {
          const userData = await dbManager.getUserByEmail(user.email);
          if (userData) {
            this.currentUser.data = userData;
            this.saveSession(userData);
          }
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      } else {
        console.log('No user authenticated');
        this.currentUser = null;
        this.clearSession();
      }
    });
  }

  restoreSession() {
    const userData = localStorage.getItem('userData');
    const userRole = localStorage.getItem('userRole');
    const userEmail = localStorage.getItem('userEmail');
    
    if (userData && userRole && userEmail) {
      this.currentUser = {
        email: userEmail,
        data: JSON.parse(userData)
      };
      console.log('Session restored for:', userEmail);
    }
  }

  saveSession(userData) {
    localStorage.setItem('userData', JSON.stringify(userData));
    localStorage.setItem('userRole', userData.role);
    localStorage.setItem('userEmail', userData.email);
    localStorage.setItem('lastLogin', new Date().toISOString());
  }

  clearSession() {
    localStorage.removeItem('userData');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('isDemoUser');
    localStorage.removeItem('rememberMe');
    localStorage.removeItem('lastLogin');
  }

  async register(userData) {
    try {
      const { email, password, firstName, lastName, role, department, semester, section, facultyId } = userData;
      
      // Validate required fields
      if (!email || !password || !firstName || !lastName || !role) {
        throw new Error('Please fill in all required fields');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Role-specific validation
      if (role === 'student' && (!department || !semester || !section)) {
        throw new Error('Please fill all student information');
      }

      if (role === 'faculty' && (!department || !facultyId)) {
        throw new Error('Please fill all faculty information');
      }

      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update profile
      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`
      });

      // Create user document in Firestore
      const userDocData = {
        uid: user.uid,
        email: email,
        firstName: firstName,
        lastName: lastName,
        role: role,
        department: department || '',
        semester: semester || '',
        section: section || '',
        facultyId: facultyId || '',
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };

      await dbManager.createUser(userDocData);

      // Store in localStorage for immediate access
      this.saveSession(userDocData);

      return { success: true, user: user };
    } catch (error) {
      let errorMessage = 'Registration failed. ';
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage += 'Email already exists.';
          break;
        case 'auth/invalid-email':
          errorMessage += 'Invalid email address.';
          break;
        case 'auth/weak-password':
          errorMessage += 'Password should be at least 6 characters.';
          break;
        default:
          errorMessage += error.message;
      }
      throw new Error(errorMessage);
    }
  }

  async login(email, password) {
    try {
      console.log('Login attempt for:', email);
      
      // Check if demo user
      if (this.isDemoUser(email, password)) {
        console.log('Demo user detected');
        return this.handleDemoLogin(email);
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('Firebase login successful:', user.email);
      
      // Get user data from Firestore
      const userData = await dbManager.getUserByEmail(email);
      if (!userData) {
        throw new Error('User data not found. Please contact administrator.');
      }

      if (!userData.isActive) {
        throw new Error('Account is deactivated. Please contact administrator.');
      }

      // Update last login
      await dbManager.updateUser(userData.id, { 
        lastLogin: new Date().toISOString() 
      });

      this.currentUser = { ...user, data: userData };
      this.saveSession(userData);

      console.log('Login successful, user role:', userData.role);
      return { success: true, user: this.currentUser };
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed. ';
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage += 'No account found with this email.';
          break;
        case 'auth/wrong-password':
          errorMessage += 'Incorrect password.';
          break;
        case 'auth/invalid-email':
          errorMessage += 'Invalid email address.';
          break;
        case 'auth/too-many-requests':
          errorMessage += 'Too many failed attempts. Please try again later.';
          break;
        default:
          errorMessage += error.message;
      }
      throw new Error(errorMessage);
    }
  }

  isDemoUser(email, password) {
    const demoUser = this.demoUsers[email];
    return demoUser && demoUser.password === password;
  }

  handleDemoLogin(email) {
    console.log('Handling demo login for:', email);
    const demoUser = this.demoUsers[email];
    const demoUserData = {
      uid: 'demo-' + Date.now(),
      email: email,
      firstName: demoUser.role.charAt(0).toUpperCase() + demoUser.role.slice(1),
      lastName: 'User',
      role: demoUser.role,
      department: 'Computer Science & Engineering',
      semester: demoUser.role === 'student' ? '5' : '',
      section: demoUser.role === 'student' ? 'A' : '',
      facultyId: demoUser.role === 'faculty' ? 'FAC001' : '',
      isActive: true,
      isDemo: true
    };

    this.currentUser = { 
      email: email, 
      data: demoUserData 
    };

    this.saveSession(demoUserData);
    localStorage.setItem('isDemoUser', 'true');

    console.log('Demo login successful, role:', demoUser.role);
    return { success: true, user: this.currentUser, isDemo: true };
  }

  async logout() {
    try {
      console.log('Logging out user');
      
      // Clear all session data first
      this.clearSession();
      this.currentUser = null;
      
      // Only sign out from Firebase if not a demo user
      if (!localStorage.getItem('isDemoUser')) {
        await signOut(auth);
      }
      
      console.log('Logout successful');
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear session even if Firebase logout fails
      this.clearSession();
      this.currentUser = null;
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isAuthenticated() {
    // Check both currentUser and localStorage for redundancy
    const userData = localStorage.getItem('userData');
    const userRole = localStorage.getItem('userRole');
    return !!(this.currentUser || (userData && userRole));
  }

  hasRole(requiredRole) {
    const userRole = localStorage.getItem('userRole');
    return userRole === requiredRole;
  }

  requireAuth(requiredRole = null) {
    console.log('Checking authentication...');
    
    if (!this.isAuthenticated()) {
      console.log('User not authenticated, redirecting to login');
      window.location.href = 'login.html';
      return false;
    }

    if (requiredRole && !this.hasRole(requiredRole)) {
      console.log('User does not have required role:', requiredRole);
      window.location.href = 'index.html';
      return false;
    }

    console.log('Authentication successful');
    return true;
  }

  redirectToDashboard() {
    const userRole = localStorage.getItem('userRole');
    console.log('Redirecting to dashboard for role:', userRole);
    
    switch(userRole) {
      case 'student':
        window.location.href = 'student.html';
        break;
      case 'faculty':
        window.location.href = 'faculty.html';
        break;
      case 'admin':
        window.location.href = 'admin.html';
        break;
      default:
        window.location.href = 'index.html';
    }
  }

  async resetPassword(email) {
    // For demo purposes - in real app, implement Firebase password reset
    return new Promise((resolve) => {
      setTimeout(() => {
        if (this.demoUsers[email] || email.includes('@')) {
          resolve({ success: true });
        } else {
          throw new Error('No user found with this email address');
        }
      }, 1000);
    });
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Create and export singleton instance
const authManager = new AuthManager();

// Global logout function with proper error handling
window.logout = async () => {
  try {
    await authManager.logout();
    // Force redirect even if there are errors
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Logout error:', error);
    // Still redirect even if logout fails
    window.location.href = 'index.html';
  }
};

export { authManager };