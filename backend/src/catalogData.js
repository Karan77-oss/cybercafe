"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.localStore = exports.OFFICIAL_WORKERS = exports.OFFICIAL_SERVICES = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
exports.OFFICIAL_SERVICES = [
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
exports.OFFICIAL_WORKERS = [
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
            accountNumber: '381920491820',
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
        skills: ['Income/caste/residence certificate assistance', 'Certificate applications', 'Job application assistance'],
        bankDetails: {
            accountNumber: '492817294819',
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
// In-Memory dynamic store to ensure zero-downtime resilience
class ResilientStore {
    services = [...exports.OFFICIAL_SERVICES];
    workers = [...exports.OFFICIAL_WORKERS];
    users = new Map();
    orders = new Map();
    documents = new Map();
    withdrawals = new Map();
    notifications = [];
    supportTickets = [];
    chatMessages = [];
    serviceProposals = [];
    auditLogs = [];
    ledgerEntries = [];
    complaints = new Map();
    settings = {
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
    orderAcceptLocks = new Set();
    acquireOrderLock(orderId) {
        if (this.orderAcceptLocks.has(orderId)) {
            return false;
        }
        this.orderAcceptLocks.add(orderId);
        return true;
    }
    releaseOrderLock(orderId) {
        this.orderAcceptLocks.delete(orderId);
    }
    constructor() {
        const defaultPasswordHash = bcrypt_1.default.hashSync('worker123', 10);
        const defaultCustomerPasswordHash = bcrypt_1.default.hashSync('customer123', 10);
        // Initialize Admin from environment if configured
        const adminEmail = process.env.ADMIN_EMAIL || 'rajkaran969355@gmail.com';
        const adminId = process.env.ADMIN_ID || 'Karan Kumar';
        const adminPass = process.env.ADMIN_PASSWORD || 'Karan@@2002';
        if (adminPass) {
            const hash = bcrypt_1.default.hashSync(adminPass, 10);
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
        const adminDemoHash = bcrypt_1.default.hashSync('password123', 10);
        this.users.set('ADM-001', {
            id: 'ADM-001',
            adminId: 'ADM-001',
            email: 'admin@cybercafe.com',
            name: 'Central Administrator',
            phone: '9876543200',
            role: 'ADMIN',
            password: adminDemoHash,
            passwordHash: adminDemoHash,
            accountStatus: 'ACTIVE',
            createdAt: new Date().toISOString()
        });
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
        // Production start: Only real authenticated users and orders are loaded
        this.loadPersistedOrdersFromDisk();
        this.loadPersistedDocumentsFromDisk();
        this.loadPersistedLedgerFromDisk();
    }
    getServices() {
        return this.services;
    }
    getService(id) {
        return this.services.find(s => s.id === id);
    }
    getWorkers() {
        return this.workers;
    }
    getWorker(id) {
        if (!id)
            return undefined;
        const lower = id.toLowerCase();
        const existing = this.workers.find(w => w.id === id ||
            w.workerId === id ||
            w.id.toLowerCase() === lower ||
            (w.workerId && w.workerId.toLowerCase() === lower) ||
            (w.email && w.email.toLowerCase() === lower));
        if (existing)
            return existing;
        // Check users map for admin or dynamically registered worker
        const user = this.findUserById(id) || this.findUserByEmail(id);
        if (user) {
            if (user.role === 'ADMIN') {
                const adminWorker = {
                    id: user.id || id,
                    workerId: user.id || id,
                    name: `${user.name || 'Admin'} (Supervisor)`,
                    email: user.email || 'admin@cybercafe.in',
                    phone: user.phone || '9876543200',
                    businessName: 'Admin Central Operations',
                    address: user.address || 'Operations Command Center',
                    city: 'Patna, Bihar',
                    skills: ['Government forms', 'PAN-related services', 'Voter ID', 'Aadhaar Print', 'Document verification'],
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
            }
            else {
                const dynamicWorker = {
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
        const fallbackWorker = {
            id: id,
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
    findUserByEmail(email) {
        for (const u of this.users.values()) {
            if (u.email?.toLowerCase() === email.toLowerCase())
                return u;
        }
        return undefined;
    }
    findUserByPhone(phone) {
        if (!phone)
            return undefined;
        const clean = phone.replace(/\D/g, '');
        for (const u of this.users.values()) {
            if (u.phone && (u.phone === phone || (clean && u.phone.replace(/\D/g, '') === clean))) {
                return u;
            }
        }
        return undefined;
    }
    findUserById(id) {
        if (!id)
            return undefined;
        if (this.users.has(id))
            return this.users.get(id);
        const idLower = id.toLowerCase();
        const cleanId = id.replace(/\D/g, '');
        for (const u of this.users.values()) {
            if ((u.id && u.id.toLowerCase() === idLower) ||
                (u.adminId && u.adminId.toLowerCase() === idLower) ||
                (u.workerId && u.workerId.toLowerCase() === idLower) ||
                (u.username && u.username.toLowerCase() === idLower) ||
                (u.email && u.email.toLowerCase() === idLower) ||
                (u.name && u.name.toLowerCase() === idLower) ||
                (u.phone && (u.phone === id || (cleanId.length >= 10 && u.phone.replace(/\D/g, '') === cleanId)))) {
                return u;
            }
        }
        return undefined;
    }
    saveUser(user) {
        this.users.set(user.id, user);
        return user;
    }
    getDataDir() {
        const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
        const baseDir = path_1.default.resolve(__dirname, '../data');
        const targetDir = isTest ? path_1.default.join(baseDir, 'test') : baseDir;
        if (!fs_1.default.existsSync(targetDir)) {
            fs_1.default.mkdirSync(targetDir, { recursive: true });
        }
        return targetDir;
    }
    persistOrdersToDisk() {
        try {
            const dataDir = this.getDataDir();
            const filePath = path_1.default.join(dataDir, 'persisted_orders.json');
            const ordersArray = Array.from(this.orders.values());
            fs_1.default.writeFileSync(filePath, JSON.stringify(ordersArray, null, 2), 'utf-8');
        }
        catch { }
    }
    loadPersistedOrdersFromDisk() {
        try {
            const dataDir = this.getDataDir();
            const filePath = path_1.default.join(dataDir, 'persisted_orders.json');
            if (fs_1.default.existsSync(filePath)) {
                const content = fs_1.default.readFileSync(filePath, 'utf-8');
                const ordersArray = JSON.parse(content);
                if (Array.isArray(ordersArray)) {
                    ordersArray.forEach(ord => {
                        if (ord && ord.id) {
                            this.orders.set(ord.id, ord);
                            // Ensure documents belonging to persisted orders are also indexed in this.documents
                            if (Array.isArray(ord.documents)) {
                                ord.documents.forEach((d) => {
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
        }
        catch { }
    }
    persistDocumentsToDisk() {
        try {
            const dataDir = this.getDataDir();
            const filePath = path_1.default.join(dataDir, 'persisted_documents.json');
            const docsArray = Array.from(this.documents.values());
            fs_1.default.writeFileSync(filePath, JSON.stringify(docsArray, null, 2), 'utf-8');
        }
        catch { }
    }
    loadPersistedDocumentsFromDisk() {
        try {
            const dataDir = this.getDataDir();
            const filePath = path_1.default.join(dataDir, 'persisted_documents.json');
            if (fs_1.default.existsSync(filePath)) {
                const content = fs_1.default.readFileSync(filePath, 'utf-8');
                const docsArray = JSON.parse(content);
                if (Array.isArray(docsArray)) {
                    docsArray.forEach(doc => {
                        if (doc && doc.id) {
                            this.documents.set(doc.id, doc);
                        }
                    });
                }
            }
        }
        catch { }
    }
    persistLedgerToDisk() {
        try {
            const dataDir = this.getDataDir();
            const filePath = path_1.default.join(dataDir, 'financial_ledger.json');
            fs_1.default.writeFileSync(filePath, JSON.stringify(this.ledgerEntries, null, 2), 'utf-8');
        }
        catch { }
    }
    loadPersistedLedgerFromDisk() {
        try {
            const dataDir = this.getDataDir();
            const filePath = path_1.default.join(dataDir, 'financial_ledger.json');
            if (fs_1.default.existsSync(filePath)) {
                const content = fs_1.default.readFileSync(filePath, 'utf-8');
                const entries = JSON.parse(content);
                if (Array.isArray(entries)) {
                    this.ledgerEntries = entries;
                }
            }
        }
        catch { }
    }
    appendLedgerEntry(entry) {
        // Idempotency check
        const existing = this.ledgerEntries.find(l => l.idempotencyKey === entry.idempotencyKey);
        if (existing) {
            return existing;
        }
        const newEntry = {
            id: `ledg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            createdAt: new Date().toISOString(),
            entityId: entry.entityId || entry.withdrawalId || entry.orderId || null,
            reference: entry.reference || entry.referenceNote || null,
            ...entry
        };
        this.ledgerEntries.unshift(newEntry);
        this.persistLedgerToDisk();
        return newEntry;
    }
    saveOrder(order) {
        this.orders.set(order.id, order);
        this.persistOrdersToDisk();
        return order;
    }
    getOrder(id) {
        return this.orders.get(id);
    }
    getOrders(customerId) {
        const list = Array.from(this.orders.values());
        if (customerId) {
            return list.filter(o => o.customerId === customerId);
        }
        return list;
    }
    saveDocument(doc) {
        this.documents.set(doc.id, doc);
        this.persistDocumentsToDisk();
        return doc;
    }
    getDocument(id) {
        return this.documents.get(id);
    }
    getDocumentsByCustomerId(customerId) {
        return Array.from(this.documents.values()).filter(d => d.customerId === customerId);
    }
    addAuditLog(log) {
        this.auditLogs.unshift({
            id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
            ...log
        });
    }
    getAuditLogs(actorUserId, action) {
        return this.auditLogs.filter(l => {
            if (actorUserId && l.actorUserId !== actorUserId)
                return false;
            if (action && l.action !== action)
                return false;
            return true;
        });
    }
    // --- Worker Lifecycle & Management Methods ---
    recordWorkerActivity(workerId) {
        const worker = this.getWorker(workerId);
        if (!worker)
            return { isOnline: false };
        const now = Date.now();
        const last = worker.lastActivityAt ? new Date(worker.lastActivityAt).getTime() : now;
        const diffMins = (now - last) / (1000 * 60);
        // Auto-offline rule: 30 minutes of inactivity
        if (diffMins >= 30 && worker.isOnline) {
            worker.isOnline = false;
            worker.lastActivityAt = new Date().toISOString();
            const user = this.users.get(workerId);
            if (user)
                user.isOnline = false;
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
    toggleWorkerAvailability(workerId, desiredState) {
        const worker = this.getWorker(workerId);
        if (!worker)
            throw new Error('Worker not found');
        const newState = desiredState !== undefined ? desiredState : !worker.isOnline;
        worker.isOnline = newState;
        worker.lastActivityAt = new Date().toISOString();
        const user = this.users.get(workerId);
        if (user)
            user.isOnline = newState;
        this.addAuditLog({
            actorUserId: workerId,
            actorRole: 'WORKER',
            action: 'AVAILABILITY_TOGGLED',
            metadata: { isOnline: newState }
        });
        return { isOnline: newState, worker };
    }
    updateWorkerProfile(workerId, updates) {
        const worker = this.getWorker(workerId);
        if (!worker)
            throw new Error('Worker not found');
        // Section 3 & 18: Bank details cannot be updated directly without support ticket verification
        if (updates.businessName)
            worker.businessName = updates.businessName;
        if (updates.address)
            worker.address = updates.address;
        if (updates.city)
            worker.city = updates.city;
        if (updates.skills)
            worker.skills = updates.skills;
        if (updates.phone)
            worker.phone = updates.phone;
        const user = this.users.get(workerId);
        if (user) {
            if (updates.businessName)
                user.businessName = updates.businessName;
            if (updates.address)
                user.address = updates.address;
            if (updates.city)
                user.city = updates.city;
            if (updates.skills)
                user.skills = updates.skills;
            if (updates.phone)
                user.phone = updates.phone;
        }
        return worker;
    }
    getAvailableOrdersForWorker(workerId) {
        const worker = this.getWorker(workerId);
        if (!worker)
            return { isOnline: false, orders: [] };
        // Paused or non-active workers do not receive new orders/requests
        if (worker.accountStatus === 'PAUSED' ||
            worker.status === 'PAUSED' ||
            worker.accountStatus === 'SUSPENDED' ||
            worker.accountStatus === 'BLOCKED' ||
            worker.accountStatus === 'DELETED' ||
            worker.status === 'DELETED') {
            return { isOnline: worker.isOnline, orders: [] };
        }
        // Record activity and verify online status
        const status = this.recordWorkerActivity(workerId);
        const now = Date.now();
        const allOrders = Array.from(this.orders.values());
        const availableList = [];
        const seenOrderIds = new Set();
        allOrders.forEach(ord => {
            // Deduplicate orders
            if (seenOrderIds.has(ord.id))
                return;
            // Check for 10-min offer expiry
            if (ord.status === 'OFFERED' && ord.offerExpiresAt) {
                if (new Date(ord.offerExpiresAt).getTime() <= now) {
                    ord.status = 'AVAILABLE';
                    ord.assignedWorkerId = null;
                }
            }
            const isAdmin = this.findUserById(workerId)?.role === 'ADMIN' || worker.name?.includes('Admin') || workerId === 'Karan Kumar';
            const isOfferedToThis = ord.status === 'OFFERED' && (ord.assignedWorkerId === workerId || isAdmin);
            const isAvailableInPool = ord.status === 'AVAILABLE' && !ord.assignedWorkerId;
            if (isOfferedToThis || isAvailableInPool) {
                seenOrderIds.add(ord.id);
                let remainingSeconds = 600;
                if (ord.offerExpiresAt) {
                    const rem = Math.floor((new Date(ord.offerExpiresAt).getTime() - now) / 1000);
                    remainingSeconds = rem > 0 ? rem : 0;
                }
                // Section 6: Strict Pre-Acceptance Privacy Enforcement
                // ONLY customer name, service name, payout amount, deadline, remaining offer timer!
                // DO NOT reveal customer phone, email, full address, or working documents!
                // For real customer orders, resolve name from the authenticated user record —
                // never use a placeholder like 'Customer' when the real name is available.
                const resolvedCustomer = this.users.get(ord.customerId);
                const resolvedCustomerName = ord.customerName && ord.customerName !== 'Customer'
                    ? ord.customerName
                    : (resolvedCustomer?.name || ord.customer?.name || 'Customer');
                const payoutPaise = ord.workerAmount || ord.workerEarningsPaise || Math.round((ord.pricePaise || 0) * 0.8);
                availableList.push({
                    id: ord.id,
                    orderNumber: ord.orderNumber || ord.id,
                    serviceId: ord.serviceId,
                    serviceName: ord.serviceName || ord.service?.name,
                    category: ord.category || ord.serviceSnapshot?.category || null,
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
    findBestSuitableWorker(category, excludedWorkerIds = []) {
        const candidates = this.workers.filter(w => w.isOnline &&
            w.accountStatus === 'ACTIVE' &&
            w.status !== 'PAUSED' &&
            w.status !== 'DELETED' &&
            !excludedWorkerIds.includes(w.id));
        if (candidates.length === 0)
            return null;
        // Section 8: Sort by lowest Active/Accepted workload, tie -> faster historical average completion speed
        candidates.sort((a, b) => {
            const activeA = a.activeJobs || 0;
            const activeB = b.activeJobs || 0;
            if (activeA !== activeB)
                return activeA - activeB;
            return (a.averageCompletionMinutes || 60) - (b.averageCompletionMinutes || 60);
        });
        return candidates[0];
    }
    handleOfferExpiry(orderId) {
        const order = this.orders.get(orderId);
        if (!order || order.status !== 'OFFERED')
            return;
        if (!order.rejectedWorkerIds)
            order.rejectedWorkerIds = [];
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
        }
        else {
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
    acceptOrder(orderId, workerId) {
        const worker = this.getWorker(workerId);
        if (!worker)
            throw new Error('Worker not found');
        if (!worker.isOnline)
            throw new Error('You must be Online to accept orders');
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
            const err = new Error('Order has already been accepted by another worker');
            err.statusCode = 409;
            err.code = 'ORDER_ALREADY_ASSIGNED';
            throw err;
        }
        try {
            const order = this.orders.get(orderId);
            if (!order)
                throw new Error('Order not found');
            // Section 7 & 33 Concurrency: Two workers must never accept same order
            if (order.status === 'ACCEPTED' || order.status === 'ASSIGNED' || order.status === 'IN_PROGRESS' || order.status === 'COMPLETED') {
                const err = new Error('Order has already been accepted by another worker');
                err.statusCode = 409;
                err.code = 'ORDER_ALREADY_ASSIGNED';
                throw err;
            }
            if (order.status !== 'OFFERED' && order.status !== 'AVAILABLE') {
                const err = new Error(`Order cannot be accepted in status: ${order.status}`);
                err.statusCode = 409;
                err.code = 'ORDER_UNAVAILABLE';
                throw err;
            }
            if (order.status === 'OFFERED' && order.offerExpiresAt) {
                if (new Date(order.offerExpiresAt).getTime() < Date.now()) {
                    throw new Error('This offer has expired (10-minute response window passed)');
                }
            }
            if (order.assignedWorkerId && order.assignedWorkerId !== workerId) {
                const err = new Error('Order has already been accepted by another worker');
                err.statusCode = 409;
                err.code = 'ORDER_ALREADY_ASSIGNED';
                throw err;
            }
            order.status = 'ACCEPTED';
            order.assignedWorkerId = workerId;
            order.worker = { id: worker.id, name: worker.name, phone: worker.phone, email: worker.email };
            order.workerAcceptedAt = new Date().toISOString();
            order.acceptedOrder5HourWindowExpiresAt = new Date(Date.now() + 5 * 3600 * 1000).toISOString();
            order.workerEarningsPaise = order.workerEarningsPaise || Math.round(order.pricePaise * 0.8);
            // System must never automatically create or assign a time slot upon acceptance
            order.timeSlot = null;
            if (!order.serviceSnapshot)
                order.serviceSnapshot = {};
            order.serviceSnapshot.scheduling = {
                status: 'UNSCHEDULED',
                timeSlot: null,
                rescheduleNote: null
            };
            worker.activeJobs += 1;
            worker.pendingEarningsPaise += order.workerEarningsPaise;
            worker.lastActivityAt = new Date().toISOString();
            this.notifications.unshift({
                id: `notif_${Date.now()}`,
                recipientId: workerId,
                recipientRole: 'WORKER',
                type: 'ORDER_ACCEPTED',
                title: 'Order Accepted',
                message: `You accepted order ${order.id} for ${order.serviceName}. Customer documents and workspace are now unlocked. Please provide your working time slot.`,
                orderId: order.id,
                isRead: false,
                createdAt: new Date().toISOString()
            });
            if (order.customerId) {
                this.notifications.unshift({
                    id: `notif_${Date.now()}_cust`,
                    recipientId: order.customerId,
                    recipientRole: 'CUSTOMER',
                    type: 'ORDER_ACCEPTED',
                    title: 'Operator Assigned',
                    message: `${worker.name} has accepted your order. They will schedule and provide your working time slot shortly.`,
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
        }
        finally {
            this.releaseOrderLock(orderId);
        }
    }
    rejectOrder(orderId, workerId, reason, note) {
        const order = this.orders.get(orderId);
        if (!order)
            throw new Error('Order not found');
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
                if (worker.activeJobs > 0)
                    worker.activeJobs -= 1;
                worker.pendingEarningsPaise = Math.max(0, worker.pendingEarningsPaise - (order.workerEarningsPaise || 0));
            }
        }
        if (!order.rejectionHistory)
            order.rejectionHistory = [];
        order.rejectionHistory.push({
            workerId,
            reason,
            note,
            rejectedAt: new Date().toISOString()
        });
        if (!order.rejectedWorkerIds)
            order.rejectedWorkerIds = [];
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
        }
        else {
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
    setOrderTimeSlot(orderId, workerId, timeSlot) {
        const order = this.orders.get(orderId);
        if (!order)
            throw new Error('Order not found');
        const isAdmin = this.findUserById(workerId)?.role === 'ADMIN' || workerId.toLowerCase().includes('admin') || workerId === 'Karan Kumar';
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
        if (!order.serviceSnapshot)
            order.serviceSnapshot = {};
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
        this.chatMessages.push({
            id: `msg_${Date.now()}`,
            orderId,
            senderId: workerId,
            senderRole: 'WORKER',
            senderName: workerName,
            message: `[Time Slot Proposed]: ${formattedSlot}`,
            createdAt: new Date().toISOString()
        });
        if (order.customerId) {
            this.notifications.unshift({
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
    acceptCustomerReschedule(orderId, workerId) {
        const order = this.orders.get(orderId);
        if (!order)
            throw new Error('Order not found');
        const isAdmin = this.findUserById(workerId)?.role === 'ADMIN' || workerId.toLowerCase().includes('admin') || workerId === 'Karan Kumar';
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
        }
        else {
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
        this.chatMessages.push({
            id: `msg_${Date.now()}`,
            orderId,
            senderId: workerId,
            senderRole: 'WORKER',
            senderName: workerName,
            message: `[Reschedule Accepted]: Agreed to time slot: ${scheduling.timeSlot}`,
            createdAt: new Date().toISOString()
        });
        if (order.customerId) {
            this.notifications.unshift({
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
    acceptAndScheduleOrder(orderId, workerId, schedule) {
        const lockAcquired = this.acquireOrderLock(orderId);
        if (!lockAcquired) {
            const err = new Error('Order is currently being processed by another worker');
            err.statusCode = 409;
            err.code = 'ORDER_LOCKED';
            throw err;
        }
        try {
            const worker = this.getWorker(workerId);
            if (!worker)
                throw new Error('Worker not found');
            if (!worker.isOnline) {
                throw new Error('Worker must be online to accept orders');
            }
            if (worker.accountStatus === 'PAUSED' || worker.status === 'PAUSED' || worker.accountStatus === 'SUSPENDED' || worker.accountStatus === 'BLOCKED' || worker.accountStatus === 'DELETED') {
                throw new Error('Worker account is inactive or suspended');
            }
            const order = this.orders.get(orderId);
            if (!order)
                throw new Error('Order not found');
            if (order.status === 'ACCEPTED' || order.status === 'ASSIGNED' || order.status === 'IN_PROGRESS' || order.status === 'COMPLETED') {
                const err = new Error('Order has already been accepted by another worker');
                err.statusCode = 409;
                err.code = 'ORDER_ALREADY_ASSIGNED';
                throw err;
            }
            if (order.status !== 'OFFERED' && order.status !== 'AVAILABLE' && order.status !== 'PAID') {
                const err = new Error(`Order cannot be accepted in status: ${order.status}`);
                err.statusCode = 409;
                err.code = 'ORDER_UNAVAILABLE';
                throw err;
            }
            if (order.assignedWorkerId && order.assignedWorkerId !== workerId) {
                const err = new Error('Order has already been accepted by another worker');
                err.statusCode = 409;
                err.code = 'ORDER_ALREADY_ASSIGNED';
                throw err;
            }
            const slotStr = schedule.timeSlot ? schedule.timeSlot.trim() : '';
            if (!slotStr) {
                throw new Error('Initial time window is required to accept and schedule');
            }
            const dateStr = schedule.date ? schedule.date.trim() : 'Today';
            order.status = 'ASSIGNED';
            order.assignedWorkerId = workerId;
            order.worker = { id: worker.id, name: worker.name, phone: worker.phone, email: worker.email };
            order.workerAcceptedAt = new Date().toISOString();
            order.acceptedOrder5HourWindowExpiresAt = new Date(Date.now() + 5 * 3600 * 1000).toISOString();
            order.workerEarningsPaise = order.workerEarningsPaise || Math.round((order.pricePaise || 19900) * 0.8);
            order.bookingDate = dateStr;
            order.timeSlot = slotStr;
            order.bookingTimeSlot = slotStr;
            order.slotStatus = 'CONFIRMED';
            order.proposedSlot = null;
            order.proposedDate = null;
            order.updatedAt = new Date().toISOString();
            if (!order.serviceSnapshot)
                order.serviceSnapshot = {};
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
            this.notifications.unshift({
                id: `notif_${Date.now()}`,
                recipientId: workerId,
                recipientRole: 'WORKER',
                type: 'ORDER_ACCEPTED',
                title: 'Order Accepted & Scheduled',
                message: `You accepted order ${order.id} for ${order.serviceName}. Initial review window confirmed for ${dateStr} at ${slotStr}.`,
                orderId: order.id,
                isRead: false,
                createdAt: new Date().toISOString()
            });
            if (order.customerId) {
                this.notifications.unshift({
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
            this.chatMessages.push({
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
        }
        finally {
            this.releaseOrderLock(orderId);
        }
    }
    requestReschedule(orderId, userId, data) {
        const order = this.orders.get(orderId);
        if (!order)
            throw new Error('Order not found');
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
        if (!order.serviceSnapshot)
            order.serviceSnapshot = {};
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
            this.notifications.unshift({
                id: `notif_${Date.now()}_resched`,
                recipientId: targetRecipientId,
                recipientRole: targetRole,
                type: 'RESCHEDULE_REQUESTED',
                title: 'Reschedule Requested',
                message: `${requesterName} proposed a new review window: ${proposedDate} at ${proposedSlot}. Please review and respond.`,
                orderId: order.id,
                isRead: false,
                createdAt: new Date().toISOString()
            });
        }
        this.chatMessages.push({
            id: `msg_${Date.now()}`,
            orderId: order.id,
            senderId: userId,
            senderRole: requestedBy,
            senderName: requesterName,
            message: `[Reschedule Proposed]: ${proposedDate} at ${proposedSlot}`,
            createdAt: new Date().toISOString()
        });
        this.persistOrdersToDisk();
        return order;
    }
    respondReschedule(orderId, userId, data) {
        const order = this.orders.get(orderId);
        if (!order)
            throw new Error('Order not found');
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
            if (!order.serviceSnapshot)
                order.serviceSnapshot = {};
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
                this.notifications.unshift({
                    id: `notif_${Date.now()}_resched_acc`,
                    recipientId: targetRecipientId,
                    recipientRole: targetRole,
                    type: 'RESCHEDULE_ACCEPTED',
                    title: 'Reschedule Confirmed',
                    message: `${responderName} accepted the proposed review window: ${proposedDate} at ${proposedSlot}.`,
                    orderId: order.id,
                    isRead: false,
                    createdAt: new Date().toISOString()
                });
            }
            this.chatMessages.push({
                id: `msg_${Date.now()}`,
                orderId: order.id,
                senderId: userId,
                senderRole: responderRole,
                senderName: responderName,
                message: `[Reschedule Confirmed]: New review window is ${proposedDate} at ${proposedSlot}`,
                createdAt: new Date().toISOString()
            });
        }
        else {
            order.proposedDate = null;
            order.proposedSlot = null;
            order.slotStatus = 'CONFIRMED';
            order.updatedAt = new Date().toISOString();
            if (!order.serviceSnapshot)
                order.serviceSnapshot = {};
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
                this.notifications.unshift({
                    id: `notif_${Date.now()}_resched_rej`,
                    recipientId: targetRecipientId,
                    recipientRole: targetRole,
                    type: 'RESCHEDULE_REJECTED',
                    title: 'Reschedule Declined',
                    message: `${responderName} kept the existing review window: ${order.bookingDate} at ${order.timeSlot}.`,
                    orderId: order.id,
                    isRead: false,
                    createdAt: new Date().toISOString()
                });
            }
            this.chatMessages.push({
                id: `msg_${Date.now()}`,
                orderId: order.id,
                senderId: userId,
                senderRole: responderRole,
                senderName: responderName,
                message: `[Reschedule Declined]: Keeping existing review window: ${order.bookingDate} at ${order.timeSlot}`,
                createdAt: new Date().toISOString()
            });
        }
        this.persistOrdersToDisk();
        return order;
    }
    startWork(orderId, workerId) {
        const order = this.orders.get(orderId);
        if (!order)
            throw new Error('Order not found');
        if (order.assignedWorkerId !== workerId)
            throw new Error('Unauthorized');
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
    uploadDeliverables(orderId, workerId, deliverables) {
        const order = this.orders.get(orderId);
        if (!order)
            throw new Error('Order not found');
        if (order.assignedWorkerId !== workerId)
            throw new Error('Unauthorized');
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
            if (!order.serviceSnapshot.completion)
                order.serviceSnapshot.completion = {};
            order.serviceSnapshot.completion.deliverableFiles = deliverables;
            if (deliverables.length > 0) {
                order.serviceSnapshot.completion.receiptUrl = deliverables[0].url;
            }
        }
        this.persistOrdersToDisk();
        return order;
    }
    finishWork(orderId, workerId, note) {
        const order = this.orders.get(orderId);
        if (!order)
            throw new Error('Order not found');
        if (order.assignedWorkerId !== workerId)
            throw new Error('Unauthorized');
        if (order.status === 'COMPLETED' || order.status === 'RECEIPT_SUBMITTED') {
            throw new Error('This order has already been completed and submitted');
        }
        if (order.status === 'CANCELLED') {
            throw new Error('Cannot submit a cancelled order');
        }
        if (!order.deliverables || order.deliverables.length === 0) {
            throw new Error('You must upload the final receipt/document before finishing the order');
        }
        // Step 4 Blueprint: Order moves to RECEIPT_SUBMITTED, worker earning is PENDING
        order.status = 'RECEIPT_SUBMITTED';
        order.receiptSubmittedAt = new Date().toISOString();
        order.workCompletedAt = order.workCompletedAt || new Date().toISOString();
        order.completionNote = note;
        order.earningStatus = 'PENDING';
        if (order.serviceSnapshot) {
            if (!order.serviceSnapshot.completion)
                order.serviceSnapshot.completion = {};
            order.serviceSnapshot.completion.completionMessage = note || 'Application successfully processed and submitted.';
            order.serviceSnapshot.completion.referenceNumber = order.serviceSnapshot.completion.referenceNumber || `CCM-APP-${order.id.slice(-6).toUpperCase()}`;
            order.serviceSnapshot.completion.deliverableFiles = order.deliverables;
            if (order.deliverables && order.deliverables.length > 0) {
                order.serviceSnapshot.completion.receiptUrl = order.deliverables[0].url;
            }
        }
        const worker = this.getWorker(workerId);
        const earnings = order.workerAmount || order.workerEarningsPaise || Math.round(order.pricePaise * 0.8);
        if (worker) {
            // Ensure pending balance reflects this order
            if (!worker.pendingEarningsPaise || worker.pendingEarningsPaise < earnings) {
                worker.pendingEarningsPaise = earnings;
            }
            worker.lastActivityAt = new Date().toISOString();
        }
        // Double-entry ledger: record WORKER_EARNING_PENDING
        this.appendLedgerEntry({
            workerId,
            orderId: order.id,
            amountPaise: earnings,
            type: 'WORKER_EARNING_PENDING',
            idempotencyKey: `LEDGER_PENDING_${order.id}`,
            referenceNote: `Worker submitted receipt for Order #${order.id}`
        });
        // Customer Notification: receipt submitted & awaiting download
        this.notifications.unshift({
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
    releaseWorkerEarningOnReceiptAction(orderId, actorId) {
        const order = this.orders.get(orderId);
        if (!order || !order.assignedWorkerId) {
            throw new Error('ORDER_NOT_ELIGIBLE_FOR_RELEASE');
        }
        // Idempotent guard: Prevent double-release
        if (order.earningStatus === 'RELEASED') {
            return { success: true, message: 'EARNING_ALREADY_RELEASED', order };
        }
        const workerId = order.assignedWorkerId;
        const worker = this.getWorker(workerId);
        const earnings = order.workerAmount || order.workerEarningsPaise || Math.round(order.pricePaise * 0.8);
        // 1. Advance Order state to COMPLETED, EarningStatus to RELEASED
        order.status = 'COMPLETED';
        order.earningStatus = 'RELEASED';
        order.completedAt = new Date().toISOString();
        order.receiptDownloadedAt = order.receiptDownloadedAt || new Date().toISOString();
        order.updatedAt = new Date().toISOString();
        // 2. Append Double-entry Ledger Record
        this.appendLedgerEntry({
            workerId,
            orderId: order.id,
            amountPaise: earnings,
            type: 'WORKER_EARNING_RELEASED',
            idempotencyKey: `EARNING_RELEASE_ORDER_${order.id}`,
            referenceNote: `Released upon customer receipt action for Order #${order.id}`
        });
        // 3. Atomically update cached balances
        if (worker) {
            worker.pendingEarningsPaise = Math.max(0, (worker.pendingEarningsPaise || 0) - earnings);
            worker.walletBalancePaise = (worker.walletBalancePaise || 0) + earnings;
            worker.totalEarningsPaise = (worker.totalEarningsPaise || 0) + earnings;
            worker.completedJobs = (worker.completedJobs || 0) + 1;
            worker.activeJobs = Math.max(0, (worker.activeJobs || 1) - 1);
            worker.lastActivityAt = new Date().toISOString();
        }
        // 4. Notifications
        this.notifications.unshift({
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
    getOrderForWorker(orderId, workerId) {
        const order = this.orders.get(orderId);
        if (!order)
            return undefined;
        // Section 6/15: Strict worker-order binding — only the assigned worker can view job detail
        const isAdmin = this.findUserById(workerId)?.role === 'ADMIN' || workerId.toLowerCase().includes('admin') || workerId === 'Karan Kumar';
        if (!isAdmin && order.assignedWorkerId !== workerId) {
            return undefined; // Not found/not authorized for this worker
        }
        const clone = JSON.parse(JSON.stringify(order));
        clone.orderNumber = clone.orderNumber || clone.id;
        // ── DATA NORMALIZATION ──────────────────────────────────────────────────
        // Real customer orders store form fields in serviceSnapshot.details.
        // Seed/demo orders use a top-level formData key.
        // Normalize both paths so the worker workspace always sees the form data.
        if (!clone.formData || Object.keys(clone.formData).length === 0) {
            const snapshotDetails = clone.serviceSnapshot?.details;
            if (snapshotDetails && typeof snapshotDetails === 'object' && Object.keys(snapshotDetails).length > 0) {
                clone.formData = snapshotDetails;
            }
        }
        // Resolve customer identity from the users map when root-level fields are missing.
        // This ensures real orders (created via createOrder) always surface the customer's
        // name/phone/email to workers, exactly as the customer originally submitted.
        if (!clone.customerName || clone.customerName === 'Customer') {
            const customer = this.users.get(clone.customerId);
            if (customer) {
                clone.customerName = customer.name || clone.customerName || 'Customer';
                if (!clone.customerPhone)
                    clone.customerPhone = customer.phone || null;
                if (!clone.customerEmail)
                    clone.customerEmail = customer.email || null;
            }
            // Fallback: extract name from the form details submitted by the customer
            if ((!clone.customerName || clone.customerName === 'Customer') && clone.formData?.fullName) {
                clone.customerName = clone.formData.fullName;
            }
        }
        // ────────────────────────────────────────────────────────────────────────
        // Section 15: Post-Completion Privacy & Data Purge
        // After completion/cancellation, worker loses access to customer phone, personal docs, and active chat
        if (clone.status === 'COMPLETED' || clone.status === 'CANCELLED') {
            if (clone.customerPhone) {
                clone.customerPhone = clone.customerPhone.replace(/(\d{2})\d+(\d{2})/, '$1******$2');
            }
            clone.customerEmail = '***@***.com';
            clone.documents = []; // Purged customer working documents
            // Preserved clone.deliverables so worker can verify their submitted output
            clone.deliverables = order.deliverables || [];
            clone.isChatClosed = true;
        }
        else {
            // For active assigned orders, enrich documents with accessible URLs, names, and formatted size
            if (Array.isArray(clone.documents)) {
                clone.documents = clone.documents.map((d, idx) => {
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
        // Section 4 Blueprint: Zero-Leakage API Projection (RBAC)
        // Workers must NEVER receive customer payment amounts, platform margins, or platform fees
        const workerPayoutPaise = clone.workerEarningsPaise || clone.workerAmount || Math.round((clone.pricePaise || 0) * 0.8);
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
    getWorkerJobs(workerId, statusFilter) {
        const isAdmin = this.findUserById(workerId)?.role === 'ADMIN' || workerId.toLowerCase().includes('admin') || workerId === 'Karan Kumar';
        let all = Array.from(this.orders.values()).filter(o => o.assignedWorkerId === workerId);
        if (all.length === 0 && isAdmin) {
            all = Array.from(this.orders.values()).filter(o => o.assignedWorkerId);
        }
        if (!statusFilter)
            return all.map(o => this.getOrderForWorker(o.id, workerId));
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
    getWorkerEarningsSummary(workerId) {
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
        const isAdmin = this.findUserById(workerId)?.role === 'ADMIN' || worker.name?.includes('Admin') || workerId === 'Karan Kumar';
        let completedOrders = Array.from(this.orders.values()).filter(o => o.assignedWorkerId === workerId && o.status === 'COMPLETED');
        if (completedOrders.length === 0 && isAdmin) {
            completedOrders = Array.from(this.orders.values()).filter(o => o.status === 'COMPLETED');
        }
        const todayDateStr = new Date().toISOString().split('T')[0];
        const todayOrders = completedOrders.filter(o => o.completedAt && o.completedAt.startsWith(todayDateStr));
        const todayEarningsPaise = todayOrders.reduce((sum, o) => sum + (o.workerEarningsPaise || Math.round(o.pricePaise * 0.8)), 0);
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
    requestWithdrawal(workerId, amountPaise, method, payoutDetails) {
        const worker = this.getWorker(workerId);
        if (!worker)
            throw new Error('Worker not found');
        // Minimum withdrawal rule: Rs 100 (10000 paise)
        if (amountPaise < 10000) {
            throw new Error('Minimum withdrawal amount is ₹100.00');
        }
        if (worker.walletBalancePaise < amountPaise) {
            const err = new Error('Insufficient available earnings');
            err.code = 'INSUFFICIENT_AMOUNT';
            err.statusCode = 409;
            throw err;
        }
        worker.walletBalancePaise -= amountPaise;
        const withdrawal = {
            id: `wth_${Date.now()}`,
            workerId,
            amountPaise,
            method,
            payoutDetails: payoutDetails || worker.bankDetails,
            status: 'PENDING',
            createdAt: new Date().toISOString()
        };
        this.withdrawals.set(withdrawal.id, withdrawal);
        // Double-entry Ledger: WITHDRAWAL_RESERVED
        this.appendLedgerEntry({
            workerId,
            withdrawalId: withdrawal.id,
            amountPaise: -amountPaise,
            type: 'WITHDRAWAL_RESERVED',
            idempotencyKey: `WITHDRAWAL_RESERVE_${withdrawal.id}`,
            referenceNote: `Withdrawal reservation of ₹${(amountPaise / 100).toFixed(2)} to ${method}`
        });
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
    getWorkerWithdrawals(workerId) {
        return Array.from(this.withdrawals.values())
            .filter(w => w.workerId === workerId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    getWithdrawal(id) {
        return this.withdrawals.get(id);
    }
    getWorkerNotifications(workerId) {
        return this.notifications.filter(n => n.recipientId === workerId);
    }
    markNotificationRead(notificationId, workerId) {
        const notif = this.notifications.find(n => n.id === notificationId && n.recipientId === workerId);
        if (notif) {
            notif.isRead = true;
            return true;
        }
        return false;
    }
    getOrderChat(orderId, workerId) {
        const order = this.orders.get(orderId);
        if (!order)
            throw new Error('Order not found');
        const isClosed = order.status === 'COMPLETED' || order.status === 'CANCELLED';
        if (isClosed) {
            // Section 21: Worker loses chat access after order completion
            return { isClosed: true, messages: [] };
        }
        const messages = this.chatMessages.filter(m => m.orderId === orderId);
        return { isClosed: false, messages };
    }
    addChatMessage(orderId, senderId, senderRole, senderName, message) {
        const order = this.orders.get(orderId);
        if (!order)
            throw new Error('Order not found');
        if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
            throw new Error('Chat is closed for this order.');
        }
        const chatMsg = {
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
    getWorkerTickets(workerId) {
        return this.supportTickets.filter(t => t.workerId === workerId);
    }
    createWorkerTicket(workerId, data) {
        const ticket = {
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
    proposeService(workerId, data) {
        const proposal = {
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
    getWorkerProposals(workerId) {
        return this.serviceProposals.filter(p => p.workerId === workerId);
    }
    // --- Admin Portal Operations & Overrides ---
    getAdminDashboardStats() {
        const totalCustomers = Array.from(this.users.values()).filter(u => u.role === 'CUSTOMER').length;
        const totalWorkers = this.workers.length;
        const onlineWorkers = this.workers.filter(w => w.isOnline).length;
        const allOrders = Array.from(this.orders.values());
        // Active orders include ACCEPTED, IN_PROGRESS, RECEIPT_SUBMITTED, CORRECTION_REQUIRED
        const activeOrders = allOrders.filter(o => ['ACCEPTED', 'IN_PROGRESS', 'RECEIPT_SUBMITTED', 'CORRECTION_REQUIRED'].includes(o.status)).length;
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
        const complaintsDisputes = Array.from(this.complaints.values()).filter(c => c.status !== 'RESOLVED' && c.status !== 'Resolved').length;
        let totalRevenuePaise = 0;
        let totalCommissionPaise = 0;
        const paymentsMap = this.payments;
        const paidPayments = paymentsMap ? Array.from(paymentsMap.values()).filter((p) => p.status === 'PAID') : [];
        if (paidPayments.length > 0) {
            totalRevenuePaise = paidPayments.reduce((sum, p) => sum + (Number(p.amountPaise) || 0), 0);
            totalCommissionPaise = Math.round(totalRevenuePaise * 0.2);
        }
        else {
            completedOrdersList.forEach(o => {
                totalRevenuePaise += (o.pricePaise || 0);
                totalCommissionPaise += (o.commissionPaise || o.adminCommissionPaise || Math.round((o.pricePaise || 0) * 0.2));
            });
        }
        const todayStr = new Date().toISOString().split('T')[0];
        const todayOrders = allOrders.filter(o => o.createdAt && o.createdAt.startsWith(todayStr));
        const todayEarningsPaise = completedOrdersList
            .filter(o => o.completedAt && o.completedAt.startsWith(todayStr))
            .reduce((sum, o) => sum + (o.workerAmountPaise || o.workerEarningsPaise || Math.round((o.pricePaise || 0) * 0.8)), 0);
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
    getAllWorkersAdmin(filter) {
        let list = this.workers.map(w => {
            const user = this.users.get(w.id);
            const accStatus = w.status || w.accountStatus || user?.accountStatus || 'ACTIVE';
            return {
                ...w,
                workerId: w.workerId || w.id,
                status: accStatus,
                accountStatus: accStatus,
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
            list = list.filter(w => (w.name && w.name.toLowerCase().includes(q)) ||
                (w.email && w.email.toLowerCase().includes(q)) ||
                (w.phone && w.phone.includes(q)) ||
                w.id.toLowerCase().includes(q) ||
                (w.outletName && w.outletName.toLowerCase().includes(q)) ||
                (w.businessName && w.businessName.toLowerCase().includes(q)) ||
                (w.city && w.city.toLowerCase().includes(q)));
        }
        return list;
    }
    createWorkerAdmin(data) {
        const workerId = (data.workerId || data.username || '').trim();
        const workerName = (data.workerName || '').trim();
        const email = (data.email || '').trim().toLowerCase();
        const mobile = (data.mobile || '').trim();
        if (!workerName || !workerId || !mobile || !email) {
            throw new Error('Worker Name, User ID / Username, Mobile, and Email are mandatory');
        }
        if (this.workers.some(w => w.id.toLowerCase() === workerId.toLowerCase() || (w.workerId && w.workerId.toLowerCase() === workerId.toLowerCase())) ||
            this.findUserById(workerId)) {
            throw new Error(`Worker with User ID / Username "${workerId}" already exists`);
        }
        if (this.findUserByEmail(email)) {
            throw new Error(`User with email "${email}" already exists`);
        }
        // Determine secure password hash
        let passwordHash;
        if (data.passwordHash) {
            passwordHash = data.passwordHash;
        }
        else if (data.password) {
            passwordHash = bcrypt_1.default.hashSync(data.password, 10);
        }
        else {
            passwordHash = bcrypt_1.default.hashSync('password123', 10);
        }
        // Normalize skills to string[]
        let normalizedSkills = [];
        if (Array.isArray(data.skills)) {
            normalizedSkills = data.skills;
        }
        else if (typeof data.skills === 'string' && data.skills.trim()) {
            normalizedSkills = data.skills.split(',').map(s => s.trim()).filter(Boolean);
        }
        else {
            normalizedSkills = ['PAN Card', 'Voter ID', 'Aadhaar Print'];
        }
        // Normalize bank details
        const bankDetails = {
            accountNumber: data.bankDetails?.accountNumber || data.accountNumber || '',
            ifsc: data.bankDetails?.ifsc || data.ifsc || '',
            accountHolderName: data.bankDetails?.accountHolderName || data.accountHolderName || workerName,
            upiId: data.bankDetails?.upiId || data.upiId || ''
        };
        const newWorker = {
            id: workerId,
            workerId: workerId,
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
            passwordHash: passwordHash,
            isOnline: true,
            accountStatus: 'ACTIVE',
            businessName: data.businessName || `${workerName} Digital Kendra`,
            address: data.address || '',
            city: data.city || '',
            skills: normalizedSkills,
            bankDetails,
            createdAt: new Date().toISOString()
        });
        this.notifications.unshift({
            id: `notif_${Date.now()}`,
            recipientId: 'ADM-001',
            recipientRole: 'ADMIN',
            type: 'WORKER_HIRED',
            title: 'Worker Hired Successfully',
            message: `${workerName} (${workerId}) has been hired with role WORKER and is active.`,
            isRead: false,
            createdAt: new Date().toISOString()
        });
        this.addAuditLog({
            actorUserId: 'ADM-001',
            actorRole: 'ADMIN',
            action: 'WORKER_CREATED',
            entityType: 'WORKER',
            entityId: workerId,
            metadata: { name: workerName, businessName: data.businessName, role: 'WORKER' }
        });
        return newWorker;
    }
    verifyWorkerAdmin(workerId, approved, note) {
        const worker = this.getWorker(workerId);
        if (!worker)
            throw new Error('Worker not found');
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
        }
        else {
            worker.workerProfile.idVerified = approved;
        }
        const user = this.users.get(workerId);
        if (user)
            user.accountStatus = newStatus;
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
    setWorkerAccountStatusAdmin(workerId, status, reason) {
        const worker = this.getWorker(workerId);
        if (!worker)
            throw new Error('Worker not found');
        worker.accountStatus = status;
        worker.status = status;
        if (status === 'SUSPENDED' || status === 'BLOCKED' || status === 'OFFLINE' || status === 'DELETED') {
            worker.isOnline = false;
        }
        if (status === 'ACTIVE') {
            worker.idVerified = true;
            if (worker.workerProfile)
                worker.workerProfile.idVerified = true;
        }
        const user = this.users.get(workerId);
        if (user) {
            user.accountStatus = status;
            user.status = status;
            if (!worker.isOnline)
                user.isOnline = false;
        }
        this.addAuditLog({
            actorUserId: 'ADM-001',
            actorRole: 'ADMIN',
            action: status === 'DELETED' ? 'WORKER_DELETED' : (status === 'PAUSED' ? 'WORKER_PAUSED' : 'WORKER_STATUS_CHANGED'),
            entityType: 'WORKER',
            entityId: workerId,
            metadata: { newStatus: status, reason }
        });
        return worker;
    }
    deleteWorkerAdmin(workerId, reason) {
        const worker = this.getWorker(workerId);
        if (!worker)
            throw new Error('Worker not found');
        this.setWorkerAccountStatusAdmin(workerId, 'DELETED', reason || 'Deactivated and deleted by Admin');
        return {
            success: true,
            workerId,
            message: `Worker ${worker.name} (${workerId}) has been successfully deactivated and deleted.`
        };
    }
    getWorkerDetailedAdmin(workerId) {
        const rawWorker = this.getWorker(workerId);
        if (!rawWorker)
            throw new Error('Worker not found');
        const user = this.users.get(rawWorker.id);
        const accStatus = rawWorker.status || rawWorker.accountStatus || user?.accountStatus || 'ACTIVE';
        const worker = {
            ...rawWorker,
            workerId: rawWorker.workerId || rawWorker.id,
            status: accStatus,
            accountStatus: accStatus,
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
        const totalEarningsPaise = completedOrdersList.reduce((sum, o) => sum + (o.workerAmountPaise || o.workerEarningsPaise || Math.round((o.pricePaise || 0) * 0.8)), 0);
        worker.completedJobs = completedOrdersList.length;
        worker.completedOrders = completedOrdersList.length;
        worker.totalEarningsPaise = totalEarningsPaise;
        worker.totalPaidEarningsPaise = totalEarningsPaise;
        const complaints = Array.from(this.complaints.values()).filter(c => (c.complainantId === workerId && c.type === 'WORKER') ||
            (orders.some(o => o.id === c.orderId)));
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
    getAllCustomersAdmin(filter) {
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
            list = list.filter(c => (c.name && c.name.toLowerCase().includes(q)) ||
                (c.email && c.email.toLowerCase().includes(q)) ||
                (c.phone && c.phone.includes(q)) ||
                c.id.toLowerCase().includes(q));
        }
        return list;
    }
    setCustomerStatusAdmin(customerId, status, reason) {
        const user = this.users.get(customerId);
        if (!user)
            throw new Error('Customer not found');
        user.accountStatus = status;
        user.status = status;
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
    getCustomerDetailedAdmin(customerId) {
        const customer = this.users.get(customerId);
        if (!customer)
            throw new Error('Customer not found');
        const orders = Array.from(this.orders.values()).filter(o => o.customerId === customerId);
        const complaints = Array.from(this.complaints.values()).filter(c => c.complainantId === customerId);
        const orderIds = orders.map(o => o.id);
        const chatMessages = this.chatMessages.filter(m => orderIds.includes(m.orderId));
        const documents = [];
        orders.forEach(o => {
            if (o.documents && Array.isArray(o.documents)) {
                o.documents.forEach((d) => documents.push({ ...d, orderId: o.id }));
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
    getAllOrdersAdmin(filter) {
        let list = Array.from(this.orders.values()).map(o => {
            const worker = o.assignedWorkerId ? this.getWorker(o.assignedWorkerId) : null;
            const customer = this.users.get(o.customerId);
            return {
                ...o,
                orderNumber: o.orderNumber || o.id,
                pricePaise: o.pricePaise || o.pricing?.pricePaise || 0,
                workerEarningsPaise: o.workerEarningsPaise || o.pricing?.workerPayoutPaise || 0,
                workerName: worker?.name || o.workerName || (o.assignedWorkerId ? 'Worker' : null),
                customerName: customer?.name || o.customerName || 'Customer',
                customerPhone: customer?.phone || o.customerPhone
            };
        });
        const status = filter?.status;
        if (status && status !== 'ALL' && status !== 'All Status' && status !== 'undefined') {
            list = list.filter(o => o.status === status);
        }
        if (filter?.search) {
            const q = filter.search.toLowerCase().trim();
            list = list.filter(o => (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
                o.id.toLowerCase().includes(q) ||
                (o.customerName && o.customerName.toLowerCase().includes(q)) ||
                (o.workerName && o.workerName.toLowerCase().includes(q)) ||
                (o.serviceName && o.serviceName.toLowerCase().includes(q)));
        }
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    getOrderDetailedAdmin(orderId) {
        const order = this.orders.get(orderId);
        if (!order)
            throw new Error('Order not found');
        const customer = this.users.get(order.customerId);
        const worker = order.assignedWorkerId ? this.getWorker(order.assignedWorkerId) : null;
        const chat = this.chatMessages.filter(m => m.orderId === orderId);
        const complaints = Array.from(this.complaints.values()).filter(c => c.orderId === orderId);
        const auditLogs = this.auditLogs.filter(l => l.orderId === orderId || l.entityId === orderId);
        // Normalize the order so admin always sees the real customer form data.
        // Real orders store form fields inside serviceSnapshot.details; seed/mock orders
        // use a top-level formData key. Merge both so admin view is consistent.
        const normalizedOrder = { ...order };
        if (!normalizedOrder.formData || Object.keys(normalizedOrder.formData).length === 0) {
            const snapshotDetails = normalizedOrder.serviceSnapshot?.details;
            if (snapshotDetails && typeof snapshotDetails === 'object' && Object.keys(snapshotDetails).length > 0) {
                normalizedOrder.formData = snapshotDetails;
            }
        }
        // Ensure customerName/Phone/Email are populated from the user record
        if (customer) {
            if (!normalizedOrder.customerName || normalizedOrder.customerName === 'Customer') {
                normalizedOrder.customerName = customer.name || normalizedOrder.customerName;
            }
            if (!normalizedOrder.customerPhone)
                normalizedOrder.customerPhone = customer.phone || null;
            if (!normalizedOrder.customerEmail)
                normalizedOrder.customerEmail = customer.email || null;
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
    adminAssignWorker(orderId, workerId, note) {
        const order = this.orders.get(orderId);
        if (!order)
            throw new Error('Order not found');
        const worker = this.getWorker(workerId);
        if (!worker)
            throw new Error('Target worker not found');
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
        if (!order.assignmentHistory) {
            order.assignmentHistory = [];
        }
        order.assignmentHistory.push({
            previousWorkerId,
            assignedWorkerId: workerId,
            assignedAt: new Date().toISOString(),
            assignedBy: 'ADM-001',
            note: note || 'Administrative assignment'
        });
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
    adminUpdateOrderStatus(orderId, status, note) {
        const order = this.orders.get(orderId);
        if (!order)
            throw new Error('Order not found');
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
    adminRequestCorrection(orderId, reason, instruction) {
        const order = this.orders.get(orderId);
        if (!order)
            throw new Error('Order not found');
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
    adminHoldWorkerEarnings(orderId, reason) {
        const order = this.orders.get(orderId);
        if (!order)
            throw new Error('Order not found');
        if (order.isEarningsOnHold || order.earningStatus === 'ON_HOLD') {
            if (reason)
                order.earningsHoldReason = reason;
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
        const amt = order.workerAmount || order.workerEarningsPaise || Math.round((order.pricePaise || 0) * 0.8);
        if (order.assignedWorkerId) {
            const worker = this.getWorker(order.assignedWorkerId);
            if (worker) {
                worker.onHoldEarningsPaise = (worker.onHoldEarningsPaise || 0) + amt;
                if (worker.walletBalancePaise >= amt) {
                    worker.walletBalancePaise -= amt;
                }
            }
            // Double-entry Ledger: WORKER_EARNING_HELD
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
            actorUserId: 'ADM-001',
            actorRole: 'ADMIN',
            action: 'WORKER_EARNINGS_HOLD',
            entityType: 'ORDER',
            entityId: orderId,
            metadata: { reason, amountPaise: amt }
        });
        return order;
    }
    adminReleaseWorkerEarnings(orderId) {
        const order = this.orders.get(orderId);
        if (!order)
            throw new Error('Order not found');
        if (order.earningStatus === 'AVAILABLE' && !order.isEarningsOnHold && !order.earningsHold) {
            const err = new Error('Worker earnings have already been released');
            err.code = 'EARNING_ALREADY_RELEASED';
            err.statusCode = 409;
            throw err;
        }
        order.isEarningsOnHold = false;
        order.earningsHold = false;
        order.earningStatus = 'AVAILABLE';
        order.status = 'COMPLETED';
        order.earningsHoldReason = undefined;
        const amt = order.workerAmount || order.workerEarningsPaise || Math.round((order.pricePaise || 0) * 0.8);
        if (order.assignedWorkerId) {
            const worker = this.getWorker(order.assignedWorkerId);
            if (worker) {
                worker.onHoldEarningsPaise = Math.max(0, (worker.onHoldEarningsPaise || 0) - amt);
                worker.walletBalancePaise += amt;
            }
            // Double-entry Ledger: WORKER_EARNING_RELEASED_FROM_HOLD
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
            actorUserId: 'ADM-001',
            actorRole: 'ADMIN',
            action: 'WORKER_EARNINGS_RELEASED',
            entityType: 'ORDER',
            entityId: orderId,
            metadata: { amountPaise: amt }
        });
        return order;
    }
    adminRefundOrder(orderId, reason, refundAmountRequested) {
        const order = this.orders.get(orderId);
        if (!order)
            throw new Error('Order not found');
        if (order.status === 'REFUNDED' && order.refund) {
            const err = new Error('Order has already been refunded');
            err.code = 'REFUND_ALREADY_PROCESSED';
            err.statusCode = 409;
            throw err;
        }
        const customerPaidAmount = order.customerPaidAmount || order.pricePaise || 0;
        if (customerPaidAmount <= 0) {
            const err = new Error('Order is not refundable');
            err.code = 'REFUND_NOT_ALLOWED';
            err.statusCode = 400;
            throw err;
        }
        let refundAmount = customerPaidAmount;
        if (refundAmountRequested && refundAmountRequested > 0) {
            const requestedPaise = refundAmountRequested <= 1000 ? Math.round(refundAmountRequested * 100) : refundAmountRequested;
            if (requestedPaise > customerPaidAmount) {
                const err = new Error('Refund amount exceeds payment amount');
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
        // Double-entry Ledger: REFUND_ISSUED
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
                const amt = order.workerAmount || order.workerEarningsPaise || Math.round((order.pricePaise || 0) * 0.8);
                if (order.isEarningsOnHold) {
                    worker.onHoldEarningsPaise = Math.max(0, (worker.onHoldEarningsPaise || 0) - amt);
                }
                else {
                    worker.pendingEarningsPaise = Math.max(0, (worker.pendingEarningsPaise || 0) - amt);
                }
                worker.activeJobs = Math.max(0, worker.activeJobs - 1);
            }
            order.workerEarningsPaise = 0;
            order.workerAmount = 0;
        }
        this.notifications.unshift({
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
        this.addAuditLog({
            actorUserId: 'ADM-001',
            actorRole: 'ADMIN',
            action: 'ORDER_REFUNDED',
            entityType: 'ORDER',
            entityId: orderId,
            metadata: { reason, amountPaise: refundAmount }
        });
        return order;
    }
    adminVerifyReceipt(orderId, decision, note) {
        const order = this.orders.get(orderId);
        if (!order)
            throw new Error('Order not found');
        if (decision === 'APPROVED') {
            order.receiptVerifiedAt = new Date().toISOString();
            order.receiptVerificationStatus = 'APPROVED';
            // Release worker earning idempotently if eligible
            if (order.earningStatus !== 'RELEASED' && order.assignedWorkerId) {
                try {
                    this.releaseWorkerEarningOnReceiptAction(orderId, 'ADMIN');
                }
                catch (releaseErr) {
                    console.warn('[VerifyReceipt] Earning release notice:', releaseErr.message);
                }
            }
        }
        else {
            order.receiptVerificationStatus = 'REJECTED';
            order.receiptRejectedReason = note || 'Receipt rejected by admin verification';
            order.status = 'IN_PROGRESS';
        }
        this.addAuditLog({
            actorUserId: 'ADM-001',
            actorRole: 'ADMIN',
            action: decision === 'APPROVED' ? 'RECEIPT_VERIFIED_APPROVED' : 'RECEIPT_VERIFIED_REJECTED',
            entityType: 'ORDER',
            entityId: orderId,
            metadata: { decision, note }
        });
        this.persistOrdersToDisk();
        return order;
    }
    createOfficialServiceAdmin(data) {
        if (!data.name || !data.category || !data.pricePaise) {
            throw new Error('Service Name, Category, and Price are required');
        }
        const id = data.id || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const pricePaise = Number(data.pricePaise);
        const workerAmountPaise = data.workerAmountPaise !== undefined
            ? Number(data.workerAmountPaise)
            : (data.workerAmount !== undefined ? Number(data.workerAmount) * 100 : Math.round(pricePaise * 0.8));
        const platformFeePaise = data.platformFeePaise !== undefined
            ? Number(data.platformFeePaise)
            : (data.platformFee !== undefined ? Number(data.platformFee) * 100 : Math.max(0, pricePaise - workerAmountPaise));
        const newService = {
            id,
            name: data.name,
            description: data.description || '',
            category: data.category,
            pricePaise,
            estimatedTime: data.estimatedTime || '24-48 Hours',
            requiredDocuments: Array.isArray(data.requiredDocuments) ? data.requiredDocuments : (data.requiredDocuments ? String(data.requiredDocuments).split(',').map(s => s.trim()).filter(Boolean) : ['Aadhaar Card']),
            formSchema: data.formSchema || [],
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
            actorUserId: 'ADM-001',
            actorRole: 'ADMIN',
            action: 'SERVICE_CREATED',
            entityType: 'SERVICE',
            entityId: id,
            metadata: { name: newService.name, pricePaise: newService.pricePaise, workerAmountPaise, platformFeePaise }
        });
        return newService;
    }
    updateOfficialServiceAdmin(serviceId, updates) {
        const service = this.getService(serviceId);
        if (!service)
            throw new Error('Service not found');
        if (updates.name)
            service.name = updates.name;
        if (updates.description !== undefined)
            service.description = updates.description;
        if (updates.category)
            service.category = updates.category;
        if (updates.pricePaise !== undefined)
            service.pricePaise = Number(updates.pricePaise);
        if (updates.workerAmountPaise !== undefined)
            service.workerAmountPaise = Number(updates.workerAmountPaise);
        if (updates.platformFeePaise !== undefined) {
            service.platformFeePaise = Number(updates.platformFeePaise);
            service.adminCommissionPaise = Number(updates.platformFeePaise);
        }
        if (updates.estimatedTime)
            service.estimatedTime = updates.estimatedTime;
        if (updates.requiredDocuments) {
            service.requiredDocuments = Array.isArray(updates.requiredDocuments)
                ? updates.requiredDocuments
                : String(updates.requiredDocuments).split(',').map(s => s.trim()).filter(Boolean);
        }
        if (updates.status)
            service.status = updates.status;
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
    deleteOfficialServiceAdmin(serviceId) {
        const idx = this.services.findIndex(s => s.id === serviceId);
        if (idx === -1)
            throw new Error('Service not found');
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
    toggleOfficialServiceAdmin(serviceId) {
        const service = this.getService(serviceId);
        if (!service)
            throw new Error('Service not found');
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
    approveProposalAdmin(proposalId, adminId, overrides) {
        const proposal = this.serviceProposals.find(p => p.id === proposalId);
        if (!proposal)
            throw new Error('Proposal not found');
        proposal.status = 'APPROVED';
        const serviceName = (overrides?.name || proposal.name).trim();
        const serviceDesc = overrides?.description || proposal.description;
        const serviceCategory = overrides?.category || proposal.category;
        const workerAmountPaise = overrides?.workerAmountPaise !== undefined
            ? Number(overrides.workerAmountPaise)
            : (proposal.requestedWorkerAmountPaise || Math.round((proposal.suggestedPricePaise || 0) * 0.8));
        const platformFeePaise = overrides?.platformFeePaise !== undefined
            ? Number(overrides.platformFeePaise)
            : (overrides?.adminCommissionPaise !== undefined ? Number(overrides.adminCommissionPaise) : Math.round((proposal.suggestedPricePaise || 0) * 0.2));
        const pricePaise = overrides?.pricePaise !== undefined
            ? Number(overrides.pricePaise)
            : (workerAmountPaise + platformFeePaise || proposal.suggestedPricePaise);
        const estimatedTime = overrides?.estimatedTime || proposal.estimatedTime || '1-2 days';
        let requiredDocs = [];
        if (overrides?.requiredDocuments) {
            if (Array.isArray(overrides.requiredDocuments)) {
                requiredDocs = overrides.requiredDocuments.map((d) => String(d).trim()).filter(Boolean);
            }
            else if (typeof overrides.requiredDocuments === 'string') {
                requiredDocs = overrides.requiredDocuments.split(',').map((s) => s.trim()).filter(Boolean);
            }
        }
        else if (Array.isArray(proposal.requiredDocuments) && proposal.requiredDocuments.length > 0) {
            requiredDocs = proposal.requiredDocuments;
        }
        else {
            requiredDocs = ['Identity Proof'];
        }
        const serviceId = serviceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const newService = {
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
            metadata: { serviceName: proposal.name, pricePaise, workerAmountPaise, platformFeePaise }
        });
        return { proposal, newService };
    }
    rejectProposalAdmin(proposalId, adminId, reason) {
        const proposal = this.serviceProposals.find(p => p.id === proposalId);
        if (!proposal)
            throw new Error('Proposal not found');
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
        const paidOrders = allOrders.filter(o => o.paymentStatus === 'PAID' || o.payment?.status === 'PAID' || o.status === 'COMPLETED');
        const completedOrders = allOrders.filter(o => o.status === 'COMPLETED');
        // Section 8 Blueprint: Total Platform Revenue: Only verified paid orders
        let totalPlatformRevenuePaise = 0;
        let totalPlatformCommissionPaise = 0;
        let totalPlatformFeePaise = 0;
        let totalWorkerEarningsPaise = 0;
        paidOrders.forEach(o => {
            totalPlatformRevenuePaise += (o.customerPaidAmount || o.pricePaise || 0);
            totalPlatformCommissionPaise += (o.adminCommission || o.commissionPaise || Math.round((o.pricePaise || 0) * 0.2));
            totalPlatformFeePaise += (o.platformFee || 0);
        });
        completedOrders.forEach(o => {
            totalWorkerEarningsPaise += (o.workerAmount || o.workerEarningsPaise || Math.round((o.pricePaise || 0) * 0.8));
        });
        let pendingEarningsPaise = 0;
        let onHoldEarningsPaise = 0;
        this.workers.forEach(w => {
            pendingEarningsPaise += (w.pendingEarningsPaise || 0);
            onHoldEarningsPaise += (w.onHoldEarningsPaise || 0);
        });
        // Total Customer Refunds Processed from Ledger
        const ledgerRefunds = this.ledgerEntries
            .filter(l => l.type === 'REFUND_ISSUED')
            .reduce((sum, l) => sum + (l.amountPaise || 0), 0);
        const orderRefunds = allOrders
            .filter(o => (o.status === 'CANCELLED' || o.status === 'REFUNDED') && o.refund)
            .reduce((sum, o) => sum + (o.refund?.amountPaise || o.pricePaise || 0), 0);
        const totalRefundsPaise = Math.max(ledgerRefunds, orderRefunds);
        const pendingWithdrawalsPaise = Array.from(this.withdrawals.values())
            .filter(w => w.status === 'REQUESTED' || w.status === 'PENDING')
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
    approveWithdrawalAdmin(withdrawalId, adminId, paymentRef) {
        const withdrawal = this.withdrawals.get(withdrawalId);
        if (!withdrawal)
            throw new Error('Withdrawal request not found');
        if (withdrawal.status === 'COMPLETED') {
            return withdrawal;
        }
        if (withdrawal.status === 'REJECTED') {
            const err = new Error('Withdrawal has already been rejected');
            err.code = 'WITHDRAWAL_ALREADY_REJECTED';
            err.statusCode = 409;
            throw err;
        }
        withdrawal.status = 'COMPLETED';
        withdrawal.paymentReference = paymentRef || `BANK-TX-${Date.now()}`;
        withdrawal.processedAt = new Date().toISOString();
        // Double-entry Ledger: WITHDRAWAL_PAID
        this.appendLedgerEntry({
            workerId: withdrawal.workerId,
            withdrawalId: withdrawal.id,
            amountPaise: withdrawal.amountPaise,
            type: 'WITHDRAWAL_PAID',
            idempotencyKey: `WITHDRAWAL_PAID_${withdrawal.id}`,
            referenceNote: `Bank transfer ref: ${withdrawal.paymentReference}`
        });
        this.notifications.unshift({
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
    rejectWithdrawalAdmin(withdrawalId, adminId, reason) {
        const withdrawal = this.withdrawals.get(withdrawalId);
        if (!withdrawal)
            throw new Error('Withdrawal request not found');
        if (withdrawal.status === 'COMPLETED') {
            const err = new Error('Withdrawal has already been completed');
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
        // Double-entry Ledger: WITHDRAWAL_CANCELLED
        this.appendLedgerEntry({
            workerId: withdrawal.workerId,
            withdrawalId: withdrawal.id,
            amountPaise: withdrawal.amountPaise,
            type: 'WITHDRAWAL_CANCELLED',
            idempotencyKey: `WITHDRAWAL_CANCELLED_${withdrawal.id}`,
            referenceNote: `Rejection reason: ${reason}`
        });
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
    getTopEarningWorkersAdmin(period) {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const monthStr = todayStr.substring(0, 7);
        const rankings = this.workers.map(w => {
            const allWorkerCompletedOrders = Array.from(this.orders.values()).filter(o => (o.assignedWorkerId === w.id || o.assignedWorkerId === w.workerId) && o.status === 'COMPLETED');
            const filteredOrders = allWorkerCompletedOrders.filter(o => {
                if (!period || period === 'all' || period === 'all_time')
                    return true;
                const dateStr = o.completedAt || o.updatedAt || o.createdAt;
                if (!dateStr)
                    return true;
                if (period === 'daily' || period === 'today')
                    return dateStr.startsWith(todayStr);
                if (period === 'monthly' || period === 'this_month')
                    return dateStr.startsWith(monthStr);
                return true;
            });
            // Default to all completed orders if specific period filter has no entries, but preserve 0 if none
            const ordersToCount = filteredOrders.length > 0 ? filteredOrders : (period === 'daily' ? [] : allWorkerCompletedOrders);
            const totalEarningsPaise = ordersToCount.reduce((sum, o) => sum + (o.workerAmountPaise || o.workerEarningsPaise || Math.round((o.pricePaise || 0) * 0.8)), 0);
            return {
                workerId: w.id,
                workerName: w.name,
                businessName: w.businessName || w.outletName || 'Cyber Cafe Outlet',
                completedOrders: ordersToCount.length,
                totalEarningsPaise
            };
        });
        rankings.sort((a, b) => b.totalEarningsPaise - a.totalEarningsPaise);
        return rankings.map((r, index) => ({ ...r, rank: index + 1 }));
    }
    getAllComplaintsAdmin(filter) {
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
            list = list.filter(c => c.category === category || c.reason === category);
        }
        if (filter?.search) {
            const q = filter.search.toLowerCase().trim();
            list = list.filter(c => c.id.toLowerCase().includes(q) ||
                (c.orderId && c.orderId.toLowerCase().includes(q)) ||
                (c.complainantName && c.complainantName.toLowerCase().includes(q)) ||
                (c.subject && c.subject.toLowerCase().includes(q)) ||
                (c.description && c.description.toLowerCase().includes(q)));
        }
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    getComplaintDetailedAdmin(complaintId) {
        const complaint = this.complaints.get(complaintId);
        if (!complaint)
            throw new Error('Complaint not found');
        let order = null;
        let customer = null;
        let worker = null;
        let chat = [];
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
    addComplaintReplyAdmin(complaintId, adminName, message) {
        const complaint = this.complaints.get(complaintId);
        if (!complaint)
            throw new Error('Complaint not found');
        if (!complaint.replies)
            complaint.replies = [];
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
    addComplaintInternalNoteAdmin(complaintId, adminName, note) {
        const complaint = this.complaints.get(complaintId);
        if (!complaint)
            throw new Error('Complaint not found');
        if (!complaint.internalNotes)
            complaint.internalNotes = [];
        complaint.internalNotes.push({
            note,
            adminName,
            createdAt: new Date().toISOString()
        });
        complaint.updatedAt = new Date().toISOString();
        return complaint;
    }
    resolveComplaintAdmin(complaintId, decision, resolutionNote) {
        const complaint = this.complaints.get(complaintId);
        if (complaint) {
            complaint.status = 'RESOLVED';
            complaint.resolution = resolutionNote;
            complaint.resolvedAt = new Date().toISOString();
            complaint.updatedAt = new Date().toISOString();
            if (complaint.orderId) {
                if (decision === 'APPROVE') {
                    this.adminReleaseWorkerEarnings(complaint.orderId);
                }
                else if (decision === 'CORRECTION') {
                    this.adminRequestCorrection(complaint.orderId, 'Dispute Resolution Correction', resolutionNote);
                }
                else if (decision === 'REFUND') {
                    this.adminRefundOrder(complaint.orderId, resolutionNote);
                }
            }
        }
        const tkt = this.supportTickets.find((t) => t.id === complaintId);
        if (tkt) {
            tkt.status = 'RESOLVED';
            tkt.updatedAt = new Date().toISOString();
            if (!tkt.replies)
                tkt.replies = [];
            tkt.replies.push({
                sender: 'ADMIN',
                author: 'Admin Operations',
                message: resolutionNote || 'Dispute resolved by Admin',
                createdAt: new Date().toISOString()
            });
        }
        this.addAuditLog({
            actorUserId: 'ADM-001',
            actorRole: 'ADMIN',
            action: 'COMPLAINT_RESOLVED',
            entityType: 'COMPLAINT',
            entityId: complaintId,
            metadata: { decision, resolutionNote }
        });
        return complaint || tkt;
    }
    addWorkerTicketReply(ticketId, author, message) {
        const t = this.supportTickets.find((ticket) => ticket.id === ticketId);
        if (t) {
            if (!t.replies)
                t.replies = [];
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
            if (!c.replies)
                c.replies = [];
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
    resetWorkerPasswordAdmin(workerId, tempPassword) {
        const newPass = tempPassword || 'TempPass#2026';
        const worker = this.getWorker(workerId);
        if (!worker)
            throw new Error('Worker not found');
        const user = this.users.get(worker.id) || this.findUserById(worker.id);
        if (user) {
            user.password = newPass;
            user.passwordHash = newPass;
        }
        worker.temporaryPassword = newPass;
        this.addAuditLog({
            actorUserId: 'ADM-001',
            actorRole: 'ADMIN',
            action: 'WORKER_PASSWORD_RESET',
            entityType: 'WORKER',
            entityId: workerId,
            metadata: { workerId, resetAt: new Date().toISOString() }
        });
        return { success: true, temporaryPassword: newPass, message: `Password reset successfully. Temporary password: ${newPass}` };
    }
    getAllSupportTicketsAdmin(filter) {
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
            list = list.filter(t => t.id.toLowerCase().includes(q) ||
                t.subject.toLowerCase().includes(q) ||
                (t.userName && t.userName.toLowerCase().includes(q)));
        }
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    replySupportTicketAdmin(ticketId, adminId, message) {
        const ticket = this.supportTickets.find(t => t.id === ticketId);
        if (!ticket)
            throw new Error('Ticket not found');
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
                recipientRole: recipientRole,
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
    addTicketInternalNoteAdmin(ticketId, adminName, note) {
        const ticket = this.supportTickets.find(t => t.id === ticketId);
        if (!ticket)
            throw new Error('Ticket not found');
        if (!ticket.internalNotes)
            ticket.internalNotes = [];
        ticket.internalNotes.push({
            note,
            adminName,
            createdAt: new Date().toISOString()
        });
        ticket.updatedAt = new Date().toISOString();
        return ticket;
    }
    updateSupportTicketStatusAdmin(ticketId, status) {
        const ticket = this.supportTickets.find(t => t.id === ticketId);
        if (!ticket)
            throw new Error('Ticket not found');
        ticket.status = status;
        ticket.updatedAt = new Date().toISOString();
        return ticket;
    }
    getAdminNotifications() {
        return this.notifications
            .filter(n => n.recipientRole === 'ADMIN')
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    markAdminNotificationRead(notificationId) {
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
    getReportDataAdmin(reportType, period, customStartDate, customEndDate) {
        const allOrders = Array.from(this.orders.values());
        const allWithdrawals = Array.from(this.withdrawals.values());
        const allComplaints = Array.from(this.complaints.values());
        const summary = this.getAdminDashboardStats();
        const now = new Date();
        let startDate = null;
        let endDate = null;
        if (period === 'today') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        }
        else if (period === 'yesterday') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        }
        else if (period === 'last_7_days') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        }
        else if (period === 'this_month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        }
        else if (period === 'last_month') {
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        }
        else if (period === 'this_year') {
            startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        }
        else if (customStartDate && customEndDate) {
            startDate = new Date(customStartDate + (customStartDate.includes('T') ? '' : 'T00:00:00'));
            endDate = new Date(customEndDate + (customEndDate.includes('T') ? '' : 'T23:59:59.999'));
        }
        const isWithinDate = (d) => {
            if (!startDate || !endDate)
                return true;
            if (!d)
                return true;
            const t = new Date(d).getTime();
            return t >= startDate.getTime() && t <= endDate.getTime();
        };
        const targetOrders = allOrders.filter(o => isWithinDate(o.createdAt || o.completedAt));
        const targetWithdrawals = allWithdrawals.filter(w => isWithinDate(w.createdAt));
        const targetComplaints = allComplaints.filter(c => isWithinDate(c.createdAt));
        let columns = ['Metric / Item', 'Details', 'Volume / Value', 'Status / Timestamp'];
        let rows = [];
        let kpis = [];
        if (reportType.includes('revenue') || reportType.includes('commission') || reportType === 'total_revenue' || reportType === 'platform_commission') {
            columns = ['Order ID', 'Service', 'Price (Rs)', 'Worker Earning (Rs)', 'Platform Commission (Rs)', 'Status', 'Date'];
            let sumPrice = 0;
            let sumWorker = 0;
            let sumComm = 0;
            rows = targetOrders.map(o => {
                const price = o.customerPaidAmount || o.pricePaise || 0;
                const workerAmt = o.workerAmount || o.workerAmountPaise || o.workerEarningsPaise || Math.round(price * 0.8);
                const comm = o.adminCommissionPaise || (price - workerAmt) || Math.round(price * 0.2);
                sumPrice += price;
                sumWorker += workerAmt;
                sumComm += comm;
                return [
                    (o.orderNumber || o.id).slice(0, 10),
                    o.serviceName || o.serviceSnapshot?.name || 'Documentation Service',
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
        }
        else if (reportType.includes('payout') || reportType.includes('withdrawal') || reportType === 'worker_payouts') {
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
        }
        else if (reportType.includes('worker') || reportType === 'worker_performance' || reportType === 'worker_activity') {
            columns = ['Worker Name', 'City', 'Completed Orders', 'Rating', 'Total Earnings (Rs)', 'Status'];
            let totalWorkerEarnings = 0;
            rows = this.workers.map(w => {
                const workerCompleted = targetOrders.filter(o => (o.assignedWorkerId === w.id || o.assignedWorkerId === w.workerId) && o.status === 'COMPLETED');
                const earned = workerCompleted.reduce((sum, o) => sum + (o.workerAmountPaise || o.workerEarningsPaise || Math.round((o.pricePaise || 0) * 0.8)), 0);
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
        }
        else if (reportType.includes('complaint') || reportType === 'complaints_disputes') {
            columns = ['Complaint ID', 'Complainant', 'Category', 'Subject', 'Status', 'Date'];
            rows = targetComplaints.map(c => [
                c.id.slice(0, 10),
                c.complainantName || 'User',
                c.category || c.reason || 'General',
                c.subject || c.description || 'Issue',
                c.status,
                new Date(c.createdAt).toLocaleDateString()
            ]);
            kpis = [
                { label: 'Total Complaints', value: targetComplaints.length },
                { label: 'Open Disputes', value: targetComplaints.filter(c => c.status !== 'RESOLVED' && c.status !== 'Resolved').length },
                { label: 'Resolved Tickets', value: targetComplaints.filter(c => c.status === 'RESOLVED' || c.status === 'Resolved').length }
            ];
        }
        else if (reportType.includes('order_volume') || reportType.includes('demand') || reportType.includes('service')) {
            columns = ['Order ID', 'Service Name', 'Customer', 'Worker', 'Status', 'Date'];
            rows = targetOrders.map(o => [
                (o.orderNumber || o.id).slice(0, 10),
                o.serviceName || o.serviceSnapshot?.name || 'Service',
                o.customerName || 'Customer',
                o.workerName || 'Worker',
                o.status,
                new Date(o.createdAt).toLocaleDateString()
            ]);
            kpis = [
                { label: 'Total Orders', value: targetOrders.length },
                { label: 'Completed', value: targetOrders.filter(o => o.status === 'COMPLETED').length },
                { label: 'Active Pipeline', value: targetOrders.filter(o => ['ACCEPTED', 'IN_PROGRESS', 'RECEIPT_SUBMITTED'].includes(o.status)).length }
            ];
        }
        else {
            columns = ['Order ID', 'Service / Metric', 'Price (Rs)', 'Platform Commission (Rs)', 'Status', 'Date'];
            let sumPrice = 0;
            let sumComm = 0;
            rows = targetOrders.map(o => {
                const price = o.customerPaidAmount || o.pricePaise || 0;
                const workerAmt = o.workerAmount || o.workerAmountPaise || o.workerEarningsPaise || Math.round(price * 0.8);
                const comm = o.adminCommissionPaise || (price - workerAmt) || Math.round(price * 0.2);
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
    updatePlatformSettings(updates) {
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
            actorUserId: 'ADM-001',
            actorRole: 'ADMIN',
            action: 'PLATFORM_SETTINGS_UPDATED',
            entityType: 'SETTINGS',
            entityId: 'global',
            metadata: updates
        });
        return this.settings;
    }
    updateAdminProfile(adminId, updates) {
        const admin = this.users.get(adminId) || this.findUserById(adminId) || Array.from(this.users.values()).find(u => u.role === 'ADMIN');
        if (!admin)
            throw new Error('Admin not found');
        if (updates.name)
            admin.name = updates.name;
        if (updates.phone)
            admin.phone = updates.phone;
        if (updates.email)
            admin.email = updates.email;
        if (updates.name)
            this.settings.adminName = updates.name;
        if (updates.phone)
            this.settings.mobile = updates.phone;
        if (updates.email)
            this.settings.email = updates.email;
        if (updates.profilePhoto !== undefined)
            this.settings.profilePhoto = updates.profilePhoto;
        return { admin, settings: this.settings };
    }
    changeAdminPassword(adminId, oldPass, newPass) {
        const admin = this.users.get(adminId) || this.findUserById(adminId) || Array.from(this.users.values()).find(u => u.role === 'ADMIN');
        if (!admin)
            throw new Error('Admin not found');
        const hash = admin.password || admin.passwordHash;
        const match = hash ? bcrypt_1.default.compareSync(oldPass, hash) : false;
        if (!match)
            throw new Error('Current password is incorrect');
        const newHash = bcrypt_1.default.hashSync(newPass, 10);
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
    getSecurityAuditLogsAdmin(filters) {
        let list = [...this.auditLogs];
        if (filters?.action && filters.action !== 'ALL') {
            list = list.filter(l => l.action === filters.action);
        }
        if (filters?.entityType && filters.entityType !== 'ALL') {
            list = list.filter(l => l.entityType === filters.entityType);
        }
        if (filters?.search) {
            const q = filters.search.toLowerCase();
            list = list.filter(l => (l.action && l.action.toLowerCase().includes(q)) ||
                (l.entityId && l.entityId.toLowerCase().includes(q)) ||
                (l.actorUserId && l.actorUserId.toLowerCase().includes(q)));
        }
        return list;
    }
}
exports.localStore = new ResilientStore();
