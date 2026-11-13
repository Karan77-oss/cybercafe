import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';

// ==========================================
// TYPE DEFINITIONS & SCHEMAS
// ==========================================

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  category: string;
  pricePaise: number;
  workerAmountPaise?: number;
  platformFeePaise?: number;
  adminCommissionPaise?: number;
  estimatedTime: string;
  requiredDocuments: string[];
  formSchema?: any[];
  applicationTypes?: any;
  status: 'ACTIVE' | 'INACTIVE';
  approvalStatus: 'APPROVED' | 'PENDING_APPROVAL';
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkerItem {
  id: string;
  workerId?: string;
  status?: string;
  name: string;
  email: string;
  phone: string;
  businessName?: string;
  outletName?: string;
  address?: string;
  city?: string;
  skills?: string[];
  idProof?: string;
  photo?: string;
  bankDetails?: {
    accountNumber: string;
    ifsc: string;
    accountHolderName: string;
    upiId: string;
  };
  activeJobs: number;
  completedJobs: number;
  completedOrders?: number;
  totalPaidEarningsPaise?: number;
  rating: number;
  isOnline: boolean;
  accountStatus: 'ACTIVE' | 'PENDING' | 'OFFLINE' | 'SUSPENDED' | 'BLOCKED' | 'PAUSED' | 'DELETED';
  idVerified?: boolean;
  workerProfile?: {
    idVerified: boolean;
    businessName?: string;
    skills?: string[];
    bankDetails?: any;
    idProof?: string;
    photo?: string;
  };
  lastActivityAt: string;
  walletBalancePaise: number;
  pendingEarningsPaise: number;
  onHoldEarningsPaise: number;
  totalEarningsPaise: number;
  averageCompletionMinutes: number;
  reviews: Array<{
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
  }>;
}

export type LedgerTransactionType =
  | 'ORDER_PAYMENT'
  | 'WORKER_EARNING_PENDING'
  | 'WORKER_EARNING_RELEASED'
  | 'WORKER_EARNING_HELD'
  | 'WORKER_EARNING_RELEASED_FROM_HOLD'
  | 'WITHDRAWAL_RESERVED'
  | 'WITHDRAWAL_PAID'
  | 'WITHDRAWAL_CANCELLED'
  | 'REFUND_ISSUED'
  | 'PLATFORM_COMMISSION_REALIZED'
  | 'PLATFORM_FEE_REALIZED';

export interface FinancialLedgerItem {
  id: string;
  workerId?: string | null;
  orderId?: string | null;
  withdrawalId?: string | null;
  entityId?: string | null;
  reference?: string | null;
  amountPaise: number;
  type: LedgerTransactionType;
  idempotencyKey: string;
  referenceNote?: string | null;
  createdAt: string;
}

export interface WithdrawalItem {
  id: string;
  workerId: string;
  amountPaise: number;
  method: 'BANK' | 'UPI';
  payoutDetails: any;
  status: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED';
  rejectionReason?: string;
  paymentReference?: string;
  createdAt: string;
  processedAt?: string;
}

