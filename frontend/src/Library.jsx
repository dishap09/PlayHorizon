import React from 'react';

const Library = () => {
  const library = JSON.parse(localStorage.getItem('library')) || [];

  return (
    <div className="library-container">
      <h2>Your Library</h2>
      {library.length === 0 ? (
        <p>Your library is empty. Purchase games to add them here.</p>
      ) : (
        <ul>
          {library.map((game, index) => (
            <li key={index} className="library-item">
              <h3>{game.name}</h3>
              <p>Price: ${game.price}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Library;
