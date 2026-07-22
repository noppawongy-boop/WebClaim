/* Weekly/monthly filtering for summaries, channel counters, and saved claims. */
(() => {
  const bar=document.querySelector('#periodBar'),picker=document.querySelector('#periodPicker'),caption=document.querySelector('#periodCaption');
  if(!bar||!picker)return;
  let mode='all';
  const pad=n=>String(n).padStart(2,'0');
  const localDate=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const isoWeekValue=date=>{const d=new Date(date.getFullYear(),date.getMonth(),date.getDate());d.setDate(d.getDate()+3-((d.getDay()+6)%7));const w1=new Date(d.getFullYear(),0,4);const week=1+Math.round(((d-w1)/86400000-3+((w1.getDay()+6)%7))/7);return`${d.getFullYear()}-W${pad(week)}`};
  const claimDate=x=>String(x.contactDate||x.purchaseDate||x.createdAt||'').slice(0,10);
  const weekRange=value=>{const m=String(value).match(/^(\d{4})-W(\d{2})$/);if(!m)return null;const jan4=new Date(+m[1],0,4),monday=new Date(jan4);monday.setDate(jan4.getDate()-((jan4.getDay()+6)%7)+(+m[2]-1)*7);const sunday=new Date(monday);sunday.setDate(monday.getDate()+6);return[localDate(monday),localDate(sunday)]};
  const matches=x=>{if(mode==='all')return true;const d=claimDate(x);if(!d)return false;if(mode==='month')return d.startsWith(picker.value);const range=weekRange(picker.value);return!!range&&d>=range[0]&&d<=range[1]};
  const originalRender=render;
  render=function(){const complete=claims;claims=complete.filter(matches);try{originalRender()}finally{claims=complete}updateCaption()};
  function updateCaption(){if(mode==='all'){caption.textContent='กำลังแสดงข้อมูลทั้งหมด';return}if(mode==='month'){const [y,m]=picker.value.split('-');caption.textContent=`กำลังแสดงข้อมูลรายเดือน ${m}/${y}`;return}const range=weekRange(picker.value);caption.textContent=range?`กำลังแสดงข้อมูลรายสัปดาห์ ${range[0]} ถึง ${range[1]}`:'กรุณาเลือกสัปดาห์'}
  function setMode(next){mode=next;bar.querySelectorAll('[data-period]').forEach(b=>b.classList.toggle('active',b.dataset.period===mode));picker.classList.toggle('hidden',mode==='all');if(mode==='month'){picker.type='month';picker.value=localDate(new Date()).slice(0,7)}else if(mode==='week'){picker.type='week';picker.value=isoWeekValue(new Date())}render()}
  bar.addEventListener('click',e=>{const b=e.target.closest('[data-period]');if(b)setMode(b.dataset.period)});picker.addEventListener('change',render);updateCaption();
})();
