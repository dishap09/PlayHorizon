import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import HomePage from './HomePage';
import LandingPage from './LandingPage';
import GameDetails from './GameDetails';
import Payment from './Payment';
import Library from './Library';
import GameStore from './GameManagement';

// Authentication check
const isAuthenticated = () => {
  return localStorage.getItem('token') !== null;
};

// Admin check with better error handling
const useAdminCheck = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!isAuthenticated()) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('http://localhost:3000/api/users/me', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            setIsAdmin(false);
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setIsAdmin(data.role === 'admin');
      } catch (error) {
        console.error('Error checking admin status:', error);
        setError(error.message);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  return { isAdmin, loading, error };
};

// Protected Route component for regular users
const ProtectedRoute = ({ element }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  return element;
};

// Protected Route component for admin users
const AdminRoute = ({ element }) => {
  const { isAdmin, loading, error } = useAdminCheck();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p>Error checking permissions. Please try again later.</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  return isAdmin ? element : <Navigate to="/search" replace />;
};

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<LandingPage />} />
        <Route path="/game/:appId" element={<GameDetails />} />
        
        {/* Protected Routes - Require Authentication */}
        <Route path="/payment" element={<ProtectedRoute element={<Payment />} />} />
        <Route path="/library" element={<ProtectedRoute element={<Library />} />} />
        
        {/* Admin Routes */}
        <Route 
          path="/admin/games" 
          element={<AdminRoute element={<GameStore />} />} 
        />
        
        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/search" replace />} />
      </Routes>
    </Router>
  );
};

export default App;