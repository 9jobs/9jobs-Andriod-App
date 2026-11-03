const {test}=require('node:test');
const assert=require('node:assert/strict');
require('ts-node/register');
const {generateInterviewAnswer}=require('../src/services/interviewAssistant');
test('assistant respects exact questions and includes only provided bounded conversation context',async()=>{
 const original=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY='test-only';
 try{
  const requests=[];
  const transport=async(url,init)=>{
   requests.push({url,init,body:JSON.parse(init.body)});
   const q=JSON.parse(requests.at(-1).body.contents.at(-1).parts[0].text).question;
   return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({aiAnswer:q==='What is SQL?'?'SQL queries relational data.':'REST is an architectural style.',feedback:'',clarityScore:0,impactScore:0,structureScore:0})}]}}]}));
  };
  const a=await generateInterviewAnswer({text:'Tell me about yourself'},'What is SQL?',[],transport);
  const b=await generateInterviewAnswer({text:'Tell me about yourself'},'What is REST?',[{transcript:'What is SQL?',ai_answer:a.aiAnswer}],transport);
  assert.notEqual(a.aiAnswer,b.aiAnswer);
  assert.equal(requests[1].body.contents[0].parts[0].text,'What is SQL?');
  assert.equal(requests[1].body.contents[1].role,'model');
  assert.ok(!requests[0].url.includes('test-only'));
  assert.equal(requests[0].init.headers['x-goog-api-key'],'test-only');
  assert.ok(requests[0].body.systemInstruction.parts[0].text.includes('do not force a first-person'));
 }finally{if(original===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=original;}
});
test('missing key, provider failure and invalid output never return a canned success',async()=>{
 const old=process.env.GEMINI_API_KEY,google=process.env.GOOGLE_API_KEY;
 delete process.env.GEMINI_API_KEY;delete process.env.GOOGLE_API_KEY;
 try{
  await assert.rejects(generateInterviewAnswer({text:'Intro'},'Question'),e=>e.code==='AI_NOT_CONFIGURED');
  process.env.GEMINI_API_KEY='test-only';
  await assert.rejects(generateInterviewAnswer({text:'Intro'},'Question',[],async()=>new Response('{}',{status:429})),e=>e.code==='AI_RATE_LIMITED');
  await assert.rejects(generateInterviewAnswer({text:'Intro'},'Question',[],async()=>new Response('{}')),e=>e.code==='AI_INVALID_RESPONSE');
  await assert.rejects(generateInterviewAnswer({text:'Intro'},'  '),e=>e.status===400);
 }finally{if(old===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=old;if(google===undefined)delete process.env.GOOGLE_API_KEY;else process.env.GOOGLE_API_KEY=google;}
});
