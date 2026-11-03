import {describe,it,expect} from 'vitest';
import {combineOpportunityPage,matchesOpportunity} from './opportunityPagination';
const rows=(start:number,count:number)=>Array.from({length:count},(_,i)=>({id:start+i,title:'Accountant',company:'Test',user_name:'Candidate'}));
describe('opportunity pagination',()=>{
  it('uses the total source count rather than a 200-row cached cap',()=>{
    const result=combineOpportunityPage({jobs:rows(225,25),total:1000},[],'',10,25);
    expect(result.total).toBe(1000);expect(result.jobs[0].id).toBe(225);expect(result.jobs).toHaveLength(25);
  });
  it.each([25,50,75,100])('respects the %i row choice',size=>{
    expect(combineOpportunityPage({jobs:rows(0,size),total:1000},rows(1000,8),'',1,size).jobs).toHaveLength(size);
  });
  it('fills a boundary page without repeating or skipping manual opportunities',()=>{
    const manual=rows(60,30);
    const a=combineOpportunityPage({jobs:rows(50,10),total:60},manual,'',3,25);
    const b=combineOpportunityPage({jobs:[],total:60},manual,'',4,25);
    expect(a.jobs.map(j=>j.id)).toEqual(Array.from({length:25},(_,i)=>50+i));
    expect(b.jobs.map(j=>j.id)).toEqual(Array.from({length:15},(_,i)=>75+i));
    expect(a.total).toBe(90);
  });
  it('supports no source rows, empty results, and case-insensitive search',()=>{
    expect(combineOpportunityPage({jobs:[],total:0},rows(1,4),'ACCOUNTANT',1,25).jobs).toHaveLength(4);
    expect(combineOpportunityPage({jobs:[],total:0},rows(1,4),'missing',1,25)).toEqual({jobs:[],total:0});
    expect(matchesOpportunity({user_email:'test@example.com'},'EXAMPLE')).toBe(true);
  });
});
