export default function StatCard({ title, value, icon: Icon, color, trend, trendValue, isAlert }) {
  const isPositive = trend === 'up';
  return (
    <div className={`stat-card ${isAlert ? 'alert-card' : ''}`}>
      <div className={`stat-icon ${color}`}>
        <Icon size={24} />
      </div>
      <div className="stat-info">
        <h3>{title}</h3>
        <div className="value">{value}</div>
        {trend && (
          <div className={`trend ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? '↑' : '↓'} {trendValue}
          </div>
        )}
      </div>
    </div>
  );
}