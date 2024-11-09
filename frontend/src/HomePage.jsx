import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, LogIn, UserPlus, GamepadIcon } from 'lucide-react';
import './HomePage.css'; // Import the CSS file

const HomePage = () => {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      localStorage.setItem('token', 'dummy-token');
      setShowLogin(false);
      navigate('/search');
    } catch (err) {
      setError('Login failed');
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      localStorage.setItem('token', 'dummy-token');
      setShowSignup(false);
      navigate('/search');
    } catch (err) {
      setError('Signup failed');
    }
  };

  return (
    <div className="home-container">
      {/* Animated background blobs */}
      <div className="blob"></div>
      <div className="blob"></div>
      <div className="blob"></div>

      {/* Main content */}
      <div className="home-content">
        <div className="home-header">
          <GamepadIcon size={48} className="icon" />
          <h1>PlayHorizon</h1>
        </div>
        
        <p className="home-description">
          Your gateway to endless gaming adventures
        </p>

        <div className="button-container">
          <button
            onClick={() => setShowLogin(true)}
            className="btn"
          >
            <LogIn className="btn-icon" />
            <span>Login</span>
            <div className="underline"></div>
          </button>
          <button
            onClick={() => setShowSignup(true)}
            className="btn"
          >
            <UserPlus className="btn-icon" />
            <span>Sign Up</span>
          </button>
        </div>

        {/* Login Modal */}
        {showLogin && (
          <div className="modal-backdrop">
            <div className="modal-content">
              <div className="modal-header" onClick={() => setShowLogin(false)}>
                <X size={24} />
              </div>
              <div className="text-center mb-8">
                <h2>Welcome back</h2>
                <p>Enter your credentials to continue</p>
              </div>
              <form onSubmit={handleLogin} className="modal-form">
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                />
                <input
                  type="password"
                  required
                  placeholder="Enter your password"
                />
                {error && (
                  <div className="modal-error">
                    {error}
                  </div>
                )}
                <button type="submit">Sign in</button>
              </form>
            </div>
          </div>
        )}

        {/* Signup Modal */}
        {showSignup && (
          <div className="modal-backdrop">
            <div className="modal-content">
              <div className="modal-header" onClick={() => setShowSignup(false)}>
                <X size={24} />
              </div>
              <div className="text-center mb-8">
                <h2>Create account</h2>
                <p>Join the PlayHorizon</p>
              </div>
              <form onSubmit={handleSignup} className="modal-form">
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                />
                <input
                  type="password"
                  required
                  placeholder="Enter your password"
                />
                <input
                  type="password"
                  required
                  placeholder="Confirm your password"
                />
                {error && (
                  <div className="modal-error">
                    {error}
                  </div>
                )}
                <button type="submit">Sign up for PlayHorizon</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
