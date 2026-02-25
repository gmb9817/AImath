let currentView='home';
let mnInited=false;
let hbInited=false;
let pcInited=false;
let srcImg=null;

function go(v,pushState=true){
  const viewEl=document.getElementById('v-'+v);
  if(!viewEl) return;

  document.querySelectorAll('.view').forEach(el=>el.classList.remove('active'));
  viewEl.classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  const nb=document.querySelector(`.nav-btn[data-v="${v}"]`);
  if(nb) nb.classList.add('active');

  window.scrollTo(0,0);
  currentView=v;
  initToggles(viewEl);

  if(pushState){
    try{history.pushState({view:v},'', '#'+v);}catch(e){}
  }

  if(v==='filter'){
    if(!srcImg){createDefImg();applyF();}
    const st=document.getElementById('up-status');
    if(st && st.textContent.trim()==='') st.textContent='기본 도형 이미지가 적용되었습니다. 직접 업로드하여 변경할 수 있습니다.';
  }
  if(v==='pool'){try{pRst();}catch(e){}}
  if(v==='perceptron'){
    if(!pcInited){pcInited=true;pcInit();}
    else{try{pcUpdate();}catch(e){}}
  }
  if(v==='mnist'){
    if(!mnInited){mnInited=true;mnInit();}
    else{mnRefresh();}
    initToggles(viewEl);
  }
  if(v==='hamming'){
    if(!hbInited){hbInited=true;hbInit();}
    else{hbRefresh();}
    initToggles(viewEl);
  }
  if(v==='conv'){
      requestAnimationFrame(()=>{
      try{ecRender();ecFitCanvas('eye');ecFitCanvas('cnn');}catch(e){}
    });
  }
}
document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>go(b.dataset.v)));

window.addEventListener('popstate',e=>{
  const v=(e.state&&e.state.view)?e.state.view:'home';
  if(document.getElementById('v-'+v)) go(v,false);
  else if(document.getElementById('v-home')) go('home',false);
});


window.addEventListener('beforeunload',e=>{if(currentView!=='home'){e.preventDefault();}});

function htab(n,el){document.querySelectorAll('#v-hamming .tab').forEach(t=>t.classList.remove('on'));el.classList.add('on');document.querySelectorAll('#v-hamming .tpanel').forEach(p=>p.classList.remove('on'));document.getElementById('ht'+n).classList.add('on');}
function ctab(n,el){document.querySelectorAll('#v-conv .tab').forEach(t=>t.classList.remove('on'));el.classList.add('on');document.querySelectorAll('#v-conv .tpanel').forEach(p=>p.classList.remove('on'));document.getElementById('ct'+n).classList.add('on');}
function ptab(n,el){document.querySelectorAll('#v-pool .tab').forEach(t=>t.classList.remove('on'));el.classList.add('on');document.querySelectorAll('#v-pool .tpanel').forEach(p=>p.classList.remove('on'));document.getElementById('pt'+n).classList.add('on');}


function initToggles(root){
  const scope=root||document;
  scope.querySelectorAll('.card,.info').forEach(el=>{
    if(el.dataset.tglDone==='1') return;
    if(el.closest && el.closest('[data-no-toggle=\"1\"]')) return;

    const isCard=el.classList.contains('card');

    // 1) try :scope (modern browsers), 2) fallback to direct-child scan (older browsers)
    let head=null;
    try{
      head = isCard ? el.querySelector(':scope>h3,:scope>h4') : el.querySelector(':scope>strong');
    }catch(e){
      head = null;
    }
    if(!head){
      for(let i=0;i<el.children.length;i++){
        const ch=el.children[i];
        const t=ch.tagName;
        if(isCard){
          if(t==='H3' || t==='H4'){ head=ch; break; }
        }else{
          if(t==='STRONG'){ head=ch; break; }
        }
      }
    }
    if(!head) return;

    // 인터랙티브 요소가 있으면 자동 토글로 감싸지 않습니다.
    if(el.querySelector('button,input,select,textarea,canvas,video,audio,.tabs,.btn-row,.upz')) return;

    const body=document.createElement('div');
    body.className='tgl-body';
    let node=head.nextSibling;
    while(node){
      const next=node.nextSibling;
      body.appendChild(node);
      node=next;
    }
    el.appendChild(body);
    head.classList.add('tgl-head');
    head.addEventListener('click',()=>{
      head.classList.toggle('open');
      body.classList.toggle('open');
    });
    el.dataset.tglDone='1';
  });
}

let mnDS=null;
let mnLabel=0;
let mnDraw=false;
let mnLast=null;

function mnLoad(){
  try{
    const raw=localStorage.getItem('aimath_mnist_dataset_v1');
    if(raw) mnDS=JSON.parse(raw);
  }catch(e){}
  if(!mnDS || !Array.isArray(mnDS.samples)) mnDS={meta:{ver:1,size:28,createdAt:new Date().toISOString()},samples:[]};
}
function mnSave(){
  try{localStorage.setItem('aimath_mnist_dataset_v1', JSON.stringify(mnDS));}catch(e){}
}
function mnInit(){
  mnLoad();

  const labs=document.getElementById('mn-labs');
  if(labs){
    labs.innerHTML='';
    for(let d=0; d<=9; d++){
      const b=document.createElement('button');
      b.type='button';
      b.textContent=String(d);
      b.className=(d===mnLabel)?'on':'';
      b.onclick=()=>{
        mnLabel=d;
        labs.querySelectorAll('button').forEach(x=>x.classList.remove('on'));
        b.classList.add('on');
      };
      labs.appendChild(b);
    }
  }

  const cv=document.getElementById('mn-cv');
  if(cv){
    const ctx=cv.getContext('2d');
    ctx.fillStyle='#fff';
    ctx.fillRect(0,0,cv.width,cv.height);

    const getPos=(e)=>{
      const r=cv.getBoundingClientRect();
      const x=(e.clientX - r.left) * (cv.width / r.width);
      const y=(e.clientY - r.top) * (cv.height / r.height);
      return {x,y};
    };

    const down=(e)=>{
      mnDraw=true;
      cv.setPointerCapture?.(e.pointerId);
      mnLast=getPos(e);
    };
    const move=(e)=>{
      if(!mnDraw) return;
      const p=getPos(e);
      ctx.strokeStyle='#000';
      ctx.lineWidth=18;
      ctx.lineCap='round';
      ctx.lineJoin='round';
      ctx.beginPath();
      ctx.moveTo(mnLast.x,mnLast.y);
      ctx.lineTo(p.x,p.y);
      ctx.stroke();
      mnLast=p;
      mnUpdatePreview();
    };
    const up=()=>{
      mnDraw=false; mnLast=null;
      mnUpdatePreview();
    };

    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('pointerleave', up);
  }

  mnRefresh();
  mnUpdatePreview();
}

function mnClear(){
  const cv=document.getElementById('mn-cv'); if(!cv) return;
  const ctx=cv.getContext('2d');
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,cv.width,cv.height);
  mnUpdatePreview();
}
function mnReset(){
  mnDS={meta:{ver:1,size:28,createdAt:new Date().toISOString()},samples:[]};
  mnSave();
  mnRefresh();
  mnClear();
  const st=document.getElementById('mn-stat'); if(st) st.textContent='샘플 0개';
}
function mnRaster28(){
  const cv=document.getElementById('mn-cv'); if(!cv) return null;
  const off=document.createElement('canvas');
  off.width=28; off.height=28;
  const octx=off.getContext('2d');
  octx.fillStyle='#fff';
  octx.fillRect(0,0,28,28);
  octx.drawImage(cv,0,0,28,28);
  const img=octx.getImageData(0,0,28,28).data;
  const px=new Array(28*28);
  let ink=0;
  for(let i=0;i<28*28;i++){
    const r=img[i*4], g=img[i*4+1], b=img[i*4+2];
    const gray=Math.round((r+g+b)/3);
      const v=255-gray;
    px[i]=v;
    if(v>10) ink++;
  }
  if(ink<8) return null; // too empty
  return {label:mnLabel,pixels:px};
}
function mnUpdatePreview(){
  const samp=mnRaster28();
  const pv=document.getElementById('mn-prev');
  if(!pv) return;
  const ctx=pv.getContext('2d');
  const W=pv.width,H=pv.height;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H);

  if(!samp){
    ctx.fillStyle='rgba(0,0,0,0.35)';
    ctx.font='700 14px Pretendard';
    ctx.fillText('그려보세요', 16, 28);
    return;
  }
  const img=ctx.createImageData(28,28);
  for(let i=0;i<28*28;i++){
    const v=samp.pixels[i]; // 0..255
    img.data[i*4]=v;
    img.data[i*4+1]=v;
    img.data[i*4+2]=v;
    img.data[i*4+3]=255;
  }
  const off=document.createElement('canvas');
  off.width=28; off.height=28;
  off.getContext('2d').putImageData(img,0,0);
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(off,0,0,W,H);
}

function mnAdd(){
  mnLoad();
  const samp=mnRaster28();
  const st=document.getElementById('mn-stat');
  if(!samp){
    const msg=document.getElementById('mn-stat');
    if(msg) msg.textContent='샘플 추가 실패 (너무 비어있음)';
    return;
  }
  mnDS.samples.push({label:samp.label,pixels:samp.pixels});
  mnSave();
  mnRefresh();
  mnClear();
  if(st) st.textContent=`샘플 ${mnDS.samples.length}개`;
}
function mnRemove(i){
  mnLoad();
  if(i<0||i>=mnDS.samples.length) return;
  mnDS.samples.splice(i,1);
  mnSave();
  mnRefresh();
}
function mnRefresh(){
  mnLoad();
  const list=document.getElementById('mn-list');
  const st=document.getElementById('mn-stat');
  if(st) st.textContent=`샘플 ${mnDS.samples.length}개`;

  if(!list) return;
  list.innerHTML='';
  mnDS.samples.slice().reverse().forEach((s,revIdx)=>{
    const idx = mnDS.samples.length-1-revIdx;
    const box=document.createElement('div');
    box.className='mn-smp';
    box.innerHTML=`<canvas width="56" height="56"></canvas>
      <div class="row"><span class="tag">y=${s.label}</span>
      <button class="rm" title="삭제" onclick="mnRemove(${idx})">✕</button></div>`;
    const cv=box.querySelector('canvas');
    const ctx=cv.getContext('2d');
    const img=ctx.createImageData(28,28);
    for(let i=0;i<28*28;i++){
      const v=s.pixels[i];
      img.data[i*4]=v; img.data[i*4+1]=v; img.data[i*4+2]=v; img.data[i*4+3]=255;
    }
    const off=document.createElement('canvas');
    off.width=28; off.height=28;
    off.getContext('2d').putImageData(img,0,0);
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(off,0,0,56,56);
    list.appendChild(box);
  });
}

function mnExport(){
  mnLoad();
  const out={
    meta:{...mnDS.meta, exportedAt:new Date().toISOString()},
    samples: mnDS.samples
  };
  const blob=new Blob([JSON.stringify(out)],{type:'application/json'});
  const a=document.createElement('a');
  const ts=new Date().toISOString().replace(/[:.]/g,'-');
  a.download=`mn_dataset_${ts}.json`;
  a.href=URL.createObjectURL(blob);
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},0);
}


let hA=[1,0,1,1,0,0,1,0,1,0],hB=[1,1,0,1,0,1,1,0,0,1];
function rHD(){
  const box=document.getElementById('hd-box');box.innerHTML='';
  const mkRow=(lbl,arr,tog)=>{
    const r=document.createElement('div');r.style.cssText='display:flex;align-items:center;gap:2px;';
    const lb=document.createElement('span');lb.style.cssText='font-family:var(--mono);font-size:0.62rem;color:var(--muted);width:2.2rem;text-align:right;margin-right:0.3rem;';lb.textContent=lbl;r.appendChild(lb);
    arr.forEach((v,i)=>{const e=document.createElement('span');e.style.cssText=`display:inline-flex;align-items:center;justify-content:center;width:2.1rem;height:2.1rem;background:${v?'var(--fg)':'var(--card)'};color:${v?'var(--bg)':'var(--fg)'};font-family:var(--mono);font-size:0.8rem;font-weight:600;border-radius:4px;cursor:pointer;transition:all 0.12s;border:1px solid var(--border);`;e.textContent=v;if(tog)e.onclick=()=>{arr[i]^=1;rHD();};r.appendChild(e);});
    return r;
  };
  box.appendChild(mkRow('A',hA,true));box.appendChild(mkRow('B',hB,true));
  const xr=document.createElement('div');xr.style.cssText='display:flex;align-items:center;gap:2px;';
  const xl=document.createElement('span');xl.style.cssText='font-family:var(--mono);font-size:0.62rem;color:var(--muted);width:2.2rem;text-align:right;margin-right:0.3rem;';xl.textContent='A⊕B';xr.appendChild(xl);
  let d=0;for(let i=0;i<hA.length;i++){const x=hA[i]^hB[i];d+=x;const e=document.createElement('span');e.style.cssText=`display:inline-flex;align-items:center;justify-content:center;width:2.1rem;height:2.1rem;background:${x?'var(--red)':'var(--card)'};color:${x?'#fff':'var(--muted)'};font-family:var(--mono);font-size:0.8rem;font-weight:600;border-radius:4px;border:1px solid ${x?'var(--red)':'var(--border)'};`;e.textContent=x;xr.appendChild(e);}
  box.appendChild(xr);document.getElementById('hd-res').textContent=`해밍 거리 = ${d}`;
}
rHD();

