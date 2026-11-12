/**
 * Default fallback form schemas shared across Web (frontend, admin) and Mobile app.
 * Used whenever a service in the database does not have a custom formSchema defined.
 */

export const DEFAULT_GENERIC_FORM_SCHEMA = [
  { id: 'fullName', label: 'Full Name of Applicant', type: 'text', required: true },
  { id: 'phone', label: 'Contact Phone / WhatsApp Number', type: 'tel', required: true },
  { id: 'email', label: 'Email Address', type: 'email', required: true },
  { id: 'address', label: 'Complete Postal / Residential Address', type: 'textarea', required: true }
];

export const DEFAULT_SERVICE_SCHEMAS = {
  pan: [
    { id: 'applicationType', label: 'Application Type', type: 'select', required: true, options: ['New PAN (Form 49A)', 'Correction / Update in Existing PAN', 'Duplicate / Lost Reprint'] },
    { id: 'fullName', label: 'Full Name as per Aadhaar', type: 'text', required: true },
    { id: 'fatherName', label: "Father's Full Name", type: 'text', required: true },
    { id: 'dob', label: 'Date of Birth (DD/MM/YYYY)', type: 'date', required: true },
    { id: 'gender', label: 'Gender', type: 'select', required: true, options: ['Male', 'Female', 'Transgender'] },
    { id: 'aadhaarNumber', label: '12-Digit Aadhaar Number', type: 'text', required: true },
    { id: 'existingPan', label: 'Existing PAN Number (for correction/reprint)', type: 'text', required: false },
    { id: 'phone', label: 'Mobile Number Linked to Aadhaar', type: 'tel', required: true },
    { id: 'email', label: 'Email Address for e-PAN Delivery', type: 'email', required: true },
    { id: 'address', label: 'Delivery Address for Physical PAN Card', type: 'textarea', required: true }
  ],

  aadhaar: [
    { id: 'applicationType', label: 'Aadhaar Service Type', type: 'select', required: true, options: ['Mobile / Email Link Assistance', 'Address Update', 'Name / DOB Correction', 'Biometric / Photo Update Appointment', 'Official PVC Card Order'] },
    { id: 'fullName', label: 'Full Name of Resident', type: 'text', required: true },
    { id: 'aadhaarNumber', label: '12-Digit Aadhaar Number', type: 'text', required: true },
    { id: 'phone', label: 'Active Mobile Number', type: 'tel', required: true },
    { id: 'email', label: 'Email Address', type: 'email', required: false },
    { id: 'newAddress', label: 'Updated Address (if address change)', type: 'textarea', required: false },
    { id: 'pincode', label: 'Postal PIN Code', type: 'text', required: true }
  ],

  voter: [
    { id: 'applicationType', label: 'Voter Application Type', type: 'select', required: true, options: ['New Voter Registration (Form 6)', 'Correction of Entries (Form 8)', 'Shifting of Residence', 'Duplicate / Lost EPIC Card', 'Overseas Voter (Form 6A)'] },
    { id: 'fullName', label: 'Applicant Name', type: 'text', required: true },
    { id: 'relationName', label: "Father's / Husband's / Mother's Name", type: 'text', required: true },
    { id: 'dob', label: 'Date of Birth', type: 'date', required: true },
    { id: 'gender', label: 'Gender', type: 'select', required: true, options: ['Male', 'Female', 'Third Gender'] },
    { id: 'epicNumber', label: 'Existing Voter EPIC Number (if correction/reprint)', type: 'text', required: false },
    { id: 'assemblyConstituency', label: 'Assembly Constituency', type: 'text', required: true },
    { id: 'phone', label: 'Mobile Number', type: 'tel', required: true },
    { id: 'address', label: 'Residential Address', type: 'textarea', required: true }
  ],

  passport: [
    { id: 'applicationType', label: 'Passport Scheme', type: 'select', required: true, options: ['Fresh Normal Passport (36 Pages)', 'Fresh Normal Passport (60 Pages)', 'Tatkaal Passport (36 Pages)', 'Re-issue / Renewal', 'Police Clearance Certificate (PCC)'] },
    { id: 'givenName', label: 'Given Name (First & Middle Name)', type: 'text', required: true },
    { id: 'surname', label: 'Surname', type: 'text', required: true },
    { id: 'dob', label: 'Date of Birth', type: 'date', required: true },
    { id: 'placeOfBirth', label: 'Place of Birth (Village/Town/City & State)', type: 'text', required: true },
    { id: 'maritalStatus', label: 'Marital Status', type: 'select', required: true, options: ['Single', 'Married', 'Divorced', 'Widowed'] },
    { id: 'employmentType', label: 'Employment Type', type: 'select', required: true, options: ['Private', 'Government', 'Student', 'Self-Employed', 'Homemaker', 'Others'] },
    { id: 'educationalQualification', label: 'Educational Qualification', type: 'select', required: true, options: ['Graduate & Above', '10th Pass & Above', 'Between 8th and 9th Standard', '7th Standard or Less'] },
    { id: 'phone', label: 'Emergency Contact Mobile Number', type: 'tel', required: true },
    { id: 'address', label: 'Present Residential Address with Police Station', type: 'textarea', required: true }
  ],

  dl: [
    { id: 'applicationType', label: 'Licence Category', type: 'select', required: true, options: ['Learner Licence (MCWG + LMV)', 'Permanent Driving Licence', 'DL Renewal', 'Address / Detail Change', 'Duplicate / Lost DL'] },
    { id: 'fullName', label: 'Applicant Name', type: 'text', required: true },
    { id: 'fatherOrHusbandName', label: "Father's / Guardian's Name", type: 'text', required: true },
    { id: 'dob', label: 'Date of Birth', type: 'date', required: true },
    { id: 'bloodGroup', label: 'Blood Group', type: 'select', required: true, options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'] },
    { id: 'existingLlOrDlNumber', label: 'Existing LL or DL Number (if applicable)', type: 'text', required: false },
    { id: 'rtoOffice', label: 'Jurisdiction RTO / District Transport Office', type: 'text', required: true },
    { id: 'phone', label: 'Mobile Number', type: 'tel', required: true },
    { id: 'address', label: 'Permanent Address', type: 'textarea', required: true }
  ],

  certificates: [
    { id: 'applicationType', label: 'Certificate Required', type: 'select', required: true, options: ['Income Certificate', 'Caste / Community Certificate (OBC/SC/ST)', 'Domicile / Residence Certificate', 'Economically Weaker Section (EWS) Certificate', 'Non-Creamy Layer (NCL) Certificate'] },
    { id: 'applicantName', label: 'Applicant Full Name', type: 'text', required: true },
    { id: 'fatherName', label: "Father's Name", type: 'text', required: true },
    { id: 'motherName', label: "Mother's Name", type: 'text', required: true },
    { id: 'annualIncome', label: 'Total Annual Family Income (in ₹)', type: 'text', required: false },
    { id: 'casteCategory', label: 'Caste / Sub-Caste Name (if applicable)', type: 'text', required: false },
    { id: 'tehsilDistrict', label: 'Tehsil / Taluka & District', type: 'text', required: true },
    { id: 'phone', label: 'Contact Phone Number', type: 'tel', required: true },
    { id: 'address', label: 'Residential Address', type: 'textarea', required: true }
  ],

  ration: [
    { id: 'applicationType', label: 'Ration Card Service Type', type: 'select', required: true, options: ['New Ration Card (NFSA)', 'Member Addition', 'Member Deletion', 'Address / Dealer Fair Price Shop Transfer', 'Duplicate / Lost Card'] },
    { id: 'headOfFamily', label: 'Head of Family Name (Female Senior)', type: 'text', required: true },
    { id: 'aadhaarOfHead', label: 'Aadhaar Number of Head of Family', type: 'text', required: true },
    { id: 'totalMembers', label: 'Total Number of Family Members', type: 'text', required: true },
    { id: 'existingRationNumber', label: 'Existing Ration Card Number (if modification)', type: 'text', required: false },
    { id: 'phone', label: 'Mobile Number', type: 'tel', required: true },
    { id: 'address', label: 'Family Residential Address', type: 'textarea', required: true }
  ]
};

/**
 * Resolves the appropriate form schema for a service.
 * Prioritizes the database service.formSchema, falling back to tailored defaults by service key or generic schema.
 */
export function resolveServiceFormSchema(service) {
  if (service?.formSchema) {
    if (Array.isArray(service.formSchema) && service.formSchema.length > 0) {
      return service.formSchema;
    }
    if (typeof service.formSchema === 'string') {
      try {
        const parsed = JSON.parse(service.formSchema);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
  }

  const key = String(service?.id || service?.serviceKey || service?.category || '').toLowerCase();
  for (const [prefix, schema] of Object.entries(DEFAULT_SERVICE_SCHEMAS)) {
    if (key.includes(prefix)) {
      return schema;
    }
  }

  return DEFAULT_GENERIC_FORM_SCHEMA;
}

export default {
  DEFAULT_GENERIC_FORM_SCHEMA,
  DEFAULT_SERVICE_SCHEMAS,
  resolveServiceFormSchema
};
