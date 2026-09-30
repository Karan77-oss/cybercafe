import React from 'react';
import { Percent, Wallet, Calendar } from 'lucide-react';
import StatCard from '../components/StatCard';

export default function Commission() {
  return (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1>Commission</h1>
          <p className="subtitle">View platform commission analytics and settings.</p>
        </div>
      </div>
      
      <div className="stats-grid">
        <StatCard title="Total Commission" value="₹58,800" icon={Percent} color="purple" />
        <StatCard title="This Month" value="₹12,450" icon={Calendar} color="green" />
        <StatCard title="This Week" value="₹2,850" icon={Calendar} color="orange" />
        <StatCard title="Pending" value="₹3,120" icon={Wallet} color="red" isAlert={true} />
      </div>
      <div className="data-table-container">
        <p>Commission settings and chart will be displayed here.</p>
      </div>
    </div>
  );
}