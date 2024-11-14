import React, { useState, useEffect } from 'react';
import { TrendingUp, Star, Clock, ThumbsUp } from 'lucide-react';
import "./TrendingGames.css"; // Import the new CSS file

const TrendingGames = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/trending')
      .then(res => res.json())
      .then(data => {
        setGames(data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load trending games');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        {error}
      </div>
    );
  }

  return (
    <div className="trending-games-container">
      <div className="trending-games-header">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <TrendingUp className="h-6 w-6" />
          Trending Games
        </h2>
      </div>
      <div className="trending-games-content">
        <div className="grid gap-4">
          {games.map((game) => (
            <div 
              key={game.app_id}
              className="game-card"
            >
              <img
                src={game.header_image || "/api/placeholder/200/100"}
                alt={game.name}
                className="game-image"
              />
              <div className="game-details">
                <h3 className="game-title">{game.name}</h3>
                <div className="game-info">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="icon" />
                    <span>{game.trending_score}%</span>
                  </div>
                  {game.metacritic_score && (
                    <div className="flex items-center gap-1">
                      <Star className="icon" />
                      <span>{game.metacritic_score}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="icon" />
                    <span>{game.playtime_hours}h</span>
                  </div>
                  {game.review_score && (
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="icon" />
                      <span>{game.review_score}%</span>
                    </div>
                  )}
                </div>
                <div className="game-genres">
                  {game.genres.slice(0, 3).map((genre) => (
                    <span 
                      key={genre}
                      className="game-genre-badge"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
                <div className="game-release-info">
                  Released: {new Date(game.release_date).toLocaleDateString()}
                  {game.price > 0 ? ` • $${game.price}` : ' • Free'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrendingGames;
