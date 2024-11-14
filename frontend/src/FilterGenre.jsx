import React, { useState, useEffect, useRef } from 'react';
import './FilterGenre.css';

const FilterGenre = () => {
  const [games, setGames] = useState([]);
  const [genres, setGenres] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100 });
  const [pagination, setPagination] = useState({
    totalCount: 0,
    currentPage: 1,
    totalPages: 1,
    pageSize: 20
  });
  const observer = useRef();
  const lastGameRef = useRef();

  const loadGenres = async () => {
    try {
      const response = await fetch('/api/genres');
      const data = await response.json();
      setGenres(data);
    } catch (error) {
      console.error('Error loading genres:', error);
    }
  };

  const loadGames = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        genre: selectedGenre,
        minPrice: priceRange.min,
        maxPrice: priceRange.max,
        page,
        pageSize: 20
      });

      const response = await fetch(`/api/by-genre?${params}`);
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        console.error('Unexpected data format:', data);
        return;
      }

      const processedGames = data.map(game => ({
        ...game,
        price: game.price ? parseFloat(game.price) : null,
        genres: game.genres ? game.genres.split(',') : []
      }));

      setGames(prevGames => 
        page === 1 ? processedGames : [...prevGames, ...processedGames]
      );
      
      // Update pagination info if available in response headers
      const totalCount = parseInt(response.headers.get('X-Total-Count')) || 0;
      const totalPages = Math.ceil(totalCount / 20);
      setPagination({
        totalCount,
        currentPage: page,
        totalPages,
        pageSize: 20
      });
      
      setHasMore(page < totalPages);
      setLoading(false);
    } catch (error) {
      console.error('Error loading games:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGenres();
  }, []);

  useEffect(() => {
    setPage(1);
    setGames([]);
    loadGames();
  }, [selectedGenre, priceRange.min, priceRange.max]);

  useEffect(() => {
    if (page > 1) {
      loadGames();
    }
  }, [page]);

  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '20px',
      threshold: 0.1,
    };

    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        setPage(prevPage => prevPage + 1);
      }
    }, options);

    if (lastGameRef.current) {
      observer.current.observe(lastGameRef.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [hasMore, loading]);

  const handleGenreChange = (e) => {
    setSelectedGenre(e.target.value);
  };

  const handlePriceChange = (e) => {
    const { name, value } = e.target;
    setPriceRange(prev => ({
      ...prev,
      [name]: Number(value)
    }));
  };

  return (
   
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-wrap gap-4">
 <h1>Filter By Genre </h1> 
        <select
          className="p-2 border rounded"
          value={selectedGenre}
          onChange={handleGenreChange}
        >
          <option value="">All Genres</option>
          {genres.map(genre => (
            <option key={`genre-${genre.id}`} value={genre.name}>
              {genre.name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          
         
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {games.map((game, index) => (
          <div
            key={`game-${game.app_id}-${index}`}
            ref={index === games.length - 1 ? lastGameRef : null}
            className="bg-white rounded-lg shadow-md overflow-hidden"
          >
            <img
              src={game.header_image || '/api/placeholder/400/200'}
              alt={game.name}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-2">{game.name}</h3>
              <p className="text-gray-600">
                Release Date: {new Date(game.release_date).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Genres: {game.genres.join(', ')}
              </p>
              <p className="text-green-600 font-bold mt-2">
                {game.price === null ? 'Free' : `$${game.price.toFixed(2)}`}
              </p>
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="text-center py-4">
          <p>Loading more games...</p>
        </div>
      )}

      {!hasMore && games.length > 0 && (
        <div className="text-center py-4">
          <p>No more games to load</p>
        </div>
      )}
    </div>
  );
};

export default FilterGenre;