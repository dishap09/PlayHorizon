import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './GameDetails.css';

const GameDetails = () => {
  const { appId } = useParams(); // Extract appId from the URL
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('App ID:', appId); // Log to check if appId is correctly retrieved

    if (appId) {
      fetch(`/api/games/${appId}`)
        .then((response) => response.json())
        .then((data) => {
          setGame(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setError('Error fetching game details');
          setLoading(false);
        });
    } else {
      setError('No appId found');
      setLoading(false);
    }
  }, [appId]);

  if (loading) return <p>Loading game details...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h1>{game?.name}</h1>
      <img src={game?.header_image} alt={`${game?.name} header`} />
      <p><strong>About the Game:</strong> {game?.about_the_game}</p>
      <p><strong>Release Date:</strong> {game?.release_date}</p>
      <p><strong>Price:</strong> ${game?.price}</p>
      <p><strong>DLC Count:</strong> {game?.dlc_count}</p>
      <p><strong>Metacritic Score:</strong> {game?.metacritic_score}</p>
      <p><strong>User Score:</strong> {game?.user_score}</p>
      <p><strong>Positive Reviews:</strong> {game?.positive_reviews}</p>
      <p><strong>Negative Reviews:</strong> {game?.negative_reviews}</p>
      
      <h3>Developers</h3>
      <p>{game?.developers}</p>
      
      <h3>Publishers</h3>
      <p>{game?.publishers}</p>

      <h3>Categories</h3>
      <p>{game?.categories}</p>

      <h3>Genres</h3>
      <p>{game?.genres}</p>

      <h3>Tags</h3>
      <p>{game?.tags}</p>

      <p><strong>Website:</strong> <a href={game?.website} target="_blank" rel="noopener noreferrer">{game?.website}</a></p>
      <p><strong>Support URL:</strong> <a href={game?.support_url} target="_blank" rel="noopener noreferrer">{game?.support_url}</a></p>
      <p><strong>Support Email:</strong> <a href={`mailto:${game?.support_email}`}>{game?.support_email}</a></p>
    </div>
  );
};

export default GameDetails;
