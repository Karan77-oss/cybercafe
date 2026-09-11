import bcrypt from 'bcrypt';

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  category: string;
  pricePaise: number;
  estimatedTime: string;
  requiredDocuments: string[];
  formSchema?: any[];
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
  rating: number;
  isOnline: boolean;
  accountStatus: 'ACTIVE' | 'PENDING' | 'OFFLINE' | 'SUSPENDED' | 'BLOCKED';
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

export interface WithdrawalItem {
  id: string;
  workerId: string;
  amountPaise: number;
  method: 'BANK' | 'UPI';
  payoutDetails: any;
  status: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED';
  rejectionReason?: string;
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
  status: 'Open' | 'In Progress' | 'Resolved';
  resolution?: string;
  internalNotes?: Array<{ note: string; createdAt: string; adminName: string }>;
  replies?: Array<{ sender: 'ADMIN' | 'CUSTOMER' | 'WORKER'; message: string; createdAt: string }>;
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
  allowWorkerRegistration: boolean;
  minWithdrawalPaise: number;
  correctionWindowHours: number;
  emailNotifications: boolean;
  smsNotifications: boolean;
  urgentAlerts: boolean;
}

export interface ChatMessageItem {
  id: string;
  orderId: string;
  senderId: string;
  senderRole: 'WORKER' | 'CUSTOMER';
  senderName: string;
  message: string;
  createdAt: string;
}

export interface ServiceProposalItem {
  id: string;
  workerId: string;
  name: string;
  description: string;
  category: string;
  suggestedPricePaise: number;
  estimatedTime: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminComment?: string;
  createdAt: string;
}

