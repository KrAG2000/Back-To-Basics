const API_KEY='lab_test_key';
const state={bootstrap:null,payments:[],selected:null,operations:null,view:'overview'};
const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const escapeHtml=(value='')=>String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]));
const fmtMoney=(value=0)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Number(value)/100);
const fmtDate=(value)=>value?new Intl.DateTimeFormat('en-IN',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'}).format(new Date(value)):'—';
const short=(value='')=>value.length>18?`${value.slice(0,10)}…${value.slice(-5)}`:value;
const status=(value)=>`<span class="status ${escapeHtml(value)}">${escapeHtml(value)}</span>`;

async function api(path,options={}){
  const response=await fetch(`/api${path}`,{...options,headers:{'Content-Type':'application/json','X-API-Key':API_KEY,...options.headers}});
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.error?.message||`Request failed (${response.status})`);
  return data;
}

function toast(message,error=false){const el=$('#toast');el.textContent=message;el.className=`toast show${error?' error':''}`;setTimeout(()=>el.className='toast',2800)}

const titles={overview:['CONTROL ROOM','System overview'],simulator:['INTERACTIVE LAB','Run a payment scenario'],payments:['FORENSICS','Payment explorer'],operations:['OPERATIONS','System control center'],architecture:['SYSTEM MAP','Architecture'],learn:['EDUCATION','Concept guide']};
function showView(view){state.view=view;$$('.view').forEach(el=>el.classList.toggle('active',el.id===`view-${view}`));$$('.nav').forEach(el=>el.classList.toggle('active',el.dataset.view===view));$('#section-kicker').textContent=titles[view][0];$('#section-title').textContent=titles[view][1];if(view==='payments')loadPayments();if(view==='operations')loadOperations();}

async function initialize(){
  try{
    const health=await api('/health');$('#health').classList.add('ok');$('#health').innerHTML='<i></i> PostgreSQL online';
    state.bootstrap=await api('/bootstrap');populateForms();renderArchitecture();await Promise.all([loadOverview(),loadPayments(),loadConcepts()]);
  }catch(error){toast(error.message,true);$('#health').innerHTML='<i></i> System unavailable';}
}

function populateForms(){
  const {actors,accounts,scenarios}=state.bootstrap;
  $('#scenario-select').innerHTML=`<option value="custom">Custom scenario</option>${scenarios.map(s=>`<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)} — ${escapeHtml(s.category)}</option>`).join('')}`;
  $('#customer').innerHTML=actors.filter(a=>a.type==='CUSTOMER').map(a=>`<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
  $('#merchant').innerHTML=actors.filter(a=>a.type==='MERCHANT').map(a=>`<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
  updateAccounts();
}
function updateAccounts(){const customer=$('#customer').value;$('#source-account').innerHTML=state.bootstrap.accounts.filter(a=>a.actor_id===customer).map(a=>`<option value="${a.id}">${escapeHtml(a.synthetic_identifier)} · ${fmtMoney(a.balance-a.held_amount)} available</option>`).join('');}

async function loadOverview(){
  const [metrics,payments]=await Promise.all([api('/overview'),api('/payments?limit=8')]); state.payments=payments;
  const cards=[['Transactions',metrics.totalTransactions,'all-time requests'],['Success rate',`${metrics.successRate}%`,'captured or settled'],['Unknown',metrics.unknown,'requires inquiry'],['Simulated TPV',fmtMoney(metrics.tpv),'gross requested'],['Provider p95',`${metrics.latency.p95} ms`,'synthetic latency'],['Settled',fmtMoney(metrics.settled),'merchant net'],['Webhook delivery',`${metrics.webhookDeliveryRate}%`,'independent notification'],['Recon mismatches',metrics.reconciliationMismatches,'independent checks']];
  $('#metrics').innerHTML=cards.map(([label,value,note])=>`<div class="metric"><span>${label}</span><b>${value}</b><small>${note}</small></div>`).join('');
  $('#recent-payments').innerHTML=payments.length?payments.map(paymentRow).join(''):'<tr><td colspan="6" class="muted">No payments yet. Run your first simulation.</td></tr>';
  $('#providers-chart').innerHTML=metrics.providers.length?metrics.providers.map(p=>`<div class="provider-row"><b>${escapeHtml(p.provider)}</b><div class="bar"><i style="width:${p.successRate}%"></i></div><span>${p.successRate}%</span></div>`).join(''):'<p class="muted">Provider attempts will appear here.</p>';
  $('#queue-total').textContent=Object.values(metrics.queue.queues||{}).reduce((a,b)=>a+b,0);
}
function paymentRow(p){return `<tr data-payment="${p.id}"><td><span class="id">${short(p.id)}</span></td><td>${escapeHtml(p.method)}</td><td><b>${fmtMoney(p.amount)}</b></td><td>${escapeHtml(p.provider||'—')}</td><td>${status(p.status)}</td><td>${fmtDate(p.created_at)}</td></tr>`}

