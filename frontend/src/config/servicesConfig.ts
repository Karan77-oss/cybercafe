export interface ApplicationTypeOption {
  id: string;
  title: string;
  description: string;
  badge?: string;
  formType?: string;
}

export interface ServiceConfigItem {
  id: string;
  serviceKey: string;
  name: string;
  category: string;
  applicationTypes: ApplicationTypeOption[];
}

export const servicesConfig: Record<string, ServiceConfigItem> = {
  pan: {
    id: 'pan-card',
    serviceKey: 'pan',
    name: 'PAN Card Services',
    category: 'PAN-related services',
    applicationTypes: [
      {
        id: 'new-pan',
        title: 'New PAN Card (Form 49A)',
        description: 'Fresh 10-digit PAN allotment with biometric Aadhaar verification for Indian citizens',
        badge: 'Most Popular',
        formType: 'Form 49A'
      },
      {
        id: 'pan-correction',
        title: 'Correction / Update in Existing PAN',
        description: 'Update name, father name, DOB, signature, photo or link Aadhaar with PAN',
        badge: 'Update Details',
        formType: 'CSF'
      },
      {
        id: 'duplicate-pan',
        title: 'Duplicate / Lost Reprint',
        description: 'Order reprint of lost, damaged or mutilated physical PAN card with latest QR code',
        badge: 'Reprint',
        formType: 'Reprint'
      }
    ]
  },

  aadhaar: {
    id: 'aadhaar-update',
    serviceKey: 'aadhaar',
    name: 'Aadhaar Services',
    category: 'Government forms',
    applicationTypes: [
      {
        id: 'demographic-update',
        title: 'Demographic Update (Name / DOB / Gender)',
        description: 'Correction of personal details as per supporting valid gazette or identity proof',
        badge: 'UIDAI',
        formType: 'Demographic'
      },
      {
        id: 'address-update',
        title: 'Address Update / Shifting',
        description: 'Update residential address using electricity bill, bank passbook or rent agreement',
        badge: 'Online Verification',
        formType: 'Address'
      },
      {
        id: 'mobile-email-link',
        title: 'Mobile / Email Linking Assistance',
        description: 'Prepare appointment booking and operator verification to link active mobile with Aadhaar',
        badge: 'Slot Booking',
        formType: 'Biometric'
      },
      {
        id: 'pvc-card',
        title: 'Official Aadhaar PVC Card Order',
        description: 'Order durable, waterproof PVC smart card with secure hologram from UIDAI',
        badge: 'Doorstep Delivery',
        formType: 'PVC'
      }
    ]
  },

  voter: {
    id: 'voter-id',
    serviceKey: 'voter',
    name: 'Voter ID (EPIC) Services',
    category: 'Government forms',
    applicationTypes: [
      {
        id: 'new-voter',
        title: 'New Voter Registration (Form 6)',
        description: 'Fresh inclusion in the Electoral Roll for first-time voters aged 18 and above',
        badge: 'Form 6',
        formType: 'Form 6'
      },
      {
        id: 'voter-correction',
        title: 'Correction of Entries (Form 8)',
        description: 'Correction of name, age, relation, photo, or shifting of residence within constituency',
        badge: 'Form 8',
        formType: 'Form 8'
      },
      {
        id: 'duplicate-epic',
        title: 'Duplicate / Lost EPIC Card',
        description: 'Re-issue and replacement download of lost, destroyed, or mutilated Voter ID card',
        badge: 'Form 8 / Reprint',
        formType: 'Reprint'
      },
      {
        id: 'overseas-voter',
        title: 'Overseas Voter Registration (Form 6A)',
        description: 'Enrollment for non-resident Indian citizens living outside India',
        badge: 'Form 6A',
        formType: 'Form 6A'
      }
    ]
  },

  dl: {
    id: 'driving-license',
    serviceKey: 'dl',
    name: 'Driving Licence (RTO) Services',
    category: 'Government forms',
    applicationTypes: [
      {
        id: 'learner-licence',
        title: 'Learner Licence (LL)',
        description: 'Fresh application for 2-wheeler/4-wheeler, slot booking, and Parivahan portal filing',
        badge: 'Stage 1',
        formType: 'Form 2'
      },
      {
        id: 'permanent-dl',
        title: 'Permanent Driving Licence',
        description: 'Book driving skill test slot and convert active Learner Licence to permanent smart DL',
        badge: 'Stage 2',
        formType: 'Form 4'
      },
      {
        id: 'dl-renewal-address',
        title: 'DL Renewal / Address Change',
        description: 'Renew expiring DL or update current residential address with medical certificate Form 1A',
        badge: 'Renewal',
        formType: 'Form 9'
      },
      {
        id: 'duplicate-dl',
        title: 'Duplicate / Lost DL',
        description: 'Apply for replacement smart card driving licence in case of loss, theft or damage',
        badge: 'Reprint',
        formType: 'Duplicate'
      }
    ]
  },

  certificates: {
    id: 'income-caste-residence',
    serviceKey: 'certificates',
    name: 'Government Certificates',
    category: 'Certificate applications',
    applicationTypes: [
      {
        id: 'income-cert',
        title: 'Income Certificate',
        description: 'Official state revenue authority annual family income certificate for fee concessions and EWS',
        badge: 'Revenue Portal',
        formType: 'Income'
      },
      {
        id: 'caste-cert',
        title: 'Caste / Category Certificate (SC / ST / OBC)',
        description: 'State government caste verification certificate for reservations and competitive exams',
        badge: 'SDM / Tehsildar',
        formType: 'Caste'
      },
      {
        id: 'domicile-cert',
        title: 'Domicile / Residence Certificate',
        description: 'Proof of permanent state residency required for state government admissions and jobs',
        badge: 'Permanent Resident',
        formType: 'Domicile'
      },
      {
        id: 'ews-cert',
        title: 'Economically Weaker Section (EWS) Certificate',
        description: 'Central or state format income and asset certificate for 10% EWS reservation',
        badge: 'EWS',
        formType: 'EWS'
      }
    ]
  },

  ration: {
    id: 'ration-card',
    serviceKey: 'ration',
    name: 'Ration Card Services',
    category: 'Government forms',
    applicationTypes: [
      {
        id: 'new-ration-card',
        title: 'New Ration Card Application',
        description: 'Fresh application under NFSA / State Food Security Scheme for eligible family units',
        badge: 'NFSA Portal',
        formType: 'New'
      },
      {
        id: 'member-addition-deletion',
        title: 'Member Addition / Deletion',
        description: 'Add new family member (newborn/spouse) or delete deceased/migrated member',
        badge: 'Update Members',
        formType: 'Member'
      },
      {
        id: 'fps-address-change',
        title: 'Address / Fair Price Shop (FPS) Transfer',
        description: 'Transfer quota allocation to a new locality or change assigned dealer ration shop',
        badge: 'Transfer',
        formType: 'Transfer'
      },
      {
        id: 'duplicate-ration',
        title: 'Duplicate / Split Ration Card',
        description: 'Separate joint card into nuclear units or replace lost/damaged physical card booklet',
        badge: 'Split / Reprint',
        formType: 'Split'
      }
    ]
  },

  passport: {
    id: 'passport-assistance',
    serviceKey: 'passport',
    name: 'Passport Services',
    category: 'Passport-related application assistance',
    applicationTypes: [
      {
        id: 'fresh-passport',
        title: 'Fresh Normal Passport (36 / 60 Pages)',
        description: 'Standard 10-year validity booklet application, annexure checks, and PSK/POPSK appointment',
        badge: 'Normal Quota',
        formType: 'Fresh Normal'
      },
      {
        id: 'tatkaal-passport',
        title: 'Tatkaal Passport Application',
        description: 'Expedited passport issuance under emergency Tatkaal quota with prioritized appointment',
        badge: 'Fast Track',
        formType: 'Tatkaal'
      },
      {
        id: 'passport-renewal',
        title: 'Passport Renewal / Re-issue',
        description: 'Re-issue for expired passport, page exhaustion, address update, or change of appearance',
        badge: 'Re-issue',
        formType: 'Renewal'
      },
      {
        id: 'passport-correction',
        title: 'Correction / Name Change After Marriage',
        description: 'Post-marriage surname change, spelling fixes, or spouse name endorsement in booklet',
        badge: 'Endorsement',
        formType: 'Correction'
      }
    ]
  }
};

