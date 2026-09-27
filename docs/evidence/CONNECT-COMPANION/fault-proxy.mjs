// Local QA only. Forward real API traffic; fail one post-registration read.
import http from 'node:http';
import fs from 'node:fs';
let failRead = false;
http.createServer((req,res)=>{
  const route = req.url.split('?')[0];
  if (failRead && req.method === 'GET' && /^\/api\/v1\/companions\/[^/]+$/.test(route)) {
    failRead=false;
    console.log(JSON.stringify({method:req.method,path:route,status:502,injected:true}));
    res.writeHead(502,{'Content-Type':'application/json'});res.end(JSON.stringify({error:{code:'UPSTREAM_FAILED',message:'検証用: 登録後の確認通信を一度遮断しました。',retryable:true}}));return;
  }
  if (route.endsWith('/atlas') && fs.existsSync('.local/fail-next-atlas')) {
    fs.unlinkSync('.local/fail-next-atlas');
    console.log(JSON.stringify({method:req.method,path:route,status:502,injected:true}));
    res.writeHead(502);res.end();return;
  }
  const delay = route === '/api/v1/companions' && fs.existsSync('.local/delay-next-list');
  if (delay) fs.unlinkSync('.local/delay-next-list');
  const logged = route.includes('/companion');
  const chunks=[];
  req.on('data',c=>{if(logged && !String(req.headers['content-type']).includes('multipart')) chunks.push(c);});
  const out=http.request({hostname:'127.0.0.1',port:3027,path:req.url,method:req.method,headers:req.headers},up=>{
    if (logged) console.log(JSON.stringify({method:req.method,path:route,status:up.statusCode,mode:req.headers['x-data-mode'],version:req.headers['if-match'],key:req.headers['idempotency-key'],body:Buffer.concat(chunks).toString()||undefined}));
    if (req.method==='POST' && route.endsWith('/registration') && up.statusCode<300 && fs.existsSync('.local/drop-next-companion-read')) { fs.unlinkSync('.local/drop-next-companion-read');failRead=true; }
    if (delay) {
      const buffered=[];up.on('data',chunk=>buffered.push(chunk));up.on('end',()=>setTimeout(()=>{
        console.log(JSON.stringify({path:route,delayed:true,clientClosed:res.destroyed}));
        if (!res.destroyed) {res.writeHead(up.statusCode,up.headers);res.end(Buffer.concat(buffered));}
      },10000));
    } else {res.writeHead(up.statusCode,up.headers);up.pipe(res);}
  });out.on('error',()=>{res.writeHead(502);res.end();});req.pipe(out);
}).listen(3028,'127.0.0.1',()=>console.log('QA fault proxy 3028 -> real API3027'));
