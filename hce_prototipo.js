/* hce_prototipo.js - versión modular con comentarios */
/* UTIL / DATOS INICIALES */
const STORAGE_KEYS = {patients:'hce_patients_v1', appointments:'hce_apps_v1', audit:'hce_audit_v1', users:'hce_users_v1', demo:'hce_demo_v1'};
let patients = JSON.parse(localStorage.getItem(STORAGE_KEYS.patients)) || [];
let appointments = JSON.parse(localStorage.getItem(STORAGE_KEYS.appointments)) || [];
let audit = JSON.parse(localStorage.getItem(STORAGE_KEYS.audit)) || [];
let users = JSON.parse(localStorage.getItem(STORAGE_KEYS.users)) || [
  { username:'admin', password:'admin123', name:'Dr. Admin', profile:'admin' },
  { username:'doctor', password:'doctor123', name:'Dra. Ana', profile:'doctor' },
  { username:'user', password:'user123', name:'Técnico', profile:'user' }
];
let currentUser = null;
let selectedPatient = null;
let signatureDataURL = null;

/* DATOS DE EJEMPLO (solo la primera vez) */
if(!localStorage.getItem(STORAGE_KEYS.demo)){
  patients = [
    {id:Date.now()+1, name:'María González', doc:'80012345', dob:'1978-05-12', phone:'555-1234', email:'maria@example.com', address:'Calle 123', medicalHistory:[], userId:'admin'},
    {id:Date.now()+2, name:'Juan Pérez', doc:'90056789', dob:'1985-03-25', phone:'555-5678', email:'juan@example.com', address:'Avenida 45', medicalHistory:[], userId:'doctor'}
  ];
  appointments = [
    {id:Date.now()+11, patientId:patients[0].id, date: new Date().toISOString().split('T')[0], time:'09:30', type:'Consulta', reason:'Dolor de cabeza', doctor:'Dr. Admin', status:'Programada', userId:'admin'}
  ];
  audit = [];
  localStorage.setItem(STORAGE_KEYS.patients, JSON.stringify(patients));
  localStorage.setItem(STORAGE_KEYS.appointments, JSON.stringify(appointments));
  localStorage.setItem(STORAGE_KEYS.audit, JSON.stringify(audit));
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
  localStorage.setItem(STORAGE_KEYS.demo, '1');
}

/* HELPERS */
function saveAll(){ localStorage.setItem(STORAGE_KEYS.patients, JSON.stringify(patients)); localStorage.setItem(STORAGE_KEYS.appointments, JSON.stringify(appointments)); localStorage.setItem(STORAGE_KEYS.audit, JSON.stringify(audit)); localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users)); }
function addAudit(action, detail=''){ audit.unshift({ts:new Date().toISOString(), user: currentUser?currentUser.username:'anon', action, detail}); saveAll(); renderAudit(); }
function showWelcome(name){ const bar = document.getElementById('welcomeBar'); const now = new Date(); const pad = n=>n.toString().padStart(2,'0'); const txt = `${name} — ${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`; bar.textContent = `Bienvenido, ${txt}`; bar.classList.add('show'); bar.style.display='flex'; setTimeout(()=>{ bar.classList.remove('show'); setTimeout(()=>bar.style.display='none',350); }, 3000); }
function showToast(msg){ alert(msg); }

