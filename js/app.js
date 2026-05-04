/* ============================================================
   JAVASCRIPT — Pomodoro Timer
   Seções:
     1. Constantes
     2. Estado persistente (db, tags)
     3. Estado da sessão atual
     4. Utilitários de data
     5. Tópico do dia
     6. Feedback visual (toast, flashSaved, tabTitle)
     7. Áudio
     8. Controle do timer
     9. Tags
    10. Sessões (salvar, deletar, semana)
    11. Renderização do anel
    12. renderTimer()
    13. renderStats()
    14. renderHistory()
    15. Navegação por abas
    16. Inicialização
============================================================ */

/* ── 1. Constantes ── */
const SK       = 'pomodoro_v3';
const TOPIC_SK = 'pomodoro_topic_' + new Date().toISOString().slice(0,10);
const TAGS_SK  = 'pomodoro_tags_v1';
const DURS     = [5,10,15,30,60];
const MODES    = [{id:'focus',label:'Foco',color:'#C0392B'},{id:'short',label:'Pausa',color:'#3B6D11'}];
const DEFAULT_TAGS = ['Cálculo','Escrita','Redação','Programação','Leitura','Inglês','Física','Revisão','Projeto'];
const WDAYS    = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

/* ── 2. Estado persistente ── */
let db = (() => { try { const r=localStorage.getItem(SK); if(r) return JSON.parse(r); } catch(e){} return {sessions:[],nextId:1}; })();
const saveDB = () => { try { localStorage.setItem(SK, JSON.stringify(db)); } catch(e){} };

let customTags = (() => { try { const r=localStorage.getItem(TAGS_SK); if(r) return JSON.parse(r); } catch(e){} return [...DEFAULT_TAGS]; })();
function saveTags(){ try { localStorage.setItem(TAGS_SK, JSON.stringify(customTags)); } catch(e){} }

/* ── 3. Estado da sessão atual ── */
let state = {
  mode:'focus', dur:25, secs:25*60, total:25*60,
  running:false, tag:'', page:'timer', weekOffset:0,
  sessionCount: db.sessions.filter(s=>s.date===today()&&s.mode==='focus').length
};
let iv=null, toastTimer=null, openPopup=null, editingTags=false;

/* ── 4. Utilitários de data ── */
function today(){ const d=new Date(); return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()); }
function p2(n){ return String(n).padStart(2,'0'); }
function dateKey(d){ return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate()); }
function getWeekDays(offset){
  const now=new Date(); now.setDate(now.getDate()+(offset||0)*7);
  const day=now.getDay(), days=[];
  for(let i=0;i<7;i++){ const d=new Date(now); d.setDate(now.getDate()-day+i); days.push(d); }
  return days;
}
function sessionsByDate(){
  const map={};
  db.sessions.filter(s=>s.mode==='focus').forEach(s=>{ map[s.date]=(map[s.date]||0)+1; });
  return map;
}

/* ── 5. Tópico do dia ── */
function saveTopic(val){ try { localStorage.setItem(TOPIC_SK, val); } catch(e){} }
function loadTopic(){ try { return localStorage.getItem(TOPIC_SK)||''; } catch(e){ return ''; } }
function saveTopicBtn(){
  const inp=document.getElementById('p-topic-inp');
  if(inp) saveTopic(inp.value);
  showToast('Tópico do dia salvo!');
  flashSaved('p-topic-save-btn');
}

/* ── 6. Feedback visual ── */
function showToast(msg){
  const t=document.getElementById('p-toast');
  if(!t) return;
  t.textContent=msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'),2800);
}
function flashSaved(btnId){
  const btn=document.getElementById(btnId); if(!btn) return;
  btn.textContent='✓ Salvo'; btn.classList.add('saved');
  setTimeout(()=>{ btn.textContent='💾 Salvar'; btn.classList.remove('saved'); },1800);
}
function updateTabTitle(){
  document.title = state.running
    ? '🍅 '+p2(Math.floor(state.secs/60))+':'+p2(state.secs%60)+' - Timer'
    : '🍅 Timer!';
}

