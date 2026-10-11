import gameList from '../../src/data/steam-games.json';

const games = new Map(gameList.map(g => [Number(g.appid), g.name]));
const response = (body, status=200) => new Response(JSON.stringify(body), {status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const isText = (v,max=1500) => typeof v==='string' && v.length<=max;

export async function onRequestPost({request,env}) {
  if (!env.COLLAB_DB || !env.DISCORD_COLLAB_WEBHOOK || !env.TURNSTILE_SECRET_KEY) return response({error:'Collaboration requests are not yet configured.'},503);
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) return response({error:'Expected JSON.'},415);
  if (Number(request.headers.get('content-length')||0)>12000) return response({error:'Request too large.'},413);
  let data;
  try {data=await request.json();} catch{return response({error:'Invalid request.'},400);}
  if (!data || typeof data!=='object' || Array.isArray(data))return response({error:'Invalid request.'},400);
  const appid=Number(data.appid);
  const gameName=games.get(appid);
  if (!Number.isSafeInteger(appid)||!gameName)return response({error:'Please choose a game from the library.'},400);
  const {requestType,contactPlatform,timing}=data;
  const contactHandle=typeof data.contactHandle==='string'?data.contactHandle.trim():'';
  const message=typeof data.message==='string'?data.message.trim():'';
  const preferredDate=data.preferredDate||null;
  if (!['on-stream','off-stream','either'].includes(requestType)||!['Discord','Twitch'].includes(contactPlatform)||!['flexible','specific','discuss'].includes(timing) || !isText(contactHandle,80) || contactHandle.length<2 || /[\u0000-\u001f]/.test(contactHandle)||!isText(message)|| (preferredDate!==null && (typeof preferredDate!=='string'|| !/^\d{4}-\d{2}-\d{2}$/.test(preferredDate))) || (timing==='specific'&&!preferredDate)) return response({error:'Please check the fields and try again.'},400);
  const today=new Date().toISOString().slice(0,10);
  if(preferredDate && (preferredDate<today || Number.isNaN(Date.parse(preferredDate))))return response({error:'Please choose a future date.'},400);
  const token=typeof data.turnstileToken==='string'?data.turnstileToken:'';
  if(!token || token.length>2048)return response({error:'Please complete the verification challenge.'},400);
  try {
    const ip=request.headers.get('CF-Connecting-IP')||'';
    const verify=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:token,remoteip:ip}),signal:AbortSignal.timeout(8000)});
    const result=await verify.json();
    if(!verify.ok || !result.success || (result.hostname && !['erikthewriter.com','www.erikthewriter.com','erikthewriter-website.pages.dev'].includes(result.hostname)))return response({error:'Verification failed. Please try again.'},400);
  }catch{return response({error:'Verification unavailable. Please try again later.'},503);}
  try {
    const previous=await env.COLLAB_DB.prepare("SELECT COUNT(*) AS count FROM collab_requests WHERE contact_platform=? AND lower(contact_handle)=lower(?) AND created_at > datetime('now','-15 minutes')").bind(contactPlatform,contactHandle).first();
    if(Number(previous?.count||0)>=2)return response({error:'Please wait a little before submitting another request.'},429);
    const id=crypto.randomUUID();
    await env.COLLAB_DB.prepare('INSERT INTO collab_requests (id,game_appid,game_name,request_type,contact_platform,contact_handle,timing,preferred_date,message) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,appid,gameName,requestType,contactPlatform,contactHandle,timing,preferredDate,message||null).run();
    // A failed Discord notification must never erase an accepted request.
    const clean=s=>String(s||'').replaceAll('@','＠').replaceAll('`','\u02cb');
    const desc=[`**Game:** ${clean(gameName)} (${appid})`,`**From:** ${clean(contactHandle)} (${contactPlatform})`,`**Type:** ${requestType}`,`**Timing:** ${timing}`,preferredDate?`**Requested date:** ${preferredDate}`:null,message?`**Message:** ${clean(message)}`:null,`**ID:** ${id}`].filter(Boolean).join('\n');
    try {
      const post=await fetch(env.DISCORD_COLLAB_WEBHOOK,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({content:'📨 **New Collaboration Request**\n'+desc,allowed_mentions:{parse:[]}}),signal:AbortSignal.timeout(8000)});
      if(post.ok)await env.COLLAB_DB.prepare("UPDATE collab_requests SET notified_at=datetime('now') WHERE id=?").bind(id).run();
      else console.error('Discord notification failed',post.status,id);
    }catch(error){console.error('Discord notification error',id,String(error));}
    return response({ok:true});
  }catch(error){console.error('Collab DB error',String(error));return response({error:'Could not save the request. Please try again.'},503);}
}
export function onRequestGet(){return response({error:'Method not allowed.'},405);}