/* LOGIN Y USUARIOS */
function handleLogin(){
  const u = document.getElementById('loginUsername').value.trim();
  const p = document.getElementById('loginPassword').value.trim();
  const found = users.find(x=>x.username===u && x.password===p);
  if(found){
    currentUser = found;
    document.getElementById('loginError').style.display='none';
    document.getElementById('loginScreen').style.display='none';
    document.getElementById('appContainer').style.display='block';
    document.getElementById('currentUser').textContent = `${found.name} (${found.profile})`;
    if(found.profile==='admin') document.getElementById('btnAddUser').style.display='inline-block';
    addAudit('login', `user:${found.username}`);
    showWelcome(found.name);
    renderPatients();
    localStorage.setItem('hce_current_user', JSON.stringify(currentUser));
  } else {
    document.getElementById('loginError').style.display='block';
  }
}
function logoutConfirm(){ if(confirm('Cerrar sesión?')){ localStorage.removeItem('hce_current_user'); location.reload(); } }
function openUserModal(){ document.getElementById('userModal').style.display='flex'; }
function closeUserModal(){ document.getElementById('userModal').style.display='none'; }
function saveNewUser(){
  const name = document.getElementById('newName').value.trim();
  const profile = document.getElementById('newProfile').value;
  const username = document.getElementById('newUsername').value.trim();
  const password = document.getElementById('newPassword').value.trim();
  if(!name || !username || !password){ alert('Nombre, usuario y contraseña son obligatorios'); return; }
  if(users.some(u=>u.username===username)){ alert('El usuario ya existe'); return; }
  users.push({username,password,name,profile});
  saveAll();
  closeUserModal();
  alert('Usuario agregado');
  addAudit('create_user', username);
}

