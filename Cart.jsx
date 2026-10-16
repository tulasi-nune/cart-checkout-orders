import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Cart.css";

const CART_KEY = "foodswiftCart";

function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || "null");

    if (saved && Array.isArray(saved.items)) {
      return {
        restaurantId: saved.restaurantId ?? null,
        items: saved.items,
      };
    }
  } catch (error) {
    console.error("Unable to read cart:", error);
  }

  return { restaurantId: null, items: [] };
}

function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(readCart);

  useEffect(() => {
    if (cart.items.length === 0) {
      localStorage.removeItem(CART_KEY);
    } else {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    }
  }, [cart]);

  const subtotal = useMemo(
    () =>
      cart.items.reduce(
        (sum, item) =>
          sum + Number(item.price || 0) * Number(item.quantity || 0),
        0
      ),
    [cart.items]
  );

  const deliveryFee = cart.items.length > 0 ? 40 : 0;
  const total = subtotal + deliveryFee;

  function updateQuantity(itemId, amount) {
    setCart((previous) => {
      const updatedItems = previous.items
        .map((item) =>
          item.id === itemId
            ? {
                ...item,
                quantity: Math.max(0, Number(item.quantity) + amount),
              }
            : item
        )
        .filter((item) => item.quantity > 0);

      return {
        ...previous,
        items: updatedItems,
      };
    });
  }

  function removeItem(itemId) {
    setCart((previous) => ({
      ...previous,
      items: previous.items.filter((item) => item.id !== itemId),
    }));
  }

  function clearCart() {
    setCart({
      restaurantId: null,
      items: [],
    });
  }

  return (
    <main className="cart-page">
      <div className="cart-page-heading">
        <div>
          <p className="cart-eyebrow">FOODSWIFT · YOUR ORDER</p>
          <h1>Your Cart</h1>
          <p>Review your favourite dishes before checkout.</p>
        </div>

        <button
          type="button"
          className="cart-continue-button"
          onClick={() =>
            navigate(
              cart.restaurantId
                ? `/menu?restaurant=${cart.restaurantId}`
                : "/"
            )
          }
        >
          ← Continue shopping
        </button>
      </div>

      {cart.items.length === 0 ? (
        <section className="cart-empty">
          <div className="cart-empty-icon">🛒</div>
          <h2>Your cart is empty</h2>
          <p>Add some delicious dishes to get started.</p>
          <button
            type="button"
            className="cart-checkout-button"
            onClick={() => navigate("/")}
          >
            Explore restaurants
          </button>
        </section>
      ) : (
        <div className="cart-layout">
          <section className="cart-items-panel">
            <div className="cart-items-heading">
              <h2>Your items ({cart.items.length})</h2>
              <button
                type="button"
                className="cart-clear-button"
                onClick={clearCart}
              >
                Clear cart
              </button>
            </div>

            {cart.items.map((item) => (
              <article className="cart-item" key={item.id}>
                <div className="cart-item-image">
                  {item.image ? (
                    <img
                      src={
                        item.image.startsWith("http")
                          ? item.image
                          : `http://127.0.0.1:8000${item.image}`
                      }
                      alt={item.name}
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <span>🍽</span>
                  )}
                </div>

                <div className="cart-item-details">
                  <h3>{item.name}</h3>
                  <p>₹{Number(item.price).toFixed(2)} each</p>

                  <button
                    type="button"
                    className="cart-remove-button"
                    onClick={() => removeItem(item.id)}
                  >
                    Remove
                  </button>
                </div>

                <div className="cart-item-right">
                  <strong>
                    ₹
                    {(
                      Number(item.price) * Number(item.quantity)
                    ).toFixed(2)}
                  </strong>

                  <div className="cart-quantity-control">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, -1)}
                      aria-label={`Remove one ${item.name}`}
                    >
                      −
                    </button>

                    <span>{item.quantity}</span>

                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, 1)}
                      aria-label={`Add one ${item.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <aside className="cart-summary">
            <h2>Order summary</h2>

            <div className="cart-summary-row">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>

            <div className="cart-summary-row">
              <span>Delivery fee</span>
              <span>₹{deliveryFee.toFixed(2)}</span>
            </div>

            <div className="cart-summary-total">
              <strong>Total</strong>
              <strong>₹{total.toFixed(2)}</strong>
            </div>

            <button
              type="button"
              className="cart-checkout-button"
              onClick={() => navigate("/checkout")}
            >
              Proceed to checkout →
            </button>

            <p className="cart-summary-note">
              Your order total is calculated from the items in your cart.
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}

export default Cart;