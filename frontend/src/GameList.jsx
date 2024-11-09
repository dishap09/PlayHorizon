// frontend/src/components/GamesList.jsx

import React, { useEffect, useState } from 'react';

const GamesList = () => {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch games data from backend
        fetch('http://localhost:3001/api/games') // Adjust the URL if necessary
            .then(response => response.json())
            .then(data => {
                setGames(data);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching games:', error);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return <p>Loading games...</p>;
    }

    return (
        <div>
            <h2>Games List</h2>
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Release Date</th>
                        <th>Price</th>
                        <th>Metacritic Score</th>
                    </tr>
                </thead>
                <tbody>
                    {games.map(game => (
                        <tr key={game.app_id}>
                            <td>{game.name}</td>
                            <td>{game.release_date}</td>
                            <td>{game.price}</td>
                            <td>{game.metacritic_score}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default GamesList;
