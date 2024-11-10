import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

export const LandingPage = () => {
  const [query, setQuery] = useState('');
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Retrieve email from localStorage
  const userEmail = localStorage.getItem('userEmail') || 'Guest';

  const searchGames = async (searchQuery) => {
    if (!searchQuery?.trim()) {
      setGames([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/games/search?query=${encodeURIComponent(searchQuery)}`, {
        headers: { 'Accept': 'application/json' },
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Server error: ${response.status}`);

      if (!Array.isArray(data?.games)) throw new Error('Invalid response format');

      setGames(data.games);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message === 'Failed to fetch' ? 'Unable to connect to the server. Please check your internet connection.' : 'Failed to search games. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    const timeoutId = setTimeout(() => {
      searchGames(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  return (
    <div className="landing-page">
      <div className="header">
        <div className="user-profile">
          <div className="profile-pic">
            {/* Optional: Add profile picture here if available */}
          </div>
          <span className="email">{userEmail}</span> {/* Display user's email */}
        </div>

        <div className="search-container">
          <div className="search-bar">
            <div className="search-icon">
              <Search className="search-icon-svg" />
            </div>
            <input
              type="text"
              value={query}
              onChange={handleSearchChange}
              placeholder="Search games..."
              className="search-input"
              aria-label="Search games"
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading" role="status" aria-label="Loading">
          <div className="spinner"></div>
        </div>
      )}

      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      <div className="game-results">
        {games.length === 0 && !loading && query && (
          <div className="no-results">
            No games found matching "{query}"
          </div>
        )}
        <div className="game-list">
          {games.map((game) => (
            <Link
              key={game.app_id}
              to={`/game/${game.app_id}`}
              className="game-card"
            >
              <div className="game-card-inner">
                <div className="game-image">
                  <img
                    src={game.header_image || '/api/placeholder/200/120'}
                    alt={`${game.name} cover`}
                    className="game-image-img"
                    onError={(e) => {
                      e.target.src = '/api/placeholder/200/120';
                      e.target.alt = 'Game cover placeholder';
                    }}
                  />
                </div>
                <div className="game-details">
                  <h2 className="game-name">{game.name}</h2>
                  <div className="game-pricing">
                    <span className="game-price">
                      {typeof game.price === 'number'
                        ? game.price > 0
                          ? `$${game.price.toFixed(2)}`
                          : 'Free'
                        : 'Price unavailable'}
                    </span>
                    {game.metacritic_score && (
                      <span className={`game-metacritic ${game.metacritic_score >= 75 ? 'green' : game.metacritic_score >= 50 ? 'yellow' : 'red'}`}>
                        {game.metacritic_score}
                      </span>
                    )}
                  </div>
                  <div className="game-info">
                    <p className="release-date">
                      Release Date: {game.release_date ? new Date(game.release_date).toLocaleDateString() : 'Unknown'}
                    </p>
                    {typeof game.review_percentage === 'number' && (
                      <p className="user-reviews">
                        User Reviews: {game.review_percentage}% Positive
                      </p>
                    )}
                    {game.playtime_hours > 0 && (
                      <p className="playtime">
                        Average Playtime: {game.playtime_hours} hours
                      </p>
                    )}
                  </div>
                  <div className="game-genres">
                    {Array.isArray(game.genres) && game.genres.length > 0 && (
                      <div className="genres-list">
                        {game.genres.map((genre, index) => (
                          <span key={index} className="genre-badge">{genre}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {Array.isArray(game.developers) && game.developers.length > 0 && (
                    <p className="game-developers">
                      Developer: {game.developers.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
