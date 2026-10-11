export const dayOrder=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
export const zoneLabels:Record<string,string>={'America/Chicago':'Central','America/New_York':'Eastern','America/Denver':'Mountain','America/Los_Angeles':'Pacific'};
export function niceTime(time:string){const [h,m]=time.split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`;}

export function niceDate(date: Date | string): string {
  if (!date) return '';

  const parsed = date instanceof Date
    ? date
    : new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  });
}

export function isUpcoming(date:string,time:string,zone:string){
 // Compare the event's local wall-clock date and time with the current clock in that timezone.
 const now=new Date();
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const val=(key:string)=>parts.find(p=>p.type===key)?.value||'00';
 const current=`${val('year')}-${val('month')}-${val('day')}T${val('hour')}:${val('minute')}`;
 return `${date}T${time}`>=current;
}
