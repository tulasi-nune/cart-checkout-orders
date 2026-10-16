import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Checkout.css";

const API_URL = "http://127.0.0.1:8000";
const CART_KEY = "foodswiftCart";

function getSavedCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || "null");

    if (saved && Array.isArray(saved.items)) {
      return saved;
    }
  } catch {
    // Ignore invalid cart data.
  }

  return { restaurantId: null, items: [] };
}

function Checkout() {
  const navigate = useNavigate();

  const [cart] = useState(getSavedCart);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod] = useState("cod");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const subtotal = useMemo(
    () =>
      cart.items.reduce(
        (sum, item) =>
          sum + Number(item.price || 0) * Number(item.quantity || 0),
        0
      ),
    [cart.items]
  );

  const deliveryFee = cart.items.length ? 40 : 0;
  const total = subtotal + deliveryFee;

  async function placeOrder(event) {
    event.preventDefault();
    setError("");

    if (!cart.items.length) {
      setError("Your cart is empty. Please add some dishes first.");
      return;
    }

    if (!cart.restaurantId) {
      setError("Restaurant information is missing. Please add your dishes again.");
      return;
    }

    if (address.trim().length < 10) {
      setError("Please enter a complete delivery address.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    const token = localStorage.getItem("accessToken");

    if (!token) {
      setError("Please log in before placing your order.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/orders/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          restaurant: Number(cart.restaurantId),
          items: cart.items.map((item) => ({
            menu_item: Number(item.id),
            quantity: Number(item.quantity),
          })),
          delivery_address: address.trim(),
          customer_phone: phone.trim(),
          payment_method: paymentMethod,
          notes: notes.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          typeof data === "object" && data !== null
            ? Object.entries(data)
                .map(([key, value]) => {
                  const detail = Array.isArray(value)
                    ? value.join(" ")
                    : typeof value === "string"
                      ? value
                      : JSON.stringify(value);

                  return `${key}: ${detail}`;
                })
                .join(" ")
            : "";

        throw new Error(
          message || "Unable to place your order. Please try again."
        );
      }

      // Clear the cart only after the backend confirms success.
      localStorage.removeItem(CART_KEY);

      navigate("/my-orders", {
        state: {
          orderPlaced: true,
          orderId: data.id,
        },
      });
    } catch (err) {
      setError(err.message || "Unable to connect to the server.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!cart.items.length) {
    return (
      <main className="checkout-page">
        <section className="checkout-empty">
          <div className="checkout-empty-icon">🛒</div>
          <h1>Your cart is empty</h1>
          <p>Add dishes before proceeding to checkout.</p>
          <button
            type="button"
            className="checkout-primary-button"
            onClick={() => navigate("/")}
          >
            Explore restaurants
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <div className="checkout-heading">
        <p className="checkout-eyebrow">
          FOODSWIFT · ALMOST THERE
        </p>
        <h1>Complete your order</h1>
        <p>Confirm your delivery details and place your order.</p>
      </div>

      <form className="checkout-layout" onSubmit={placeOrder}>
        <section className="checkout-form-panel">
          <div className="checkout-section-heading">
            <span className="checkout-step-number">1</span>
            <div>
              <h2>Delivery details</h2>
              <p>Where should we deliver your food?</p>
            </div>
          </div>

          <div className="checkout-field">
            <label htmlFor="delivery-address">
              Complete delivery address *
            </label>
            <textarea
              id="delivery-address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="House/flat number, street, area, landmark, city and PIN code"
              rows={4}
              required
              minLength={10}
            />
          </div>

          <div className="checkout-field">
            <label htmlFor="delivery-phone">
              Contact mobile number *
            </label>
            <input
              id="delivery-phone"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(event) =>
                setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))
              }
              placeholder="10-digit mobile number"
              pattern="[6-9][0-9]{9}"
              maxLength={10}
              required
            />
          </div>

          <div className="checkout-field">
            <label htmlFor="order-notes">
              Delivery instructions (optional)
            </label>
            <textarea
              id="order-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Landmark, gate instructions or other notes"
              rows={3}
            />
          </div>

          <div className="checkout-section-heading payment-heading">
            <span className="checkout-step-number">2</span>
            <div>
              <h2>Payment method</h2>
              <p>Choose how you want to pay.</p>
            </div>
          </div>

          <label className="checkout-payment-option">
            <input
              type="radio"
              name="payment"
              value="cod"
              checked
              readOnly
            />
            <span className="checkout-cod-icon">₹</span>
            <span className="checkout-payment-text">
              <strong>Cash on Delivery</strong>
              <small>Pay when your order arrives</small>
            </span>
            <span className="checkout-payment-check">✓</span>
          </label>

          {error && (
            <div className="checkout-error" role="alert">
              {error}
              {error.includes("log in") && (
                <button
                  type="button"
                  onClick={() => navigate("/")}
                >
                  Go to home and log in
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            className="checkout-primary-button checkout-place-button"
            disabled={submitting}
          >
            {submitting
              ? "Placing your order..."
              : `Place order · ₹${total.toFixed(2)}`}
          </button>

          <p className="checkout-secure-note">
            Please review your delivery details before placing your order.
          </p>
        </section>

        <aside className="checkout-summary">
          <h2>Order summary</h2>
          <p className="checkout-item-count">
            {cart.items.reduce(
              (sum, item) => sum + Number(item.quantity || 0),
              0
            )}{" "}
            item(s)
          </p>

          <div className="checkout-summary-items">
            {cart.items.map((item) => (
              <div className="checkout-summary-item" key={item.id}>
                <div className="checkout-summary-item-info">
                  <span className="checkout-item-quantity">
                    {item.quantity}×
                  </span>
                  <span>{item.name}</span>
                </div>
                <strong>
                  ₹
                  {(
                    Number(item.price || 0) *
                    Number(item.quantity || 0)
                  ).toFixed(2)}
                </strong>
              </div>
            ))}
          </div>

          <div className="checkout-price-row">
            <span>Item subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>

          <div className="checkout-price-row">
            <span>Delivery fee</span>
            <span>₹{deliveryFee.toFixed(2)}</span>
          </div>

          <div className="checkout-total-row">
            <strong>Total payable</strong>
            <strong>₹{total.toFixed(2)}</strong>
          </div>

          <button
            type="button"
            className="checkout-back-button"
            onClick={() => navigate("/cart")}
          >
            ← Return to cart
          </button>
        </aside>
      </form>
    </main>
  );
}

export default Checkout;
