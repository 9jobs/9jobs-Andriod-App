import { NextResponse } from 'next/server';

import { requireAdminApiSession } from '@/lib/admin/auth/require-admin';
import { agreementInputSchema } from '@/lib/agreements/schema';
import {
  createAgreement,
  generateAndStoreAgreementPdf,
  getAgreementDocumentById,
} from '@/lib/agreements/service';

function proxyRedirect(pathname) {
  // The page is rendered through the host admin proxy. A relative redirect keeps
  // the browser on that authenticated origin instead of exposing port 3003.
  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: `/admin/website-admin${pathname}`,
    },
  });
}

function redirectToForm() {
  return proxyRedirect('/agreements/new');
}

export async function POST(request) {
  const session = await requireAdminApiSession(request);

  if (!session) {
    return proxyRedirect('/login');
  }

  try {
    const formData = await request.formData();
    const payload = agreementInputSchema.parse(Object.fromEntries(formData));
    const createdAgreement = await createAgreement(payload);
    const agreementDocument = await getAgreementDocumentById(createdAgreement._id);

    if (!agreementDocument) {
      throw new Error('Agreement not found after creation.');
    }

    const result = await generateAndStoreAgreementPdf(agreementDocument);
    return proxyRedirect(`/agreements/${result.agreement._id}`);
  } catch (error) {
    console.error('Unable to create agreement through form fallback:', error);
    return redirectToForm();
  }
}
