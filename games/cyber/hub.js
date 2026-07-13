/* =========================================================
   БРЕШЬ // hub — platform catalog
   ========================================================= */
(function(){
'use strict';
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}},
  del(k){try{localStorage.removeItem(k);}catch(e){}}};

// course catalog. `levels` = total, used for progress display.
const COURSES=[
  {id:'sqli', code:'ДЕЛО #01', icon:'⌘', name:'SQL-инъекция',
   desc:'Форма входа доверяет вводу. Вскрой NEO-BANK четырьмя приёмами, обойди три патча — и закрой дыру настоящим кодом.',
   folder:'courses/sqli/index.html', levels:4, status:'avail'},
  {id:'brute', code:'ДЕЛО #02', icon:'⧉', name:'Брутфорс паролей',
   desc:'Пароли, которые ломаются за секунды. Подбор, словари, rate-limit, 2FA. В разработке.',
   folder:null, levels:4, status:'soon'},
  {id:'xss', code:'ДЕЛО #03', icon:'❰❱', name:'XSS',
   desc:'Чужой скрипт в браузере жертвы. Внедрение, угон сессии, экранирование, CSP. В разработке.',
   folder:null, levels:4, status:'soon'},
  {id:'plain', code:'ДЕЛО #04', icon:'⊘', name:'Хранение паролей',
   desc:'Пароли открытым текстом, хеши, соль, bcrypt/argon2. В разработке.',
   folder:null, levels:3, status:'soon'},
];

function render(){
  const cat=document.getElementById('catalog'); cat.innerHTML='';
  let totalDone=0, totalLevels=0;
  COURSES.forEach(c=>{
    const done=store.get('bresh:progress:'+c.id,0);
    totalDone+=done; totalLevels+=c.levels;
    const pct=Math.round(done/c.levels*100);
    const avail=c.status==='avail';
    const node=document.createElement(avail?'a':'div');
    node.className='course '+(avail?'avail':'locked');
    if(avail) node.href=c.folder;
    node.innerHTML=`
      <div class="c-top"><span class="c-icon">${c.icon}</span>
        <span class="c-status ${avail?'on':''}">${avail?'доступно':'скоро'}</span></div>
      <div class="c-code">${c.code}</div>
      <h2 class="c-name">${c.name}</h2>
      <p class="c-desc">${c.desc}</p>
      <div class="c-foot">
        <div class="c-prog"><div class="c-bar"><i style="width:${pct}%"></i></div><span class="c-pct">${done}/${c.levels}</span></div>
        <span class="c-go">${avail?(done>0?'продолжить ▸':'начать ▸'):'🔒'}</span>
      </div>`;
    cat.appendChild(node);
  });
  const rank=document.getElementById('rank');
  const title = totalDone===0?'НОВОБРАНЕЦ':totalDone<3?'ОПЕРАТИВНИК':totalDone<COURSES[0].levels?'АНАЛИТИК':'ПРИЗРАК';
  rank.innerHTML=`ранг: <b>${title}</b> · пройдено уровней: <b>${totalDone}</b> / ${totalLevels}`;
}

document.getElementById('reset-all').onclick=()=>{
  if(confirm('Сбросить весь прогресс и выбранные сложности?')){
    COURSES.forEach(c=>{store.del('bresh:progress:'+c.id);store.del('bresh:diff:'+c.id);});
    render();
  }
};

// ambient starfield
(function(){var c=document.getElementById('bg');if(!c)return;var x=c.getContext('2d'),w,h,st,mx=0,my=0;
 function sz(){w=c.width=innerWidth;h=c.height=innerHeight;st=Array.from({length:Math.min(90,Math.floor(w*h/16000))},function(){return{x:Math.random()*w,y:Math.random()*h,z:Math.random()*.8+.2,t:Math.random()*6};});}
 sz();addEventListener('resize',sz);addEventListener('mousemove',function(e){mx=e.clientX/innerWidth-.5;my=e.clientY/innerHeight-.5;});
 (function loop(t){requestAnimationFrame(loop);x.clearRect(0,0,w,h);st.forEach(function(s){var px=s.x+mx*22*s.z,py=s.y+my*22*s.z,a=.2+Math.abs(Math.sin(t/900+s.t))*.5*s.z;x.fillStyle='rgba(120,150,170,'+a+')';x.fillRect(px,py,s.z*1.6,s.z*1.6);});})(0);})();

render();
})();
