// Discord interactions endpoint. Only the configured administrator may change request status.
// Discord validates this URL via a signed PING, even before any buttons exist.
const json = (obj, status=200) => new Response(JSON.stringify(obj), {status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const ephemeral = text => json({type:4,data:{content:text,flags:64,allowed_mentions:{parse:[]}}});
const statuses = {accept:'Accepted',decline:'Declined',schedule:'Scheduled',reopen:'Pending'};
function hexBytes(hex) {
  if(typeof hex!=='string'||hex.length%2||!/^[a-f0-9]+$/i.test(hex))throw Error('Bad hex');
  return new Uint8Array(hex.match(/../g).map(x=>parseInt(x,16)));
}
async function verified(request, publicKey) {
  const sig=request.headers.get('x-signature-ed25519');
  const ts=request.headers.get('x-signature-timestamp');
  if(!sig||!ts||!/^[0-9]+$/.test(ts)||Math.abs(Date.now()-Number(ts)*1000)>300000)return null;
  let raw;
  try { raw=await request.text(); if(raw.length>12000)return null;
    const key=await crypto.subtle.importKey('raw',hexBytes(publicKey),{name:'Ed25519'},false,['verify']);
    const ok=await crypto.subtle.verify('Ed25519',key,hexBytes(sig),new TextEncoder().encode(ts+raw));
    return ok?JSON.parse(raw):null;
  }catch{return null;}
}
function safe(v){return String(v??'').replaceAll('@','＠').replaceAll('`','ˋ').replaceAll('\\','\\\\');}
function message(row) {
  const lines=[
    '📨 **Collaboration Request**',
    `**Game:** ${safe(row.game_name)} (${row.game_appid})`,
    `**From:** ${safe(row.contact_handle)} (${row.contact_platform})`,
    `**Type:** ${row.request_type}`,
    `**Timing:** ${row.timing}`,
    row.preferred_date?`**Requested date:** ${row.preferred_date}`:null,
    row.message?`**Message:** ${safe(row.message)}`:null,
    `**Status:** ${row.status}`,
    `**ID:** ${row.id}`
  ].filter(Boolean);
  return lines.join('\n').slice(0,1950);
}
function buttons(id) {
  return [{type:1,components:[
    {type:2,style:3,label:'Accept',custom_id:`collab:accept:${id}`},
    {type:2,style:4,label:'Decline',custom_id:`collab:decline:${id}`},
    {type:2,style:1,label:'Schedule',custom_id:`collab:schedule:${id}`},
    {type:2,style:2,label:'Reopen',custom_id:`collab:reopen:${id}`}
  ]}];
}
export async function onRequestPost({request,env}) {
  if(!env.DISCORD_APPLICATION_PUBLIC_KEY)return json({error:'Not configured'},503);
  const interaction=await verified(request,env.DISCORD_APPLICATION_PUBLIC_KEY);
  if(!interaction)return new Response('Invalid request signature',{status:401});
  if(interaction.type===1)return json({type:1});
  if(interaction.type!==3)return ephemeral('Unsupported interaction.');
  if(interaction.member?.user?.id!==String(env.COLLAB_ADMIN_DISCORD_ID))return ephemeral('Only Erik can manage collaboration requests.');
  if(!env.COLLAB_DB)return ephemeral('Database is unavailable.');
  const match=/^collab:(accept|decline|schedule|reopen):([0-9a-f-]{36})$/.exec(interaction.data?.custom_id||'');
  if(!match)return ephemeral('Unrecognized request.');
  const [,action,id]=match;
  try {
    const row=await env.COLLAB_DB.prepare('SELECT * FROM collab_requests WHERE id=?').bind(id).first();
    if(!row)return ephemeral('This request was not found.');
    // Prevent using a copied custom_id from an unrelated channel or a different Discord message.
    if(String(row.discord_message_id||'')!==String(interaction.message?.id||'') ||
       String(env.COLLAB_DISCORD_CHANNEL_ID||'')!==String(interaction.channel_id||''))return ephemeral('This message is not linked to the request.');
    const updated=await env.COLLAB_DB.prepare('UPDATE collab_requests SET status=?, handled_at=datetime(\'now\'), handled_by=? WHERE id=?')
      .bind(statuses[action],String(env.COLLAB_ADMIN_DISCORD_ID),id).run();
    if(!updated.success)return ephemeral('Could not update the request.');
    row.status=statuses[action];
    // TYPE 7 edits the bot's original message as part of the interaction response.
    return json({type:7,data:{content:message(row),components:buttons(id),allowed_mentions:{parse:[]}}});
  } catch(e) {console.error('Collab interaction error',String(e));return ephemeral('Unable to update the request right now.');}
}
export function onRequestGet(){return json({error:'Method not allowed'},405);}
