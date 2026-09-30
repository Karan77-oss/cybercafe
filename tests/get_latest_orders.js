async function main() {
  const loginRes = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'customer@test.com', password: 'password123' })
  });
  const { token } = await loginRes.json();
  const ordersRes = await fetch('http://localhost:4000/api/orders', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await ordersRes.json();
  console.log(JSON.stringify(data.orders.slice(0, 3), null, 2));
}
main();
