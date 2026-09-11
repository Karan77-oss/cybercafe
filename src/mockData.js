export const stats = {
  dashboard: {
    totalCustomers: { value: '2,543', trend: 'up', trendValue: '18.6%' },
    totalWorkers: { value: '1,256', trend: 'up', trendValue: '15.3%' },
    activeOrders: { value: '320', trend: 'up', trendValue: '12.7%' },
    pendingOrders: { value: '84', trend: 'down', trendValue: '8.3%' },
    completedOrders: { value: '1,892', trend: 'up', trendValue: '25.1%' },
    platformRevenue: { value: '₹1,24,560', trend: 'up', trendValue: '12.2%' },
    pendingPayouts: { value: '₹25,450' },
    totalCommission: { value: '₹12,450' },
  }
};

export const customersData = [
  { id: 1, name: 'Rahul Kumar', email: 'rahul@gmail.com', orders: 12, spent: '₹2,450', status: 'Active', joined: '22 May 2024' },
  { id: 2, name: 'Priya Singh', email: 'priya@gmail.com', orders: 8, spent: '₹1,680', status: 'Active', joined: '22 May 2024' },
  { id: 3, name: 'Vivek Sharma', email: 'vivek@gmail.com', orders: 15, spent: '₹3,330', status: 'Active', joined: '21 May 2024' },
  { id: 4, name: 'Amit Tiwari', email: 'amit@gmail.com', orders: 9, spent: '₹1,950', status: 'Blocked', joined: '19 May 2024' },
];

export const workersData = [
  { id: 1, name: 'Amit Cyber Cafe', person: 'Amit Kumar', mobile: '9876543210', orders: 134, rating: 4.8, earnings: '₹18,450', status: 'Active' },
  { id: 2, name: 'Neha Cyber', person: 'Neha Kumari', mobile: '9812345678', orders: 98, rating: 4.7, earnings: '₹14,230', status: 'Active' },
  { id: 3, name: 'Mona E-Store', person: 'Mona Raj', mobile: '9678123456', orders: 42, rating: 4.3, earnings: '₹6,430', status: 'Pending' },
];

export const servicesData = [
  { id: 1, name: 'Income Certificate Apply', category: 'Government Forms', price: '₹100 - ₹200', orders: 452, status: 'Active' },
  { id: 2, name: 'Domicile Certificate Apply', category: 'Government Forms', price: '₹100 - ₹200', orders: 308, status: 'Active' },
  { id: 3, name: 'PAN Card Apply', category: 'Government Forms', price: '₹150 - ₹250', orders: 342, status: 'Active' },
];

export const ordersData = [
  { id: '#10248', customer: 'Rahul Kumar', service: 'Income Certificate', worker: 'Amit Cyber Cafe', amount: '₹150', status: 'In Progress', date: '22 May, 11:30 AM' },
  { id: '#10247', customer: 'Priya Singh', service: 'Domicile Certificate', worker: 'Neha Cyber', amount: '₹200', status: 'In Progress', date: '22 May, 10:45 AM' },
  { id: '#10246', customer: 'Vivek Sharma', service: 'Birth Certificate', worker: 'Rohit Online Center', amount: '₹120', status: 'Completed', date: '22 May, 09:20 AM' },
  { id: '#10244', customer: 'Sandeep Yadav', service: 'PAN Card Apply', worker: 'Amit Cyber Cafe', amount: '₹250', status: 'Pending', date: '21 May, 07:40 PM' },
  { id: '#10242', customer: 'Pooja Patel', service: 'Aadhar Update', worker: 'Vikas Cyber Cafe', amount: '₹80', status: 'Cancelled', date: '21 May, 05:10 PM' },
];

export const paymentsData = [
  { id: 'TXN10048', orderId: '#10248', customer: 'Rahul Kumar', amount: '₹150', method: 'UPI', status: 'Successful', date: '22 May, 11:30 AM' },
  { id: 'TXN10047', orderId: '#10247', customer: 'Priya Singh', amount: '₹200', method: 'Card', status: 'Successful', date: '22 May, 10:45 AM' },
  { id: 'TXN10043', orderId: '#10043', customer: 'Meena Kumari', amount: '₹800', method: 'Card', status: 'Pending', date: '21 May, 08:30 PM' },
  { id: 'TXN10042', orderId: '#10042', customer: 'Pooja Patel', amount: '₹80', method: 'UPI', status: 'Failed', date: '21 May, 05:10 PM' },
];

export const payoutsData = [
  { id: 'PAYOUT1005', worker: 'Amit Cyber Cafe', amount: '₹4,150', method: 'Bank Transfer', status: 'Paid', requestedOn: '23 May 2024', paidOn: '23 May 2024' },
  { id: 'PAYOUT1000', worker: 'Mona E-Store', amount: '₹1,620', method: 'UPI', status: 'Processing', requestedOn: '21 May 2024', paidOn: '-' },
  { id: 'PAYOUT0999', worker: 'Sharma Digital', amount: '₹1,340', method: 'Bank Transfer', status: 'Pending', requestedOn: '21 May 2024', paidOn: '-' },
];