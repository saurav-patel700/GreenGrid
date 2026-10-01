import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getAccessToken, getMeApi, loginApi, registerApi, logoutApi,
  updateProfileApi, changePasswordApi, fetchOrganizationApi, clearTokens
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      getMeApi()
        .then(data => {
          setUser(data.user);
          setOrganization(data.organization);
        })
        .catch(() => {
          setUser(null);
          setOrganization(null);
          clearTokens();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await loginApi(email, password);
      setUser(data.user);
      setOrganization(data.organization);
      return data;
    } catch (err) {
      setUser(null);
      setOrganization(null);
      clearTokens();
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      const data = await registerApi(payload);
      setUser(data.user);
      setOrganization(data.organization);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await logoutApi();
    } finally {
      setUser(null);
      setOrganization(null);
      setLoading(false);
    }
  };

  const updateProfile = async (payload) => {
    const updatedUser = await updateProfileApi(payload);
    setUser(updatedUser);
    return updatedUser;
  };

  const refreshOrg = async () => {
    try {
      const orgData = await fetchOrganizationApi();
      setOrganization(orgData);
    } catch (err) {}
  };

  const role = user?.role || 'viewer';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{
      user,
      organization,
      role,
      isAuthenticated,
      loading,
      login,
      register,
      logout,
      updateProfile,
      changePassword: changePasswordApi,
      refreshOrg
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
