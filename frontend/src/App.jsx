import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import HomePage from './HomePage';  // Import HomePage component
import LandingPage from './LandingPage';  // Import LandingPage component
import GameDetails from './GameDetails';  // Import GameDetails component

// Simple authentication check
const isAuthenticated = () => {
  // Check if user is logged in (e.g., check for token in localStorage)
  return localStorage.getItem('token') !== null;
};

// Protected Route component
const ProtectedRoute = ({ element }) => {
  return isAuthenticated() ? element : <Navigate to="/" replace />;
};

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Homepage route (login/signup page) */}
        <Route 
          path="/" 
          element={
              // Redirect to games page if already logged in
            <HomePage />  // Display HomePage for login/signup
          }
        />
        
        {/* Search Page */}
        <Route 
          path="/search" 
          element={<LandingPage />} 
        />
        
        {/* Game Details Page */}
        <Route path="/game/:appId" element={<GameDetails />} />
      </Routes>
    </Router>
  );
};

export default App;