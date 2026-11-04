const {test}=require('node:test');
const assert=require('node:assert/strict');
require('ts-node/register');
const express=require('express');
const identity=require('../src/middleware/sheetIdentity');
const accounts=require('../src/services/verifiedAccount');
const {createAuthRouter}=require('../src/routes/auth');
test('admin login requires the verified approved email and an admin role',async()=>{
 process.env.JWT_SECRET='unit-test-secret-of-at-least-thirty-two-characters';
 process.env.ADMIN_LOGIN_EMAIL='9jobsapplicationservice@gmail.com';
 process.env.ADMIN_LOGIN_PASSWORD='unit-test-password';
 let role='admin',email='9jobsapplicationservice@gmail.com',persisted=0;
 identity.verifyClerkSession=async()=>({userId:'fixture-admin',role});
 accounts.lookupVerifiedAccount=async()=>({userId:'fixture-admin',email,fullName:'Fixture Admin'});
 accounts.persistVerifiedAccount=async()=>{persisted++};
 const app=express();app.use(express.json());app.use('/auth',createAuthRouter(()=>null));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const request=(body,session=true)=>fetch('http://127.0.0.1:'+server.address().port+'/auth/token',{method:'POST',headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer fixture-session'}:{})},body:JSON.stringify(body)});
 try{
  let response=await request({role:'admin'});assert.equal(response.status,200);assert.equal((await response.json()).user.role,'admin');assert.equal(persisted,1);
  email='outsider@example.invalid';response=await request({role:'admin'});assert.equal(response.status,403);assert.equal(persisted,1);
  email='9jobsapplicationservice@gmail.com';role='client';response=await request({role:'admin'});assert.equal(response.status,403);
  response=await request({email,password:'wrong-password'},false);assert.equal(response.status,401);
  response=await request({email,password:'unit-test-password'},false);assert.equal(response.status,200);
  process.env.ADMIN_LOGIN_EMAIL='outsider@example.invalid';response=await request({email:'outsider@example.invalid',password:'unit-test-password'},false);assert.equal(response.status,401);
 }finally{await new Promise(r=>server.close(r));}
});
