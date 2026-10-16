import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./MyOrders.css";


const STATUS_LABELS = {
  placed: "Order Placed",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready for Pickup",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_STEPS = [
  "placed",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
];

const API_URL = "http://127.0.0.1:8000";

async function getValidAccessToken() {
  let accessToken = localStorage.getItem("accessToken");
  const refreshToken = localStorage.getItem("refreshToken");

  if (!refreshToken) {
    return null;
  }

  // Check whether the access token has expired.
  if (accessToken) {
    try {
      const payload = JSON.parse(
        atob(accessToken.split(".")[1])
      );

      if (payload.exp * 1000 > Date.now() + 10000) {
        return accessToken;
      }
    } catch {
      // Invalid access token; attempt refresh below.
    }
  }

  // Request a new access token from Django.
  try {
    const response = await fetch(
      `${API_URL}/api/account/token/refresh/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh: refreshToken,
        }),
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    localStorage.setItem("accessToken", data.access);

    if (data.refresh) {
      localStorage.setItem("refreshToken", data.refresh);
    }

    return data.access;
  } catch {
    return null;
  }
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function formatMoney(value) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function MyOrders() {
  const navigate = useNavigate();
  const location = useLocation();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


const loadOrders = useCallback(async () => {
  setLoading(true);
  setError("");

  try {
    // Get a valid access token or refresh the expired one.
    const token = await getValidAccessToken();

    if (!token) {
      setError("Your session has expired. Please log in again.");
      setOrders([]);
      return;
    }

    const response = await fetch(`${API_URL}/api/orders/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(
          "Authentication failed. Please log in again."
        );
      }

      throw new Error(
        data.detail || "Unable to load your orders."
      );
    }

    const orderList = Array.isArray(data)
      ? data
      : Array.isArray(data.results)
        ? data.results
        : [];

    setOrders(orderList);
  } catch (err) {
    setError(err.message || "Unable to connect to the server.");
    setOrders([]);
  } finally {
    setLoading(false);
  }
}, []);


  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  function getStatusClass(status) {
    if (status === "delivered") return "delivered";
    if (status === "cancelled") return "cancelled";
    if (status === "out_for_delivery") return "delivery";
    return "active";
  }

  function renderProgress(status) {
    if (status === "cancelled") {
      return (
        <div className="order-cancelled-message">
          This order has been cancelled.
        </div>
      );
    }

    const currentIndex = STATUS_STEPS.indexOf(status);

    return (
      <div className="order-progress">
        {STATUS_STEPS.map((step, index) => {
          const completed =
            currentIndex >= 0 && index <= currentIndex;

          return (
            <div
              className={`order-progress-step ${
                completed ? "completed" : ""
              } ${index === currentIndex ? "current" : ""}`}
              key={step}
            >
              <span className="order-progress-dot">
                {completed ? "✓" : index + 1}
              </span>
              <span className="order-progress-label">
                {STATUS_LABELS[step]}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <main className="my-orders-page">
      <header className="my-orders-heading">
        <div>
          <p className="my-orders-eyebrow">
            FOODSWIFT · YOUR ORDERS
          </p>
          <h1>My Orders</h1>
          <p>
            Track your food, review previous orders, and see your
            order history.
          </p>
        </div>

        <button
          type="button"
          className="orders-refresh-button"
          onClick={loadOrders}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "↻ Refresh orders"}
        </button>
      </header>

      {location.state?.orderPlaced && (
        <div className="order-success-banner" role="status">
          <span className="order-success-icon">✓</span>
          <div>
            <strong>Order placed successfully!</strong>
            <p>
              {location.state.orderId
                ? `Your order number is #${location.state.orderId}.`
                : "Your order has been received."}{" "}
              You can follow its progress below.
            </p>
          </div>
        </div>
      )}

      {loading && (
        <div className="orders-state-card">
          <span className="orders-spinner" />
          <h2>Loading your orders</h2>
          <p>Please wait while we retrieve your order history.</p>
        </div>
      )}

      {!loading && error && (
        <div className="orders-state-card">
          <div className="orders-state-icon">!</div>
          <h2>Unable to load orders</h2>
          <p>{error}</p>

          <div className="orders-state-actions">
            <button
              type="button"
              className="orders-primary-button"
              onClick={loadOrders}
            >
              Try again
            </button>

            {error.toLowerCase().includes("log in") && (
              <button
                type="button"
                className="orders-secondary-button"
                onClick={() => navigate("/")}
              >
                Go to login
              </button>
            )}
          </div>
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="orders-state-card">
          <div className="orders-state-icon">🍽</div>
          <h2>No orders yet</h2>
          <p>
            Your next favourite meal is waiting. Explore restaurants
            and place your first order.
          </p>
          <button
            type="button"
            className="orders-primary-button"
            onClick={() => navigate("/")}
          >
            Explore restaurants
          </button>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <section className="orders-list">
          <div className="orders-list-heading">
            <h2>Your order history</h2>
            <span>{orders.length} order(s)</span>
          </div>

          {orders.map((order) => {
            const status = String(order.status || "placed")
              .toLowerCase();

            return (
              <article className="order-card" key={order.id}>
                <div className="order-card-header">
                  <div>
                    <p className="order-number">
                      ORDER #{order.id}
                    </p>
                    <p className="order-date">
                      {formatDate(order.created_at)}
                    </p>
                  </div>

                  <span
                    className={`order-status-badge ${getStatusClass(status)}`}
                  >
                    {STATUS_LABELS[status] || status.replaceAll("_", " ")}
                  </span>
                </div>

                <div className="order-card-body">
                  <div className="order-restaurant-info">
                    <div className="order-restaurant-icon">🍴</div>
                    <div>
                      <h3>
                        {typeof order.restaurant === "object"
                          ? order.restaurant?.name || "Restaurant"
                          : `Restaurant #${order.restaurant}`}
                      </h3>
                      <p>
                        {Array.isArray(order.items)
                          ? `${order.items.reduce(
                              (sum, item) =>
                                sum + Number(item.quantity || 0),
                              0
                            )} item(s)`
                          : "Order details"}
                      </p>
                    </div>
                  </div>

                  <div className="order-items-list">
                    {(order.items || []).map((item) => (
                      <div
                        className="order-line-item"
                        key={item.id}
                      >
                        <span>
                          {item.quantity} × {item.item_name}
                        </span>
                        <strong>
                          {formatMoney(item.line_total)}
                        </strong>
                      </div>
                    ))}
                  </div>

                  <div className="order-price-details">
                    <div>
                      <span>Subtotal</span>
                      <span>{formatMoney(order.subtotal)}</span>
                    </div>
                    <div>
                      <span>Delivery fee</span>
                      <span>{formatMoney(order.delivery_fee)}</span>
                    </div>
                    <div className="order-total">
                      <strong>Total</strong>
                      <strong>{formatMoney(order.total_amount)}</strong>
                    </div>
                  </div>

                  <div className="order-meta">
                    <div>
                      <span>Payment method</span>
                      <strong>
                        {String(order.payment_method || "cod")
                          .toUpperCase() === "COD"
                          ? "Cash on Delivery"
                          : String(order.payment_method || "").replaceAll(
                              "_",
                              " "
                            )}
                      </strong>
                    </div>

                    <div>
                      <span>Payment status</span>
                      <strong className="order-payment-status">
                        {String(order.payment_status || "pending")
                          .replaceAll("_", " ")
                          .toUpperCase()}
                      </strong>
                    </div>
                  </div>

                  <div className="order-delivery-address">
                    <span>Delivery address</span>
                    <p>{order.delivery_address}</p>
                  </div>

                  <div className="order-tracking-section">
                    <h4>Order progress</h4>
                    {renderProgress(status)}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

export default MyOrders;
