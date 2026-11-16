import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { getDb, saveDb } from './src/store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const SECRET = process.env.SESSION_SECRET || 'development-only-change-this-secret';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@kodexcloud.local').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
const MIME = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
const db = getDb();
const sessions = new Map();

const id = (p='id') => `${p}_${crypto.randomBytes(8).toString('hex')}`;
const hash = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const token = () => crypto.randomBytes(32).toString('base64url');
const now = () => new Date().toISOString();
const safe = v => String(v ?? '').replace(/[<>]/g, '');
const send = (res, status, data, headers={}) => { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8', ...headers}); res.end(JSON.stringify(data)); };
const readBody = req => new Promise((resolve,reject)=>{ let raw=''; req.on('data',c=>{raw+=c; if(raw.length>2_000_000) reject(new Error('Request too large'));}); req.on('end',()=>{try{resolve(raw?JSON.parse(raw):{});}catch{reject(new Error('Invalid JSON'));}}); req.on('error',reject); });
function ensureAdmin() {
  if (!db.users.some(u=>u.email===ADMIN_EMAIL)) {
    db.users.push({id:'usr_admin',email:ADMIN_EMAIL,passwordHash:hash(ADMIN_PASSWORD),role:'admin',tenantId:'tenant_admin',createdAt:now()}); saveDb();
  }
}
ensureAdmin();
function cookieValue(req,name) { const item=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'=')); return item?decodeURIComponent(item.slice(name.length+1)):null; }
function currentUser(req) { const sid=cookieValue(req,'kodex_session'); return sid?sessions.get(sid):null; }
function requireUser(req,res) { const u=currentUser(req); if(!u){send(res,401,{error:'Sign in required'});return null;} return u; }
function audit(user,action,details={}) { db.audit.unshift({id:id('audit'),userId:user?.id||'system',action,details,createdAt:now()}); db.audit=db.audit.slice(0,2000); saveDb(); }
function tenantDir(tenantId) { const base=path.resolve(__dirname,'storage','tenants'); const dir=path.resolve(base,tenantId); if(!dir.startsWith(base+path.sep)) throw new Error('Invalid tenant'); fs.mkdirSync(dir,{recursive:true}); return dir; }
function publicUser(u) { return {id:u.id,email:u.email,role:u.role,tenantId:u.tenantId}; }