let bSz=6,uBmp=[],isDraw=false,dVal=1;
let curRefDigit=null;
let hGuess=new Array(10).fill('');
const REFS={};
REFS[6]=[
  [0,1,1,1,1,0,1,1,0,0,1,1,1,0,0,0,0,1,1,0,0,0,0,1,1,1,0,0,1,1,0,1,1,1,1,0],
  [0,0,1,1,0,0,0,1,1,1,0,0,1,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1,1,1,1,1],
  [0,1,1,1,1,0,1,0,0,0,0,1,0,0,0,1,1,0,0,0,1,1,0,0,0,1,1,0,0,0,1,1,1,1,1,1],
  [1,1,1,1,1,0,0,0,0,0,1,1,0,0,1,1,1,0,0,0,0,0,1,1,0,0,0,0,1,1,1,1,1,1,1,0],
  [1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1,1,1,1,1,1,0,0,0,1,0,0,0,0,0,1,0,0],
  [1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,1,0,0,0,0,0,1,1,1,1,1,1,0],
  [0,1,1,1,1,0,1,1,0,0,0,0,1,1,1,1,1,0,1,0,0,0,0,1,1,1,0,0,1,1,0,1,1,1,1,0],
  [1,1,1,1,1,1,0,0,0,0,1,1,0,0,0,1,1,0,0,0,1,1,0,0,0,0,1,0,0,0,0,0,1,0,0,0],
  [0,1,1,1,1,0,1,1,0,0,1,1,0,1,1,1,1,0,1,1,0,0,1,1,1,1,0,0,1,1,0,1,1,1,1,0],
  [0,1,1,1,1,0,1,1,0,0,1,1,1,0,0,0,0,1,0,1,1,1,1,1,0,0,0,0,1,1,0,1,1,1,1,0],
];
REFS[8]=[
  [0,0,1,1,1,1,0,0,0,1,1,0,0,1,1,0,1,1,0,0,0,0,1,1,1,1,0,0,0,0,1,1,1,1,0,0,0,0,1,1,1,1,0,0,0,0,1,1,0,1,1,0,0,1,1,0,0,0,1,1,1,1,0,0],
  [0,0,0,1,1,0,0,0,0,0,1,1,1,0,0,0,0,1,1,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,1,1,1,1,1,0],
  [0,0,1,1,1,1,0,0,0,1,1,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,0,0,0,1,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,1,1,1,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,1,0,0,0,1,1,0,0,0,1,1,1,1,0,0],
  [0,0,0,0,1,1,0,0,0,0,0,1,1,1,0,0,0,0,1,1,0,1,0,0,0,1,1,0,0,1,0,0,1,1,0,0,0,1,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0],
  [0,1,1,1,1,1,1,0,0,1,1,0,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,1,0,0,0,1,1,0,0,0,1,1,1,1,0,0],
  [0,0,1,1,1,1,0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,1,1,1,1,0,0,1,1,0,0,0,1,1,0,1,1,0,0,0,1,1,0,0,1,1,0,0,1,1,0,0,0,1,1,1,1,0,0],
  [0,1,1,1,1,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0,0,0,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0],
  [0,0,1,1,1,1,0,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,0,1,1,1,1,0,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,0,1,1,1,1,0,0],
  [0,0,1,1,1,1,0,0,0,1,1,0,0,1,1,0,0,1,1,0,0,1,1,0,0,0,1,1,1,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0,1,1,1,0,0,0],
];
REFS[12]=(()=>{const r=[];for(let d=0;d<10;d++){const s=REFS[6][d],o=[];for(let y=0;y<6;y++){const r1=[],r2=[];for(let x=0;x<6;x++){const v=s[y*6+x];r1.push(v,v);r2.push(v,v);}o.push(...r1,...r2);}r.push(o);}return r;})();

function setSz(n,el){
  bSz=n;
  uBmp=Array(n*n).fill(0);
  hGuess=new Array(10).fill('');
  isDraw=false;
  dVal=1;
  curRefDigit=null;
  document.querySelectorAll('.bsz').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  rBmp();
  initHGuessUI();
  document.getElementById('hbest').textContent='';
  document.getElementById('hoverlap').innerHTML='';
  document.getElementById('refpreview').innerHTML='';
  const ov=document.getElementById('ovpreview');
  if(ov) ov.innerHTML='';
  rRef();
}

function rBmp(){
  const g=document.getElementById('ubmp');const cs=bSz<=6?'2rem':bSz<=8?'1.6rem':'1.2rem';
  g.style.gridTemplateColumns=`repeat(${bSz},1fr)`;g.innerHTML='';
  for(let i=0;i<bSz*bSz;i++){const c=document.createElement('div');c.className='bc'+(uBmp[i]?' on':'');c.style.width=cs;c.style.height=cs;
    c.dataset.idx=i;
    c.addEventListener('mousedown',e=>{e.preventDefault();isDraw=true;dVal=uBmp[i]?0:1;uBmp[i]=dVal;rBmpVisual();});
    c.addEventListener('mouseenter',()=>{if(isDraw){uBmp[i]=dVal;rBmpVisual();}});
    g.appendChild(c);}
  bindTouch();
}

function rBmpVisual(){
  const cells=document.getElementById('ubmp').children;
  for(let i=0;i<cells.length;i++){cells[i].className='bc'+(uBmp[i]?' on':'');}
  renderOverlapPreview();
}

function bindTouch(){
  const g=document.getElementById('ubmp');
  g.ontouchstart=e=>{
    e.preventDefault();
    const t=e.touches[0];
    const el=document.elementFromPoint(t.clientX,t.clientY);
    if(el&&el.dataset&&el.dataset.idx!==undefined){
      const idx=parseInt(el.dataset.idx);
      isDraw=true;dVal=uBmp[idx]?0:1;uBmp[idx]=dVal;rBmpVisual();
    }
  };
  g.ontouchmove=e=>{
    e.preventDefault();
    if(!isDraw)return;
    const t=e.touches[0];
    const el=document.elementFromPoint(t.clientX,t.clientY);
    if(el&&el.dataset&&el.dataset.idx!==undefined){
      const idx=parseInt(el.dataset.idx);
      if(uBmp[idx]!==dVal){uBmp[idx]=dVal;rBmpVisual();}
    }
  };
  g.ontouchend=()=>{isDraw=false;};
}
document.addEventListener('mouseup',()=>{isDraw=false;});

function rRef(){
  const b=document.getElementById('rbtn');
  if(!b) return;
  b.innerHTML='';
  for(let d=0;d<10;d++){
    const e=document.createElement('button');
    e.className='btn'+(curRefDigit===d?' pri':'');
    e.textContent=d;
    e.style.padding='0.35rem 0.55rem';
    e.onclick=()=>showRefPreview(d);
    b.appendChild(e);
  }
}

function renderOverlapPreview(){
  const box=document.getElementById('ovpreview');
  if(!box) return;
  if(curRefDigit===null || !REFS[bSz] || !REFS[bSz][curRefDigit]){box.innerHTML='';return;}
  const ref=REFS[bSz][curRefDigit];
  const cs=bSz<=6?'1.2rem':bSz<=8?'1rem':'0.7rem';
  let html=`<p class="mat-label" style="margin-bottom:0.3rem;">겹친 부분 (내 그림 ∧ 참조)</p>`;
  html+=`<div class="bmp" style="grid-template-columns:repeat(${bSz},1fr);cursor:default;">`;
  for(let i=0;i<bSz*bSz;i++){
    const on=(uBmp[i]===1 && ref[i]===1);
    html+=`<div class="bc${on?' on':''}" style="width:${cs};height:${cs};pointer-events:none;"></div>`;
  }
  html+=`</div>`;
  box.innerHTML=html;
}

function showRefPreview(digit){
  curRefDigit=digit;
  const ref=REFS[bSz][digit];
  const cs=bSz<=6?'1.2rem':bSz<=8?'1rem':'0.7rem';
  const box=document.getElementById('refpreview');
  let html=`<p class="mat-label" style="margin-bottom:0.3rem;">참조: 숫자 ${digit}</p>`;
  html+=`<div class="bmp" style="grid-template-columns:repeat(${bSz},1fr);cursor:default;">`;
  for(let i=0;i<bSz*bSz;i++){
    html+=`<div class="bc${ref[i]?' on':''}" style="width:${cs};height:${cs};pointer-events:none;"></div>`;
  }
  html+=`</div>`;
  box.innerHTML=html;
  renderOverlapPreview();
  rRef();
}

function hbInit(){
  if(!uBmp || !uBmp.length) uBmp = Array(bSz*bSz).fill(0);
  try{rBmp();rRef();}catch(e){}
  try{initHGuessUI();}catch(e){}
}
function hbRefresh(){
  try{rBmp();rRef();}catch(e){}
  try{initHGuessUI();}catch(e){}
}



function initHGuessUI(){
  const box=document.getElementById('hbars');
  if(!box) return;
  box.innerHTML='';
  for(let d=0; d<10; d++){
    const row=document.createElement('div');
    row.className='hb';
    row.dataset.digit=d;
    row.innerHTML = `
      <span class="dl">${d}</span>
      <div class="tk"><div class="fl" style="width:0%"></div></div>
      <input class="hguess" type="number" inputmode="numeric" placeholder="내 답" aria-label="digit ${d} hamming guess">
      <span class="dv"></span>
    `;
    box.appendChild(row);
  }
  const hint=document.createElement('p');
  hint.style.fontSize='0.72rem';
  hint.style.color='var(--muted)';
  hint.style.marginTop='0.5rem';
  hint.textContent='각 숫자(0~9)와의 해밍 거리를 직접 계산해 입력한 뒤, “해밍 거리 계산”을 눌러 채점해보세요.';
  box.appendChild(hint);

  box.querySelectorAll('input.hguess').forEach(inp=>{
    const d=parseInt(inp.parentElement.dataset.digit);
    inp.value = (hGuess[d] ?? '');
    inp.addEventListener('input', ()=>{
      hGuess[d]=inp.value;
      const dl=inp.parentElement.querySelector('.dl');
      if(dl) dl.style.color='';
    });
  });
}
function clrBmp(){
  uBmp=Array(bSz*bSz).fill(0);
  rBmp();
  try{initHGuessUI();}catch(e){}
  document.getElementById('hbest').textContent='';
  document.getElementById('hoverlap').innerHTML='';
  document.getElementById('refpreview').innerHTML='';
  const ov=document.getElementById('ovpreview');
  if(ov) ov.innerHTML='';
  curRefDigit=null;
  rRef();
}

function calcH(){
  const refs=REFS[bSz];
  if(!refs) return;
  const tot=bSz*bSz;

  const ds=refs.map((ref,i)=>{
    let d=0;
    for(let j=0;j<tot;j++) d+=(uBmp[j]^ref[j]);
    return {digit:i,dist:d,sim:((tot-d)/tot*100).toFixed(1)};
  });
  const mx=Math.max(...ds.map(d=>d.dist),1);
  const mn=Math.min(...ds.map(d=>d.dist));

  const box=document.getElementById('hbars');
  if(!box) return;

  const guessMap={};
  box.querySelectorAll('.hb').forEach(row=>{
    const digit=parseInt(row.dataset.digit);
    const inp=row.querySelector('input.hguess');
    if(inp) guessMap[digit]=inp.value;
  });

  box.innerHTML='';
  ds.forEach(({digit,dist,sim})=>{
    const e=document.createElement('div');
    e.className='hb';
    e.dataset.digit=digit;

    const g=(guessMap[digit] ?? '').toString().trim();
    const gNum = g==='' ? null : Number(String(g).trim());
    const isOk = (gNum!==null && Number.isFinite(gNum) && gNum===dist);

    e.innerHTML = `
      <span class="dl" style="${gNum===null?'':(isOk?'color:var(--green);':'color:var(--red);')}">${digit}</span>
      <div class="tk"><div class="fl ${dist===mn?'best':''}" style="width:${(dist/mx*100)}%"></div></div>
      <input class="hguess" type="number" inputmode="numeric" placeholder="내 답" value="${g}">
      <span class="dv">${dist} (${sim}%)</span>
    `;
    box.appendChild(e);
  });

  box.querySelectorAll('input.hguess').forEach(inp=>{
    const d=parseInt(inp.parentElement.dataset.digit);
    inp.addEventListener('input', ()=>{
      hGuess[d]=inp.value;
      const dl=inp.parentElement.querySelector('.dl');
      if(dl) dl.style.color='';
    });
  });

  const best=ds.reduce((a,b)=>a.dist<b.dist?a:b);
  const bestEl=document.getElementById('hbest');
  if(bestEl) bestEl.textContent=`가장 유사: ${best.digit} (거리 ${best.dist}, 유사도 ${best.sim}%)`;

  const ovBox=document.getElementById('hoverlap');
  if(ovBox){
    const cs=bSz<=6?'1.05rem':bSz<=8?'0.92rem':'0.72rem';

    let html=`<p class="mat-label" style="margin-bottom:0.45rem;">내 그림 vs 모든 숫자 겹침 비교</p>`;
    html+=`<div style="display:flex;flex-wrap:wrap;gap:0.8rem;align-items:flex-start;">`;

    ds.forEach(({digit,dist,sim})=>{
      const ref=refs[digit];
      const isBest = digit===best.digit;
      html+=`<div style="background:var(--bg);border:1px solid ${isBest?'var(--fg)':'var(--border)'};border-radius:var(--radius);padding:0.65rem;flex:1 1 230px;max-width:300px;">`;
      html+=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.45rem;">`;
      html+=`<span style="font-family:var(--mono);font-weight:800;color:${isBest?'var(--fg)':'var(--muted)'};">숫자 ${digit}${isBest?' · BEST':''}</span>`;
      html+=`<span style="font-family:var(--mono);font-size:0.72rem;color:var(--muted);">거리 ${dist} · ${sim}%</span>`;
      html+=`</div>`;
      html+=`<div class="ovlap" style="grid-template-columns:repeat(${bSz},1fr);">`;
      for(let i=0;i<tot;i++){
        const u=uBmp[i], r=ref[i];
        let cls;
        if(u===1&&r===1) cls='both';
        else if(u===0&&r===0) cls='match';
        else if(u===1&&r===0) cls='only-user';
        else cls='only-ref';
        html+=`<div class="oc ${cls}" style="width:${cs};height:${cs};"></div>`;
      }
      html+=`</div></div>`;
    });

    html+=`</div>`;
    html+=`<div style="display:flex;gap:0.8rem;margin-top:0.6rem;flex-wrap:wrap;">`;
    html+=`<span style="font-size:0.62rem;color:var(--muted);display:flex;align-items:center;gap:0.25rem;"><span style="display:inline-block;width:0.6rem;height:0.6rem;background:var(--fg);border-radius:2px;"></span>둘 다 1</span>`;
    html+=`<span style="font-size:0.62rem;color:var(--muted);display:flex;align-items:center;gap:0.25rem;"><span style="display:inline-block;width:0.6rem;height:0.6rem;background:var(--card);border:1px solid var(--border);border-radius:2px;"></span>둘 다 0</span>`;
    html+=`<span style="font-size:0.62rem;color:var(--muted);display:flex;align-items:center;gap:0.25rem;"><span style="display:inline-block;width:0.6rem;height:0.6rem;background:var(--red);opacity:0.7;border-radius:2px;"></span>내 그림에만</span>`;
    html+=`<span style="font-size:0.62rem;color:var(--muted);display:flex;align-items:center;gap:0.25rem;"><span style="display:inline-block;width:0.6rem;height:0.6rem;background:var(--blue);opacity:0.7;border-radius:2px;"></span>참조에만</span>`;
    html+=`</div>`;
    ovBox.innerHTML=html;
  }
}
function mkEG(id,data,rows,cols,onCh){
  const g=document.getElementById(id);g.innerHTML='';g.style.gridTemplateColumns=`repeat(${cols},1fr)`;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const cell=document.createElement('div');cell.className='ec';
    const inp=document.createElement('input');inp.type='number';inp.value=data[r][c];
    inp.addEventListener('change',()=>{data[r][c]=parseInt(inp.value)||0;if(onCh)onCh();});
    inp.addEventListener('focus',()=>inp.select());
    cell.appendChild(inp);g.appendChild(cell);
  }
}

let mI=[[1,2,0,1],[0,1,3,2],[1,0,2,1],[2,1,0,3]],mK=[[1,0,-1],[0,1,0],[-1,0,1]],mO=[[0,0],[0,0]];

function newMan(){
  for(let r=0;r<4;r++)for(let c=0;c<4;c++)mI[r][c]=Math.floor(Math.random()*5);
  const ks=[[[1,0,-1],[0,1,0],[-1,0,1]],[[0,-1,0],[-1,5,-1],[0,-1,0]],[[1,1,1],[0,0,0],[-1,-1,-1]]];
  const p=ks[Math.floor(Math.random()*ks.length)];for(let r=0;r<3;r++)for(let c=0;c<3;c++)mK[r][c]=p[r][c];
  mO=[[0,0],[0,0]];mkEG('mi',mI,4,4);mkEG('mk',mK,3,3);mkEG('mo',mO,2,2);
  document.getElementById('mres').style.display='none';document.getElementById('msol').style.display='none';
}

