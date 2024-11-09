import { useState } from 'react';
import { Search } from 'lucide-react';

export const GameSearch = () => {
  const [query, setQuery] = useState('');
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchGames = async (searchQuery) => {
    if (!searchQuery?.trim()) {
      setGames([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/games/search?query=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Accept': 'application/json',
        },
      });
      
      // Check if the response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }
      
      if (!Array.isArray(data?.games)) {
        throw new Error('Invalid response format');
      }

      setGames(data.games);
    } catch (err) {
      console.error('Search error:', err);
      setError(
        err.message === 'Failed to fetch' 
          ? 'Unable to connect to the server. Please check your internet connection.'
          : 'Failed to search games. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Debounce search with cleanup
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    
    const timeoutId = setTimeout(() => {
      searchGames(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Search Input */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={handleSearchChange}
          placeholder="Search games..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          aria-label="Search games"
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-4" role="status" aria-label="Loading">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-red-500 text-center py-4" role="alert">
          {error}
        </div>
      )}

      {/* Results */}
      <div className="grid gap-6">
        {games.map((game) => (
          <div
            key={game.app_id}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className="md:flex">
              <div className="md:flex-shrink-0">
                <img
                  src={game.header_image || "/api/placeholder/200/120"}
                  alt={`${game.name} cover`}
                  className="h-48 w-full object-cover md:w-48"
                  onError={(e) => {
                    e.target.src = "/api/placeholder/200/120";
                    e.target.alt = "Game cover placeholder";
                  }}
                />
              </div>
              <div className="p-4 flex-grow">
                <div className="flex justify-between items-start">
                  <h2 className="text-xl font-semibold text-gray-900">{game.name}</h2>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      {typeof game.price === 'number' ? 
                        game.price > 0 ? `$${game.price.toFixed(2)}` : 'Free' 
                        : 'Price unavailable'}
                    </p>
                    {game.metacritic_score && (
                      <span className={`inline-block px-2 py-1 rounded text-white text-sm ${
                        game.metacritic_score >= 75 ? 'bg-green-500' :
                        game.metacritic_score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}>
                        {game.metacritic_score}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    Release Date: {game.release_date ? new Date(game.release_date).toLocaleDateString() : 'Unknown'}
                  </p>
                  {typeof game.review_percentage === 'number' && (
                    <p className="text-sm text-gray-600">
                      User Reviews: {game.review_percentage}% Positive
                    </p>
                  )}
                  {game.playtime_hours > 0 && (
                    <p className="text-sm text-gray-600">
                      Average Playtime: {game.playtime_hours} hours
                    </p>
                  )}
                </div>

                <div className="mt-3">
                  {Array.isArray(game.genres) && game.genres.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {game.genres.map((genre, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-gray-100 rounded-full text-gray-700"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {Array.isArray(game.developers) && game.developers.length > 0 && (
                  <p className="mt-2 text-sm text-gray-600">
                    Developer: {game.developers.join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* No Results */}
      {!loading && !error && query && games.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          No games found matching "{query}"
        </div>
      )}
    </div>
  );
};