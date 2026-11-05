import { Router } from 'express';
import { sessionExchange } from './identity';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth';
import { actions, grants, managementDb } from './store';
const router=Router();
router.post('/session',(req,res)=>void sessionExchange(req,res,'office'));
router.get('/access',authMiddleware,async(req:AuthenticatedRequest,res)=>{try{if(req.user?.management_kind!=='office')return res.status(403).json({error:'Office Admin required'});const allowed=await Promise.all(actions.map(async action=>[action,await grants(req.user!.userId,action)]));res.setHeader('Cache-Control','no-store');return res.json({permissions:Object.fromEntries(allowed)});}catch{return res.status(403).json({error:'Access revoked'});}});
// Compatibility read route; active employees can manage published and hidden stories.
router.get('/success-stories',authMiddleware,async(req:AuthenticatedRequest,res)=>{
 if(req.user?.management_kind!=='office')return res.status(403).json({error:'Office Admin required'});
 res.setHeader('Cache-Control','private, no-store');
 try{const stories=(await managementDb().query(`select id,name,position,year,message,story_rate,photo_url,display_order,is_active,created_at from public.success_stories order by display_order,created_at desc`)).rows;return res.json({success:true,stories,readOnly:false});}
 catch{return res.status(503).json({error:'Published success stories are temporarily unavailable.'});}
});
export default router;
