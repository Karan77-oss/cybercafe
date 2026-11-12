import BrandLogo from '../BrandLogo';

export default function Footer() {
  return (
    <footer style={{ background: 'white', padding: '32px 40px', marginTop: 'auto', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <BrandLogo size="sm" variant="orange" />
      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        © 2026 Cyber Cafe Digital Marketplace. All rights reserved.
      </p>
    </footer>
  );
}
