import nodemailer from 'nodemailer';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { managementDb } from './store';

type ApprovalMessage={to:string;employeeName:string;employeeEmail:string;code:string};
export function createApprovalMailer() {
  managementDb(); // Enforce the isolated local target before loading mail settings.
  const file=path.resolve(__dirname,'../../.env.contact.local');
  const config=fs.existsSync(file)?dotenv.parse(fs.readFileSync(file)):{};
  const user=process.env.SMTP_USER||config.SMTP_USER;
  const password=(process.env.SMTP_APP_PASSWORD||config.SMTP_APP_PASSWORD||'').replace(/\s/g,'');
  if(!user||!password)throw Error('Approval email delivery is not configured.');
  const transport=nodemailer.createTransport({service:'gmail',auth:{user,pass:password},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000});
  return async(message:ApprovalMessage)=>{
    const result=await transport.sendMail({
      from:`"9Jobs Admin Approval" <${user}>`,to:message.to,
      subject:'9Jobs: approve Office Admin access',
      text:[
        'Approve Office Admin access in your LOCAL 9Jobs management system.',
        `Employee: ${message.employeeName}`,
        `Employee email: ${message.employeeEmail}`,
        '',`Your one-time approval code: ${message.code}`,
        'This code expires in 5 minutes and can only approve this employee.',
        'Enter it only in your Super Admin panel. It is not an employee password.',
        'Client access still depends on the permissions you assign.',
        'If you did not request this approval, ignore this email.'
      ].join('\n'),
    });
    if(!result.accepted?.length)throw Error('Approval email was not accepted.');
  };
}
