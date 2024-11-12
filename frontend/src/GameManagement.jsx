import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit, Trash2, Search, ChevronLeft, ChevronRight, Loader, CrossIcon, XIcon } from 'lucide-react';
import './GameManagement.css';


const GameManagement = () => {
    const [games, setGames] = useState([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedGame, setSelectedGame] = useState(null);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const checkAdminStatus = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/users/me', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            setIsAdmin(data.role === 'admin');
        } catch (error) {
            console.error('Error checking admin status:', error);
            setError('Failed to verify admin status');
        }
    };

    const fetchGames = async (page = 1) => {
        try {
            setLoading(true);
            const response = await fetch(`http://localhost:3000/api/games?page=${page}&pageSize=12`);
            const data = await response.json();
            setGames(data.games || []);
            setTotalPages(data.pagination.totalPages);
            setCurrentPage(page);
        } catch (error) {
            setError('Failed to fetch games');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAdminStatus();
        fetchGames();
    }, []);

    const handleDelete = async (appId) => {
        if (!window.confirm('Are you sure you want to delete this game?')) return;

        try {
            const response = await fetch(`http://localhost:3000/api/games/${appId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                await fetchGames(currentPage);
            } else {
                throw new Error('Failed to delete game');
            }
        } catch (error) {
            setError(error.message);
        }
    };

    const handleSubmit = async (e, isEdit = false) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const gameData = {
            name: formData.get('name'),
            release_date: formData.get('release_date'),
            price: parseFloat(formData.get('price')),
            header_image: formData.get('header_image'),
            metacritic_score: parseInt(formData.get('metacritic_score')),
            about_the_game: formData.get('about_the_game')
        };

        if (!isEdit) {
            gameData.app_id = parseInt(formData.get('app_id'));
        }

        try {
            const url = isEdit
                ? `http://localhost:3000/api/games/${selectedGame.app_id}`
                : 'http://localhost:3000/api/games';

            const response = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(gameData)
            });

            if (response.ok) {
                await fetchGames(currentPage);
                setShowAddModal(false);
                setShowEditModal(false);
                setSelectedGame(null);
            } else {
                throw new Error(`Failed to ${isEdit ? 'update' : 'create'} game`);
            }
        } catch (error) {
            setError(error.message);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`http://localhost:3000/api/games/search?query=${searchQuery}`);
            const data = await response.json();
            setGames(data.games || []);
        } catch (error) {
            setError('Search failed');
        }
    };

    const GameForm = ({ isEdit, game }) => (
        <form onSubmit={(e) => handleSubmit(e, isEdit)} className="game-form">
            {!isEdit && (
                <div className="form-group">
                    <label htmlFor="app_id">App ID:</label>
                    <input
                        type="number"
                        id="app_id"
                        name="app_id"
                        required
                        className="form-input"
                    />
                </div>
            )}
            <div className="form-group">
                <label htmlFor="name">Name:</label>
                <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    defaultValue={game?.name || ''}
                    className="form-input"
                />
            </div>
            <div className="form-group">
                <label htmlFor="release_date">Release Date:</label>
                <input
                    type="date"
                    id="release_date"
                    name="release_date"
                    required
                    defaultValue={game?.release_date || ''}
                    className="form-input"
                />
            </div>
            <div className="form-group">
                <label htmlFor="price">Price:</label>
                <input
                    type="number"
                    id="price"
                    name="price"
                    step="0.01"
                    required
                    defaultValue={game?.price || ''}
                    className="form-input"
                />
            </div>
            <div className="form-group">
                <label htmlFor="header_image">Header Image URL:</label>
                <input
                    type="url"
                    id="header_image"
                    name="header_image"
                    required
                    defaultValue={game?.header_image || ''}
                    className="form-input"
                />
            </div>
            <div className="form-group">
                <label htmlFor="metacritic_score">Metacritic Score:</label>
                <input
                    type="number"
                    id="metacritic_score"
                    name="metacritic_score"
                    min="0"
                    max="100"
                    required
                    defaultValue={game?.metacritic_score || ''}
                    className="form-input"
                />
            </div>
            <div className="form-group">
                <label htmlFor="about_the_game">About the Game:</label>
                <textarea
                    id="about_the_game"
                    name="about_the_game"
                    required
                    defaultValue={game?.about_the_game || ''}
                    className="form-textarea"
                />
            </div>
            <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                    {isEdit ? 'Update Game' : 'Add Game'}
                </button>
                <button
                    type="button"
                    onClick={() => isEdit ? setShowEditModal(false) : setShowAddModal(false)}
                    className="btn btn-secondary"
                >
                    Cancel
                </button>
            </div>
        </form>
    );

    if (!isAdmin) {
        return <div className="unauthorized">You don't have permission to access this page.</div>;
    }

    return (
        <>
            <div className='page-container'>
                <div className="header">
                    <h1>Game Management</h1>
                    <button
                        className="btn btn-primary add-game"
                        onClick={() => setShowAddModal(true)}
                    >
                        <PlusCircle className="icon" /> Add New Game
                    </button>
                </div>

                <div className='main-container'>
                    <div className="search-bar">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search games..."
                            className="search-input"
                        />
                        <button onClick={handleSearch} type="submit" className="btn btn-secondary">
                            <Search className="icon" /> Search
                        </button>
                    </div>
                    <div className="games-grid">
                        {games.map(game => (
                            <div key={game.app_id} className="game-card">
                                <div className='image-container'>
                                    <img
                                        src={game.header_image}
                                        alt={game.name}
                                        className="game-image"
                                    />
                                </div>
                                <div className="game-info">
                                    <h3>{game.name}</h3>
                                    <p>Release Date: {new Date(game.release_date).toLocaleDateString()}</p>
                                    <p>Price: ${game.price}</p>
                                    <p>Metacritic: {game.metacritic_score}</p>
                                </div>
                                <div className="game-actions">
                                    <button
                                        onClick={() => {
                                            setSelectedGame(game);
                                            setShowEditModal(true);
                                        }}
                                        className="btn btn-secondary"
                                    >
                                        <Edit className="icon" /> Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(game.app_id)}
                                        className="btn btn-danger"
                                    >
                                        <Trash2 className="icon" /> Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="pagination">
                        <button
                            onClick={() => fetchGames(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="btn btn-secondary"
                        >
                            <ChevronLeft className="icon" /> Previous
                        </button>
                        <span>Page {currentPage} of {totalPages}</span>
                        <button
                            onClick={() => fetchGames(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="btn btn-secondary"
                        >
                            Next <ChevronRight className="icon" />
                        </button>
                    </div>
                </div>
            </div>

            {showAddModal && (
                <div className="modal">
                    <div className="modal-content">
                        <h2>Add New Game</h2>
                        <GameForm isEdit={false} />
                    </div>
                </div>
            )}

            {showEditModal && selectedGame && (
                <div className="modal">
                    <div className="modal-content">
                        <h2>Edit Game</h2>
                        <GameForm isEdit={true} game={selectedGame} />
                        <button className='cross-icon' onClick={()=>setShowEditModal(false)}>
                            <XIcon/>
                        </button>
                    </div>
                </div>
            )}

            {error && <div className="error-message">{error}</div>}
        </>
    );
};

export default GameManagement;