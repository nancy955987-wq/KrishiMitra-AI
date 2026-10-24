const http = require('http');
// Minimal .env loader; no extra package required.
try { for (const line of fs.readFileSync(path.join(__dirname,'.env'),'utf8').split(/\r?\n/)) { const m=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/); if(m && !m[1].startsWith('#') && !process.env[m[1]]) process.env[m[1]]=m[2].replace(/^['"]|['"]$/g,''); } } catch {}
const fs = require('fs');
const path = require('path');
// Minimal .env loader; no extra package required.
try { for (const line of fs.readFileSync(path.join(__dirname,'.env'),'utf8').split(/\r?\n/)) { const m=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/); if(m && !m[1].startsWith('#') && !process.env[m[1]]) process.env[m[1]]=m[2].replace(/^['\"]|['\"]$/g,''); } } catch {}
const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const API_KEY = process.env.GEMINI_API_KEY || '';
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const SOURCES = [
 {title:'PM-KISAN official portal',url:'https://pmkisan.gov.in/'},
 {title:'PM Fasal Bima Yojana',url:'https://pmfby.gov.in/'},
 {title:'Soil Health Card portal',url:'https://soilhealth.dac.gov.in/'},
 {title:'myScheme government portal',url:'https://www.myscheme.gov.in/'},
 {title:'ICAR Krishi Vigyan Kendra directory',url:'https://kvk.icar.gov.in/'},
 {title:'IMD weather services',url:'https://mausam.imd.gov.in/'},
 {title:'AGMARKNET market information',url:'https://agmarknet.gov.in/'}
];
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon'};
function send(res,status,obj){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj));}
function readBody(req,max=7*1024*1024){return new Promise((resolve,reject)=>{let data='';req.on('data',c=>{data+=c;if(data.length>max){reject(new Error('Request too large'));req.destroy();}});req.on('end',()=>{try{resolve(JSON.parse(data||'{}'));}catch{reject(new Error('Invalid JSON'));}});req.on('error',reject);});}
const systemInstruction = `You are KrishiMitra, a careful farmer-support assistant for India. Respond in the same language and script the farmer uses in their latest message, automatically detecting it. Support any language you can reasonably understand, including Indian languages (Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Punjabi, Kannada, Malayalam, Odia, Assamese, Urdu), Hinglish and international languages. If the farmer explicitly requests another language, use that language. Do not default to English just because the interface is in English. If language is unclear, ask which language they prefer. Be practical, concise, and accessible to low-literacy users. Never claim to have checked live official pages or a farmer's records unless actually done. Do not invent scheme eligibility, deadlines, prices, weather, pesticide doses, or disease diagnoses. For scheme questions, direct the user to the relevant official portal and say rules can change. For crop problems, list plausible causes as possibilities, ask for missing details, recommend low-risk observations first, and do not prescribe chemical products/doses. Encourage local KVK/agriculture officer confirmation for diagnosis or high-impact actions. If reliable information is missing or uncertain, say so clearly. Never ask for Aadhaar, bank account, OTP, or passwords. Do not claim that the following links have been searched live; they are official places to verify: ${SOURCES.map(s=>s.title+': '+s.url).join(' | ')}. Structure answers with short steps where useful. End with a brief verification note for consequential advice.`;
async function gemini(contents){
 if(!API_KEY) return null;
 const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(API_KEY)}`;
 const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({systemInstruction:{parts:[{text:systemInstruction}]},contents,generationConfig:{temperature:0.25,maxOutputTokens:900}})});
 const data=await r.json().catch(()=>({}));
 if(!r.ok){const msg=data.error?.message||`Gemini request failed (${r.status})`;throw new Error(msg);}
 return (data.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('\n').trim();
}
const server=http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://localhost');
 if(req.method==='GET'&&u.pathname==='/api/health') return send(res,200,{ok:true,aiConfigured:Boolean(API_KEY),model:API_KEY?MODEL:null,mode:API_KEY?'gemini':'demo',message:API_KEY?'Gemini API configured':'No API key configured; demo fallback is active'});
 if(req.method==='POST'&&u.pathname==='/api/chat'){
  try{const b=await readBody(req,100000);const message=String(b.message||'').trim();if(!message)return send(res,400,{error:'Message is required'});if(message.length>5000)return send(res,413,{error:'Message is too long'});
   if(!API_KEY)return send(res,503,{error:'AI is not configured. Add GEMINI_API_KEY to .env and restart the server.',mode:'demo'});
   const prompt=`Farmer question: ${message}\nLanguage instruction: automatically detect the language/script of the farmer's message and reply in that same language. The interface language setting must not override the farmer's language.\nDistrict, if provided: ${String(b.district||'not provided').slice(0,100)}\nProvide careful guidance. Clearly separate general guidance from facts that need official verification.`;
   const answer=await gemini([{role:'user',parts:[{text:prompt}]}]);if(!answer)return send(res,502,{error:'The AI returned no answer'});
   return send(res,200,{answer,mode:'gemini',sources:SOURCES.filter(s=>/scheme|pm.?kisan|insurance|soil|kvk|market|mandi|weather|crop/i.test(message+' '+s.title)).slice(0,4)});
  }catch(e){return send(res,502,{error:e.message||'AI service unavailable'});}
 }
 if(req.method==='POST'&&u.pathname==='/api/crop-analysis'){
  try{const b=await readBody(req,7*1024*1024);if(!API_KEY)return send(res,503,{error:'AI image analysis needs GEMINI_API_KEY'});if(!b.image||!['image/jpeg','image/png','image/webp'].includes(b.mimeType))return send(res,400,{error:'Upload a JPG, PNG, or WEBP image'});if(b.image.length>6*1024*1024)return send(res,413,{error:'Image too large'});
   const text=`Review this farmer-uploaded crop photo as a cautious preliminary observation, not a definitive diagnosis. Crop: ${String(b.crop||'unknown').slice(0,100)}; stage: ${String(b.stage||'unknown').slice(0,100)}; farmer-selected symptom: ${String(b.symptom||'unknown').slice(0,100)}; notes: ${String(b.notes||'').slice(0,500)}. Automatically detect the farmer's language and reply in that same language and script, regardless of interface language. Support any language the model can reasonably handle. Describe only visible features, give no more than 2-3 possible explanations with uncertainty, suggest safe observations, and state what additional info a local agriculture expert needs. Do not recommend pesticide brands or doses. If image is unclear or does not show a plant, say so.`;
   const answer=await gemini([{role:'user',parts:[{text},{inlineData:{mimeType:b.mimeType,data:b.image}}]}]);if(!answer)return send(res,502,{error:'No image analysis returned'});return send(res,200,{answer,mode:'gemini-vision',sources:[SOURCES.find(s=>s.title.includes('Krishi Vigyan'))]});
  }catch(e){return send(res,502,{error:e.message||'Image analysis unavailable'});}
 }
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end('Method not allowed');}
 let pathname=decodeURIComponent(u.pathname);if(pathname==='/')pathname='/index.html';const file=path.resolve(ROOT,'.'+pathname);if(!file.startsWith(ROOT+path.sep)){res.writeHead(403);return res.end('Forbidden');}
 fs.readFile(file,(err,buf)=>{if(err){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});return res.end('Not found');}res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'});res.end(req.method==='HEAD'?undefined:buf);});
});
server.listen(PORT,()=>console.log(`KrishiMitra running at http://localhost:${PORT} | AI ${API_KEY?'configured':'demo mode (set GEMINI_API_KEY in .env)'}`));
