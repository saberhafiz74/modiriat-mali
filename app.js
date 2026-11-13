const KEY='my-finance-v2';
const blank=()=>({accounts:[{id:'cash',name:'نقدی',balance:0}],transactions:[],debts:[],recurring:[],budget:0,goal:0});
let db=read();
function read(){try{return {...blank(),...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return blank()}}
function persist(){localStorage.setItem(KEY,JSON.stringify(db));render()}
const $=id=>document.getElementById(id), nfmt=n=>Number(n||0).toLocaleString('fa-IR'), money=n=>nfmt(n)+' تومان';
const iso=()=>{let d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const month=()=>iso().slice(0,7);
function jalali(s){if(!s)return '—';let [y,m,d]=s.split('-').map(Number);return new Intl.DateTimeFormat('fa-IR-u-ca-persian',{year:'numeric',month:'short',day:'numeric'}).format(new Date(y,m-1,d))}
function jalaliInput(s){
 if(!s)return '';
 let [gy,gm,gd]=s.split('-').map(Number);
 const parts=new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn',{year:'numeric',month:'numeric',day:'numeric'}).formatToParts(new Date(gy,gm-1,gd));
 const v={};parts.forEach(p=>{if(p.type!=='literal')v[p.type]=p.value});
 return `${v.year}/${String(v.month).padStart(2,'0')}/${String(v.day).padStart(2,'0')}`;
}
function isoFromJalali(value){
 const s=String(value||'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).trim();
 const m=s.match(/^(\\d{4})[\\/-](\\d{1,2})[\\/-](\\d{1,2})$/);
 if(!m)return '';
 const jy=+m[1],jm=+m[2],jd=+m[3];
 if(jm<1||jm>12||jd<1||jd>(jm<=6?31:jm<=11?30:30))return '';
 const offset=(jm<=6?(jm-1)*31:186+(jm-7)*30)+(jd-1);
 const start=new Date(jy+621,2,19);
 for(let i=0;i<20;i++){
  const d=new Date(start);d.setDate(start.getDate()+i);
  const ps=new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn',{year:'numeric',month:'numeric',day:'numeric'}).formatToParts(d);
  const o={};ps.forEach(x=>{if(x.type!=='literal')o[x.type]=+x.value});
  if(o.year===jy&&o.month===1&&o.day===1){
   const out=new Date(d);out.setDate(out.getDate()+offset);
   const gy=out.getFullYear(),gm=String(out.getMonth()+1).padStart(2,'0'),gd=String(out.getDate()).padStart(2,'0');
   return `${gy}-${gm}-${gd}`;
  }
 }
 return '';
}

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function view(id){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.id===id));render()}
function dlg(id){$(id).showModal()}function closeDlg(id){$(id).close()}
function accountOptions(id){return db.accounts.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}
function openTx(type,t=null){$('txId').value=t?.id||'';$('txType').value=t?.type||type;$('txHeading').textContent=t?'ویرایش تراکنش':(type==='income'?'ثبت درآمد':'ثبت هزینه');$('txTitle').value=t?.title||'';$('txAmount').value=t?.amount||'';$('txCat').value=t?.category|| (type==='income'?'حقوق':'خوراک و خرید');$('txDate').value=jalaliInput(t?.date||iso());$('txAccount').innerHTML=accountOptions();$('txAccount').value=t?.accountId||db.accounts[0]?.id||'';$('txPriorityField').hidden=$('txType').value!=='expense';$('txPriorityField').style.display=$('txType').value==='expense'?'grid':'none';$('txPriority').value=String(t?.priority||3);dlg('txDlg')}
function adjust(t,sign){let a=db.accounts.find(x=>x.id===t.accountId);if(a&&t.type!=='transfer')a.balance+=sign*(t.type==='income'?t.amount:-t.amount)}
$('txForm').addEventListener('submit',e=>{e.preventDefault();let id=$('txId').value,type=$('txType').value,t={id:id||crypto.randomUUID(),type,title:$('txTitle').value.trim(),amount:Number($('txAmount').value),category:$('txCat').value,accountId:$('txAccount').value,date:isoFromJalali($('txDate').value),priority:type==='expense'?Number($('txPriority').value):null};if(!t.date){alert('تاریخ شمسی را به شکل ۱۴۰۵/۰۸/۲۲ وارد کن.');return}if(!t.amount||t.amount<1)return;if(id){let i=db.transactions.findIndex(x=>x.id===id);if(i>=0){adjust(db.transactions[i],-1);db.transactions[i]=t}}else db.transactions.unshift(t);adjust(t,1);closeDlg('txDlg');persist()});
function txHTML(t){let sign=t.type==='income'?'+':t.type==='expense'?'−':'⇄',cls=t.type==='income'?'green':t.type==='expense'?'red':'gold';return `<div class="tx"><div class="ico">${t.type==='income'?'↙':t.type==='expense'?'↗':'⇄'}</div><div class="txmain"><b>${esc(t.title)}</b><small>${esc(t.category||'انتقال')} · ${jalali(t.date)}${t.type==='expense'?` · ضرورت ${nfmt(t.priority||3)} از ۵`:''}</small></div><div class="txamount ${cls}">${sign}${nfmt(t.amount)}</div>${t.type!=='transfer'?`<button class="link" onclick="editTx('${t.id}')">ویرایش</button>`:''}<button class="link" onclick="deleteTx('${t.id}')">×</button></div>`}
function editTx(id){let t=db.transactions.find(x=>x.id===id);if(t)openTx(t.type,t)}
function deleteTx(id){let t=db.transactions.find(x=>x.id===id);if(!t||!confirm('این تراکنش حذف شود؟'))return;if(t.type==='transfer'){let from=db.accounts.find(a=>a.id===t.accountId),to=db.accounts.find(a=>a.id===t.toAccountId);if(from)from.balance+=t.amount;if(to)to.balance-=t.amount}else adjust(t,-1);db.transactions=db.transactions.filter(x=>x.id!==id);persist()}
function renderTx(){let q=($('searchTx')?.value||'').trim().toLowerCase(),f=$('filterType')?.value||'all';let arr=db.transactions.filter(t=>(f==='all'||t.type===f)&&(`${t.title} ${t.category}`.toLowerCase().includes(q)));$('txList').innerHTML=arr.length?arr.map(txHTML).join(''):'<div class="empty">تراکنشی پیدا نشد.</div>'}
function openAccount(){dlg('accountDlg')}
$('accountForm').addEventListener('submit',e=>{e.preventDefault();db.accounts.push({id:crypto.randomUUID(),name:$('accName').value.trim(),balance:Number($('accBalance').value)||0});closeDlg('accountDlg');e.target.reset();persist()});
function openTransfer(){if(db.accounts.length<2){alert('برای انتقال، ابتدا حداقل دو حساب بساز.');return}$('fromAcc').innerHTML=accountOptions();$('toAcc').innerHTML=accountOptions();$('toAcc').selectedIndex=1;$('transferDate').value=jalaliInput(iso());dlg('transferDlg')}
$('transferForm').addEventListener('submit',e=>{e.preventDefault();let from=$('fromAcc').value,to=$('toAcc').value,amount=Number($('transferAmount').value);if(from===to||amount<=0){alert('حساب مبدأ و مقصد باید متفاوت باشند.');return}if(!isoFromJalali($('transferDate').value)){alert('تاریخ شمسی را به شکل ۱۴۰۵/۰۸/۲۲ وارد کن.');return}let a=db.accounts.find(x=>x.id===from),b=db.accounts.find(x=>x.id===to);if(!a||!b)return;a.balance-=amount;b.balance+=amount;db.transactions.unshift({id:crypto.randomUUID(),type:'transfer',title:`انتقال از ${a.name} به ${b.name}`,amount,category:'انتقال بین حساب‌ها',accountId:from,toAccountId:to,date:isoFromJalali($('transferDate').value)});closeDlg('transferDlg');persist()});
function openDebt(){$('debtDue').value='';dlg('debtDlg')}
$('debtForm').addEventListener('submit',e=>{e.preventDefault();if($('debtDue').value&&!isoFromJalali($('debtDue').value)){alert('تاریخ شمسی را به شکل ۱۴۰۵/۰۸/۲۲ وارد کن.');return}db.debts.push({id:crypto.randomUUID(),title:$('debtName').value.trim(),total:Number($('debtAmount').value),paid:0,installment:Number($('debtInstallment').value)||0,due:$('debtDue').value?isoFromJalali($('debtDue').value):''});closeDlg('debtDlg');e.target.reset();persist()});
function payDebt(id){let d=db.debts.find(x=>x.id===id);if(!d)return;let remain=d.total-d.paid,raw=prompt('مبلغ پرداختی (تومان)؛ مانده '+nfmt(remain),String(Math.min(remain,d.installment||remain)));if(raw===null)return;let amount=Number(raw);if(!amount||amount<=0||amount>remain){alert('مبلغ واردشده معتبر نیست.');return}d.paid+=amount;if(d.paid>=d.total)db.debts=db.debts.filter(x=>x.id!==id);persist()}
function removeDebt(id){if(confirm('این بدهی حذف شود؟')){db.debts=db.debts.filter(d=>d.id!==id);persist()}}
function openRecurring(){ $('recAccount').innerHTML=accountOptions();dlg('recDlg')}
$('recForm').addEventListener('submit',e=>{e.preventDefault();db.recurring.push({id:crypto.randomUUID(),title:$('recName').value.trim(),type:$('recType').value,amount:Number($('recAmount').value),category:$('recCat').value,accountId:$('recAccount').value,day:Math.max(1,Math.min(28,Number($('recDay').value)||1)),last:''});closeDlg('recDlg');e.target.reset();persist()});
function processRecurring(){let d=new Date(),key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,day=d.getDate(),changed=false;db.recurring.forEach(r=>{if(day>=r.day&&r.last!==key){let date=`${key}-${String(r.day).padStart(2,'0')}`;db.transactions.unshift({id:crypto.randomUUID(),type:r.type,title:r.title,amount:r.amount,category:r.category,accountId:r.accountId,date,priority:r.type==='expense'?Number(r.priority||3):null,recurringId:r.id});let a=db.accounts.find(x=>x.id===r.accountId);if(a)a.balance+=(r.type==='income'?r.amount:-r.amount);r.last=key;changed=true}});if(changed)localStorage.setItem(KEY,JSON.stringify(db))}
function savePlan(){db.budget=Number($('budgetInput').value)||0;db.goal=Number($('goalInput').value)||0;persist()}
function expenseGroup(p){p=Number(p||3);return p<=2?'necessary':p===3?'medium':'unnecessary'}
function renderExpenses(){
 let mk=month(),all=db.transactions.filter(t=>t.type==='expense'&&t.date?.slice(0,7)===mk);
 let sums={necessary:0,medium:0,unnecessary:0};
 all.forEach(t=>sums[expenseGroup(t.priority)]+=Number(t.amount||0));
 let total=all.reduce((s,t)=>s+Number(t.amount||0),0);
 $('necessaryTotal').textContent=money(sums.necessary);$('mediumTotal').textContent=money(sums.medium);
 $('unnecessaryTotal').textContent=money(sums.unnecessary);$('allExpenseTotal').textContent=money(total);
 $('expenseMonthLabel').textContent=jalali(mk+'-01').replace(/[۰-۹]+/g,'').trim()||'ماه جاری';
 const groups=[['necessary','ضروری',sums.necessary,'var(--green)'],['medium','متوسط',sums.medium,'var(--gold)'],['unnecessary','غیرضروری',sums.unnecessary,'var(--red)']];
 $('expenseGroupBars').innerHTML=groups.map(([k,label,val,color])=>{let p=total?Math.round(val/total*100):0;return `<div style="margin:12px 0"><div class="two"><span>${label}</span><b style="text-align:left">${nfmt(p)}٪ · ${money(val)}</b></div><div class="bar"><i style="width:${p}%;background:${color}"></i></div></div>`}).join('');
 let cats={};all.forEach(t=>{let c=t.category||'سایر';cats[c]=(cats[c]||0)+Number(t.amount||0)});
 $('expenseCategoryList').innerHTML=Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<div class="tx"><div class="txmain"><b>${esc(c)}</b><small>${total? nfmt(Math.round(v/total*100)):0}٪ از کل هزینه‌ها</small></div><div class="txamount">${money(v)}</div></div>`).join('')||'<div class="empty">در این ماه هزینه‌ای ثبت نشده است.</div>';
 let f=$('expenseGroupFilter').value,arr=all.filter(t=>f==='all'||expenseGroup(t.priority)===f).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 $('expenseList').innerHTML=arr.map(txHTML).join('')||'<div class="empty">هزینه‌ای در این گروه ثبت نشده است.</div>';
}
function render(){let now=iso(),mk=month(),ts=db.transactions.filter(t=>t.date?.slice(0,7)===mk),inc=ts.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0),exp=ts.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0),balance=db.accounts.reduce((s,a)=>s+a.balance,0),debt=db.debts.reduce((s,d)=>s+d.total-d.paid,0);
$('today').textContent=new Intl.DateTimeFormat('fa-IR-u-ca-persian',{weekday:'long',year:'numeric',month:'long',day:'numeric'}).format(new Date());$('balance').textContent=money(balance);$('income').textContent=money(inc);$('expense').textContent=money(exp);$('debtTotal').textContent=money(debt);$('monthNet').textContent='خالص ماه: '+money(inc-exp);$('budgetLeft').textContent=db.budget?money(db.budget-exp):'تعیین نشده';
$('recent').innerHTML=db.transactions.slice(0,5).map(txHTML).join('')||'<div class="empty">هنوز تراکنشی ثبت نکرده‌ای.</div>';
let percent=db.budget?Math.min(100,Math.round(exp/db.budget*100)):0;$('homeBudget').innerHTML=db.budget?`<div class="two"><div><span class="muted">مصرف‌شده</span><b>${nfmt(percent)}٪</b></div><div style="text-align:left"><span class="muted">مانده</span><b>${money(db.budget-exp)}</b></div></div><div class="bar"><i style="width:${percent}%;background:${exp>db.budget?'var(--red)':'var(--green)'}"></i></div>`:'<div class="empty">برای این ماه هنوز بودجه تعیین نکرده‌ای.</div>';
$('budgetInput').value=db.budget||'';$('goalInput').value=db.goal||'';$('planReport').textContent=`هدف پس‌انداز: ${money(db.goal)} · درآمد ماه: ${money(inc)} · هزینه ماه: ${money(exp)} · ${db.budget&&exp>db.budget?'هشدار: از بودجه عبور کرده‌ای.':'وضعیت بودجه در محدوده تعیین‌شده است.'}`;
$('accountList').innerHTML=db.accounts.map(a=>`<div class="tx"><div class="ico">▣</div><div class="txmain"><b>${esc(a.name)}</b><small>موجودی فعلی</small></div><div class="txamount">${money(a.balance)}</div></div>`).join('');
$('debtList').innerHTML=db.debts.map(d=>{let rem=d.total-d.paid,p=Math.round(d.paid/d.total*100);return `<div class="tx"><div class="txmain"><b>${esc(d.title)}</b><small>کل ${money(d.total)} · پرداخت‌شده ${money(d.paid)} · سررسید ${jalali(d.due)}</small><div class="bar"><i style="width:${p}%"></i></div></div><div class="txamount red">${money(rem)}</div><button class="link" onclick="payDebt('${d.id}')">پرداخت</button><button class="link" onclick="removeDebt('${d.id}')">×</button></div>`}).join('')||'<div class="empty">بدهی ثبت نشده است.</div>';
$('recurringList').innerHTML=db.recurring.map(r=>`<div class="tx"><div class="txmain"><b>${esc(r.title)}</b><small>${r.type==='income'?'درآمد':'هزینه'} · روز ${nfmt(r.day)} هر ماه</small></div><div class="txamount">${money(r.amount)}</div><button class="link" onclick="removeRecurring('${r.id}')">×</button></div>`).join('')||'<div class="empty">مورد تکرارشونده‌ای ثبت نشده است.</div>';
renderTx();renderExpenses()}
function removeRecurring(id){if(confirm('این مورد تکرارشونده حذف شود؟')){db.recurring=db.recurring.filter(r=>r.id!==id);persist()}}
function backup(){let blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='poshtiban-modiriat-mali.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function restore(e){let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{try{let x=JSON.parse(r.result);if(!Array.isArray(x.accounts)||!Array.isArray(x.transactions))throw 0;if(confirm('اطلاعات فعلی با فایل پشتیبان جایگزین شود؟')){db={...blank(),...x};persist();alert('بازیابی انجام شد.')}}catch{alert('فایل پشتیبان معتبر نیست.')}};r.readAsText(f)}
function resetAll(){if(confirm('تمام اطلاعات برای همیشه از این مرورگر پاک شود؟')){db=blank();persist()}}
processRecurring();render();
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