/* RENDER PACIENTES */
function renderPatients(){
  const list = document.getElementById('patientList'); list.innerHTML='';
  const q = document.getElementById('searchInput').value.toLowerCase();
  const q2 = document.getElementById('advancedSearch').value.toLowerCase();
  const userPatients = patients.filter(p=> p.userId===currentUser.username || currentUser.profile==='admin' || p.userId===undefined);
  const filtered = userPatients.filter(p=>{
    if(q && !(p.name.toLowerCase().includes(q) || (p.phone||'').includes(q))) return false;
    if(q2){
      if((p.name+' '+(p.email||'')+' '+(p.address||'')).toLowerCase().includes(q2)) return true;
      for(let h of (p.medicalHistory||[])){
        if((h.diagnosis+' '+(h.notes||'')+' '+(h.treatment||'')).toLowerCase().includes(q2)) return true;
      }
      return false;
    }
    return true;
  });
  if(filtered.length===0){ list.innerHTML='<div class="small" style="padding:20px;color:var(--muted)">No hay pacientes</div>'; return; }
  filtered.forEach(p=>{
    const div = document.createElement('div'); div.className='patient-item'+(selectedPatient && selectedPatient.id===p.id ? ' selected':'');
    div.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div><strong>${p.name}</strong><div class="small">${p.phone||''} · ${p.email||''}</div></div><div><button class="btn" onclick="editPatient(event,${p.id})">✎</button></div></div>`;
    div.onclick = ()=>selectPatient(p);
    list.appendChild(div);
  });
}

/* SELECCIONAR PACIENTE */
function selectPatient(p){
  selectedPatient = p;
  document.getElementById('noSelection').style.display='none';
  document.getElementById('patientDetails').style.display='block';
  document.getElementById('patientTitle').textContent = p.name;
  document.getElementById('pd_name').textContent = p.name;
  document.getElementById('pd_doc').textContent = p.doc||'';
  document.getElementById('pd_dob').textContent = p.dob||'';
  document.getElementById('pd_phone').textContent = p.phone||'';
  document.getElementById('pd_email').textContent = p.email||'';
  document.getElementById('pd_address').textContent = p.address||'';
  document.getElementById('pd_extra').textContent = 'Registrado por: '+(p.userId||'');
  renderHistory();
  renderAppointments();
  renderAudit();
  renderPatients();
  activateTab('details');
}

/* MODALES */
function openModal(type){
  const modal = document.getElementById('modal'); modal.style.display='flex';
  document.getElementById('modalTitle').textContent = ({patientAdd:'Nuevo Paciente',patientEdit:'Editar Paciente',history:'Nuevo Registro Médico',appointment:'Nueva Cita'})[type] || 'Modal';
  const body = document.getElementById('modalBody'); body.innerHTML='';
  document.getElementById('modalSaveBtn').onclick = modalSave;
  if(type==='patientAdd' || type==='patientEdit'){
    const p = type==='patientEdit' && selectedPatient ? selectedPatient : {name:'',doc:'',dob:'',phone:'',email:'',address:''};
    body.innerHTML = `
      <div class="row"><div class="col"><label class="label">Nombre</label><input id="m_name" class="input" value="${p.name||''}"></div><div class="col"><label class="label">Documento</label><input id="m_doc" class="input" value="${p.doc||''}"></div></div>
      <div class="row"><div class="col"><label class="label">Fecha Nac.</label><input id="m_dob" type="date" class="input" value="${p.dob||''}"></div><div class="col"><label class="label">Teléfono</label><input id="m_phone" class="input" value="${p.phone||''}"></div></div>
      <div class="field"><label class="label">Email</label><input id="m_email" class="input" value="${p.email||''}"></div>
      <div class="field"><label class="label">Dirección</label><input id="m_address" class="input" value="${p.address||''}"></div>
    `;
    document.getElementById('modalSaveBtn').onclick = ()=>{ if(type==='patientAdd') saveNewPatient(); else saveEditPatient(); };
  } else if(type==='history'){
    if(!selectedPatient){ alert('Seleccione un paciente'); closeModal(); return; }
    body.innerHTML = `
      <div class="field"><label class="label">Diagnóstico</label><input id="m_diagnosis" class="input"></div>
      <div class="field"><label class="label">Tratamiento</label><textarea id="m_treatment" class="input textarea"></textarea></div>
      <div class="field"><label class="label">Notas</label><textarea id="m_notes" class="input textarea"></textarea></div>
      <div class="row"><div class="col"><label class="label">Presión</label><input id="m_pressure" class="input"></div><div class="col"><label class="label">Temperatura</label><input id="m_temp" class="input"></div></div>
      <div style="margin-top:8px"><label class="label">Firma (dibuje abajo)</label><canvas id="signCanvas" class="canvas-sign"></canvas><div style="display:flex;gap:8px;margin-top:8px"><button class="btn" onclick="clearSignature()">Limpiar</button></div></div>
    `;
    initSignature();
    document.getElementById('modalSaveBtn').onclick = saveNewHistory;
  } else if(type==='appointment'){
    if(!selectedPatient){ alert('Seleccione un paciente'); closeModal(); return; }
    const now=new Date(); const today=now.toISOString().split('T')[0];
    body.innerHTML = `
      <div class="row"><div class="col"><label class="label">Fecha</label><input id="m_app_date" type="date" class="input" value="${today}"></div><div class="col"><label class="label">Hora</label><input id="m_app_time" type="time" class="input" value="09:00"></div></div>
      <div class="field"><label class="label">Tipo</label><select id="m_app_type" class="input"><option>Consulta</option><option>Seguimiento</option><option>Emergencia</option><option>Control</option></select></div>
      <div class="field"><label class="label">Motivo</label><input id="m_app_reason" class="input"></div>
    `;
    document.getElementById('modalSaveBtn').onclick = saveNewAppointment;
  }
}
function closeModal(){ document.getElementById('modal').style.display='none'; document.getElementById('modalBody').innerHTML=''; }
function modalSave(){ /* placeholder */ }

/* PACIENTES CRUD */
function saveNewPatient(){
  const name = document.getElementById('m_name').value.trim(); if(!name){ alert('Nombre obligatorio'); return; }
  const newP = {id:Date.now(), name, doc:document.getElementById('m_doc').value, dob:document.getElementById('m_dob').value, phone:document.getElementById('m_phone').value, email:document.getElementById('m_email').value, address:document.getElementById('m_address').value, medicalHistory:[], userId: currentUser.username};
  patients.push(newP); saveAll(); addAudit('create_patient', name); closeModal(); renderPatients(); selectPatient(newP); alert('Paciente creado');
}
function editPatient(event,id){ event.stopPropagation(); const p = patients.find(x=>x.id===id); if(!p) return; selectedPatient = p; openModal('patientEdit'); }
function saveEditPatient(){ if(!selectedPatient) return; selectedPatient.name = document.getElementById('m_name').value; selectedPatient.doc = document.getElementById('m_doc').value; selectedPatient.dob = document.getElementById('m_dob').value; selectedPatient.phone = document.getElementById('m_phone').value; selectedPatient.email = document.getElementById('m_email').value; selectedPatient.address = document.getElementById('m_address').value; saveAll(); addAudit('edit_patient', selectedPatient.name); closeModal(); renderPatients(); selectPatient(selectedPatient); alert('Paciente actualizado'); }
function deletePatient(id){ if(!confirm('Eliminar paciente?')) return; patients = patients.filter(p=>p.id!==id); saveAll(); addAudit('delete_patient', id); alert('Paciente eliminado'); selectedPatient=null; document.getElementById('patientDetails').style.display='none'; document.getElementById('noSelection').style.display='block'; renderPatients(); }

/* HISTORIAL y FIRMA */
function initSignature(){
  const canvas = document.getElementById('signCanvas'); if(!canvas) return;
  const ctx = canvas.getContext('2d'); let drawing=false;
  function resize(){ const ratio=window.devicePixelRatio||1; const w=canvas.clientWidth; const h=canvas.clientHeight; canvas.width = w*ratio; canvas.height = h*ratio; canvas.style.width = w+'px'; canvas.style.height = h+'px'; ctx.scale(ratio,ratio); ctx.lineJoin='round'; ctx.lineCap='round'; ctx.strokeStyle='#111827'; ctx.lineWidth=2; }
  resize(); window.addEventListener('resize', resize);
  function pointerDown(e){ drawing=true; ctx.beginPath(); const r=canvas.getBoundingClientRect(); const x=(e.touches?e.touches[0].clientX:e.clientX)-r.left; const y=(e.touches?e.touches[0].clientY:e.clientY)-r.top; ctx.moveTo(x,y); e.preventDefault(); }
  function pointerMove(e){ if(!drawing) return; const r=canvas.getBoundingClientRect(); const x=(e.touches?e.touches[0].clientX:e.clientX)-r.left; const y=(e.touches?e.touches[0].clientY:e.clientY)-r.top; ctx.lineTo(x,y); ctx.stroke(); }
  function pointerUp(){ drawing=false; signatureDataURL = canvas.toDataURL(); }
  canvas.addEventListener('mousedown', pointerDown); canvas.addEventListener('mousemove', pointerMove); window.addEventListener('mouseup', pointerUp);
  canvas.addEventListener('touchstart', pointerDown); canvas.addEventListener('touchmove', pointerMove); window.addEventListener('touchend', pointerUp);
  window.clearSignature = function(){ ctx.clearRect(0,0,canvas.width,canvas.height); signatureDataURL = null; }
  window.getSignatureData = function(){ return signatureDataURL || canvas.toDataURL(); }
}

function saveNewHistory(){
  if(!selectedPatient){ alert('Seleccione un paciente'); return; }
  const diagnosis = document.getElementById('m_diagnosis').value.trim();
  const treatment = document.getElementById('m_treatment').value.trim();
  if(!diagnosis || !treatment){ alert('Diagnóstico y tratamiento obligatorios'); return; }
  const notes = document.getElementById('m_notes').value;
  const vs = {pressure:document.getElementById('m_pressure').value, temperature:document.getElementById('m_temp').value};
  const sign = getSignatureData();
  const rec = {id:Date.now(), date:new Date().toISOString().split('T')[0], doctor:currentUser.name, diagnosis, treatment, notes, vitalSigns:vs, signature:sign, userId:currentUser.username};
  selectedPatient.medicalHistory = selectedPatient.medicalHistory || [];
  selectedPatient.medicalHistory.unshift(rec);
  saveAll(); addAudit('create_history', `patient:${selectedPatient.id} hist:${rec.id}`);
  closeModal(); renderHistory(); selectPatient(selectedPatient); alert('Registro médico guardado');
}

function renderHistory(){
  const container = document.getElementById('medicalHistory'); container.innerHTML='';
  if(!selectedPatient) return;
  const list = selectedPatient.medicalHistory || [];
  if(list.length===0){ container.innerHTML='<div class="small" style="padding:12px;color:var(--muted)">No hay registros</div>'; return; }
  list.forEach(r=>{
    const d=document.createElement('div'); d.className='history-record';
    d.innerHTML = `<div style="display:flex;justify-content:space-between"><div><strong>${r.diagnosis}</strong><div class="small">${r.doctor} · ${r.date}</div></div><div><button class="btn" onclick="deleteHistory(${selectedPatient.id},${r.id})">Eliminar</button></div></div><div style="margin-top:8px">${r.treatment}</div>${r.notes?`<div style="margin-top:8px" class="small">Notas: ${r.notes}</div>`:''}${r.signature?`<div style="margin-top:8px"><img src="${r.signature}" style="max-width:200px;border:1px solid #e6eef8;border-radius:6px"></div>`:''}<div class="audit">Creado por ${r.userId} · ${r.date}</div>`;
    container.appendChild(d);
  });
}

function deleteHistory(pid,hid){ if(!confirm('Eliminar registro?')) return; const p = patients.find(x=>x.id===pid); if(!p) return; p.medicalHistory = p.medicalHistory.filter(h=>h.id!==hid); saveAll(); addAudit('delete_history', `patient:${pid} hist:${hid}`); alert('Registro eliminado'); renderHistory(); selectPatient(p); }

/* CITAS */
function saveNewAppointment(){
  if(!selectedPatient){ alert('Seleccione un paciente'); return; }
  const date = document.getElementById('m_app_date').value;
  const time = document.getElementById('m_app_time').value;
  const type = document.getElementById('m_app_type').value;
  const reason = document.getElementById('m_app_reason').value.trim();
  if(!date || !time || !reason){ alert('Complete fecha,hora y motivo'); return; }
  const ap = {id:Date.now(), patientId:selectedPatient.id, date, time, type, reason, doctor:currentUser.name, status:'Programada', userId:currentUser.username};
  appointments.push(ap); saveAll(); addAudit('create_appointment', `patient:${selectedPatient.id} app:${ap.id}`); closeModal(); renderAppointments(); alert('Cita creada');
}

function renderAppointments(){
  const list = document.getElementById('appointmentsList'); list.innerHTML='';
  if(!selectedPatient){ list.innerHTML='Seleccione paciente'; return; }
  const from = document.getElementById('filterDateFrom').value;
  const to = document.getElementById('filterDateTo').value;
  const typeFilter = document.getElementById('filterAppointmentType').value;
  const userApps = appointments.filter(a=>a.patientId===selectedPatient.id && (a.userId===currentUser.username || currentUser.profile==='admin'));
  let filtered = userApps.filter(a=>{
    if(typeFilter && a.type!==typeFilter) return false;
    if(from && a.date<from) return false;
    if(to && a.date>to) return false;
    return true;
  });
  if(filtered.length===0){ list.innerHTML='<div class="small" style="padding:12px;color:var(--muted)">No hay citas</div>'; return; }
  filtered.forEach(a=>{
    const div=document.createElement('div'); div.className='history-record';
    div.innerHTML = `<div style="display:flex;justify-content:space-between"><div><strong>${a.type}</strong><div class="small">${a.date} ${a.time} · ${a.reason}</div></div><div><button class="btn btn-danger" onclick="deleteAppointment(${a.id})">Cancelar</button></div></div><div class="small" style="margin-top:8px">Doctor: ${a.doctor}</div>`;
    list.appendChild(div);
  });
}

function deleteAppointment(id){ if(!confirm('Cancelar cita?')) return; appointments = appointments.filter(a=>a.id!==id); saveAll(); addAudit('delete_appointment', id); alert('Cita cancelada'); renderAppointments(); }

/* AUDITORÍA */
function renderAudit(){ const c=document.getElementById('auditLog'); if(!c) return; c.innerHTML=''; audit.forEach(a=>{ const d=document.createElement('div'); d.className='small'; d.style.borderBottom='1px solid #f1f5f9'; d.style.padding='8px 0'; d.innerHTML=`<div><strong>${a.action}</strong> · ${a.user} · <span class="small">${a.ts}</span></div><div class="small">${a.detail||''}</div>`; c.appendChild(d); }); }

/* EXPORT/IMPORT/RESET */
function exportData(){ const blob = new Blob([JSON.stringify({patients,appointments,audit,users},null,2)],{type:'application/json'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='hce_export.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); alert('Exportado'); }
function importData(e){ const file = e.target.files[0]; if(!file) return; const reader = new FileReader(); reader.onload = function(ev){ try{ const data = JSON.parse(ev.target.result); if(data.patients && data.appointments){ patients = data.patients; appointments = data.appointments; audit = data.audit||[]; users = data.users||users; saveAll(); renderPatients(); alert('Importado'); } else alert('JSON inválido'); }catch(err){ alert('Error al leer archivo'); } }; reader.readAsText(file); e.target.value=''; }
function resetSystem(){ if(!confirm('Reiniciar sistema y borrar datos locales?')) return; localStorage.clear(); location.reload(); }

/* PDF (simple) */
function exportPatientPDF(){
  if(!selectedPatient){ alert('Seleccione paciente'); return; }
  let html = `<html><head><meta charset="utf-8"><title>PDF - ${selectedPatient.name}</title></head><body>`;
  html += `<h1>Historia Clínica - ${selectedPatient.name}</h1><p>Documento: ${selectedPatient.doc||''}</p><p>Teléfono: ${selectedPatient.phone||''}</p><hr>`;
  html += `<h3>Historial</h3>`;
  (selectedPatient.medicalHistory||[]).forEach(r=>{
    html += `<h4>${r.diagnosis} - ${r.date}</h4><p>${r.treatment}</p>`;
    if(r.notes) html += `<p>Notas: ${r.notes}</p>`;
    if(r.signature) html += `<div><img src="${r.signature}" style="max-width:300px;border:1px solid #e6eef8;border-radius:6px"></div>`;
    html += `<hr>`;
  });
  html += `</body></html>`;
  const w = window.open('','_blank'); w.document.write(html); w.document.close(); w.print();
}

/* TABS */
function switchTab(e){ const t = e.currentTarget.getAttribute('data-tab'); activateTab(t); }
function activateTab(t){ document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active')); document.querySelectorAll('.tabContent').forEach(x=>x.style.display='none'); const el = document.querySelector(`[data-tab="${t}"]`); if(el) el.classList.add('active'); const tabId = 'tab'+t.charAt(0).toUpperCase()+t.slice(1); const content = document.getElementById(tabId); if(content) content.style.display='block'; if(t==='history') renderHistory(); if(t==='appointments') renderAppointments(); if(t==='audit') renderAudit(); }

/* INICIALIZACIÓN */
window.onload = ()=>{
  const savedUser = localStorage.getItem('hce_current_user');
  if(savedUser){
    currentUser = JSON.parse(savedUser);
    document.getElementById('loginScreen').style.display='none';
    document.getElementById('appContainer').style.display='block';
    document.getElementById('currentUser').textContent = `${currentUser.name} (${currentUser.profile})`;
    if(currentUser.profile==='admin') document.getElementById('btnAddUser').style.display='inline-block';
    showWelcome(currentUser.name);
    renderPatients();
    return;
  }
  document.getElementById('loginScreen').style.display='flex';
};

 /*********************************************************************************************************/
  