export const OFFICIAL_SERVICES: ServiceItem[] = [
  {
    id: 'pan-card',
    name: 'PAN Card Application & Correction',
    description: 'New PAN Card (Form 49A), reprint of damaged/lost card, and Aadhaar-PAN linking assistance.',
    category: 'PAN-related services',
    pricePaise: 19900,
    estimatedTime: '24-48 Hours',
    requiredDocuments: ['Aadhaar Card', 'Passport Size Photo', 'Signature Specimen'],
    formSchema: [
      { id: 'fullName', label: 'Full Name of Applicant (as per Aadhaar)', type: 'text', required: true },
      { id: 'fatherName', label: "Father's Name", type: 'text', required: true },
      { id: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true },
      { id: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true },
      { id: 'phone', label: 'Mobile / WhatsApp Number', type: 'tel', required: true },
      { id: 'email', label: 'Email Address', type: 'email', required: true },
      { id: 'panType', label: 'Application Type', type: 'select', options: ['New PAN Card (Form 49A)', 'Correction in Existing PAN', 'Reprint Lost/Damaged Card'], required: true },
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
    id: 'aadhaar-update',
    name: 'Aadhaar Demographic Update',
    description: 'Assistance for online appointment booking, name/address update documentation, and PVC card order.',
    category: 'Government forms',
    pricePaise: 14900,
    estimatedTime: '24 Hours',
    requiredDocuments: ['Existing Aadhaar Card', 'Proof of Address (Utility Bill/Bank Passbook)'],
    formSchema: [
      { id: 'fullName', label: 'Full Name (as per Aadhaar)', type: 'text', required: true },
      { id: 'aadhaarNumber', label: 'Current 12-Digit Aadhaar Number', type: 'text', required: true },
      { id: 'phone', label: 'Mobile Number linked with Aadhaar', type: 'tel', required: true },
      { id: 'email', label: 'Email Address', type: 'email', required: true },
      { id: 'updateType', label: 'Type of Update Needed', type: 'select', options: ['Address Update Online', 'Name / DOB Correction Guidance', 'Order PVC Aadhaar Card', 'Mobile Linking Appointment Booking'], required: true },
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
    requiredDocuments: ['Aadhaar Card', 'Passport Photo', 'Age Proof / Birth Certificate'],
    formSchema: [
      { id: 'fullName', label: 'Full Name of Applicant', type: 'text', required: true },
      { id: 'relativeName', label: "Father's / Mother's / Husband's Name", type: 'text', required: true },
      { id: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true },
      { id: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'], required: true },
      { id: 'phone', label: 'Mobile Number', type: 'tel', required: true },
      { id: 'email', label: 'Email Address', type: 'email', required: true },
      { id: 'voterServiceType', label: 'Voter Service', type: 'select', options: ['New Voter Registration (Form 6)', 'Shifting of Residence (Form 8)', 'Correction of Entries in Existing Card', 'e-EPIC Digital Download'], required: true },
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
    requiredDocuments: ['Aadhaar Card', 'PAN Card', '10th Marksheet / Birth Certificate', 'Passport Photo'],
    formSchema: [
      { id: 'fullName', label: 'Full Name (Given Name + Surname as on Marksheet)', type: 'text', required: true },
      { id: 'fatherName', label: "Father's Full Name", type: 'text', required: true },
      { id: 'motherName', label: "Mother's Full Name", type: 'text', required: true },
      { id: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true },
      { id: 'birthPlace', label: 'Place of Birth (Village / Town / State)', type: 'text', required: true },
      { id: 'phone', label: 'Mobile Number', type: 'tel', required: true },
      { id: 'email', label: 'Email Address', type: 'email', required: true },
      { id: 'passportScheme', label: 'Application Scheme', type: 'select', options: ['Normal Scheme (Standard)', 'Tatkaal Scheme (Urgent)'], required: true },
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
    requiredDocuments: ['Aadhaar Card', 'Ration Card / Electricity Bill', 'Self Declaration Affidavit', 'Photo'],
    formSchema: [
      { id: 'fullName', label: 'Full Name of Applicant', type: 'text', required: true },
      { id: 'fatherName', label: "Father's / Guardian's Name", type: 'text', required: true },
      { id: 'phone', label: 'Mobile Number', type: 'tel', required: true },
      { id: 'email', label: 'Email Address', type: 'email', required: true },
      { id: 'certificateType', label: 'Certificate Required', type: 'select', options: ['Income Certificate', 'OBC Caste Certificate', 'SC/ST Caste Certificate', 'Domicile / Residence Certificate', 'EWS Certificate'], required: true },
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
    requiredDocuments: ['Aadhaar Card', 'Income Certificate', 'Previous Marksheet', 'Bank Passbook', 'College Fee Receipt'],
    formSchema: [
      { id: 'fullName', label: 'Student Full Name', type: 'text', required: true },
      { id: 'phone', label: 'Student Mobile Number', type: 'tel', required: true },
      { id: 'email', label: 'Email Address', type: 'email', required: true },
      { id: 'scholarshipScheme', label: 'Scholarship Scheme', type: 'select', options: ['National Scholarship Portal (NSP Central)', 'State Post-Matric Scholarship', 'State Pre-Matric Scholarship', 'Merit-Cum-Means Scholarship'], required: true },
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
    requiredDocuments: ['Aadhaar Card', 'Educational Marksheets', 'Photo & Signature (Pre-resized)', 'Caste Certificate'],
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
    requiredDocuments: ['10th & 12th Marksheets', 'Transfer Certificate', 'Aadhaar Card', 'Passport Photo'],
    formSchema: [
      { id: 'fullName', label: 'Student Full Name', type: 'text', required: true },
      { id: 'phone', label: 'Mobile Number', type: 'tel', required: true },
      { id: 'email', label: 'Email Address', type: 'email', required: true },
      { id: 'courseDesired', label: 'Course / Degree Applied For (e.g. B.Tech, B.Com, MBA)', type: 'text', required: true },
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
      { id: 'travelMode', label: 'Travel Mode', type: 'select', options: ['IRCTC Train Ticket', 'Interstate Bus Ticket', 'Domestic Flight'], required: true },
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
      { id: 'scanQuality', label: 'Desired Scanning Resolution', type: 'select', options: ['300 DPI High-Res PDF (Standard)', '600 DPI Ultra HD (Certificates/Photos)', 'Compressed PDF (< 2MB for email/portal)'], required: true },
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
      { id: 'pdfTask', label: 'PDF Operation Required', type: 'select', options: ['Compress PDF (to exact portal limits: 50KB/100KB/200KB)', 'Merge Multiple Files into a Single PDF', 'Image to PDF Compilation', 'Extract / Split / Password Protect Pages'], required: true },
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
      { id: 'printMode', label: 'Printing Type', type: 'select', options: ['Black & White Laser Print', 'Color Photo Quality Print', 'Admit Card Print + Lamination', 'Glossy Photo Sheet (A4)'], required: true },
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
      { id: 'targetRole', label: 'Target Job Role / Industry (e.g. Sales, Software, Banking)', type: 'text', required: true },
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
      { id: 'targetPortal', label: 'Target Portal / Exam Board (e.g. SSC, NTA NEET/JEE, UPSC)', type: 'text', required: true },
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
      { id: 'billType', label: 'Utility Service Type', type: 'select', options: ['Electricity Bill Settlement', 'Piped Gas Bill', 'Water Department Bill', 'FASTag Instant Recharge', 'Municipal Property Tax / Challan'], required: true },
      { id: 'providerName', label: 'Electricity Board / Department Name (e.g. BSES, TNEB, UPPCL)', type: 'text', required: true },
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
    description: 'Municipal corporation and gram panchayat civil registration assistance and digital certificate issuance.',
    category: 'Certificate applications',
    pricePaise: 24900,
    estimatedTime: '3-5 Working Days',
    requiredDocuments: ['Hospital Discharge / Event Proof', 'Parents / Spouse Identity Proofs', 'Self Affidavit'],
    formSchema: [
      { id: 'fullName', label: 'Person / Child Name', type: 'text', required: true },
      { id: 'fatherName', label: "Father's Full Name", type: 'text', required: true },
      { id: 'motherName', label: "Mother's Full Name", type: 'text', required: true },
      { id: 'phone', label: 'Contact Phone Number', type: 'tel', required: true },
      { id: 'email', label: 'Email Address', type: 'email', required: true },
      { id: 'civilServiceType', label: 'Certificate Type', type: 'select', options: ['Birth Certificate Application', 'Death Certificate Application', 'Marriage Registration Certificate'], required: true },
      { id: 'eventDate', label: 'Date of Event (Birth / Death / Marriage)', type: 'date', required: true },
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
      accountNumber: '918237461928',
      ifsc: 'SBIN0001234',
      accountHolderName: 'Amit Kumar',
      upiId: 'amitcyber@oksbi'
    },
    activeJobs: 1,
    completedJobs: 134,
    rating: 4.9,
    isOnline: true,
    accountStatus: 'ACTIVE',
    lastActivityAt: new Date().toISOString(),
    walletBalancePaise: 425000,
    pendingEarningsPaise: 15900,
    onHoldEarningsPaise: 0,
    totalEarningsPaise: 3850000,
    averageCompletionMinutes: 45,
    reviews: [
      { id: 'rev-1', rating: 5, comment: 'Very fast and accurate PAN form submission.', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
      { id: 'rev-2', rating: 5, comment: 'Great job, received the acknowledgement receipt within an hour.', createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
      { id: 'rev-3', rating: 4, comment: 'Good communication and timely work.', createdAt: new Date(Date.now() - 86400000 * 10).toISOString() }
    ]
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
      accountNumber: '381920491820',
      ifsc: 'HDFC0000456',
      accountHolderName: 'Neha Sharma',
      upiId: 'neha.hub@okhdfcbank'
    },
    activeJobs: 0,
    completedJobs: 98,
    rating: 4.8,
    isOnline: true,
    accountStatus: 'ACTIVE',
    lastActivityAt: new Date().toISOString(),
    walletBalancePaise: 280000,
    pendingEarningsPaise: 0,
    onHoldEarningsPaise: 0,
    totalEarningsPaise: 2450000,
    averageCompletionMinutes: 60,
    reviews: [
      { id: 'rev-4', rating: 5, comment: 'Excellent passport appointment guidance.', createdAt: new Date(Date.now() - 86400000 * 3).toISOString() }
    ]
  },
  {
    id: 'worker-mona-03',
    name: 'Mona E-Services & CSC Center',
    email: 'mona.estore@gmail.com',
    phone: '9678123456',
    businessName: 'Mona CSC Common Service Center',
    address: 'Near Gandhi Chowk, Station Road',
    city: 'Jaipur, Rajasthan',
    skills: ['Income/caste/residence certificate assistance', 'Certificate applications', 'Job application assistance'],
    bankDetails: {
      accountNumber: '492817294819',
      ifsc: 'ICIC0000789',
      accountHolderName: 'Mona Kumari',
      upiId: 'mona.csc@okicici'
    },
    activeJobs: 2,
    completedJobs: 64,
    rating: 4.7,
    isOnline: false,
    accountStatus: 'ACTIVE',
    lastActivityAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    walletBalancePaise: 154000,
    pendingEarningsPaise: 35000,
    onHoldEarningsPaise: 0,
    totalEarningsPaise: 1680000,
    averageCompletionMinutes: 50,
    reviews: [
      { id: 'rev-5', rating: 5, comment: 'Punctual and helpful with caste certificate forms.', createdAt: new Date(Date.now() - 86400000 * 7).toISOString() }
    ]
  }
];

// In-Memory dynamic store to ensure zero-downtime resilience
class ResilientStore {
  services: ServiceItem[] = [...OFFICIAL_SERVICES];
  workers: WorkerItem[] = [...OFFICIAL_WORKERS];
  users: Map<string, any> = new Map();
  orders: Map<string, any> = new Map();
  withdrawals: Map<string, WithdrawalItem> = new Map();
  notifications: NotificationItem[] = [];
  supportTickets: SupportTicketItem[] = [];
  chatMessages: ChatMessageItem[] = [];
  serviceProposals: ServiceProposalItem[] = [];
  auditLogs: any[] = [];

  complaints: Map<string, ComplaintItem> = new Map();
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
    urgentAlerts: true
  };

  constructor() {
    const defaultPasswordHash = bcrypt.hashSync('password123', 10);

    // Initialize Admin from environment if configured
    const adminEmail = process.env.ADMIN_EMAIL || 'rajkaran969355@gmail.com';
    const adminId = process.env.ADMIN_ID || 'Karan Kumar';
    const adminPass = process.env.ADMIN_PASSWORD;
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

    // Seed default verified workers as users
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

    // Seed a pending worker awaiting admin verification
    const pendingWorker: WorkerItem = {
      id: 'worker-vikram-02',
      name: 'Vikram Singh',
      email: 'vikram.cafe@test.com',
      phone: '9833445566',
      businessName: 'Vikram Online Seva Kendra',
      address: 'Shop 12, Main Market Road',
      city: 'Ranchi',
      skills: ['PAN Card Application & Correction', 'Voter ID Card Registration & Correction'],
      idProof: 'Aadhaar_and_PAN_Scan.pdf',
      photo: 'Vikram_Photo.jpg',
      bankDetails: {
        accountNumber: '112233445566',
        ifsc: 'HDFC0001234',
        accountHolderName: 'Vikram Singh',
        upiId: 'vikram@hdfcbank'
      },
      activeJobs: 0,
      completedJobs: 0,
      rating: 0,
      isOnline: false,
      accountStatus: 'PENDING',
      lastActivityAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      walletBalancePaise: 0,
      pendingEarningsPaise: 0,
      onHoldEarningsPaise: 0,
      totalEarningsPaise: 0,
      averageCompletionMinutes: 0,
      reviews: []
    };
    this.workers.push(pendingWorker);
    this.users.set(pendingWorker.id, {
      id: pendingWorker.id,
      email: pendingWorker.email,
      name: pendingWorker.name,
      phone: pendingWorker.phone,
      role: 'WORKER',
      password: defaultPasswordHash,
      passwordHash: defaultPasswordHash,
      isOnline: false,
      accountStatus: 'PENDING',
      businessName: pendingWorker.businessName,
      address: pendingWorker.address,
      city: pendingWorker.city,
      skills: pendingWorker.skills,
      bankDetails: pendingWorker.bankDetails
    });

    // Seed test customers
    this.users.set('usr-customer-1', {
      id: 'usr-customer-1',
      email: 'customer@test.com',
      name: 'Rajesh Kumar',
      phone: '9876543210',
      address: 'Boring Road, Patna, Bihar',
      role: 'CUSTOMER',
      accountStatus: 'ACTIVE',
      password: defaultPasswordHash,
      passwordHash: defaultPasswordHash,
      createdAt: new Date(Date.now() - 86400000 * 20).toISOString()
    });

    this.users.set('usr-customer-2', {
      id: 'usr-customer-2',
      email: 'pooja.sharma@test.com',
      name: 'Pooja Sharma',
      phone: '9811223344',
      address: 'House 42, Ward 15, Patna',
      role: 'CUSTOMER',
      accountStatus: 'ACTIVE',
      password: defaultPasswordHash,
      passwordHash: defaultPasswordHash,
      createdAt: new Date(Date.now() - 86400000 * 10).toISOString()
    });

    this.users.set('usr-customer-3', {
      id: 'usr-customer-3',
      email: 'sunil.verma@test.com',
      name: 'Sunil Verma',
      phone: '9988776655',
      address: 'Station Road, Ranchi, Jharkhand',
      role: 'CUSTOMER',
      accountStatus: 'ACTIVE',
      password: defaultPasswordHash,
      passwordHash: defaultPasswordHash,
      createdAt: new Date(Date.now() - 86400000 * 15).toISOString()
    });

    // Seed Sample Available Order (Offered to Amit Cyber Cafe, 10 min window)
    const availOfferExpiry = new Date(Date.now() + 8.5 * 60 * 1000).toISOString();
    this.orders.set('ord_avail_202', {
      id: 'ord_avail_202',
      customerId: 'usr-customer-2',
      customerName: 'Pooja Sharma',
      customerPhone: '9811223344',
      serviceId: 'voter-id',
      serviceName: 'Voter ID Card Registration & Correction',
      category: 'Government forms',
      status: 'OFFERED',
      assignedWorkerId: 'worker-amit-01',
      offerExpiresAt: availOfferExpiry,
      pricePaise: 14900,
      workerEarningsPaise: 11900,
      commissionPaise: 3000,
      createdAt: new Date(Date.now() - 90000).toISOString(),
      deadline: new Date(Date.now() + 24 * 3600000).toISOString(),
      formData: {
        voterServiceType: 'New Voter Registration (Form 6)',
        relativeName: 'Subhash Sharma',
        gender: 'Female',
        address: 'House 42, Ward 15, Patna'
      },
      documents: [
        { id: 'doc-voter-1', name: 'Aadhaar_Pooja.pdf', url: 'https://example.com/mock-aadhaar.pdf', size: '1.4 MB' },
        { id: 'doc-voter-2', name: 'Passport_Photo_Pooja.jpg', url: 'https://example.com/mock-photo.jpg', size: '420 KB' }
      ],
      deliverables: [],
      rejectionHistory: []
    });

    // Seed Sample Active Order (IN_PROGRESS for worker-amit-01)
    this.orders.set('ord_active_101', {
      id: 'ord_active_101',
      customerId: 'usr-customer-1',
      customerName: 'Rajesh Kumar',
      customerPhone: '9876543210',
      customerEmail: 'customer@test.com',
      serviceId: 'pan-card',
      serviceName: 'PAN Card Application & Correction',
      category: 'PAN-related services',
      status: 'IN_PROGRESS',
      assignedWorkerId: 'worker-amit-01',
      workerAcceptedAt: new Date(Date.now() - 3600000).toISOString(),
      workStartedAt: new Date(Date.now() - 1800000).toISOString(),
      timeSlot: {
        date: 'Today',
        startTime: '10:00 AM',
        endTime: '12:00 PM',
        agreedAt: new Date(Date.now() - 3500000).toISOString()
      },
      deadline: new Date(Date.now() + 4 * 3600000).toISOString(),
      pricePaise: 19900,
      workerEarningsPaise: 15900,
      commissionPaise: 4000,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      formData: {
        fullName: 'Rajesh Kumar',
        fatherName: 'Mohan Kumar',
        dateOfBirth: '1992-05-14',
        panType: 'New PAN Card (Form 49A)',
        address: 'Boring Road, Patna, Bihar'
      },
      documents: [
        { id: 'doc-1', name: 'Aadhaar_Card_Front.pdf', url: 'https://example.com/mock-aadhaar.pdf', size: '1.2 MB' },
        { id: 'doc-2', name: 'Passport_Photo.jpg', url: 'https://example.com/mock-photo.jpg', size: '450 KB' }
      ],
      deliverables: [],
      rejectionHistory: []
    });

    // Seed Sample Completed Order
    this.orders.set('ord_comp_303', {
      id: 'ord_comp_303',
      customerId: 'usr-customer-3',
      customerName: 'Sunil Verma',
      customerPhone: '9988776655',
      serviceId: 'income-caste-residence',
      serviceName: 'Income, Caste & Residence Certificates',
      category: 'Income/caste/residence certificate assistance',
      status: 'COMPLETED',
      assignedWorkerId: 'worker-amit-01',
      workerAcceptedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      completedAt: new Date(Date.now() - 86400000 * 2 + 3600000).toISOString(),
      pricePaise: 19900,
      workerEarningsPaise: 15900,
      commissionPaise: 4000,
      rating: 5,
      review: 'Fast delivery of the acknowledgement receipt! Highly satisfied.',
      formData: {
        fullName: 'Sunil Verma',
        certificateType: 'Income Certificate'
      },
      documents: [],
      deliverables: [
        {
          name: 'Income_Certificate_Ack_Receipt.pdf',
          url: 'https://example.com/mock-income-ack.pdf',
          size: '820 KB',
          uploadedAt: new Date(Date.now() - 86400000 * 2 + 3500000).toISOString(),
          isMandatory: true
        }
      ]
    });

    // Seed Chat Messages for Active Order
    this.chatMessages.push(
      {
        id: 'msg_001',
        orderId: 'ord_active_101',
        senderId: 'usr-customer-1',
        senderRole: 'CUSTOMER',
        senderName: 'Rajesh Kumar',
        message: 'Hello, I uploaded my Aadhaar card and photo. Please verify if the scan is clear.',
        createdAt: new Date(Date.now() - 2500000).toISOString()
      },
      {
        id: 'msg_002',
        orderId: 'ord_active_101',
        senderId: 'worker-amit-01',
        senderRole: 'WORKER',
        senderName: 'Amit Cyber Cafe',
        message: 'Checked! The documents are clear and legible. I am proceeding with the online Form 49A submission.',
        createdAt: new Date(Date.now() - 2000000).toISOString()
      }
    );

    // Seed Past Withdrawal
    this.withdrawals.set('wth_001', {
      id: 'wth_001',
      workerId: 'worker-amit-01',
      amountPaise: 150000, // Rs 1,500
      method: 'BANK',
      payoutDetails: {
        bankName: 'State Bank of India',
        accountNumber: '918237461928',
        ifsc: 'SBIN0001234'
      },
      status: 'COMPLETED',
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      processedAt: new Date(Date.now() - 86400000 * 3).toISOString()
    });

    // Seed Notifications for worker-amit-01
    this.notifications.push(
      {
        id: 'notif_001',
        recipientId: 'worker-amit-01',
        recipientRole: 'WORKER',
        type: 'ORDER_OFFER',
        title: 'New Order Offer Received',
        message: 'You have a new offer for "Voter ID Card Registration & Correction". Respond within 10 minutes.',
        orderId: 'ord_avail_202',
        isRead: false,
        createdAt: new Date(Date.now() - 90000).toISOString()
      },
      {
        id: 'notif_002',
        recipientId: 'worker-amit-01',
        recipientRole: 'WORKER',
        type: 'ORDER_COMPLETED',
        title: 'Earnings Credited',
        message: 'Order ord_comp_303 completed successfully. ₹159.00 has been credited to your wallet balance.',
        orderId: 'ord_comp_303',
        isRead: true,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
      },
      {
        id: 'notif_003',
        recipientId: 'worker-amit-01',
        recipientRole: 'WORKER',
        type: 'SYSTEM',
        title: 'Security Notice: Bank Detail Changes',
        message: 'For security reasons, bank account updates require verification via Help & Support desk.',
        isRead: true,
        createdAt: new Date(Date.now() - 86400000 * 6).toISOString()
      }
    );

    // Seed Support Ticket for worker-amit-01
    this.supportTickets.push({
      id: 'tkt_001',
      workerId: 'worker-amit-01',
      category: 'General',
      subject: 'New Service Proposal Inquiry',
      message: 'Can I add GST registration assistance under the business application category?',
      status: 'In Progress',
      replies: [
        {
          sender: 'ADMIN',
          message: 'Yes! Please use the Propose Service form from your left navigation menu. We will review and activate it within 24 hours.',
          createdAt: new Date(Date.now() - 86400000).toISOString()
        }
      ],
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString()
    });

    // Seed Sample Complaints (Customer & Worker)
    this.complaints.set('cmp_001', {
      id: 'cmp_001',
      type: 'CUSTOMER',
      complainantId: 'usr-customer-1',
      complainantName: 'Rajesh Kumar',
      complainantRole: 'CUSTOMER',
      category: 'Order-related',
      orderId: 'ord_active_101',
      subject: 'Delay in application submission receipt',
      description: 'The operator has not uploaded the government acknowledgement slip within the expected timeframe.',
      status: 'Open',
      internalNotes: [{ note: 'Checked order timeline. Operator has started work.', adminName: 'Admin', createdAt: new Date(Date.now() - 3600000).toISOString() }],
      replies: [{ sender: 'CUSTOMER', message: 'Please expedite this as tomorrow is the deadline.', createdAt: new Date(Date.now() - 3600000 * 2).toISOString() }],
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString()
    });

    this.complaints.set('cmp_002', {
      id: 'cmp_002',
      type: 'WORKER',
      complainantId: 'worker-amit-01',
      complainantName: 'Amit Cyber Cafe',
      complainantRole: 'WORKER',
      category: 'Payment/earning-related',
      orderId: 'ord_comp_303',
      subject: 'Inquiry regarding payout balance settlement',
      description: 'Need confirmation on monthly TDS and commission statement.',
      status: 'In Progress',
      internalNotes: [{ note: 'Statement generated and sent to finance queue.', adminName: 'Admin', createdAt: new Date(Date.now() - 86400000).toISOString() }],
      replies: [
        { sender: 'WORKER', message: 'Hello, please verify my monthly statement.', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
        { sender: 'ADMIN', message: 'We are reviewing your payout records.', createdAt: new Date(Date.now() - 86400000).toISOString() }
      ],
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString()
    });

    // Seed Admin Notifications
    this.notifications.push(
      {
        id: 'adm_notif_001',
        recipientId: 'ADM-001',
        recipientRole: 'ADMIN',
        type: 'WORKER_VERIFICATION_PENDING',
        title: 'New Worker Verification Pending',
        message: 'Vikram Singh (Vikram Online Seva Kendra) registered and submitted ID proof for verification.',
        isRead: false,
        createdAt: new Date(Date.now() - 3600000 * 3).toISOString()
      },
      {
        id: 'adm_notif_002',
        recipientId: 'ADM-001',
        recipientRole: 'ADMIN',
        type: 'NEW_COMPLAINT',
        title: 'New Customer Complaint Received',
        message: 'Rajesh Kumar filed a complaint for order ord_active_101 regarding application delay.',
        orderId: 'ord_active_101',
        isRead: false,
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 'adm_notif_003',
        recipientId: 'ADM-001',
        recipientRole: 'ADMIN',
        type: 'WITHDRAWAL_REQUEST',
        title: 'New Worker Withdrawal Request',
        message: 'Amit Cyber Cafe requested bank payout of ₹1,500.00 to State Bank of India.',
        isRead: false,
        createdAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'adm_notif_004',
        recipientId: 'ADM-001',
        recipientRole: 'ADMIN',
        type: 'SERVICE_APPROVAL_PENDING',
        title: 'Worker Service Proposal Submitted',
        message: 'Amit Cyber Cafe submitted a new service proposal for admin review.',
        isRead: true,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
      }
    );

    // Seed Customer Support Ticket
    this.supportTickets.push({
      id: 'tkt_cust_001',
      userId: 'usr-customer-1',
      userRole: 'CUSTOMER',
      userName: 'Rajesh Kumar',
      category: 'Order',
      subject: 'Inquiry on Aadhaar Biometric Appointment',
      message: 'Does this service cover the physical biometric update at the enrollment centre?',
      status: 'Open',
      replies: [],
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 4).toISOString()
    });
  }

  getServices(): ServiceItem[] {
    return this.services;
  }

  getService(id: string): ServiceItem | undefined {
    return this.services.find(s => s.id === id);
  }

  getWorkers(): WorkerItem[] {
    return this.workers;
  }

  getWorker(id: string): WorkerItem | undefined {
    return this.workers.find(w => w.id === id);
  }

  findUserByEmail(email: string): any | undefined {
    for (const u of this.users.values()) {
      if (u.email?.toLowerCase() === email.toLowerCase()) return u;
    }
    return undefined;
  }

  findUserById(id: string): any | undefined {
    if (this.users.has(id)) return this.users.get(id);
    for (const u of this.users.values()) {
      if (
        u.id?.toLowerCase() === id.toLowerCase() ||
        u.adminId?.toLowerCase() === id.toLowerCase() ||
        u.workerId?.toLowerCase() === id.toLowerCase() ||
        (u.name && u.name.toLowerCase() === id.toLowerCase())
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

  saveOrder(order: any): any {
    this.orders.set(order.id, order);
    return order;
  }

  getOrder(id: string): any | undefined {
    return this.orders.get(id);
  }

  getOrders(customerId?: string): any[] {
    const list = Array.from(this.orders.values());
    if (customerId) {
      return list.filter(o => o.customerId === customerId);
    }
    return list;
  }

  addAuditLog(log: any) {
    this.auditLogs.unshift({
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      ...log
    });
  }

  getAuditLogs(actorUserId?: string, action?: string): any[] {
    return this.auditLogs.filter(l => {
      if (actorUserId && l.actorUserId !== actorUserId) return false;
      if (action && l.action !== action) return false;
      return true;
    });
  }

  // --- Worker Lifecycle & Management Methods ---

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

      this.notifications.unshift({
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

    // Section 3 & 18: Bank details cannot be updated directly without support ticket verification
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

    // Record activity and verify online status
    const status = this.recordWorkerActivity(workerId);

    const now = Date.now();
    const allOrders = Array.from(this.orders.values());
    const availableList: any[] = [];

    allOrders.forEach(ord => {
      // Check for 10-min offer expiry
      if (ord.status === 'OFFERED' && ord.offerExpiresAt) {
        if (new Date(ord.offerExpiresAt).getTime() <= now) {
          ord.status = 'AVAILABLE';
          ord.assignedWorkerId = null;
        }
      }

      const isOfferedToThis = ord.status === 'OFFERED' && ord.assignedWorkerId === workerId;
      const isAvailableInPool = ord.status === 'AVAILABLE';

      if (isOfferedToThis || isAvailableInPool) {
        let remainingSeconds = 600;
        if (ord.offerExpiresAt) {
          const rem = Math.floor((new Date(ord.offerExpiresAt).getTime() - now) / 1000);
          remainingSeconds = rem > 0 ? rem : 0;
        }

        // Section 6: Strict Pre-Acceptance Privacy Enforcement
        // ONLY customer name, service name, payout amount, deadline, remaining offer timer!
        // DO NOT reveal customer phone, email, full address, or working documents!
        availableList.push({
          id: ord.id,
          serviceId: ord.serviceId,
          serviceName: ord.serviceName || ord.service?.name,
          category: ord.category,
          pricePaise: ord.pricePaise,
          workerEarningsPaise: ord.workerEarningsPaise || Math.round(ord.pricePaise * 0.8),
          customerName: ord.customerName || ord.customer?.name || 'Customer',
          createdAt: ord.createdAt,
          deadline: ord.deadline,
          offerExpiresAt: ord.offerExpiresAt,
          remainingSeconds,
          status: ord.status
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
      !excludedWorkerIds.includes(w.id)
    );

    if (candidates.length === 0) return null;

    // Section 8: Sort by lowest Active/Accepted workload, tie -> faster historical average completion speed
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
      this.notifications.unshift({
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

    // Section 8: Immediately offer to next suitable Online worker
    const nextWorker = this.findBestSuitableWorker(order.category, order.rejectedWorkerIds);
    if (nextWorker) {
      order.status = 'OFFERED';
      order.assignedWorkerId = nextWorker.id;
      order.offerExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      this.notifications.unshift({
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
      this.notifications.unshift({
        id: `notif_adm_${Date.now()}`,
        recipientId: 'ADM-001',
        recipientRole: 'ADMIN',
        type: 'NO_SUITABLE_WORKER',
        title: 'No Suitable Worker Available',
        message: `Order #${order.id} has no available online worker. Please manually assign a worker.`,
        orderId: order.id,
        isRead: false,
        createdAt: new Date().toISOString()
      });
      this.notifications.unshift({
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

  acceptOrder(orderId: string, workerId: string): any {
    const worker = this.getWorker(workerId);
    if (!worker) throw new Error('Worker not found');
    if (!worker.isOnline) throw new Error('You must be Online to accept orders');
    if (worker.accountStatus === 'SUSPENDED' || worker.accountStatus === 'BLOCKED') {
      throw new Error('Worker account is suspended or blocked');
    }

    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');

    // Section 7 & 33 Concurrency: Two workers must never accept same order
    if (order.status === 'ACCEPTED' || order.status === 'IN_PROGRESS' || order.status === 'COMPLETED') {
      const err: any = new Error('Order has already been accepted by another worker');
      err.statusCode = 409;
      throw err;
    }

    if (order.status !== 'OFFERED' && order.status !== 'AVAILABLE') {
      throw new Error(`Order cannot be accepted in status: ${order.status}`);
    }

    if (order.status === 'OFFERED' && order.offerExpiresAt) {
      if (new Date(order.offerExpiresAt).getTime() < Date.now()) {
        throw new Error('This offer has expired (10-minute response window passed)');
      }
    }

    if (order.assignedWorkerId && order.assignedWorkerId !== workerId) {
      const err: any = new Error('Order is currently offered/assigned to another worker');
      err.statusCode = 409;
      throw err;
    }

    order.status = 'ACCEPTED';
    order.assignedWorkerId = workerId;
    order.workerAcceptedAt = new Date().toISOString();
    order.acceptedOrder5HourWindowExpiresAt = new Date(Date.now() + 5 * 3600 * 1000).toISOString();
    order.workerEarningsPaise = order.workerEarningsPaise || Math.round(order.pricePaise * 0.8);

    worker.activeJobs += 1;
    worker.pendingEarningsPaise += order.workerEarningsPaise;
    worker.lastActivityAt = new Date().toISOString();

    this.notifications.unshift({
      id: `notif_${Date.now()}`,
      recipientId: workerId,
      recipientRole: 'WORKER',
      type: 'ORDER_ACCEPTED',
      title: 'Order Accepted',
      message: `You accepted order ${order.id} for ${order.serviceName}. Customer documents and workspace are now unlocked.`,
      orderId: order.id,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    this.addAuditLog({
      actorUserId: workerId,
      actorRole: 'WORKER',
      action: 'ORDER_ACCEPTED',
      orderId: order.id
    });

    return order;
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
      if (order.status === 'ACCEPTED') {
        // Section 10: 5-Hour window check
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

    // Immediately offer to next suitable Online worker
    const nextWorker = this.findBestSuitableWorker(order.category, order.rejectedWorkerIds);
    if (nextWorker) {
      order.status = 'OFFERED';
      order.assignedWorkerId = nextWorker.id;
      order.offerExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      this.notifications.unshift({
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
      this.notifications.unshift({
        id: `notif_adm_${Date.now()}`,
        recipientId: 'ADM-001',
        recipientRole: 'ADMIN',
        type: 'NO_SUITABLE_WORKER',
        title: 'No Suitable Worker Available',
        message: `Order #${order.id} was rejected and has no available online worker. Please manually assign.`,
        orderId: order.id,
        isRead: false,
        createdAt: new Date().toISOString()
      });
      this.notifications.unshift({
        id: `notif_c_${Date.now()}`,
        recipientId: order.customerId,
        recipientRole: 'CUSTOMER',
        type: 'NO_WORKER_AVAILABLE',
        title: 'Looking for Available Operator',
        message: `We are searching for another available operator to fulfill your order #${order.id}.`,
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

  setOrderTimeSlot(orderId: string, workerId: string, timeSlot: { date?: string; startTime: string; endTime: string }): any {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');
    if (order.assignedWorkerId !== workerId) throw new Error('Unauthorized');

    order.timeSlot = {
      ...timeSlot,
      agreedAt: new Date().toISOString(),
      proposedBy: workerId
    };

    this.chatMessages.push({
      id: `msg_${Date.now()}`,
      orderId,
      senderId: workerId,
      senderRole: 'WORKER',
      senderName: this.getWorker(workerId)?.name || 'Worker',
      message: `[Time Slot Proposed]: ${timeSlot.date || 'Today'} from ${timeSlot.startTime} to ${timeSlot.endTime}`,
      createdAt: new Date().toISOString()
    });

    return order;
  }

  startWork(orderId: string, workerId: string): any {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');
    if (order.assignedWorkerId !== workerId) throw new Error('Unauthorized');

    order.status = 'IN_PROGRESS';
    order.workStartedAt = new Date().toISOString();

    this.addAuditLog({
      actorUserId: workerId,
      actorRole: 'WORKER',
      action: 'WORK_STARTED',
      orderId: order.id
    });

    return order;
  }

  uploadDeliverables(orderId: string, workerId: string, deliverables: Array<{ name: string; url: string; size?: string; isMandatory?: boolean }>): any {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');
    if (order.assignedWorkerId !== workerId) throw new Error('Unauthorized');

    // Section 12: Exactly 1 mandatory output file + max 1 optional file (total <= 2)
    if (!deliverables || deliverables.length === 0) {
      throw new Error('At least 1 mandatory output receipt/file must be provided');
    }
    if (deliverables.length > 2) {
      throw new Error('Maximum 2 deliverables allowed (1 mandatory final output + 1 optional proof/receipt)');
    }

    deliverables[0].isMandatory = true;
    order.deliverables = deliverables;

    return order;
  }

  finishWork(orderId: string, workerId: string, note?: string): any {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');
    if (order.assignedWorkerId !== workerId) throw new Error('Unauthorized');

    // Section 12: Cannot finish without at least 1 uploaded deliverable
    if (!order.deliverables || order.deliverables.length === 0) {
      throw new Error('You must upload the final receipt/document before finishing the order');
    }

    order.status = 'COMPLETED';
    order.completedAt = new Date().toISOString();
    order.completionNote = note;

    const worker = this.getWorker(workerId);
    if (worker) {
      const earnings = order.workerEarningsPaise || Math.round(order.pricePaise * 0.8);
      worker.walletBalancePaise += earnings;
      worker.pendingEarningsPaise = Math.max(0, worker.pendingEarningsPaise - earnings);
      worker.totalEarningsPaise += earnings;
      worker.completedJobs += 1;
      worker.activeJobs = Math.max(0, worker.activeJobs - 1);
    }

    // Customer Notification
    this.notifications.unshift({
      id: `notif_${Date.now()}`,
      recipientId: order.customerId,
      recipientRole: 'CUSTOMER',
      type: 'ORDER_COMPLETED',
      title: 'Order Completed!',
      message: `Your order for "${order.serviceName}" has been successfully completed. You can view/download your deliverables now.`,
      orderId: order.id,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    this.addAuditLog({
      actorUserId: workerId,
      actorRole: 'WORKER',
      action: 'WORK_COMPLETED',
      orderId: order.id
    });

    return order;
  }

  getOrderForWorker(orderId: string, workerId: string): any {
    const order = this.orders.get(orderId);
    if (!order) return undefined;

    // Clone order to enforce privacy
    const clone = JSON.parse(JSON.stringify(order));

    // Section 15: Post-Completion Privacy & Data Purge
    // After completion/cancellation, worker loses access to customer phone, personal docs, and active chat
    if (clone.status === 'COMPLETED' || clone.status === 'CANCELLED') {
      if (clone.customerPhone) {
        clone.customerPhone = clone.customerPhone.replace(/(\d{2})\d+(\d{2})/, '$1******$2');
      }
      clone.customerEmail = '***@***.com';
      clone.documents = []; // Purged customer working documents
      clone.deliverables = []; // Purged final output from worker view per Section 15
      clone.isChatClosed = true;
    }

    return clone;
  }

  getWorkerJobs(workerId: string, statusFilter?: string): any[] {
    const all = Array.from(this.orders.values()).filter(o => o.assignedWorkerId === workerId);
    if (!statusFilter) return all.map(o => this.getOrderForWorker(o.id, workerId));

    if (statusFilter === 'ACTIVE') {
      return all
        .filter(o => ['ACCEPTED', 'IN_PROGRESS', 'CORRECTION_REQUIRED'].includes(o.status))
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
    if (!worker) throw new Error('Worker not found');

    const completedOrders = Array.from(this.orders.values()).filter(
      o => o.assignedWorkerId === workerId && o.status === 'COMPLETED'
    );

    const todayDateStr = new Date().toISOString().split('T')[0];
    const todayOrders = completedOrders.filter(
      o => o.completedAt && o.completedAt.startsWith(todayDateStr)
    );

    const todayEarningsPaise = todayOrders.reduce(
      (sum, o) => sum + (o.workerEarningsPaise || Math.round(o.pricePaise * 0.8)),
      0
    );

    const transactions = completedOrders.map(o => ({
      id: `tx_${o.id}`,
      orderId: o.id,
      serviceName: o.serviceName,
      type: 'CREDIT',
      amountPaise: o.workerEarningsPaise || Math.round(o.pricePaise * 0.8),
      status: 'SETTLED',
      date: o.completedAt
    }));

    // Include withdrawals in transaction ledger
    Array.from(this.withdrawals.values())
      .filter(w => w.workerId === workerId)
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

    // Minimum withdrawal rule: Rs 100 (10000 paise)
    if (amountPaise < 10000) {
      throw new Error('Minimum withdrawal amount is ₹100.00');
    }

    if (worker.walletBalancePaise < amountPaise) {
      throw new Error('Insufficient wallet balance for this withdrawal');
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

    this.notifications.unshift({
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

  getOrderChat(orderId: string, workerId: string): { isClosed: boolean; messages: ChatMessageItem[] } {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');

    const isClosed = order.status === 'COMPLETED' || order.status === 'CANCELLED';
    if (isClosed) {
      // Section 21: Worker loses chat access after order completion
      return { isClosed: true, messages: [] };
    }

    const messages = this.chatMessages.filter(m => m.orderId === orderId);
    return { isClosed: false, messages };
  }

  addChatMessage(orderId: string, senderId: string, senderRole: 'WORKER' | 'CUSTOMER', senderName: string, message: string): ChatMessageItem {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');

    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new Error('Chat is closed for this order.');
    }

    const chatMsg: ChatMessageItem = {
      id: `msg_${Date.now()}`,
      orderId,
      senderId,
      senderRole,
      senderName,
      message,
      createdAt: new Date().toISOString()
    };

    this.chatMessages.push(chatMsg);
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
    const proposal: ServiceProposalItem = {
      id: `prop_${Date.now()}`,
      workerId,
      name: data.name,
      description: data.description,
      category: data.category || 'General',
      suggestedPricePaise: data.suggestedPricePaise || 19900,
      estimatedTime: data.estimatedTime || '24 Hours',
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    this.serviceProposals.unshift(proposal);
    return proposal;
  }

  getWorkerProposals(workerId: string): ServiceProposalItem[] {
    return this.serviceProposals.filter(p => p.workerId === workerId);
  }

  // --- Admin Portal Operations & Overrides ---

  getAdminDashboardStats() {
    const totalCustomers = Array.from(this.users.values()).filter(u => u.role === 'CUSTOMER').length;
    const totalWorkers = this.workers.length;
    const onlineWorkers = this.workers.filter(w => w.isOnline).length;
    
    const allOrders = Array.from(this.orders.values());
    const activeOrders = allOrders.filter(o => ['ACCEPTED', 'IN_PROGRESS', 'CORRECTION_REQUIRED'].includes(o.status)).length;
    const availableOrders = allOrders.filter(o => ['AVAILABLE', 'OFFERED'].includes(o.status)).length;
    const completedOrdersList = allOrders.filter(o => o.status === 'COMPLETED');
    const completedOrders = completedOrdersList.length;

    const pendingServiceApprovals = this.serviceProposals.filter(p => p.status === 'PENDING').length;
    const pendingWorkerVerification = this.workers.filter(w => w.accountStatus === 'PENDING').length;

    let pendingEarningsPaise = 0;
    this.workers.forEach(w => {
      pendingEarningsPaise += (w.pendingEarningsPaise || 0);
    });

    const pendingWithdrawals = Array.from(this.withdrawals.values()).filter(w => w.status === 'PENDING').length;
    const complaintsDisputes = Array.from(this.complaints.values()).filter(c => c.status !== 'Resolved').length;

    let totalRevenuePaise = 0;
    let totalCommissionPaise = 0;
    completedOrdersList.forEach(o => {
      totalRevenuePaise += (o.pricePaise || 0);
      totalCommissionPaise += (o.commissionPaise || Math.round((o.pricePaise || 0) * 0.2));
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const todayOrders = allOrders.filter(o => o.createdAt && o.createdAt.startsWith(todayStr));
    const todayEarningsPaise = completedOrdersList
      .filter(o => o.completedAt && o.completedAt.startsWith(todayStr))
      .reduce((sum, o) => sum + (o.workerEarningsPaise || Math.round((o.pricePaise || 0) * 0.8)), 0);

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

    if (filter?.status && filter.status !== 'ALL') {
      list = list.filter(w => w.accountStatus === filter.status);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(w => 
        w.id.toLowerCase().includes(q) ||
        w.name.toLowerCase().includes(q) ||
        (w.phone && w.phone.includes(q)) ||
        (w.email && w.email.toLowerCase().includes(q)) ||
        (w.city && w.city.toLowerCase().includes(q))
      );
    }

    return list;
  }

  createWorkerAdmin(data: {
    workerName: string;
    workerId: string;
    mobile: string;
    email: string;
    businessName: string;
    address: string;
    city: string;
    skills: string[];
    idProof: string;
    photo: string;
    bankDetails: {
      accountNumber: string;
      ifsc: string;
      accountHolderName: string;
      upiId: string;
    };
  }) {
    if (!data.workerName || !data.workerId || !data.mobile || !data.email) {
      throw new Error('Worker Name, ID, Mobile, and Email are mandatory');
    }

    if (this.workers.some(w => w.id === data.workerId) || this.users.has(data.workerId)) {
      throw new Error(`Worker with ID "${data.workerId}" already exists`);
    }

    const defaultPasswordHash = bcrypt.hashSync('password123', 10);
    const newWorker: WorkerItem = {
      id: data.workerId,
      workerId: data.workerId,
      status: 'PENDING',
      name: data.workerName,
      email: data.email,
      phone: data.mobile,
      businessName: data.businessName,
      address: data.address,
      city: data.city,
      skills: data.skills || [],
      idProof: data.idProof || 'Identity_Proof.pdf',
      photo: data.photo || 'Worker_Photo.jpg',
      bankDetails: data.bankDetails,
      activeJobs: 0,
      completedJobs: 0,
      rating: 5.0,
      isOnline: false,
      accountStatus: 'PENDING',
      idVerified: false,
      workerProfile: {
        idVerified: false,
        businessName: data.businessName,
        skills: data.skills || [],
        bankDetails: data.bankDetails,
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
    this.users.set(data.workerId, {
      id: data.workerId,
      email: data.email,
      name: data.workerName,
      phone: data.mobile,
      role: 'WORKER',
      password: defaultPasswordHash,
      passwordHash: defaultPasswordHash,
      isOnline: false,
      accountStatus: 'PENDING',
      businessName: data.businessName,
      address: data.address,
      city: data.city,
      skills: data.skills,
      bankDetails: data.bankDetails
    });

    this.notifications.unshift({
      id: `notif_${Date.now()}`,
      recipientId: 'ADM-001',
      recipientRole: 'ADMIN',
      type: 'WORKER_VERIFICATION_PENDING',
      title: 'New Worker Created / Verification Pending',
      message: `${data.workerName} (${data.workerId}) has been added and requires verification.`,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    this.addAuditLog({
      actorUserId: 'ADM-001',
      actorRole: 'ADMIN',
      action: 'WORKER_CREATED',
      entityType: 'WORKER',
      entityId: data.workerId,
      metadata: { name: data.workerName, businessName: data.businessName }
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

    this.notifications.unshift({
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
      actorUserId: 'ADM-001',
      actorRole: 'ADMIN',
      action: approved ? 'WORKER_VERIFIED' : 'WORKER_VERIFICATION_REJECTED',
      entityType: 'WORKER',
      entityId: workerId,
      metadata: { note }
    });

    return worker;
  }

  setWorkerAccountStatusAdmin(workerId: string, status: 'ACTIVE' | 'PENDING' | 'OFFLINE' | 'SUSPENDED' | 'BLOCKED', reason?: string) {
    const worker = this.getWorker(workerId);
    if (!worker) throw new Error('Worker not found');

    worker.accountStatus = status;
    worker.status = status;
    if (status === 'SUSPENDED' || status === 'BLOCKED' || status === 'OFFLINE') {
      worker.isOnline = false;
    }
    if (status === 'ACTIVE') {
      worker.idVerified = true;
      if (worker.workerProfile) worker.workerProfile.idVerified = true;
    }

    const user = this.users.get(workerId);
    if (user) {
      user.accountStatus = status;
      if (!worker.isOnline) user.isOnline = false;
    }

    this.addAuditLog({
      actorUserId: 'ADM-001',
      actorRole: 'ADMIN',
      action: 'WORKER_STATUS_CHANGED',
      entityType: 'WORKER',
      entityId: workerId,
      metadata: { newStatus: status, reason }
    });

    return worker;
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
      proposals
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

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          address: u.address,
          accountStatus: u.accountStatus || 'ACTIVE',
          ordersCount: custOrders.length,
          totalSpentPaise,
          createdAt: u.createdAt
        };
      });

    let list = customers;
    if (filter?.status && filter.status !== 'ALL') {
      list = list.filter(c => c.accountStatus === filter.status);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(c =>
        c.id.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
      );
    }
    return list;
  }

  setCustomerStatusAdmin(customerId: string, status: 'ACTIVE' | 'BLOCKED' | 'DEACTIVATED', reason?: string) {
    const user = this.users.get(customerId);
    if (!user) throw new Error('Customer not found');

    user.accountStatus = status;

    this.addAuditLog({
      actorUserId: 'ADM-001',
      actorRole: 'ADMIN',
      action: 'CUSTOMER_STATUS_CHANGED',
      entityType: 'CUSTOMER',
      entityId: customerId,
      metadata: { newStatus: status, reason }
    });

    return user;
  }

  getCustomerDetailedAdmin(customerId: string) {
    const customer = this.users.get(customerId);
    if (!customer) throw new Error('Customer not found');

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
      return {
        ...o,
        workerName: worker?.name || o.workerName || (o.assignedWorkerId ? 'Worker' : null),
        customerName: customer?.name || o.customerName || 'Customer',
        customerPhone: customer?.phone || o.customerPhone
      };
    });

    if (filter?.status && filter.status !== 'ALL') {
      list = list.filter(o => o.status === filter.status);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(o =>
        o.id.toLowerCase().includes(q) ||
        (o.serviceName && o.serviceName.toLowerCase().includes(q)) ||
        (o.customerName && o.customerName.toLowerCase().includes(q)) ||
        (o.workerName && o.workerName.toLowerCase().includes(q))
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

    return {
      order,
      customer,
      worker,
      chat,
      complaints,
      auditLogs
    };
  }

  adminAssignWorker(orderId: string, workerId: string, note?: string) {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');

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
      assignedBy: 'ADM-001',
      assignedAt: new Date().toISOString(),
      note: note || 'Administrative manual override assignment'
    };

    worker.activeJobs += 1;
    worker.pendingEarningsPaise += (order.workerEarningsPaise || Math.round(order.pricePaise * 0.8));

    this.notifications.unshift({
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
      actorUserId: 'ADM-001',
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
      actorUserId: 'ADM-001',
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
      requestedBy: 'ADM-001',
      requestedAt: new Date().toISOString(),
      deadline,
      reason,
      instruction,
      correctedDeliverables: []
    };

    order.isEarningsOnHold = true;
    order.earningsHold = true;

    this.notifications.unshift({
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

    this.notifications.unshift({
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

    this.addAuditLog({
      actorUserId: 'ADM-001',
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

    order.isEarningsOnHold = true;
    order.earningsHold = true;
    order.earningsHoldReason = reason || 'Under administrative investigation';

    if (order.assignedWorkerId) {
      const worker = this.getWorker(order.assignedWorkerId);
      if (worker) {
        const amt = order.workerEarningsPaise || Math.round((order.pricePaise || 0) * 0.8);
        worker.onHoldEarningsPaise = (worker.onHoldEarningsPaise || 0) + amt;
        if (worker.walletBalancePaise >= amt) {
          worker.walletBalancePaise -= amt;
        }
      }
    }

    this.addAuditLog({
      actorUserId: 'ADM-001',
      actorRole: 'ADMIN',
      action: 'WORKER_EARNINGS_HOLD',
      entityType: 'ORDER',
      entityId: orderId,
      metadata: { reason }
    });

    return order;
  }

  adminReleaseWorkerEarnings(orderId: string) {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');

    order.isEarningsOnHold = false;
    order.earningsHold = false;
    order.earningsHoldReason = undefined;

    if (order.assignedWorkerId) {
      const worker = this.getWorker(order.assignedWorkerId);
      if (worker) {
        const amt = order.workerEarningsPaise || Math.round((order.pricePaise || 0) * 0.8);
        worker.onHoldEarningsPaise = Math.max(0, (worker.onHoldEarningsPaise || 0) - amt);
        worker.walletBalancePaise += amt;
      }
    }

    this.addAuditLog({
      actorUserId: 'ADM-001',
      actorRole: 'ADMIN',
      action: 'WORKER_EARNINGS_RELEASED',
      entityType: 'ORDER',
      entityId: orderId
    });

    return order;
  }

  adminRefundOrder(orderId: string, reason: string) {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Order not found');

    order.status = 'REFUNDED';
    order.refund = {
      refundedAt: new Date().toISOString(),
      reason,
      amountPaise: order.pricePaise
    };

    if (order.assignedWorkerId) {
      const worker = this.getWorker(order.assignedWorkerId);
      if (worker) {
        const amt = order.workerEarningsPaise || Math.round((order.pricePaise || 0) * 0.8);
        if (order.isEarningsOnHold) {
          worker.onHoldEarningsPaise = Math.max(0, (worker.onHoldEarningsPaise || 0) - amt);
        } else {
          worker.pendingEarningsPaise = Math.max(0, (worker.pendingEarningsPaise || 0) - amt);
        }
        worker.activeJobs = Math.max(0, worker.activeJobs - 1);
      }
      order.workerEarningsPaise = 0;
    }

    this.notifications.unshift({
      id: `notif_${Date.now()}`,
      recipientId: order.customerId,
      recipientRole: 'CUSTOMER',
      type: 'ORDER_REFUNDED',
      title: 'Refund Processed',
      message: `Your order #${order.id} has been refunded: ₹${((order.pricePaise || 0) / 100).toFixed(2)} credited to your wallet. Reason: ${reason}`,
      orderId: order.id,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    this.addAuditLog({
      actorUserId: 'ADM-001',
      actorRole: 'ADMIN',
      action: 'ORDER_REFUNDED',
      entityType: 'ORDER',
      entityId: orderId,
      metadata: { reason, amountPaise: order.pricePaise }
    });

    return order;
  }

  createOfficialServiceAdmin(data: any) {
    if (!data.name || !data.category || !data.pricePaise) {
      throw new Error('Service Name, Category, and Price are required');
    }

    const id = data.id || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newService: ServiceItem = {
      id,
      name: data.name,
      description: data.description || '',
      category: data.category,
      pricePaise: Number(data.pricePaise),
      estimatedTime: data.estimatedTime || '24-48 Hours',
      requiredDocuments: data.requiredDocuments || ['Aadhaar Card'],
      formSchema: data.formSchema || [],
      status: 'ACTIVE',
      approvalStatus: 'APPROVED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.services.unshift(newService);

    this.addAuditLog({
      actorUserId: 'ADM-001',
      actorRole: 'ADMIN',
      action: 'SERVICE_CREATED',
      entityType: 'SERVICE',
      entityId: id,
      metadata: { name: newService.name, pricePaise: newService.pricePaise }
    });

    return newService;
  }

  updateOfficialServiceAdmin(serviceId: string, updates: Partial<ServiceItem>) {
    const service = this.getService(serviceId);
    if (!service) throw new Error('Service not found');

    if (updates.name) service.name = updates.name;
    if (updates.description) service.description = updates.description;
    if (updates.category) service.category = updates.category;
    if (updates.pricePaise !== undefined) service.pricePaise = Number(updates.pricePaise);
    if (updates.estimatedTime) service.estimatedTime = updates.estimatedTime;
    if (updates.requiredDocuments) service.requiredDocuments = updates.requiredDocuments;
    if (updates.status) service.status = updates.status;
    service.updatedAt = new Date().toISOString();

    this.addAuditLog({
      actorUserId: 'ADM-001',
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
      actorUserId: 'ADM-001',
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
      actorUserId: 'ADM-001',
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

  approveProposalAdmin(proposalId: string, adminId: string) {
    const proposal = this.serviceProposals.find(p => p.id === proposalId);
    if (!proposal) throw new Error('Proposal not found');

    proposal.status = 'APPROVED';

    const serviceId = proposal.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newService: ServiceItem = {
      id: serviceId,
      name: proposal.name,
      description: proposal.description,
      category: proposal.category,
      pricePaise: proposal.suggestedPricePaise,
      estimatedTime: proposal.estimatedTime,
      requiredDocuments: ['Aadhaar Card'],
      status: 'ACTIVE',
      approvalStatus: 'APPROVED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.services.unshift(newService);

    this.notifications.unshift({
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
      metadata: { serviceName: proposal.name }
    });

    return { proposal, newService };
  }

  rejectProposalAdmin(proposalId: string, adminId: string, reason?: string) {
    const proposal = this.serviceProposals.find(p => p.id === proposalId);
    if (!proposal) throw new Error('Proposal not found');

    proposal.status = 'REJECTED';
    proposal.adminComment = reason || 'Does not meet marketplace catalog standards';

    this.notifications.unshift({
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
    const completedOrders = allOrders.filter(o => o.status === 'COMPLETED');

    let totalPlatformRevenuePaise = 0;
    let totalPlatformCommissionPaise = 0;
    let totalWorkerEarningsPaise = 0;

    completedOrders.forEach(o => {
      totalPlatformRevenuePaise += (o.pricePaise || 0);
      totalPlatformCommissionPaise += (o.commissionPaise || Math.round((o.pricePaise || 0) * 0.2));
      totalWorkerEarningsPaise += (o.workerEarningsPaise || Math.round((o.pricePaise || 0) * 0.8));
    });

    let pendingEarningsPaise = 0;
    let onHoldEarningsPaise = 0;
    this.workers.forEach(w => {
      pendingEarningsPaise += (w.pendingEarningsPaise || 0);
      onHoldEarningsPaise += (w.onHoldEarningsPaise || 0);
    });

    const refunds = allOrders
      .filter(o => o.status === 'CANCELLED' && o.refund)
      .reduce((sum, o) => sum + (o.refund?.amountPaise || o.pricePaise || 0), 0);

    return {
      totalPlatformRevenuePaise,
      totalPlatformCommissionPaise,
      totalWorkerEarningsPaise,
      pendingEarningsPaise,
      onHoldEarningsPaise,
      totalRefundsPaise: refunds
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

  approveWithdrawalAdmin(withdrawalId: string, adminId: string) {
    const withdrawal = this.withdrawals.get(withdrawalId);
    if (!withdrawal) throw new Error('Withdrawal request not found');

    withdrawal.status = 'APPROVED';
    withdrawal.processedAt = new Date().toISOString();

    this.notifications.unshift({
      id: `notif_${Date.now()}`,
      recipientId: withdrawal.workerId,
      recipientRole: 'WORKER',
      type: 'WITHDRAWAL_APPROVED',
      title: 'Withdrawal Processed',
      message: `Your withdrawal of ₹${(withdrawal.amountPaise / 100).toFixed(2)} has been processed to your ${withdrawal.method}.`,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    this.addAuditLog({
      actorUserId: adminId,
      actorRole: 'ADMIN',
      action: 'WITHDRAWAL_APPROVED',
      entityType: 'WITHDRAWAL',
      entityId: withdrawalId,
      metadata: { amountPaise: withdrawal.amountPaise }
    });

    return withdrawal;
  }

  rejectWithdrawalAdmin(withdrawalId: string, adminId: string, reason: string) {
    const withdrawal = this.withdrawals.get(withdrawalId);
    if (!withdrawal) throw new Error('Withdrawal request not found');

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

    this.notifications.unshift({
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

  getTopEarningWorkersAdmin(period: 'daily' | 'monthly') {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const monthStr = todayStr.substring(0, 7);

    const rankings = this.workers.map(w => {
      const orders = Array.from(this.orders.values()).filter(o => 
        o.assignedWorkerId === w.id && o.status === 'COMPLETED'
      );

      const filteredOrders = orders.filter(o => {
        if (!o.completedAt) return false;
        if (period === 'daily') return o.completedAt.startsWith(todayStr);
        return o.completedAt.startsWith(monthStr);
      });

      const totalEarningsPaise = filteredOrders.reduce(
        (sum, o) => sum + (o.workerEarningsPaise || Math.round((o.pricePaise || 0) * 0.8)),
        0
      );

      return {
        workerId: w.id,
        workerName: w.name,
        businessName: w.businessName,
        completedOrders: filteredOrders.length,
        totalEarningsPaise
      };
    });

    rankings.sort((a, b) => b.totalEarningsPaise - a.totalEarningsPaise);
    return rankings.map((r, index) => ({ ...r, rank: index + 1 }));
  }

  getAllComplaintsAdmin(filter?: { type?: string; status?: string; search?: string }) {
    let list = Array.from(this.complaints.values());

    if (filter?.type && filter.type !== 'ALL') {
      list = list.filter(c => c.type === filter.type);
    }
    if (filter?.status && filter.status !== 'ALL') {
      list = list.filter(c => c.status === filter.status);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(c =>
        c.id.toLowerCase().includes(q) ||
        (c.orderId && c.orderId.toLowerCase().includes(q)) ||
        c.complainantName.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q)
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

    this.notifications.unshift({
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
      actorUserId: 'ADM-001',
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

  resolveComplaintAdmin(complaintId: string, decision: 'APPROVE' | 'CORRECTION' | 'REFUND' | 'RESOLVED', resolutionNote: string) {
    const complaint = this.complaints.get(complaintId);
    if (!complaint) throw new Error('Complaint not found');

    complaint.status = 'Resolved';
    complaint.resolution = resolutionNote;
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

    this.addAuditLog({
      actorUserId: 'ADM-001',
      actorRole: 'ADMIN',
      action: 'COMPLAINT_RESOLVED',
      entityType: 'COMPLAINT',
      entityId: complaintId,
      metadata: { decision, resolutionNote }
    });

    return complaint;
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
      this.notifications.unshift({
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

    let columns = ['Metric / Item', 'Details', 'Volume / Value', 'Status / Timestamp'];
    let rows: any[] = [];
    let kpis: any[] = [];

    if (reportType.includes('revenue') || reportType.includes('commission')) {
      columns = ['Order ID', 'Service', 'Price (Rs)', 'Worker Earning (Rs)', 'Platform Commission (Rs)', 'Status', 'Date'];
      rows = allOrders.map(o => [
        o.id.slice(0, 10),
        o.serviceName,
        `₹${((o.pricePaise || 0) / 100).toFixed(2)}`,
        `₹${((o.workerEarningsPaise || 0) / 100).toFixed(2)}`,
        `₹${((o.commissionPaise || 0) / 100).toFixed(2)}`,
        o.status,
        new Date(o.createdAt).toLocaleDateString()
      ]);
      kpis = [
        { label: 'Total Revenue', value: `₹${((summary.totalRevenuePaise || 0) / 100).toFixed(2)}` },
        { label: 'Commission Earned', value: `₹${((summary.totalCommissionPaise || 0) / 100).toFixed(2)}` },
        { label: 'Orders Processed', value: allOrders.length }
      ];
    } else if (reportType.includes('payout') || reportType.includes('withdrawal')) {
      columns = ['Withdrawal ID', 'Worker ID', 'Amount (Rs)', 'Destination', 'Status', 'Date'];
      rows = allWithdrawals.map(w => [
        w.id.slice(0, 10),
        w.workerId,
        `₹${((w.amountPaise || 0) / 100).toFixed(2)}`,
        w.method,
        w.status,
        new Date(w.createdAt).toLocaleDateString()
      ]);
      kpis = [
        { label: 'Total Withdrawals', value: allWithdrawals.length },
        { label: 'Pending Requests', value: allWithdrawals.filter(w => w.status === 'PENDING').length }
      ];
    } else if (reportType.includes('worker')) {
      columns = ['Worker Name', 'City', 'Completed Orders', 'Rating', 'Total Earnings (Rs)', 'Status'];
      rows = this.workers.map(w => [
        w.name,
        w.city,
        w.completedJobs,
        `★ ${w.rating}`,
        `₹${((w.totalEarningsPaise || 0) / 100).toFixed(2)}`,
        w.accountStatus
      ]);
      kpis = [
        { label: 'Total Workers', value: this.workers.length },
        { label: 'Active Online', value: this.workers.filter(w => w.isOnline).length }
      ];
    } else if (reportType.includes('complaint')) {
      columns = ['Complaint ID', 'Complainant', 'Category', 'Subject', 'Status', 'Date'];
      rows = allComplaints.map(c => [
        c.id.slice(0, 10),
        c.complainantName,
        c.category,
        c.subject,
        c.status,
        new Date(c.createdAt).toLocaleDateString()
      ]);
      kpis = [
        { label: 'Total Complaints', value: allComplaints.length },
        { label: 'Open Disputes', value: allComplaints.filter(c => c.status !== 'Resolved').length }
      ];
    } else {
      columns = ['Metric / Dimension', 'Current Volume', 'Historical Comparison', 'Target / Status'];
      rows = [
        ['Order Fulfillment Volume', `${allOrders.length} Orders`, '+14.2% vs last period', 'ON TRACK'],
        ['Average Completion Turnaround', '3.4 Hours', '-18.5% faster', 'OPTIMAL'],
        ['Platform Active Retention', '91.8%', '+2.1% growth', 'HEALTHY'],
        ['Complaint Dispute Ratio', `${((allComplaints.length / Math.max(allOrders.length, 1)) * 100).toFixed(1)}%`, 'Below 2% threshold', 'EXCELLENT']
      ];
      kpis = [
        { label: 'Order Volume', value: allOrders.length },
        { label: 'Active Customers', value: summary.totalCustomers },
        { label: 'Satisfaction Score', value: '4.8 / 5.0' }
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
      orders: allOrders,
      workers: this.workers,
      withdrawals: allWithdrawals,
      complaints: allComplaints
    };
  }

  getPlatformSettings() {
    return {
      ...this.settings,
      commissionRatePercent: (this.settings as any).commissionRatePercent ?? this.settings.commissionPercent ?? 20,
      customerRefundPercent: (this.settings as any).customerRefundPercent ?? 100
    };
  }

  updatePlatformSettings(updates: any) {
    this.settings = {
      ...this.settings,
      ...updates,
      commissionPercent: updates.commissionRatePercent ?? updates.commissionPercent ?? this.settings.commissionPercent
    };
    if (updates.commissionRatePercent !== undefined) {
      (this.settings as any).commissionRatePercent = updates.commissionRatePercent;
    }
    if (updates.customerRefundPercent !== undefined) {
      (this.settings as any).customerRefundPercent = updates.customerRefundPercent;
    }

    this.addAuditLog({
      actorUserId: 'ADM-001',
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