/* ── 7. Áudio (beep triplo ao fim da sessão) ── */
function playBeep(){
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    [0,200,400].forEach(d=>{
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value=880; o.type='sine';
      const t=ctx.currentTime+d/1000;
      g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.35,t+0.01); g.gain.exponentialRampToValueAtTime(0.001,t+0.5);
      o.start(t); o.stop(t+0.55);
    });
  }catch(e){}
}

/* ── 8. Controle do timer ── */
function setDuration(v){
  if(state.running){
    state.secs=Math.min(state.secs+v*60,99*60); state.dur=v; state.total=state.secs;
    renderRing(); renderPlayBtn();
    showToast('+'+v+' min adicionados ao timer!');
    document.querySelectorAll('.p-dur').forEach(b=>b.classList.toggle('on',parseInt(b.dataset.dur)===v));
    return;
  }
  state.dur=v; state.secs=v*60; state.total=v*60; renderTimer();
}
function setMode(m){
  state.mode=m; state.running=false; clearInterval(iv);
  const d=m==='focus'?state.dur:5; state.secs=d*60; state.total=d*60;
  updateTabTitle(); renderTimer();
}
function toggleTimer(){
  if(state.secs===0){ state.secs=state.dur*60; state.total=state.dur*60; }
  state.running=!state.running;
  if(state.running){
    iv=setInterval(()=>{
      state.secs--;
      if(state.secs<=0){ state.secs=0; clearInterval(iv); state.running=false; onSessionEnd(); updateTabTitle(); }
      renderRing(); renderPlayBtn(); updateTabTitle();
    },1000);
  } else { clearInterval(iv); }
  updateTabTitle(); renderPlayBtn();
}
function resetTimer(){
  clearInterval(iv); state.running=false;
  state.secs=state.dur*60; state.total=state.dur*60;
  updateTabTitle(); renderTimer();
}
function onSessionEnd(){
  playBeep();
  const tag=state.tag.trim()||'Sessão livre';
  const topic=(document.getElementById('p-topic-inp')?.value||loadTopic()).trim();
  if(state.mode==='focus'){
    db.sessions.push({id:db.nextId++,date:today(),tag,topic:topic||'',duration:state.dur,mode:'focus',ts:Date.now()});
    saveDB(); state.sessionCount++;
    showToast('✓ '+state.dur+' min de foco completos! Boa sessão de "'+tag+'"');
    if('Notification'in window&&Notification.permission==='granted')
      new Notification('🎉 Pomodoro completo!',{body:state.dur+'min de "'+tag+'" concluídos.'});
  } else { showToast('Pausa terminada! Hora de focar.'); }
  renderTimer();
}

/* ── 9. Tags ── */
function setTag(t){
  state.tag=t;
  document.querySelectorAll('.p-chip').forEach(c=>c.classList.toggle('on',c.dataset.tag===t));
  const inp=document.getElementById('p-tag-inp'); if(inp) inp.value=t;
}
function saveTagBtn(){
  const inp=document.getElementById('p-tag-inp'); if(inp) state.tag=inp.value;
  const tag=state.tag.trim()||'Sessão livre';
  const topic=(document.getElementById('p-topic-inp')?.value||loadTopic()).trim();
  db.sessions.push({id:db.nextId++,date:today(),tag,topic:topic||'',duration:state.dur,mode:'focus',ts:Date.now(),manual:true});
  saveDB(); state.sessionCount++;
  showToast('✓ Sessão "'+tag+'" salva nos recentes!');
  flashSaved('p-tag-save-btn'); renderTimer();
}
function addTag(){
  const inp=document.getElementById('p-new-tag-inp'); if(!inp) return;
  const val=inp.value.trim();
  if(!val||customTags.includes(val)){ inp.focus(); return; }
  customTags.push(val); saveTags(); inp.value=''; renderTimer();
}
function removeTag(t){
  customTags=customTags.filter(x=>x!==t); saveTags();
  if(state.tag===t) state.tag=''; renderTimer();
}
function toggleEditTags(){ editingTags=!editingTags; renderTimer(); }

