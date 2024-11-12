import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './GameDetails.css';

const GameDetails = () => {
  const { appId } = useParams();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('App ID:', appId);

    if (appId) {
      fetch(`/api/games/${appId}`)
        .then((response) => response.json())
        .then((data) => {
          setGame(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setError(`Error fetching game details: ${err.message}`);
          setLoading(false);
        });
    } else {
      setError('No appId found');
      setLoading(false);
    }
  }, [appId]);

  const handlePurchase = () => {
    navigate('/payment', { state: { game, price: game?.price } });
  };
  

  if (loading) return <p>Loading game details...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="game-details-container">
      <h1>{game?.name}</h1>
      <img src={game?.header_image} alt={`${game?.name} header`} />
      
      {/* Move Purchase button below the image */}
      <div className="buttons">
        <button onClick={handlePurchase} className="purchase-button">Purchase</button>
      </div>

      <p><strong>About the Game:</strong> {game?.about_the_game}</p>
      <p><strong>Release Date:</strong> {game?.release_date}</p>
      <p><strong>Price:</strong> ${game?.price}</p>
      <p><strong>DLC Count:</strong> {game?.dlc_count}</p>
      <p><strong>Metacritic Score:</strong> {game?.metacritic_score}</p>
      <p><strong>User Score:</strong> {game?.review_score}%</p>
      <p><strong>Positive Reviews:</strong> {game?.positive_reviews}</p>
      <p><strong>Negative Reviews:</strong> {game?.negative_reviews}</p>

      <h3>Developers</h3>
      <p>{game?.developers.join(', ')}</p>

      <h3>Publishers</h3>
      <p>{game?.publishers.join(', ')}</p>

      <h3>Categories</h3>
      <p>{game?.categories.join(', ')}</p>

      <h3>Genres</h3>
      <p>{game?.genres.join(', ')}</p>

      <h3>Tags</h3>
      <p>{game?.tags.join(', ')}</p>

      <h3>Supported Languages</h3>
      <p>{game?.supported_languages.join(', ')}</p>

      <h3>Full Audio Languages</h3>
      <p>{game?.full_audio_languages.join(', ')}</p>

      <h3>Screenshots</h3>
      <div className="screenshots">
        {game?.screenshots.map((url, index) => (
          <img key={index} src={url} alt={`Screenshot ${index + 1}`} />
        ))}
      </div>

      <h3>Movies</h3>
      <div className="movies">
        {game?.movies.map((url, index) => (
          <video key={index} src={url} controls />
        ))}
      </div>

      <p><strong>Operating Systems:</strong> 
        {game?.windows && ' Windows,'} 
        {game?.mac && ' Mac,'} 
        {game?.linux && ' Linux'}
      </p>

      <h3>Playtime</h3>
      <p><strong>Average Playtime (Forever):</strong> {game?.playtime?.average.forever} hours</p>
      <p><strong>Average Playtime (Two Weeks):</strong> {game?.playtime?.average.two_weeks} hours</p>
      <p><strong>Median Playtime (Forever):</strong> {game?.playtime?.median.forever} hours</p>
      <p><strong>Median Playtime (Two Weeks):</strong> {game?.playtime?.median.two_weeks} hours</p>

      <p><strong>Website:</strong> <a href={game?.website} target="_blank" rel="noopener noreferrer">{game?.website}</a></p>
      <p><strong>Support URL:</strong> <a href={game?.support_url} target="_blank" rel="noopener noreferrer">{game?.support_url}</a></p>
      <p><strong>Support Email:</strong> <a href={`mailto:${game?.support_email}`}>{game?.support_email}</a></p>
    </div>
  );
};

export default GameDetails;