// Aliases for seamless lookup by slug, ID or partial key
servicesConfig['pan-card'] = servicesConfig.pan;
servicesConfig['aadhaar-update'] = servicesConfig.aadhaar;
servicesConfig['voter-id'] = servicesConfig.voter;
servicesConfig['driving-license'] = servicesConfig.dl;
servicesConfig['driving-licence'] = servicesConfig.dl;
servicesConfig['income-caste-residence'] = servicesConfig.certificates;
servicesConfig['ration-card'] = servicesConfig.ration;
servicesConfig['passport-assistance'] = servicesConfig.passport;

/**
 * Resolve servicesConfig entry by service ID, category, or service object
 */
export function getServiceConfig(srvOrKey: any): ServiceConfigItem {
  if (!srvOrKey) return servicesConfig.pan;
  if (typeof srvOrKey === 'string') {
    const key = srvOrKey.toLowerCase().trim();
    if (servicesConfig[key]) return servicesConfig[key];
    if (key.includes('pan')) return servicesConfig.pan;
    if (key.includes('aadhaar') || key.includes('uidai')) return servicesConfig.aadhaar;
    if (key.includes('voter') || key.includes('epic') || key.includes('election')) return servicesConfig.voter;
    if (key.includes('dl') || key.includes('driving') || key.includes('licence') || key.includes('license') || key.includes('rto')) return servicesConfig.dl;
    if (key.includes('certificate') || key.includes('income') || key.includes('caste') || key.includes('domicile')) return servicesConfig.certificates;
    if (key.includes('ration')) return servicesConfig.ration;
    if (key.includes('passport')) return servicesConfig.passport;
    return servicesConfig.pan;
  }

  const text = `${srvOrKey.id || ''} ${srvOrKey.name || ''} ${srvOrKey.category || ''}`.toLowerCase();
  if (text.includes('pan')) return servicesConfig.pan;
  if (text.includes('aadhaar') || text.includes('uidai')) return servicesConfig.aadhaar;
  if (text.includes('voter') || text.includes('epic') || text.includes('election')) return servicesConfig.voter;
  if (text.includes('dl') || text.includes('driving') || text.includes('licence') || text.includes('license') || text.includes('rto')) return servicesConfig.dl;
  if (text.includes('certificate') || text.includes('income') || text.includes('caste') || text.includes('domicile')) return servicesConfig.certificates;
  if (text.includes('ration')) return servicesConfig.ration;
  if (text.includes('passport')) return servicesConfig.passport;
  return servicesConfig.pan;
}

export default servicesConfig;
