import { useNavigate } from 'react-router-dom';

export default function Checkout() {
  const navigate = useNavigate();
  return (
    <div style={{ padding: '60px', textAlign: 'center' }}>
      <h2>Obsolete Route</h2>
      <p>Checkout is now handled directly inside the Service Form.</p>
      <button className="btn btn-primary" onClick={() => navigate('/orders')}>Go to My Orders</button>
    </div>
  );
}
