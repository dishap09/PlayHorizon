import React, { useState } from 'react';
import './Payment.css';

const Payment = () => {
  // State for form fields
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

  // Handle change in input fields
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

  // Handle payment method selection
  const handlePaymentMethodChange = (e) => {
    setPaymentMethod(e.target.value);
  };

  // Handle form submission for Credit Card
  const handleCreditCardSubmit = (e) => {
    e.preventDefault();

    // Simple validation for Credit Card
    if (!billingDetails.name || !billingDetails.email || !billingDetails.address) {
      setError('Please fill in all billing details.');
      return;
    }

    if (!cardDetails.cardNumber || !cardDetails.expiryDate || !cardDetails.cvv) {
      setError('Please complete your credit card details.');
      return;
    }

    // Simulate payment processing
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      alert('Payment Successful!');
      // Reset form
      setCardDetails({ cardNumber: '', expiryDate: '', cvv: '' });
      setBillingDetails({ name: '', email: '', address: '' });
    }, 2000); // Simulate payment delay
  };

  // Handle PayPal submit
  const handlePaypalSubmit = (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      alert('Payment with PayPal Successful!');
    }, 2000); // Simulate PayPal processing
  };

  // Handle Google Pay submit
  const handleGooglePaySubmit = (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      alert('Payment with Google Pay Successful!');
    }, 2000); // Simulate Google Pay processing
  };

  return (
    <div className="payment-container">
      <h2>Payment Page</h2>
      <form onSubmit={paymentMethod === 'credit-card' ? handleCreditCardSubmit : (paymentMethod === 'paypal' ? handlePaypalSubmit : handleGooglePaySubmit)}>
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

        {/* Credit Card Details */}
        {paymentMethod === 'credit-card' && (
          <div className="credit-card-details">
            <h3>Credit Card Details</h3>
            <input
              type="text"
              name="cardNumber"
              placeholder="Card Number"
              value={cardDetails.cardNumber}
              onChange={handleCardChange}
              maxLength="19"  // Limit to 16 digits
            />
            <input
              type="text"
              name="expiryDate"
              placeholder="MM/YY"
              value={cardDetails.expiryDate}
              onChange={handleCardChange}
              maxLength="5"
            />
            <input
              type="text"
              name="cvv"
              placeholder="CVV"
              value={cardDetails.cvv}
              onChange={handleCardChange}
              maxLength="3"
            />
          </div>
        )}

        {/* PayPal Option */}
        {paymentMethod === 'paypal' && (
          <div className="paypal-details">
            <h3>Pay with PayPal</h3>
            <button type="submit" className="paypal-button">Proceed with PayPal</button>
          </div>
        )}

        {/* Google Pay Option */}
        {paymentMethod === 'google-pay' && (
          <div className="google-pay-details">
            <h3>Pay with Google Pay</h3>
            <button type="submit" className="google-pay-button">Proceed with Google Pay</button>
          </div>
        )}

        {/* Billing Details */}
        <div className="billing-details">
          <h3>Billing Information</h3>
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={billingDetails.name}
            onChange={handleBillingChange}
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={billingDetails.email}
            onChange={handleBillingChange}
          />
          <textarea
            name="address"
            placeholder="Billing Address"
            value={billingDetails.address}
            onChange={handleBillingChange}
          />
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
