export const calculateMetrics = (state) => {
  const customers = Object.values(state.users).filter(u => u.role === 'CUSTOMER');
  const workers = Object.values(state.users).filter(u => u.role === 'WORKER');
  
  const activeOrders = state.orders.filter(o => !['COMPLETED', 'CANCELLED', 'DISPUTED'].includes(o.status));
  const completedOrders = state.orders.filter(o => o.status === 'COMPLETED');
  const cancelledOrders = state.orders.filter(o => o.status === 'CANCELLED');
  
  const revenuePaise = state.orders.reduce((acc, o) => acc + o.pricing.customerPaid, 0);
  const commissionPaise = state.orders.reduce((acc, o) => acc + o.pricing.commission, 0);
  const payoutPaise = state.orders.reduce((acc, o) => acc + o.pricing.workerPayout, 0);
  
  const paidOrders = state.orders.filter(o => o.pricing && o.pricing.customerPaid > 0);
  const aov = paidOrders.length > 0 ? (revenuePaise / paidOrders.length) : 0;
  
  const eligibleForCompletion = state.orders.filter(o => o.status !== 'CANCELLED').length;
  const completionRate = eligibleForCompletion > 0 ? (completedOrders.length / eligibleForCompletion) * 100 : 0;
  
  const cancellationRate = state.orders.length > 0 ? (cancelledOrders.length / state.orders.length) * 100 : 0;
  
  const commissionMargin = revenuePaise > 0 ? (commissionPaise / revenuePaise) * 100 : 0;
  const payoutRatio = revenuePaise > 0 ? (payoutPaise / revenuePaise) * 100 : 0;

  // Time-series and mathematical analysis
  const orderCountsByDate = {};
  state.orders.forEach(o => {
     const date = o.createdAt.substring(0, 10);
     orderCountsByDate[date] = (orderCountsByDate[date] || 0) + 1;
  });
  
  const dailyCounts = Object.values(orderCountsByDate);
  const sumDaily = dailyCounts.reduce((a, b) => a + b, 0);
  const meanDaily = dailyCounts.length > 0 ? sumDaily / dailyCounts.length : 0;
  const varianceDaily = dailyCounts.length > 0 ? dailyCounts.reduce((a, b) => a + Math.pow(b - meanDaily, 2), 0) / dailyCounts.length : 0;
  const stdDevDaily = Math.sqrt(varianceDaily);
  const cvDaily = meanDaily > 0 ? (stdDevDaily / meanDaily) : 0;

  // 7-day moving average (simplified for prototype array)
  let movingAverage7Day = 'N/A';
  if (dailyCounts.length >= 7) {
     const last7 = dailyCounts.slice(-7);
     movingAverage7Day = (last7.reduce((a,b)=>a+b, 0) / 7).toFixed(1);
  } else if (dailyCounts.length > 0) {
     movingAverage7Day = meanDaily.toFixed(1);
  }

  return {
    totalCustomers: customers.length,
    totalWorkers: workers.length,
    totalOrders: state.orders.length,
    activeOrders: activeOrders.length,
    completedOrders: completedOrders.length,
    revenue: revenuePaise / 100,
    commission: commissionPaise / 100,
    workerPayout: payoutPaise / 100,
    aov: aov / 100,
    completionRate: completionRate.toFixed(1),
    cancellationRate: cancellationRate.toFixed(1),
    commissionMargin: commissionMargin.toFixed(1),
    payoutRatio: payoutRatio.toFixed(1),
    volatility: {
       mean: meanDaily.toFixed(2),
       stdDev: stdDevDaily.toFixed(2),
       cv: cvDaily.toFixed(2),
       ma7: movingAverage7Day
    }
  };
};
