import { NextResponse } from 'next/server';
import connectDB from '@/utils/db';
import ClientInfo from '@/models/ClientInfo';
import { uploadPrivatePdf } from '@/lib/storage/blob';

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    const {
      fullName,
      contactNo,
      workingRights,
      workingRightsCustom,
      address,
      dob,
      expectedSalary,
      preferredJobLocation,
      workType,
      noticePeriod,
      email,
      password,
      preferredRole,
      resumeData,      // Base64 string of file
      resumeName,      // Filename
      resumeType,      // Mime-type
      coverLetterData,
      coverLetterName,
      coverLetterType
    } = body;

    // Validation
    if (!fullName || !contactNo || !workingRights || !address || !dob || !expectedSalary || !preferredJobLocation || !workType || !noticePeriod || !email || !password || !preferredRole) {
      return NextResponse.json({ error: 'All text fields are required.' }, { status: 400 });
    }

    if (!resumeData || !resumeName) {
      return NextResponse.json({ error: 'Resume file is required.' }, { status: 400 });
    }

    // Process file upload to GridFS
    const base64Content = resumeData.substring(resumeData.indexOf(',') + 1);
    const fileBuffer = Buffer.from(base64Content, 'base64');
    
    // Store in gridfs
    const folder = 'client-resumes';
    const fileName = `${Date.now()}-${resumeName}`;
    const contentType = resumeType || 'application/octet-stream';

    let uploadResult;
    try {
      uploadResult = await uploadPrivatePdf({
        folder,
        fileName,
        buffer: fileBuffer,
        contentType,
      });
    } catch (uploadError) {
      console.error('Failed to upload client resume:', uploadError);
      return NextResponse.json({ error: 'Failed to upload resume to private storage.' }, { status: 500 });
    }

    // Resolve final working rights text
    const finalWorkingRights = workingRights === 'Other' ? (workingRightsCustom || 'Other') : workingRights;

    let coverLetterUploadResult = null;
    if (coverLetterData && coverLetterName) {
      const coverLetterBase64Content = coverLetterData.substring(coverLetterData.indexOf(',') + 1);
      const coverLetterBuffer = Buffer.from(coverLetterBase64Content, 'base64');
      const coverLetterFileName = `${Date.now()}-${coverLetterName}`;
      const coverLetterContentType = coverLetterType || 'application/octet-stream';

      try {
        coverLetterUploadResult = await uploadPrivatePdf({
          folder: 'client-cover-letters',
          fileName: coverLetterFileName,
          buffer: coverLetterBuffer,
          contentType: coverLetterContentType,
        });
      } catch (uploadError) {
        console.error('Failed to upload client cover letter:', uploadError);
        return NextResponse.json({ error: 'Failed to upload cover letter to private storage.' }, { status: 500 });
      }
    }

    const newClientInfo = new ClientInfo({
      fullName,
      contactNo,
      workingRights: finalWorkingRights,
      address,
      dob,
      expectedSalary,
      preferredJobLocation,
      workType,
      noticePeriod,
      email,
      password,
      preferredRole,
      resumeUrl: uploadResult.url,
      resumeStorageKey: uploadResult.path,
      resumeFileName: resumeName,
      coverLetterUrl: coverLetterUploadResult?.url || '',
      coverLetterStorageKey: coverLetterUploadResult?.path || '',
      coverLetterFileName: coverLetterName || '',
    });

    await newClientInfo.save();

    return NextResponse.json({ success: 'Information submitted successfully!' }, { status: 200 });
  } catch (error) {
    console.error('Client Info API Error:', error);
    return NextResponse.json({ error: error.message || 'An error occurred during submission.' }, { status: 500 });
  }
}
