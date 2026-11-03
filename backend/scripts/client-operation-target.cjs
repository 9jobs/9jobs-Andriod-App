// Operator tools must name the target explicitly; never inherit a repo default.
function assertClientTarget(env=process.env){
 let target;try{target=new URL(env.DATABASE_URL||'');}catch{throw new Error('Explicit database target required');}
 if(!['postgres:','postgresql:'].includes(target.protocol) || !env.CLIENT_ID_DATABASE_HOST || target.hostname!==env.CLIENT_ID_DATABASE_HOST)throw new Error('Explicit database host confirmation required');
}
module.exports={assertClientTarget};