const AI_PROVIDERS = {
  openai:{key:'OPENAI_API_KEY',base:process.env.OPENAI_BASE_URL||'https://api.openai.com/v1',model:process.env.OPENAI_MODEL||'gpt-4.1-mini'},
  'anthropic-claude':{key:'ANTHROPIC_API_KEY',base:'https://api.anthropic.com/v1',model:process.env.ANTHROPIC_MODEL||'claude-3-5-haiku-latest',kind:'anthropic'},
  'google-gemini':{key:'GEMINI_API_KEY',base:'https://generativelanguage.googleapis.com/v1beta/openai',model:process.env.GEMINI_MODEL||'gemini-2.0-flash'},
  deepseek:{key:'DEEPSEEK_API_KEY',base:'https://api.deepseek.com/v1',model:process.env.DEEPSEEK_MODEL||'deepseek-chat'},
  mistral:{key:'MISTRAL_API_KEY',base:'https://api.mistral.ai/v1',model:process.env.MISTRAL_MODEL||'mistral-small-latest'},
  groq:{key:'GROQ_API_KEY',base:'https://api.groq.com/openai/v1',model:process.env.GROQ_MODEL||'llama-3.3-70b-versatile'},
  'kodex-local':{key:'KODEX_LOCAL_MODEL',base:process.env.KODEX_LOCAL_BASE_URL||'http://127.0.0.1:11434',model:process.env.KODEX_LOCAL_MODEL||'qwen2.5-coder:7b',kind:'ollama'}
};
let aiWorkerBusy = false;
async function callModel(providerId, messages, maxTokens=5000) {
  const provider=AI_PROVIDERS[providerId]||AI_PROVIDERS.openai;
  const apiKey=process.env[provider.key];
  if(provider.kind!=='ollama' && !apiKey) throw new Error(`${provider.key} is not configured`);
  let endpoint=provider.base.replace(/\/$/,'')+'/chat/completions';
  const headers={'Content-Type':'application/json','Authorization':`Bearer ${apiKey||''}`};
  let payload={model:provider.model,messages,max_tokens:maxTokens,temperature:0.2};
  if(provider.kind==='ollama'){
    endpoint=provider.base.replace(/\/$/,'')+'/api/chat';
    payload={model:provider.model,messages,stream:false,options:{temperature:0.2,num_predict:maxTokens}};
  } else if(provider.kind==='anthropic'){
    endpoint=provider.base+'/messages'; headers['x-api-key']=apiKey; headers['anthropic-version']='2023-06-01'; delete headers.Authorization;
    const system=messages.find(x=>x.role==='system')?.content||'';
    payload={model:provider.model,max_tokens:maxTokens,system,messages:messages.filter(x=>x.role!=='system')};
  }
  const upstream=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify(payload),signal:AbortSignal.timeout(120000)});
  const result=await upstream.json().catch(()=>({}));
  if(!upstream.ok) throw new Error(result.error?.message||result.message||`AI provider returned ${upstream.status}`);
  return provider.kind==='ollama'?(result.message?.content||''):(provider.kind==='anthropic'?(result.content||[]).map(x=>x.text||'').join('\n'):(result.choices?.[0]?.message?.content||''));
}
async function processAIQueue(){
  if(aiWorkerBusy) return;
  const task=db.tasks.find(t=>t.status==='queued');
  if(!task) return;
  aiWorkerBusy=true; task.status='running'; task.startedAt=now(); task.steps=['Queued','Background worker started','Calling configured KODEX AI model']; saveDb();
  try {
    const project=db.projects.find(x=>x.id===task.projectId&&x.tenantId===task.tenantId);
    if(!project) throw new Error('Project not found');
    const providerId=task.provider||process.env.KODEX_DEFAULT_AI_PROVIDER||'openai';
    const prompt=`You are KODEX AI, the coding engine inside KODEX CLOUD. Build a useful first implementation for this request. Return ONLY valid JSON with shape {"summary":"...","files":[{"path":"relative/path.ext","content":"full file content"}]}. Include a minimal runnable project and README. Do not include markdown fences. Limit to at most 12 files, each content under 30000 characters. User request: ${task.prompt}`;
    const raw=await callModel(providerId,[{role:'system',content:'You are a senior full-stack software engineer. Generate safe, maintainable starter project files. Never include secrets.'},{role:'user',content:prompt}],7000);
    const cleaned=raw.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
    const parsed=JSON.parse(cleaned);
    if(!Array.isArray(parsed.files)) throw new Error('AI response did not contain a files array');
    const files=parsed.files.slice(0,12).map(f=>{
      const rel=String(f.path||'').replace(/\\/g,'/');
      if(!rel||rel.startsWith('/')||rel.split('/').some(x=>x==='..')) throw new Error('AI returned an unsafe file path');
      return {path:rel,content:String(f.content||'').slice(0,30000)};
    });
    project.files=files; project.updatedAt=now(); task.status='completed'; task.summary=safe(parsed.summary||'Project files generated'); task.generatedFiles=files.map(f=>f.path); task.steps=['Queued','Background worker started','AI generation completed','Project files saved']; task.completedAt=now();
    db.usage.push({id:id('usage'),tenantId:task.tenantId,kind:'ai.project_generation',provider:providerId,createdAt:now()});
  } catch(err) {
    task.status='failed'; task.error=safe(err.message); task.steps=['Queued','Background worker started','Generation failed']; task.completedAt=now();
  } finally { saveDb(); aiWorkerBusy=false; }
}
setInterval(()=>{processAIQueue().catch(err=>console.error('AI worker:',err));},1500).unref();