function chkMan(){
  const cor=[];
  for(let r=0;r<2;r++){cor.push([]);for(let c=0;c<2;c++){let s=0;for(let kr=0;kr<3;kr++)for(let kc=0;kc<3;kc++)s+=mI[r+kr][c+kc]*mK[kr][kc];cor[r].push(s);}}
  let ok=true;const det=[];
  for(let r=0;r<2;r++)for(let c=0;c<2;c++){
    const right=mO[r][c]===cor[r][c];if(!right)ok=false;
    let t=[];for(let kr=0;kr<3;kr++)for(let kc=0;kc<3;kc++)t.push(`${mI[r+kr][c+kc]}×(${mK[kr][kc]})`);
    det.push(`위치(${r},${c}): ${t.join(' + ')} = ${cor[r][c]}${right?'':' (입력값: '+mO[r][c]+')'}`);
  }
  const res=document.getElementById('mres');res.style.display='block';
  res.innerHTML=ok?'<strong>정답입니다.</strong>':'<strong>일부 틀렸습니다.</strong> 아래 풀이를 확인하세요.';
  res.style.borderLeftColor=ok?'var(--green)':'var(--red)';
  const sol=document.getElementById('msol');sol.style.display='block';
  sol.innerHTML=`<div class="card"><h3>풀이 과정</h3>${det.map(d=>'<p style="font-size:0.8rem;color:var(--muted);font-family:var(--mono);margin:0.25rem 0;">'+d+'</p>').join('')}</div>`;
}
newMan();

const AI=[[0,0,0,0,0],[0,1,1,1,0],[0,1,0,1,0],[0,1,1,1,0],[0,0,0,0,0]];
const AK=[[1,0,1],[0,1,0],[1,0,1]];
let ap=-1,ar=Array(9).fill('?');

function bldA(){
  ['ai','ak','ao'].forEach(id=>document.getElementById(id).innerHTML='');
  for(let r=0;r<5;r++)for(let c=0;c<5;c++){const e=document.createElement('div');e.className='mc';e.id=`ai${r}${c}`;e.textContent=AI[r][c];document.getElementById('ai').appendChild(e);}
  for(let r=0;r<3;r++)for(let c=0;c<3;c++){const e=document.createElement('div');e.className='mc';e.textContent=AK[r][c];document.getElementById('ak').appendChild(e);}
  for(let i=0;i<9;i++){const e=document.createElement('div');e.className='mc';e.id=`ao${i}`;e.textContent=ar[i];document.getElementById('ao').appendChild(e);}
}
bldA();



function aStep(){
  ap++;if(ap>=9){ap=8;return;}
  const row=Math.floor(ap/3),col=ap%3;
  for(let r=0;r<5;r++)for(let c=0;c<5;c++)document.getElementById(`ai${r}${c}`).className='mc';
  let sum=0,terms=[];
  for(let kr=0;kr<3;kr++)for(let kc=0;kc<3;kc++){
    const ir=row+kr,ic=col+kc;
    document.getElementById(`ai${ir}${ic}`).className='mc win';
  }
  for(let kr=0;kr<3;kr++)for(let kc=0;kc<3;kc++){
    const ir=row+kr,ic=col+kc;
    const kv=AK[kr][kc];
    if(kv!==0) document.getElementById(`ai${ir}${ic}`).className='mc win-active';
    const p=AI[ir][ic]*kv;sum+=p;terms.push(`(${AI[ir][ic]}×${kv})`);
  }
  ar[ap]=sum;
  for(let i=0;i<9;i++){const e=document.getElementById(`ao${i}`);e.textContent=ar[i];e.className=i===ap?'mc res':ar[i]!=='?'?'mc done':'mc';}
  document.getElementById('ast').textContent=`위치 (${row}, ${col}) → ${sum}`;
  document.getElementById('acalc').innerHTML=`<strong>계산:</strong> ${terms.join(' + ')} = <strong>${sum}</strong><br><span style="font-size:0.65rem;">진한 색 = 필터값이 0이 아닌 곳 (실제 곱셈 발생) · 연한 색 = 필터값 0 (곱해도 0)</span>`;
}

let aIv=null;
function aAuto(){if(aIv){clearInterval(aIv);aIv=null;}aReset();let s=0;aIv=setInterval(()=>{aStep();s++;if(s>=9){clearInterval(aIv);aIv=null;}},800);}
function aReset(){if(aIv){clearInterval(aIv);aIv=null;}ap=-1;ar=Array(9).fill('?');bldA();document.getElementById('ast').textContent='';document.getElementById('acalc').innerHTML='시작 버튼을 눌러 연산 과정을 확인하세요.';}

const FL={
  'Identity':{k:[[0,0,0],[0,1,0],[0,0,0]],d:'원본 그대로 출력합니다.'},
  'Box Blur':{k:[[1,1,1],[1,1,1],[1,1,1]],d:'주변 9픽셀 평균으로 흐리게 합니다.',n:9},
  'Sobel X':{k:[[-1,0,1],[-2,0,2],[-1,0,1]],d:'세로선(수직 경계)을 검출합니다.'},
  'Sobel Y':{k:[[-1,-2,-1],[0,0,0],[1,2,1]],d:'가로선(수평 경계)을 검출합니다.'},
  'Sharpen':{k:[[0,-1,0],[-1,5,-1],[0,-1,0]],d:'경계를 또렷하게 선명화합니다.'},
  'Edge':{k:[[-1,-1,-1],[-1,8,-1],[-1,-1,-1]],d:'윤곽선만 추출합니다.'},
};
let aF='Identity',cK=[[0,0,0],[0,1,0],[0,0,0]];
'Identity',cK=[[0,0,0],[0,1,0],[0,0,0]];

function bldFC(){
  const box=document.getElementById('fc');box.innerHTML='';
  Object.keys(FL).forEach(n=>{const ch=document.createElement('button');ch.className='chip'+(n===aF?' on':'');ch.textContent=n;
    ch.onclick=()=>{aF=n;document.querySelectorAll('#fc .chip').forEach(c=>c.classList.remove('on'));ch.classList.add('on');cK=FL[n].k.map(r=>[...r]);rFK();applyF();};
    box.appendChild(ch);});
}
function rFK(){
  mkEG('fk',cK,3,3);
  const f=FL[aF];
  const m=document.getElementById('fmult');
  if(m) m.textContent = (f && f.n) ? `1/${f.n} ×` : '';
  document.getElementById('fd').textContent=f?f.d:'커스텀 커널';
}
function applyCustom(){aF='Custom';document.querySelectorAll('#fc .chip').forEach(c=>c.classList.remove('on'));document.getElementById('fd').textContent='사용자 정의 커널 적용';applyF();}

function createDefImg(){
  const cv=document.getElementById('fin'),ctx=cv.getContext('2d'),W=240;
  ctx.fillStyle='#e8e0d6';ctx.fillRect(0,0,W,W);
  ctx.fillStyle='#3a342e';ctx.beginPath();ctx.arc(120,75,45,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#78726a';ctx.fillRect(35,155,70,55);
  ctx.fillStyle='#a89888';ctx.beginPath();ctx.moveTo(180,210);ctx.lineTo(145,155);ctx.lineTo(215,155);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#1a1714';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(25,25);ctx.lineTo(70,70);ctx.stroke();
  ctx.beginPath();ctx.moveTo(165,25);ctx.lineTo(215,25);ctx.stroke();ctx.beginPath();ctx.moveTo(190,15);ctx.lineTo(190,55);ctx.stroke();
  for(let i=0;i<10;i++){ctx.fillStyle='#1a1714';ctx.beginPath();ctx.arc(25+i*21,120,3,0,Math.PI*2);ctx.fill();}
  srcImg=ctx.getImageData(0,0,W,W);
}

function loadImg(file){
  const reader=new FileReader();reader.onload=e=>{const img=new Image();img.onload=()=>{
    const cv=document.getElementById('fin'),ctx=cv.getContext('2d');ctx.clearRect(0,0,240,240);
    const sc=Math.min(240/img.width,240/img.height),w=img.width*sc,h=img.height*sc;
    ctx.fillStyle='#e8e0d6';ctx.fillRect(0,0,240,240);ctx.drawImage(img,(240-w)/2,(240-h)/2,w,h);
    srcImg=ctx.getImageData(0,0,240,240);applyF();
    document.getElementById('up-status').textContent='이미지가 적용되었습니다. (' +file.name+')';
    document.getElementById('upz').style.borderColor='var(--green)';
    setTimeout(()=>{document.getElementById('upz').style.borderColor='';},2000);
  };img.src=e.target.result;};reader.readAsDataURL(file);
}

const uz=document.getElementById('upz'),fi=document.getElementById('fup');
uz.onclick=()=>fi.click();fi.onchange=e=>{if(e.target.files[0])loadImg(e.target.files[0]);};
uz.ondragover=e=>{e.preventDefault();uz.classList.add('dg');};uz.ondragleave=()=>uz.classList.remove('dg');
uz.ondrop=e=>{e.preventDefault();uz.classList.remove('dg');if(e.dataTransfer.files[0])loadImg(e.dataTransfer.files[0]);};

function applyF(){
  if(!srcImg)return;const k=cK,f=FL[aF],norm=f&&f.n?f.n:1;
  const W=srcImg.width,H=srcImg.height,oc=document.getElementById('fout'),octx=oc.getContext('2d'),out=octx.createImageData(W,H);
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
    let r=0,g=0,b=0;
    for(let ky=-1;ky<=1;ky++)for(let kx=-1;kx<=1;kx++){const idx=((y+ky)*W+(x+kx))*4,w=k[ky+1][kx+1];r+=srcImg.data[idx]*w;g+=srcImg.data[idx+1]*w;b+=srcImg.data[idx+2]*w;}
    const oi=(y*W+x)*4;out.data[oi]=Math.min(255,Math.max(0,r/norm));out.data[oi+1]=Math.min(255,Math.max(0,g/norm));out.data[oi+2]=Math.min(255,Math.max(0,b/norm));out.data[oi+3]=255;
  }
  octx.putImageData(out,0,0);
}

bldFC();rFK();

let pI=[[9,8,4,8],[7,9,4,8],[2,8,9,7],[6,5,9,5]],pP=-1,pR=['?','?','?','?'],pIv=null;

function bldP(){
  mkEG('pi',pI,4,4);
  const o=document.getElementById('po');o.innerHTML='';
  for(let i=0;i<4;i++){const e=document.createElement('div');e.className='mc';e.id=`po${i}`;e.textContent=pR[i];o.appendChild(e);}
}

function pRst(){if(pIv){clearInterval(pIv);pIv=null;}pP=-1;pR=['?','?','?','?'];bldP();document.getElementById('pst').textContent='';}

function pStp(){
  pP++;if(pP>=4){pP=3;return;}
  const sr=pP<2?0:2,sc=pP%2===0?0:2;
  document.querySelectorAll('#pi .ec').forEach(c=>{c.style.background='';c.style.outline='';const inp=c.querySelector('input');if(inp)inp.style.color='';});
  let mx=-Infinity;
  for(let r=sr;r<sr+2;r++)for(let c=sc;c<sc+2;c++){if(pI[r][c]>mx)mx=pI[r][c];}
  for(let r=sr;r<sr+2;r++)for(let c=sc;c<sc+2;c++){
    const idx=r*4+c,cells=document.getElementById('pi').children;
    const isMax=pI[r][c]===mx;
    cells[idx].style.background=isMax?'var(--green)':'var(--fg)';
    cells[idx].querySelector('input').style.color=isMax?'#fff':'var(--bg)';
    if(isMax)cells[idx].style.outline='2px solid var(--green)';
  }
  pR[pP]=mx;
  for(let i=0;i<4;i++){const e=document.getElementById(`po${i}`);e.textContent=pR[i];e.className=i===pP?'mc res':pR[i]!=='?'?'mc done':'mc';}
  document.getElementById('pst').textContent=`${sr}~${sr+1}행, ${sc}~${sc+1}열 → max = ${mx}`;
}

function pAut(){if(pIv){clearInterval(pIv);pIv=null;}pRst();let s=0;pIv=setInterval(()=>{pStp();s++;if(s>=4){clearInterval(pIv);pIv=null;}},1000);}

pRst();

const PC_N=3;
let pcInputs=[1,0.5,-0.3];
let pcWeights=[0.8,-0.5,0.6];
let pcBias=0;
let pcAct='step';
let pcTheta=0;

const PC_ACTS={
  'step':{name:'계단 함수',hasTheta:true},
  'relu':{name:'ReLU',hasTheta:true},
  'sigmoid':{name:'시그모이드',hasTheta:false},
};

function pcInit(){
  const box=document.getElementById('pc-inputs');
  box.innerHTML='';
  for(let i=0;i<PC_N;i++){
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:0.6rem;margin-bottom:0.8rem;';
    row.innerHTML=`
      <span class="mono" style="width:1.5rem;flex-shrink:0;">x${i+1}</span>
      <input type="range" class="ns" id="pc-x${i}" min="-2" max="2" step="0.05" value="${pcInputs[i]}" style="max-width:10rem;flex:1;">
      <span id="pc-xv${i}" style="font-family:var(--mono);font-size:0.78rem;min-width:2.5rem;text-align:right;">${pcInputs[i].toFixed(2)}</span>
      <span class="mono" style="color:var(--muted);flex-shrink:0;">w${i+1}</span>
      <input type="number" id="pc-w${i}" value="${pcWeights[i]}" step="0.1" style="width:4rem;font-family:var(--mono);font-size:0.78rem;padding:0.3rem 0.4rem;border:1px solid var(--border);border-radius:var(--radius);background:var(--card);color:var(--fg);text-align:center;">
    `;
    box.appendChild(row);
    document.getElementById(`pc-x${i}`).addEventListener('input',function(){
      pcInputs[i]=parseFloat(this.value);
      document.getElementById(`pc-xv${i}`).textContent=pcInputs[i].toFixed(2);
      pcUpdate();
    });
    const __wEl=document.getElementById(`pc-w${i}`);
    if(__wEl) __wEl.addEventListener('input',function(){
      pcWeights[i]=parseFloat(this.value)||0;
      pcUpdate();
    });
  }

  const __pcBias=document.getElementById('pc-bias');
  if(__pcBias) __pcBias.addEventListener('input',function(){
    pcBias=parseFloat(this.value);
    document.getElementById('pc-bias-val').textContent=pcBias.toFixed(1);
    pcUpdate();
  });

  const actBox=document.getElementById('pc-act-chips');
  actBox.innerHTML='';
  Object.keys(PC_ACTS).forEach(key=>{
    const ch=document.createElement('button');
    ch.className='chip'+(key===pcAct?' on':'');
    ch.textContent=PC_ACTS[key].name;
    ch.onclick=()=>{
      pcAct=key;
      actBox.querySelectorAll('.chip').forEach(c=>c.classList.remove('on'));
      ch.classList.add('on');
      document.getElementById('pc-threshold-wrap').style.display=PC_ACTS[key].hasTheta?'block':'none';
      pcUpdate();
    };
    actBox.appendChild(ch);
  });

  const __pcTheta=document.getElementById('pc-theta');
  if(__pcTheta) __pcTheta.addEventListener('input',function(){
    pcTheta=parseFloat(this.value);
    document.getElementById('pc-theta-val').textContent=pcTheta.toFixed(1);
    pcUpdate();
  });

  pcUpdate();
}

