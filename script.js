// ---------- Mock facility data (replace with real DB/API) ----------
  const mockFacilities = [
    { id: 'PHC001', name: 'Lagos Central PHC', lat: 6.5244, lng: 3.3792 },
    { id: 'PHC002', name: 'Kano West PHC', lat: 11.999, lng: 8.5167 },
    { id: 'PHC003', name: 'Abuja North PHC', lat: 9.0578, lng: 7.4951 },
    { id: 'PHC004', name: 'Ibadan East PHC', lat: 7.3775, lng: 3.9470 },
    { id: 'PHC005', name: 'Port Harcourt PHC', lat: 4.8156, lng: 7.0498 }
  ];

  // ---------- Utility: Haversine distance ----------
  function toRad(v){return v*Math.PI/180;}
  function distanceKm(lat1, lon1, lat2, lon2){
    const R = 6371; // km
    const dLat = toRad(lat2-lat1);
    const dLon = toRad(lon2-lon1);
    const a = Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)*Math.sin(dLon/2);
    const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R*c;
  }

  // ---------- Role selection ----------
  const roleBtns = document.querySelectorAll('[data-role]');
  const loginCard = document.getElementById('loginCard');
  const appArea = document.getElementById('appArea');
  const patientPanel = document.getElementById('patientPanel');
  const adminPanel = document.getElementById('adminPanel');

  roleBtns.forEach(btn=>{
    btn.addEventListener('click', ()=> {
      roleBtns.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const role = btn.getAttribute('data-role');
      loginCard.style.display = 'none';
      appArea.style.display = 'block';
      if(role === 'patient'){
        patientPanel.style.display='block';
        adminPanel.style.display='none';
      } else {
        patientPanel.style.display='none';
        adminPanel.style.display='grid';
        loadNotificationsToAdmin();
      }
    });
  });

  // ---------- Patient: geolocation and manual coords ----------
  const useGeoBtn = document.getElementById('useGeo');
  const manualBtn = document.getElementById('manualCoordsBtn');
  const manualCoordsWrapper = document.getElementById('manualCoords');
  const findManualBtn = document.getElementById('findManual');
  const patientResult = document.getElementById('patientResult');
  const prefillForm = document.getElementById('prefillForm');
  const confirmVisitBtn = document.getElementById('confirmVisit');
  const cancelVisitBtn = document.getElementById('cancelVisit');

  let selectedFacility = null;
  let patientLoc = null;

  manualBtn.addEventListener('click', ()=> manualCoordsWrapper.style.display = manualCoordsWrapper.style.display === 'none' ? 'block' : 'none');

  useGeoBtn.addEventListener('click', ()=>{
    patientResult.innerHTML = 'Locating...';
    if(!navigator.geolocation){
      patientResult.innerHTML = '<small class="muted">Geolocation not supported. Enter coords manually.</small>';
      return;
    }
    navigator.geolocation.getCurrentPosition(pos=>{
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      patientLoc = {lat, lng};
      findNearestAndShow(lat,lng);
    }, err=>{
      patientResult.innerHTML = `<small class="muted">Location denied or unavailable. (${err.message})</small>`;
    }, {timeout:10000});
  });

  findManualBtn.addEventListener('click', ()=>{
    const lat = parseFloat(document.getElementById('lat').value);
    const lng = parseFloat(document.getElementById('lng').value);
    if(isNaN(lat) || isNaN(lng)){ patientResult.innerHTML = '<small class="muted">Please enter valid coordinates.</small>'; return; }
    patientLoc = {lat,lng};
    findNearestAndShow(lat,lng);
  });

  function findNearestAndShow(lat,lng){
    const sorted = mockFacilities.map(f=>{
      return {...f, d: distanceKm(lat,lng,f.lat,f.lng)};
    }).sort((a,b)=>a.d-b.d);
    const nearest = sorted[0];
    selectedFacility = nearest;
    patientResult.innerHTML = `
      <div>
        <strong>Nearest facility:</strong> ${nearest.name} <br>
        <small class="muted">Distance: ${nearest.d.toFixed(2)} km</small>
        <div style="height:10px"></div>
        <button id="chooseFacility" class="btn-primary">Choose this facility</button>
      </div>
    `;
    document.getElementById('chooseFacility').addEventListener('click', ()=>{
      prefillForm.style.display='block';
    });
  }

  cancelVisitBtn.addEventListener('click', ()=> {
    prefillForm.style.display='none';
    patientResult.innerHTML = '';
    selectedFacility = null;
  });

  confirmVisitBtn.addEventListener('click', ()=>{
    const text = document.getElementById('prediagnosis').value.trim();
    if(!selectedFacility){ alert('No facility selected'); return; }
    const notification = {
      id: 'notif_'+Date.now(),
      facility: selectedFacility.name,
      facilityId: selectedFacility.id,
      patientLocation: patientLoc,
      prediagnosis: text || 'Not provided',
      timestamp: new Date().toISOString()
    };
    // Save to localStorage (simulates sending to backend)
    pushNotification(notification);
    // Optionally: send to backend via fetch() here
    // sendNotificationToBackend(notification);
    prefillForm.style.display='none';
    patientResult.innerHTML = '<div class="notification">Request sent to facility. Admin will be notified.</div>';
    document.getElementById('prediagnosis').value = '';
  });

  // ---------- Notifications (localStorage) ----------
  const NOTIF_KEY = 'phc_prototype_notifications';
  function pushNotification(n){
    const arr = JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]');
    arr.unshift(n);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(arr));
    // Inform admin UI if present
    loadNotificationsToAdmin();
  }
  function loadNotificationsToAdmin(){
    const list = JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]');
    const el = document.getElementById('notificationsList');
    if(!el) return;
    if(list.length === 0) { el.innerHTML = '<small class="muted">No notifications yet</small>'; return; }
    el.innerHTML = '';
    list.forEach(n=>{
      const wrapper = document.createElement('div');
      wrapper.style.padding = '8px 0';
      wrapper.style.borderBottom = '1px solid #f3f4f6';
      wrapper.innerHTML = `<strong>${n.facility}</strong> — ${n.prediagnosis}<br><small class="muted">${new Date(n.timestamp).toLocaleString()}</small>`;
      el.appendChild(wrapper);
    });
    // Update small dashboard counts
    document.getElementById('patientsToday').innerText = list.length*2 + 100; // mock computation
    document.getElementById('stockAlerts').innerText = Math.min(9, Math.floor(list.length/1) + 2);
    document.getElementById('activePhcs').innerText = mockFacilities.length;
  }

  document.getElementById('clearNotifications').addEventListener('click', ()=>{
    if(!confirm('Clear all notifications?')) return;
    localStorage.removeItem(NOTIF_KEY);
    loadNotificationsToAdmin();
  });

  // ---------- Admin: prompt -> generate 5 related visuals (mock AI) ----------
  const promptInput = document.getElementById('promptInput');
  const promptBtn = document.getElementById('promptBtn');
  const thumbsContainer = document.getElementById('visualThumbs');
  const statusMsg = document.getElementById('statusMsg');

  promptBtn.addEventListener('click', ()=> runPrompt(promptInput.value.trim()));
  promptInput.addEventListener('keydown', (e)=> { if(e.key === 'Enter') runPrompt(promptInput.value.trim()); });

  // mainChart setup
  const mainCtx = document.getElementById('mainChart').getContext('2d');
  let mainChart = new Chart(mainCtx, {
    type: 'bar',
    data: { labels: ['A','B','C','D'], datasets:[{label:'Value',data:[10,20,30,40],backgroundColor: '#0f1724'}] },
    options: { responsive:true, maintainAspectRatio:false, scales:{y:{beginAtZero:true}} }
  });

  // When clicking a thumbnail, update main chart
  function renderThumbnailList(things){
    thumbsContainer.innerHTML = '';
    things.forEach((t, idx)=>{
      const d = document.createElement('div');
      d.className = 'thumb';
      d.innerHTML = `<small style="font-weight:600">${t.title}</small><small style="margin-top:6px" class="muted">${t.subtitle}</small>`;
      d.addEventListener('click', ()=> {
        updateMainChart(t);
        statusMsg.innerText = `Showing: ${t.title}`;
      });
      thumbsContainer.appendChild(d);
    });
    // auto-select first
    if(things.length>0) {
      updateMainChart(things[0]);
      statusMsg.innerText = `Showing: ${things[0].title}`;
    }
  }

  function updateMainChart(t){
    // t = { type, labels, values, title }
    const allowedTypes = ['bar','line','pie'];
    const typ = allowedTypes.includes(t.type) ? t.type : 'bar';
    mainChart.destroy();
    mainChart = new Chart(mainCtx, {
      type: typ,
      data: {
        labels: t.labels,
        datasets: [{
          label: t.title,
          data: t.values,
          backgroundColor: t.background || '#0f1724',
          borderColor: t.border || '#0f1724',
          fill: false
        }]
      },
      options: { responsive:true, maintainAspectRatio:false, scales: { y:{ beginAtZero:true}} }
    });
  }

  // Mock function that maps prompt -> 5 visuals (you'd replace this by calling your AI)
  function generateVisualsFromPrompt(prompt){
    // Simple keyword mapping; you can expand with NLP or call backend AI later
    prompt = (prompt || '').toLowerCase();
    const visuals = [];

    // helper to create mock time series
    function series(name, base){
      const labels = ['Week -6','Week -5','Week -4','Week -3','Week -2','Last Week','This Week'];
      const values = labels.map((_,i)=> Math.max(0, Math.round(base + (Math.sin(i/2)*5 + Math.random()*8))));
      return { title: name, type: 'line', labels, values, subtitle: `Trend for ${name}` };
    }

    if(prompt.includes('malaria')) {
      visuals.push(series('Malaria cases (region)', 45));
      visuals.push(series('Malaria admissions (PHC top5)', 30));
      visuals.push(series('Malaria drug stock (days left)', 12).type='bar' || {});
      visuals.push(series('Seasonal malaria index', 20));
      visuals.push(series('Malaria referrals to hospitals', 8));
    } else if(prompt.includes('ncd') || prompt.includes('non-communicable') || prompt.includes('hypertension')){
      visuals.push(series('Hypertension trend', 60));
      visuals.push(series('Diabetes visits', 18));
      visuals.push(series('NCD medication stock', 10));
      visuals.push(series('NCD referrals', 6));
      visuals.push(series('Age-group NCD burden', 40));
    } else if(prompt.includes('stock') || prompt.includes('medicine')){
      visuals.push(series('Drug stock levels (top meds)', 20));
      visuals.push(series('Stock-out events (30d)', 5));
      visuals.push(series('Days to resupply (median)', 7));
      visuals.push(series('Stock per facility (top5)', 11));
      visuals.push(series('Procurement lead-time', 14));
    } else if(prompt.includes('facility') || prompt.includes('performance')){
      visuals.push(series('Facility visits (top5)', 90));
      visuals.push(series('Avg wait time (mins)', 45));
      visuals.push(series('Staffed vs unstaffed shifts', 12));
      visuals.push(series('Referral rate', 8));
      visuals.push(series('Patient satisfaction index', 70));
    } else {
      // default wide set of visuals when prompt unclear
      visuals.push(series('All-cause consultations', 120));
      visuals.push(series('Top 5 diseases', 80));
      visuals.push(series('Weekly visits', 100));
      visuals.push(series('Stock-out alerts', 6));
      visuals.push(series('Referral volume', 12));
    }

    // ensure each entry has fields type, labels, values, title, subtitle
    return visuals.map(v=>{
      if(!v.type) v.type = 'line';
      if(!v.labels) v.labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      if(!v.values) v.values = v.labels.map(()=> Math.round(Math.random()*100));
      if(!v.title) v.title = 'Visual';
      if(!v.subtitle) v.subtitle = 'Auto-generated';
      return v;
    });
  }

  async function runPrompt(prompt){
    if(!prompt){ alert('Please enter a prompt (e.g. "malaria this season").'); return; }
    statusMsg.innerText = 'Generating visuals...';
    // simulate API latency
    await new Promise(r=>setTimeout(r, 500));
    // Replace with: const visuals = await fetch('/api/visuals',{method:'POST',body:JSON.stringify({prompt})}).then(r=>r.json())
    const visuals = generateVisualsFromPrompt(prompt);
    renderThumbnailList(visuals);
    statusMsg.innerText = 'Visuals generated';
  }

  // ---------- Mock "Load mock data" button ----------
  document.getElementById('loadMockData').addEventListener('click', ()=>{
    // generate some seed notifications for demo
    const seed = [
      {id:'n1', facility:'Lagos Central PHC', prediagnosis:'Fever and cough', timestamp: new Date().toISOString()},
      {id:'n2', facility:'Ibadan East PHC', prediagnosis:'Severe headache', timestamp: new Date().toISOString()}
    ];
    localStorage.setItem(NOTIF_KEY, JSON.stringify(seed));
    loadNotificationsToAdmin();
    alert('Mock data loaded. Check Incoming Patient Notifications.');
  });

  // ---------- Demonstration helper: initial default state  ----------
  // Show default visuals so admin UI isn't empty if used immediately
  const defaultVisuals = generateVisualsFromPrompt('default');
  renderThumbnailList(defaultVisuals);
  loadNotificationsToAdmin();

  // ---------- Hook points to replace with real backend  ----------
  async function sendNotificationToBackend(notification){
    // Example:
    // await fetch('/api/notify', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(notification) });
    // For now we use localStorage as mock
    pushNotification(notification);
  }
