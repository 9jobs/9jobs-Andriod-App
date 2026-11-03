const {test}=require('node:test');
const assert=require('node:assert/strict');
require('ts-node/register');
process.env.LOCAL_DATABASE_MODE='isolated-e2e';
process.env.DATABASE_URL='postgresql://client_id_test@127.0.0.1:55439/9jobs_local_e2e_fixture';
process.env.JWT_SECRET='questionnaire_unit_secret_32_characters_minimum';
process.env.VERCEL='1';
const upstream=require('../src/lib/supabase');
upstream.canReachSupabaseUpstream=async()=>false;
const {createApp}=require('../src/app');

test('document upload and submission reject missing or invalid authentication without saving',async()=>{
  const server=createApp().listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${server.address().port}/api/mobile/questionnaire`;
  try {
    const complete={fullName:'Fixture',contactNumber:'123456789',workingRights:'Citizen',fullAddress:'Test address',dateOfBirth:'1995-01-01',gender:'Other',expectedSalary:'90000',noticePeriod:'Immediately',preferredJobLocations:['Remote'],workTypes:['Full-time'],preferredRoles:['Developer'],resumePath:'unit-questionnaire-user/resume.pdf'};
    for(const [url,body,type] of [[base+'/upload-url',{documentType:'resume',fileName:'fixture.pdf',fileSize:20},'application/json'],
      [base,complete,'application/json'],[base+'/local-upload','%PDF-1.4 fixture','application/pdf']]) {
      const response=await fetch(url,{method:'POST',headers:{Authorization:'Bearer invalid-token','Content-Type':type},body:type==='application/json'?JSON.stringify(body):body});
      assert.equal(response.status,401);
      const result=await response.json();
      assert.match(result.error,/Unauthorized/i);
      assert.equal(result.success,undefined);
      assert.equal(result.uploadUrl,undefined);
    }
  } finally {await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
});
