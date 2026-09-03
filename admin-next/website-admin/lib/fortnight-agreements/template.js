const FIXED_PROVIDER = {
  legalName: '9 Jobs Pty Ltd',
  abn: '83679842972',
  phone: '+61 422 279 428',
  email: '9jobsapplicationservice@gmail.com',
};

function normalizeMonthTerm(value, fallback = '1 month') {
  const term = String(value || fallback).trim();
  return term.toLowerCase().includes('month') ? term : `${term} month`;
}

function createSection(heading, paragraphs, intro = '') {
  return {
    heading,
    intro,
    paragraphs,
  };
}

export function buildFortnightAgreementTemplate(input) {
  const provider = {
    legalName: input.providerName || FIXED_PROVIDER.legalName,
    abn: input.providerAbn || FIXED_PROVIDER.abn,
    phone: input.providerPhone || FIXED_PROVIDER.phone,
  };

  const hasRenewal = Boolean(input.renewalEnabled);
  const servicePeriod = normalizeMonthTerm(input.initialTerm, '2 month');
  const renewalTerm = normalizeMonthTerm(input.renewalTerm, '1 month');

  const sections = [
    createSection(
      '1. Service Provider',
      [
        'Resume Optimisation: Enhancing the client\'s resume to improve its appeal to potential employers.',
        'Profile Optimisation: Refining the client\'s online profiles on platforms like LinkedIn to ensure maximum visibility.',
        'Job Searching: Identifying suitable job opportunities that align with the client\'s skills and career goals.',
        'Application Submission: Submitting job applications on relevant employment portals such as SEEK, LinkedIn, and other platforms.',
      ],
      '9Jobs Application Services will offer job application support services, which include:'
    ),
    createSection(
      '2. Service Period',
      [],
      `The service period is defined as ${servicePeriod}, commencing from the date this agreement is signed.`
    ),
    createSection(
      '3. Upfront Service Fee',
      hasRenewal
        ? [
            `Fee Amount: The Client agrees to pay an upfront service fee of ${input.servicePrice || 'AUD $200'} for ${servicePeriod}.`,
            `Renewal: To continue the services after ${renewalTerm}, the Client must pay ${input.renewalFee || 'AUD $90'} for each additional month.`,
          ]
        : [
            `Fee Amount: The Client agrees to pay an upfront service fee of ${input.servicePrice || 'AUD $200'}.`,
            'Non-Refundable: This fee is non-refundable.',
          ]
    ),
    createSection(
      '4. Success Fee',
      [
        'If the Client secures employment during the service period, or from any application submitted by 9Jobs during the service period, the Client agrees to pay a success fee.',
        'Permanent Employment or Fixed-Term Employment of Six (6) Months or More: The success fee will be equal to fourteen (14) days of the Client\'s gross salary before taxes.',
        'Fixed-Term Employment of Three (3) Months or Less: The success fee will be equal to seven (7) days of the Client\'s gross salary before taxes.',
        'Other Fixed-Term Employment: If the Client secures fixed-term or contract employment for a period greater than three (3) months but less than six (6) months, the applicable success fee may be adjusted and will be agreed upon in writing between the Client and 9Jobs.',
      ]
    ),
    createSection(
      '5. Payment Terms',
      [
        'The success fee shall be paid within seven (7) days of the Client accepting the employment offer.',
      ]
    ),
    createSection(
      '6. Confidentiality',
      [
        'All personal information, documents, and account access provided by the Client will be kept confidential and used solely for job application purposes.',
      ]
    ),
    createSection(
      '7. Client Responsibilities',
      [
        'Provide accurate information.',
        'Respond to communications in a timely manner.',
        'Attend scheduled interviews whenever possible.',
      ],
      'The Client agrees to:'
    ),
    createSection(
      '8. No Guarantee',
      [
        'Employment',
        'Interview invitations',
        'Sponsorship outcomes',
        'Visa outcomes',
        'Specific salary levels',
      ],
      '9Jobs does not guarantee:'
    ),
    createSection(
      '9. Acknowledgement',
      [],
      'By signing this agreement, both parties confirm their understanding and acceptance of the terms outlined above.'
    ),
  ];

  return {
    title: '9Jobs Service Agreement',
    provider,
    agreementDate: input.agreementDate,
    sections,
    signatureBlocks: {
      provider: {
        label: 'Service Provider',
        name: input.providerSignatureName || 'Aditya Singh',
        email: input.providerEmail || FIXED_PROVIDER.email,
        phone: provider.phone,
      },
      customer: {
        label: 'Customer',
        name: input.clientName,
        email: input.clientEmail,
        phone: input.clientPhone,
      },
    },
  };
}
