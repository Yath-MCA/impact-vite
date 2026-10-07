/**
 * @file AuthProvider.jsx
 * @description Authentication context for user/admin roles
 * Manages login state and admin privileges
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiService, ADMIN_CONFIG, ROLE_IDS, User_API_KEY } from './apiService';

const AuthContext = createContext(null);

function readStoredSessionUser() {
  const storedUser = localStorage.getItem('xmleditor:user');
  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser);
      if (parsed && typeof parsed === 'object' && parsed.userId) {
        return parsed;
      }
    } catch {
      // Invalid JSON is ignored; login keys below still count.
    }
  }

  const userId = localStorage.getItem('xmleditor:login_userid');
  if (!userId) return null;
  return {
    userId,
    username: localStorage.getItem('xmleditor:login_username') || ''
  };
}

const RBAC_ACCESS = {
  Admin: { dashboard: true, editor: true, reports: true, admin: true },
  Editor: { dashboard: true, editor: true, reports: true, admin: false },
  Production: { dashboard: true, editor: true, reports: true, admin: false },
  Author: { dashboard: false, editor: true, reports: false, admin: false },
  Client: { dashboard: true, editor: false, reports: true, admin: false }
};

/**
 * AuthProvider component
 * Manages authentication state globally
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const resolveEffectiveRole = useCallback((userData) => {
    const workflowRole = (userData?._workflow_role || userData?.workflow_role || '').toString().toLowerCase();
    const isWorkflowSuperAdmin = workflowRole === 'superadmin';
    const isPosAdmin = userData?.pos === 10;

    if (isWorkflowSuperAdmin || isPosAdmin) {
      return 'Admin';
    }

    return userData?.role || null;
  }, []);

  /**
   * Check if user is admin based on localStorage and user ID
   */
  const checkAdminStatus = useCallback((userData) => {
    const isAdminUser = ADMIN_CONFIG.checkIsAdmin();
    const isSuperAdminUser = userData?.userId ?
      ADMIN_CONFIG.checkIsSuperAdmin(userData.userId) : false;
    const workflowRole = (userData?._workflow_role || userData?.workflow_role || '').toString().toLowerCase();
    const isWorkflowSuperAdmin = workflowRole === 'superadmin';
    // Treat users with pos === 10 as admin as requested
    const isPosAdmin = userData?.pos === 10;

    setIsAdmin(isAdminUser || isSuperAdminUser || isWorkflowSuperAdmin || isPosAdmin);
    setIsSuperAdmin(isSuperAdminUser || isWorkflowSuperAdmin);
  }, []);

  /**
   * Initialize auth state from localStorage
   */
  useEffect(() => {
    const initAuth = () => {
      try {
        const userData = readStoredSessionUser();
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
          setUserRole(resolveEffectiveRole(userData));
          checkAdminStatus(userData);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [checkAdminStatus, resolveEffectiveRole]);

  /**
   * Login user
   */
  const login = useCallback(async (credentials) => {
    setLoading(true);
    setError(null);

    try {
      // Call login API using dedicated method (correct endpoint + headers)
      const response = await apiService.userLogin(
        credentials.email,
        credentials.password
      );

      if (response) {

        const userData = response || {};

        if (!userData.username) {
          setError('Invalid email');
          return false;
        }

        if ((response?.cred ?? userData?.cred) == 0) {
          setError('Invalid password');
          return false;
        }



        // Store in localStorage
        localStorage.setItem('xmleditor:appkey', 'xmleditor');
        localStorage.setItem('xmleditor:apikey', userData.apikey ? userData.apikey : User_API_KEY);

        // localStorage.setItem('xmleditor:login_user', JSON.stringify(userData));
        // localStorage.setItem('xmleditor:token', userData.token || '');

        localStorage.setItem('xmleditor:login_username', userData.username || '');
        localStorage.setItem('xmleditor:login_userid', userData.userId || '');
        localStorage.setItem('xmleditor:user', JSON.stringify({
          userId: userData.userId || '',
          username: userData.username || ''
        }));

        // Check admin status
        // Check admin status (include pos === 10 as admin)
        if (userData.isAdmin || ADMIN_CONFIG.checkIsSuperAdmin(userData.userId) || userData.pos === 10 || (userData?._workflow_role || '').toString().toLowerCase() === 'superadmin') {
          localStorage.setItem('xmleditor:admin', 'superadmin');
        }

        // Update state
        setUser(userData);
        setIsAuthenticated(true);
        setUserRole(resolveEffectiveRole(userData));
        checkAdminStatus(userData);

        return { success: true, user: userData };
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [checkAdminStatus, resolveEffectiveRole]);

  /**
   * Logout user
   */
  const logout = useCallback(() => {
    // Clear localStorage
    localStorage.removeItem('xmleditor:user');
    // localStorage.removeItem('xmleditor:token');
    localStorage.removeItem('xmleditor:login_username');
    localStorage.removeItem('xmleditor:login_userid');
    localStorage.removeItem('xmleditor:admin');

    // Clear state
    setUser(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    setIsSuperAdmin(false);
    setUserRole(null);
    setError(null);
  }, []);

  /**
   * Update user role
   */
  const updateRole = useCallback((roleId) => {
    setUserRole(roleId);
    if (user) {
      const updatedUser = { ...user, role: roleId };
      setUser(updatedUser);
      localStorage.setItem('xmleditor:user', JSON.stringify(updatedUser));
    }
  }, [user]);

  /**
   * Check if user has specific role
   */
  const hasRole = useCallback((roleId) => {
    return userRole === roleId;
  }, [userRole]);

  const hasAccess = useCallback((scope) => {
    const roleName = (userRole || '').toString();
    const access = RBAC_ACCESS[roleName] || RBAC_ACCESS.Editor;
    return Boolean(access[scope]);
  }, [userRole]);

  /**
   * Get role details
   */
  const getRoleDetails = useCallback(() => {
    return userRole ? ROLE_IDS[userRole] : null;
  }, [userRole]);

  const value = {
    user,
    isAuthenticated,
    isAdmin,
    isSuperAdmin,
    userRole,
    loading,
    error,
    login,
    logout,
    updateRole,
    hasRole,
    hasAccess,
    getRoleDetails,
    ROLE_IDS,
    RBAC_ACCESS
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
