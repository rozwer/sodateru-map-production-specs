// Local verification proxy: forwards unchanged requests to the isolated real API.
// Logs no cookies, tokens, request bodies, or personal records.
import http from 'node:http';
const upstream = Number(process.env.REFLECTION_API_PORT || 3139);
http.createServer((req, res) => {
  const target = http.request({ hostname: '127.0.0.1', port: upstream, path: req.url, method: req.method, headers: {...req.headers, host: `127.0.0.1:${upstream}`} }, reply => {
    if (req.url.startsWith('/api/')) console.log(JSON.stringify({method:req.method,path:req.url,status:reply.statusCode}));
    res.writeHead(reply.statusCode, reply.headers); reply.pipe(res);
  });
  target.on('error', () => { res.writeHead(502); res.end(); });
  req.pipe(target);
}).listen(3140, '127.0.0.1');
