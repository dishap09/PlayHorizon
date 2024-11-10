import React from 'react';
import { Link } from 'react-router-dom';
import './Cart.css';

const Cart = () => {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const totalPrice = cart.reduce((total, item) => total + item.price, 0);

  return (
    <div className="cart-container">
      <h2>Your Cart</h2>
      {cart.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          <ul>
            {cart.map((item, index) => (
              <li key={index}>
                <span>{item.name}</span> - ${item.price}
              </li>
            ))}
          </ul>
          <p><strong>Total: ${totalPrice}</strong></p>
          <Link to="/payment" className="button">Proceed to Payment</Link>
        </>
      )}
    </div>
  );
};

export default Cart;