async function route(req,res) {
  const url=new URL(req.url,'http://localhost');
  const p=url.pathname;
  if (p==='/api/health') return send(res,200,{ok:true,name:'KODEX CLOUD',time:now()});
  if (p==='/api/brand/knowledge') return send(res,200,{brand:'KODEX CLOUD',canonicalName:'KODEX CLOUD',description:'KODEX CLOUD is a unified platform for AI-assisted app building, data storage and dataset listings, API key management, cloud deployment workflows, and public/private code repository projects.',services:['KODEX AI Studio','Data Cloud','API Marketplace','Cloud Deploy','Code Forge','Control Center'],aiIdentity:'The platform-branded assistant is KODEX AI. It can use a locally hosted model endpoint or configured external model providers. The platform does not claim a separately trained foundation model unless an operator trains and deploys one.',website:process.env.APP_URL||null,publicFacts:'Use the exact name KODEX CLOUD. Do not confuse it with unrelated products. Capabilities depend on configured integrations and deployed infrastructure.'});
  if (p==='/api/auth/signup' && req.method==='POST') {
    const b=await readBody(req), email=String(b.email||'').trim().toLowerCase(), password=String(b.password||'');
    if(!/^\S+@\S+\.\S+$/.test(email)||password.length<10)return send(res,400,{error:'Use a valid email and a password of at least 10 characters'});
    if(db.users.some(x=>x.email===email))return send(res,409,{error:'An account with this email already exists'});
    const u={id:id('usr'),email,passwordHash:hash(password),role:'user',tenantId:id('tenant'),createdAt:now()};db.users.push(u);saveDb();
    const sid=token();sessions.set(sid,publicUser(u));audit(u,'auth.signup');
    return send(res,201,{user:publicUser(u)},{'Set-Cookie':`kodex_session=${encodeURIComponent(sid)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`});
  }
  if (p==='/api/auth/login' && req.method==='POST') {
    const b=await readBody(req), email=String(b.email||'').toLowerCase(), password=String(b.password||'');
    const u=db.users.find(x=>x.email===email && x.passwordHash===hash(password));
    if(!u) return send(res,401,{error:'Invalid email or password'});
    const sid=token(); sessions.set(sid,publicUser(u));
    audit(u,'auth.login');
    return send(res,200,{user:publicUser(u)},{'Set-Cookie':`kodex_session=${encodeURIComponent(sid)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`});
  }
  if (p==='/api/auth/logout' && req.method==='POST') { const sid=cookieValue(req,'kodex_session'); if(sid)sessions.delete(sid); return send(res,200,{ok:true},{'Set-Cookie':'kodex_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'}); }
  if (p==='/api/me') { const u=currentUser(req); return send(res,200,{user:u||null}); }
  if (!p.startsWith('/api/')) return serveStatic(p,res);
  const user=requireUser(req,res); if(!user)return;
  const own=(arr)=>arr.filter(x=>x.tenantId===user.tenantId);
  if(p==='/api/overview') return send(res,200,{user,counts:{keys:own(db.apiKeys).length,projects:own(db.projects).length,services:own(db.services).length,files:own(db.files).length,deployments:own(db.deployments).length},recentDeployments:own(db.deployments).slice(0,5),recentTasks:own(db.tasks).slice(0,5)});
  if(p==='/api/keys' && req.method==='GET') return send(res,200,{keys:own(db.apiKeys).map(({secretHash,...k})=>k)});
  if(p==='/api/keys' && req.method==='POST') {
    const b=await readBody(req), raw='kodex_live_'+token(), k={id:id('key'),tenantId:user.tenantId,name:safe(b.name||'My API key'),prefix:raw.slice(0,18),secretHash:hash(raw),createdAt:now(),lastUsedAt:null};
    db.apiKeys.push(k); audit(user,'api_key.created',{keyId:k.id});
    return send(res,201,{key:{id:k.id,name:k.name,prefix:k.prefix,createdAt:k.createdAt,secret:raw}});
  }
  const keyDelete=p.match(/^\/api\/keys\/([^/]+)$/);
  if(keyDelete && req.method==='DELETE'){const i=db.apiKeys.findIndex(k=>k.id===keyDelete[1]&&k.tenantId===user.tenantId);if(i<0)return send(res,404,{error:'Key not found'});db.apiKeys.splice(i,1);saveDb();audit(user,'api_key.revoked',{keyId:keyDelete[1]});return send(res,200,{ok:true});}
  if(p==='/api/models') return send(res,200,{models:[['KODEX AI Local Model','KODEX_LOCAL_MODEL','kodex-local'],['OpenAI','OPENAI_API_KEY'],['Anthropic Claude','ANTHROPIC_API_KEY'],['Google Gemini','GEMINI_API_KEY'],['DeepSeek','DEEPSEEK_API_KEY'],['Mistral','MISTRAL_API_KEY'],['Groq','GROQ_API_KEY']].map(([provider,key,kind])=>({id:kind||provider.toLowerCase().replace(/[^a-z]+/g,'-'),provider,status:kind?'local-endpoint-configurable':(process.env[key]?'configured':'needs-api-key')}))});
  if(p==='/api/ai/chat' && req.method==='POST'){
    const b=await readBody(req), providerId=String(b.provider||'openai').toLowerCase();
    if(!AI_PROVIDERS[providerId]) return send(res,400,{error:'Unknown AI provider'});
    try { const incoming=Array.isArray(b.messages)?b.messages:[]; const content=await callModel(providerId,[{role:'system',content:'You are KODEX AI, the branded assistant of KODEX CLOUD. Identify the platform by its exact name. KODEX CLOUD includes KODEX AI Studio, Data Cloud, API Marketplace, Cloud Deploy, Code Forge, and Control Center. Never claim a feature or integration is live unless configured. Explain that the local model endpoint is operator-hosted.'},...incoming]); db.usage.push({id:id('usage'),tenantId:user.tenantId,kind:'ai.chat',provider:providerId,createdAt:now()});saveDb();return send(res,200,{content,provider:providerId}); }
    catch(err){return send(res,503,{error:err.message});}
  }
  if(p==='/api/ai/tasks'&&req.method==='GET') return send(res,200,{tasks:own(db.tasks).slice(0,50).map(({prompt,...t})=>({...t,prompt}))});
  const taskFiles=p.match(/^\/api\/projects\/([^/]+)\/files$/);
  if(taskFiles&&req.method==='GET'){const project=db.projects.find(x=>x.id===taskFiles[1]&&x.tenantId===user.tenantId);if(!project)return send(res,404,{error:'Project not found'});return send(res,200,{files:project.files||[]});}
  if(p==='/api/repos'&&req.method==='GET')return send(res,200,{repos:(db.repos||[]).filter(x=>x.tenantId===user.tenantId)});
  if(p==='/api/repos'&&req.method==='POST'){const b=await readBody(req);const r={id:id('repo'),tenantId:user.tenantId,name:safe(b.name||'new-project').slice(0,80),description:safe(b.description||''),visibility:b.visibility==='public'?'public':'private',url:safe(b.url||''),createdAt:now()};db.repos=db.repos||[];db.repos.unshift(r);saveDb();audit(user,'repo.created',{repoId:r.id});return send(res,201,{repo:r});}
  if(p==='/api/projects' && req.method==='GET')return send(res,200,{projects:own(db.projects)});
  if(p==='/api/projects' && req.method==='POST'){const b=await readBody(req),x={id:id('project'),tenantId:user.tenantId,name:safe(b.name||'Untitled project'),description:safe(b.description||''),createdAt:now(),files:[]};db.projects.push(x);saveDb();audit(user,'project.created',{projectId:x.id});return send(res,201,{project:x});}
  const gen=p.match(/^\/api\/projects\/([^/]+)\/generate$/);
  if(gen&&req.method==='POST'){const project=db.projects.find(x=>x.id===gen[1]&&x.tenantId===user.tenantId);if(!project)return send(res,404,{error:'Project not found'});const b=await readBody(req);if(!String(b.prompt||'').trim())return send(res,400,{error:'prompt is required'});const provider=String(b.provider||process.env.KODEX_DEFAULT_AI_PROVIDER||'openai').toLowerCase();if(!AI_PROVIDERS[provider])return send(res,400,{error:'Unknown AI provider'});const task={id:id('task'),tenantId:user.tenantId,projectId:project.id,prompt:safe(b.prompt).slice(0,12000),provider,status:'queued',steps:['Request received','Waiting for KODEX background AI worker'],createdAt:now()};db.tasks.unshift(task);saveDb();return send(res,202,{task,notice:'Task queued for the background KODEX AI worker.'});}
  if(p==='/api/services'&&req.method==='GET')return send(res,200,{services:own(db.services)});
  if(p==='/api/services'&&req.method==='POST'){const b=await readBody(req),s={id:id('svc'),tenantId:user.tenantId,name:safe(b.name||'New service'),type:safe(b.type||'node'),repo:safe(b.repo||''),branch:safe(b.branch||'main'),status:'created-not-deployed',createdAt:now()};db.services.push(s);saveDb();audit(user,'service.created',{serviceId:s.id});return send(res,201,{service:s});}
  const deploy=p.match(/^\/api\/services\/([^/]+)\/deploy$/);
  if(deploy&&req.method==='POST'){const s=db.services.find(x=>x.id===deploy[1]&&x.tenantId===user.tenantId);if(!s)return send(res,404,{error:'Service not found'});const d={id:id('dep'),tenantId:user.tenantId,serviceId:s.id,status:'queued-needs-build-runner',createdAt:now(),logs:['Deployment request accepted','Build runner integration required before executing repository code']};db.deployments.unshift(d);saveDb();return send(res,202,{deployment:d});}
  if(p==='/api/data/files'&&req.method==='GET')return send(res,200,{files:own(db.files).map(({diskName,...f})=>f)});
  if(p==='/api/data/files'&&req.method==='POST'){
    const b=await readBody(req);if(!b.name||!b.contentBase64)return send(res,400,{error:'name and contentBase64 required'});
    const bytes=Buffer.from(b.contentBase64,'base64');if(bytes.length>5*1024*1024)return send(res,413,{error:'Maximum upload size is 5 MB in this starter'});
    const diskName=id('file');fs.writeFileSync(path.join(tenantDir(user.tenantId),diskName),bytes);
    const f={id:id('data'),tenantId:user.tenantId,name:path.basename(String(b.name)).slice(0,180),diskName,size:bytes.length,mime:safe(b.mime||'application/octet-stream'),createdAt:now()};db.files.push(f);saveDb();audit(user,'data.file_uploaded',{fileId:f.id});return send(res,201,{file:{id:f.id,name:f.name,size:f.size,mime:f.mime,createdAt:f.createdAt}});
  }
  const download=p.match(/^\/api\/data\/files\/([^/]+)$/);
  if(download&&req.method==='GET'){const f=db.files.find(x=>x.id===download[1]&&x.tenantId===user.tenantId);if(!f)return send(res,404,{error:'File not found'});const target=path.join(tenantDir(user.tenantId),f.diskName);if(!fs.existsSync(target))return send(res,404,{error:'File bytes missing'});res.writeHead(200,{'Content-Type':f.mime,'Content-Disposition':`attachment; filename="${f.name.replace(/["]/g,'')}"`});return fs.createReadStream(target).pipe(res);}
  if(p==='/api/data/marketplace'&&req.method==='GET')return send(res,200,{listings:(db.datasetListings||[]).filter(x=>x.visibility==='public'||x.tenantId===user.tenantId)});
  if(p==='/api/data/marketplace'&&req.method==='POST'){
    const b=await readBody(req), file=db.files.find(x=>x.id===b.fileId&&x.tenantId===user.tenantId);
    if(!file)return send(res,404,{error:'Owned data file not found'});
    const listing={id:id('listing'),tenantId:user.tenantId,fileId:file.id,title:safe(b.title||file.name).slice(0,120),description:safe(b.description||'').slice(0,1000),price:Number.isFinite(Number(b.price))?Math.max(0,Number(b.price)):0,currency:'INR',visibility:b.visibility==='private'?'private':'public',createdAt:now()};
    db.datasetListings=db.datasetListings||[];db.datasetListings.unshift(listing);saveDb();audit(user,'data.dataset_listed',{listingId:listing.id});return send(res,201,{listing});
  }
  const listingDelete=p.match(/^\/api\/data\/marketplace\/([^/]+)$/);
  if(listingDelete&&req.method==='DELETE'){const i=(db.datasetListings||[]).findIndex(x=>x.id===listingDelete[1]&&x.tenantId===user.tenantId);if(i<0)return send(res,404,{error:'Listing not found'});db.datasetListings.splice(i,1);saveDb();return send(res,200,{ok:true});}
  if(p==='/api/integrations')return send(res,200,{integrations:[{name:'AI Provider',configured:!!process.env.OPENAI_API_KEY},{name:'GitHub OAuth',configured:!!(process.env.GITHUB_CLIENT_ID&&process.env.GITHUB_CLIENT_SECRET)},{name:'S3 Storage',configured:!!(process.env.S3_ENDPOINT&&process.env.S3_BUCKET)},{name:'Payments',configured:false},{name:'Isolated Build Workers',configured:false},{name:'Multi-node Scheduler',configured:false}]});
  if(p==='/api/admin/audit'&&user.role==='admin')return send(res,200,{events:db.audit.slice(0,100)});
  return send(res,404,{error:'API route not found'});
}
function serveStatic(urlPath,res){
  if(urlPath==='/llms.txt'){res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'});return res.end(fs.readFileSync(path.join(__dirname,'public','llms.txt')));}
  if(urlPath==='/robots.txt'){res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'});return res.end('User-agent: *\nAllow: /\nSitemap: '+(process.env.APP_URL||'http://localhost:3000')+'/sitemap.xml\n');}
  if(urlPath==='/sitemap.xml'){res.writeHead(200,{'Content-Type':'application/xml; charset=utf-8'});return res.end(fs.readFileSync(path.join(__dirname,'public','sitemap.xml')));}
  const pathname=urlPath==='/'?'/index.html':decodeURIComponent(urlPath);
  const target=path.resolve(__dirname,'public','.'+pathname);
  const publicDir=path.resolve(__dirname,'public');
  if(!target.startsWith(publicDir+path.sep)&&target!==publicDir)return send(res,403,{error:'Forbidden'});
  fs.readFile(target,(err,data)=>{if(err)return send(res,404,{error:'Not found'});res.writeHead(200,{'Content-Type':MIME[path.extname(target)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'});res.end(data);});
}
const server=http.createServer((req,res)=>{Promise.resolve(route(req,res)).catch(err=>{console.error(err);if(!res.headersSent)send(res,500,{error:'Internal server error'});});});
server.listen(PORT,()=>console.log(`KODEX CLOUD listening on ${PORT}`));