/* ── 10. Sessões / semana ── */
function deleteSession(id){
  db.sessions=db.sessions.filter(s=>s.id!==id); saveDB();
  if(state.page==='history') renderHistory(); else renderTimer();
}
function shiftWeek(delta){ state.weekOffset=(state.weekOffset||0)+delta; renderTimer(); }
function toggleDayPopup(el,key){
  document.querySelectorAll('.p-day-popup').forEach(p=>p.classList.remove('visible'));
  const popup=el.querySelector('.p-day-popup'); if(!popup) return;
  if(openPopup===key){ openPopup=null; return; }
  openPopup=key; popup.classList.add('visible');
}
document.addEventListener('click',function(e){
  if(!e.target.closest('.p-wnum')){
    document.querySelectorAll('.p-day-popup').forEach(p=>p.classList.remove('visible'));
    openPopup=null;
  }
});

/* ── 11. Renderização do anel SVG ── */
function renderRing(){
  const svg=document.getElementById('p-ring-svg'); if(!svg) return;
  const R=90,C=2*Math.PI*R;
  const pct=state.total>0?state.secs/state.total:0;
  const offset=C*(1-pct);
  const mcolor=MODES.find(m=>m.id===state.mode)?.color||'#C0392B';
  let ring=svg.querySelector('.ring-prog');
  if(!ring){
    ring=document.createElementNS('http://www.w3.org/2000/svg','circle');
    ring.setAttribute('class','ring-prog'); ring.setAttribute('cx','110'); ring.setAttribute('cy','110'); ring.setAttribute('r',R);
    svg.appendChild(ring);
  }
  ring.setAttribute('stroke',mcolor); ring.setAttribute('stroke-dasharray',C); ring.setAttribute('stroke-dashoffset',offset);
  const td=document.getElementById('p-time-display');
  if(td){ td.textContent=p2(Math.floor(state.secs/60))+':'+p2(state.secs%60); td.style.color=state.secs===0?mcolor:'var(--ink)'; }
}
function renderPlayBtn(){
  const pb=document.getElementById('p-play-btn'); if(!pb) return;
  pb.textContent=state.running?'⏸':'▶'; pb.classList.toggle('running',state.running);
}

