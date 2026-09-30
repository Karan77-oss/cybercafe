import { Link } from 'react-router-dom';
import { 
  FileText, 
  Upload, 
  UserCheck, 
  CreditCard, 
  Clock, 
  Video, 
  DownloadCloud, 
  ShieldCheck, 
  ArrowRight,
  Lock,
  Zap
} from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Choose Your Service',
      description: 'Select from over 16+ official service categories including PAN cards, voter IDs, scholarship forms, exam admissions, ticket bookings, and certificates.',
      icon: <FileText size={24} color="var(--brand-blue)" />
    },
    {
      number: '02',
      title: 'Fill Details & Upload Documents',
      description: 'Enter the applicant information with tailored form fields and upload your required government IDs or photos securely. Sensitive files are encrypted in storage.',
      icon: <Upload size={24} color="var(--brand-blue)" />
    },
    {
      number: '03',
      title: 'Select Verified Worker',
      description: 'Let the platform automatically assign the quickest available operator, or select your preferred verified cyber cafe professional based on ratings and completed jobs.',
      icon: <UserCheck size={24} color="var(--brand-blue)" />
    },
    {
      number: '04',
      title: 'Secure Online Payment',
      description: 'Pay instantly via UPI (GPay, PhonePe, Paytm), Debit/Credit Card, or your Platform Wallet. Funds are held in escrow until verification is complete.',
      icon: <CreditCard size={24} color="var(--brand-blue)" />
    },
    {
      number: '05',
      title: '24-Hour SLA Guarantee',
      description: 'Every application is backed by a strict 24-hour expiry window. Your assigned worker acts promptly, keeping you updated with real-time status notifications.',
      icon: <Clock size={24} color="var(--brand-blue)" />
    },
    {
      number: '06',
      title: 'Live Verification & OTP Support',
      description: 'If your application requires instant OTP validation or screen sharing, book an online video/audio slot directly with your worker in the tracking workspace.',
      icon: <Video size={24} color="var(--brand-blue)" />
    },
    {
      number: '07',
      title: 'Download Acknowledgement',
      description: 'Once submitted, download your official government acknowledgement receipts, filled PDF forms, and tracking reference numbers instantly.',
      icon: <DownloadCloud size={24} color="var(--brand-blue)" />
    },
    {
      number: '08',
      title: 'Automated Document Purge',
      description: 'Your privacy is paramount. Per the platform data retention policy, sensitive working files and documents are automatically purged after service completion.',
      icon: <ShieldCheck size={24} color="var(--brand-blue)" />
    }
  ];

  const benefits = [
    {
      icon: <Clock size={28} color="var(--brand-blue)" />,
      title: 'Guaranteed 24-Hour Processing',
      description: 'No endless queues. All pending orders are monitored with a live countdown clock to ensure swift turnaround.'
    },
    {
      icon: <ShieldCheck size={28} color="var(--brand-blue)" />,
      title: '100% Verified Cyber Operators',
      description: 'All operators undergo identity checks and police verification before processing citizen services.'
    },
    {
      icon: <Lock size={28} color="var(--brand-blue)" />,
      title: 'Privacy & Automatic File Purge',
      description: 'Your personal records are never shared or sold. Files are purged from the worker workspace once done.'
    },
    {
      icon: <Zap size={28} color="var(--brand-blue)" />,
      title: 'Interactive Live Assistance',
      description: 'Connect over secured live audio/video slots to share OTPs or inspect form drafts before final submission.'
    }
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Hero Header */}
      <div style={{ textAlign: 'center', marginBottom: '50px', padding: '30px 20px' }}>
        <span style={{ 
          display: 'inline-block', 
          padding: '6px 16px', 
          borderRadius: '20px', 
          background: 'rgba(83, 100, 249, 0.1)', 
          color: 'var(--brand-blue)', 
          fontSize: '0.85rem', 
          fontWeight: 600, 
          marginBottom: '16px' 
        }}>
          Simple • Fast • Secure
        </span>
        <h1 style={{ fontSize: '2.4rem', marginBottom: '16px' }}>How Cyber Cafe Marketplace Works</h1>
        <p className="text-muted" style={{ maxWidth: '650px', margin: '0 auto', fontSize: '1.05rem', lineHeight: 1.6 }}>
          Experience hassle-free online applications, government services, and document processing from the comfort of your home.
        </p>
      </div>

      {/* 8-Step Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '24px', 
        marginBottom: '60px' 
      }}>
        {steps.map((step) => (
          <div 
            key={step.number} 
            className="form-card" 
            style={{ 
              position: 'relative', 
              padding: '24px', 
              borderRadius: '16px', 
              margin: 0, 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ 
                  width: '46px', 
                  height: '46px', 
                  borderRadius: '12px', 
                  background: 'rgba(83, 100, 249, 0.08)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  {step.icon}
                </div>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--border-color, #e2e8f0)' }}>
                  {step.number}
                </span>
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '10px' }}>{step.title}</h3>
              <p className="text-muted" style={{ fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Platform Pillars */}
      <div style={{ 
        background: 'white', 
        borderRadius: '20px', 
        padding: '40px', 
        boxShadow: 'var(--shadow-md)', 
        border: '1px solid var(--border-color)', 
        marginBottom: '50px' 
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '36px', fontSize: '1.75rem' }}>Our Trust & Safety Commitment</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '30px' }}>
          {benefits.map((b, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ 
                width: '56px', 
                height: '56px', 
                borderRadius: '50%', 
                background: 'rgba(83, 100, 249, 0.1)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 16px' 
              }}>
                {b.icon}
              </div>
              <h4 style={{ fontSize: '1rem', marginBottom: '8px' }}>{b.title}</h4>
              <p className="text-muted" style={{ fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
                {b.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Call to Action */}
      <div style={{ 
        textAlign: 'center', 
        padding: '48px 24px', 
        background: 'linear-gradient(135deg, var(--brand-blue) 0%, #3b4cca 100%)', 
        color: 'white', 
        borderRadius: '20px' 
      }}>
        <h2 style={{ color: 'white', marginBottom: '12px', fontSize: '1.8rem' }}>Ready to get your service done?</h2>
        <p style={{ opacity: 0.9, marginBottom: '28px', maxWidth: '500px', margin: '0 auto 28px' }}>
          Explore our wide range of services or check the progress of your ongoing applications.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Link to="/services" className="btn" style={{ background: 'white', color: 'var(--brand-blue)', fontWeight: 600, padding: '12px 24px' }}>
            Browse Services <ArrowRight size={18} style={{ marginLeft: '6px' }} />
          </Link>
          <Link to="/orders" className="btn" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '12px 24px' }}>
            Track My Orders
          </Link>
        </div>
      </div>
    </div>
  );
}