function pcActivate(x){
  switch(pcAct){
    case 'step': return x>=pcTheta?1:0;
    case 'relu': return x>=pcTheta?x-pcTheta:0;
    case 'sigmoid': return 1/(1+Math.exp(-(x)));
  }
}

function pcUpdate(){
  let wsum=pcBias;
  const terms=[];
  for(let i=0;i<PC_N;i++){
    wsum+=pcInputs[i]*pcWeights[i];
    terms.push(`(${pcInputs[i].toFixed(2)} × ${pcWeights[i].toFixed(1)})`);
  }
  const y=pcActivate(wsum);

  const calcEl=document.getElementById('pc-calc');
  calcEl.innerHTML=
    `가중합: ${terms.join(' + ')} + ${pcBias.toFixed(1)}<br>`+
    `<span style="color:var(--fg);font-weight:600;">x = ${wsum.toFixed(3)}</span><br>`+
    `f(x) = ${pcAct==='step'?'계단(θ='+pcTheta.toFixed(1)+')':pcAct==='relu'?'ReLU(θ='+pcTheta.toFixed(1)+')':'σ(x)'}`;

  document.getElementById('pc-output').textContent=y.toFixed(4);

  pcDrawGraph(wsum,y);
}

function pcDrawGraph(curX,curY){
  const cv=document.getElementById('pc-graph');
  const ctx=cv.getContext('2d');
  const W=cv.width,H=cv.height;
  const pad=40;

  ctx.clearRect(0,0,W,H);

  const xMin=-6,xMax=6,yMin=-0.5,yMax=pcAct==='relu'?4:1.5;

  const toSX=x=>pad+(x-xMin)/(xMax-xMin)*(W-2*pad);
  const toSY=y=>H-pad-(y-yMin)/(yMax-yMin)*(H-2*pad);

  ctx.strokeStyle='#e8e0d6';
  ctx.lineWidth=1;
  for(let gx=Math.ceil(xMin);gx<=Math.floor(xMax);gx++){
    const sx=toSX(gx);
    ctx.beginPath();ctx.moveTo(sx,pad);ctx.lineTo(sx,H-pad);ctx.stroke();
  }
  for(let gy=Math.ceil(yMin*2)/2;gy<=yMax;gy+=0.5){
    const sy=toSY(gy);
    ctx.beginPath();ctx.moveTo(pad,sy);ctx.lineTo(W-pad,sy);ctx.stroke();
  }

  ctx.strokeStyle='#c8b9a6';
  ctx.lineWidth=1.5;
  const ax0=toSY(0);
  ctx.beginPath();ctx.moveTo(pad,ax0);ctx.lineTo(W-pad,ax0);ctx.stroke();
  const ay0=toSX(0);
  ctx.beginPath();ctx.moveTo(ay0,pad);ctx.lineTo(ay0,H-pad);ctx.stroke();

  ctx.fillStyle='#78726a';
  ctx.font='11px "JetBrains Mono"';
  ctx.textAlign='center';
  for(let gx=Math.ceil(xMin);gx<=Math.floor(xMax);gx++){
    if(gx===0)continue;
    ctx.fillText(gx,toSX(gx),ax0+14);
  }
  ctx.textAlign='right';
  for(let gy=0;gy<=yMax;gy+=0.5){
    if(gy===0)continue;
    const sy=toSY(gy);
    if(sy>pad&&sy<H-pad) ctx.fillText(gy.toFixed(1),ay0-6,sy+4);
  }

  if(pcAct!=='sigmoid'){
    const tx=toSX(pcTheta);
    ctx.strokeStyle='#4a6b8a';
    ctx.lineWidth=1;
    ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.moveTo(tx,pad);ctx.lineTo(tx,H-pad);ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='#4a6b8a';
    ctx.textAlign='center';
    ctx.fillText('θ='+pcTheta.toFixed(1),tx,pad-6);
  }

  ctx.strokeStyle='#1a1714';
  ctx.lineWidth=2.5;
  ctx.beginPath();
  let first=true;
  for(let px=pad;px<=W-pad;px++){
    const x=xMin+(px-pad)/(W-2*pad)*(xMax-xMin);
    const y=pcActivate(x);
    const sy=toSY(y);
    if(sy<pad-10||sy>H-pad+10){if(!first){ctx.stroke();ctx.beginPath();first=true;}continue;}
    if(first){ctx.moveTo(px,sy);first=false;}
    else ctx.lineTo(px,sy);
  }
  ctx.stroke();

  const px=toSX(curX),py=toSY(curY);
  ctx.strokeStyle='#b44133';
  ctx.lineWidth=1;
  ctx.setLineDash([3,3]);
  ctx.beginPath();ctx.moveTo(px,ax0);ctx.lineTo(px,py);ctx.stroke();
  ctx.beginPath();ctx.moveTo(ay0,py);ctx.lineTo(px,py);ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle='#b44133';
  ctx.beginPath();ctx.arc(px,py,6,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';
  ctx.beginPath();ctx.arc(px,py,2.5,0,Math.PI*2);ctx.fill();

  ctx.fillStyle='#b44133';
  ctx.font='bold 11px "JetBrains Mono"';
  ctx.textAlign='left';
  ctx.fillText(`(${curX.toFixed(2)}, ${curY.toFixed(4)})`,px+10,py-8);

  ctx.fillStyle='#1a1714';
  ctx.font='bold 12px "Noto Sans KR"';
  ctx.textAlign='left';
  const fname=pcAct==='step'?'계단 함수':pcAct==='relu'?'ReLU':'시그모이드';
  ctx.fillText('f(x) = '+fname,pad+4,pad-8);
}

function ttab(n,el){document.querySelectorAll('#v-text .tab').forEach(t=>t.classList.remove('on'));el.classList.add('on');document.querySelectorAll('#v-text .tpanel').forEach(p=>p.classList.remove('on'));document.getElementById('tt'+n).classList.add('on');}

function ohEncode(){
  const text=document.getElementById('oh-input').value;
  const words=text.trim().replace(/[.,!?;:'"()]/g,'').split(/\s+/).filter(w=>w.length>0);
  if(words.length===0)return;

  const defaultVocab=[];
  words.forEach(w=>{if(!defaultVocab.includes(w))defaultVocab.push(w);});

  const vocab=ohVocabUser||defaultVocab;

  const box=document.getElementById('oh-result');
  const colors=['#b44133','#4a6b8a','#5a7a5a','#8a6a4a','#6a4a8a','#4a8a7a','#8a4a6a','#7a8a4a','#4a5a8a','#8a7a4a'];
  let html='';

  html+=`<div class="card"><h3>단어 집합 (편집 가능)</h3>`;
  html+=`<p style="margin-bottom:0.5rem;">총 ${vocab.length}개 — 단어를 추가/삭제하여 직접 수정할 수 있습니다.</p>`;
  html+=`<div style="display:flex;flex-wrap:wrap;gap:0.3rem;margin-bottom:0.6rem;">`;
  vocab.forEach((w,i)=>{
    const c=colors[i%colors.length];
    html+=`<span style="display:inline-flex;align-items:center;gap:0.25rem;font-family:var(--mono);font-size:0.72rem;padding:0.2rem 0.5rem;border-radius:9999px;background:${c}18;color:${c};border:1px solid ${c}30;">[${i}] ${w}<button onclick="ohRemoveVocab(${i})" style="border:none;background:none;color:${c};cursor:pointer;font-size:0.8rem;padding:0;line-height:1;">×</button></span>`;
  });
  html+=`</div>`;
  html+=`<div style="display:flex;gap:0.3rem;align-items:center;">`;
  html+=`<input type="text" id="oh-vocab-add" placeholder="단어 추가" style="padding:0.35rem 0.6rem;border:1px solid var(--border);border-radius:var(--radius);font-family:var(--mono);font-size:0.75rem;background:var(--bg);color:var(--fg);width:8rem;">`;
  html+=`<button class="btn" onclick="ohAddVocab()">추가</button>`;
  html+=`<button class="btn" onclick="ohResetVocab()">기본값 복원</button>`;
  html+=`</div></div>`;

  html+=`<div class="card"><h3>단어 집합 매칭</h3><p style="margin-bottom:0.5rem;">집합에 포함된 단어만 색상으로 표시됩니다.</p>`;
  html+=`<div style="display:flex;flex-wrap:wrap;gap:0.3rem;">`;
  words.forEach(w=>{
    const vi=vocab.indexOf(w);
    if(vi>=0){
      const c=colors[vi%colors.length];
      html+=`<span style="display:inline-block;padding:0.25rem 0.5rem;border-radius:var(--radius);font-family:var(--mono);font-size:0.82rem;font-weight:600;background:${c}20;color:${c};border:1px solid ${c}40;">${w}</span>`;
    }else{
      html+=`<span style="display:inline-block;padding:0.25rem 0.5rem;border-radius:var(--radius);font-family:var(--mono);font-size:0.82rem;background:var(--card);color:var(--muted);opacity:0.5;">${w}</span>`;
    }
  });
  html+=`</div></div>`;

  html+=`<div class="card"><h3>원-핫 벡터</h3>`;
  html+=`<div style="overflow-x:auto;"><table style="border-collapse:collapse;margin-top:0.5rem;width:100%;">`;
  html+=`<tr><td style="padding:0.4rem 0.6rem;font-family:var(--mono);font-size:0.62rem;color:var(--muted);border-bottom:1px solid var(--border);">단어</td>`;
  vocab.forEach((w,i)=>{
    const c=colors[i%colors.length];
    html+=`<td style="padding:0.4rem 0.3rem;text-align:center;font-family:var(--mono);font-size:0.58rem;color:${c};border-bottom:1px solid var(--border);min-width:2rem;">${w}</td>`;
  });
  html+=`</tr>`;
  vocab.forEach((w,wi)=>{
    const c=colors[wi%colors.length];
    html+=`<tr><td style="padding:0.4rem 0.6rem;font-family:var(--mono);font-size:0.78rem;font-weight:600;color:${c};border-bottom:1px solid var(--border);white-space:nowrap;">${w}</td>`;
    vocab.forEach((_,j)=>{
      const v=j===wi?1:0;
      html+=`<td style="padding:0.4rem 0.3rem;text-align:center;font-family:var(--mono);font-size:0.78rem;font-weight:${v?'700':'400'};background:${v?c+'dd':'transparent'};color:${v?'#fff':'var(--muted)'};border-bottom:1px solid var(--border);border-radius:${v?'3px':'0'};">${v}</td>`;
    });
    html+=`</tr>`;
  });
  html+=`</table></div></div>`;

  html+=`<div class="info"><strong>원-핫 인코딩의 한계:</strong> 단어 집합이 커지면 벡터 차원이 급격히 증가하고, 단어 간 유사도를 표현할 수 없습니다. 이를 개선한 것이 Word2Vec 등의 워드 임베딩 방법입니다.</div>`;

  box.innerHTML=html;
}

function ohRemoveVocab(idx){
  const text=document.getElementById('oh-input').value;
  const words=text.trim().replace(/[.,!?;:'"()]/g,'').split(/\s+/).filter(w=>w.length>0);
  const defaultVocab=[];words.forEach(w=>{if(!defaultVocab.includes(w))defaultVocab.push(w);});
  const current=ohVocabUser||[...defaultVocab];
  current.splice(idx,1);
  ohVocabUser=current;
  ohEncode();
}

function ohAddVocab(){
  const inp=document.getElementById('oh-vocab-add');
  const w=inp.value.trim();if(!w)return;
  const text=document.getElementById('oh-input').value;
  const words=text.trim().replace(/[.,!?;:'"()]/g,'').split(/\s+/).filter(w=>w.length>0);
  const defaultVocab=[];words.forEach(w=>{if(!defaultVocab.includes(w))defaultVocab.push(w);});
  const current=ohVocabUser||[...defaultVocab];
  if(!current.includes(w)){current.push(w);ohVocabUser=current;ohEncode();}
}

function ohResetVocab(){ohVocabUser=null;ohEncode();}

let ohVocabUser=null;

function bowProcess(sentences){
  const results=sentences.map(s=>{
    const words=s.trim().replace(/[.,!?;:'"()]/g,'').split(/\s+/).filter(w=>w.length>0);
    return {original:s, words};
  });

  const vocab=[];
  results.forEach(r=>r.words.forEach(w=>{if(!vocab.includes(w))vocab.push(w);}));
  vocab.sort();

  results.forEach(r=>{
    r.freq={};
    vocab.forEach(w=>{r.freq[w]=0;});
    r.words.forEach(w=>{r.freq[w]++;});
  });

  return {results,vocab};
}

function bowRenderResult(data){
  const {results,vocab}=data;
  const box=document.getElementById('bow-result');
  const colors=['#b44133','#4a6b8a','#5a7a5a','#8a6a4a','#6a4a8a','#4a8a7a','#8a4a6a','#7a8a4a'];
  let html='';

  results.forEach((r,si)=>{
    html+=`<div class="card"><h3>문장 ${si+1}: ${r.original}</h3>`;
    html+=`<p class="mono" style="margin-bottom:0.4rem;">띄어쓰기 기준 분리</p>`;
    html+=`<div style="display:flex;flex-wrap:wrap;gap:0.3rem;">`;
    r.words.forEach(w=>{
      html+=`<span style="display:inline-block;padding:0.2rem 0.45rem;border-radius:var(--radius);font-family:var(--mono);font-size:0.78rem;background:var(--fg);color:var(--bg);font-weight:500;">${w}</span>`;
    });
    html+=`</div></div>`;
  });

  html+=`<div class="card"><h3>단어 집합</h3>`;
  html+=`<div style="display:flex;flex-wrap:wrap;gap:0.3rem;">`;
  vocab.forEach((w,i)=>{
    const c=colors[i%colors.length];
    html+=`<span style="font-family:var(--mono);font-size:0.72rem;padding:0.2rem 0.5rem;border-radius:9999px;background:${c}18;color:${c};border:1px solid ${c}30;">${w}</span>`;
  });
  html+=`</div></div>`;

  html+=`<div class="card"><h3>빈도수 벡터</h3>`;
  html+=`<div style="overflow-x:auto;"><table style="border-collapse:collapse;width:100%;margin-top:0.5rem;">`;
  html+=`<tr><td style="padding:0.4rem 0.6rem;font-family:var(--mono);font-size:0.62rem;color:var(--muted);border-bottom:2px solid var(--border);"></td>`;
  vocab.forEach((w,i)=>{
    const c=colors[i%colors.length];
    html+=`<td style="padding:0.4rem 0.3rem;text-align:center;font-family:var(--mono);font-size:0.6rem;color:${c};border-bottom:2px solid var(--border);min-width:2.5rem;">${w}</td>`;
  });
  html+=`</tr>`;
  results.forEach((r,si)=>{
    html+=`<tr>`;
    html+=`<td style="padding:0.5rem 0.6rem;font-size:0.78rem;border-bottom:1px solid var(--border);white-space:nowrap;">문장 ${si+1}</td>`;
    vocab.forEach((w,i)=>{
      const v=r.freq[w];
      const c=colors[i%colors.length];
      html+=`<td style="padding:0.3rem;text-align:center;border-bottom:1px solid var(--border);">`;
      if(v>0){
        html+=`<div style="display:inline-flex;align-items:center;justify-content:center;width:1.6rem;height:1.6rem;border-radius:50%;background:${c}22;color:${c};font-family:var(--mono);font-size:0.82rem;font-weight:700;">${v}</div>`;
      }else{
        html+=`<span style="font-family:var(--mono);font-size:0.78rem;color:var(--border);">0</span>`;
      }
      html+=`</td>`;
    });
    html+=`</tr>`;
  });
  html+=`</table></div></div>`;

  html+=`<div class="card"><h3>벡터 표현</h3>`;
  results.forEach((r,si)=>{
    const vec=vocab.map(w=>r.freq[w]);
    html+=`<p style="font-family:var(--mono);font-size:0.78rem;margin:0.3rem 0;"><span style="color:var(--muted);">문장 ${si+1} =</span> <span style="font-weight:600;">[${vec.join(', ')}]</span></p>`;
  });
  html+=`</div>`;

  box.innerHTML=html;
}

function bowAnalyze(){
  const text=document.getElementById('bow-input').value;
  const sentences=text.split('\n').map(s=>s.trim()).filter(s=>s.length>0);
  if(sentences.length===0)return;
  const data=bowProcess(sentences);
  bowRenderResult(data);
}

let bowAnimIv=null;
function bowAnimate(){
  if(bowAnimIv){clearInterval(bowAnimIv);bowAnimIv=null;}
  const text=document.getElementById('bow-input').value;
  const sentences=text.split('\n').map(s=>s.trim()).filter(s=>s.length>0);
  if(sentences.length===0)return;
  const data=bowProcess(sentences);
  const {results,vocab}=data;
  const box=document.getElementById('bow-result');
  const colors=['#b44133','#4a6b8a','#5a7a5a','#8a6a4a','#6a4a8a','#4a8a7a','#8a4a6a','#7a8a4a'];

  const steps=[];
  steps.push('sentences');
  results.forEach((_,i)=>steps.push('stop_'+i));
  steps.push('vocab');
  steps.push('freq');

  let si=0;
  function renderStep(){
    const step=steps[si];
    let html='';

    if(si>=1){
      html+=`<div class="card"><h3>입력 문장</h3>`;
      results.forEach((r,i)=>{html+=`<p style="font-size:0.84rem;margin:0.2rem 0;">${r.original}</p>`;});
      html+=`</div>`;
    }

    for(let i=0;i<results.length;i++){
      const stepKey='stop_'+i;
      const idx=steps.indexOf(stepKey);
      if(si>=idx){
        const r=results[i];
        html+=`<div class="card" style="${si===idx?'outline:2px solid var(--fg);outline-offset:-2px;':''}">`
        html+=`<h3>문장 ${i+1}: 단어 분리</h3>`;
        html+=`<div style="display:flex;flex-wrap:wrap;gap:0.3rem;">`;
        r.words.forEach(w=>{
          html+=`<span style="display:inline-block;padding:0.2rem 0.45rem;border-radius:var(--radius);font-family:var(--mono);font-size:0.78rem;background:var(--fg);color:var(--bg);font-weight:500;">${w}</span>`;
        });
        html+=`</div></div>`;
      }
    }

    if(si>=steps.indexOf('vocab')){
      html+=`<div class="card" style="${step==='vocab'?'outline:2px solid var(--fg);outline-offset:-2px;':''}"><h3>단어 집합</h3>`;
      html+=`<div style="display:flex;flex-wrap:wrap;gap:0.3rem;">`;
      vocab.forEach((w,i)=>{
        const c=colors[i%colors.length];
        html+=`<span style="font-family:var(--mono);font-size:0.72rem;padding:0.2rem 0.5rem;border-radius:9999px;background:${c}18;color:${c};border:1px solid ${c}30;">${w}</span>`;
      });
      html+=`</div></div>`;
    }

    if(si>=steps.indexOf('freq')){
      bowRenderFreqTable(html,results,vocab,colors,box);
      return;
    }

    if(step==='sentences'){
      html=`<div class="card" style="outline:2px solid var(--fg);outline-offset:-2px;"><h3>입력 문장</h3>`;
      results.forEach((r,i)=>{html+=`<p style="font-size:0.84rem;margin:0.2rem 0;">${r.original}</p>`;});
      html+=`</div>`;
    }

    box.innerHTML=html;
    si++;
    if(si<steps.length){
      bowAnimIv=setTimeout(renderStep,1200);
    }
  }
  renderStep();
}

function bowRenderFreqTable(prefix,results,vocab,colors,box){
  let html=prefix;
  html+=`<div class="card" style="outline:2px solid var(--fg);outline-offset:-2px;"><h3>빈도수 벡터</h3>`;
  html+=`<div style="overflow-x:auto;"><table style="border-collapse:collapse;width:100%;margin-top:0.5rem;">`;
  html+=`<tr><td style="padding:0.4rem 0.6rem;font-family:var(--mono);font-size:0.62rem;color:var(--muted);border-bottom:2px solid var(--border);"></td>`;
  vocab.forEach((w,i)=>{
    const c=colors[i%colors.length];
    html+=`<td style="padding:0.4rem 0.3rem;text-align:center;font-family:var(--mono);font-size:0.6rem;color:${c};border-bottom:2px solid var(--border);min-width:2.5rem;">${w}</td>`;
  });
  html+=`</tr>`;
  results.forEach((r,si)=>{
    html+=`<tr><td style="padding:0.5rem 0.6rem;font-size:0.78rem;border-bottom:1px solid var(--border);white-space:nowrap;">문장 ${si+1}</td>`;
    vocab.forEach((w,i)=>{
      const v=r.freq[w];
      const c=colors[i%colors.length];
      html+=`<td style="padding:0.3rem;text-align:center;border-bottom:1px solid var(--border);">`;
      if(v>0){
        html+=`<div style="display:inline-flex;align-items:center;justify-content:center;width:1.6rem;height:1.6rem;border-radius:50%;background:${c}22;color:${c};font-family:var(--mono);font-size:0.82rem;font-weight:700;">${v}</div>`;
      }else{
        html+=`<span style="font-family:var(--mono);font-size:0.78rem;color:var(--border);">0</span>`;
      }
      html+=`</td>`;
    });
    html+=`</tr>`;
  });
  html+=`</table></div></div>`;
  results.forEach((r,si)=>{
    const vec=vocab.map(w=>r.freq[w]);
    if(si===0) html+=`<div class="card"><h3>벡터 표현</h3>`;
    html+=`<p style="font-family:var(--mono);font-size:0.78rem;margin:0.3rem 0;"><span style="color:var(--muted);">문장 ${si+1} =</span> <span style="font-weight:600;">[${vec.join(', ')}]</span></p>`;
    if(si===results.length-1) html+=`</div>`;
  });
  box.innerHTML=html;
}

const __nsl=document.getElementById('nsl');
if(__nsl) __nsl.addEventListener('input',function(){
  const v=parseInt(this.value);
  document.getElementById('ni').textContent=v;
  document.getElementById('nf').textContent=(v/255).toFixed(3);
  document.getElementById('nsw').style.background=`rgb(${v},${v},${v})`;
});

let ecCur=1;
const EC_TOTAL=5;

function ecDrawEye(upTo){
  const cv=document.getElementById('eye-cv');if(!cv)return;
  const W=800,H=520,c=cv.getContext('2d');
  c.clearRect(0,0,W,H);c.fillStyle='#f5f2eb';c.fillRect(0,0,W,H);
  const AC='#b44133',PA='#6b665e',DM='#a8a29a';

  const EX=420,EY=175;
  c.save();c.translate(EX,EY);
  c.beginPath();c.ellipse(0,0,165,105,0,0,Math.PI*2);
  c.fillStyle='#eae5dc';c.fill();c.strokeStyle='#2a2520';c.lineWidth=2.5;c.stroke();
  c.beginPath();c.arc(22,0,55,0,Math.PI*2);c.fillStyle='#4a7a9a';c.fill();c.strokeStyle='#2a2520';c.lineWidth=1.5;c.stroke();
  c.beginPath();c.arc(22,0,22,0,Math.PI*2);c.fillStyle='#1a1714';c.fill();
  c.beginPath();c.arc(28,-7,6,0,Math.PI*2);c.fillStyle='rgba(255,255,255,0.35)';c.fill();
  c.restore();

  function label(x,y,title,sub,col,align){
    c.save();c.textAlign=align||'left';
    c.font='bold 15px sans-serif';c.fillStyle=col;c.fillText(title,x,y);
    if(sub){c.font='13px sans-serif';c.fillStyle=DM;c.fillText(sub,x,y+19);}
    c.restore();
  }
  function arrow(x1,y1,x2,y2,col){
    c.save();c.strokeStyle=col;c.fillStyle=col;c.lineWidth=2.5;
    c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();
    const a=Math.atan2(y2-y1,x2-x1);
    c.beginPath();c.moveTo(x2,y2);c.lineTo(x2-9*Math.cos(a-0.35),y2-9*Math.sin(a-0.35));
    c.lineTo(x2-9*Math.cos(a+0.35),y2-9*Math.sin(a+0.35));c.closePath();c.fill();c.restore();
  }

  if(upTo>=0){
    const col=upTo===0?AC:PA;
    c.save();c.strokeStyle=col;c.lineWidth=2;c.setLineDash([7,5]);
    for(let a=-25;a<=25;a+=12){c.beginPath();c.moveTo(700,EY-15+a);c.lineTo(EX+110,EY+a*0.2);c.stroke();}
    c.setLineDash([]);c.restore();
    c.save();c.font='30px sans-serif';c.textAlign='center';c.fillText('☀️',735,EY+5);c.restore();
    label(EX-30,EY+135,'① 수정체 (렌즈)','빛을 굴절시켜 망막에 초점',col,'center');
  }
  if(upTo>=1){
    const col=upTo===1?AC:PA;
    c.save();c.strokeStyle=col;c.lineWidth=7;c.lineCap='round';
    c.beginPath();c.arc(EX,EY,158,2.4,3.85);c.stroke();c.restore();
    label(EX-145,EY-140,'② 망막','약 1.3억 개의 광수용체 → 전기 신호로 변환',col);
  }
  if(upTo>=2){
    const col=upTo===2?AC:PA;
    arrow(EX-165,EY,120,EY,col);
    c.save();c.strokeStyle=col;c.lineWidth=3;c.lineCap='round';
    const vx=80,vy=EY-12;
    [[-14,0,14,0],[0,-14,0,14],[-10,-10,10,10],[10,-10,-10,10]].forEach(([a,b,d,e])=>{
      c.beginPath();c.moveTo(vx+a,vy+b);c.lineTo(vx+d,vy+e);c.stroke();
    });c.restore();
    label(25,EY-60,'③ 시각 피질 V1','방향 선택 뉴런 (수직/수평/대각선)',col);
  }
  if(upTo>=3){
    const col=upTo===3?AC:PA;
    arrow(80,EY+15,80,EY+75,col);
    c.save();c.strokeStyle=col;c.lineWidth=2;
    c.strokeRect(48,EY+88,20,15);
    c.beginPath();c.arc(88,EY+96,9,0,Math.PI*2);c.stroke();
    c.beginPath();c.moveTo(110,EY+103);c.lineTo(122,EY+85);c.lineTo(134,EY+103);c.closePath();c.stroke();
    c.restore();
    label(25,EY+125,'④ V2 → V4 피질','기초 특징을 조합하여 복잡한 형태 인식',col);
  }
  if(upTo>=4){
    const col=upTo===4?AC:PA;
    arrow(80,EY+150,80,EY+195,col);
    c.save();c.font='36px sans-serif';c.textAlign='center';c.fillText('🐱',80,EY+235);c.restore();
    label(25,EY+260,'⑤ 측두엽 (IT)','"이것은 고양이다!" — 최종 인식',col);
  }
}

function ecDrawCNN(upTo){
  const cv=document.getElementById('cnn-cv');if(!cv)return;
  const W=800,H=400,c=cv.getContext('2d');
  c.clearRect(0,0,W,H);c.fillStyle='#f5f2eb';c.fillRect(0,0,W,H);
  const AC='#4a6b8a',PA='#6b665e',DM='#a8a29a';
  const y0=50,bh=200;
  const cx=[70,220,370,500,660]; // center x of each block

  function arr(x1,y1,x2,y2,col){
    c.save();c.strokeStyle=col;c.fillStyle=col;c.lineWidth=2.5;
    c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();
    const a=Math.atan2(y2-y1,x2-x1);
    c.beginPath();c.moveTo(x2,y2);c.lineTo(x2-8*Math.cos(a-0.4),y2-8*Math.sin(a-0.4));
    c.lineTo(x2-8*Math.cos(a+0.4),y2-8*Math.sin(a+0.4));c.closePath();c.fill();c.restore();
  }
  function lbl(x,title,sub,col){
    c.save();c.textAlign='center';
    c.font='bold 15px sans-serif';c.fillStyle=col;c.fillText(title,x,y0+bh+28);
    c.font='12px monospace';c.fillStyle=DM;c.fillText(sub,x,y0+bh+46);
    c.restore();
  }

  if(upTo>=0){
    const col=upTo===0?AC:PA,x=cx[0];
    c.fillStyle=col;c.globalAlpha=0.1;c.fillRect(x-40,y0,80,bh);c.globalAlpha=1;
    c.strokeStyle=col;c.lineWidth=2;c.strokeRect(x-40,y0,80,bh);
    c.globalAlpha=0.2;c.strokeStyle=col;c.lineWidth=0.5;
    for(let i=1;i<7;i++){c.beginPath();c.moveTo(x-40,y0+i*bh/7);c.lineTo(x+40,y0+i*bh/7);c.stroke();}
    for(let i=1;i<5;i++){c.beginPath();c.moveTo(x-40+i*80/5,y0);c.lineTo(x-40+i*80/5,y0+bh);c.stroke();}
    c.globalAlpha=1;
    lbl(x,'입력','224×224×3',col);
  }
  if(upTo>=1){
    const col=upTo===1?AC:PA,x=cx[1];
    arr(cx[0]+44,y0+bh/2,x-48,y0+bh/2,col);
    for(let i=0;i<5;i++){
      const w=16,h=bh-i*20,sx=x-42+i*18;
      c.fillStyle=col;c.globalAlpha=0.18-i*0.025;c.fillRect(sx,y0+(bh-h)/2,w,h);c.globalAlpha=1;
      c.strokeStyle=col;c.lineWidth=1.2;c.strokeRect(sx,y0+(bh-h)/2,w,h);
    }
    lbl(x,'합성곱','Conv2D',col);
  }
  if(upTo>=2){
    const col=upTo===2?'#5a8a5a':PA,x=cx[2];
    arr(cx[1]+48,y0+bh/2,x-30,y0+bh/2,col);
    c.save();c.translate(x,y0+bh/2);
    c.strokeStyle=col;c.lineWidth=3.5;
    c.beginPath();c.moveTo(-20,18);c.lineTo(0,0);c.lineTo(20,-20);c.stroke();
    c.strokeStyle=DM;c.lineWidth=0.7;c.setLineDash([4,3]);
    c.beginPath();c.moveTo(-24,0);c.lineTo(24,0);c.stroke();c.setLineDash([]);
    c.restore();
    lbl(x,'활성화','ReLU',col);
  }
  if(upTo>=3){
    const col=upTo===3?'#8a6a4a':PA,x=cx[3];
    arr(cx[2]+28,y0+bh/2,x-36,y0+bh/2,col);
    for(let i=0;i<4;i++){
      const w=13,h=bh*0.6-i*14,sx=x-30+i*16;
      c.fillStyle=col;c.globalAlpha=0.16-i*0.03;c.fillRect(sx,y0+(bh-h)/2,w,h);c.globalAlpha=1;
      c.strokeStyle=col;c.lineWidth=1.2;c.strokeRect(sx,y0+(bh-h)/2,w,h);
    }
    lbl(x,'풀링','↓ 절반',col);
  }
  if(upTo>=4){
    const col=upTo===4?AC:PA,x=cx[4];
    arr(cx[3]+36,y0+bh/2,x-55,y0+bh/2,col);
    const sx=x-40,ny=6;
    for(let ix=0;ix<2;ix++)for(let iy=0;iy<ny;iy++){
      const nx=sx+ix*38+10,ny2=y0+22+iy*30;
      c.beginPath();c.arc(nx,ny2,7,0,Math.PI*2);
      c.fillStyle=col;c.globalAlpha=0.2+iy*0.1;c.fill();c.globalAlpha=1;
      c.strokeStyle=col;c.lineWidth=0.8;c.stroke();
      if(ix<1)for(let jy=0;jy<ny;jy++){
        c.strokeStyle=col;c.globalAlpha=0.1;c.lineWidth=0.4;
        c.beginPath();c.moveTo(nx+7,ny2);c.lineTo(sx+48+10,y0+22+jy*30);c.stroke();c.globalAlpha=1;
      }
    }
    arr(sx+66,y0+bh/2,sx+86,y0+bh/2,col);
    c.font='32px sans-serif';c.globalAlpha=1;c.textAlign='left';c.fillText('🐱',sx+90,y0+bh/2+10);
    lbl(x,'분류','Softmax',col);
  }
}

const EC_DESCS=[
  {eye:'<div class="cr"><strong>① 각막 · 수정체</strong> — 빛을 굴절시켜 망막에 상을 맺습니다. 카메라 렌즈와 같은 역할입니다.</div>',
   cnn:'<div class="cr"><strong>① 입력층</strong> — 이미지를 224×224 크기의 숫자 행렬(RGB)로 변환합니다. 총 150,528개의 숫자가 됩니다.</div>'},
  {eye:'<div class="cr"><strong>② 시각 피질 V1</strong> — 특정 방향의 선분에 반응하는 뉴런이 있습니다. 휴벨·비셀의 1981년 노벨상 수상 연구가 CNN의 영감이 되었습니다.</div>',
   cnn:'<div class="cr"><strong>② 합성곱층</strong> — 3×3 필터가 이미지 위를 이동하며 가장자리, 질감 등 저수준 특징을 추출합니다.</div>'},
  {eye:'<div class="cr"><strong>③ 뉴런 발화 임계값</strong> — 자극이 일정 수준 이상이어야 뉴런이 반응합니다. 약한 자극은 무시됩니다.</div>',
   cnn:'<div class="cr"><strong>③ ReLU</strong> — 음수를 0으로 만들어 "특징 있음/없음"으로 단순화합니다. 뉴런 발화를 수학적으로 구현한 것입니다.</div>'},
  {eye:'<div class="cr"><strong>④ V2→V4 피질</strong> — 기초 특징을 점점 조합하여 복잡한 형태(눈, 코, 바퀴)를 인식합니다.</div>',
   cnn:'<div class="cr"><strong>④ 풀링</strong> — 특징 맵을 축소하여 연산량을 줄이고, 이동 불변성을 확보합니다.</div>'},
  {eye:'<div class="cr"><strong>⑤ 측두엽 (IT)</strong> — "이것은 고양이다"라는 최종 인식을 수행합니다.</div>',
   cnn:'<div class="cr"><strong>⑤ FC + Softmax</strong> — 특징을 종합하여 "고양이 89%, 개 7%"처럼 확률을 출력합니다.</div>'}
];

function ecRender(){
  ecDrawEye(ecCur-1);ecDrawCNN(ecCur-1);
  document.getElementById('ec-label').textContent=ecCur+' / '+EC_TOTAL;
  const ed=document.getElementById('eye-desc'),cd=document.getElementById('cnn-desc');
  if(ecCur===0){ed.innerHTML='<p style="color:var(--muted);">다음 버튼을 눌러 시작하세요.</p>';cd.innerHTML='';}
  else{let eh='',ch='';for(let i=0;i<ecCur;i++){eh+=EC_DESCS[i].eye;ch+=EC_DESCS[i].cnn;}ed.innerHTML=eh;cd.innerHTML=ch;}
}
function ecNext(){ecCur=Math.min(EC_TOTAL,ecCur+1);ecRender();}
function ecPrev(){ecCur=Math.max(0,ecCur-1);ecRender();}

let ecActiveTab='eye';
function ecSwitchTab(tab){
  ecActiveTab=tab;
  const dual=document.getElementById('ec-dual');
  const pe=document.getElementById('ec-panel-eye');
  const pc=document.getElementById('ec-panel-cnn');
  if(dual){
    if(pe)pe.style.display='block';
    if(pc)pc.style.display='block';
    return;
  }
  if(!pe||!pc)return;
  pe.style.display=tab==='eye'?'block':'none';
  pc.style.display=tab==='cnn'?'block':'none';
  const b1=document.getElementById('ec-tab-eye');
  const b2=document.getElementById('ec-tab-cnn');
  if(b1){
    b1.style.fontWeight=tab==='eye'?'600':'400';
    b1.classList.toggle('pri', tab==='eye');
  }
  if(b2){
    b2.style.fontWeight=tab==='cnn'?'600':'400';
    b2.classList.toggle('pri', tab==='cnn');
  }
}

const ecPanState={eye:{scale:1,ox:0,oy:0,drag:false,lx:0,ly:0},cnn:{scale:1,ox:0,oy:0,drag:false,lx:0,ly:0}};
function ecApplyTransform(id){
  const s=ecPanState[id],cv=document.getElementById(id==='eye'?'eye-cv':'cnn-cv');
  cv.style.transform='translate('+s.ox+'px,'+s.oy+'px) scale('+s.scale+')';
}
function ecFitCanvas(id){
  const wrap=document.getElementById('ec-wrap-'+id);
  const cv=document.getElementById(id==='eye'?'eye-cv':'cnn-cv');
  if(!wrap||!cv) return;
  const ww=wrap.clientWidth,cw=cv.width;
  if(!ww||ww<=0||!cw) return;
  const s=ecPanState[id];
  s.scale=Math.min(1,ww/cw);s.ox=0;s.oy=0;
  ecApplyTransform(id);
}
function ecZoom(id,dir){
  const s=ecPanState[id];
  if(dir===0){ecFitCanvas(id);return;}
  const ns=Math.max(0.3,Math.min(3,s.scale+(dir>0?0.2:-0.2)));
  s.scale=ns;ecApplyTransform(id);
}
['eye','cnn'].forEach(id=>{
  const wrap=document.getElementById('ec-wrap-'+id);
  if(!wrap)return;
  wrap.addEventListener('wheel',e=>{
    e.preventDefault();
    const s=ecPanState[id];
    const delta=e.deltaY>0?-0.1:0.1;
    s.scale=Math.max(0.3,Math.min(3,s.scale+delta));
    ecApplyTransform(id);
  },{passive:false});
  wrap.addEventListener('mousedown',e=>{const s=ecPanState[id];s.drag=true;s.lx=e.clientX;s.ly=e.clientY;wrap.style.cursor='grabbing';});
  window.addEventListener('mousemove',e=>{const s=ecPanState[id];if(!s.drag)return;s.ox+=e.clientX-s.lx;s.oy+=e.clientY-s.ly;s.lx=e.clientX;s.ly=e.clientY;ecApplyTransform(id);});
  window.addEventListener('mouseup',()=>{ecPanState[id].drag=false;wrap.style.cursor='grab';});
  let lastTouch=null,lastDist=null;
  wrap.addEventListener('touchstart',e=>{
    if(e.touches.length===1){const s=ecPanState[id];s.drag=true;lastTouch={x:e.touches[0].clientX,y:e.touches[0].clientY};}
    if(e.touches.length===2){lastDist=Math.hypot(e.touches[1].clientX-e.touches[0].clientX,e.touches[1].clientY-e.touches[0].clientY);}
  });
  wrap.addEventListener('touchmove',e=>{
    e.preventDefault();
    const s=ecPanState[id];
    if(e.touches.length===1&&s.drag&&lastTouch){
      s.ox+=e.touches[0].clientX-lastTouch.x;s.oy+=e.touches[0].clientY-lastTouch.y;
      lastTouch={x:e.touches[0].clientX,y:e.touches[0].clientY};ecApplyTransform(id);
    }
    if(e.touches.length===2&&lastDist){
      const d=Math.hypot(e.touches[1].clientX-e.touches[0].clientX,e.touches[1].clientY-e.touches[0].clientY);
      s.scale=Math.max(0.3,Math.min(3,s.scale*(d/lastDist)));lastDist=d;ecApplyTransform(id);
    }
  },{passive:false});
  wrap.addEventListener('touchend',()=>{ecPanState[id].drag=false;lastTouch=null;lastDist=null;});
});

setTimeout(()=>{ecRender();ecFitCanvas('eye');ecFitCanvas('cnn');ecSwitchTab('eye');},150);
window.addEventListener('resize',()=>{ecFitCanvas('eye');ecFitCanvas('cnn');});

let cnnGraphModel=null,cnnLabels=null,cnnLoading=false,cnnStep=0;
const CNN_TOTAL_STEPS=6;
const MOBILENET_URL='https://storage.googleapis.com/tfjs-models/savedmodel/mobilenet_v2_1.0_224/model.json';
const LABELS_URL='https://storage.googleapis.com/download.tensorflow.org/data/ImageNetLabels.txt';

async function loadCNNModel(){
  if(cnnGraphModel)return cnnGraphModel;
  if(cnnLoading)return null;
  cnnLoading=true;
  const st=document.getElementById('cnn-status');
  try{
    if(!window.tf){
      st.textContent='TensorFlow.js 로딩 중...';
      await new Promise((res,rej)=>{const s=document.createElement('script');
        s.src='https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
        s.onload=res;s.onerror=()=>rej(new Error('TF.js CDN fail'));document.head.appendChild(s);});
    }
    st.textContent='MobileNet V2 다운로드 중... (약 14MB)';
    cnnGraphModel=await tf.loadGraphModel(MOBILENET_URL);
    try{
      const resp=await fetch(LABELS_URL);
      const text=await resp.text();
      cnnLabels=text.trim().split('\n').map(s=>s.trim());
    }catch(e){console.warn('Labels load failed, using fallback');cnnLabels=null;}
    st.textContent='';
    cnnLoading=false;
    return cnnGraphModel;
  }catch(err){
    try{
      if(!window.mobilenet){
        st.textContent='대체 모델 로딩 중...';
        await new Promise((res,rej)=>{const s=document.createElement('script');
          s.src='https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js';
          s.onload=res;s.onerror=()=>rej(new Error('CDN fail'));document.head.appendChild(s);});
      }
      st.textContent='MobileNet 모델 다운로드 중...';
      cnnGraphModel=await mobilenet.load();
      cnnGraphModel._isMobilenetPkg=true;
      st.textContent='';cnnLoading=false;return cnnGraphModel;
    }catch(e2){
      st.textContent='모델 로딩 실패: '+e2.message;
      console.error(err,e2);cnnLoading=false;return null;
    }
  }
}

async function classifyWithModel(canvas){
  const model=await loadCNNModel();
  if(!model)return null;
  if(model._isMobilenetPkg){return await model.classify(canvas,5);}
  const logits=tf.tidy(()=>{
    let img=tf.browser.fromPixels(canvas).toFloat();
    img=tf.image.resizeBilinear(img,[224,224]);
    img=img.div(127.5).sub(1);
    return model.predict(img.expandDims(0));
  });
  const probs=tf.softmax(logits);
  const data=await probs.data();
  logits.dispose();probs.dispose();
  const indexed=Array.from(data).map((p,i)=>({p,i}));
  indexed.sort((a,b)=>b.p-a.p);
  const top5=indexed.slice(0,5);
  return top5.map(t=>({
    className:cnnLabels&&cnnLabels[t.i]?cnnLabels[t.i]:('class_'+t.i),
    probability:t.p
  }));
}

const CNN_KERNELS=[
  {name:'세로 엣지',k:[[-1,0,1],[-2,0,2],[-1,0,1]]},
  {name:'가로 엣지',k:[[-1,-2,-1],[0,0,0],[1,2,1]]},
  {name:'대각선 ↘',k:[[0,1,2],[-1,0,1],[-2,-1,0]]},
  {name:'대각선 ↙',k:[[2,1,0],[1,0,-1],[0,-1,-2]]},
  {name:'선명화',k:[[0,-1,0],[-1,5,-1],[0,-1,0]]},
  {name:'가우시안',k:[[1,2,1],[2,4,2],[1,2,1]]},
  {name:'엠보스',k:[[-2,-1,0],[-1,1,1],[0,1,2]]},
  {name:'라플라시안',k:[[0,1,0],[1,-4,1],[0,1,0]]},
  {name:'세로선',k:[[1,0,-1],[1,0,-1],[1,0,-1]]},
  {name:'가로선',k:[[1,1,1],[0,0,0],[-1,-1,-1]]},
  {name:'경계강조',k:[[-1,-1,-1],[-1,8,-1],[-1,-1,-1]]},
  {name:'블러',k:[[1,1,1],[1,1,1],[1,1,1]]},
];
function jsConv(gray,w,h,kernel){const o=new Float32Array(w*h);for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){let s=0;for(let ky=-1;ky<=1;ky++)for(let kx=-1;kx<=1;kx++)s+=gray[(y+ky)*w+(x+kx)]*kernel[ky+1][kx+1];o[y*w+x]=s;}return o;}
function jsReLU(d){const o=new Float32Array(d.length);for(let i=0;i<d.length;i++)o[i]=Math.max(0,d[i]);return o;}
function jsPool(d,w,h){const ow=w>>1,oh=h>>1,o=new Float32Array(ow*oh);for(let y=0;y<oh;y++)for(let x=0;x<ow;x++)o[y*ow+x]=Math.max(d[(y*2)*w+x*2],d[(y*2)*w+x*2+1],d[(y*2+1)*w+x*2],d[(y*2+1)*w+x*2+1]);return{data:o,w:ow,h:oh};}

function drawJsMaps(maps,names,contId,sz){
  const cont=document.getElementById(contId);if(!cont)return;cont.innerHTML='';
  maps.forEach((m,i)=>{
    let mn=Infinity,mx=-Infinity;for(let v of m.data){if(v<mn)mn=v;if(v>mx)mx=v;}
    const rng=mx-mn||1;const cv=document.createElement('canvas');cv.width=m.w;cv.height=m.h;
    cv.style.cssText='width:'+sz+'px;height:'+sz+'px;border-radius:4px;border:1px solid var(--border);image-rendering:pixelated;';
    const ctx=cv.getContext('2d'),img=ctx.createImageData(m.w,m.h);
    for(let j=0;j<m.w*m.h;j++){const v=Math.round(((m.data[j]-mn)/rng)*255);img.data[j*4]=v;img.data[j*4+1]=v;img.data[j*4+2]=v;img.data[j*4+3]=255;}
    ctx.putImageData(img,0,0);
    const wrap=document.createElement('div');wrap.style.cssText='text-align:center;display:inline-block;margin:3px;';
    wrap.appendChild(cv);
    const lbl=document.createElement('div');lbl.style.cssText='font-family:var(--mono);font-size:0.58rem;color:var(--muted);margin-top:2px;max-width:'+sz+'px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    lbl.textContent=names[i];wrap.appendChild(lbl);cont.appendChild(wrap);
  });
  const info=document.getElementById(contId.replace('maps','info'));
  if(info&&maps[0])info.textContent=maps.length+'개 필터 · 크기: '+maps[0].w+'×'+maps[0].h;
}

function cnnUpdateTimeline(step){
  document.querySelectorAll('.cnn-tl-btn').forEach(btn=>{
    const s=parseInt(btn.dataset.step);
    if(s===step){btn.style.background='var(--fg)';btn.style.color='var(--bg)';btn.style.borderColor='var(--fg)';btn.style.fontWeight='600';}
    else if(s<step){btn.style.background='var(--accent)';btn.style.color='var(--fg)';btn.style.borderColor='var(--accent)';btn.style.fontWeight='400';}
    else{btn.style.background='var(--card)';btn.style.color='var(--muted)';btn.style.borderColor='var(--border)';btn.style.fontWeight='400';}
  });
}
function cnnShowStep(n){cnnStep=Math.max(0,Math.min(CNN_TOTAL_STEPS-1,n));document.querySelectorAll('.cnn-step').forEach(el=>el.style.display='none');document.getElementById('cnn-step-'+cnnStep).style.display='block';cnnUpdateTimeline(cnnStep);}
function cnnNextStep(){cnnShowStep(cnnStep+1);}
function cnnPrevStep(){cnnShowStep(cnnStep-1);}

async function cnnAnalyze(imgEl){
  const st=document.getElementById('cnn-status');
  st.textContent='이미지 분석 중...';
  const inputCv=document.getElementById('cnn-input-cv');
  const ictx=inputCv.getContext('2d');
  ictx.imageSmoothingEnabled=true;
  try{ictx.imageSmoothingQuality='high';}catch(e){}
  ictx.clearRect(0,0,224,224);
  const bg=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()||'#ffffff';
  ictx.fillStyle=bg;
  ictx.fillRect(0,0,224,224);
  const s=Math.min(224/imgEl.width,224/imgEl.height);
  const w=imgEl.width*s, h=imgEl.height*s;
  const dx=(224-w)/2, dy=(224-h)/2;
  ictx.drawImage(imgEl,dx,dy,w,h);

  const imgData=ictx.getImageData(0,0,224,224);
  const gray=new Float32Array(224*224);
  for(let i=0;i<224*224;i++)gray[i]=imgData.data[i*4]*0.299+imgData.data[i*4+1]*0.587+imgData.data[i*4+2]*0.114;

  const convMaps=CNN_KERNELS.map(k=>({data:jsConv(gray,224,224,k.k),w:224,h:224}));
  drawJsMaps(convMaps,CNN_KERNELS.map(k=>k.name),'cnn-conv1-maps',90);

  const reluMaps=convMaps.map(m=>({data:jsReLU(m.data),w:m.w,h:m.h}));
  drawJsMaps(reluMaps,CNN_KERNELS.map(k=>k.name+' (ReLU)'),'cnn-relu-maps',90);

  const poolMaps=reluMaps.map(m=>jsPool(m.data,m.w,m.h));
  drawJsMaps(poolMaps,CNN_KERNELS.map(k=>k.name),'cnn-pool-maps',80);

  const deepMaps=[],dN=[];
  for(let i=0;i<poolMaps.length;i++){const ki=(i+4)%CNN_KERNELS.length;const c2=jsConv(poolMaps[i].data,poolMaps[i].w,poolMaps[i].h,CNN_KERNELS[ki].k);const p2=jsPool(jsReLU(c2),poolMaps[i].w,poolMaps[i].h);deepMaps.push(p2);dN.push('Deep '+(i+1));}
  drawJsMaps(deepMaps,dN,'cnn-deep-maps',72);

  st.textContent='MobileNet V2로 분류 중...';
  try{
    const preds=await classifyWithModel(inputCv);
    const predBox=document.getElementById('cnn-predictions');
    if(preds&&preds.length>0){
      let html='<p style="margin-bottom:0.8rem;"><strong>상위 5개 예측 결과</strong></p>';
      preds.forEach((p,i)=>{
        const pct=p.probability*100;const isTop=i===0;const name=p.className.split(',')[0].trim();
        html+='<div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.7rem;">';
        html+='<span style="font-family:var(--mono);font-size:0.85rem;min-width:3.8rem;text-align:right;font-weight:'+(isTop?'700':'400')+';color:'+(isTop?'var(--fg)':'var(--muted)')+';">'+pct.toFixed(1)+'%</span>';
        html+='<div style="flex:1;height:1.8rem;background:var(--bg);border-radius:var(--radius);overflow:hidden;border:1px solid var(--border);">';
        html+='<div style="width:'+Math.max(2,pct)+'%;height:100%;background:'+(isTop?'var(--fg)':'var(--accent)')+';border-radius:var(--radius);transition:width 0.6s;"></div></div>';
        html+='<span style="font-size:0.92rem;min-width:10rem;'+(isTop?'font-weight:600;color:var(--fg);':'color:var(--muted);')+'">'+name+'</span></div>';
      });
      predBox.innerHTML=html;
    }else{
      predBox.innerHTML='<p style="color:var(--muted);">모델 로딩 실패. 특징 맵(1~5단계)은 정상 표시됩니다.</p>';
    }
  }catch(err){
    console.error('Classify:',err);
    document.getElementById('cnn-predictions').innerHTML='<p style="color:var(--muted);">분류 오류: '+err.message+'</p>';
  }
  document.getElementById('cnn-controls').style.display='block';
  cnnShowStep(0);
  st.textContent='분석 완료! 타임라인을 클릭하거나 버튼으로 단계를 진행하세요.';
}

(()=>{
  const uz=document.getElementById('cnn-upz'),fi=document.getElementById('cnn-fup');
  if(!uz||!fi)return;
  uz.onclick=()=>fi.click();
  fi.onchange=e=>{if(e.target.files[0])cnnLoadImg(e.target.files[0]);};
  uz.ondragover=e=>{e.preventDefault();uz.classList.add('dg');};
  uz.ondragleave=()=>uz.classList.remove('dg');
  uz.ondrop=e=>{e.preventDefault();uz.classList.remove('dg');if(e.dataTransfer.files[0])cnnLoadImg(e.dataTransfer.files[0]);};
})();
function cnnLoadImg(file){const reader=new FileReader();reader.onload=e=>{const img=new Image();img.onload=()=>cnnAnalyze(img);img.src=e.target.result;};reader.readAsDataURL(file);}

let detModel=null,detLoading=false;

function loadDetScripts(){
  return new Promise((resolve,reject)=>{
    if(window.cocoSsd){resolve();return;}
    const loadSsd=()=>{
      const s2=document.createElement('script');
      s2.src='https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js';
      s2.onload=()=>resolve();
      s2.onerror=()=>reject(new Error('COCO-SSD 로드 실패'));
      document.head.appendChild(s2);
    };
    if(window.tf){loadSsd();return;}
    const s1=document.createElement('script');
    s1.src='https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
    s1.onload=loadSsd;
    s1.onerror=()=>reject(new Error('TensorFlow.js 로드 실패'));
    document.head.appendChild(s1);
  });
}

async function initDetModel(){
  if(detModel)return detModel;
  if(detLoading)return null;
  detLoading=true;
  const st=document.getElementById('det-status');
  st.textContent='모델 로딩 중... (처음 실행 시 수 초 소요)';
  try{
    await loadDetScripts();
    detModel=await cocoSsd.load();
    st.textContent='모델 준비 완료.';
    detLoading=false;
    return detModel;
  }catch(err){
    st.textContent='모델 로딩 실패: '+err.message;
    detLoading=false;
    return null;
  }
}

const COCO_KR={'person':'사람','bicycle':'자전거','car':'자동차','motorcycle':'오토바이','airplane':'비행기','bus':'버스','train':'기차','truck':'트럭','boat':'보트','traffic light':'신호등','fire hydrant':'소화전','stop sign':'정지 표지판','parking meter':'주차 미터기','bench':'벤치','bird':'새','cat':'고양이','dog':'개','horse':'말','sheep':'양','cow':'소','elephant':'코끼리','bear':'곰','zebra':'얼룩말','giraffe':'기린','backpack':'배낭','umbrella':'우산','handbag':'핸드백','tie':'넥타이','suitcase':'여행가방','frisbee':'프리스비','skis':'스키','snowboard':'스노보드','sports ball':'공','kite':'연','baseball bat':'야구 배트','baseball glove':'야구 글러브','skateboard':'스케이트보드','surfboard':'서프보드','tennis racket':'테니스 라켓','bottle':'병','wine glass':'와인잔','cup':'컵','fork':'포크','knife':'칼','spoon':'숟가락','bowl':'그릇','banana':'바나나','apple':'사과','sandwich':'샌드위치','orange':'오렌지','broccoli':'브로콜리','carrot':'당근','hot dog':'핫도그','pizza':'피자','donut':'도넛','cake':'케이크','chair':'의자','couch':'소파','potted plant':'화분','bed':'침대','dining table':'식탁','toilet':'변기','tv':'TV','laptop':'노트북','mouse':'마우스','remote':'리모컨','keyboard':'키보드','cell phone':'휴대폰','microwave':'전자레인지','oven':'오븐','toaster':'토스터','sink':'싱크대','refrigerator':'냉장고','book':'책','clock':'시계','vase':'꽃병','scissors':'가위','teddy bear':'곰 인형','hair drier':'드라이어','toothbrush':'칫솔'};

async function detRun(imgEl){
  const model=await initDetModel();
  if(!model)return;
  const st=document.getElementById('det-status');
  st.textContent='탐지 중...';

  const predictions=await model.detect(imgEl);

  const cv=document.getElementById('det-canvas');
  const ctx=cv.getContext('2d');
  cv.width=imgEl.naturalWidth||imgEl.width;
  cv.height=imgEl.naturalHeight||imgEl.height;
  ctx.drawImage(imgEl,0,0,cv.width,cv.height);

  const colors=['#b44133','#4a6b8a','#5a7a5a','#8a6a4a','#6a4a8a','#4a8a7a','#8a4a6a','#7a8a4a'];

  predictions.forEach((p,i)=>{
    const [x,y,w,h]=p.bbox;
    const c=colors[i%colors.length];
    ctx.strokeStyle=c;
    ctx.lineWidth=Math.max(2,Math.round(cv.width/200));
    ctx.strokeRect(x,y,w,h);

    const label=`${COCO_KR[p.class]||p.class} ${(p.score*100).toFixed(1)}%`;
    ctx.font=`bold ${Math.max(12,Math.round(cv.width/40))}px "Noto Sans KR", sans-serif`;
    const tm=ctx.measureText(label);
    const lh=Math.max(16,Math.round(cv.width/30));
    ctx.fillStyle=c;
    ctx.fillRect(x,y-lh-4,tm.width+10,lh+4);
    ctx.fillStyle='#fff';
    ctx.fillText(label,x+5,y-6);
  });

  document.getElementById('det-result').style.display='block';

  const list=document.getElementById('det-list');
  if(predictions.length===0){
    list.innerHTML='<p style="font-size:0.84rem;color:var(--muted);">탐지된 객체가 없습니다.</p>';
    st.textContent='탐지 완료 — 인식된 객체 없음';
  }else{
    let html='<div style="display:flex;flex-wrap:wrap;gap:0.4rem;">';
    predictions.forEach((p,i)=>{
      const c=colors[i%colors.length];
      const kr=COCO_KR[p.class]||p.class;
      html+=`<span style="display:inline-flex;align-items:center;gap:0.3rem;padding:0.3rem 0.6rem;border-radius:9999px;background:${c}18;color:${c};font-family:var(--mono);font-size:0.75rem;font-weight:600;border:1px solid ${c}30;">${kr} <span style="font-weight:400;opacity:0.7;">${(p.score*100).toFixed(1)}%</span></span>`;
    });
    html+='</div>';
    list.innerHTML=html;
    st.textContent=`탐지 완료 — ${predictions.length}개 객체 인식`;
  }
}

(()=>{
  const uz=document.getElementById('det-upz');
  const fi=document.getElementById('det-fup');
  if(!uz||!fi)return;
  uz.onclick=()=>fi.click();
  fi.onchange=e=>{if(e.target.files[0])detLoadImg(e.target.files[0]);};
  uz.ondragover=e=>{e.preventDefault();uz.classList.add('dg');};
  uz.ondragleave=()=>uz.classList.remove('dg');
  uz.ondrop=e=>{e.preventDefault();uz.classList.remove('dg');if(e.dataTransfer.files[0])detLoadImg(e.dataTransfer.files[0]);};
})();

function detLoadImg(file){
  const reader=new FileReader();
  reader.onload=e=>{
    const img=new Image();
    img.onload=()=>detRun(img);
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}

if('serviceWorker' in navigator)try{navigator.serviceWorker.register('sw.js');}catch(e){}

console.log('%c AI 수학 ','background:#1a1714;color:#f5f0ea;font-size:14px;font-weight:bold;padding:4px 8px;border-radius:4px;');
console.log('%c제작: gmb9817','font-size:12px;color:#1a1714;');
console.log('%c도움을 준 사람들: nflight11, frozenca, wizardrabbit, cubic','font-size:11px;color:#78726a;');


let hdg_cur=1;
const hdg_tot=9;
let hdg_first=new Array(hdg_tot+1).fill(null);
let hdg_solved=new Array(hdg_tot+1).fill(false);
const hdg_exp={
  1:"행렬 A와 B의 같은 위치 숫자가 서로 다른 곳은 1행 2열과 3행 2열(총 2곳)입니다. 이렇게 다른 부분을 1로 추출하는 것이 XOR 연산의 기초입니다.",
  2:"배타적 논리합(XOR)은 입력된 두 값이 '서로 다를 때만' 1을 반환합니다. 같을 때는 0을 반환하여 공통 데이터를 지웁니다.",
  3:"XOR는 다를 때만 남기므로, 두 집합이 공통으로 가지는 교집합 부분을 비워두고 양쪽 날개 영역만 색칠해야 합니다.",
  4:"대칭차집합은 합집합에서 교집합을 빼는 식(①)이나 차집합의 합(②)으로 표현됩니다. ③번 식은 합집합 전체가 되어버리는 오답입니다.",
  5:"각 자리별로 비교하면 (1⊕1=0), (0⊕1=1), (1⊕0=1), (1⊕1=0), (0⊕0=0)이 되어 결과는 01100이 됩니다.",
  6:"탐구 5의 결과 '01100'에는 숫자 1이 2개 포함되어 있으므로 두 데이터 사이의 해밍 거리는 2입니다.",
  7:"P ⊕ X = Q 의 양변에 P를 ⊕ 연산하면 X = P ⊕ Q 가 됩니다. 따라서 원본 P와 손상된 Q를 비교하여 숫자가 바뀐 위치(1행 2열, 2행 3열)가 마스크 행렬이 됩니다.",
  8:"4x4 행렬 비교 시, 입력 T와 S1은 4개의 픽셀이 다르고(거리 4), T와 S2는 1개의 픽셀만 다릅니다(거리 1). 따라서 거리가 더 짧은 S2로 분류됩니다.",
  9:"이진화는 임계값(Threshold)을 기준으로 데이터를 0과 1로 단순화합니다. 128 이상인 숫자(150, 200, 255) 위치만 클릭하여 1로 바꾸면 됩니다."
};

function hdg_el(id){return document.getElementById(id);}
function hdg_hasRoot(){return !!hdg_el('hdg-root');}
function hdg_mark(s,isC){if(isC){hdg_first[s]=true;}else{if(hdg_first[s]!==true)hdg_first[s]=false;}}

function hdg_setFb(s,isC,msg){
  const fb=hdg_el('hdg-fb'+s);
  if(!fb)return;
  if(isC){
    fb.className='hdg-fb succ';
    fb.innerHTML=`<b>✅ 정답!</b><br>${msg}<br><br><span style="font-size:0.9em;color:var(--muted);">[풀이] ${hdg_exp[s]}</span>`;
  }else{
    fb.className='hdg-fb err';
    fb.innerHTML=`<b>❌ 오답!</b><br>${msg}<br><br><span style="font-size:0.9em;color:var(--muted);">[힌트를 확인하고 다시 수정해 보세요]</span>`;
  }
  const nBtn=hdg_el('hdg-nBtn');
  if(nBtn)nBtn.style.display=(hdg_solved[s]===true)?'block':'none';
}

function hdg_showStage(n){
  for(let i=1;i<=hdg_tot;i++){
    const st=hdg_el('hdg-st'+i);
    if(st)st.classList.toggle('on', i===n);
  }
  const prog=hdg_el('hdg-progTxt');
  if(prog)prog.textContent=String(n);
  const pBtn=hdg_el('hdg-pBtn');
  const nBtn=hdg_el('hdg-nBtn');
  if(pBtn)pBtn.style.display=(n>1)?'block':'none';
  if(nBtn)nBtn.style.display=(hdg_solved[n]===true)?'block':'none';
  const res=hdg_el('hdg-stRes');
  if(res)res.classList.remove('on');
}

function hdg_showRes(){
  const prog=hdg_el('hdg-progBox');
  if(prog)prog.style.display='none';
  for(let i=1;i<=hdg_tot;i++){
    const st=hdg_el('hdg-st'+i);
    if(st)st.classList.remove('on');
  }
  const res=hdg_el('hdg-stRes');
  if(res)res.classList.add('on');

  const pBtn=hdg_el('hdg-pBtn');
  const nBtn=hdg_el('hdg-nBtn');
  if(pBtn)pBtn.style.display='block';
  if(nBtn)nBtn.style.display='none';

  let score=0;let wHtml='';
  for(let i=1;i<=hdg_tot;i++){
    if(hdg_first[i]===true) score++;
    else wHtml+=`<div class="hdg-wrong"><div style="font-weight:800;color:var(--red);margin-bottom:0.25rem;">탐구 ${i}번 오답 해설</div><div>${hdg_exp[i]}</div></div>`;
  }
  const fin=hdg_el('hdg-finScore');
  if(fin)fin.textContent=String(score);
  if(score===hdg_tot) wHtml='<p style="text-align:center;font-weight:800;color:var(--green);">🎉 모든 탐구를 한 번에 완벽하게 통과했습니다!</p>';
  const wList=hdg_el('hdg-wList');
  if(wList)wList.innerHTML=wHtml;
}

function hdg_move(dir){
  if(!hdg_hasRoot())return;
  const next=hdg_cur+dir;
  if(next>=1 && next<=hdg_tot){
    hdg_cur=next;
    hdg_showStage(hdg_cur);
    hdg_el('ht2')?.scrollIntoView({behavior:'smooth',block:'start'});
  }else{
    hdg_showRes();
    hdg_el('ht2')?.scrollIntoView({behavior:'smooth',block:'start'});
  }
}
function hdg_renderGrid(id,data,isInteractive,targetArray){
  const container=hdg_el(id);
  if(!container)return;
  container.innerHTML='';
  for(let i=0;i<data.length;i++){
    const cell=document.createElement('div');
    cell.className='hdg-cell';
    if(!isInteractive){
      cell.textContent=data[i];
      if(data[i]===1)cell.classList.add('on');
    }else{
      cell.textContent=targetArray[i];
      if(targetArray[i]===1)cell.classList.add('on');
      cell.onclick=()=>{
        targetArray[i]=1-targetArray[i];
        cell.textContent=targetArray[i];
        cell.classList.toggle('on', targetArray[i]===1);
      };
    }
    container.appendChild(cell);
  }
}
const hdg_s1_o=[1,0,1,0,0,0,1,1,1];
const hdg_s1_c=[1,1,1,0,0,0,1,0,1];
let hdg_s1_a=[0,0,0,0,0,0,0,0,0];

function hdg_initStage1(){
  hdg_renderGrid('hdg-g1_org', hdg_s1_o, false);
  hdg_renderGrid('hdg-g1_cor', hdg_s1_c, false);
  hdg_renderGrid('hdg-g1_ans', hdg_s1_a, true, hdg_s1_a);
}

function hdg_chk1(){
  let isC=true;
  for(let i=0;i<9;i++){ if(hdg_s1_a[i] !== (hdg_s1_o[i]^hdg_s1_c[i])){isC=false;break;} }
  hdg_mark(1,isC);
  if(isC) hdg_setFb(1,true,'두 행렬에서 차이가 발생하는 위치를 정확히 도출했습니다.');
  else hdg_setFb(1,false,'숫자가 다른 2곳의 위치를 클릭하여 1로 만드세요.');
}
function hdg_chk2(idx,isC,btn){
  const st=hdg_el('hdg-st2');
  st?.querySelectorAll('.hdg-opt').forEach(b=>b.style.borderColor='var(--border)');
  if(btn) btn.style.borderColor='var(--accent)';
  hdg_mark(2,isC);
  if(isC) hdg_setFb(2,true,'XOR의 정의를 정확히 이해했습니다.');
  else hdg_setFb(2,false,'같을 때는 0이 되어야 합니다.');
}
let hdg_states={a:false,b:false,i:false};

function hdg_drawVenn(){
  const cv=hdg_el('hdg-vCanvas');
  if(!cv)return;
  const cx=cv.getContext('2d');
  const cA={x:130,y:100,r:70}, cB={x:220,y:100,r:70};
  cx.clearRect(0,0,cv.width,cv.height);
  const id=cx.createImageData(cv.width,cv.height);

  for(let y=0;y<cv.height;y++){
    for(let x=0;x<cv.width;x++){
      const dA=Math.hypot(x-cA.x,y-cA.y)<=cA.r;
      const dB=Math.hypot(x-cB.x,y-cB.y)<=cB.r;
      const f=(dA&&!dB&&hdg_states.a)||(!dA&&dB&&hdg_states.b)||(dA&&dB&&hdg_states.i);
      const i=(y*cv.width+x)*4;
      if(f){
        id.data[i]=180; id.data[i+1]=65; id.data[i+2]=51; id.data[i+3]=160; // red-ish
      }else{
        id.data[i]=245; id.data[i+1]=240; id.data[i+2]=234; id.data[i+3]=255; // bg-ish
      }
    }
  }
  cx.putImageData(id,0,0);

  cx.lineWidth=2;
  cx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--blue').trim()||'#4a6b8a';
  cx.beginPath(); cx.arc(cA.x,cA.y,cA.r,0,Math.PI*2); cx.stroke();
  cx.beginPath(); cx.arc(cB.x,cB.y,cB.r,0,Math.PI*2); cx.stroke();

  cx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--fg').trim()||'#1a1714';
  cx.font='700 18px system-ui, sans-serif';
  cx.fillText('A', 55,105); cx.fillText('B', 280,105);
}

function hdg_initStage3(){
  const cv=hdg_el('hdg-vCanvas');
  if(!cv)return;
  hdg_states={a:false,b:false,i:false};
  hdg_drawVenn();
  cv.onclick=(e)=>{
    const r=cv.getBoundingClientRect();
    const x=e.clientX-r.left, y=e.clientY-r.top;
    const cA={x:130,y:100,r:70}, cB={x:220,y:100,r:70};
    const dA=Math.hypot(x-cA.x,y-cA.y)<=cA.r;
    const dB=Math.hypot(x-cB.x,y-cB.y)<=cB.r;

    if(dA&&!dB) hdg_states.a=!hdg_states.a;
    else if(!dA&&dB) hdg_states.b=!hdg_states.b;
    else if(dA&&dB) hdg_states.i=!hdg_states.i;

    hdg_drawVenn();
  };
}

function hdg_chk3(){
  const isC=(hdg_states.a && hdg_states.b && !hdg_states.i);
  hdg_mark(3,isC);
  if(isC) hdg_setFb(3,true,'대칭차집합 영역을 완벽히 색칠했습니다.');
  else{
    let msg='양쪽 날개 영역을 모두 색칠하세요.';
    if(hdg_states.i) msg='가운데 교집합은 서로 같으므로 비워야 합니다.';
    hdg_setFb(3,false,msg);
  }
}

function hdg_chk4(idx,isC,btn){
  const st=hdg_el('hdg-st4');
  st?.querySelectorAll('.hdg-opt').forEach(b=>b.style.borderColor='var(--border)');
  if(btn) btn.style.borderColor='var(--accent)';
  hdg_mark(4,isC);
  if(isC) hdg_setFb(4,true,'올바르지 않은 식을 잘 찾았습니다.');
  else hdg_setFb(4,false,'고르신 식은 대칭차집합의 올바른 수식입니다.');
}
function hdg_chk5(){
  const v=hdg_el('hdg-i5')?.value?.trim()||'';
  const isC=(v==='01100');
  hdg_mark(5,isC);
  if(isC) hdg_setFb(5,true,'정확한 벡터 연산입니다.');
  else hdg_setFb(5,false,'각 자리별로 (1⊕1=0, 0⊕1=1) 계산해 보세요.');
}
function hdg_chk6(){
  const v=hdg_el('hdg-i6')?.value;
  const isC=(String(v)==='2');
  hdg_mark(6,isC);
  if(isC) hdg_setFb(6,true,'해밍 거리를 바르게 구했습니다.');
  else hdg_setFb(6,false,'결과값 01100에 포함된 1의 개수를 세어보세요.');
}
const hdg_s7_o=[1,1,0,0,0,0,1,0,1];
const hdg_s7_c=[1,0,0,0,1,0,1,0,1];
let hdg_s7_a=[0,0,0,0,0,0,0,0,0];

function hdg_initStage7(){
  hdg_renderGrid('hdg-g7_org', hdg_s7_o, false);
  hdg_renderGrid('hdg-g7_cor', hdg_s7_c, false);
  hdg_renderGrid('hdg-g7_ans', hdg_s7_a, true, hdg_s7_a);
}
function hdg_chk7(){
  let isC=true;
  for(let i=0;i<9;i++){ if(hdg_s7_a[i] !== (hdg_s7_o[i]^hdg_s7_c[i])){isC=false;break;} }
  hdg_mark(7,isC);
  if(isC) hdg_setFb(7,true,'마스크 행렬 복원에 성공했습니다!');
  else hdg_setFb(7,false,'행렬 P와 Q의 숫자가 변한 곳을 클릭하세요.');
}
const hdg_t_d=[1,1,0,0,1,1,0,0,0,0,1,1,0,0,1,1];
const hdg_s1_d=[1,0,0,0,1,0,0,0,0,0,1,1,0,0,1,1];
const hdg_s2_d=[1,1,0,0,1,1,0,0,0,0,1,1,0,1,1,1];

function hdg_initStage8(){
  hdg_renderGrid('hdg-g8_t', hdg_t_d, false);
  hdg_renderGrid('hdg-g8_s1', hdg_s1_d, false);
  hdg_renderGrid('hdg-g8_s2', hdg_s2_d, false);
}
function hdg_chk8(idx,isC,btn){
  const st=hdg_el('hdg-st8');
  st?.querySelectorAll('.hdg-opt').forEach(b=>b.style.borderColor='var(--border)');
  if(btn) btn.style.borderColor='var(--accent)';
  hdg_mark(8,isC);
  if(isC) hdg_setFb(8,true,'가장 해밍 거리가 짧은 표본을 찾았습니다.');
  else hdg_setFb(8,false,'T와 다른 픽셀이 가장 적은 것을 고르세요.');
}
const hdg_s9_o=[45,150,200,80,128,90,255,30,100];
let hdg_s9_a=[0,0,0,0,0,0,0,0,0];

function hdg_initStage9(){
  const g9=hdg_el('hdg-g9_org');
  if(g9){
    g9.innerHTML='';
    for(let i=0;i<9;i++){
      const c=document.createElement('div');
      c.className='hdg-cell';
      c.textContent=hdg_s9_o[i];
      c.style.fontSize='0.75rem';
      c.style.background=`rgb(${hdg_s9_o[i]},${hdg_s9_o[i]},${hdg_s9_o[i]})`;
      c.style.color=(hdg_s9_o[i]<128)?'#ffffff':'#000000';
      g9.appendChild(c);
    }
  }
  hdg_renderGrid('hdg-g9_ans', hdg_s9_a, true, hdg_s9_a);
}
function hdg_chk9(){
  let isC=true;
  for(let i=0;i<9;i++){
    const target=hdg_s9_o[i]>=128?1:0;
    if(hdg_s9_a[i]!==target){isC=false;break;}
  }
  hdg_mark(9,isC);
  if(isC) hdg_setFb(9,true,'임계값(128)을 기준으로 완벽하게 이진화했습니다.');
  else hdg_setFb(9,false,'128 이상인 숫자만 클릭하여 1로 만들어야 합니다.');
}
(function hdg_init(){
  if(!hdg_hasRoot()) return;
  hdg_initStage1();
  hdg_initStage3();
  hdg_initStage7();
  hdg_initStage8();
  hdg_initStage9();
  hdg_showStage(hdg_cur);
})();


(function startRouter(){
  const start=()=>{
    const raw=(location.hash||'#home').replace('#','');
    const v=(raw && document.getElementById('v-'+raw))?raw:'home';
    go(v,false);
    try{history.replaceState({view:v},'', '#'+v);}catch(e){}
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', start);
  else setTimeout(start,0);
})();