/* ── 12. renderTimer() ── */
function renderTimer(){
  const c=document.getElementById('p-content'); if(!c||state.page!=='timer') return;
  const mcolor=MODES.find(m=>m.id===state.mode)?.color||'#C0392B';
  const R=90,C2=2*Math.PI*R;
  const pct=state.total>0?state.secs/state.total:0;
  const offset=C2*(1-pct);
  const sbd=sessionsByDate();
  const offset0=state.weekOffset||0;
  const weekDays=getWeekDays(offset0);
  const todaySess=db.sessions.filter(s=>s.date===today()&&s.mode==='focus');
  const todayMins=todaySess.reduce((s,x)=>s+x.duration,0);
  const recent=db.sessions.filter(s=>s.mode==='focus').slice(-5).reverse();
  const weekStart=weekDays[0], weekEnd=weekDays[6];
  const weekLabel=weekStart.toLocaleDateString('pt-BR',{day:'numeric',month:'short'})+' – '+weekEnd.toLocaleDateString('pt-BR',{day:'numeric',month:'short',year:'numeric'});

  c.innerHTML=`
<div class="p-main">
  <div class="p-left">
    <div class="p-modes">
      ${MODES.map(m=>`<button class="p-mode${state.mode===m.id?' on '+m.id:''}" onclick="setMode('${m.id}')">${m.label}</button>`).join('')}
    </div>
    <div class="p-ring-wrap">
      <svg id="p-ring-svg" class="p-ring-svg" viewBox="0 0 220 220">
        <circle class="ring-face" cx="110" cy="110" r="86"/>
        <circle class="ring-bg" cx="110" cy="110" r="${R}"/>
        <circle class="ring-prog" cx="110" cy="110" r="${R}" stroke="${mcolor}" stroke-dasharray="${C2}" stroke-dashoffset="${offset}"/>
      </svg>
      <div class="p-center">
        <div class="p-time" id="p-time-display" style="color:${state.secs===0?mcolor:'var(--ink)'}">${p2(Math.floor(state.secs/60))}:${p2(state.secs%60)}</div>
        <div class="p-mode-lbl" style="color:${mcolor}">${MODES.find(m=>m.id===state.mode)?.label}</div>
        <div class="p-dots">
          ${[...Array(Math.min(state.sessionCount,6))].map(()=>`<div class="p-dot on"></div>`).join('')}
          <span style="font-size:10px;color:var(--ink3);margin-left:3px">${state.sessionCount} hoje</span>
        </div>
      </div>
    </div>
    <div class="p-controls">
      <button class="p-cbtn" onclick="resetTimer()" title="Reiniciar">↺</button>
      <button class="p-cbtn p-play${state.running?' running':''}" id="p-play-btn" onclick="toggleTimer()">${state.running?'⏸':'▶'}</button>
      <button class="p-cbtn" onclick="setMode('short')" title="Pausa rápida">⏭</button>
    </div>
    <div style="width:100%">
      <div class="p-dur-lbl">Duração do foco</div>
      <div class="p-durs">
        ${DURS.map(d=>`<button class="p-dur${state.dur===d?' on':''}" data-dur="${d}" onclick="setDuration(${d})">${d} Min</button>`).join('')}
      </div>
    </div>
    <div class="p-session-box">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div class="p-dur-lbl" style="text-align:left;margin:0">Tag da sessão</div>
        <div style="display:flex;gap:6px;align-items:center">
          <button class="p-edit-tags-btn${editingTags?' active':''}" onclick="toggleEditTags()">${editingTags?'✓ Pronto':'✏️ Editar tags'}</button>
          <button class="p-save-btn" id="p-tag-save-btn" onclick="saveTagBtn()">💾 Salvar</button>
        </div>
      </div>
      <input class="p-tag-input" id="p-tag-inp" placeholder="Ex: sessão de cálculo..." value="${state.tag}"
        oninput="state.tag=this.value;document.querySelectorAll('.p-chip').forEach(c=>c.classList.toggle('on',c.dataset.tag===this.value))"
        onkeydown="if(event.key==='Enter')toggleTimer()"/>
      <div class="p-chips">
        ${editingTags
          ? customTags.map(t=>`<span class="p-chip-edit"><span>${t}</span><button class="p-chip-del" onclick="removeTag('${t.replace(/'/g,"\\'")}')">×</button></span>`).join('')
          : customTags.map(t=>`<button class="p-chip${state.tag===t?' on':''}" data-tag="${t}" onclick="setTag('${t.replace(/'/g,"\\'")}')"> ${t}</button>`).join('')
        }
      </div>
      ${editingTags?`
      <div class="p-new-tag-row">
        <input class="p-new-tag-inp" id="p-new-tag-inp" placeholder="Nova tag..." maxlength="30" onkeydown="if(event.key==='Enter')addTag()"/>
        <button class="p-new-tag-add" onclick="addTag()">+ Adicionar</button>
      </div>`:''}
    </div>
  </div>

  <div class="p-right">
    <div style="background:#ffffff;border-radius:var(--r);padding:10px 12px;border:.5px solid var(--border2);width:100%;box-sizing:border-box;overflow:hidden">
      <div class="p-week-nav">
        <button class="p-week-nav-btn" onclick="shiftWeek(-1)">&#8249;</button>
        <span class="p-week-nav-label">${weekLabel}</span>
        <button class="p-week-nav-btn" onclick="shiftWeek(1)">&#8250;</button>
      </div>
      <div class="p-week">
        ${weekDays.map(d=>{
          const key=dateKey(d),cnt=sbd[key]||0,isT=key===today();
          const now=new Date(); now.setHours(0,0,0,0);
          const dd=new Date(d); dd.setHours(0,0,0,0); const isF=dd>now;
          const daySessions=db.sessions.filter(s=>s.date===key&&s.mode==='focus');
          const popupContent=daySessions.length===0
            ?'<div class="p-day-popup-empty">Sem sessões neste dia.</div>'
            :daySessions.map(s=>`<div class="p-day-popup-item">🍅 <span>${s.tag}</span><span style="margin-left:auto;font-family:var(--font-mono);color:var(--red)">${s.duration}m</span></div>`).join('');
          return `<div class="p-wday">
            <div class="p-wlbl">${WDAYS[d.getDay()]}</div>
            <div class="p-wnum${isT?' today':''}${cnt>0?' active':''}${isF?' future':''}"
              ${!isF?`onclick="toggleDayPopup(this,'${key}')"`:''} style="position:relative;">
              ${d.getDate()}
              ${!isF?`<div class="p-day-popup"><div class="p-day-popup-title">${d.toLocaleDateString('pt-BR',{weekday:'short',day:'numeric',month:'short'})}</div>${popupContent}</div>`:''}
            </div>
            <div class="p-wsessions">${cnt>0?cnt+'×':''}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="p-divider"></div>
    <div>
      <div class="p-stitle" style="margin-top:0">Hoje</div>
      <div class="p-stats2">
        <div class="p-sbox red"><div class="p-sval">${todaySess.length}</div><div class="p-slbl">sessões</div></div>
        <div class="p-sbox grn"><div class="p-sval">${todayMins}m</div><div class="p-slbl">minutos focados</div></div>
      </div>
    </div>
    <div class="p-divider"></div>
    <div>
      <div class="p-stitle" style="margin-top:0">Recentes</div>
      <div class="p-hist-list">
        ${recent.length===0
          ?'<div class="p-empty">Nenhuma sessão ainda.<br>Inicie o timer ou salve uma tag.</div>'
          :recent.map(s=>`
          <div class="p-hitem">
            <div class="p-hico" title="${s.manual?'Salva manualmente':'Timer completo'}">${s.manual?'📌':'🍅'}</div>
            <div class="p-hinfo">
              <div class="p-htag">${s.tag}${s.manual?' <span style="font-size:9px;color:var(--ink3);font-weight:400;margin-left:4px">manual</span>':''}</div>
              ${s.topic?`<div style="font-size:10px;color:var(--ink2);margin-top:1px">📎 ${s.topic}</div>`:''}
              <div class="p-hmeta">${new Date(s.ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} · ${s.date}</div>
            </div>
            <div class="p-hdur">${s.duration}m</div>
            <button class="p-hdel" onclick="deleteSession(${s.id})">✕</button>
          </div>`).join('')}
      </div>
    </div>
  </div>
</div>`;
}

/* ── 13. renderStats() ── */
function renderStats(){
  const c=document.getElementById('p-content'); if(!c) return;
  const focus=db.sessions.filter(s=>s.mode==='focus');
  const total=focus.reduce((s,x)=>s+x.duration,0);
  const days=new Set(focus.map(s=>s.date)).size;
  const sbd=sessionsByDate();
  let streak=0; const d=new Date();
  while(true){ const k=dateKey(d); if(sbd[k]>0){ streak++; d.setDate(d.getDate()-1); } else break; }
  const tagMap={}; focus.forEach(s=>{tagMap[s.tag]=(tagMap[s.tag]||0)+1;});
  const tagList=Object.entries(tagMap).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const maxT=tagList[0]?.[1]||1;
  const now=new Date(), heat=[];
  for(let i=69;i>=0;i--){ const dd=new Date(now); dd.setDate(now.getDate()-i); const k=dateKey(dd); const cnt=sbd[k]||0; const lv=cnt===0?0:cnt<=1?1:cnt<=3?2:cnt<=5?3:4; heat.push({lv,cnt,date:dd}); }

  c.innerHTML=`<div class="p-page">
    <div style="margin-bottom:1.1rem">
      <div style="font-size:18px;font-weight:500;margin-bottom:3px">Análises de foco</div>
      <div style="font-size:12px;color:var(--ink3)">Seu histórico completo de sessões Pomodoro</div>
    </div>
    <div class="p-bigstats">
      <div class="p-bigbox"><div class="p-bigval red">${focus.length}</div><div class="p-biglbl">🍅 sessões totais</div></div>
      <div class="p-bigbox"><div class="p-bigval">${total}m</div><div class="p-biglbl">⏱ minutos focados</div></div>
      <div class="p-bigbox"><div class="p-bigval">${days}</div><div class="p-biglbl">📅 dias com sessões</div></div>
      <div class="p-bigbox"><div class="p-bigval">${streak}🔥</div><div class="p-biglbl">sequência atual</div></div>
    </div>
    <div class="p-heat-wrap">
      <div style="font-size:13px;font-weight:500;margin-bottom:.8rem">Atividade — últimos 70 dias</div>
      <div class="p-heat">${heat.map(h=>`<div class="p-hcell hc${h.lv}" title="${h.date.toLocaleDateString('pt-BR')}: ${h.cnt} sessão${h.cnt!==1?'s':''}"></div>`).join('')}</div>
      <div style="display:flex;align-items:center;gap:5px;margin-top:9px;font-size:11px;color:var(--ink3)">
        Menos ${[0,1,2,3,4].map(l=>`<div class="p-hcell hc${l}" style="flex-shrink:0"></div>`).join('')} Mais
      </div>
    </div>
    <div class="p-tagbar">
      <div style="font-size:13px;font-weight:500;margin-bottom:.9rem">Tags mais usadas</div>
      ${tagList.length===0?'<div style="color:var(--ink3);font-size:12px">Nenhuma sessão ainda.</div>':
        tagList.map(([t,cnt])=>`
        <div class="p-tbrow">
          <div class="p-tbname">🍅 ${t}</div>
          <div class="p-tbtrack"><div class="p-tbfill" style="width:${(cnt/maxT)*100}%"></div></div>
          <div class="p-tbcnt">${cnt}×</div>
        </div>`).join('')}
    </div>
  </div>`;
}

/* ── 14. renderHistory() ── */
function renderHistory(){
  const c=document.getElementById('p-content'); if(!c) return;
  const fv=document.getElementById('p-hist-filter');
  const filterVal=fv?fv.value:'';
  const sessions=db.sessions.filter(s=>s.mode==='focus').slice().reverse();
  const filtered=filterVal?sessions.filter(s=>s.tag.toLowerCase().includes(filterVal.toLowerCase())):sessions;
  const grouped={}; filtered.forEach(s=>{(grouped[s.date]=grouped[s.date]||[]).push(s);});
  const dates=Object.keys(grouped).sort((a,b)=>b.localeCompare(a));

  c.innerHTML=`<div class="p-page">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-size:18px;font-weight:500;margin-bottom:2px">Histórico completo</div>
        <div style="font-size:12px;color:var(--ink3)">${sessions.length} sessão${sessions.length!==1?'s':''} registrada${sessions.length!==1?'s':''}</div>
      </div>
    </div>
    <input class="p-filter" id="p-hist-filter" placeholder="Filtrar por tag..." value="${filterVal}" oninput="renderHistory()"/>
    <div class="p-hist-page">
      ${dates.length===0
        ?`<div class="p-empty" style="padding-top:3rem;font-size:13px">${filterVal?'Nenhuma sessão com "'+filterVal+'"':'Nenhuma sessão registrada ainda.'}</div>`
        :dates.map(date=>{
          const dayTotal=grouped[date].reduce((s,x)=>s+x.duration,0);
          const d=new Date(date+'T12:00:00');
          return `<div class="p-hist-day">
            <div class="p-hist-dayhead">
              <div class="p-hist-dayname">${d.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</div>
              <div class="p-hist-daymeta">${grouped[date].length} sessão${grouped[date].length!==1?'s':''} · ${dayTotal}min</div>
            </div>
            <div class="p-hist-list">
              ${grouped[date].map(s=>`
              <div class="p-hitem">
                <div class="p-hico">🍅</div>
                <div class="p-hinfo">
                  <div class="p-htag">${s.tag}</div>
                  <div class="p-hmeta">${new Date(s.ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>
                </div>
                <div class="p-hdur">${s.duration}m</div>
                <button class="p-hdel" onclick="deleteSession(${s.id})">✕</button>
              </div>`).join('')}
            </div>
          </div>`;
        }).join('')}
    </div>
  </div>`;
}

/* ── 15. Navegação por abas ── */
function switchTab(tab){
  state.page=tab;
  document.querySelectorAll('.p-ntab').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
  if(tab==='timer') renderTimer();
  else if(tab==='stats') renderStats();
  else renderHistory();
}

/* ── 16. Inicialização ── */
if('Notification'in window&&Notification.permission==='default') Notification.requestPermission();
updateTabTitle();
renderTimer();
(function(){ const inp=document.getElementById('p-topic-inp'); if(inp) inp.value=loadTopic(); })();
