import React, { useState } from 'react';
import './Payment.css';

const Payment = ({ game }) => {  // Receive game prop
  const [paymentMethod, setPaymentMethod] = useState('credit-card');
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
  });
  const [billingDetails, setBillingDetails] = useState({
    name: '',
    email: '',
    address: '',
  });
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCardChange = (e) => {
    const { name, value } = e.target;
    setCardDetails({
      ...cardDetails,
      [name]: value,
    });
  };

  const handleBillingChange = (e) => {
    const { name, value } = e.target;
    setBillingDetails({
      ...billingDetails,
      [name]: value,
    });
  };

  const handlePaymentMethodChange = (e) => {
    setPaymentMethod(e.target.value);
  };

  const addToLibrary = () => {
    const library = JSON.parse(localStorage.getItem('library')) || [];
    if (!library.some((libGame) => libGame.app_id === game.app_id)) {  // Prevent duplicates
      library.push(game);  // Add the purchased game to the library
      localStorage.setItem('library', JSON.stringify(library));
    }
  };

  const handlePaymentSuccess = () => {
    setIsProcessing(false);
    alert('Payment Successful!');
    addToLibrary();  // Add the purchased game to the library

    // Reset form
    setCardDetails({ cardNumber: '', expiryDate: '', cvv: '' });
    setBillingDetails({ name: '', email: '', address: '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!billingDetails.name || !billingDetails.email || !billingDetails.address) {
      setError('Please fill in all billing details.');
      return;
    }

    if (paymentMethod === 'credit-card' && (!cardDetails.cardNumber || !cardDetails.expiryDate || !cardDetails.cvv)) {
      setError('Please complete your credit card details.');
      return;
    }

    setIsProcessing(true);
    setTimeout(handlePaymentSuccess, 2000);  // Simulate payment processing
  };

  return (
    <div className="payment-container">
      <h2>Payment Page</h2>
      <form onSubmit={handleSubmit}>
        {/* Payment Method Selection */}
        <div className="payment-method">
          <label>
            <input
              type="radio"
              value="credit-card"
              checked={paymentMethod === 'credit-card'}
              onChange={handlePaymentMethodChange}
            />
            Credit Card
          </label>
          <label>
            <input
              type="radio"
              value="paypal"
              checked={paymentMethod === 'paypal'}
              onChange={handlePaymentMethodChange}
            />
            PayPal
          </label>
          <label>
            <input
              type="radio"
              value="google-pay"
              checked={paymentMethod === 'google-pay'}
              onChange={handlePaymentMethodChange}
            />
            Google Pay
          </label>
        </div>

        {/* Conditional Payment Fields */}
        {paymentMethod === 'credit-card' && (
          <div className="credit-card-details">
            <input type="text" name="cardNumber" placeholder="Card Number" value={cardDetails.cardNumber} onChange={handleCardChange} maxLength="19" />
            <input type="text" name="expiryDate" placeholder="MM/YY" value={cardDetails.expiryDate} onChange={handleCardChange} maxLength="5" />
            <input type="text" name="cvv" placeholder="CVV" value={cardDetails.cvv} onChange={handleCardChange} maxLength="3" />
          </div>
        )}

        {/* Billing Information */}
        <div className="billing-details">
          <input type="text" name="name" placeholder="Full Name" value={billingDetails.name} onChange={handleBillingChange} />
          <input type="email" name="email" placeholder="Email" value={billingDetails.email} onChange={handleBillingChange} />
          <textarea name="address" placeholder="Billing Address" value={billingDetails.address} onChange={handleBillingChange} />
        </div>

        {error && <p className="error">{error}</p>}
        <button type="submit" className="pay-button" disabled={isProcessing}>
          {isProcessing ? 'Processing...' : 'Pay Now'}
        </button>
      </form>
    </div>
  );
};

export default Payment;
