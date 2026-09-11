import { useAuth } from '../../contexts/AuthContext';

export default function Profile() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto' }}>
      <h1 style={{ marginBottom: '24px' }}>My Profile</h1>
      
      <div className="form-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label className="text-muted" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Name</label>
          <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{user.name || 'Not provided'}</div>
        </div>
        
        <div>
          <label className="text-muted" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Email</label>
          <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{user.email || 'Not provided'}</div>
        </div>
        
        <div>
          <label className="text-muted" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Mobile Number</label>
          <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{user.phone || 'Not provided'}</div>
        </div>

        <div>
          <label className="text-muted" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Registered Address</label>
          <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>{user.address || 'Not provided'}</div>
        </div>
        
        <div>
          <label className="text-muted" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Account Type</label>
          <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>Customer</div>
        </div>
        
        <div>
          <label className="text-muted" style={{ display: 'block', fontSize: '0.85rem', marginBottom: '4px' }}>Account Created</label>
          <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>
            {user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not provided'}
          </div>
        </div>
      </div>
    </div>
  );
}
