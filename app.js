let classes=[];let activeClass=null;let activeCategory='All';
const grid=document.getElementById('grid'),count=document.getElementById('count'),modal=document.getElementById('modal');
const selected=document.getElementById('selected'),formView=document.getElementById('formView'),successView=document.getElementById('successView');
const confirmation=document.getElementById('confirmation'),formError=document.getElementById('formError');

async function loadClasses(){
  const res=await fetch('/api/classes');
  classes=await res.json();
  render(activeCategory);
}
function render(cat='All'){
  activeCategory=cat;
  const list=cat==='All'?classes:classes.filter(c=>c.category===cat);
  count.textContent=list.length+' class'+(list.length===1?'':'es');
  grid.innerHTML=list.map(c=>`<article class="card"><div class="card-head"><div><span class="pill">${c.category}</span><h4>${c.name}</h4></div><div class="spots">${c.spots_left} spot${c.spots_left===1?'':'s'} left</div></div><div class="details"><div><strong>${c.day}, ${c.date}</strong></div><div><strong>${c.time}</strong></div><div>Instructor: <strong>${c.instructor}</strong></div></div><button class="reserve" data-id="${c.id}" ${c.spots_left<=0?'disabled':''}>${c.spots_left<=0?'Class Full':'Reserve'}</button></article>`).join('');
  document.querySelectorAll('.reserve:not(:disabled)').forEach(btn=>btn.addEventListener('click',()=>openModal(Number(btn.dataset.id))));
}
function openModal(id){
  activeClass=classes.find(c=>c.id===id);if(!activeClass)return;
  selected.textContent=`${activeClass.name} • ${activeClass.day}, ${activeClass.date} at ${activeClass.time} with ${activeClass.instructor}`;
  formView.classList.remove('hidden');successView.classList.add('hidden');formError.classList.add('hidden');
  document.getElementById('reservationForm').reset();modal.classList.add('open');
}
function closeModal(){modal.classList.remove('open')}
document.getElementById('closeBtn').onclick=closeModal;document.getElementById('backdrop').onclick=closeModal;document.getElementById('doneBtn').onclick=closeModal;

document.querySelectorAll('.filter').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.filter').forEach(b=>b.classList.remove('active'));btn.classList.add('active');render(btn.dataset.cat)}));

document.getElementById('reservationForm').addEventListener('submit',async e=>{
  e.preventDefault();formError.classList.add('hidden');
  const name=document.getElementById('name').value.trim(),email=document.getElementById('email').value.trim();
  const res=await fetch('/api/reservations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({classId:activeClass.id,name,email})});
  const data=await res.json();
  if(!res.ok){formError.textContent=data.error||'Reservation failed.';formError.classList.remove('hidden');return;}
  confirmation.textContent=`${name}, your spot for ${activeClass.name} on ${activeClass.day} at ${activeClass.time} is confirmed.`;
  formView.classList.add('hidden');successView.classList.remove('hidden');await loadClasses();
});

async function loadAdmin(){
  const res=await fetch('/api/admin/reservations');const rows=await res.json();
  const byClass={};classes.forEach(c=>byClass[c.id]={classInfo:c,members:[]});rows.forEach(r=>byClass[r.class_id]?.members.push(r));
  document.getElementById('adminContent').innerHTML=Object.values(byClass).map(({classInfo:c,members})=>`<section class="admin-class"><h3>${c.name}</h3><div class="admin-meta">${c.day}, ${c.date} • ${c.time} • ${c.instructor} • ${c.spots_left}/${c.capacity} spots available</div><div class="member-list">${members.length?members.map(m=>`<div class="member"><strong>${escapeHtml(m.name)}</strong><span>${escapeHtml(m.email)}</span></div>`).join(''):'<span class="admin-meta">No reservations yet.</span>'}</div></section>`).join('');
}
function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[ch]))}

const memberView=document.getElementById('memberView'),adminView=document.getElementById('adminView'),adminToggle=document.getElementById('adminToggle');
adminToggle.onclick=async()=>{const showAdmin=adminView.classList.contains('hidden');memberView.classList.toggle('hidden',showAdmin);adminView.classList.toggle('hidden',!showAdmin);adminToggle.textContent=showAdmin?'Member View':'Admin View';if(showAdmin){await loadClasses();await loadAdmin();}};
document.getElementById('refreshAdmin').onclick=async()=>{await loadClasses();await loadAdmin()};

const themeBtn=document.getElementById('themeBtn');function setTheme(t){document.body.classList.toggle('light',t==='light');themeBtn.textContent=t==='light'?'🌙 Dark':'☀️ Light';localStorage.setItem('apex-theme',t)}setTheme(localStorage.getItem('apex-theme')||'dark');themeBtn.onclick=()=>setTheme(document.body.classList.contains('light')?'dark':'light');
loadClasses();
