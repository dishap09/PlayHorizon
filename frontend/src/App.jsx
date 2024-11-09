import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { Login } from './Login';
import { Register } from './Register';
import { GameLibrary } from './GameLibrary';
import { Navbar } from './Navbar';
import { GameSearch } from './GameSearch';

const PrivateRoute = ({ children }) => {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" />;
};

export const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-100">
          <Navbar />
          <div className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/library"
                element={
                  <PrivateRoute>
                    <GameLibrary />
                  </PrivateRoute>
                }
              />
              <Route 
                path="/search" 
                element={<GameSearch />} 
              />
              <Route path="/" element={<Navigate to="/library" />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;