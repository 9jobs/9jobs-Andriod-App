// Private-LAN transport to the existing isolated backend. Authentication remains upstream.
const http=require('node:http'),net=require('node:net'),os=require('node:os');
function isPrivateHost(host){return /^10\.\d+\.\d+\.\d+$/.test(host)||/^192\.168\.\d+\.\d+$/.test(host)||/^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(host);}
function getPrivateLanHost(){
 const addresses=[...new Set(Object.values(os.networkInterfaces()).flat().filter(i=>i&&!i.internal&&i.family==='IPv4'&&isPrivateHost(i.address)).map(i=>i.address))];
 if(addresses.length!==1)throw new Error('Pass the exact assigned private LAN IP');
 return addresses[0];
}
function createPhoneBridge(host,port=3101){
 const assigned=Object.values(os.networkInterfaces()).flat().some(i=>i?.address===host&&!i.internal);
 if(!isPrivateHost(host)||!assigned)throw new Error('An assigned private LAN IPv4 address is required');
 const allowed=url=>url==='/health'||url.startsWith('/api/')||url.startsWith('/socket.io/');
 const server=http.createServer((req,res)=>{
  if(!allowed(req.url||'')){res.writeHead(404);res.end();return;}
  const upstream=http.request({host:'127.0.0.1',port:3100,path:req.url,method:req.method,
   headers:{...req.headers,host:'127.0.0.1:3100','x-9jobs-local-transport':'phone-lan','x-9jobs-local-peer':req.socket.remoteAddress||''},timeout:30000},response=>{
    res.writeHead(response.statusCode||502,response.headers);response.pipe(res);
   });
  upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502,{'Content-Type':'application/json'});res.end('{"error":"Local backend unavailable"}');});
  upstream.on('timeout',()=>upstream.destroy());req.on('aborted',()=>upstream.destroy());req.pipe(upstream);
 });
 server.on('upgrade',(req,socket,head)=>{
  if(!(req.url||'').startsWith('/socket.io/')){socket.destroy();return;}
  const upstream=net.connect(3100,'127.0.0.1',()=>{
   const headers={...req.headers,host:'127.0.0.1:3100'};
   upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`+Object.entries(headers).map(([k,v])=>`${k}: ${v}`).join('\r\n')+'\r\n\r\n');
   if(head.length)upstream.write(head);upstream.pipe(socket);socket.pipe(upstream);
  });
  upstream.on('error',()=>socket.destroy());socket.on('error',()=>upstream.destroy());socket.on('close',()=>upstream.destroy());
 });
 server.requestTimeout=30000;server.listen(port,host);
 return server;
}
module.exports={createPhoneBridge,isPrivateHost,getPrivateLanHost};
