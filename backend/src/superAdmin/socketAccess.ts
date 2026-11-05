import type { Server, Socket } from 'socket.io';
import { verifyBackendToken } from '../middleware/auth';
import { grants, accessChanges } from './store';

export function installManagedSockets(io:Server){
 const revoke=()=>{for(const socket of io.sockets.sockets.values())if(socket.data.management_kind==='office')socket.disconnect(true);};
 accessChanges.on('changed',revoke);io.httpServer?.once('close',()=>accessChanges.off('changed',revoke));
 io.use((socket,next)=>{
  if(socket.data.management_kind!=='office')return next();
  socket.use(async(packet,done)=>{
   try{const identity=await verifyBackendToken(socket.handshake.auth.token);if(identity.management_kind!=='office')throw Error('Office Admin required');
    const [event,id]=packet;
    if(!['join_conversation','leave_conversation','mark_seen','mark_delivered','typing_start','typing_stop'].includes(event))throw Error('Unapproved Office Admin socket action');
    const allowed=await grants(identity.userId,'messages.view');if(typeof id!=='string'||!allowed.includes(id))throw Error('Unassigned conversation');
    done();
   }catch{socket.emit('socket_error',{error:'Current client permission required'});done(new Error('Access denied'));}
  });next();
 });
}
