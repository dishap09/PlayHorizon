import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, LogIn, UserPlus, GamepadIcon } from 'lucide-react';
import './HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const email = e.target.elements.email.value;
      const password = e.target.elements.password.value;

      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

localStorage.setItem('token', data.token);
localStorage.setItem('userId', data.user.id);
localStorage.setItem('username', data.user.username);
localStorage.setItem('userEmail', data.user.email);
      
      setShowLogin(false);
      navigate('/search');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const email = e.target.elements.email.value;
    const password = e.target.elements.password.value;
    const confirmPassword = e.target.elements.confirmPassword.value;
    const username = e.target.elements.username.value;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      // After successful signup, automatically log in the user
      const loginResponse = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const loginData = await loginResponse.json();

      if (!loginResponse.ok) {
        throw new Error(loginData.error || 'Auto-login failed');
      }

localStorage.setItem('token', loginData.token);
localStorage.setItem('userId', loginData.user.id);
localStorage.setItem('username', loginData.user.username);
localStorage.setItem('userEmail', loginData.user.email);  // Add this line

      setShowSignup(false);
      navigate('/search');
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="home-container">
      <div className="blob"></div>
      <div className="blob"></div>
      <div className="blob"></div>

      <div className="home-content">
        <div className="home-header">
          <GamepadIcon size={48} className="icon" />
          <h1>PlayHorizon</h1>
        </div>
        
        <p className="home-description">Your gateway to endless gaming adventures</p>

        <div className="button-container">
          <button onClick={() => setShowLogin(true)} className="btn" disabled={isLoading}>
            <LogIn className="btn-icon" />
            <span>Login</span>
          </button>
          <button onClick={() => setShowSignup(true)} className="btn" disabled={isLoading}>
            <UserPlus className="btn-icon" />
            <span>Sign Up</span>
          </button>
        </div>

        {showLogin && (
          <div className="modal-backdrop">
            <div className="modal-content">
              <div className="modal-header" onClick={() => !isLoading && setShowLogin(false)}>
                <X size={24} />
              </div>
              <div className="text-center mb-8">
                <h2>Welcome back</h2>
                <p>Enter your credentials to continue</p>
              </div>
              <form onSubmit={handleLogin} className="modal-form">
                <input 
                  type="email" 
                  name="email" 
                  required 
                  placeholder="name@example.com"
                  disabled={isLoading}
                />
                <input 
                  type="password" 
                  name="password"
                  required 
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
                {error && <div className="modal-error">{error}</div>}
                <button type="submit" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
            </div>
          </div>
        )}

        {showSignup && (
          <div className="modal-backdrop">
            <div className="modal-content">
              <div className="modal-header" onClick={() => !isLoading && setShowSignup(false)}>
                <X size={24} />
              </div>
              <div className="text-center mb-8">
                <h2>Create account</h2>
                <p>Join the PlayHorizon</p>
              </div>
              <form onSubmit={handleSignup} className="modal-form">
                <input 
                  type="text"
                  name="username"
                  required 
                  placeholder="Username"
                  disabled={isLoading}
                />
                <input 
                  type="email" 
                  name="email"
                  required 
                  placeholder="name@example.com"
                  disabled={isLoading}
                />
                <input 
                  type="password"
                  name="password" 
                  required 
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
                <input 
                  type="password"
                  name="confirmPassword"
                  required 
                  placeholder="Confirm your password"
                  disabled={isLoading}
                />
                {error && <div className="modal-error">{error}</div>}
                <button type="submit" disabled={isLoading}>
                  {isLoading ? 'Creating account...' : 'Sign up for PlayHorizon'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;