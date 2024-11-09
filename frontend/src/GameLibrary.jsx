import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export const GameLibrary = () => {
  const [games, setGames] = useState([]);
  const [error, setError] = useState('');
  const { user, token } = useAuth();

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/users/${user.id}/games`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);
      
      setGames(data.games);
    } catch (err) {
      setError(err.message);
    }
  };

  const removeGame = async (appId) => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/users/${user.id}/games/${appId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }
      
      setGames(games.filter(game => game.app_id !== appId));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">My Game Library</h2>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((game) => (
          <div
            key={game.app_id}
            className="bg-white p-4 rounded-lg shadow-md"
          >
            <h3 className="font-bold text-lg mb-2">{game.name}</h3>
            <p className="text-gray-600 mb-4">{game.description}</p>
            <button
              onClick={() => removeGame(game.app_id)}
              className="bg-red-500 text-white py-1 px-3 rounded hover:bg-red-600"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