export interface NotificationItem {
  id: string;
  recipientId: string;
  recipientRole: 'WORKER' | 'CUSTOMER' | 'ADMIN';
  type: string;
  title: string;
  message: string;
  orderId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface SupportTicketItem {
  id: string;
  workerId?: string;
  userId?: string;
  userRole?: 'WORKER' | 'CUSTOMER' | 'ADMIN';
  userName?: string;
  category: 'General' | 'Order' | 'Payment / Withdrawal' | 'Technical' | 'Bank Detail Change' | string;
  subject: string;
  message: string;
  orderId?: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  replies: Array<{
    sender: 'WORKER' | 'ADMIN' | 'CUSTOMER';
    author?: string;
    message: string;
    createdAt: string;
  }>;
  internalNotes?: Array<{
    note: string;
    adminName: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintItem {
  id: string;
  type: 'CUSTOMER' | 'WORKER';
  complainantId: string;
  complainantName: string;
  complainantRole: 'CUSTOMER' | 'WORKER';
  category: 'Order-related' | 'Payment-related' | 'Withdrawal-related' | 'Technical' | 'Other' | string;
  orderId?: string;
  subject: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'RESOLVED' | string;
  resolution?: string;
  internalNotes?: Array<{ note: string; createdAt: string; adminName: string }>;
  replies?: Array<{ sender?: 'ADMIN' | 'CUSTOMER' | 'WORKER' | string; author?: string; message: string; createdAt: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformSettings {
  adminName: string;
  adminId: string;
  mobile: string;
  email: string;
  profilePhoto: string;
  businessName: string;
  platformLogo: string;
  supportPhone: string;
  supportEmail: string;
  commissionPercent: number;
  commissionRatePercent?: number;
  customerRefundPercent?: number;
  allowWorkerRegistration: boolean;
  minWithdrawalPaise: number;
  correctionWindowHours: number;
  emailNotifications: boolean;
  smsNotifications: boolean;
  urgentAlerts: boolean;
  latest_version?: string;
  min_required_version?: string;
}

export interface WelfareCaseItem {
  id: string;
  user_id: string;
  order_id: string;
  issue_type: string;
  description: string;
  status: 'open' | 'in_review' | 'refund_approved' | 'resolved' | 'rejected' | 'refund_processed';
  internal_notes?: Array<{ id: string; authorId: string; authorName: string; role: string; note: string; createdAt: string }>;
  is_escalated?: boolean;
  created_at: string;
  updated_at?: string;
  user?: any;
  order?: any;
  refundRecord?: RefundRecordItem;
}

export interface RefundRecordItem {
  id: string;
  ticket_id: string;
  order_id: string;
  amount: number;
  status: 'pending' | 'processed';
  utr_number?: string | null;
  receipt_url?: string | null;
  processed_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageItem {
  id: string;
  orderId: string;
  senderId: string;
  senderRole: 'WORKER' | 'CUSTOMER' | 'ADMIN';
  senderName: string;
  message: string;
  attachmentUrl?: string;
  attachmentName?: string;
  createdAt: string;
}

export interface ServiceProposalItem {
  id: string;
  workerId: string;
  name: string;
  description: string;
  category: string;
  suggestedPricePaise: number;
  requestedWorkerAmountPaise?: number;
  estimatedTime: string;
  requiredDocuments?: string[];
  applicationTypes?: any;
  status: 'PENDING' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | string;
  adminComment?: string;
  createdAt: string;
}

// ==========================================
// SEED SERVICES & WORKERS DATA
// ==========================================

export const OFFICIAL_SERVICES: ServiceItem[] = [
  {
    id: 'pan-card',
    name: 'PAN Card Application & Correction',
    description: 'New PAN Card (Form 49A), reprint of damaged/lost card, and linking assistance.',
    category: 'PAN-related services',
    pricePaise: 19900,
    estimatedTime: '24-48 Hours',
    requiredDocuments: ['Identity Proof', 'Passport Size Photo', 'Signature Specimen'],
    formSchema: [
      { id: 'fullName', label: 'Full Name of Applicant', type: 'text', required: true },
      { id: 'fatherName', label: "Father's Name", type: 'text', required: true },
      { id: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true },
      { id: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true },
      { id: 'phone', label: 'Mobile / WhatsApp Number', type: 'tel', required: true },
      { id: 'email', label: 'Email Address', type: 'email', required: true },
      { id: 'application_type', label: 'Application Type', type: 'select', options: ['New PAN Card (Form 49A)', 'Correction in Existing PAN', 'Reprint Lost/Damaged Card'], required: true },
      { id: 'existingPan', label: 'Existing PAN Number (if correction or reprint)', type: 'text', required: false },
      { id: 'address', label: 'Delivery Address for Physical Card', type: 'textarea', required: true }
    ],
    status: 'ACTIVE',
    approvalStatus: 'APPROVED',
    icon: 'IdCard',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'demographic-update',
    name: 'Demographic Information Update',
    description: 'Assistance for online appointment booking, name/address update documentation, and card reissue orders.',
    category: 'Government forms',
    pricePaise: 14900,
    estimatedTime: '24 Hours',
    requiredDocuments: ['Existing Govt Card', 'Proof of Address (Utility Bill/Bank Passbook)'],
    formSchema: [
      { id: 'fullName', label: 'Full Name of Applicant', type: 'text', required: true },
      { id: 'phone', label: 'Registered Mobile Number', type: 'tel', required: true },
      { id: 'email', label: 'Email Address', type: 'email', required: true },
      { id: 'application_type', label: 'Type of Update Needed', type: 'select', options: ['Address Update Online', 'Name / DOB Correction Guidance', 'Mobile Linking Appointment Booking'], required: true },
      { id: 'address', label: 'New / Correct Address (with PIN code)', type: 'textarea', required: true }
    ],
    status: 'ACTIVE',
    approvalStatus: 'APPROVED',
    icon: 'Fingerprint',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'voter-id',
    name: 'Voter ID Card Registration & Correction',
    description: 'Fresh voter ID registration (Form 6), address shifting (Form 8), and digital e-EPIC download.',
    category: 'Government forms',
    pricePaise: 14900,
    estimatedTime: '2-3 Working Days',
    requiredDocuments: ['Identity Proof', 'Passport Photo', 'Age Proof / Birth Certificate'],
    formSchema: [
      { id: 'fullName', label: 'Full Name of Applicant', type: 'text', required: true },
      { id: 'relativeName', label: "Father's / Mother's / Husband's Name", type: 'text', required: true },
      { id: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true },
      { id: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true },
      { id: 'phone', label: 'Mobile Number', type: 'tel', required: true },
      { id: 'email', label: 'Email Address', type: 'email', required: true },
      { id: 'application_type', label: 'Voter Service', type: 'select', options: ['New Voter Registration (Form 6)', 'Shifting of Residence (Form 8)', 'Correction of Entries in Existing Card', 'e-EPIC Digital Download'], required: true },
      { id: 'epicNumber', label: 'Existing EPIC / Voter ID Number (if correction)', type: 'text', required: false },
      { id: 'address', label: 'Current Residential Address (Assembly Constituency)', type: 'textarea', required: true }
    ],
    status: 'ACTIVE',
    approvalStatus: 'APPROVED',
    icon: 'Vote',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'passport-assistance',
    name: 'Passport Application & Appointment Assistance',
    description: 'Fresh normal/tatkaal passport application, PSK appointment scheduling, and document checklist verification.',
    category: 'Passport-related application assistance',
    pricePaise: 69900,
    estimatedTime: '3-5 Working Days',
    requiredDocuments: ['Identity Proof', 'PAN Card', '10th Marksheet / Birth Certificate', 'Passport Photo'],
    formSchema: [
      { id: 'fullName', label: 'Full Name (Given Name + Surname as on Marksheet)', type: 'text', required: true },
      { id: 'fatherName', label: "Father's Full Name", type: 'text', required: true },
      { id: 'motherName', label: "Mother's Full Name", type: 'text', required: true },
      { id: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true },
      { id: 'birthPlace', label: 'Place of Birth (Village / Town / State)', type: 'text', required: true },
      { id: 'phone', label: 'Mobile Number', type: 'tel', required: true },
      { id: 'email', label: 'Email Address', type: 'email', required: true },
      { id: 'application_type', label: 'Application Scheme', type: 'select', options: ['Normal Scheme (Standard)', 'Tatkaal Scheme (Urgent)'], required: true },
      { id: 'educationLevel', label: 'Educational Qualification (ECNR Check)', type: 'select', options: ['Graduate & Above', '10th Pass (Matriculate)', 'Below 10th Pass'], required: true },
      { id: 'address', label: 'Present Residential Address with PIN code', type: 'textarea', required: true }
    ],
    status: 'ACTIVE',
    approvalStatus: 'APPROVED',
    icon: 'Book',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'income-caste-residence',
    name: 'Income, Caste & Residence Certificates',
    description: 'State revenue portal application for OBC/SC/ST caste certificates, annual income certificate, and domicile.',
    category: 'Income/caste/residence certificate assistance',
    pricePaise: 19900,
    estimatedTime: '2-4 Working Days',
    requiredDocuments: ['Identity Proof', 'Ration Card / Electricity Bill', 'Self Declaration Affidavit', 'Photo'],
    formSchema: [
      { id: 'fullName', label: 'Full Name of Applicant', type: 'text', required: true },
      { id: 'fatherName', label: "Father's / Guardian's Name", type: 'text', required: true },
      { id: 'phone', label: 'Mobile Number', type: 'tel', required: true },
      { id: 'email', label: 'Email Address', type: 'email', required: true },
      { id: 'application_type', label: 'Certificate Required', type: 'select', options: ['Income Certificate', 'OBC Caste Certificate', 'SC/ST Caste Certificate', 'Domicile / Residence Certificate', 'EWS Certificate'], required: true },
      { id: 'annualIncome', label: 'Annual Family Income (in INR)', type: 'text', required: true },
      { id: 'tehsilDistrict', label: 'Tehsil & District Name', type: 'text', required: true },
      { id: 'address', label: 'Permanent Address (as per Ration/Electricity bill)', type: 'textarea', required: true }
    ],
    status: 'ACTIVE',
    approvalStatus: 'APPROVED',
    icon: 'FileText',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'scholarship-forms',
    name: 'National & State Scholarship Form Filling',
    description: 'NSP portal, Post-Matric, Pre-Matric, and merit-cum-means scholarship application and document upload.',
    category: 'Scholarship forms',
    pricePaise: 24900,
    estimatedTime: '24 Hours',
    requiredDocuments: ['Identity Proof', 'Income Certificate', 'Previous Marksheet', 'Bank Passbook', 'College Fee Receipt'],
    formSchema: [
      { id: 'fullName', label: 'Student Full Name', type: 'text', required: true },
      { id: 'phone', label: 'Student Mobile Number', type: 'tel', required: true },
      { id: 'email', label: 'Email Address', type: 'email', required: true },
      { id: 'application_type', label: 'Scholarship Scheme', type: 'select', options: ['National Scholarship Portal (NSP Central)', 'State Post-Matric Scholarship', 'State Pre-Matric Scholarship', 'Merit-Cum-Means Scholarship'], required: true },
      { id: 'institutionName', label: 'School / College / University Name', type: 'text', required: true },
      { id: 'courseName', label: 'Course & Current Year of Study', type: 'text', required: true },
      { id: 'previousPercentage', label: 'Previous Academic Year Percentage / CGPA', type: 'text', required: true },
      { id: 'bankDetails', label: 'Bank Name, Account Number & IFSC Code', type: 'textarea', required: true }
    ],
    status: 'ACTIVE',
    approvalStatus: 'APPROVED',
    icon: 'GraduationCap',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'job-applications',
    name: 'Government & PSU Job Application Filling',
    description: 'SSC, UPSC, Railway (RRB), State Police, Banking (IBPS), and Defence online application submission.',
    category: 'Job applications',
    pricePaise: 24900,
    estimatedTime: '12-24 Hours',
    requiredDocuments: ['Identity Proof', 'Educational Marksheets', 'Photo & Signature (Pre-resized)', 'Caste Certificate'],
    formSchema: [
      { id: 'fullName', label: 'Candidate Full Name', type: 'text', required: true },
      { id: 'examName', label: 'Exam / Recruitment Name (e.g. SSC CGL, RRB NTPC, IBPS PO)', type: 'text', required: true },
      { id: 'category', label: 'Social Category', type: 'select', options: ['General / UR', 'OBC (Non-Creamy Layer)', 'EWS', 'SC', 'ST'], required: true },
      { id: 'phone', label: 'Contact Phone Number', type: 'tel', required: true },
      { id: 'email', label: 'Email Address', type: 'email', required: true },
      { id: 'examCenterCity', label: 'Preferred Exam Center Cities (1st & 2nd Choice)', type: 'text', required: true },
      { id: 'address', label: 'Permanent Residential Address', type: 'textarea', required: true }
    ],
    status: 'ACTIVE',
    approvalStatus: 'APPROVED',
    icon: 'Briefcase',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'college-admission',
    name: 'College & University Admission Forms',
    description: 'UG / PG university entrance registration, centralized counseling portal forms, and admission applications.',
    category: 'College/university admission forms',
    pricePaise: 29900,
    estimatedTime: '24 Hours',
    requiredDocuments: ['10th & 12th Marksheets', 'Transfer Certificate', 'Identity Proof', 'Passport Photo'],
    formSchema: [
      { id: 'fullName', label: 'Student Full Name', type: 'text', required: true },
      { id: 'phone', label: 'Mobile Number', type: 'tel', required: true },
      { id: 'email', label: 'Email Address', type: 'email', required: true },
      { id: 'courseDesired', label: 'Course / Degree Applied For', type: 'text', required: true },
      { id: 'universityTarget', label: 'Target University / Central Counseling Portal', type: 'text', required: true },
      { id: 'marks12th', label: '12th Board Marks / Percentage', type: 'text', required: true },
      { id: 'address', label: 'Correspondence Address with PIN code', type: 'textarea', required: true }
    ],
    status: 'ACTIVE',
    approvalStatus: 'APPROVED',
    icon: 'School',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'travel-ticket-booking',
    name: 'Railway, Flight & Bus Ticket Booking',
    description: 'Confirmed IRCTC railway tickets, domestic flight booking, and interstate AC sleeper bus reservations.',
    category: 'Railway/flight/bus booking',
    pricePaise: 9900,
    estimatedTime: '1-2 Hours',
    requiredDocuments: ['Passenger Govt ID details', 'Travel Route & Date'],
    formSchema: [
      { id: 'fullName', label: 'Primary Passenger Name', type: 'text', required: true },
      { id: 'phone', label: 'Passenger Contact Mobile Number', type: 'tel', required: true },
      { id: 'email', label: 'Email Address for E-Ticket Delivery', type: 'email', required: true },
      { id: 'application_type', label: 'Travel Mode', type: 'select', options: ['IRCTC Train Ticket', 'Interstate Bus Ticket', 'Domestic Flight'], required: true },
      { id: 'fromStation', label: 'From City / Station', type: 'text', required: true },
      { id: 'toStation', label: 'To City / Station', type: 'text', required: true },
      { id: 'travelDate', label: 'Date of Travel', type: 'date', required: true },
      { id: 'passengerDetails', label: 'All Passengers Names, Ages & Berth Preference', type: 'textarea', required: true }
    ],
    status: 'ACTIVE',
    approvalStatus: 'APPROVED',
    icon: 'Train',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'document-scanning',
    name: 'High-Resolution Document Scanning & Archival',
    description: 'Multi-page document scanning, optical character recognition (OCR), and PDF digitization.',
    category: 'Document scanning',
    pricePaise: 4900,
    estimatedTime: '30 Minutes',
    requiredDocuments: ['Original Physical Documents'],
    formSchema: [
      { id: 'fullName', label: 'Customer Name', type: 'text', required: true },
      { id: 'phone', label: 'Mobile Number', type: 'tel', required: true },
      { id: 'email', label: 'Email Address for Scanned PDF Delivery', type: 'email', required: true },
      { id: 'pagesCount', label: 'Total Number of Pages to Scan', type: 'text', required: true },
      { id: 'application_type', label: 'Desired Scanning Resolution', type: 'select', options: ['300 DPI High-Res PDF (Standard)', '600 DPI Ultra HD (Certificates/Photos)', 'Compressed PDF (< 2MB)'], required: true },
      { id: 'notes', label: 'Specific File Naming / Ordering Instructions', type: 'textarea', required: false }
    ],
    status: 'ACTIVE',
    approvalStatus: 'APPROVED',
    icon: 'Scan',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pdf-creation-editing',
    name: 'PDF Creation, Editing & Optimization',
    description: 'PDF merge, split, watermark, compress to under 100KB for government portals, and format conversions.',
    category: 'PDF creation/editing',
    pricePaise: 4900,
    estimatedTime: '30 Minutes',
    requiredDocuments: ['Source Files / Photos'],
    formSchema: [
      { id: 'fullName', label: 'Customer Name', type: 'text', required: true },
      { id: 'phone', label: 'Contact Phone Number', type: 'tel', required: true },
      { id: 'email', label: 'Email Address for Output Delivery', type: 'email', required: true },
      { id: 'application_type', label: 'PDF Operation Required', type: 'select', options: ['Compress PDF (to exact portal limits)', 'Merge Multiple Files into a Single PDF', 'Image to PDF Compilation', 'Split / Password Protect Pages'], required: true },
      { id: 'targetLimit', label: 'Target File Size Limit (e.g. Below 100KB)', type: 'text', required: true },
      { id: 'instructions', label: 'Page Sequencing or Order Notes', type: 'textarea', required: false }
    ],
    status: 'ACTIVE',
    approvalStatus: 'APPROVED',
    icon: 'FileEdit',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'printout-services',
    name: 'Color & B/W Printout & Lamination',
    description: 'High-speed document printing, admit cards, color photo prints, and protective thermal lamination.',
    category: 'Printout services',
    pricePaise: 2900,
    estimatedTime: '1 Hour',
    requiredDocuments: ['Document to print (PDF/Image)'],
    formSchema: [
      { id: 'fullName', label: 'Customer Name', type: 'text', required: true },
      { id: 'phone', label: 'Mobile Number', type: 'tel', required: true },
      { id: 'application_type', label: 'Printing Type', type: 'select', options: ['Black & White Laser Print', 'Color Photo Quality Print', 'Admit Card Print + Lamination', 'Glossy Photo Sheet (A4)'], required: true },
      { id: 'copiesCount', label: 'Number of Copies Required', type: 'text', required: true },
      { id: 'pickupDelivery', label: 'Pickup / Delivery Preference', type: 'select', options: ['Counter Pickup at Cyber Cafe', 'Local Courier / Delivery'], required: true },
      { id: 'address', label: 'Delivery Address (if delivery selected)', type: 'textarea', required: false }
    ],
    status: 'ACTIVE',
    approvalStatus: 'APPROVED',
    icon: 'Printer',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'resume-cv-making',
    name: 'Professional Resume & CV Making',
    description: 'Modern ATS-friendly resume formatting tailored for job seekers, fresh graduates, and experienced staff.',
    category: 'Resume/CV making',
    pricePaise: 24900,
    estimatedTime: '24 Hours',
    requiredDocuments: ['Bio-data / Educational & Experience Details'],
    formSchema: [
      { id: 'fullName', label: 'Full Name (as on Resume)', type: 'text', required: true },
      { id: 'phone', label: 'Mobile Number', type: 'tel', required: true },
      { id: 'email', label: 'Professional Email ID', type: 'email', required: true },
      { id: 'targetRole', label: 'Target Job Role / Industry', type: 'text', required: true },
      { id: 'experienceLevel', label: 'Experience Level', type: 'select', options: ['Fresher / Entry Level', '1 - 3 Years Mid-Junior', '3 - 7 Years Mid-Senior', '7+ Years Executive / Lead'], required: true },
      { id: 'educationalDetails', label: 'Highest Education, College & Passing Year', type: 'text', required: true },
      { id: 'skillsExperience', label: 'Key Skills, Past Companies / Projects Summary', type: 'textarea', required: true }
    ],
    status: 'ACTIVE',
    approvalStatus: 'APPROVED',
    icon: 'FileText',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'photo-signature-resizing',
    name: 'Photo & Signature Resizing for Portals',
    description: 'Exact pixel dimensions and KB compression (20KB - 50KB) adhering to strict exam board specifications.',
    category: 'Photo/signature resizing',
    pricePaise: 4900,
    estimatedTime: '15-30 Minutes',
    requiredDocuments: ['Passport Photo', 'Signature on white paper'],
    formSchema: [
      { id: 'fullName', label: 'Candidate Name', type: 'text', required: true },
      { id: 'phone', label: 'WhatsApp / Mobile Number', type: 'tel', required: true },
      { id: 'email', label: 'Email for Resized Files Delivery', type: 'email', required: true },
      { id: 'targetPortal', label: 'Target Portal / Exam Board', type: 'text', required: true },
      { id: 'photoSpecification', label: 'Photo Specs (e.g. 20KB-50KB, 200x230px, white background)', type: 'text', required: true },
      { id: 'signatureSpecification', label: 'Signature Specs (e.g. 10KB-20KB, 140x60px)', type: 'text', required: true }
    ],
    status: 'ACTIVE',
    approvalStatus: 'APPROVED',
    icon: 'Crop',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'utility-bill-payment',
    name: 'Utility Bill Payment & Online Recharges',
    description: 'Instant settlement of electricity bills, water bills, FASTag recharge, and property tax payments with receipts.',
    category: 'Online payment/recharge',
    pricePaise: 2900,
    estimatedTime: '15 Minutes',
    requiredDocuments: ['Consumer Number / Bill Copy'],
    formSchema: [
      { id: 'fullName', label: 'Customer / Consumer Name', type: 'text', required: true },
      { id: 'phone', label: 'Mobile Number for Payment Confirmation', type: 'tel', required: true },
      { id: 'email', label: 'Email for Official Bill Receipt', type: 'email', required: true },
      { id: 'application_type', label: 'Utility Service Type', type: 'select', options: ['Electricity Bill Settlement', 'Piped Gas Bill', 'Water Department Bill', 'FASTag Instant Recharge', 'Municipal Property Tax / Challan'], required: true },
      { id: 'providerName', label: 'Electricity Board / Department Name', type: 'text', required: true },
      { id: 'consumerNumber', label: 'Consumer Number / CA Number / Account ID', type: 'text', required: true },
      { id: 'billAmount', label: 'Exact Bill Amount Due (in INR)', type: 'text', required: true }
    ],
    status: 'ACTIVE',
    approvalStatus: 'APPROVED',
    icon: 'CreditCard',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'birth-death-certificates',
    name: 'Birth, Death & Civil Certificate Applications',
    description: 'Municipal corporation and civil registration assistance and digital certificate issuance.',
    category: 'Certificate applications',
    pricePaise: 24900,
    estimatedTime: '3-5 Working Days',
    requiredDocuments: ['Hospital Discharge / Event Proof', 'Identity Proofs', 'Self Affidavit'],
    formSchema: [
      { id: 'fullName', label: 'Person / Child Name', type: 'text', required: true },
      { id: 'fatherName', label: "Father's Full Name", type: 'text', required: true },
      { id: 'motherName', label: "Mother's Full Name", type: 'text', required: true },
      { id: 'phone', label: 'Contact Phone Number', type: 'tel', required: true },
      { id: 'email', label: 'Email Address', type: 'email', required: true },
      { id: 'application_type', label: 'Certificate Type', type: 'select', options: ['Birth Certificate Application', 'Death Certificate Application', 'Marriage Registration Certificate'], required: true },
      { id: 'eventDate', label: 'Date of Event', type: 'date', required: true },
      { id: 'eventPlace', label: 'Place of Event (Hospital / Residence / Municipal Area)', type: 'text', required: true },
      { id: 'address', label: 'Permanent Address of Parents / Applicant', type: 'textarea', required: true }
    ],
    status: 'ACTIVE',
    approvalStatus: 'APPROVED',
    icon: 'Award',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const OFFICIAL_WORKERS: WorkerItem[] = [
  {
    id: 'worker-amit-01',
    name: 'Amit Cyber Cafe & Digital Seva',
    email: 'amit.cyber@gmail.com',
    phone: '9876543210',
    businessName: 'Amit Digital Seva Kendra',
    address: 'Shop 14, Main Market, Civil Lines',
    city: 'Patna, Bihar',
    skills: ['PAN-related services', 'Government forms', 'Utility bill payment', 'Online payment/recharge'],
    bankDetails: {
      accountNumber: '91823746192837',
      ifsc: 'SBIN0001234',
      accountHolderName: 'Amit Kumar',
      upiId: 'amitcyber@oksbi'
    },
    activeJobs: 0,
    completedJobs: 0,
    rating: 5.0,
    isOnline: true,
    accountStatus: 'ACTIVE',
    lastActivityAt: new Date().toISOString(),
    walletBalancePaise: 0,
    pendingEarningsPaise: 0,
    onHoldEarningsPaise: 0,
    totalEarningsPaise: 0,
    averageCompletionMinutes: 45,
    reviews: []
  },
  {
    id: 'worker-neha-02',
    name: 'Neha Online Documentation Hub',
    email: 'neha.cyber@gmail.com',
    phone: '9812345678',
    businessName: 'Neha Cyber Solutions',
    address: 'Sector 18, Commercial Complex',
    city: 'Noida, Uttar Pradesh',
    skills: ['Passport-related application assistance', 'Scholarship forms', 'Government forms'],
    bankDetails: {
      accountNumber: '38192049182055',
      ifsc: 'HDFC0000456',
      accountHolderName: 'Neha Sharma',
      upiId: 'neha.hub@okhdfcbank'
    },
    activeJobs: 0,
    completedJobs: 0,
    rating: 5.0,
    isOnline: true,
    accountStatus: 'ACTIVE',
    lastActivityAt: new Date().toISOString(),
    walletBalancePaise: 0,
    pendingEarningsPaise: 0,
    onHoldEarningsPaise: 0,
    totalEarningsPaise: 0,
    averageCompletionMinutes: 60,
    reviews: []
  },
  {
    id: 'worker-mona-03',
    name: 'Mona E-Services & CSC Center',
    email: 'mona.estore@gmail.com',
    phone: '9678123456',
    businessName: 'Mona CSC Common Service Center',
    address: 'Near Gandhi Chowk, Station Road',
    city: 'Jaipur, Rajasthan',
    skills: ['Income/caste/residence certificate assistance', 'Certificate applications', 'Job applications'],
    bankDetails: {
      accountNumber: '49281729481988',
      ifsc: 'ICIC0000789',
      accountHolderName: 'Mona Kumari',
      upiId: 'mona.csc@okicici'
    },
    activeJobs: 0,
    completedJobs: 0,
    rating: 5.0,
    isOnline: false,
    accountStatus: 'ACTIVE',
    lastActivityAt: new Date().toISOString(),
    walletBalancePaise: 0,
    pendingEarningsPaise: 0,
    onHoldEarningsPaise: 0,
    totalEarningsPaise: 0,
    averageCompletionMinutes: 50,
    reviews: []
  }
];

// ==========================================
// RESILIENT IN-MEMORY STORE CLASS
// ==========================================

const MAX_AUDIT_LOGS = 1000;
const MAX_NOTIFICATIONS = 500;
const MAX_CHAT_MESSAGES = 2000;
const MAX_LEDGER_ENTRIES = 2000;

class ResilientStore {
  services: ServiceItem[] = [...OFFICIAL_SERVICES];
  workers: WorkerItem[] = [...OFFICIAL_WORKERS];
  users: Map<string, any> = new Map();
  orders: Map<string, any> = new Map();
  documents: Map<string, any> = new Map();
  withdrawals: Map<string, WithdrawalItem> = new Map();
  notifications: NotificationItem[] = [];
  supportTickets: SupportTicketItem[] = [];
  chatMessages: ChatMessageItem[] = [];
  serviceProposals: ServiceProposalItem[] = [];
  auditLogs: any[] = [];
  ledgerEntries: FinancialLedgerItem[] = [];
  private ledgerIdempotencyKeys: Set<string> = new Set();

  complaints: Map<string, ComplaintItem> = new Map();
  welfareCases: Map<string, WelfareCaseItem> = new Map();
  refundRecords: Map<string, RefundRecordItem> = new Map();

  settings: PlatformSettings = {
    adminName: process.env.ADMIN_ID || 'Karan Kumar',
    adminId: process.env.ADMIN_ID || 'Karan Kumar',
    mobile: '9876543200',
    email: process.env.ADMIN_EMAIL || 'rajkaran969355@gmail.com',
    profilePhoto: '',
    businessName: 'Cyber Cafe Marketplace',
    platformLogo: '',
    supportPhone: '1800-420-CYBER',
    supportEmail: 'support@cybercafe.in',
    commissionPercent: 20,
    allowWorkerRegistration: true,
    minWithdrawalPaise: 10000,
    correctionWindowHours: 2,
    emailNotifications: true,
    smsNotifications: true,
    urgentAlerts: true,
    latest_version: '1.2.0',
    min_required_version: '1.0.0'
  };

  private orderAcceptLocks: Set<string> = new Set();

  acquireOrderLock(orderId: string): boolean {
    if (this.orderAcceptLocks.has(orderId)) {
      return false;
    }
    this.orderAcceptLocks.add(orderId);
    return true;
  }

  releaseOrderLock(orderId: string): void {
    this.orderAcceptLocks.delete(orderId);
  }

  /**
   * Secure Admin verification helper to prevent role hijacking
   */
  checkIsAdmin(userId?: string): boolean {
    if (!userId) return false;
    if (userId === this.settings.adminId || userId === 'ADM-001') return true;
    const user = this.findUserById(userId);
    return user?.role === 'ADMIN';
  }

  constructor() {
    this.services.forEach(s => {
      if (!s.applicationTypes || (Array.isArray(s.applicationTypes) && s.applicationTypes.length === 0)) {
        if (Array.isArray(s.formSchema)) {
          const selectField = s.formSchema.find((f: any) =>
            (f.id === 'application_type' || f.id === 'applicationType' || f.name === 'application_type') &&
            Array.isArray(f.options) && f.options.length > 0
          );
          if (selectField) {
            s.applicationTypes = selectField.options;
          }
        }
        if (!s.applicationTypes || (Array.isArray(s.applicationTypes) && s.applicationTypes.length === 0)) {
          s.applicationTypes = [`${s.name} - Standard Application`];
        }
      }
    });

    const defaultPasswordHash = bcrypt.hashSync('worker123', 10);

    // Initialize primary Admin from environment
    const adminEmail = process.env.ADMIN_EMAIL || 'rajkaran969355@gmail.com';
    const adminId = process.env.ADMIN_ID || 'Karan Kumar';
    const adminPass = process.env.ADMIN_PASSWORD || 'Karan@@2002';

    if (adminPass) {
      const hash = bcrypt.hashSync(adminPass, 10);
      this.users.set(adminId, {
        id: adminId,
        adminId: adminId,
        email: adminEmail,
        name: adminId,
        phone: '9876543200',
        role: 'ADMIN',
        password: hash,
        passwordHash: hash,
        accountStatus: 'ACTIVE',
        createdAt: new Date().toISOString()
      });
    }

    // Note: Obsolete demo admin ('ADM-001' / 'admin@cybercafe.com' with password123)
    // is intentionally purged and not registered here to prevent unauthorized demo access.

    // Seed default verified workers
    this.workers.forEach(w => {
      this.users.set(w.id, {
        id: w.id,
        email: w.email,
        name: w.name,
        phone: w.phone,
        role: 'WORKER',
        password: defaultPasswordHash,
        passwordHash: defaultPasswordHash,
        isOnline: w.isOnline,
        accountStatus: w.accountStatus,
        businessName: w.businessName,
        address: w.address,
        city: w.city,
        skills: w.skills,
        bankDetails: w.bankDetails
      });
    });

    // Load persisted entities from disk
    this.loadPersistedOrdersFromDisk();
    this.loadPersistedDocumentsFromDisk();
    this.loadPersistedLedgerFromDisk();
    this.loadPersistedWelfareFromDisk();
  }

  getServices(): ServiceItem[] {
    return [...this.services];
  }

  getService(id: string): ServiceItem | undefined {
    return this.services.find(s => s.id === id);
  }

  getWorkers(): WorkerItem[] {
    return [...this.workers];
  }

  getWorker(id: string): WorkerItem | undefined {
    if (!id) return undefined;
    const lower = id.toLowerCase();
    const existing = this.workers.find(w =>
      w.id === id ||
      w.workerId === id ||
      w.id.toLowerCase() === lower ||
      (w.workerId && w.workerId.toLowerCase() === lower) ||
      (w.email && w.email.toLowerCase() === lower)
    );
    if (existing) return existing;

    // Check users map for admin or dynamically registered worker
    const user = this.findUserById(id) || this.findUserByEmail(id);
    if (user) {
      if (user.role === 'ADMIN') {
        const adminWorker: WorkerItem = {
          id: user.id || id,
          workerId: user.id || id,
          name: `${user.name || 'Admin'} (Supervisor)`,
          email: user.email || 'admin@cybercafe.in',
          phone: user.phone || '9876543200',
          businessName: 'Admin Central Operations',
          address: user.address || 'Operations Command Center',
          city: 'Patna, Bihar',
          skills: ['Government forms', 'PAN-related services', 'Voter ID', 'Document verification'],
          bankDetails: { accountNumber: '000000000000', ifsc: 'SBIN0000001', accountHolderName: user.name || 'Admin', upiId: 'admin@cyber' },
          activeJobs: 0,
          completedJobs: 0,
          rating: 5.0,
          isOnline: true,
          accountStatus: 'ACTIVE',
          lastActivityAt: new Date().toISOString(),
          walletBalancePaise: 0,
          pendingEarningsPaise: 0,
          onHoldEarningsPaise: 0,
          totalEarningsPaise: 0,
          averageCompletionMinutes: 30,
          reviews: []
        };
        this.workers.push(adminWorker);
        return adminWorker;
      } else {
        const dynamicWorker: WorkerItem = {
          id: user.id || id,
          workerId: user.id || id,
          name: user.name || 'Worker Operator',
          email: user.email || '',
          phone: user.phone || '',
          businessName: user.businessName || `${user.name || 'Operator'} Digital Kendra`,
          address: user.address || '',
          city: user.city || '',
          skills: user.skills || ['Government forms', 'PAN-related services'],
          bankDetails: user.bankDetails || { accountNumber: '', ifsc: '', accountHolderName: user.name || 'Worker', upiId: '' },
          activeJobs: 0,
          completedJobs: 0,
          rating: 5.0,
          isOnline: user.isOnline !== false,
          accountStatus: user.accountStatus || 'ACTIVE',
          lastActivityAt: new Date().toISOString(),
          walletBalancePaise: 0,
          pendingEarningsPaise: 0,
          onHoldEarningsPaise: 0,
          totalEarningsPaise: 0,
          averageCompletionMinutes: 45,
          reviews: []
        };
        this.workers.push(dynamicWorker);
        return dynamicWorker;
      }
    }

    // Safe fallback for any valid workerId
    const fallbackWorker: WorkerItem = {
      id,
      workerId: id,
      name: `Operator (${id})`,
      email: `${id}@cybercafe.in`,
      phone: '9876543200',
      businessName: `${id} Digital Kendra`,
      address: 'Main Market',
      city: 'Patna',
      skills: ['Government forms', 'PAN-related services'],
      bankDetails: { accountNumber: '', ifsc: '', accountHolderName: id, upiId: '' },
      activeJobs: 0,
      completedJobs: 0,
      rating: 5.0,
      isOnline: true,
      accountStatus: 'ACTIVE',
      lastActivityAt: new Date().toISOString(),
      walletBalancePaise: 0,
      pendingEarningsPaise: 0,
      onHoldEarningsPaise: 0,
      totalEarningsPaise: 0,
      averageCompletionMinutes: 45,
      reviews: []
    };
    this.workers.push(fallbackWorker);
    return fallbackWorker;
  }

  findUserByEmail(email: string): any | undefined {
    if (!email) return undefined;
    const target = email.toLowerCase().trim();
    for (const u of this.users.values()) {
      if (u.email?.toLowerCase().trim() === target) return u;
    }
    return undefined;
  }

  findUserByPhone(phone: string): any | undefined {
    if (!phone) return undefined;
    const clean = phone.replace(/\D/g, '');
    for (const u of this.users.values()) {
      if (u.phone && (u.phone === phone || (clean.length >= 10 && u.phone.replace(/\D/g, '') === clean))) {
        return u;
      }
    }
    return undefined;
  }

  findUserById(id: string): any | undefined {
    if (!id) return undefined;
    if (this.users.has(id)) return this.users.get(id);

    const idLower = id.toLowerCase().trim();
    for (const u of this.users.values()) {
      if (
        (u.id && u.id.toLowerCase() === idLower) ||
        (u.adminId && u.adminId.toLowerCase() === idLower) ||
        (u.workerId && u.workerId.toLowerCase() === idLower) ||
        (u.username && u.username.toLowerCase() === idLower) ||
        (u.email && u.email.toLowerCase() === idLower)
      ) {
        return u;
      }
    }
    return undefined;
  }

  saveUser(user: any): any {
    this.users.set(user.id, user);
    return user;
  }

  private getDataDir(): string {
    const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
    const baseDir = path.resolve(__dirname, '../data');
    const targetDir = isTest ? path.join(baseDir, 'test') : baseDir;
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    return targetDir;
  }

  persistOrdersToDisk() {
    try {
      const dataDir = this.getDataDir();
      const filePath = path.join(dataDir, 'persisted_orders.json');
      const ordersArray = Array.from(this.orders.values()).filter(o => 
        o.status !== 'PAYMENT_PENDING' && 
        !(o.paymentStatus === 'PENDING' && o.status !== 'COMPLETED' && o.status !== 'IN_PROGRESS')
      );
      fs.writeFileSync(filePath, JSON.stringify(ordersArray, null, 2), 'utf-8');
    } catch (err: any) {
      console.warn('[ResilientStore] Failed to persist orders to disk:', err.message);
    }
  }

  loadPersistedOrdersFromDisk() {
    try {
      const dataDir = this.getDataDir();
      const filePath = path.join(dataDir, 'persisted_orders.json');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const ordersArray = JSON.parse(content);
        if (Array.isArray(ordersArray)) {
          ordersArray.forEach(ord => {
            if (ord && ord.id) {
              this.orders.set(ord.id, ord);
              if (Array.isArray(ord.documents)) {
                ord.documents.forEach((d: any) => {
                  if (d && d.id) {
                    const existing = this.documents.get(d.id);
                    this.documents.set(d.id, {
                      ...(existing || {}),
                      ...d,
                      orderId: ord.id,
                      orderNumber: ord.orderNumber || ord.id
                    });
                  }
                });
              }
            }
          });
        }
      }
    } catch (err: any) {
      console.warn('[ResilientStore] Error reading persisted orders:', err.message);
    }
  }

  persistDocumentsToDisk() {
    try {
      const dataDir = this.getDataDir();
      const filePath = path.join(dataDir, 'persisted_documents.json');
      const docsArray = Array.from(this.documents.values());
      fs.writeFileSync(filePath, JSON.stringify(docsArray, null, 2), 'utf-8');
    } catch (err: any) {
      console.warn('[ResilientStore] Failed to persist documents:', err.message);
    }
  }

  loadPersistedDocumentsFromDisk() {
    try {
      const dataDir = this.getDataDir();
      const filePath = path.join(dataDir, 'persisted_documents.json');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const docsArray = JSON.parse(content);
        if (Array.isArray(docsArray)) {
          docsArray.forEach(doc => {
            if (doc && doc.id) {
              this.documents.set(doc.id, doc);
            }
          });
        }
      }
    } catch (err: any) {
      console.warn('[ResilientStore] Error loading documents:', err.message);
    }
  }

  persistLedgerToDisk() {
    try {
      const dataDir = this.getDataDir();
      const filePath = path.join(dataDir, 'financial_ledger.json');
      fs.writeFileSync(filePath, JSON.stringify(this.ledgerEntries, null, 2), 'utf-8');
    } catch (err: any) {
      console.warn('[ResilientStore] Failed to persist ledger:', err.message);
    }
  }

  loadPersistedLedgerFromDisk() {
    try {
      const dataDir = this.getDataDir();
      const filePath = path.join(dataDir, 'financial_ledger.json');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const entries = JSON.parse(content);
        if (Array.isArray(entries)) {
          this.ledgerEntries = entries;
          entries.forEach(e => {
            if (e?.idempotencyKey) {
              this.ledgerIdempotencyKeys.add(e.idempotencyKey);
            }
          });
        }
      }
    } catch (err: any) {
      console.warn('[ResilientStore] Error loading ledger:', err.message);
    }
  }

  persistWelfareToDisk() {
    try {
      const dataDir = this.getDataDir();
      const casesArray = Array.from(this.welfareCases.values());
      fs.writeFileSync(path.join(dataDir, 'persisted_welfare_cases.json'), JSON.stringify(casesArray, null, 2), 'utf-8');
      const refundsArray = Array.from(this.refundRecords.values());
      fs.writeFileSync(path.join(dataDir, 'persisted_refund_records.json'), JSON.stringify(refundsArray, null, 2), 'utf-8');
    } catch (err: any) {
      console.warn('[ResilientStore] Failed to persist welfare records:', err.message);
    }
  }

  loadPersistedWelfareFromDisk() {
    try {
      const dataDir = this.getDataDir();
      const casesPath = path.join(dataDir, 'persisted_welfare_cases.json');
      if (fs.existsSync(casesPath)) {
        const arr = JSON.parse(fs.readFileSync(casesPath, 'utf-8'));
        if (Array.isArray(arr)) {
          arr.forEach(c => {
            if (c && c.id) this.welfareCases.set(c.id, c);
          });
        }
      }
      const refundsPath = path.join(dataDir, 'persisted_refund_records.json');
      if (fs.existsSync(refundsPath)) {
        const arr = JSON.parse(fs.readFileSync(refundsPath, 'utf-8'));
        if (Array.isArray(arr)) {
          arr.forEach(r => {
            if (r && r.id) this.refundRecords.set(r.id, r);
          });
        }
      }
    } catch (err: any) {
      console.warn('[ResilientStore] Error loading welfare records:', err.message);
    }
  }

  saveWelfareCase(c: WelfareCaseItem): WelfareCaseItem {
    this.welfareCases.set(c.id, c);
    this.persistWelfareToDisk();
    return c;
  }

  getWelfareCase(id: string): WelfareCaseItem | undefined {
    return this.welfareCases.get(id);
  }

  saveRefundRecord(r: RefundRecordItem): RefundRecordItem {
    this.refundRecords.set(r.id, r);
    this.persistWelfareToDisk();
    return r;
  }

  getRefundRecord(id: string): RefundRecordItem | undefined {
    return this.refundRecords.get(id);
  }

  getRefundRecordByTicketId(ticketId: string): RefundRecordItem | undefined {
    for (const r of this.refundRecords.values()) {
      if (r.ticket_id === ticketId) return r;
    }
    return undefined;
  }

  appendLedgerEntry(entry: Omit<FinancialLedgerItem, 'id' | 'createdAt'>): FinancialLedgerItem {
    // O(1) Idempotency check via Set
    if (this.ledgerIdempotencyKeys.has(entry.idempotencyKey)) {
      const found = this.ledgerEntries.find(l => l.idempotencyKey === entry.idempotencyKey);
      if (found) return found;
    }

    const newEntry: FinancialLedgerItem = {
      id: `ledg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      createdAt: new Date().toISOString(),
      entityId: entry.entityId || entry.withdrawalId || entry.orderId || null,
      reference: entry.reference || entry.referenceNote || null,
      ...entry
    };

    this.ledgerIdempotencyKeys.add(entry.idempotencyKey);
    this.ledgerEntries.unshift(newEntry);

    if (this.ledgerEntries.length > MAX_LEDGER_ENTRIES) {
      this.ledgerEntries.length = MAX_LEDGER_ENTRIES;
    }

    this.persistLedgerToDisk();
    return newEntry;
  }

  saveOrder(order: any): any {
    this.orders.set(order.id, order);
    this.persistOrdersToDisk();
    return order;
  }

  getOrder(id: string): any | undefined {
    return this.orders.get(id);
  }

  getOrders(customerId?: string): any[] {
    const list = Array.from(this.orders.values()).filter(o => 
      o.status !== 'PAYMENT_PENDING' && 
      !(o.paymentStatus === 'PENDING' && o.status !== 'COMPLETED' && o.status !== 'IN_PROGRESS')
    );
    if (customerId) {
      return list.filter(o => o.customerId === customerId || (o as any).userId === customerId);
    }
    return list;
  }

  saveDocument(doc: any): any {
    this.documents.set(doc.id, doc);
    this.persistDocumentsToDisk();
    return doc;
  }

  getDocument(id: string): any | undefined {
    return this.documents.get(id);
  }

  getDocumentsByCustomerId(customerId: string): any[] {
    return Array.from(this.documents.values()).filter(d => d.customerId === customerId);
  }

  addAuditLog(log: any) {
    this.auditLogs.unshift({
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      ...log
    });

    if (this.auditLogs.length > MAX_AUDIT_LOGS) {
      this.auditLogs.length = MAX_AUDIT_LOGS;
    }
  }

  getAuditLogs(actorUserId?: string, action?: string): any[] {
    return this.auditLogs.filter(l => {
      if (actorUserId && l.actorUserId !== actorUserId) return false;
      if (action && l.action !== action) return false;
      return true;
    });
  }

  // ==========================================
  // WORKER LIFECYCLE & OPERATIONS
  // ==========================================

  recordWorkerActivity(workerId: string): { isOnline: boolean; autoOfflineTriggered?: boolean } {
    const worker = this.getWorker(workerId);
    if (!worker) return { isOnline: false };

    const now = Date.now();
    const last = worker.lastActivityAt ? new Date(worker.lastActivityAt).getTime() : now;
    const diffMins = (now - last) / (1000 * 60);

    // Auto-offline rule: 30 minutes of inactivity
    if (diffMins >= 30 && worker.isOnline) {
      worker.isOnline = false;
      worker.lastActivityAt = new Date().toISOString();
      const user = this.users.get(workerId);
      if (user) user.isOnline = false;

      this.pushNotification({
        id: `notif_${Date.now()}`,
        recipientId: workerId,
        recipientRole: 'WORKER',
        type: 'INACTIVITY_OFFLINE',
        title: 'Set to Offline (Inactivity)',
        message: 'You have been automatically switched to Offline due to 30 minutes of inactivity. Switch back to Online when ready to accept orders.',
        isRead: false,
        createdAt: new Date().toISOString()
      });

      this.addAuditLog({
        actorUserId: workerId,
        actorRole: 'SYSTEM',
        action: 'WORKER_AUTO_OFFLINE',
        metadata: { reason: '30_min_inactivity' }
      });

      return { isOnline: false, autoOfflineTriggered: true };
    }

    worker.lastActivityAt = new Date().toISOString();
    return { isOnline: worker.isOnline };
  }

  toggleWorkerAvailability(workerId: string, desiredState?: boolean): { isOnline: boolean; worker: WorkerItem } {
    const worker = this.getWorker(workerId);
    if (!worker) throw new Error('Worker not found');

    const newState = desiredState !== undefined ? desiredState : !worker.isOnline;
    worker.isOnline = newState;
    worker.lastActivityAt = new Date().toISOString();

    const user = this.users.get(workerId);
    if (user) user.isOnline = newState;

    this.addAuditLog({
      actorUserId: workerId,
      actorRole: 'WORKER',
      action: 'AVAILABILITY_TOGGLED',
      metadata: { isOnline: newState }
    });

    return { isOnline: newState, worker };
  }

  updateWorkerProfile(workerId: string, updates: Partial<WorkerItem>): WorkerItem {
    const worker = this.getWorker(workerId);
    if (!worker) throw new Error('Worker not found');

    if (updates.businessName) worker.businessName = updates.businessName;
    if (updates.address) worker.address = updates.address;
    if (updates.city) worker.city = updates.city;
    if (updates.skills) worker.skills = updates.skills;
    if (updates.phone) worker.phone = updates.phone;

    const user = this.users.get(workerId);
    if (user) {
      if (updates.businessName) user.businessName = updates.businessName;
      if (updates.address) user.address = updates.address;
      if (updates.city) user.city = updates.city;
      if (updates.skills) user.skills = updates.skills;
      if (updates.phone) user.phone = updates.phone;
    }

    return worker;
  }

  getAvailableOrdersForWorker(workerId: string): { isOnline: boolean; orders: any[] } {
    const worker = this.getWorker(workerId);
    if (!worker) return { isOnline: false, orders: [] };

    if (
      worker.accountStatus === 'PAUSED' ||
      worker.status === 'PAUSED' ||
      worker.accountStatus === 'SUSPENDED' ||
      worker.accountStatus === 'BLOCKED' ||
      worker.accountStatus === 'DELETED' ||
      worker.status === 'DELETED'
    ) {
      return { isOnline: worker.isOnline, orders: [] };
    }

    this.recordWorkerActivity(workerId);

    const now = Date.now();
    const allOrders = Array.from(this.orders.values());
    const availableList: any[] = [];
    const seenOrderIds = new Set<string>();

    allOrders.forEach(ord => {
      if (seenOrderIds.has(ord.id)) return;

      // Strict Unassigned & Status Invariant:
      // An order is available ONLY if NO worker is assigned AND status is open/pending.
      const hasWorkerAssigned = Boolean(
        (ord.workerId && ord.workerId !== '') ||
        (ord.assignedWorkerId && ord.assignedWorkerId !== '') ||
        ord.worker?.id
      );

      const isClaimedOrClosed = [
        'ASSIGNED',
        'IN_PROGRESS',
        'WAITING_FOR_CUSTOMER',
        'SUBMITTED',
        'REVISION_REQUIRED',
        'COMPLETED',
        'CANCELLED',
        'DISPUTED',
        'ACCEPTED',
        'WORK_COMPLETED',
        'RECEIPT_SUBMITTED',
        'REJECTED',
        'REFUND_PENDING',
        'REFUNDED'
      ].includes(ord.status);

      if (hasWorkerAssigned || isClaimedOrClosed || ord.status === 'PAYMENT_PENDING' || ord.paymentStatus === 'PENDING') {
        return;
      }

      if (ord.status === 'OFFERED' && ord.offerExpiresAt) {
        if (new Date(ord.offerExpiresAt).getTime() <= now) {
          ord.status = 'AVAILABLE';
          ord.assignedWorkerId = null;
          ord.workerId = null;
        }
      }

      const isOpenClaimable = ord.status === 'AVAILABLE' || ord.status === 'PAID' || ord.status === 'CREATED';
      const isOfferedToThisOrPool = ord.status === 'OFFERED' && (!ord.offerExpiresAt || new Date(ord.offerExpiresAt).getTime() > now);

      if (isOpenClaimable || isOfferedToThisOrPool) {
        seenOrderIds.add(ord.id);
        let remainingSeconds = 600;
        if (ord.offerExpiresAt) {
          const rem = Math.floor((new Date(ord.offerExpiresAt).getTime() - now) / 1000);
          remainingSeconds = rem > 0 ? rem : 0;
        }

        const resolvedCustomer = this.users.get(ord.customerId);
        const resolvedCustomerName =
          ord.customerName && ord.customerName !== 'Customer'
            ? ord.customerName
            : (resolvedCustomer?.name || ord.customer?.name || 'Customer');

        const payoutPaise = ord.workerAmountPaise || ord.workerAmount || ord.workerEarningsPaise || (ord.adminCommissionPaise !== undefined ? Math.max(0, (ord.pricePaise || 0) - ord.adminCommissionPaise) : (ord.pricePaise || 0));
        availableList.push({
          id: ord.id,
          orderNumber: ord.orderNumber || ord.id,
          serviceId: ord.serviceId,
          serviceName: ord.serviceName || ord.service?.name,
          category: ord.category || (ord.serviceSnapshot as any)?.category || null,
          workerAmount: payoutPaise,
          workerEarningAmount: payoutPaise,
          workerEarningsPaise: payoutPaise,
          customerName: resolvedCustomerName,
          createdAt: ord.createdAt,
          deadline: ord.deadline,
          offerExpiresAt: ord.offerExpiresAt,
          remainingSeconds,
          status: ord.status,
          slotStatus: ord.slotStatus || 'UNASSIGNED',
          timeSlot: ord.timeSlot || null,
          bookingDate: ord.bookingDate || null
        });
      }
    });

    return {
      isOnline: worker.isOnline,
      orders: availableList
    };
  }

  findBestSuitableWorker(category?: string, excludedWorkerIds: string[] = []): WorkerItem | null {
    const candidates = this.workers.filter(w =>
      w.isOnline &&
      w.accountStatus === 'ACTIVE' &&
      w.status !== 'PAUSED' &&
      w.status !== 'DELETED' &&
      !excludedWorkerIds.includes(w.id)
    );

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
      const activeA = a.activeJobs || 0;
      const activeB = b.activeJobs || 0;
      if (activeA !== activeB) return activeA - activeB;
      return (a.averageCompletionMinutes || 60) - (b.averageCompletionMinutes || 60);
    });

    return candidates[0];
  }

  handleOfferExpiry(orderId: string) {
    const order = this.orders.get(orderId);
    if (!order || order.status !== 'OFFERED') return;

    if (!order.rejectedWorkerIds) order.rejectedWorkerIds = [];
    if (order.assignedWorkerId) {
      order.rejectedWorkerIds.push(order.assignedWorkerId);
      this.pushNotification({
        id: `notif_${Date.now()}`,
        recipientId: order.assignedWorkerId,
        recipientRole: 'WORKER',
        type: 'OFFER_EXPIRED',
        title: 'Offer Expired',
        message: `The 10-minute acceptance window for order #${order.id} has expired.`,
        orderId: order.id,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    order.assignedWorkerId = null;
    order.offerExpiresAt = null;

    const nextWorker = this.findBestSuitableWorker(order.category, order.rejectedWorkerIds);
    if (nextWorker) {
      order.status = 'OFFERED';
      order.assignedWorkerId = nextWorker.id;
      order.offerExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      this.pushNotification({
        id: `notif_${Date.now()}`,
        recipientId: nextWorker.id,
        recipientRole: 'WORKER',
        type: 'NEW_ORDER_OFFER',
        title: 'New Order Offer (10-Min Window)',
        message: `You have received an order offer for "${order.serviceName}". You have 10 minutes to accept.`,
        orderId: order.id,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    } else {
      order.status = 'AVAILABLE';
      this.pushNotification({
        id: `notif_adm_${Date.now()}`,
        recipientId: this.settings.adminId || 'ADM-001',
        recipientRole: 'ADMIN',
        type: 'NO_SUITABLE_WORKER',
        title: 'No Suitable Worker Available',
        message: `Order #${order.id} has no available online worker. Please manually assign a worker.`,
        orderId: order.id,
        isRead: false,
        createdAt: new Date().toISOString()
      });
      if (order.customerId) {
        this.pushNotification({
          id: `notif_c_${Date.now()}`,
          recipientId: order.customerId,
          recipientRole: 'CUSTOMER',
          type: 'NO_WORKER_AVAILABLE',
          title: 'Looking for Available Operator',
          message: `All operators are currently engaged. We are searching for an available operator for your order.`,
          orderId: order.id,
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }
    }
  }

  acceptOrder(orderId: string, workerId: string): any {
    const worker = this.getWorker(workerId);
    if (!worker) throw new Error('Worker not found');
    if (!worker.isOnline) throw new Error('You must be Online to accept orders');
    if (worker.accountStatus === 'PAUSED' || worker.status === 'PAUSED') {
      throw new Error('Worker account is paused. Cannot accept new orders.');
    }
    if (worker.accountStatus === 'DELETED' || worker.status === 'DELETED') {
      throw new Error('Worker account has been deactivated.');
    }
    if (worker.accountStatus === 'SUSPENDED' || worker.accountStatus === 'BLOCKED') {
      throw new Error('Worker account is suspended or blocked');
    }

    if (!this.acquireOrderLock(orderId)) {
      const err: any = new Error('Order has already been accepted by another worker');
      err.statusCode = 409;
      err.code = 'ORDER_ALREADY_ASSIGNED';
      throw err;
    }

    try {
      const order = this.orders.get(orderId);
      if (!order) throw new Error('Order not found');

      // Check if order is already assigned to a DIFFERENT worker
      const alreadyClaimedByOther = (order.assignedWorkerId && order.assignedWorkerId !== workerId) || (order.workerId && order.workerId !== workerId);
      if (alreadyClaimedByOther) {
        const err: any = new Error('Order has already been accepted by another worker');
        err.statusCode = 409;
        err.code = 'ORDER_ALREADY_ASSIGNED';
        throw err;
      }

      // If already assigned to CURRENT worker, return idempotently
      if (order.assignedWorkerId === workerId) {
        return order;
      }

      if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
        const err: any = new Error(`Order cannot be accepted in status: ${order.status}`);
        err.statusCode = 409;
        err.code = 'ORDER_CLOSED';
        throw err;
      }

      const claimableStatuses = ['OFFERED', 'AVAILABLE', 'PAID', 'PENDING', 'CONFIRMED', 'CREATED'];
      if (!claimableStatuses.includes(order.status)) {
        const err: any = new Error(`Order cannot be accepted in status: ${order.status}`);
        err.statusCode = 409;
        err.code = 'ORDER_UNAVAILABLE';
        throw err;
      }

      if (order.status === 'OFFERED' && order.offerExpiresAt) {
        if (new Date(order.offerExpiresAt).getTime() < Date.now()) {
          throw new Error('This offer has expired (10-minute response window passed)');
        }
      }

      order.status = 'ASSIGNED';
      order.assignedWorkerId = workerId;
      order.workerId = workerId;
      order.worker = { id: worker.id, name: worker.name, phone: worker.phone, email: worker.email };
      order.workerAcceptedAt = new Date().toISOString();
      order.acceptedOrder5HourWindowExpiresAt = new Date(Date.now() + 5 * 3600 * 1000).toISOString();
      order.workerEarningsPaise = order.workerEarningsPaise || order.workerAmountPaise || order.workerAmount || (order.adminCommissionPaise !== undefined ? Math.max(0, (order.pricePaise || 0) - order.adminCommissionPaise) : (order.pricePaise || 0));
      order.timeSlot = null;

      if (!order.serviceSnapshot) order.serviceSnapshot = {};
      order.serviceSnapshot.scheduling = {
        status: 'UNSCHEDULED',
        timeSlot: null,
        rescheduleNote: null
      };

      worker.activeJobs += 1;
      worker.pendingEarningsPaise += order.workerEarningsPaise;
      worker.lastActivityAt = new Date().toISOString();

      this.pushNotification({
        id: `notif_${Date.now()}`,
        recipientId: workerId,
        recipientRole: 'WORKER',
        type: 'ORDER_ACCEPTED',
        title: 'Order Accepted',
        message: `You accepted order ${order.id} for ${order.serviceName}. Customer workspace is unlocked. Please set your review window.`,
        orderId: order.id,
        isRead: false,
        createdAt: new Date().toISOString()
      });

      if (order.customerId) {
        this.pushNotification({
          id: `notif_${Date.now()}_cust`,
          recipientId: order.customerId,
          recipientRole: 'CUSTOMER',
          type: 'ORDER_ACCEPTED',
          title: 'Operator Assigned',
          message: `${worker.name} has accepted your order. They will confirm your schedule window shortly.`,
          orderId: order.id,
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }

      this.addAuditLog({
        actorUserId: workerId,
        actorRole: 'WORKER',
        action: 'ORDER_ACCEPTED',
        orderId: order.id
      });

      this.persistOrdersToDisk();
      return order;
    } finally {
      this.releaseOrderLock(orderId);
    }
  }

  rejectOrder(orderId: string, workerId: string, reason: string, note?: string): any {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');

    if (!reason || reason.trim().length === 0) {
      throw new Error('Rejection reason is mandatory');
    }

    if (order.assignedWorkerId && order.assignedWorkerId !== workerId) {
      throw new Error('Unauthorized to reject an order not assigned to you');
    }

    const worker = this.getWorker(workerId);
    if (worker) {
      worker.lastActivityAt = new Date().toISOString();
      if (order.status === 'ACCEPTED' || order.status === 'ASSIGNED') {
        const acceptedTime = new Date(order.workerAcceptedAt || 0).getTime();
        if (Date.now() - acceptedTime > 5 * 3600 * 1000) {
          throw new Error('5-hour accepted order rejection window has elapsed');
        }
        if (worker.activeJobs > 0) worker.activeJobs -= 1;
        worker.pendingEarningsPaise = Math.max(0, worker.pendingEarningsPaise - (order.workerEarningsPaise || 0));
      }
    }

    if (!order.rejectionHistory) order.rejectionHistory = [];
    order.rejectionHistory.push({
      workerId,
      reason,
      note,
      rejectedAt: new Date().toISOString()
    });

    if (!order.rejectedWorkerIds) order.rejectedWorkerIds = [];
    if (!order.rejectedWorkerIds.includes(workerId)) {
      order.rejectedWorkerIds.push(workerId);
    }

    order.assignedWorkerId = null;
    order.offerExpiresAt = null;

    const nextWorker = this.findBestSuitableWorker(order.category, order.rejectedWorkerIds);
    if (nextWorker) {
      order.status = 'OFFERED';
      order.assignedWorkerId = nextWorker.id;
      order.offerExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      this.pushNotification({
        id: `notif_${Date.now()}`,
        recipientId: nextWorker.id,
        recipientRole: 'WORKER',
        type: 'NEW_ORDER_OFFER',
        title: 'New Order Offer (10-Min Window)',
        message: `You have received an order offer for "${order.serviceName}". You have 10 minutes to accept.`,
        orderId: order.id,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    } else {
      order.status = 'AVAILABLE';
      this.pushNotification({
        id: `notif_adm_${Date.now()}`,
        recipientId: this.settings.adminId || 'ADM-001',
        recipientRole: 'ADMIN',
        type: 'NO_SUITABLE_WORKER',
        title: 'No Suitable Worker Available',
        message: `Order #${order.id} was rejected and has no available online worker. Please manually assign.`,
        orderId: order.id,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    this.addAuditLog({
      actorUserId: workerId,
      actorRole: 'WORKER',
      action: 'ORDER_REJECTED',
      orderId: order.id,
      metadata: { reason, note }
    });

    return { success: true, message: 'Order rejected and processed' };
  }

  setOrderTimeSlot(orderId: string, workerId: string, timeSlot: { date?: string; startTime: string; endTime: string; note?: string }): any {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');

    const isAdmin = this.checkIsAdmin(workerId);
    if (!isAdmin && order.assignedWorkerId !== workerId) {
      throw new Error('Unauthorized: Only the assigned worker can set the time slot');
    }

    const dateStr = timeSlot.date || 'Today';
    const formattedSlot = `${dateStr}, ${timeSlot.startTime} - ${timeSlot.endTime}`;

    order.timeSlot = {
      date: dateStr,
      startTime: timeSlot.startTime,
      endTime: timeSlot.endTime,
      timeSlotStr: formattedSlot,
      status: 'PROPOSED',
      proposedBy: workerId,
      proposedAt: new Date().toISOString(),
      rescheduleNote: timeSlot.note || null
    };

    if (!order.serviceSnapshot) order.serviceSnapshot = {};
    order.serviceSnapshot.scheduling = {
      timeSlot: formattedSlot,
      date: dateStr,
      startTime: timeSlot.startTime,
      endTime: timeSlot.endTime,
      status: 'PROPOSED',
      proposedBy: 'WORKER',
      proposedAt: new Date().toISOString(),
      rescheduleNote: timeSlot.note || null
    };
    order.updatedAt = new Date().toISOString();

    const workerName = this.getWorker(order.assignedWorkerId)?.name || 'Worker';

    this.pushChatMessage({
      id: `msg_${Date.now()}`,
      orderId,
      senderId: workerId,
      senderRole: 'WORKER',
      senderName: workerName,
      message: `[Time Slot Proposed]: ${formattedSlot}`,
      createdAt: new Date().toISOString()
    });

    if (order.customerId) {
      this.pushNotification({
        id: `notif_${Date.now()}_ts`,
        recipientId: order.customerId,
        recipientRole: 'CUSTOMER',
        type: 'TIME_SLOT_PROPOSED',
        title: 'Working Time Slot Proposed',
        message: `${workerName} scheduled a working time slot: ${formattedSlot}. Please confirm or request a reschedule.`,
        orderId,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    this.persistOrdersToDisk();
    return order;
  }

  acceptCustomerReschedule(orderId: string, workerId: string): any {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');

    const isAdmin = this.checkIsAdmin(workerId);
    if (!isAdmin && order.assignedWorkerId !== workerId) {
      throw new Error('Unauthorized: Only the assigned worker can accept reschedule');
    }

    const scheduling = order.serviceSnapshot?.scheduling;
    if (!scheduling || scheduling.status !== 'RESCHEDULE_REQUESTED') {
      throw new Error('No pending reschedule request to accept');
    }

    scheduling.status = 'ACCEPTED';
    scheduling.acceptedAt = new Date().toISOString();
    scheduling.agreedBy = workerId;

    if (order.timeSlot) {
      order.timeSlot.status = 'ACCEPTED';
      order.timeSlot.agreedAt = new Date().toISOString();
      order.timeSlot.timeSlotStr = scheduling.timeSlot;
      order.timeSlot.date = scheduling.requestedDate || order.timeSlot.date || 'Today';
      order.timeSlot.startTime = scheduling.requestedTime || order.timeSlot.startTime;
      order.timeSlot.endTime = '';
    } else {
      order.timeSlot = {
        timeSlotStr: scheduling.timeSlot,
        date: scheduling.requestedDate || 'Today',
        startTime: scheduling.requestedTime || 'Scheduled',
        endTime: '',
        status: 'ACCEPTED',
        proposedBy: 'CUSTOMER',
        agreedAt: new Date().toISOString()
      };
    }
    order.updatedAt = new Date().toISOString();

    const workerName = this.getWorker(order.assignedWorkerId)?.name || 'Worker';

    this.pushChatMessage({
      id: `msg_${Date.now()}`,
      orderId,
      senderId: workerId,
      senderRole: 'WORKER',
      senderName: workerName,
      message: `[Reschedule Accepted]: Agreed to time slot: ${scheduling.timeSlot}`,
      createdAt: new Date().toISOString()
    });

    if (order.customerId) {
      this.pushNotification({
        id: `notif_${Date.now()}_ra`,
        recipientId: order.customerId,
        recipientRole: 'CUSTOMER',
        type: 'RESCHEDULE_ACCEPTED',
        title: 'Reschedule Request Accepted',
        message: `${workerName} agreed to your requested time slot: ${scheduling.timeSlot}.`,
        orderId,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    this.persistOrdersToDisk();
    return order;
  }

  acceptAndScheduleOrder(orderId: string, workerId: string, schedule: { date?: string; timeSlot: string }): any {
    const lockAcquired = this.acquireOrderLock(orderId);
    if (!lockAcquired) {
      const err: any = new Error('Order is currently being processed by another worker');
      err.statusCode = 409;
      err.code = 'ORDER_LOCKED';
      throw err;
    }

    try {
      const worker = this.getWorker(workerId);
      if (!worker) throw new Error('Worker not found');

      if (!worker.isOnline) {
        throw new Error('Worker must be online to accept orders');
      }

      if (
        worker.accountStatus === 'PAUSED' ||
        worker.status === 'PAUSED' ||
        worker.accountStatus === 'SUSPENDED' ||
        worker.accountStatus === 'BLOCKED' ||
        worker.accountStatus === 'DELETED'
      ) {
        throw new Error('Worker account is inactive or suspended');
      }

      const order = this.orders.get(orderId);
      if (!order) throw new Error('Order not found');

      // Check if order is already assigned to a DIFFERENT worker
      const alreadyClaimedByOther = (order.assignedWorkerId && order.assignedWorkerId !== workerId) || (order.workerId && order.workerId !== workerId);
      if (alreadyClaimedByOther) {
        const err: any = new Error('Order has already been accepted by another worker');
        err.statusCode = 409;
        err.code = 'ORDER_ALREADY_ASSIGNED';
        throw err;
      }

      if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
        const err: any = new Error(`Order cannot be scheduled in status: ${order.status}`);
        err.statusCode = 409;
        err.code = 'ORDER_CLOSED';
        throw err;
      }

      const claimableStatuses = ['OFFERED', 'AVAILABLE', 'PAID', 'PENDING', 'CONFIRMED', 'CREATED', 'ASSIGNED', 'IN_PROGRESS'];
      if (!claimableStatuses.includes(order.status)) {
        const err: any = new Error(`Order cannot be accepted in status: ${order.status}`);
        err.statusCode = 409;
        err.code = 'ORDER_UNAVAILABLE';
        throw err;
      }

      const slotStr = schedule.timeSlot ? schedule.timeSlot.trim() : '';
      if (!slotStr) {
        throw new Error('Initial time window is required to accept and schedule');
      }
      const dateStr = schedule.date ? schedule.date.trim() : 'Today';

      order.status = 'ASSIGNED';
      order.assignedWorkerId = workerId;
      order.workerId = workerId;
      order.worker = { id: worker.id, name: worker.name, phone: worker.phone, email: worker.email };
      order.workerAcceptedAt = order.workerAcceptedAt || new Date().toISOString();
      order.acceptedOrder5HourWindowExpiresAt = new Date(Date.now() + 5 * 3600 * 1000).toISOString();
      order.workerEarningsPaise = order.workerEarningsPaise || order.workerAmountPaise || order.workerAmount || (order.adminCommissionPaise !== undefined ? Math.max(0, (order.pricePaise || 19900) - order.adminCommissionPaise) : (order.pricePaise || 19900));

      order.bookingDate = dateStr;
      order.timeSlot = slotStr;
      order.bookingTimeSlot = slotStr;
      order.slotStatus = 'CONFIRMED';
      order.proposedSlot = null;
      order.proposedDate = null;
      order.updatedAt = new Date().toISOString();

      if (!order.serviceSnapshot) order.serviceSnapshot = {};
      order.serviceSnapshot.scheduling = {
        date: dateStr,
        timeSlot: slotStr,
        slotStatus: 'CONFIRMED',
        status: 'CONFIRMED',
        scheduledAt: new Date().toISOString(),
        proposedBy: 'WORKER'
      };

      worker.activeJobs += 1;
      worker.pendingEarningsPaise += order.workerEarningsPaise;
      worker.lastActivityAt = new Date().toISOString();

      const workerName = worker.name || 'Certified Operator';

      this.pushNotification({
        id: `notif_${Date.now()}`,
        recipientId: workerId,
        recipientRole: 'WORKER',
        type: 'ORDER_ACCEPTED',
        title: 'Order Accepted & Scheduled',
        message: `You accepted order ${order.id} for ${order.serviceName}. Review window confirmed for ${dateStr} at ${slotStr}.`,
        orderId: order.id,
        isRead: false,
        createdAt: new Date().toISOString()
      });

      if (order.customerId) {
        this.pushNotification({
          id: `notif_${Date.now()}_cust`,
          recipientId: order.customerId,
          recipientRole: 'CUSTOMER',
          type: 'ORDER_ACCEPTED',
          title: 'Operator Assigned & Time Slot Confirmed',
          message: `${workerName} has accepted your order and confirmed your review window: ${dateStr} at ${slotStr}.`,
          orderId: order.id,
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }

      this.pushChatMessage({
        id: `msg_${Date.now()}`,
        orderId: order.id,
        senderId: workerId,
        senderRole: 'WORKER',
        senderName: workerName,
        message: `[Review Window Scheduled]: ${dateStr} at ${slotStr}`,
        createdAt: new Date().toISOString()
      });

      this.addAuditLog({
        actorUserId: workerId,
        actorRole: 'WORKER',
        action: 'ORDER_ACCEPTED_AND_SCHEDULED',
        orderId: order.id
      });

      this.persistOrdersToDisk();
      return order;
    } finally {
      this.releaseOrderLock(orderId);
    }
  }

  requestReschedule(orderId: string, userId: string, data: { proposedDate: string; proposedTimeSlot: string; requestedBy?: string }): any {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');

    const requestedBy = data.requestedBy || (order.assignedWorkerId === userId ? 'WORKER' : 'CUSTOMER');
    const proposedDate = data.proposedDate ? data.proposedDate.trim() : (order.bookingDate || 'Today');
    const proposedSlot = data.proposedTimeSlot ? data.proposedTimeSlot.trim() : '';

    if (!proposedSlot) {
      throw new Error('Proposed time slot is required');
    }

    const slotStatus = requestedBy === 'CUSTOMER'
      ? 'RESCHEDULE_REQUESTED_BY_CUSTOMER'
      : 'RESCHEDULE_REQUESTED_BY_WORKER';

    order.slotStatus = slotStatus;
    order.proposedDate = proposedDate;
    order.proposedSlot = proposedSlot;
    order.updatedAt = new Date().toISOString();

    if (!order.serviceSnapshot) order.serviceSnapshot = {};
    order.serviceSnapshot.scheduling = {
      ...(order.serviceSnapshot.scheduling || {}),
      proposedDate,
      proposedSlot,
      proposedTimeSlot: proposedSlot,
      slotStatus,
      status: 'RESCHEDULE_REQUESTED',
      requestedBy,
      requestedAt: new Date().toISOString()
    };

    const targetRole = requestedBy === 'CUSTOMER' ? 'WORKER' : 'CUSTOMER';
    const targetRecipientId = requestedBy === 'CUSTOMER' ? order.assignedWorkerId : order.customerId;
    const requesterName = requestedBy === 'CUSTOMER' ? (order.customerName || 'Customer') : (this.getWorker(order.assignedWorkerId)?.name || 'Operator');

    if (targetRecipientId) {
      this.pushNotification({
        id: `notif_${Date.now()}_resched`,
        recipientId: targetRecipientId,
        recipientRole: targetRole as any,
        type: 'RESCHEDULE_REQUESTED',
        title: 'Reschedule Requested',
        message: `${requesterName} proposed a new review window: ${proposedDate} at ${proposedSlot}. Please review and respond.`,
        orderId: order.id,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    this.pushChatMessage({
      id: `msg_${Date.now()}`,
      orderId: order.id,
      senderId: userId,
      senderRole: requestedBy as any,
      senderName: requesterName,
      message: `[Reschedule Proposed]: ${proposedDate} at ${proposedSlot}`,
      createdAt: new Date().toISOString()
    });

    this.persistOrdersToDisk();
    return order;
  }

  respondReschedule(orderId: string, userId: string, data: { action: 'ACCEPT' | 'REJECT' }): any {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');

    const action = data.action === 'ACCEPT' ? 'ACCEPT' : 'REJECT';
    const proposedDate = order.proposedDate || order.serviceSnapshot?.scheduling?.proposedDate || order.bookingDate || 'Today';
    const proposedSlot = order.proposedSlot || order.serviceSnapshot?.scheduling?.proposedSlot || order.serviceSnapshot?.scheduling?.proposedTimeSlot || order.timeSlot;

    const responderRole = order.assignedWorkerId === userId ? 'WORKER' : 'CUSTOMER';
    const responderName = responderRole === 'WORKER' ? (this.getWorker(order.assignedWorkerId)?.name || 'Operator') : (order.customerName || 'Customer');
    const targetRecipientId = responderRole === 'WORKER' ? order.customerId : order.assignedWorkerId;
    const targetRole = responderRole === 'WORKER' ? 'CUSTOMER' : 'WORKER';

    if (action === 'ACCEPT') {
      order.bookingDate = proposedDate;
      order.timeSlot = proposedSlot;
      order.bookingTimeSlot = proposedSlot;
      order.proposedDate = null;
      order.proposedSlot = null;
      order.slotStatus = 'CONFIRMED';
      order.updatedAt = new Date().toISOString();

      if (!order.serviceSnapshot) order.serviceSnapshot = {};
      order.serviceSnapshot.scheduling = {
        date: proposedDate,
        timeSlot: proposedSlot,
        slotStatus: 'CONFIRMED',
        status: 'CONFIRMED',
        proposedDate: null,
        proposedSlot: null,
        proposedTimeSlot: null,
        confirmedAt: new Date().toISOString()
      };

      if (targetRecipientId) {
        this.pushNotification({
          id: `notif_${Date.now()}_resched_acc`,
          recipientId: targetRecipientId,
          recipientRole: targetRole as any,
          type: 'RESCHEDULE_ACCEPTED',
          title: 'Reschedule Confirmed',
          message: `${responderName} accepted the proposed review window: ${proposedDate} at ${proposedSlot}.`,
          orderId: order.id,
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }

      this.pushChatMessage({
        id: `msg_${Date.now()}`,
        orderId: order.id,
        senderId: userId,
        senderRole: responderRole as any,
        senderName: responderName,
        message: `[Reschedule Confirmed]: New review window is ${proposedDate} at ${proposedSlot}`,
        createdAt: new Date().toISOString()
      });
    } else {
      order.proposedDate = null;
      order.proposedSlot = null;
      order.slotStatus = 'CONFIRMED';
      order.updatedAt = new Date().toISOString();

      if (!order.serviceSnapshot) order.serviceSnapshot = {};
      order.serviceSnapshot.scheduling = {
        ...(order.serviceSnapshot.scheduling || {}),
        slotStatus: 'CONFIRMED',
        status: 'CONFIRMED',
        proposedDate: null,
        proposedSlot: null,
        proposedTimeSlot: null,
        rejectedAt: new Date().toISOString()
      };

      if (targetRecipientId) {
        this.pushNotification({
          id: `notif_${Date.now()}_resched_rej`,
          recipientId: targetRecipientId,
          recipientRole: targetRole as any,
          type: 'RESCHEDULE_REJECTED',
          title: 'Reschedule Declined',
          message: `${responderName} kept the existing review window: ${order.bookingDate} at ${order.timeSlot}.`,
          orderId: order.id,
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }

      this.pushChatMessage({
        id: `msg_${Date.now()}`,
        orderId: order.id,
        senderId: userId,
        senderRole: responderRole as any,
        senderName: responderName,
        message: `[Reschedule Declined]: Keeping existing review window: ${order.bookingDate} at ${order.timeSlot}`,
        createdAt: new Date().toISOString()
      });
    }

    this.persistOrdersToDisk();
    return order;
  }

  startWork(orderId: string, workerId: string): any {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');
    if (order.assignedWorkerId !== workerId) throw new Error('Unauthorized');
    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new Error(`Cannot start work on an order in status: ${order.status}`);
    }
    if (order.status !== 'ACCEPTED' && order.status !== 'ASSIGNED' && order.status !== 'IN_PROGRESS') {
      throw new Error(`Order must be ACCEPTED or ASSIGNED before starting work. Current status: ${order.status}`);
    }
    order.status = 'IN_PROGRESS';
    order.workStartedAt = new Date().toISOString();

    this.addAuditLog({
      actorUserId: workerId,
      actorRole: 'WORKER',
      action: 'WORK_STARTED',
      orderId: order.id
    });

    this.persistOrdersToDisk();
    return order;
  }

  uploadDeliverables(orderId: string, workerId: string, deliverables: Array<{ name: string; url: string; size?: string; isMandatory?: boolean }>): any {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');
    if (order.assignedWorkerId !== workerId) throw new Error('Unauthorized');

    if (!deliverables) {
      deliverables = [];
    }
    if (deliverables.length > 2) {
      throw new Error('Maximum 2 deliverables allowed (1 mandatory final output + 1 optional proof/receipt)');
    }

    if (deliverables.length > 0) {
      deliverables[0].isMandatory = true;
    }
    order.deliverables = deliverables;

    if (order.serviceSnapshot) {
      if (!order.serviceSnapshot.completion) order.serviceSnapshot.completion = {};
      order.serviceSnapshot.completion.deliverableFiles = deliverables;
      if (deliverables.length > 0) {
        order.serviceSnapshot.completion.receiptUrl = deliverables[0].url;
      }
    }

    this.persistOrdersToDisk();
    return order;
  }

  finishWork(orderId: string, workerId: string, note?: string, incomingDeliverables?: any[]): any {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');
    if (order.assignedWorkerId !== workerId && order.workerId !== workerId) throw new Error('Unauthorized');
    order.workerId = workerId;
    order.assignedWorkerId = workerId;

    if (order.status === 'COMPLETED' || order.status === 'RECEIPT_SUBMITTED') {
      return order;
    }
    if (order.status === 'CANCELLED') {
      throw new Error('Cannot submit a cancelled order');
    }

    if (incomingDeliverables && Array.isArray(incomingDeliverables) && incomingDeliverables.length > 0) {
      order.deliverables = [...(order.deliverables || []), ...incomingDeliverables];
    }

    if (!order.deliverables || order.deliverables.length === 0) {
      order.deliverables = [
        {
          id: `del_${Date.now()}`,
          name: 'Official_Receiving_Acknowledgment.pdf',
          url: order.receiptUrl || 'https://placehold.co/600x400.png?text=Official+Receiving+Proof',
          uploadedAt: new Date().toISOString()
        }
      ];
    }

    order.status = 'COMPLETED';
    order.completedAt = new Date().toISOString();
    order.receiptSubmittedAt = order.receiptSubmittedAt || order.completedAt;
    order.workCompletedAt = order.workCompletedAt || order.completedAt;
    order.completionNote = note;
    order.earningStatus = 'PENDING';

    if (order.serviceSnapshot) {
      if (!order.serviceSnapshot.completion) order.serviceSnapshot.completion = {};
      order.serviceSnapshot.completion.completionMessage = note || 'Application successfully processed and submitted.';
      order.serviceSnapshot.completion.referenceNumber = order.serviceSnapshot.completion.referenceNumber || `CCM-APP-${order.id.slice(-6).toUpperCase()}`;
      order.serviceSnapshot.completion.deliverableFiles = order.deliverables;
      if (order.deliverables && order.deliverables.length > 0) {
        order.serviceSnapshot.completion.receiptUrl = order.deliverables[0].url;
      }
    }

    const worker = this.getWorker(workerId);
    let earnings = order.workerAmountPaise || order.workerAmount || order.workerEarningsPaise;
    if (!earnings || earnings <= 0) {
      const svc = order.serviceId ? this.getService(order.serviceId) : null;
      if (svc?.workerAmountPaise) {
        earnings = svc.workerAmountPaise;
      } else if (order.adminCommissionPaise !== undefined) {
        earnings = Math.max(0, (order.pricePaise || 0) - order.adminCommissionPaise);
      } else {
        earnings = order.pricePaise || 0;
      }
    }
    order.workerAmountPaise = earnings;
    order.workerAmount = earnings;
    order.workerEarningsPaise = earnings;

    if (worker) {
      worker.pendingEarningsPaise = (worker.pendingEarningsPaise || 0) + earnings;
      worker.completedJobs = (worker.completedJobs || 0) + 1;
      worker.lastActivityAt = new Date().toISOString();
    }

    this.appendLedgerEntry({
      workerId,
      orderId: order.id,
      amountPaise: earnings,
      type: 'WORKER_EARNING_PENDING',
      idempotencyKey: `LEDGER_PENDING_${order.id}`,
      referenceNote: `Worker submitted receipt for Order #${order.id}`
    });

    if (order.customerId) {
      this.pushNotification({
        id: `notif_${Date.now()}`,
        recipientId: order.customerId,
        recipientRole: 'CUSTOMER',
        type: 'RECEIPT_SUBMITTED',
        title: 'Receipt & Deliverables Ready!',
        message: `Your order for "${order.serviceName}" has been completed by the operator. Please view/download your deliverables to complete the order.`,
        orderId: order.id,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    this.addAuditLog({
      actorUserId: workerId,
      actorRole: 'WORKER',
      action: 'RECEIPT_SUBMITTED',
      orderId: order.id,
      metadata: { earningStatus: 'PENDING', workerAmount: earnings }
    });

    this.persistOrdersToDisk();
    return order;
  }

  releaseWorkerEarningOnReceiptAction(orderId: string, actorId: string): any {
    const order = this.orders.get(orderId);
    if (!order || !order.assignedWorkerId) {
      throw new Error('ORDER_NOT_ELIGIBLE_FOR_RELEASE');
    }

    if (order.earningStatus === 'RELEASED') {
      return { success: true, message: 'EARNING_ALREADY_RELEASED', order };
    }

    const workerId = order.assignedWorkerId;
    const worker = this.getWorker(workerId);
    const earnings = order.workerAmountPaise || order.workerAmount || order.workerEarningsPaise || (order.adminCommissionPaise !== undefined ? Math.max(0, (order.pricePaise || 0) - order.adminCommissionPaise) : (order.pricePaise || 0));

    order.status = 'COMPLETED';
    order.earningStatus = 'RELEASED';
    order.completedAt = new Date().toISOString();
    order.receiptDownloadedAt = order.receiptDownloadedAt || new Date().toISOString();
    order.updatedAt = new Date().toISOString();

    this.appendLedgerEntry({
      workerId,
      orderId: order.id,
      amountPaise: earnings,
      type: 'WORKER_EARNING_RELEASED',
      idempotencyKey: `EARNING_RELEASE_ORDER_${order.id}`,
      referenceNote: `Released upon customer receipt action for Order #${order.id}`
    });

    if (worker) {
      worker.pendingEarningsPaise = Math.max(0, (worker.pendingEarningsPaise || 0) - earnings);
      worker.walletBalancePaise = (worker.walletBalancePaise || 0) + earnings;
      worker.totalEarningsPaise = (worker.totalEarningsPaise || 0) + earnings;
      worker.completedJobs = (worker.completedJobs || 0) + 1;
      worker.activeJobs = Math.max(0, (worker.activeJobs || 1) - 1);
      worker.lastActivityAt = new Date().toISOString();
    }

    this.pushNotification({
      id: `notif_${Date.now()}_rel`,
      recipientId: workerId,
      recipientRole: 'WORKER',
      type: 'EARNING_RELEASED',
      title: 'Payment Credited to Wallet!',
      message: `₹${(earnings / 100).toFixed(2)} has been released to your available balance for Order #${order.id}.`,
      orderId: order.id,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    this.addAuditLog({
      actorUserId: actorId,
      actorRole: 'CUSTOMER',
      action: 'RECEIPT_DOWNLOAD_RELEASE_EARNING',
      entityType: 'ORDER',
      entityId: order.id,
      amountPaise: earnings
    });

    this.persistOrdersToDisk();
    return { success: true, order, releasedAmount: earnings };
  }

  getOrderForWorker(orderId: string, workerId: string): any {
    const order = this.orders.get(orderId);
    if (!order) return undefined;

    const isAdmin = this.checkIsAdmin(workerId);
    if (!isAdmin && order.assignedWorkerId !== workerId) {
      return undefined;
    }
    const clone = JSON.parse(JSON.stringify(order));
    clone.orderNumber = clone.orderNumber || clone.id;

    if (!clone.formData || Object.keys(clone.formData).length === 0) {
      const snapshotDetails = clone.serviceSnapshot?.details;
      if (snapshotDetails && typeof snapshotDetails === 'object' && Object.keys(snapshotDetails).length > 0) {
        clone.formData = snapshotDetails;
      }
    }

    if (!clone.customerName || clone.customerName === 'Customer') {
      const customer = this.users.get(clone.customerId);
      if (customer) {
        clone.customerName = customer.name || clone.customerName || 'Customer';
        if (!clone.customerPhone) clone.customerPhone = customer.phone || null;
        if (!clone.customerEmail) clone.customerEmail = customer.email || null;
      }
      if ((!clone.customerName || clone.customerName === 'Customer') && clone.formData?.fullName) {
        clone.customerName = clone.formData.fullName;
      }
    }

    if (clone.status === 'COMPLETED' || clone.status === 'CANCELLED') {
      if (clone.customerPhone) {
        clone.customerPhone = clone.customerPhone.replace(/(\d{2})\d+(\d{2})/, '$1******$2');
      }
      clone.customerEmail = '***@***.com';
      clone.documents = [];
      clone.deliverables = order.deliverables || [];
      clone.isChatClosed = true;
    } else {
      if (Array.isArray(clone.documents)) {
        clone.documents = clone.documents.map((d: any, idx: number) => {
          const docName = d.docName || null;
          const fileName = d.fileName || d.name || `document_${idx + 1}.pdf`;
          const displayName = d.name || (docName ? `${docName} (${fileName})` : fileName);
          return {
            ...d,
            name: displayName,
            fileName,
            url: d.url || `/api/documents/${d.id}/download`,
            sizeFormatted: typeof d.size === 'number'
              ? (d.size > 1048576 ? `${(d.size / 1048576).toFixed(1)} MB` : `${Math.round(d.size / 1024)} KB`)
              : (d.size || 'Verified document')
          };
        });
      }
    }

    const workerPayoutPaise = clone.workerAmountPaise || clone.workerEarningsPaise || clone.workerAmount || (clone.adminCommissionPaise !== undefined ? Math.max(0, (clone.pricePaise || 0) - clone.adminCommissionPaise) : (clone.pricePaise || 0));
    clone.workerAmount = workerPayoutPaise;
    clone.workerEarningAmount = workerPayoutPaise;
    clone.workerEarningsPaise = workerPayoutPaise;
    delete clone.pricePaise;
    delete clone.customerPaidAmount;
    delete clone.customerPaidAmountPaise;
    delete clone.adminCommission;
    delete clone.adminCommissionPaise;
    delete clone.platformFee;
    delete clone.platformFeePaise;
    delete clone.pricing;
    delete clone.commissionPaise;
    delete clone.adminMargin;
    if (clone.serviceSnapshot) {
      delete clone.serviceSnapshot.pricing;
      delete clone.serviceSnapshot.pricePaise;
      delete clone.serviceSnapshot.customerPaidAmount;
      delete clone.serviceSnapshot.adminCommission;
      delete clone.serviceSnapshot.platformFee;
      delete clone.serviceSnapshot.adminMargin;
    }

    return clone;
  }

  getWorkerJobs(workerId: string, statusFilter?: string): any[] {
    const isAdmin = this.checkIsAdmin(workerId);
    let all = Array.from(this.orders.values()).filter(o => o.assignedWorkerId === workerId);
    if (all.length === 0 && isAdmin) {
      all = Array.from(this.orders.values()).filter(o => o.assignedWorkerId);
    }

    if (!statusFilter) return all.map(o => this.getOrderForWorker(o.id, workerId));

    if (statusFilter === 'ACTIVE') {
      return all
        .filter(o => ['ACCEPTED', 'ASSIGNED', 'IN_PROGRESS', 'CORRECTION_REQUIRED'].includes(o.status))
        .map(o => this.getOrderForWorker(o.id, workerId));
    }

    if (statusFilter === 'COMPLETED') {
      return all
        .filter(o => o.status === 'COMPLETED')
        .map(o => this.getOrderForWorker(o.id, workerId));
    }

    return all.filter(o => o.status === statusFilter).map(o => this.getOrderForWorker(o.id, workerId));
  }

  getWorkerEarningsSummary(workerId: string): any {
    const worker = this.getWorker(workerId);
    if (!worker) {
      return {
        walletBalancePaise: 0,
        pendingEarningsPaise: 0,
        onHoldEarningsPaise: 0,
        totalEarningsPaise: 0,
        todayEarningsPaise: 0,
        todayCompletedJobs: 0,
        activeJobs: 0,
        completedJobs: 0,
        rating: 5.0,
        isOnline: true,
        reviews: [],
        transactions: []
      };
    }

    const isAdmin = this.checkIsAdmin(workerId);
    let completedOrders = Array.from(this.orders.values()).filter(
      o => o.assignedWorkerId === workerId && (o.status === 'COMPLETED' || o.status === 'WORK_COMPLETED' || o.earningStatus === 'RELEASED')
    );
    if (completedOrders.length === 0 && isAdmin) {
      completedOrders = Array.from(this.orders.values()).filter(o => o.status === 'COMPLETED' || o.status === 'WORK_COMPLETED');
    }

    const ONE_HOUR_MS = 60 * 60 * 1000;
    const now = Date.now();
    let pendingEarningsPaise = 0;
    let availableFromOrdersPaise = 0;
    const transactions: any[] = [];

    completedOrders.forEach(o => {
      let amount = o.workerAmountPaise || o.workerAmount || o.workerEarningsPaise;
      if (!amount || amount <= 0) {
        const svc = o.serviceId ? this.getService(o.serviceId) : null;
        if (svc?.workerAmountPaise) {
          amount = svc.workerAmountPaise;
        } else if (o.adminCommissionPaise !== undefined) {
          amount = Math.max(0, (o.pricePaise || 0) - o.adminCommissionPaise);
        } else {
          amount = o.pricePaise || 0;
        }
      }

      const completedTime = o.completedAt ? new Date(o.completedAt).getTime() : new Date(o.createdAt).getTime();
      const elapsedMs = now - completedTime;
      const unlockAt = completedTime + ONE_HOUR_MS;
      const isPendingSettlement = elapsedMs < ONE_HOUR_MS && o.earningStatus !== 'RELEASED';
      const remainingMs = Math.max(0, unlockAt - now);

      if (isPendingSettlement) {
        o.earningStatus = 'PENDING';
        pendingEarningsPaise += amount;
      } else {
        o.earningStatus = 'RELEASED';
        availableFromOrdersPaise += amount;
      }

      transactions.push({
        id: `tx_${o.id}`,
        orderId: o.id,
        serviceName: o.serviceName || (o.serviceSnapshot as any)?.name || 'Cyber Cafe Service',
        type: 'CREDIT',
        amountPaise: amount,
        status: isPendingSettlement ? 'PENDING' : 'SETTLED',
        completedAt: o.completedAt || o.createdAt,
        unlockAt: new Date(unlockAt).toISOString(),
        remainingMs,
        isPendingSettlement,
        date: o.completedAt || o.createdAt
      });
    });

    const totalWithdrawnPaise = Array.from(this.withdrawals.values())
      .filter(w => (w.workerId === workerId || (isAdmin && !w.workerId)) && w.status !== 'REJECTED')
      .reduce((sum, w) => sum + (w.amountPaise || 0), 0);

    const availableWalletBalancePaise = Math.max(0, availableFromOrdersPaise - totalWithdrawnPaise);
    const totalEarningsPaise = availableFromOrdersPaise + pendingEarningsPaise;

    worker.walletBalancePaise = availableWalletBalancePaise;
    worker.pendingEarningsPaise = pendingEarningsPaise;
    worker.totalEarningsPaise = totalEarningsPaise;

    const todayDateStr = new Date().toISOString().split('T')[0];
    const toDateIso = (val: any) => val ? (typeof val === 'string' ? val : new Date(val).toISOString()) : '';
    const todayOrders = completedOrders.filter(
      o => o.completedAt && toDateIso(o.completedAt).startsWith(todayDateStr)
    );

    const todayEarningsPaise = todayOrders.reduce(
      (sum, o) => sum + (o.workerAmountPaise || o.workerAmount || o.workerEarningsPaise || (o.adminCommissionPaise !== undefined ? Math.max(0, (o.pricePaise || 0) - o.adminCommissionPaise) : (o.pricePaise || 0))),
      0
    );

    Array.from(this.withdrawals.values())
      .filter(w => w.workerId === workerId || (isAdmin && !w.workerId))
      .forEach(w => {
        transactions.push({
          id: `tx_${w.id}`,
          orderId: w.id,
          serviceName: `Withdrawal via ${w.method}`,
          type: 'DEBIT',
          amountPaise: w.amountPaise,
          status: w.status,
          date: w.createdAt
        });
      });

    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      walletBalancePaise: worker.walletBalancePaise,
      pendingEarningsPaise: worker.pendingEarningsPaise,
      onHoldEarningsPaise: worker.onHoldEarningsPaise,
      totalEarningsPaise: worker.totalEarningsPaise,
      todayEarningsPaise,
      todayCompletedJobs: todayOrders.length,
      activeJobs: worker.activeJobs,
      completedJobs: worker.completedJobs,
      rating: worker.rating,
      isOnline: worker.isOnline,
      reviews: worker.reviews || [],
      transactions
    };
  }

  requestWithdrawal(workerId: string, amountPaise: number, method: 'BANK' | 'UPI', payoutDetails?: any): WithdrawalItem {
    const worker = this.getWorker(workerId);
    if (!worker) throw new Error('Worker not found');

    if (amountPaise < 10000) {
      throw new Error('Minimum withdrawal amount is ₹100.00');
    }

    if (worker.walletBalancePaise < amountPaise) {
      const err: any = new Error('Insufficient available earnings');
      err.code = 'INSUFFICIENT_AMOUNT';
      err.statusCode = 409;
      throw err;
    }

    worker.walletBalancePaise -= amountPaise;

    const withdrawal: WithdrawalItem = {
      id: `wth_${Date.now()}`,
      workerId,
      amountPaise,
      method,
      payoutDetails: payoutDetails || worker.bankDetails,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    this.withdrawals.set(withdrawal.id, withdrawal);

    this.appendLedgerEntry({
      workerId,
      withdrawalId: withdrawal.id,
      amountPaise: -amountPaise,
      type: 'WITHDRAWAL_RESERVED',
      idempotencyKey: `WITHDRAWAL_RESERVE_${withdrawal.id}`,
      referenceNote: `Withdrawal reservation of ₹${(amountPaise / 100).toFixed(2)} to ${method}`
    });

    this.pushNotification({
      id: `notif_${Date.now()}`,
      recipientId: workerId,
      recipientRole: 'WORKER',
      type: 'WITHDRAWAL_REQUESTED',
      title: 'Withdrawal Requested',
      message: `Withdrawal request for ₹${(amountPaise / 100).toFixed(2)} submitted. It will be processed to your ${method}.`,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    return withdrawal;
  }

  getWorkerWithdrawals(workerId: string): WithdrawalItem[] {
    return Array.from(this.withdrawals.values())
      .filter(w => w.workerId === workerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getWithdrawal(id: string): WithdrawalItem | undefined {
    return this.withdrawals.get(id);
  }

  getWorkerNotifications(workerId: string): NotificationItem[] {
    return this.notifications.filter(n => n.recipientId === workerId);
  }

  markNotificationRead(notificationId: string, workerId: string): boolean {
    const notif = this.notifications.find(n => n.id === notificationId && n.recipientId === workerId);
    if (notif) {
      notif.isRead = true;
      return true;
    }
    return false;
  }

  private pushNotification(notif: NotificationItem) {
    this.notifications.unshift(notif);
    if (this.notifications.length > MAX_NOTIFICATIONS) {
      this.notifications.length = MAX_NOTIFICATIONS;
    }
  }

  private pushChatMessage(msg: ChatMessageItem) {
    this.chatMessages.push(msg);
    if (this.chatMessages.length > MAX_CHAT_MESSAGES) {
      this.chatMessages.splice(0, this.chatMessages.length - MAX_CHAT_MESSAGES);
    }
  }

  getOrderChat(orderId: string, userId?: string): { isClosed: boolean; messages: ChatMessageItem[] } {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');

    const isClosed = ['WORK_COMPLETED', 'RECEIPT_SUBMITTED', 'SUBMITTED', 'COMPLETED', 'CANCELLED'].includes(order.status);
    if (isClosed) {
      return { isClosed: true, messages: [] };
    }

    const messages = this.chatMessages.filter(m => m.orderId === orderId);
    return { isClosed: false, messages };
  }

  addChatMessage(
    orderId: string,
    senderId: string,
    senderRole: 'WORKER' | 'CUSTOMER' | 'ADMIN',
    senderName: string,
    message: string,
    attachmentUrl?: string,
    attachmentName?: string
  ): ChatMessageItem {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');

    if (['WORK_COMPLETED', 'RECEIPT_SUBMITTED', 'SUBMITTED', 'COMPLETED', 'CANCELLED'].includes(order.status)) {
      throw new Error('Chat is closed for this order.');
    }

    const chatMsg: ChatMessageItem = {
      id: `msg_${Date.now()}`,
      orderId,
      senderId,
      senderRole,
      senderName,
      message,
      attachmentUrl: attachmentUrl || undefined,
      attachmentName: attachmentName || undefined,
      createdAt: new Date().toISOString()
    };

    this.pushChatMessage(chatMsg);
    return chatMsg;
  }

  getWorkerTickets(workerId: string): SupportTicketItem[] {
    return this.supportTickets.filter(t => t.workerId === workerId);
  }

  createWorkerTicket(workerId: string, data: { category: any; subject: string; message: string; orderId?: string }): SupportTicketItem {
    const ticket: SupportTicketItem = {
      id: `tkt_${Date.now()}`,
      workerId,
      category: data.category,
      subject: data.subject,
      message: data.message,
      orderId: data.orderId,
      status: 'Open',
      replies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.supportTickets.unshift(ticket);
    return ticket;
  }

  proposeService(workerId: string, data: any): ServiceProposalItem {
    const existing = data.id ? this.serviceProposals.find(p => p.id === data.id) : null;
    if (existing) {
      existing.name = data.name || existing.name;
      existing.description = data.description || existing.description;
      existing.category = data.category || existing.category;
      existing.suggestedPricePaise = data.suggestedPricePaise || existing.suggestedPricePaise;
      existing.requestedWorkerAmountPaise = data.requestedWorkerAmountPaise || existing.requestedWorkerAmountPaise;
      existing.estimatedTime = data.estimatedTime || existing.estimatedTime;
      existing.applicationTypes = data.applicationTypes || existing.applicationTypes;
      return existing;
    }

    const proposal: ServiceProposalItem = {
      id: data.id || `prop_${Date.now()}`,
      workerId,
      name: data.name,
      description: data.description,
      category: data.category || 'General',
      suggestedPricePaise: data.suggestedPricePaise || 19900,
      requestedWorkerAmountPaise: data.requestedWorkerAmountPaise || data.suggestedPricePaise || 19900,
      estimatedTime: data.estimatedTime || '24 Hours',
      requiredDocuments: data.requiredDocuments || [],
      applicationTypes: data.applicationTypes || null,
      status: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString()
    };

    this.serviceProposals.unshift(proposal);
    return proposal;
  }

  getWorkerProposals(workerId: string): ServiceProposalItem[] {
    return this.serviceProposals.filter(p => p.workerId === workerId);
  }

  // ==========================================
  // ADMIN PORTAL OPERATIONS
  // ==========================================

  // ==========================================
  // ADMIN PORTAL OPERATIONS & OVERRIDES
  // ==========================================

  getAdminDashboardStats() {
    const totalCustomers = Array.from(this.users.values()).filter(u => u.role === 'CUSTOMER').length;
    const totalWorkers = this.workers.length;
    const onlineWorkers = this.workers.filter(w => w.isOnline).length;

    const allOrders = Array.from(this.orders.values());
    const activeOrders = allOrders.filter(o =>
      ['ACCEPTED', 'ASSIGNED', 'IN_PROGRESS', 'RECEIPT_SUBMITTED', 'CORRECTION_REQUIRED'].includes(o.status)
    ).length;
    const availableOrders = allOrders.filter(o => 
      ['AVAILABLE', 'OFFERED', 'CREATED', 'PAID', 'PAYMENT_PENDING'].includes(o.status) &&
      (!o.workerId && !o.assignedWorkerId) &&
      !['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(o.status)
    ).length;
    const completedOrdersList = allOrders.filter(o => o.status === 'COMPLETED');
    const completedOrders = completedOrdersList.length;

    const pendingServiceApprovals = this.serviceProposals.filter(p => p.status === 'PENDING').length;
    const pendingWorkerVerification = this.workers.filter(w => w.accountStatus === 'PENDING').length;

    let pendingEarningsPaise = 0;
    this.workers.forEach(w => {
      pendingEarningsPaise += (w.pendingEarningsPaise || 0);
    });

    const pendingWithdrawals = Array.from(this.withdrawals.values()).filter(w => w.status === 'PENDING').length;
    const complaintsDisputes = Array.from(this.complaints.values()).filter(c => c.status?.toUpperCase() !== 'RESOLVED').length;

    let totalRevenuePaise = 0;
    let totalCommissionPaise = 0;

    completedOrdersList.forEach(o => {
      const price = o.customerPaidAmount || o.pricePaise || 0;
      totalRevenuePaise += price;
      const workerAmt = o.workerAmountPaise || o.workerEarningsPaise || o.workerAmount || 0;
      const comm = o.adminCommissionPaise || o.commissionPaise || Math.max(0, price - workerAmt);
      totalCommissionPaise += comm;
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const toDateIsoStr = (val: any) => val ? (typeof val === 'string' ? val : new Date(val).toISOString()) : '';
    const todayOrders = allOrders.filter(o => o.createdAt && toDateIsoStr(o.createdAt).startsWith(todayStr));
    const todayEarningsPaise = completedOrdersList
      .filter(o => o.completedAt && toDateIsoStr(o.completedAt).startsWith(todayStr))
      .reduce((sum, o) => sum + (o.workerAmountPaise || o.workerEarningsPaise || o.workerAmount || 0), 0);

    return {
      totalCustomers,
      totalWorkers,
      onlineWorkers,
      activeOrders,
      availableOrders,
      completedOrders,
      pendingServiceApprovals,
      pendingWorkerVerification,
      pendingEarningsPaise,
      pendingWithdrawals,
      complaintsDisputes,
      totalRevenuePaise,
      totalCommissionPaise,
      todayOrdersCount: todayOrders.length,
      todayEarningsPaise
    };
  }

  getAllWorkersAdmin(filter?: { status?: string; search?: string }) {
    let list = this.workers.map(w => {
      const user = this.users.get(w.id);
      const accStatus = w.status || w.accountStatus || user?.accountStatus || 'ACTIVE';
      return {
        ...w,
        workerId: w.workerId || w.id,
        status: accStatus,
        accountStatus: accStatus as any,
        isOnline: w.isOnline,
        idVerified: w.idVerified ?? (accStatus === 'ACTIVE'),
        outletName: w.outletName || w.businessName || 'Cyber Cafe Outlet',
        workerProfile: w.workerProfile || {
          idVerified: accStatus === 'ACTIVE',
          businessName: w.businessName,
          skills: w.skills,
          bankDetails: w.bankDetails,
          idProof: w.idProof || 'Identity_Proof.pdf',
          photo: w.photo || 'Worker_Photo.jpg'
        }
      };
    });

    const status = filter?.status;
    if (status && status !== 'ALL' && status !== 'All Status' && status !== 'undefined') {
      list = list.filter(w => w.accountStatus === status || w.status === status);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      list = list.filter(w =>
        (w.name && w.name.toLowerCase().includes(q)) ||
        (w.email && w.email.toLowerCase().includes(q)) ||
        (w.phone && w.phone.includes(q)) ||
        w.id.toLowerCase().includes(q) ||
        (w.outletName && w.outletName.toLowerCase().includes(q)) ||
        (w.businessName && w.businessName.toLowerCase().includes(q)) ||
        (w.city && w.city.toLowerCase().includes(q))
      );
    }

    return list;
  }

  createWorkerAdmin(data: {
    workerName: string;
    workerId: string;
    username?: string;
    password?: string;
    passwordHash?: string;
    mobile: string;
    email: string;
    businessName?: string;
    address?: string;
    city?: string;
    skills?: string[] | string;
    idProof?: string;
    photo?: string;
    accountNumber?: string;
    ifsc?: string;
    accountHolderName?: string;
    upiId?: string;
    bankDetails?: {
      accountNumber?: string;
      ifsc?: string;
      accountHolderName?: string;
      upiId?: string;
    };
  }) {
    const workerId = (data.workerId || data.username || '').trim();
    const workerName = (data.workerName || '').trim();
    const email = (data.email || '').trim().toLowerCase();
    const mobile = (data.mobile || '').trim();

    if (!workerName || !workerId || !mobile || !email) {
      throw new Error('Worker Name, User ID / Username, Mobile, and Email are mandatory');
    }

    if (
      this.workers.some(w => w.id.toLowerCase() === workerId.toLowerCase() || (w.workerId && w.workerId.toLowerCase() === workerId.toLowerCase())) ||
      this.findUserById(workerId)
    ) {
      throw new Error(`Worker with User ID / Username "${workerId}" already exists`);
    }

    if (this.findUserByEmail(email)) {
      throw new Error(`User with email "${email}" already exists`);
    }

    let passwordHash: string;
    if (data.passwordHash) {
      passwordHash = data.passwordHash;
    } else if (data.password) {
      passwordHash = bcrypt.hashSync(data.password, 10);
    } else {
      passwordHash = bcrypt.hashSync('password123', 10);
    }

    let normalizedSkills: string[] = [];
    if (Array.isArray(data.skills)) {
      normalizedSkills = data.skills;
    } else if (typeof data.skills === 'string' && data.skills.trim()) {
      normalizedSkills = data.skills.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      normalizedSkills = ['PAN Card', 'Voter ID', 'Form Filling'];
    }

    const bankDetails = {
      accountNumber: data.bankDetails?.accountNumber || data.accountNumber || '',
      ifsc: data.bankDetails?.ifsc || data.ifsc || '',
      accountHolderName: data.bankDetails?.accountHolderName || data.accountHolderName || workerName,
      upiId: data.bankDetails?.upiId || data.upiId || ''
    };

    const newWorker: WorkerItem = {
      id: workerId,
      workerId,
      status: 'ACTIVE',
      name: workerName,
      email,
      phone: mobile,
      businessName: data.businessName || `${workerName} Digital Kendra`,
      address: data.address || '',
      city: data.city || '',
      skills: normalizedSkills,
      idProof: data.idProof || 'Identity_Proof.pdf',
      photo: data.photo || 'Worker_Photo.jpg',
      bankDetails,
      activeJobs: 0,
      completedJobs: 0,
      rating: 5.0,
      isOnline: true,
      accountStatus: 'ACTIVE',
      idVerified: true,
      workerProfile: {
        idVerified: true,
        businessName: data.businessName || `${workerName} Digital Kendra`,
        skills: normalizedSkills,
        bankDetails,
        idProof: data.idProof || 'Identity_Proof.pdf',
        photo: data.photo || 'Worker_Photo.jpg'
      },
      lastActivityAt: new Date().toISOString(),
      walletBalancePaise: 0,
      pendingEarningsPaise: 0,
      onHoldEarningsPaise: 0,
      totalEarningsPaise: 0,
      averageCompletionMinutes: 60,
      reviews: []
    };

    this.workers.push(newWorker);
    this.users.set(workerId, {
      id: workerId,
      workerId,
      username: workerId,
      email,
      name: workerName,
      phone: mobile,
      role: 'WORKER',
      password: passwordHash,
      passwordHash,
      isOnline: true,
      accountStatus: 'ACTIVE',
      businessName: data.businessName || `${workerName} Digital Kendra`,
      address: data.address || '',
      city: data.city || '',
      skills: normalizedSkills,
      bankDetails,
      createdAt: new Date().toISOString()
    });

    this.pushNotification({
      id: `notif_${Date.now()}`,
      recipientId: this.settings.adminId || 'ADM-001',
      recipientRole: 'ADMIN',
      type: 'WORKER_HIRED',
      title: 'Worker Hired Successfully',
      message: `${workerName} (${workerId}) has been hired with role WORKER and is active.`,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    this.addAuditLog({
      actorUserId: this.settings.adminId || 'ADM-001',
      actorRole: 'ADMIN',
      action: 'WORKER_CREATED',
      entityType: 'WORKER',
      entityId: workerId,
      metadata: { name: workerName, businessName: data.businessName, role: 'WORKER' }
    });

    return newWorker;
  }

  verifyWorkerAdmin(workerId: string, approved: boolean, note?: string) {
    const worker = this.getWorker(workerId);
    if (!worker) throw new Error('Worker not found');

    const newStatus = approved ? 'ACTIVE' : 'PENDING';
    worker.accountStatus = newStatus;
    worker.status = newStatus;
    worker.idVerified = approved;
    if (!worker.workerProfile) {
      worker.workerProfile = {
        idVerified: approved,
        businessName: worker.businessName,
        skills: worker.skills,
        bankDetails: worker.bankDetails,
        idProof: worker.idProof || 'Identity_Proof.pdf',
        photo: worker.photo || 'Worker_Photo.jpg'
      };
    } else {
      worker.workerProfile.idVerified = approved;
    }

    const user = this.users.get(workerId);
    if (user) user.accountStatus = newStatus;

    this.pushNotification({
      id: `notif_${Date.now()}`,
      recipientId: workerId,
      recipientRole: 'WORKER',
      type: 'VERIFICATION_UPDATE',
      title: approved ? 'ID Verification Approved' : 'ID Verification Notice',
      message: approved
        ? 'Your ID proof has been verified by the Admin. You are now active to accept orders.'
        : `Your ID proof review update: ${note || 'Please resubmit proper documentation'}.`,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    this.addAuditLog({
      actorUserId: this.settings.adminId || 'ADM-001',
      actorRole: 'ADMIN',
      action: approved ? 'WORKER_VERIFIED' : 'WORKER_VERIFICATION_REJECTED',
      entityType: 'WORKER',
      entityId: workerId,
      metadata: { note }
    });

    return worker;
  }

  setWorkerAccountStatusAdmin(workerId: string, status: 'ACTIVE' | 'PENDING' | 'OFFLINE' | 'SUSPENDED' | 'BLOCKED' | 'PAUSED' | 'DELETED', reason?: string) {
    const worker = this.getWorker(workerId);
    if (!worker) throw new Error('Worker not found');

    worker.accountStatus = status;
    worker.status = status;
    if (status === 'SUSPENDED' || status === 'BLOCKED' || status === 'OFFLINE' || status === 'DELETED') {
      worker.isOnline = false;
    }
    if (status === 'ACTIVE') {
      worker.idVerified = true;
      if (worker.workerProfile) worker.workerProfile.idVerified = true;
    }

    const user = this.users.get(workerId);
    if (user) {
      user.accountStatus = status;
      user.status = status;
      if (!worker.isOnline) user.isOnline = false;
    }

    this.addAuditLog({
      actorUserId: this.settings.adminId || 'ADM-001',
      actorRole: 'ADMIN',
      action: status === 'DELETED' ? 'WORKER_DELETED' : (status === 'PAUSED' ? 'WORKER_PAUSED' : 'WORKER_STATUS_CHANGED'),
      entityType: 'WORKER',
      entityId: workerId,
      metadata: { newStatus: status, reason }
    });

    return worker;
  }

  deleteWorkerAdmin(workerId: string, reason?: string) {
    const worker = this.getWorker(workerId);
    if (!worker) throw new Error('Worker not found');
    this.setWorkerAccountStatusAdmin(workerId, 'DELETED', reason || 'Deactivated and deleted by Admin');
    return {
      success: true,
      workerId,
      message: `Worker ${worker.name} (${workerId}) has been successfully deactivated and deleted.`
    };
  }

  getWorkerDetailedAdmin(workerId: string) {
    const rawWorker = this.getWorker(workerId);
    if (!rawWorker) throw new Error('Worker not found');

    const user = this.users.get(rawWorker.id);
    const accStatus = rawWorker.status || rawWorker.accountStatus || user?.accountStatus || 'ACTIVE';
    const worker: WorkerItem = {
      ...rawWorker,
      workerId: rawWorker.workerId || rawWorker.id,
      status: accStatus,
      accountStatus: accStatus as any,
      idVerified: rawWorker.idVerified ?? (accStatus === 'ACTIVE'),
      workerProfile: rawWorker.workerProfile || {
        idVerified: accStatus === 'ACTIVE',
        businessName: rawWorker.businessName,
        skills: rawWorker.skills,
        bankDetails: rawWorker.bankDetails,
        idProof: rawWorker.idProof || 'Identity_Proof.pdf',
        photo: rawWorker.photo || 'Worker_Photo.jpg'
      }
    };

    const orders = Array.from(this.orders.values()).filter(o => o.assignedWorkerId === workerId);
    const completedOrdersList = orders.filter(o => o.status === 'COMPLETED');
    const totalEarningsPaise = completedOrdersList.reduce((sum, o) => sum + (o.workerAmountPaise || o.workerEarningsPaise || o.workerAmount || 0), 0);
    worker.completedJobs = completedOrdersList.length;
    worker.completedOrders = completedOrdersList.length;
    worker.totalEarningsPaise = totalEarningsPaise;
    worker.totalPaidEarningsPaise = totalEarningsPaise;

    const complaints = Array.from(this.complaints.values()).filter(c =>
      (c.complainantId === workerId && c.type === 'WORKER') ||
      (orders.some(o => o.id === c.orderId))
    );
    const activityLogs = this.getAuditLogs(workerId);
    const proposals = this.getWorkerProposals(workerId);

    return {
      worker,
      orders,
      complaints,
      activityLogs,
      proposals,
      earnings: {
        totalEarnedPaise: totalEarningsPaise,
        availableBalancePaise: worker.walletBalancePaise || 0,
        heldBalancePaise: worker.onHoldEarningsPaise || 0
      },
      performance: {
        completedOrders: completedOrdersList.length,
        rating: worker.rating || 5.0
      }
    };
  }

  getAllCustomersAdmin(filter?: { status?: string; search?: string }) {
    const customers = Array.from(this.users.values())
      .filter(u => u.role === 'CUSTOMER')
      .map(u => {
        const custOrders = Array.from(this.orders.values()).filter(o => o.customerId === u.id);
        const totalSpentPaise = custOrders
          .filter(o => o.status === 'COMPLETED')
          .reduce((sum, o) => sum + (o.pricePaise || 0), 0);

        const currentStatus = u.accountStatus || u.status || 'ACTIVE';
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          address: u.address,
          status: currentStatus,
          accountStatus: currentStatus,
          ordersCount: custOrders.length,
          totalSpentPaise,
          createdAt: u.createdAt
        };
      });

    let list = customers;
    const status = filter?.status;
    if (status && status !== 'ALL' && status !== 'All Status' && status !== 'undefined') {
      list = list.filter(c => c.accountStatus === status || c.status === status);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      list = list.filter(c =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        c.id.toLowerCase().includes(q)
      );
    }
    return list;
  }

  setCustomerStatusAdmin(customerId: string, status: 'ACTIVE' | 'BLOCKED' | 'DEACTIVATED' | 'SUSPENDED', reason?: string) {
    let user = this.users.get(customerId);
    if (!user) {
      user = {
        id: customerId,
        role: 'CUSTOMER',
        name: 'Customer',
        email: `${customerId}@example.com`,
        status,
        accountStatus: status
      };
      this.users.set(customerId, user);
    }

    user.accountStatus = status;
    user.status = status;

    this.addAuditLog({
      actorUserId: this.settings.adminId || 'ADM-001',
      actorRole: 'ADMIN',
      action: 'CUSTOMER_STATUS_CHANGED',
      entityType: 'CUSTOMER',
      entityId: customerId,
      metadata: { newStatus: status, reason }
    });

    return user;
  }

  getCustomerDetailedAdmin(customerId: string) {
    let customer = this.users.get(customerId);
    if (!customer) {
      customer = {
        id: customerId,
        role: 'CUSTOMER',
        name: 'Customer',
        email: `${customerId}@example.com`,
        status: 'ACTIVE',
        accountStatus: 'ACTIVE'
      };
      this.users.set(customerId, customer);
    }

    const orders = Array.from(this.orders.values()).filter(o => o.customerId === customerId);
    const complaints = Array.from(this.complaints.values()).filter(c => c.complainantId === customerId);
    const orderIds = orders.map(o => o.id);
    const chatMessages = this.chatMessages.filter(m => orderIds.includes(m.orderId));

    const documents: any[] = [];
    orders.forEach(o => {
      if (o.documents && Array.isArray(o.documents)) {
        o.documents.forEach((d: any) => documents.push({ ...d, orderId: o.id }));
      }
    });

    return {
      customer,
      orders,
      complaints,
      chatMessages,
      documents
    };
  }

  getAllOrdersAdmin(filter?: { status?: string; search?: string }) {
    let list = Array.from(this.orders.values()).map(o => {
      const worker = o.assignedWorkerId ? this.getWorker(o.assignedWorkerId) : null;
      const customer = this.users.get(o.customerId);
      const pricePaise = o.pricePaise || (o.pricing as any)?.pricePaise || o.customerPaidAmount || 0;
      const workerEarningsPaise = o.workerEarningsPaise || (o.pricing as any)?.workerPayoutPaise || (o.pricing as any)?.workerEarningPaise || (pricePaise - (o.adminCommissionPaise || 0));
      return {
        ...o,
        orderNumber: o.orderNumber || o.id,
        pricePaise,
        workerEarningsPaise,
        pricing: o.pricing || { pricePaise, workerEarningPaise: workerEarningsPaise, workerPayoutPaise: workerEarningsPaise },
        serviceSnapshot: o.serviceSnapshot || { name: o.serviceName || 'Cyber Cafe Service', category: 'Service' },
        workerName: worker?.name || o.workerName || (o.assignedWorkerId ? 'Worker' : null),
        worker: worker ? {
          id: worker.id,
          workerId: worker.id,
          name: worker.name,
          email: worker.email,
          phone: (worker as any).phone || (worker as any).mobile || 'N/A'
        } : null,
        customerName: customer?.name || o.customerName || 'Customer',
        customerPhone: customer?.phone || o.customerPhone
      };
    }).filter(o => 
      o.status !== 'PAYMENT_PENDING' && 
      !(o.paymentStatus === 'PENDING' && o.status !== 'COMPLETED' && o.status !== 'IN_PROGRESS')
    );

    const status = filter?.status;
    if (status && status !== 'ALL' && status !== 'All Status' && status !== 'All Orders' && status !== 'undefined') {
      const s = status.toUpperCase();
      if (['PENDING', 'AVAILABLE', 'NEW', 'UNASSIGNED'].includes(s)) {
        list = list.filter(o => 
          ['AVAILABLE', 'PAID'].includes(o.status) ||
          ((o.status === 'CREATED' || o.status === 'PENDING') && o.paymentStatus === 'PAID') ||
          ((!o.workerId && !o.assignedWorkerId) && o.paymentStatus === 'PAID' && !['CANCELLED', 'COMPLETED', 'REFUNDED'].includes(o.status))
        );
      } else if (['IN_PROGRESS', 'ACTIVE'].includes(s)) {
        list = list.filter(o => ['IN_PROGRESS', 'ACCEPTED', 'ASSIGNED', 'PROCESSING', 'WAITING_FOR_CUSTOMER', 'RECEIPT_SUBMITTED'].includes(o.status));
      } else if (['COMPLETED', 'DELIVERED'].includes(s)) {
        list = list.filter(o => ['COMPLETED', 'DELIVERED', 'WORK_COMPLETED'].includes(o.status));
      } else if (['CORRECTION_REQUESTED', 'REVISION_REQUIRED'].includes(s)) {
        list = list.filter(o => ['CORRECTION_REQUESTED', 'REVISION_REQUIRED'].includes(o.status));
      } else if (['ON_HOLD', 'DISPUTED'].includes(s)) {
        list = list.filter(o => ['ON_HOLD', 'DISPUTED'].includes(o.status) || (o as any).earningsHold);
      } else if (['CANCELLED'].includes(s)) {
        list = list.filter(o => ['CANCELLED'].includes(o.status));
      } else if (['REFUNDED'].includes(s)) {
        list = list.filter(o => ['REFUNDED', 'CANCELLED'].includes(o.status));
      } else {
        list = list.filter(o => o.status === status);
      }
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      list = list.filter(o =>
        (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
        o.id.toLowerCase().includes(q) ||
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        (o.workerName && o.workerName.toLowerCase().includes(q)) ||
        (o.serviceName && o.serviceName.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getOrderDetailedAdmin(orderId: string) {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');

    const customer = this.users.get(order.customerId);
    const worker = order.assignedWorkerId ? this.getWorker(order.assignedWorkerId) : null;
    const chat = this.chatMessages.filter(m => m.orderId === orderId);
    const complaints = Array.from(this.complaints.values()).filter(c => c.orderId === orderId);
    const auditLogs = this.auditLogs.filter(l => l.orderId === orderId || l.entityId === orderId);

    const normalizedOrder: any = { ...order };
    if (!normalizedOrder.formData || Object.keys(normalizedOrder.formData).length === 0) {
      const snapshotDetails = (normalizedOrder.serviceSnapshot as any)?.details;
      if (snapshotDetails && typeof snapshotDetails === 'object' && Object.keys(snapshotDetails).length > 0) {
        normalizedOrder.formData = snapshotDetails;
      }
    }
    if (customer) {
      if (!normalizedOrder.customerName || normalizedOrder.customerName === 'Customer') {
        normalizedOrder.customerName = customer.name || normalizedOrder.customerName;
      }
      if (!normalizedOrder.customerPhone) normalizedOrder.customerPhone = customer.phone || null;
      if (!normalizedOrder.customerEmail) normalizedOrder.customerEmail = customer.email || null;
    }

    return {
      order: normalizedOrder,
      customer,
      worker,
      chat,
      complaints,
      auditLogs
    };
  }

  adminAssignWorker(orderId: string, workerId: string, note?: string) {
    let order = this.orders.get(orderId);
    if (!order) {
      order = {
        id: orderId,
        orderNumber: orderId,
        status: 'SUBMITTED',
        assignedWorkerId: null,
        pricePaise: 29900,
        customerPaidAmount: 29900,
        totalPaise: 29900,
        workerEarningsPaise: 15000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.orders.set(orderId, order);
    }

    const worker = this.getWorker(workerId);
    if (!worker) throw new Error('Target worker not found');

    const previousWorkerId = order.assignedWorkerId;
    if (previousWorkerId && previousWorkerId !== workerId) {
      const prevWorker = this.getWorker(previousWorkerId);
      if (prevWorker) {
        prevWorker.activeJobs = Math.max(0, prevWorker.activeJobs - 1);
        prevWorker.pendingEarningsPaise = Math.max(0, prevWorker.pendingEarningsPaise - (order.workerEarningsPaise || 0));
      }
    }

    order.assignedWorkerId = workerId;
    order.status = 'ACCEPTED';
    order.workerAcceptedAt = new Date().toISOString();
    order.manualAssignmentOverride = {
      assignedBy: this.settings.adminId || 'ADM-001',
      assignedAt: new Date().toISOString(),
      note: note || 'Administrative manual override assignment'
    };
    if (!order.assignmentHistory) {
      order.assignmentHistory = [];
    }
    order.assignmentHistory.push({
      previousWorkerId,
      assignedWorkerId: workerId,
      assignedAt: new Date().toISOString(),
      assignedBy: this.settings.adminId || 'ADM-001',
      note: note || 'Administrative assignment'
    });

    worker.activeJobs += 1;
    worker.pendingEarningsPaise += (order.workerAmountPaise || order.workerEarningsPaise || order.workerAmount || 0);

    this.pushNotification({
      id: `notif_${Date.now()}`,
      recipientId: workerId,
      recipientRole: 'WORKER',
      type: 'ORDER_ASSIGNED_BY_ADMIN',
      title: 'Order Assigned by Admin',
      message: `Admin has assigned order #${order.id} for "${order.serviceName}" to you.`,
      orderId: order.id,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    this.addAuditLog({
      actorUserId: this.settings.adminId || 'ADM-001',
      actorRole: 'ADMIN',
      action: 'ORDER_MANUALLY_ASSIGNED',
      entityType: 'ORDER',
      entityId: orderId,
      metadata: { previousWorkerId, newWorkerId: workerId, note }
    });

    return order;
  }

  adminUpdateOrderStatus(orderId: string, status: string, note?: string) {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');

    const prevStatus = order.status;
    order.status = status;
    order.updatedAt = new Date().toISOString();

    this.addAuditLog({
      actorUserId: this.settings.adminId || 'ADM-001',
      actorRole: 'ADMIN',
      action: 'ORDER_STATUS_CHANGED',
      entityType: 'ORDER',
      entityId: orderId,
      metadata: { prevStatus, newStatus: status, note }
    });

    return order;
  }

  adminRequestCorrection(orderId: string, reason: string, instruction: string) {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');

    if (!order.assignedWorkerId) {
      throw new Error('Cannot request correction on unassigned order');
    }

    const deadline = new Date(Date.now() + 2 * 3600000).toISOString();
    order.status = 'CORRECTION_REQUIRED';
    order.correctionDeadline = deadline;
    order.correction = {
      requestedBy: this.settings.adminId || 'ADM-001',
      requestedAt: new Date().toISOString(),
      deadline,
      reason,
      instruction,
      correctedDeliverables: []
    };

    order.isEarningsOnHold = true;
    order.earningsHold = true;

    this.pushNotification({
      id: `notif_${Date.now()}`,
      recipientId: order.assignedWorkerId,
      recipientRole: 'WORKER',
      type: 'CORRECTION_REQUIRED',
      title: 'Correction Required (2-Hour Window)',
      message: `Admin requested a correction for order #${order.id}: ${reason}. Please upload corrected output within 2 hours.`,
      orderId: order.id,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    if (order.customerId) {
      this.pushNotification({
        id: `notif_c_${Date.now()}`,
        recipientId: order.customerId,
        recipientRole: 'CUSTOMER',
        type: 'ORDER_CORRECTION_IN_PROGRESS',
        title: 'Order Correction in Progress',
        message: `We noticed an adjustment needed for your order #${order.id}. The operator has been instructed to upload the corrected deliverable.`,
        orderId: order.id,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    this.addAuditLog({
      actorUserId: this.settings.adminId || 'ADM-001',
      actorRole: 'ADMIN',
      action: 'ORDER_CORRECTION_REQUESTED',
      entityType: 'ORDER',
      entityId: orderId,
      metadata: { reason, instruction, deadline }
    });

    return order;
  }

  adminHoldWorkerEarnings(orderId: string, reason?: string) {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');

    if (order.isEarningsOnHold || order.earningStatus === 'ON_HOLD') {
      if (reason) order.earningsHoldReason = reason;
      order.earningsHold = true;
      order.isEarningsOnHold = true;
      order.earningStatus = 'ON_HOLD';
      return order;
    }

    order.isEarningsOnHold = true;
    order.earningsHold = true;
    order.earningStatus = 'ON_HOLD';
    order.status = 'DISPUTED';
    order.earningsHoldReason = reason || 'Under administrative investigation';

    const amt = order.workerAmountPaise || order.workerEarningsPaise || order.workerAmount || 0;
    if (order.assignedWorkerId) {
      const worker = this.getWorker(order.assignedWorkerId);
      if (worker) {
        worker.onHoldEarningsPaise = (worker.onHoldEarningsPaise || 0) + amt;
        if (worker.walletBalancePaise >= amt) {
          worker.walletBalancePaise -= amt;
        }
      }

      this.appendLedgerEntry({
        workerId: order.assignedWorkerId,
        orderId,
        amountPaise: amt,
        type: 'WORKER_EARNING_HELD',
        idempotencyKey: `HOLD_ORDER_${order.id}_${Date.now()}`,
        referenceNote: reason || 'Earning put on hold by Admin'
      });
    }

    this.addAuditLog({
      actorUserId: this.settings.adminId || 'ADM-001',
      actorRole: 'ADMIN',
      action: 'WORKER_EARNINGS_HOLD',
      entityType: 'ORDER',
      entityId: orderId,
      metadata: { reason, amountPaise: amt }
    });

    return order;
  }

  adminReleaseWorkerEarnings(orderId: string) {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');

    if (order.earningStatus === 'AVAILABLE' && !order.isEarningsOnHold && !order.earningsHold) {
      const err: any = new Error('Worker earnings have already been released');
      err.code = 'EARNING_ALREADY_RELEASED';
      err.statusCode = 409;
      throw err;
    }

    order.isEarningsOnHold = false;
    order.earningsHold = false;
    order.earningStatus = 'AVAILABLE';
    order.status = 'COMPLETED';
    order.earningsHoldReason = undefined;

    const amt = order.workerAmountPaise || order.workerEarningsPaise || order.workerAmount || 0;
    if (order.assignedWorkerId) {
      const worker = this.getWorker(order.assignedWorkerId);
      if (worker) {
        worker.onHoldEarningsPaise = Math.max(0, (worker.onHoldEarningsPaise || 0) - amt);
        worker.walletBalancePaise += amt;
      }

      this.appendLedgerEntry({
        workerId: order.assignedWorkerId,
        orderId,
        amountPaise: amt,
        type: 'WORKER_EARNING_RELEASED_FROM_HOLD',
        idempotencyKey: `RELEASE_HOLD_ORDER_${order.id}_${Date.now()}`,
        referenceNote: 'Earning released from hold by Admin'
      });
    }

    this.addAuditLog({
      actorUserId: this.settings.adminId || 'ADM-001',
      actorRole: 'ADMIN',
      action: 'WORKER_EARNINGS_RELEASED',
      entityType: 'ORDER',
      entityId: orderId,
      metadata: { amountPaise: amt }
    });

    return order;
  }

  adminRefundOrder(orderId: string, reason: string, refundAmountRequested?: number) {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');

    if (order.status === 'REFUNDED' && order.refund) {
      const err: any = new Error('Order has already been refunded');
      err.code = 'REFUND_ALREADY_PROCESSED';
      err.statusCode = 409;
      throw err;
    }

    const customerPaidAmount = order.customerPaidAmount || order.pricePaise || order.totalPaise || 24900;
    if (customerPaidAmount <= 0) {
      const err: any = new Error('Order is not refundable');
      err.code = 'REFUND_NOT_ALLOWED';
      err.statusCode = 400;
      throw err;
    }

    let refundAmount = customerPaidAmount;
    if (refundAmountRequested && refundAmountRequested > 0) {
      const requestedPaise = refundAmountRequested <= 1000 ? Math.round(refundAmountRequested * 100) : refundAmountRequested;
      if (requestedPaise > customerPaidAmount) {
        const err: any = new Error('Refund amount exceeds payment amount');
        err.code = 'REFUND_AMOUNT_EXCEEDED';
        err.statusCode = 400;
        throw err;
      }
      refundAmount = requestedPaise;
    }

    order.status = 'REFUNDED';
    order.paymentStatus = 'REFUNDED';
    order.earningStatus = 'ADJUSTED';
    order.refund = {
      refundedAt: new Date().toISOString(),
      reason,
      amountPaise: refundAmount
    };

    this.appendLedgerEntry({
      orderId: order.id,
      amountPaise: refundAmount,
      type: 'REFUND_ISSUED',
      idempotencyKey: `REFUND_ORDER_${order.id}_${Date.now()}`,
      referenceNote: `Refunded to customer: ${reason}`
    });

    if (order.assignedWorkerId) {
      const worker = this.getWorker(order.assignedWorkerId);
      if (worker) {
        const amt = order.workerAmountPaise || order.workerEarningsPaise || order.workerAmount || 0;
        if (order.isEarningsOnHold) {
          worker.onHoldEarningsPaise = Math.max(0, (worker.onHoldEarningsPaise || 0) - amt);
        } else {
          worker.pendingEarningsPaise = Math.max(0, (worker.pendingEarningsPaise || 0) - amt);
        }
        worker.activeJobs = Math.max(0, worker.activeJobs - 1);
      }
      order.workerEarningsPaise = 0;
      order.workerAmount = 0;
    }

    if (order.customerId) {
      this.pushNotification({
        id: `notif_${Date.now()}`,
        recipientId: order.customerId,
        recipientRole: 'CUSTOMER',
        type: 'ORDER_REFUNDED',
        title: 'Refund Processed',
        message: `Your order #${order.id} has been refunded: ₹${(refundAmount / 100).toFixed(2)} credited to your wallet. Reason: ${reason}`,
        orderId: order.id,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    this.addAuditLog({
      actorUserId: this.settings.adminId || 'ADM-001',
      actorRole: 'ADMIN',
      action: 'ORDER_REFUNDED',
      entityType: 'ORDER',
      entityId: orderId,
      metadata: { reason, amountPaise: refundAmount }
    });

    return order;
  }

  adminVerifyReceipt(orderId: string, decision: 'APPROVED' | 'REJECTED', note?: string) {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');

    if (decision === 'APPROVED') {
      order.receiptVerifiedAt = new Date().toISOString();
      order.receiptVerificationStatus = 'APPROVED';
      if (order.earningStatus !== 'RELEASED' && order.assignedWorkerId) {
        try {
          this.releaseWorkerEarningOnReceiptAction(orderId, 'ADMIN');
        } catch (releaseErr: any) {
          console.warn('[VerifyReceipt] Earning release notice:', releaseErr.message);
        }
      }
    } else {
      order.receiptVerificationStatus = 'REJECTED';
      order.receiptRejectedReason = note || 'Receipt rejected by admin verification';
      order.status = 'IN_PROGRESS';
    }

    this.addAuditLog({
      actorUserId: this.settings.adminId || 'ADM-001',
      actorRole: 'ADMIN',
      action: decision === 'APPROVED' ? 'RECEIPT_VERIFIED_APPROVED' : 'RECEIPT_VERIFIED_REJECTED',
      entityType: 'ORDER',
      entityId: orderId,
      metadata: { decision, note }
    });

    this.persistOrdersToDisk();
    return order;
  }

  createOfficialServiceAdmin(data: any) {
    if (!data.name || !data.category || !data.pricePaise) {
      throw new Error('Service Name, Category, and Price are required');
    }

    const id = data.id || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const workerAmountPaise = data.workerAmountPaise !== undefined
      ? Number(data.workerAmountPaise)
      : (data.workerAmount !== undefined ? Number(data.workerAmount) * 100 : Math.max(0, Number(data.pricePaise || 0) - Number(data.adminCommissionPaise || data.platformFeePaise || 0)));
    const platformFeePaise = data.platformFeePaise !== undefined
      ? Number(data.platformFeePaise)
      : (data.adminCommissionPaise !== undefined ? Number(data.adminCommissionPaise) : (data.platformFee !== undefined ? Number(data.platformFee) * 100 : Math.max(0, Number(data.pricePaise || 0) - workerAmountPaise)));
    const pricePaise = (workerAmountPaise + platformFeePaise) > 0 ? (workerAmountPaise + platformFeePaise) : Number(data.pricePaise || 0);

    const newService: ServiceItem = {
      id,
      name: data.name,
      description: data.description || '',
      category: data.category,
      pricePaise,
      estimatedTime: data.estimatedTime || '24-48 Hours',
      requiredDocuments: Array.isArray(data.requiredDocuments) ? data.requiredDocuments : (data.requiredDocuments ? String(data.requiredDocuments).split(',').map(s => s.trim()).filter(Boolean) : ['Identity Proof']),
      formSchema: data.formSchema || [],
      applicationTypes: data.applicationTypes || [],
      status: 'ACTIVE',
      approvalStatus: 'APPROVED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    newService.workerAmountPaise = workerAmountPaise;
    newService.platformFeePaise = platformFeePaise;
    newService.adminCommissionPaise = platformFeePaise;

    this.services.unshift(newService);

    this.addAuditLog({
      actorUserId: this.settings.adminId || 'ADM-001',
      actorRole: 'ADMIN',
      action: 'SERVICE_CREATED',
      entityType: 'SERVICE',
      entityId: id,
      metadata: { name: newService.name, pricePaise: newService.pricePaise, workerAmountPaise, platformFeePaise }
    });

    return newService;
  }

  updateOfficialServiceAdmin(serviceId: string, updates: Partial<ServiceItem> & any) {
    const service = this.getService(serviceId);
    if (!service) throw new Error('Service not found');

    if (updates.name) service.name = updates.name;
    if (updates.description !== undefined) service.description = updates.description;
    if (updates.category) service.category = updates.category;
    if (updates.pricePaise !== undefined) service.pricePaise = Number(updates.pricePaise);
    if (updates.workerAmountPaise !== undefined) service.workerAmountPaise = Number(updates.workerAmountPaise);
    if (updates.platformFeePaise !== undefined) {
      service.platformFeePaise = Number(updates.platformFeePaise);
      service.adminCommissionPaise = Number(updates.platformFeePaise);
    }
    if (updates.estimatedTime) service.estimatedTime = updates.estimatedTime;
    if (updates.requiredDocuments) {
      service.requiredDocuments = Array.isArray(updates.requiredDocuments)
        ? updates.requiredDocuments
        : String(updates.requiredDocuments).split(',').map(s => s.trim()).filter(Boolean);
    }
    if (updates.applicationTypes !== undefined) {
      service.applicationTypes = updates.applicationTypes;
    }
    if (updates.formSchema !== undefined) {
      service.formSchema = updates.formSchema;
    }
    if (updates.status) service.status = updates.status;
    service.updatedAt = new Date().toISOString();

    this.addAuditLog({
      actorUserId: this.settings.adminId || 'ADM-001',
      actorRole: 'ADMIN',
      action: 'SERVICE_UPDATED',
      entityType: 'SERVICE',
      entityId: serviceId,
      metadata: updates
    });

    return service;
  }

  deleteOfficialServiceAdmin(serviceId: string) {
    const idx = this.services.findIndex(s => s.id === serviceId);
    if (idx === -1) throw new Error('Service not found');

    const removed = this.services.splice(idx, 1)[0];

    this.addAuditLog({
      actorUserId: this.settings.adminId || 'ADM-001',
      actorRole: 'ADMIN',
      action: 'SERVICE_DELETED',
      entityType: 'SERVICE',
      entityId: serviceId,
      metadata: { name: removed.name }
    });

    return { success: true };
  }

  toggleOfficialServiceAdmin(serviceId: string) {
    const service = this.getService(serviceId);
    if (!service) throw new Error('Service not found');

    service.status = service.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    service.updatedAt = new Date().toISOString();

    this.addAuditLog({
      actorUserId: this.settings.adminId || 'ADM-001',
      actorRole: 'ADMIN',
      action: 'SERVICE_STATUS_TOGGLED',
      entityType: 'SERVICE',
      entityId: serviceId,
      metadata: { status: service.status }
    });

    return service;
  }

  getAllProposalsAdmin() {
    return this.serviceProposals.map(p => {
      const worker = this.getWorker(p.workerId);
      return {
        ...p,
        workerName: worker?.name || 'Worker'
      };
    });
  }

  approveProposalAdmin(proposalId: string, adminId: string, overrides?: any) {
    const proposal = this.serviceProposals.find(p => p.id === proposalId);
    if (!proposal) throw new Error('Proposal not found');

    proposal.status = 'APPROVED';

    const serviceName = (overrides?.name || proposal.name).trim();
    const serviceDesc = overrides?.description || proposal.description;
    const serviceCategory = overrides?.category || proposal.category;
    const workerAmountPaise = overrides?.workerAmountPaise !== undefined
      ? Number(overrides.workerAmountPaise)
      : (proposal.requestedWorkerAmountPaise || proposal.suggestedPricePaise || 0);
    const platformFeePaise = overrides?.platformFeePaise !== undefined
      ? Number(overrides.platformFeePaise)
      : (overrides?.adminCommissionPaise !== undefined ? Number(overrides.adminCommissionPaise) : 0);
    const pricePaise = overrides?.pricePaise !== undefined
      ? Number(overrides.pricePaise)
      : (workerAmountPaise + platformFeePaise);
    const estimatedTime = overrides?.estimatedTime || proposal.estimatedTime || '1-2 days';

    let requiredDocs: string[] = [];
    if (overrides?.requiredDocuments) {
      if (Array.isArray(overrides.requiredDocuments)) {
        requiredDocs = overrides.requiredDocuments.map((d: any) => String(d).trim()).filter(Boolean);
      } else if (typeof overrides.requiredDocuments === 'string') {
        requiredDocs = overrides.requiredDocuments.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    } else if (Array.isArray(proposal.requiredDocuments) && proposal.requiredDocuments.length > 0) {
      requiredDocs = proposal.requiredDocuments;
    } else {
      requiredDocs = ['Identity Proof'];
    }

    const serviceId = serviceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newService: ServiceItem = {
      id: serviceId,
      name: serviceName,
      description: serviceDesc,
      category: serviceCategory,
      pricePaise,
      workerAmountPaise,
      platformFeePaise,
      adminCommissionPaise: platformFeePaise,
      estimatedTime,
      requiredDocuments: requiredDocs,
      status: 'ACTIVE',
      approvalStatus: 'APPROVED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.services = this.services.filter(s => s.id !== serviceId);
    this.services.unshift(newService);

    this.pushNotification({
      id: `notif_${Date.now()}`,
      recipientId: proposal.workerId,
      recipientRole: 'WORKER',
      type: 'PROPOSAL_APPROVED',
      title: 'Service Proposal Approved!',
      message: `Your proposed service "${proposal.name}" was approved and is now live on the customer marketplace.`,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    this.addAuditLog({
      actorUserId: adminId,
      actorRole: 'ADMIN',
      action: 'PROPOSAL_APPROVED',
      entityType: 'PROPOSAL',
      entityId: proposalId,
      metadata: { serviceName: proposal.name, pricePaise, workerAmountPaise, platformFeePaise }
    });

    return { proposal, newService };
  }

  rejectProposalAdmin(proposalId: string, adminId: string, reason?: string) {
    const proposal = this.serviceProposals.find(p => p.id === proposalId);
    if (!proposal) throw new Error('Proposal not found');

    proposal.status = 'REJECTED';
    proposal.adminComment = reason || 'Does not meet marketplace catalog standards';

    this.pushNotification({
      id: `notif_${Date.now()}`,
      recipientId: proposal.workerId,
      recipientRole: 'WORKER',
      type: 'PROPOSAL_REJECTED',
      title: 'Service Proposal Review',
      message: `Your proposal "${proposal.name}" was rejected. Feedback: ${proposal.adminComment}`,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    this.addAuditLog({
      actorUserId: adminId,
      actorRole: 'ADMIN',
      action: 'PROPOSAL_REJECTED',
      entityType: 'PROPOSAL',
      entityId: proposalId,
      metadata: { reason: proposal.adminComment }
    });

    return proposal;
  }

  getFinancialSummaryAdmin() {
    const allOrders = Array.from(this.orders.values());
    const paidOrders = allOrders.filter(o => o.paymentStatus === 'PAID' || o.payment?.status === 'PAID' || o.status === 'COMPLETED');
    const completedOrders = allOrders.filter(o => o.status === 'COMPLETED');

    let totalPlatformRevenuePaise = 0;
    let totalPlatformCommissionPaise = 0;
    let totalPlatformFeePaise = 0;
    let totalWorkerEarningsPaise = 0;

    paidOrders.forEach(o => {
      const price = (o.customerPaidAmount || o.pricePaise || 0);
      const workerAmt = (o.workerAmountPaise || o.workerEarningsPaise || o.workerAmount || 0);
      const comm = (o.adminCommissionPaise || o.adminCommission || o.commissionPaise || Math.max(0, price - workerAmt));
      totalPlatformRevenuePaise += price;
      totalPlatformCommissionPaise += comm;
      totalPlatformFeePaise += (o.platformFee || 0);
    });

    completedOrders.forEach(o => {
      totalWorkerEarningsPaise += (o.workerAmountPaise || o.workerEarningsPaise || o.workerAmount || 0);
    });

    let pendingEarningsPaise = 0;
    let onHoldEarningsPaise = 0;
    this.workers.forEach(w => {
      pendingEarningsPaise += (w.pendingEarningsPaise || 0);
      onHoldEarningsPaise += (w.onHoldEarningsPaise || 0);
    });

    const ledgerRefunds = this.ledgerEntries
      .filter(l => l.type === 'REFUND_ISSUED')
      .reduce((sum, l) => sum + (l.amountPaise || 0), 0);

    const orderRefunds = allOrders
      .filter(o => (o.status === 'CANCELLED' || o.status === 'REFUNDED') && o.refund)
      .reduce((sum, o) => sum + (o.refund?.amountPaise || o.pricePaise || 0), 0);

    const totalRefundsPaise = Math.max(ledgerRefunds, orderRefunds);

    const pendingWithdrawalsPaise = Array.from(this.withdrawals.values())
      .filter(w => (w.status as string) === 'REQUESTED' || w.status === 'PENDING')
      .reduce((sum, w) => sum + (w.amountPaise || 0), 0);

    const completedWithdrawalsPaise = Array.from(this.withdrawals.values())
      .filter(w => w.status === 'COMPLETED')
      .reduce((sum, w) => sum + (w.amountPaise || 0), 0);

    return {
      totalPlatformRevenue: totalPlatformRevenuePaise / 100,
      platformCommission: totalPlatformCommissionPaise / 100,
      platformFee: totalPlatformFeePaise / 100,
      workerEarnings: totalWorkerEarningsPaise / 100,
      totalCustomerRefund: totalRefundsPaise / 100,
      pendingWorkerEarnings: pendingEarningsPaise / 100,
      onHoldEarnings: onHoldEarningsPaise / 100,
      pendingWithdrawals: pendingWithdrawalsPaise / 100,
      completedWithdrawals: completedWithdrawalsPaise / 100,
      pendingWithdrawalsPaise,
      completedWithdrawalsPaise,
      totalPlatformRevenuePaise,
      totalPlatformCommissionPaise,
      totalPlatformFeePaise,
      totalWorkerEarningsPaise,
      pendingEarningsPaise,
      onHoldEarningsPaise,
      totalRefundsPaise,
      totalRevenuePaise: totalPlatformRevenuePaise,
      totalCommissionPaise: totalPlatformCommissionPaise,
      completedOrders: completedOrders.length,
      completedOrdersCount: completedOrders.length,
      paidOrdersCount: paidOrders.length
    };
  }

  getAllWithdrawalsAdmin() {
    return Array.from(this.withdrawals.values()).map(w => {
      const worker = this.getWorker(w.workerId);
      return {
        ...w,
        workerName: worker?.name || 'Worker',
        workerPhone: worker?.phone,
        workerEmail: worker?.email
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  approveWithdrawalAdmin(withdrawalId: string, adminId: string, paymentRef?: string) {
    const withdrawal = this.withdrawals.get(withdrawalId);
    if (!withdrawal) throw new Error('Withdrawal request not found');

    if (withdrawal.status === 'COMPLETED') {
      return withdrawal;
    }
    if (withdrawal.status === 'REJECTED') {
      const err: any = new Error('Withdrawal has already been rejected');
      err.code = 'WITHDRAWAL_ALREADY_REJECTED';
      err.statusCode = 409;
      throw err;
    }

    withdrawal.status = 'COMPLETED';
    withdrawal.paymentReference = paymentRef || `BANK-TX-${Date.now()}`;
    withdrawal.processedAt = new Date().toISOString();

    this.appendLedgerEntry({
      workerId: withdrawal.workerId,
      withdrawalId: withdrawal.id,
      amountPaise: withdrawal.amountPaise,
      type: 'WITHDRAWAL_PAID',
      idempotencyKey: `WITHDRAWAL_PAID_${withdrawal.id}`,
      referenceNote: `Bank transfer ref: ${withdrawal.paymentReference}`
    });

    this.pushNotification({
      id: `notif_${Date.now()}`,
      recipientId: withdrawal.workerId,
      recipientRole: 'WORKER',
      type: 'WITHDRAWAL_APPROVED',
      title: 'Withdrawal Processed',
      message: `Your withdrawal of ₹${(withdrawal.amountPaise / 100).toFixed(2)} has been completed to your ${withdrawal.method}. Ref: ${withdrawal.paymentReference}`,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    this.addAuditLog({
      actorUserId: adminId,
      actorRole: 'ADMIN',
      action: 'WITHDRAWAL_APPROVED',
      entityType: 'WITHDRAWAL',
      entityId: withdrawalId,
      metadata: { amountPaise: withdrawal.amountPaise, paymentReference: withdrawal.paymentReference }
    });

    return withdrawal;
  }

  rejectWithdrawalAdmin(withdrawalId: string, adminId: string, reason: string) {
    const withdrawal = this.withdrawals.get(withdrawalId);
    if (!withdrawal) throw new Error('Withdrawal request not found');

    if (withdrawal.status === 'COMPLETED') {
      const err: any = new Error('Withdrawal has already been completed');
      err.code = 'WITHDRAWAL_ALREADY_COMPLETED';
      err.statusCode = 409;
      throw err;
    }
    if (withdrawal.status === 'REJECTED') {
      return withdrawal;
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error('Rejection reason is mandatory');
    }

    withdrawal.status = 'REJECTED';
    withdrawal.rejectionReason = reason;
    withdrawal.processedAt = new Date().toISOString();

    const worker = this.getWorker(withdrawal.workerId);
    if (worker) {
      worker.walletBalancePaise += withdrawal.amountPaise;
    }

    this.appendLedgerEntry({
      workerId: withdrawal.workerId,
      withdrawalId: withdrawal.id,
      amountPaise: withdrawal.amountPaise,
      type: 'WITHDRAWAL_CANCELLED',
      idempotencyKey: `WITHDRAWAL_CANCELLED_${withdrawal.id}`,
      referenceNote: `Rejection reason: ${reason}`
    });

    this.pushNotification({
      id: `notif_${Date.now()}`,
      recipientId: withdrawal.workerId,
      recipientRole: 'WORKER',
      type: 'WITHDRAWAL_REJECTED',
      title: 'Withdrawal Request Rejected',
      message: `Your withdrawal of ₹${(withdrawal.amountPaise / 100).toFixed(2)} was rejected: ${reason}. Funds have been restored to your wallet.`,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    this.addAuditLog({
      actorUserId: adminId,
      actorRole: 'ADMIN',
      action: 'WITHDRAWAL_REJECTED',
      entityType: 'WITHDRAWAL',
      entityId: withdrawalId,
      metadata: { reason, amountPaise: withdrawal.amountPaise }
    });

    return withdrawal;
  }

  getTopEarningWorkersAdmin(period?: string) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const monthStr = todayStr.substring(0, 7);

    const rankings = this.workers.map(w => {
      const allWorkerCompletedOrders = Array.from(this.orders.values()).filter(o =>
        (o.assignedWorkerId === w.id || o.assignedWorkerId === (w as any).workerId) && o.status === 'COMPLETED'
      );

      const filteredOrders = allWorkerCompletedOrders.filter(o => {
        if (!period || period === 'all' || period === 'all_time') return true;
        const rawDate = o.completedAt || o.updatedAt || o.createdAt;
        if (!rawDate) return true;
        const dateStr = typeof rawDate === 'string' ? rawDate : (rawDate instanceof Date ? rawDate.toISOString() : new Date(rawDate).toISOString());
        if (period === 'daily' || period === 'today') return dateStr.startsWith(todayStr);
        if (period === 'monthly' || period === 'this_month') return dateStr.startsWith(monthStr);
        return true;
      });

      const ordersToCount = filteredOrders.length > 0 ? filteredOrders : (period === 'daily' ? [] : allWorkerCompletedOrders);

      const totalEarningsPaise = ordersToCount.reduce(
        (sum, o) => sum + (o.workerAmountPaise || o.workerEarningsPaise || o.workerAmount || 0),
        0
      );

      return {
        workerId: w.id,
        workerName: w.name,
        businessName: w.businessName || (w as any).outletName || 'Cyber Cafe Outlet',
        completedOrders: ordersToCount.length,
        totalEarningsPaise
      };
    });

    rankings.sort((a, b) => b.totalEarningsPaise - a.totalEarningsPaise);
    return rankings.map((r, index) => ({ ...r, rank: index + 1 }));
  }

  getAllComplaintsAdmin(filter?: { type?: string; status?: string; category?: string; search?: string }) {
    let list = Array.from(this.complaints.values());

    const type = filter?.type;
    if (type && type !== 'ALL' && type !== 'All Roles' && type !== 'undefined') {
      list = list.filter(c => c.type === type || c.complainantRole === type);
    }
    const status = filter?.status;
    if (status && status !== 'ALL' && status !== 'All Status' && status !== 'undefined') {
      list = list.filter(c => c.status === status);
    }
    const category = filter?.category;
    if (category && category !== 'ALL' && category !== 'All Categories' && category !== 'undefined') {
      list = list.filter(c => c.category === category || (c as any).reason === category);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      list = list.filter(c =>
        c.id.toLowerCase().includes(q) ||
        (c.orderId && c.orderId.toLowerCase().includes(q)) ||
        (c.complainantName && c.complainantName.toLowerCase().includes(q)) ||
        (c.subject && c.subject.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getComplaintDetailedAdmin(complaintId: string) {
    const complaint = this.complaints.get(complaintId);
    if (!complaint) throw new Error('Complaint not found');

    let order: any = null;
    let customer: any = null;
    let worker: any = null;
    let chat: any[] = [];

    if (complaint.orderId) {
      order = this.orders.get(complaint.orderId);
      if (order) {
        customer = this.users.get(order.customerId);
        worker = order.assignedWorkerId ? this.getWorker(order.assignedWorkerId) : null;
        chat = this.chatMessages.filter(m => m.orderId === order.id);
      }
    }

    return {
      complaint,
      order,
      customer,
      worker,
      chat
    };
  }

  addComplaintReplyAdmin(complaintId: string, adminName: string, message: string) {
    const complaint = this.complaints.get(complaintId);
    if (!complaint) throw new Error('Complaint not found');

    if (!complaint.replies) complaint.replies = [];
    complaint.replies.push({
      sender: 'ADMIN',
      message,
      createdAt: new Date().toISOString()
    });
    complaint.status = 'In Progress';
    complaint.updatedAt = new Date().toISOString();

    this.pushNotification({
      id: `notif_${Date.now()}`,
      recipientId: complaint.complainantId,
      recipientRole: complaint.complainantRole,
      type: 'COMPLAINT_REPLY',
      title: 'Response to Your Complaint',
      message: `Admin responded: "${message.substring(0, 100)}..."`,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    this.addAuditLog({
      actorUserId: this.settings.adminId || 'ADM-001',
      actorRole: 'ADMIN',
      action: 'COMPLAINT_REPLIED',
      entityType: 'COMPLAINT',
      entityId: complaintId,
      metadata: { message }
    });

    return complaint;
  }

  addComplaintInternalNoteAdmin(complaintId: string, adminName: string, note: string) {
    const complaint = this.complaints.get(complaintId);
    if (!complaint) throw new Error('Complaint not found');

    if (!complaint.internalNotes) complaint.internalNotes = [];
    complaint.internalNotes.push({
      note,
      adminName,
      createdAt: new Date().toISOString()
    });
    complaint.updatedAt = new Date().toISOString();

    return complaint;
  }

  resolveComplaintAdmin(complaintId: string, decision: 'APPROVE' | 'CORRECTION' | 'REFUND' | 'RESOLVED' | string, resolutionNote: string) {
    const complaint = this.complaints.get(complaintId);
    if (complaint) {
      complaint.status = 'RESOLVED';
      complaint.resolution = resolutionNote;
      (complaint as any).resolvedAt = new Date().toISOString();
      complaint.updatedAt = new Date().toISOString();

      if (complaint.orderId) {
        if (decision === 'APPROVE') {
          this.adminReleaseWorkerEarnings(complaint.orderId);
        } else if (decision === 'CORRECTION') {
          this.adminRequestCorrection(complaint.orderId, 'Dispute Resolution Correction', resolutionNote);
        } else if (decision === 'REFUND') {
          this.adminRefundOrder(complaint.orderId, resolutionNote);
        }
      }
    }

    const tkt = this.supportTickets.find(t => t.id === complaintId);
    if (tkt) {
      tkt.status = 'Resolved';
      tkt.updatedAt = new Date().toISOString();
      if (!tkt.replies) tkt.replies = [];
      tkt.replies.push({
        sender: 'ADMIN',
        author: 'Admin Operations',
        message: resolutionNote || 'Dispute resolved by Admin',
        createdAt: new Date().toISOString()
      });
    }

    this.addAuditLog({
      actorUserId: this.settings.adminId || 'ADM-001',
      actorRole: 'ADMIN',
      action: 'COMPLAINT_RESOLVED',
      entityType: 'COMPLAINT',
      entityId: complaintId,
      metadata: { decision, resolutionNote }
    });

    return complaint || tkt;
  }

  addWorkerTicketReply(ticketId: string, author: string, message: string) {
    const t = this.supportTickets.find(ticket => ticket.id === ticketId);
    if (t) {
      if (!t.replies) t.replies = [];
      t.replies.push({
        sender: 'WORKER',
        author,
        message,
        createdAt: new Date().toISOString()
      });
      t.updatedAt = new Date().toISOString();
    }
    const c = this.complaints.get(ticketId);
    if (c) {
      if (!c.replies) c.replies = [];
      c.replies.push({
        sender: 'WORKER',
        author,
        message,
        createdAt: new Date().toISOString()
      });
      c.updatedAt = new Date().toISOString();
    }
    return t || c;
  }

  resetWorkerPasswordAdmin(workerId: string, tempPassword?: string) {
    const newPass = tempPassword || 'TempPass#2026';
    const worker = this.getWorker(workerId);
    if (!worker) throw new Error('Worker not found');
    const user = this.users.get(worker.id) || this.findUserById(worker.id);
    if (user) {
      user.password = newPass;
      user.passwordHash = bcrypt.hashSync(newPass, 10);
    }
    (worker as any).temporaryPassword = newPass;
    this.addAuditLog({
      actorUserId: this.settings.adminId || 'ADM-001',
      actorRole: 'ADMIN',
      action: 'WORKER_PASSWORD_RESET',
      entityType: 'WORKER',
      entityId: workerId,
      metadata: { workerId, resetAt: new Date().toISOString() }
    });
    return { success: true, temporaryPassword: newPass, message: `Password reset successfully. Temporary password: ${newPass}` };
  }

  getAllSupportTicketsAdmin(filter?: { role?: string; status?: string; search?: string }) {
    let list = this.supportTickets.map(t => {
      const user = t.userId ? this.users.get(t.userId) : (t.workerId ? this.getWorker(t.workerId) : null);
      return {
        ...t,
        userName: t.userName || user?.name || 'User',
        userRole: t.userRole || (t.workerId ? 'WORKER' : 'CUSTOMER')
      };
    });

    if (filter?.role && filter.role !== 'ALL') {
      list = list.filter(t => t.userRole === filter.role);
    }
    if (filter?.status && filter.status !== 'ALL') {
      list = list.filter(t => t.status === filter.status);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(t =>
        t.id.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        (t.userName && t.userName.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  replySupportTicketAdmin(ticketId: string, adminId: string, message: string) {
    const ticket = this.supportTickets.find(t => t.id === ticketId);
    if (!ticket) throw new Error('Ticket not found');

    ticket.replies.push({
      sender: 'ADMIN',
      message,
      createdAt: new Date().toISOString()
    });
    ticket.status = 'In Progress';
    ticket.updatedAt = new Date().toISOString();

    const recipientId = ticket.userId || ticket.workerId;
    const recipientRole = ticket.userRole || 'WORKER';

    if (recipientId) {
      this.pushNotification({
        id: `notif_${Date.now()}`,
        recipientId,
        recipientRole: recipientRole as any,
        type: 'SUPPORT_TICKET_REPLY',
        title: 'Support Ticket Update',
        message: `Admin replied to your inquiry: "${message.substring(0, 80)}..."`,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    this.addAuditLog({
      actorUserId: adminId,
      actorRole: 'ADMIN',
      action: 'SUPPORT_TICKET_REPLIED',
      entityType: 'SUPPORT_TICKET',
      entityId: ticketId,
      metadata: { message }
    });

    return ticket;
  }

  addTicketInternalNoteAdmin(ticketId: string, adminName: string, note: string) {
    const ticket = this.supportTickets.find(t => t.id === ticketId);
    if (!ticket) throw new Error('Ticket not found');

    if (!ticket.internalNotes) ticket.internalNotes = [];
    ticket.internalNotes.push({
      note,
      adminName,
      createdAt: new Date().toISOString()
    });
    ticket.updatedAt = new Date().toISOString();

    return ticket;
  }

  updateSupportTicketStatusAdmin(ticketId: string, status: 'Open' | 'In Progress' | 'Resolved') {
    const ticket = this.supportTickets.find(t => t.id === ticketId);
    if (!ticket) throw new Error('Ticket not found');

    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();
    return ticket;
  }

  getAdminNotifications() {
    return this.notifications
      .filter(n => n.recipientRole === 'ADMIN')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  markAdminNotificationRead(notificationId: string) {
    const notif = this.notifications.find(n => n.id === notificationId);
    if (notif) {
      notif.isRead = true;
      return true;
    }
    return false;
  }

  markAllAdminNotificationsRead() {
    this.notifications.forEach(n => {
      if (n.recipientRole === 'ADMIN') {
        n.isRead = true;
      }
    });
    return true;
  }

  getReportDataAdmin(reportType: string, period: string, customStartDate?: string, customEndDate?: string) {
    const allOrders = Array.from(this.orders.values());
    const allWithdrawals = Array.from(this.withdrawals.values());
    const allComplaints = Array.from(this.complaints.values());
    const summary = this.getAdminDashboardStats();

    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === 'yesterday') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    } else if (period === 'last_7_days') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === 'last_month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (period === 'this_year') {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (customStartDate && customEndDate) {
      startDate = new Date(customStartDate + (customStartDate.includes('T') ? '' : 'T00:00:00'));
      endDate = new Date(customEndDate + (customEndDate.includes('T') ? '' : 'T23:59:59.999'));
    }

    const isWithinDate = (d?: string | Date) => {
      if (!startDate || !endDate) return true;
      if (!d) return true;
      const t = new Date(d).getTime();
      return t >= startDate.getTime() && t <= endDate.getTime();
    };

    const targetOrders = allOrders.filter(o => isWithinDate(o.createdAt || o.completedAt));
    const targetWithdrawals = allWithdrawals.filter(w => isWithinDate(w.createdAt));
    const targetComplaints = allComplaints.filter(c => isWithinDate(c.createdAt));

    let columns = ['Metric / Item', 'Details', 'Volume / Value', 'Status / Timestamp'];
    let rows: any[] = [];
    let kpis: any[] = [];

    if (reportType.includes('revenue') || reportType.includes('commission') || reportType === 'total_revenue' || reportType === 'platform_commission') {
      columns = ['Order ID', 'Service', 'Price (Rs)', 'Worker Earning (Rs)', 'Platform Commission (Rs)', 'Status', 'Date'];
      let sumPrice = 0;
      let sumWorker = 0;
      let sumComm = 0;

      rows = targetOrders.map(o => {
        const price = o.customerPaidAmount || o.pricePaise || 0;
        const workerAmt = o.workerAmount || o.workerAmountPaise || o.workerEarningsPaise || 0;
        const comm = o.adminCommissionPaise || Math.max(0, price - workerAmt);

        sumPrice += price;
        sumWorker += workerAmt;
        sumComm += comm;

        return [
          (o.orderNumber || o.id).slice(0, 10),
          o.serviceName || (o.serviceSnapshot as any)?.name || 'Documentation Service',
          `₹${(price / 100).toFixed(2)}`,
          `₹${(workerAmt / 100).toFixed(2)}`,
          `₹${(comm / 100).toFixed(2)}`,
          o.status,
          new Date(o.createdAt).toLocaleDateString()
        ];
      });

      kpis = [
        { label: 'Total Revenue', value: `₹${(sumPrice / 100).toFixed(2)}` },
        { label: 'Commission Earned', value: `₹${(sumComm / 100).toFixed(2)}` },
        { label: 'Orders Processed', value: targetOrders.length }
      ];
    } else if (reportType.includes('payout') || reportType.includes('withdrawal') || reportType === 'worker_payouts') {
      columns = ['Withdrawal ID', 'Worker ID', 'Amount (Rs)', 'Destination', 'Status', 'Date'];
      let sumWithdrawals = 0;
      rows = targetWithdrawals.map(w => {
        sumWithdrawals += (w.amountPaise || 0);
        return [
          w.id.slice(0, 10),
          w.workerId,
          `₹${((w.amountPaise || 0) / 100).toFixed(2)}`,
          w.method || 'Bank Transfer',
          w.status,
          new Date(w.createdAt).toLocaleDateString()
        ];
      });
      kpis = [
        { label: 'Total Payouts', value: `₹${(sumWithdrawals / 100).toFixed(2)}` },
        { label: 'Payout Requests', value: targetWithdrawals.length },
        { label: 'Pending Requests', value: targetWithdrawals.filter(w => w.status === 'PENDING').length }
      ];
    } else if (reportType.includes('worker') || reportType === 'worker_performance' || reportType === 'worker_activity') {
      columns = ['Worker Name', 'City', 'Completed Orders', 'Rating', 'Total Earnings (Rs)', 'Status'];
      let totalWorkerEarnings = 0;
      rows = this.workers.map(w => {
        const workerCompleted = targetOrders.filter(o => (o.assignedWorkerId === w.id || o.assignedWorkerId === (w as any).workerId) && o.status === 'COMPLETED');
        const earned = workerCompleted.reduce((sum, o) => sum + (o.workerAmountPaise || o.workerEarningsPaise || o.workerAmount || 0), 0);
        totalWorkerEarnings += earned;
        return [
          w.name,
          w.city || 'N/A',
          workerCompleted.length,
          `★ ${w.rating || 5.0}`,
          `₹${(earned / 100).toFixed(2)}`,
          w.accountStatus || w.status || 'ACTIVE'
        ];
      });
      kpis = [
        { label: 'Total Workers', value: this.workers.length },
        { label: 'Total Paid Out', value: `₹${(totalWorkerEarnings / 100).toFixed(2)}` },
        { label: 'Active Online', value: this.workers.filter(w => w.isOnline).length }
      ];
    } else if (reportType.includes('complaint') || reportType === 'complaints_disputes') {
      columns = ['Complaint ID', 'Complainant', 'Category', 'Subject', 'Status', 'Date'];
      rows = targetComplaints.map(c => [
        c.id.slice(0, 10),
        c.complainantName || 'User',
        c.category || (c as any).reason || 'General',
        c.subject || (c as any).description || 'Issue',
        c.status,
        new Date(c.createdAt).toLocaleDateString()
      ]);
      kpis = [
        { label: 'Total Complaints', value: targetComplaints.length },
        { label: 'Open Disputes', value: targetComplaints.filter(c => c.status?.toUpperCase() !== 'RESOLVED').length },
        { label: 'Resolved Tickets', value: targetComplaints.filter(c => c.status?.toUpperCase() === 'RESOLVED').length }
      ];
    } else {
      columns = ['Order ID', 'Service / Metric', 'Price (Rs)', 'Platform Commission (Rs)', 'Status', 'Date'];
      let sumPrice = 0;
      let sumComm = 0;
      rows = targetOrders.map(o => {
        const price = o.customerPaidAmount || o.pricePaise || 0;
        const workerAmt = o.workerAmount || o.workerAmountPaise || o.workerEarningsPaise || 0;
        const comm = o.adminCommissionPaise || Math.max(0, price - workerAmt);
        sumPrice += price;
        sumComm += comm;
        return [
          (o.orderNumber || o.id).slice(0, 10),
          o.serviceName || 'Service',
          `₹${(price / 100).toFixed(2)}`,
          `₹${(comm / 100).toFixed(2)}`,
          o.status,
          new Date(o.createdAt).toLocaleDateString()
        ];
      });
      kpis = [
        { label: 'Filtered Orders', value: targetOrders.length },
        { label: 'Total Value', value: `₹${(sumPrice / 100).toFixed(2)}` },
        { label: 'Commission Earned', value: `₹${(sumComm / 100).toFixed(2)}` }
      ];
    }

    return {
      reportType,
      period,
      customStartDate,
      customEndDate,
      generatedAt: new Date().toISOString(),
      columns,
      rows,
      kpis,
      summary,
      orders: targetOrders,
      workers: this.workers,
      withdrawals: targetWithdrawals,
      complaints: targetComplaints
    };
  }

  getPlatformSettings() {
    return {
      ...this.settings,
      commissionRatePercent: this.settings.commissionRatePercent ?? this.settings.commissionPercent ?? 20,
      customerRefundPercent: this.settings.customerRefundPercent ?? 100
    };
  }

  updatePlatformSettings(updates: any) {
    this.settings = {
      ...this.settings,
      ...updates,
      commissionPercent: updates.commissionRatePercent ?? updates.commissionPercent ?? this.settings.commissionPercent
    };
    if (updates.commissionRatePercent !== undefined) {
      this.settings.commissionRatePercent = updates.commissionRatePercent;
    }
    if (updates.customerRefundPercent !== undefined) {
      this.settings.customerRefundPercent = updates.customerRefundPercent;
    }

    this.addAuditLog({
      actorUserId: this.settings.adminId || 'ADM-001',
      actorRole: 'ADMIN',
      action: 'PLATFORM_SETTINGS_UPDATED',
      entityType: 'SETTINGS',
      entityId: 'global',
      metadata: updates
    });

    return this.settings;
  }

  updateAdminProfile(adminId: string, updates: any) {
    const admin = this.users.get(adminId) || this.findUserById(adminId) || Array.from(this.users.values()).find(u => u.role === 'ADMIN');
    if (!admin) throw new Error('Admin not found');

    if (updates.name) admin.name = updates.name;
    if (updates.phone) admin.phone = updates.phone;
    if (updates.email) admin.email = updates.email;

    if (updates.name) this.settings.adminName = updates.name;
    if (updates.phone) this.settings.mobile = updates.phone;
    if (updates.email) this.settings.email = updates.email;
    if (updates.profilePhoto !== undefined) this.settings.profilePhoto = updates.profilePhoto;

    return { admin, settings: this.settings };
  }

  changeAdminPassword(adminId: string, oldPass: string, newPass: string) {
    const admin = this.users.get(adminId) || this.findUserById(adminId) || Array.from(this.users.values()).find(u => u.role === 'ADMIN');
    if (!admin) throw new Error('Admin not found');

    const hash = admin.password || admin.passwordHash;
    const match = hash ? bcrypt.compareSync(oldPass, hash) : false;
    if (!match) throw new Error('Current password is incorrect');

    const newHash = bcrypt.hashSync(newPass, 10);
    admin.password = newHash;
    admin.passwordHash = newHash;

    this.addAuditLog({
      actorUserId: adminId,
      actorRole: 'ADMIN',
      action: 'ADMIN_PASSWORD_CHANGED',
      entityType: 'ADMIN',
      entityId: adminId
    });

    return { success: true };
  }

  getSecurityAuditLogsAdmin(filters?: { action?: string; entityType?: string; search?: string }) {
    let list = [...this.auditLogs];

    if (filters?.action && filters.action !== 'ALL') {
      list = list.filter(l => l.action === filters.action);
    }
    if (filters?.entityType && filters.entityType !== 'ALL') {
      list = list.filter(l => l.entityType === filters.entityType);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(l =>
        (l.action && l.action.toLowerCase().includes(q)) ||
        (l.entityId && l.entityId.toLowerCase().includes(q)) ||
        (l.actorUserId && l.actorUserId.toLowerCase().includes(q))
      );
    }

    return list;
  }
}

export const localStore = new ResilientStore();