async function loadPayments(){
  const query=encodeURIComponent($('#payment-search')?.value||'');const filter=encodeURIComponent($('#status-filter')?.value||'');
  state.payments=await api(`/payments?query=${query}&status=${filter}`);
  $('#payment-list').innerHTML=state.payments.length?state.payments.map(p=>`<tr data-payment="${p.id}"><td><span class="id">${short(p.id)}</span><small>${fmtDate(p.created_at)}</small></td><td>${escapeHtml(p.customer_name)}<br><span class="muted">→ ${escapeHtml(p.merchant_name)}</span></td><td><b>${fmtMoney(p.amount)}</b></td><td>${escapeHtml(p.method)}<br><span class="muted">${escapeHtml(p.provider||'not routed')}</span></td><td>${status(p.ledger_state)}</td><td>${status(p.status)}</td></tr>`).join(''):'<tr><td colspan="6" class="muted">No matching payments.</td></tr>';
}

async function inspectPayment(id,target='#payment-detail'){
  const detail=await api(`/payments/${id}`);state.selected=detail;renderDetail(detail,$(target));activateFlow(detail);if(target==='#payment-detail')showView('payments');
}
function renderDetail(p,root){
  const actions=[];
  if(p.status==='AUTHORIZED')actions.push('<button class="button primary" data-action="capture">Capture authorization</button>');
  if(['UNKNOWN','PENDING'].includes(p.status))actions.push('<button class="button primary" data-action="inquire">Run status inquiry</button>');
  if(p.status==='FAILED')actions.push('<button class="button primary" data-action="retry">Retry with backoff policy</button>');
  if(['AUTHORIZED','SUCCESS'].includes(p.status))actions.push('<button class="button ghost" data-action="reverse">Reverse payment</button>');
  if(['SUCCESS','PARTIALLY_REFUNDED'].includes(p.status)){actions.push('<button class="button ghost" data-action="refund">Create refund</button>');actions.push('<button class="button ghost" data-action="dispute">Open dispute</button>');}
  root.innerHTML=`<div class="result-header"><div><p class="eyebrow">PAYMENT RECORD</p><h2>${escapeHtml(p.id)}</h2><span class="muted">Correlation ${escapeHtml(p.correlation_id)}</span></div><div>${status(p.status)} ${status(p.ledger_state)}</div></div>
    <div class="result-grid"><div class="datum"><small>Amount</small><b>${fmtMoney(p.amount)}</b></div><div class="datum"><small>Route</small><b>${escapeHtml(p.provider||'not routed')}</b></div><div class="datum"><small>Risk decision</small><b>${escapeHtml(p.risk?.decision||'—')} · ${p.risk?.score??'—'}</b></div><div class="datum"><small>Provider reference</small><b class="id">${escapeHtml(p.provider_reference||'—')}</b></div></div>
    <div class="detail-actions">${actions.join('')}</div>
    <div class="detail-tabs"><button class="active" data-tab="timeline">Timeline (${p.events.length})</button><button data-tab="ledger">Ledger (${p.ledger.length})</button><button data-tab="attempts">Attempts (${p.attempts.length})</button><button data-tab="webhooks">Webhooks (${p.webhooks.length})</button></div>
    <div class="tab-content" data-content="timeline">${renderTimeline(p.events)}</div>
    <div class="tab-content" data-content="ledger" hidden>${renderLedger(p.ledger)}</div>
    <div class="tab-content" data-content="attempts" hidden>${renderAttempts(p.attempts)}</div>
    <div class="tab-content" data-content="webhooks" hidden>${renderWebhooks(p.webhooks)}</div>`;
}
function renderTimeline(events){return `<div class="timeline">${events.map(e=>`<div class="timeline-item"><b>${escapeHtml(e.event_type)}</b><time>${fmtDate(e.created_at)}</time><p>${escapeHtml(eventSummary(e))}</p></div>`).join('')}</div>`}
function eventSummary(event){const p=event.payload||{};return p.reason||p.message||p.provider||p.status||p.decision||p.settlementId||`version ${event.version}`;}
function renderLedger(entries){return entries.length?`<div class="table-wrap ledger-table"><table><thead><tr><th>Journal</th><th>Purpose</th><th>Account</th><th>Direction</th><th>Amount</th></tr></thead><tbody>${entries.map(e=>`<tr><td class="id">${short(e.journal_id)}</td><td>${escapeHtml(e.kind)}</td><td class="id">${escapeHtml(e.account_code)}</td><td class="${e.direction}">${e.direction}</td><td>${fmtMoney(e.amount)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">No money movement has been posted. Authorization holds are separate from ledger journals.</p>'}
function renderAttempts(attempts){return attempts.length?attempts.map(a=>`<div class="record"><div><b>${escapeHtml(a.provider)}</b><small>${escapeHtml(a.error_code||a.response?.message||'Approved')} · ${a.latency_ms} ms</small></div>${status(a.status)}</div>`).join(''):'<p class="muted">Risk or validation stopped this payment before a provider attempt.</p>'}
function renderWebhooks(hooks){return hooks.length?hooks.map(h=>`<div class="record"><div><b class="id">${short(h.id)}</b><small>attempts ${h.attempts} · HTTP ${h.response_code||'—'} · signature ${short(h.signature)}</small></div>${status(h.status)}</div>`).join(''):'<p class="muted">No webhook queued.</p>'}

const flowNodes=[['Client','C'],['Gateway','G'],['Risk','R'],['Router','↗'],['Provider','P'],['Bank','B'],['Ledger','L'],['Outbox','O'],['Webhook','W'],['Settlement','S']];
function renderFlow(){const html=flowNodes.map(([name,icon])=>`<div class="flow-node" data-node="${name}"><i>${icon}</i>${name}</div>`).join('');$('#live-flow').innerHTML=html;}
function activateFlow(p){renderFlow();const active=['Client','Gateway'];if(p.risk)active.push('Risk');if(p.routing)active.push('Router');if(p.attempts?.length)active.push('Provider','Bank');if(p.ledger?.length)active.push('Ledger');if(p.events?.length)active.push('Outbox');if(p.webhooks?.length)active.push('Webhook');if(p.settlement?.length)active.push('Settlement');active.forEach(name=>{$(`[data-node="${name}"]`)?.classList.add('active')});if(['FAILED','DECLINED','UNKNOWN'].includes(p.status)){const failed=p.status==='DECLINED'&&!p.provider?'Risk':'Provider';$(`[data-node="${failed}"]`)?.classList.add('error');}}

async function runSimulation(event){
  event.preventDefault();const selected=state.bootstrap.scenarios.find(s=>s.id===$('#scenario-select').value);const scenario=selected?{...selected.scenario}:{};
  if($('#provider-behavior').value!=='SUCCESS'||!selected)scenario.providerBehavior=$('#provider-behavior').value;
  if($('#risk-behavior').value!=='NORMAL')scenario.risk=$('#risk-behavior').value;
  if($('#inquiry-outcome').value)scenario.inquiryOutcome=$('#inquiry-outcome').value;
  if($('#recon-mismatch').checked)scenario.reconciliationMismatch=true;
  const payload={merchantId:$('#merchant').value,customerId:$('#customer').value,sourceAccountId:$('#source-account').value,amount:Math.round(Number($('#amount').value)*100),currency:'INR',method:$('#method').value,captureMethod:$('#capture-method').value,scenario};
  try{const result=await api('/payments',{method:'POST',headers:{'Idempotency-Key':crypto.randomUUID()},body:JSON.stringify(payload)});await inspectPayment(result.paymentId,'#simulation-result');toast(`Payment reached ${result.status}`);await loadOverview();}catch(error){toast(error.message,true)}
}

function applyScenario(){const s=state.bootstrap.scenarios.find(item=>item.id===$('#scenario-select').value);if(!s)return;$('#method').value=s.method;$('#capture-method').value=s.captureMethod||'AUTOMATIC';$('#provider-behavior').value=s.scenario.providerBehavior||'SUCCESS';$('#risk-behavior').value=s.scenario.risk||'NORMAL';$('#inquiry-outcome').value=s.scenario.inquiryOutcome||'';$('#recon-mismatch').checked=Boolean(s.scenario.reconciliationMismatch);}

async function paymentAction(action){
  const p=state.selected;if(!p)return;
  try{
    if(action==='capture')await api(`/payments/${p.id}/capture`,{method:'POST',headers:{'Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({amount:p.amount-p.captured_amount})});
    if(action==='inquire')await api(`/payments/${p.id}/inquire`,{method:'POST',body:'{}'});
    if(action==='retry')await api(`/payments/${p.id}/retry`,{method:'POST',body:JSON.stringify({behavior:'SUCCESS'})});
    if(action==='reverse')await api(`/payments/${p.id}/reverse`,{method:'POST',headers:{'Idempotency-Key':crypto.randomUUID()},body:'{}'});
    if(action==='refund'){const rupees=prompt('Refund amount in rupees',String((p.captured_amount-p.refunded_amount)/100));if(rupees===null)return;await api(`/payments/${p.id}/refunds`,{method:'POST',headers:{'Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({amount:Math.round(Number(rupees)*100)})});}
    if(action==='dispute')await api(`/payments/${p.id}/disputes`,{method:'POST',body:JSON.stringify({reason:'simulated_customer_claim'})});
    const target=state.view==='simulator'?'#simulation-result':'#payment-detail';await inspectPayment(p.id,target);toast(`${action} completed`);await loadOverview();
  }catch(error){toast(error.message,true)}
}

async function loadOperations(){
  state.operations=await api('/operations');const o=state.operations;const pending=o.outbox.filter(x=>x.status==='PENDING').length;const failed=o.webhooks.filter(x=>x.status==='DEAD_LETTER').length;const queueTotal=Object.values(o.queues.queues||{}).reduce((a,b)=>a+b,0);
  $('#operation-summary').innerHTML=[['Pending outbox',pending,'atomic events awaiting publish'],['Queue depth',queueTotal,o.queues.available?'Redis connected':'Redis unavailable; DB outbox preserved'],['Webhook DLQ',failed,'deliveries needing operator action']].map(([l,v,n])=>`<article class="panel operation-card"><p class="eyebrow">${l}</p><b>${v}</b><p class="muted">${n}</p></article>`).join('');
  const providers=o.config.providers||[];$('#provider-controls').innerHTML=providers.map(p=>`<div class="provider-control"><div><b>${escapeHtml(p.id)}</b><div class="muted">${p.methods.join(', ')} · ${p.latency} ms · ${p.successRate}% historical</div></div><button class="toggle ${p.enabled?'on':''}" data-provider="${p.id}" aria-label="Toggle provider"></button></div>`).join('');
  $('#outbox-list').innerHTML=o.outbox.slice(0,12).map(x=>`<div class="record"><div><b>${escapeHtml(x.topic)}</b><small class="id">${short(x.event_id)} · ${fmtDate(x.created_at)}</small></div>${status(x.status)}</div>`).join('')||'<p class="muted">No outbox entries.</p>';
  $('#webhook-list').innerHTML=o.webhooks.slice(0,12).map(x=>`<div class="record"><div><b class="id">${short(x.payment_id)}</b><small>attempt ${x.attempts} · HTTP ${x.response_code||'—'}</small></div>${status(x.status)}</div>`).join('')||'<p class="muted">No webhooks.</p>';
  const people=state.bootstrap.actors.map(a=>`<div class="record"><div><b>${escapeHtml(a.name)}</b><small>${a.type} · <span class="id">${a.id}</span></small></div>${status(a.risk_level)}</div>`).join('');
  const accounts=state.bootstrap.accounts.map(a=>`<div class="record"><div><b>${escapeHtml(a.synthetic_identifier)}</b><small>${escapeHtml(a.account_type)} · ${escapeHtml(a.actor_name||'platform')}</small></div><span>${fmtMoney(a.balance-a.held_amount)}</span></div>`).join('');
  $('#participant-list').innerHTML=`<div><h3>Actors</h3>${people}</div><div><h3>Accounts & available balance</h3>${accounts}</div>`;
}
async function operation(path,body={}){try{const result=await api(path,{method:'POST',body:JSON.stringify(body)});$('#operation-output').textContent=JSON.stringify(result,null,2);toast('Operation completed');await loadOperations();await loadOverview();}catch(error){toast(error.message,true);$('#operation-output').textContent=error.message;}}
async function toggleProvider(id){const providers=state.operations.config.providers.map(p=>p.id===id?{...p,enabled:!p.enabled}:p);await api('/operations/config/providers',{method:'PUT',body:JSON.stringify({value:providers})});toast(`${id} ${providers.find(p=>p.id===id).enabled?'enabled':'paused'}`);await loadOperations();}

async function createSynthetic(kind){
  try{
    if(kind==='CUSTOMER'||kind==='MERCHANT'){
      const name=prompt(`Synthetic ${kind.toLowerCase()} name`);if(!name)return;
      await api('/actors',{method:'POST',body:JSON.stringify({type:kind,name})});
    }else{
      const customers=state.bootstrap.actors.filter(a=>a.type==='CUSTOMER');
      const actorId=prompt(`Customer ID for the account\n${customers.map(a=>`${a.id} — ${a.name}`).join('\n')}`,customers[0]?.id||'');if(!actorId)return;
      const vpa=prompt('Synthetic VPA (never enter real credentials)','learner@sim');if(!vpa)return;
      const rupees=prompt('Opening simulated balance in rupees','100000');if(rupees===null)return;
      await api('/accounts',{method:'POST',body:JSON.stringify({actorId,accountType:'UPI',syntheticIdentifier:vpa,balance:Math.round(Number(rupees)*100)})});
    }
    state.bootstrap=await api('/bootstrap');populateForms();await loadOperations();toast('Synthetic test data created');
  }catch(error){toast(error.message,true)}
}

function renderArchitecture(){const nodes=[['API Gateway','authentication · validation · rate limit'],['Idempotency','request hash · replay'],['Payment service','explicit state machine'],['Risk engine','deterministic signals'],['Router','eligible provider selection'],['Provider / bank','synthetic authorization truth'],['PostgreSQL','payment + outbox transaction'],['Double-entry ledger','balanced financial journals'],['Redis queues','visible async handoff'],['Webhook worker','signed retries + DLQ'],['Settlement','gross − refunds − fees − tax'],['Reconciliation','independent record comparison'],['Operations','failure and worker controls'],['Metrics','business + reliability'],['Audit trail','operator mutations']];$('#architecture-map').innerHTML=nodes.map(([n,d])=>`<div class="architecture-node"><strong>${n}</strong>${d}</div>`).join('');renderFlow();}
async function loadConcepts(){const concepts=await api('/concepts');$('#concept-grid').innerHTML=Object.entries(concepts).map(([name,text])=>`<article class="concept"><p class="eyebrow">PAYMENT SYSTEMS</p><h3>${escapeHtml(name)}</h3><p>${escapeHtml(text)}</p></article>`).join('')}

document.addEventListener('click',async event=>{
  const nav=event.target.closest('[data-view]');if(nav)showView(nav.dataset.view);
  const jump=event.target.closest('[data-jump]');if(jump)showView(jump.dataset.jump);
  const row=event.target.closest('[data-payment]');if(row)await inspectPayment(row.dataset.payment);
  const scenario=event.target.closest('[data-scenario]');if(scenario){showView('simulator');$('#scenario-select').value=scenario.dataset.scenario;applyScenario();}
  const tab=event.target.closest('[data-tab]');if(tab){const root=tab.closest('.panel');$$('[data-tab]',root).forEach(x=>x.classList.toggle('active',x===tab));$$('[data-content]',root).forEach(x=>x.hidden=x.dataset.content!==tab.dataset.tab);}
  const action=event.target.closest('[data-action]');if(action)await paymentAction(action.dataset.action);
  const provider=event.target.closest('[data-provider]');if(provider)await toggleProvider(provider.dataset.provider);
  const setup=event.target.closest('[data-setup]');if(setup)await createSynthetic(setup.dataset.setup);
});
$('#simulation-form').addEventListener('submit',runSimulation);$('#scenario-select').addEventListener('change',applyScenario);$('#customer').addEventListener('change',updateAccounts);
$('#payment-search').addEventListener('input',()=>setTimeout(loadPayments,150));$('#status-filter').addEventListener('change',loadPayments);
$('#refresh').addEventListener('click',async()=>{await loadOverview();if(state.view==='operations')await loadOperations();toast('Data refreshed')});
$('#process-webhooks').addEventListener('click',()=>operation('/operations/webhooks/process'));$('#publish-outbox').addEventListener('click',()=>operation('/operations/outbox/publish'));$('#run-reconciliation').addEventListener('click',()=>operation('/reconciliation'));$('#run-settlement').addEventListener('click',()=>operation('/settlements',{merchantId:'mer_demo'}));
initialize();
