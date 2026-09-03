const FIXED_PROVIDER = {
  legalName: '9 Jobs Pty Ltd',
  abn: '83679842972',
  phone: '+61 422 279 428',
  email: '9jobsapplicationservice@gmail.com',
};

function formatInitialTerm(value) {
  const normalized = String(value || '').trim();

  if (!normalized) {
    return '1 week';
  }

  if (/\bweek(s)?\b/i.test(normalized)) {
    return normalized;
  }

  return `${normalized} ${normalized === '1' ? 'week' : 'weeks'}`;
}

function createSection(heading, paragraphs, intro = null) {
  return {
    heading,
    paragraphs,
    intro,
  };
}

export function buildAgreementTemplate(input) {
  const provider = {
    legalName: input.providerName || FIXED_PROVIDER.legalName,
    abn: input.providerAbn || FIXED_PROVIDER.abn,
    phone: input.providerPhone || FIXED_PROVIDER.phone,
  };

  const sections = [
    createSection(
      '1. Scope of Services',
      [
        `Job Applications: Creation of a dedicated email address and access to the Customer’s LinkedIn and SEEK accounts to apply for a minimum of ${input.weeklyJobTarget || '100+'} jobs per week.`,
        'Recruiter Follow-Up: Follow up with recruiters regarding submitted applications as required.',
        'LinkedIn Networking Support: Assist the Customer in reaching out to their LinkedIn connections to notify them of the Customer’s job search.',
      ],
      'The Service Provider agrees to perform the following services on behalf of the Customer:'
    ),
    createSection('2. Payment Terms', [
        `The Customer agrees to pay the Service Provider a fee of ${input.servicePrice || '$150 (AUD)'} in advance for the services.`,
        `If the Customer wishes to continue receiving services after ${formatInitialTerm(input.initialTerm || '1')}, the fee will be ${input.servicePrice || '$150 (AUD)'} per week, payable in advance.`,
        `Payments must be made using the agreed payment method between the Customer and the Service Provider. Payments are due every ${input.paymentDay || 'Monday'} before services commence for that week. Services will not be provided unless payment is received in advance.`,
    ]),
    createSection('3. Payment Schedule, Cost Structure and Service Oversight', [
      'The services include management of the job application process, delivered by two team members and personally reviewed by the Service Provider to ensure quality.',
    ]),
    createSection('4. Access and Information', [
      'The Customer will provide the necessary credentials for LinkedIn and SEEK accounts and access to any application materials required for service execution.',
      'The Service Provider will maintain confidentiality of all information and ensure that the Customer’s personal details are not disclosed without consent.',
    ]),
    createSection('5. Use of CV and Other Application Materials', [
      'All application materials, including CVs and cover letters, provided or created by the Service Provider will be used exclusively for job applications under this Contract.',
      'Additional materials (cover letters, LinkedIn updates, etc.) may be prepared at an additional cost if requested by the Customer.',
    ]),
    createSection('6. Job Application Targets', [
      `The Service Provider agrees to apply for a minimum of ${input.weeklyJobTarget || '100+'} jobs per week as directed by the Customer.`,
      'No refunds will be provided if external factors (job availability, market conditions) affect outcomes.',
    ]),
    createSection('7. Customer’s Responsibilities', [
      'The Customer is responsible for responding to direct recruiter communications, managing interviews, and completing follow-up actions beyond the scope of this Contract.',
    ]),
    createSection('8. Availability', [
      'The Service Provider will be available during regular business hours, Monday to Friday, and unavailable on weekends.',
    ]),
    createSection('9. Privacy, Confidentiality, and Marketing', [
      'All personal and account details will be kept confidential and used only for job application purposes.',
      'With the Customer’s consent, the Service Provider may use the Customer’s name, photograph, and professional details for marketing purposes. The Customer may request removal at any time.',
      'The Client authorize 9Jobs Application Services to access LinkedIn, SEEK and Email accounts for job application, profile updates and communication with employers.',
      '9Jobs may login, apply for jobs, update profiles, upload resumes, and communicate with recruiters professionally.',
      'The Client confirms they own the accounts and voluntarily provide access for job application purposes.',
      '9Jobs agrees to keep all information confidential and use it only for job job application services.',
      '9Jobs is not responsible for job outcomes, employer decisions or account restrictions.',
    ]),
    createSection('10. Denial of Services', [
      'Capacity: The Service Provider may deny services at the start if at capacity.',
      'Customer Conduct: Misbehavior, abuse, or unprofessional communication from the Customer may result in immediate termination.',
      'The Service Provider is not liable for any indirect, incidental, or consequential damages arising from the use of the services.',
      'Total liability shall not exceed the total amount of fees paid by the Customer.',
    ]),
    createSection('11. Dispute Resolution', [
      'Disputes will be addressed through mediation or arbitration prior to legal action, with both parties acting in good faith.',
    ]),
    createSection('12. Governing Law', [
      'This Contract is governed by the laws of Australia. Both parties submit to the jurisdiction of Australian courts.',
    ]),
    createSection('13. Termination and Refunds', [
      'The Service Provider may terminate services with 5 days’ written notice.',
      'Any unused portion of advance payments will be refunded on a pro-rata basis.',
      'Client may cancel access anytime with written notice.',
      'If the client fails to make the payment within 5 days, 9Jobs reserves the right to suspend or stop the services without further notice.',
    ]),
    createSection('14. Entire Contract', [
      'This Contract supersedes all prior contracts or understandings and constitutes the entire understanding between the parties.',
    ]),
    createSection('15. Amendments', [
      'Any changes must be in writing and signed by both parties.',
    ]),
  ];

  return {
    title: '9Jobs Standard Plan Contract',
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
