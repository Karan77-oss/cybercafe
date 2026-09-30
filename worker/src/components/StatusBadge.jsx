export default function StatusBadge({ status }) {
  const s = (status || '').toLowerCase();
  let colorClass = 'pending';
  
  if (['active', 'completed', 'successful', 'paid'].includes(s)) colorClass = 'active';
  else if (['blocked', 'cancelled', 'failed'].includes(s)) colorClass = 'blocked';
  else if (s === 'paused') colorClass = 'paused';
  else if (['deleted', 'deactivated'].includes(s)) colorClass = 'deleted';
  else if (s === 'in progress') colorClass = 'in-progress';
  else if (['pending', 'processing'].includes(s)) colorClass = 'pending';

  return <span className={`status-badge ${colorClass}`}>{status}</span>;
}