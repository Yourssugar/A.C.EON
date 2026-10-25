/* A.C.EON · Архив звука: оформление страницы.
   scene: живая сцена под трек (scene.js), без картинки. Остальные шесть: пиксельный фон из themes/<id>-w|m.webp
   и поверх него WebGL-слой с мелкими анимациями в такт басу (капли, пыль в луче, неон, звёзды, прожекторы, светлячки).
   Точки привязки анимаций заданы в долях картинки и пересчитываются под обрезку фона (background-size: cover).
   Робот надевает вещь своей темы (window.AceonRobotLook), это можно выключить в настройках.
   Память: MusicPlayer.mem.theme, themeAsked, outfit. U-1 и reduced motion: только картинка, без анимаций. */
(function(){
'use strict';
const MP=window.MusicPlayer; if(!MP)return;
const AU=window.AceonUniverse||{id:2};
const $=id=>document.getElementById(id);
const mem=MP.mem, TR=window.Trace||null;

const TL={
  ru:{set:'Оформление',pick:'Выбери оформление',note:'Поменять можно в любой момент: кнопка с палитрой вверху.',outfit:'Робот наряжается под тему',
    scene:'Живая сцена',studio:'Ночная студия',vinyl:'Пластинки',arcade:'Аркада',orbit:'Орбита',garage:'Гараж',lake:'Костёр у озера'},
  en:{set:'Look',pick:'Choose a look',note:'You can change it any time: the palette button at the top.',outfit:'The robot dresses for the theme',
    scene:'Live scene',studio:'Night studio',vinyl:'Record shop',arcade:'Arcade',orbit:'Orbit',garage:'Garage',lake:'Lake campfire'},
  de:{set:'Design',pick:'Wähle ein Design',note:'Du kannst es jederzeit ändern: der Paletten-Knopf oben.',outfit:'Der Roboter zieht sich passend an',
    scene:'Live-Szene',studio:'Nachtstudio',vinyl:'Plattenladen',arcade:'Spielhalle',orbit:'Orbit',garage:'Garage',lake:'Lagerfeuer am See'},
  fr:{set:'Style',pick:'Choisis un style',note:'Tu peux le changer à tout moment : le bouton palette en haut.',outfit:'Le robot s\'habille selon le thème',
    scene:'Scène vivante',studio:'Studio de nuit',vinyl:'Disquaire',arcade:'Salle d\'arcade',orbit:'Orbite',garage:'Garage',lake:'Feu au bord du lac'},
  es:{set:'Estilo',pick:'Elige un estilo',note:'Puedes cambiarlo cuando quieras: el botón de paleta de arriba.',outfit:'El robot se viste según el tema',
    scene:'Escena viva',studio:'Estudio nocturno',vinyl:'Tienda de vinilos',arcade:'Salón arcade',orbit:'Órbita',garage:'Garaje',lake:'Hoguera junto al lago'},
  it:{set:'Stile',pick:'Scegli uno stile',note:'Puoi cambiarlo quando vuoi: il pulsante tavolozza in alto.',outfit:'Il robot si veste in tema',
    scene:'Scena viva',studio:'Studio notturno',vinyl:'Negozio di dischi',arcade:'Sala giochi',orbit:'Orbita',garage:'Garage',lake:'Falò sul lago'},
  pl:{set:'Wygląd',pick:'Wybierz wygląd',note:'Możesz go zmienić w każdej chwili: przycisk z paletą u góry.',outfit:'Robot ubiera się pod motyw',
    scene:'Żywa scena',studio:'Nocne studio',vinyl:'Płyty',arcade:'Salon gier',orbit:'Orbita',garage:'Garaż',lake:'Ognisko nad jeziorem'}
};
const L=k=>{ const d=TL[MP.lang()]||TL.en; return d[k]!==undefined?d[k]:TL.en[k]; };

/* a1, a2: точки и прямоугольники в долях картинки (x слева, y сверху), для широкой (w) и узкой (m) картинки */
const THEMES={
  scene:{img:false,acc:null},
  studio:{acc:'headphones',fx:0,w:{a1:[.70,0,.98,.44],a2:[.10,.78,.98,.95]},m:{a1:[.81,0,1,.55],a2:[.38,.64,.92,.72]}},
  vinyl:{acc:'beret',fx:1,w:{a1:[.31,0,.69,0],a2:[.75,.92,0,0]},m:{a1:[.42,0,.82,.17],a2:[.6,.9,0,0]}},
  arcade:{acc:'glasses',fx:2,w:{a1:[.1,.0,.95,.12],a2:[.25,.22,.72,.42]},m:{a1:[.1,0,1,.08],a2:[.3,.17,.65,.32]}},
  orbit:{acc:'helmet',fx:3,w:{a1:[.85,.33,.26,0],a2:[0,.3,.2,.7]},m:{a1:[.93,.31,.22,0],a2:[0,.25,.12,.6]}},
  garage:{acc:'cap',fx:4,w:{a1:[0,.09,1,0],a2:[.06,.24,.81,.24]},m:{a1:[0,.05,1,0],a2:[.07,.1,.93,.1]}},
  lake:{acc:'scarf',fx:5,w:{a1:[.155,.78,0,0],a2:[.76,.17,.6,0]},m:{a1:[.69,.9,0,0],a2:[.77,.17,.42,0]}}
};
const ORDER=['scene','studio','vinyl','arcade','orbit','garage','lake'];
if(mem.outfit===undefined)mem.outfit=true;
let THEME=THEMES[mem.theme]?mem.theme:'scene';

/* ---------- слои ---------- */
const bg=document.createElement('div'); bg.id='mbg'; bg.setAttribute('aria-hidden','true');
const amb=document.createElement('canvas'); amb.id='amb'; amb.setAttribute('aria-hidden','true');
document.body.insertBefore(amb,document.body.firstChild); document.body.insertBefore(bg,document.body.firstChild);

const narrow=()=>innerWidth/innerHeight<.8;
const imgOk={}, imgSize={};
function probe(src){ return new Promise(res=>{ if(imgOk[src]!==undefined){ res(imgOk[src]); return; } const i=new Image(); i.onload=()=>{ imgOk[src]=true; imgSize[src]=[i.naturalWidth,i.naturalHeight]; res(true); }; i.onerror=()=>{ imgOk[src]=false; res(false); }; i.src=src; }); }
let cur={src:null,var:'w'};
async function apply(id){
  if(!THEMES[id])id='scene';
  THEME=id; const t=THEMES[id], root=document.documentElement;
  root.dataset.mtheme=id;
  window.AceonRobotLook={acc:mem.outfit?t.acc:null};
  document.querySelectorAll('.mth-card').forEach(c=>c.classList.toggle('on',c.dataset.t===id));
  if(!t.fx&&t.fx!==0){ root.classList.remove('th-img'); bg.style.backgroundImage=''; cur.src=null; return; }
  const v=narrow()?'m':'w', src='themes/'+id+'-'+v+'.webp';
  const ok=await probe(src); if(THEME!==id)return;
  if(!ok){ root.classList.remove('th-img'); bg.style.backgroundImage=''; cur.src=null; return; }
  bg.style.backgroundImage='url("'+src+'")'; cur={src,var:v}; root.classList.add('th-img');
  anchors();
}
let wasNarrow=narrow();
addEventListener('resize',()=>{ if(narrow()!==wasNarrow){ wasNarrow=narrow(); apply(THEME); } else anchors(); });

/* ---------- WebGL: мелкие анимации поверх картинки ---------- */
const FS=`precision mediump float;
uniform vec2 R;uniform float T,BASS,FLASH,FX,ASP;uniform vec4 A1,A2;
float h1(float n){return fract(sin(n)*43758.5453);}
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float box(vec2 p,vec4 r,float f){vec2 a=smoothstep(r.xy-f,r.xy+f,p)*(1.-smoothstep(r.zw-f,r.zw+f,p));return a.x*a.y;}
/* дрейфующие точки: сетка ячеек, в каждой одна точка, мерцает */
float motes(vec2 p,float sc,float sp,float dens,float sz){
  vec2 q=p*sc+vec2(sin(T*.2)*.3,T*sp);vec2 id=floor(q),f=fract(q);float r=h2(id);if(r>dens)return 0.;
  vec2 c=vec2(h2(id+3.1),h2(id+7.3))*.7+.15+vec2(sin(T*(.6+r)+r*20.),cos(T*(.5+r)+r*9.))*.12;
  float tw=.5+.5*sin(T*(1.5+r*3.)+r*40.);return smoothstep(sz,0.,length(f-c))*tw;}
void main(){
  vec2 uv=gl_FragCoord.xy/R;vec2 p=vec2(uv.x*ASP,uv.y);
  vec3 c=vec3(0.);float b=BASS,fl=FLASH;
  if(FX<.5){ /* студия: дождь за окном, огоньки на пульте */
    float w=box(uv,vec4(A1.x,A1.w,A1.z,A1.y),.004);
    vec2 g=vec2(uv.x*R.x/9.,uv.y*R.y/70.+T*3.2);vec2 id=floor(g);float rr=h2(vec2(id.x,0.));
    float f=fract(g.y+rr*7.);float drop=smoothstep(0.,.05,f)*smoothstep(.45,0.,f)*step(.7,h2(id));
    float lane=smoothstep(.35,0.,abs(fract(g.x)-.5));
    c+=vec3(.55,.7,1.)*drop*lane*w*.55;
    float led=box(uv,vec4(A2.x,A2.w,A2.z,A2.y),.01);
    vec2 lg=uv*vec2(R.x/7.,R.y/7.);vec2 lid=floor(lg);float lr=h2(lid);
    float on=step(.965,lr)*smoothstep(.35,0.,length(fract(lg)-.5));
    float bl=.5+.5*sin(T*(2.+lr*6.)+lr*30.);
    c+=mix(vec3(1.,.55,.15),vec3(.2,.9,1.),step(.985,lr))*on*led*(bl*.7+b*1.2+fl);
    c+=vec3(.9,.8,1.)*motes(p,26.,.15,.12,.08)*.35;
  } else if(FX<1.5){ /* пластинки: лучи ламп и пыль в них */
    float beam=0.;
    for(int i=0;i<2;i++){vec2 s=i==0?A1.xy:A1.zw;s.x*=ASP;float d=s.y-p.y;if(d>0.){float wd=.04+d*.32;beam+=smoothstep(wd,wd*.25,abs(p.x-s.x))*smoothstep(1.,.15,d);}}
    c+=vec3(1.,.72,.38)*beam*(.07+b*.09+fl*.05);
    c+=vec3(1.,.85,.6)*motes(p,34.,.06,.35,.07)*(.25+beam*1.4);
    vec2 tt=vec2(A2.x*ASP,A2.y);c+=vec3(1.,.6,.25)*exp(-length(p-tt)*9.)*(.12+b*.25);
  } else if(FX<2.5){ /* аркада: неон мигает, экраны пульсируют, искры на полу */
    float fk=.75+.25*sin(T*23.)*sin(T*7.1)+fl*.6;
    vec2 g1=vec2(mix(A1.x,A1.z,.15)*ASP,A1.y),g2=vec2(mix(A1.x,A1.z,.85)*ASP,A1.y);
    float n1=exp(-length((p-g1)*vec2(1.6,4.))*3.),n2=exp(-length((p-g2)*vec2(1.6,4.))*3.);
    c+=(vec3(1.,.2,.9)*n1+vec3(.2,.8,1.)*n2)*.2*fk;
    float lft=box(uv,vec4(0.,A2.w,A2.x,A2.y),.03), rgt=box(uv,vec4(A2.z,A2.w,1.,A2.y),.03);
    vec3 sc=.5+.5*cos(T*1.3+vec3(0.,2.,4.));
    c+=sc*(lft+rgt)*(.06+b*.22+fl*.15);
    float fl2=step(uv.y,.4)*motes(p,40.,-.05,.15,.06);c+=mix(vec3(1.,.3,.9),vec3(.3,.9,1.),h1(floor(uv.x*20.)))*fl2*.5;
  } else if(FX<3.5){ /* орбита: звёзды плывут за иллюминатором, огоньки на панелях */
    vec2 cc=vec2(A1.x*ASP,A1.y);float rr=A1.z;float inC=smoothstep(rr,rr-.01,length(p-cc));
    vec2 q=(p-cc)*30.+vec2(T*1.2,0.);vec2 id=floor(q),f=fract(q);float r=h2(id);
    float st=step(.82,r)*smoothstep(.12,0.,length(f-vec2(h2(id+2.),h2(id+5.))))*(.6+.4*sin(T*3.+r*50.));
    c+=vec3(.85,.9,1.)*st*inC*.9;
    c+=vec3(.3,.55,1.)*exp(-abs(length(p-cc)-rr)*60.)*(.08+b*.2);
    float pan=box(uv,vec4(A2.x,A2.w,A2.z,A2.y),.01);
    vec2 lg=uv*vec2(R.x/9.,R.y/9.);vec2 lid=floor(lg);float lr=h2(lid+11.);
    float on=step(.97,lr)*smoothstep(.35,0.,length(fract(lg)-.5))*step(.5,sin(T*(1.+lr*4.)+lr*20.));
    c+=mix(vec3(1.,.55,.1),vec3(.2,1.,.6),step(.99,lr))*on*pan*(.8+fl);
  } else if(FX<4.5){ /* гараж: гирлянда дышит, прожекторы качаются в ритм */
    float band=exp(-abs(uv.y-A1.y)*40.);c+=vec3(1.,.75,.35)*band*(.05+b*.18)*(.8+.2*sin(T*2.));
    for(int i=0;i<2;i++){vec2 s=i==0?A2.xy:A2.zw;s.x*=ASP;float d=s.y-p.y;
      float ang=(i==0?.35:-.35)+sin(T*.7+float(i)*2.)*.35+fl*.08;vec2 dir=vec2(sin(ang),-cos(ang));
      vec2 v=p-s;float along=dot(v,dir);float across=abs(dot(v,vec2(-dir.y,dir.x)));
      float cone=step(0.,along)*smoothstep(.02+along*.22,.005+along*.05,across)*smoothstep(1.4,.1,along);
      c+=(i==0?vec3(1.,.25,.2):vec3(1.,.8,.35))*cone*(.06+b*.12+fl*.06);}
    c+=vec3(.9,.8,1.)*motes(p,30.,.08,.1,.07)*.3;
  } else { /* озеро: искры костра, светлячки, луна и дорожка на воде */
    vec2 fpos=vec2(A1.x*ASP,A1.y);
    c+=vec3(1.,.5,.15)*exp(-length((p-fpos)*vec2(1.,.8))*7.)*(.16+b*.3)*(.85+.15*sin(T*13.)*sin(T*7.));
    for(int i=0;i<14;i++){float fi=float(i);float life=fract(T*.35+h1(fi*3.7));
      vec2 sp=fpos+vec2((h1(fi)-.5)*.06+sin(T*2.+fi)*.02*life,life*.32);
      c+=vec3(1.,.6,.2)*smoothstep(.006,0.,length(p-sp))*(1.-life)*1.4;}
    float ff=step(uv.y,.62)*motes(p,14.,.02,.18,.09);c+=vec3(.75,1.,.35)*ff*(.6+b*.6);
    vec2 mp=vec2(A2.x*ASP,A2.y);c+=vec3(.9,.95,1.)*exp(-length(p-mp)*14.)*(.05+b*.12);
    float col=smoothstep(.035,0.,abs(p.x-mp.x+sin(uv.y*90.+T*2.)*.006))*step(uv.y,A2.z)*step(A2.z-.35,uv.y);
    float sh=step(.55,h2(vec2(floor(uv.y*R.y/3.),floor(T*6.))));
    c+=vec3(.9,.95,1.)*col*sh*.25;
  }
  float a=clamp(max(c.r,max(c.g,c.b)),0.,1.);
  gl_FragColor=vec4(c,a);
}`;
let gl=null, U={}, fxOn=false;
if((AU.id||2)>=2&&!MP.reduce){
  try{ gl=amb.getContext('webgl',{premultipliedAlpha:true,alpha:true,antialias:false}); }catch(e){}
  if(gl){
    const sh=(ty,src)=>{ const o=gl.createShader(ty); gl.shaderSource(o,src); gl.compileShader(o); if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)){ console.warn('[themes]',gl.getShaderInfoLog(o)); return null; } return o; };
    const v=sh(gl.VERTEX_SHADER,'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'), f=sh(gl.FRAGMENT_SHADER,FS);
    if(v&&f){
      const pr=gl.createProgram(); gl.attachShader(pr,v); gl.attachShader(pr,f); gl.linkProgram(pr);
      if(gl.getProgramParameter(pr,gl.LINK_STATUS)){
        gl.useProgram(pr);
        const bf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,bf); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
        const ap=gl.getAttribLocation(pr,'p'); gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap,2,gl.FLOAT,false,0,0);
        ['R','T','BASS','FLASH','FX','ASP','A1','A2'].forEach(n=>U[n]=gl.getUniformLocation(pr,n));
        fxOn=true;
      }
    }
  }
}
/* пересчёт точек из долей картинки в доли экрана (фон обрезается по cover, по центру) */
let A1=[0,0,0,0], A2=[0,0,0,0];
function anchors(){
  const t=THEMES[THEME]; if(!t||!t[cur.var]||!cur.src)return;
  const sz=imgSize[cur.src]||(cur.var==='w'?[1920,1080]:[1080,1920]);
  const W=innerWidth,H=innerHeight, s=Math.max(W/sz[0],H/sz[1]), dw=sz[0]*s, dh=sz[1]*s, ox=(W-dw)/2, oy=(H-dh)/2;
  const X=x=>(ox+x*dw)/W, Y=y=>1-(oy+y*dh)/H, Ry=r=>r*dh/H;   /* y снизу вверх, радиус в долях высоты */
  const a=t[cur.var];
  if(t.fx===3){ A1=[X(a.a1[0]),Y(a.a1[1]),Ry(a.a1[2]*sz[0]/sz[1]),0]; A2=[X(a.a2[0]),Y(a.a2[1]),X(a.a2[2]),Y(a.a2[3])]; }
  else if(t.fx===0||t.fx===2){ A1=[X(a.a1[0]),Y(a.a1[1]),X(a.a1[2]),Y(a.a1[3])]; A2=t.fx===0?[X(a.a2[0]),Y(a.a2[1]),X(a.a2[2]),Y(a.a2[3])]:[X(a.a2[0]),Y(a.a2[1]),X(a.a2[2]),Y(a.a2[3])]; }
  else if(t.fx===1){ A1=[X(a.a1[0]),Y(a.a1[1]),X(a.a1[2]),Y(a.a1[3])]; A2=[X(a.a2[0]),Y(a.a2[1]),0,0]; }
  else if(t.fx===4){ A1=[0,Y(a.a1[1]),1,0]; A2=[X(a.a2[0]),Y(a.a2[1]),X(a.a2[2]),Y(a.a2[3])]; }
  else { A1=[X(a.a1[0]),Y(a.a1[1]),0,0]; A2=[X(a.a2[0]),Y(a.a2[1]),Y(a.a2[2]),0]; }
}
const SCALE=(AU.id||2)>=3?.6:.42;
function fit(){ const w=Math.max(2,Math.round(innerWidth*SCALE)), h=Math.max(2,Math.round(innerHeight*SCALE)); if(amb.width!==w||amb.height!==h){ amb.width=w; amb.height=h; } }
addEventListener('resize',fit); fit();
let bass=0, flash=0, last=performance.now(), tm=0, lastDraw=0;
const FRAME=(AU.id||2)>=3?16:33;
function loop(now){
  requestAnimationFrame(loop);
  if(!fxOn||document.hidden)return;
  const on=document.documentElement.classList.contains('th-img');
  amb.classList.toggle('on',on);
  if(!on)return;
  if(now-lastDraw<FRAME-1)return; lastDraw=now;
  const dt=Math.min(.1,(now-last)/1000); last=now;
  const Lv=MP.levels||{}, pl=MP.playing;
  bass+=(((pl&&Lv.bass)||0)-bass)*Math.min(1,dt*8);
  if(pl&&Lv.beat)flash=Math.min(1,(Lv.strength||1.3)-.6);
  flash*=Math.exp(-dt*5); tm+=dt*(pl?1:.5);
  gl.viewport(0,0,amb.width,amb.height); gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform2f(U.R,amb.width,amb.height); gl.uniform1f(U.T,tm); gl.uniform1f(U.BASS,bass); gl.uniform1f(U.FLASH,flash);
  gl.uniform1f(U.FX,THEMES[THEME].fx||0); gl.uniform1f(U.ASP,amb.width/amb.height);
  gl.uniform4fv(U.A1,A1); gl.uniform4fv(U.A2,A2);
  gl.drawArrays(gl.TRIANGLES,0,3);
}
requestAnimationFrame(loop);

/* ---------- кнопка и окно выбора ---------- */
const hdr=document.querySelector('.hd-right'), cass=$('cassBtn');
const btn=document.createElement('button'); btn.className='hd-ico'; btn.id='themeBtn'; btn.type='button';
btn.innerHTML='<i class="ti ti-palette"></i>';
if(hdr)hdr.insertBefore(btn,cass||hdr.firstChild);
const modal=document.createElement('div'); modal.id='mset';
modal.innerHTML='<div class="mset-box"><div class="cass-head"><span id="msetT"></span><button id="msetX" type="button"><i class="ti ti-x"></i></button></div>'
  +'<div class="mth-grid" id="mthGrid"></div><p class="mset-note" id="msetNote"></p>'
  +'<label class="mset-tg"><input type="checkbox" id="msetOutfit"> <span id="msetOutfitT"></span></label></div>';
document.body.appendChild(modal);
function build(first){
  $('msetT').textContent=first?L('pick'):L('set'); $('msetNote').textContent=L('note'); $('msetOutfitT').textContent=L('outfit');
  $('msetOutfit').checked=!!mem.outfit;
  const g=$('mthGrid'); g.innerHTML='';
  ORDER.forEach(id=>{
    const b=document.createElement('button'); b.type='button'; b.className='mth-card'+(id===THEME?' on':''); b.dataset.t=id;
    b.innerHTML='<span class="mth-pv mth-'+id+'"></span><span class="mth-nm"></span>'; b.lastChild.textContent=L(id);
    if(THEMES[id].fx!==undefined)b.firstChild.style.backgroundImage='url("themes/'+id+'-thumb.webp")';
    b.addEventListener('click',()=>{ mem.theme=id; mem.themeAsked=true; MP.save(); apply(id); if(TR)TR.event('music.theme'); });
    g.appendChild(b);
  });
}
function open(first){ build(first); modal.classList.add('on'); }
function close(){ modal.classList.remove('on'); if(!mem.themeAsked){ mem.themeAsked=true; MP.save(); } }
btn.addEventListener('click',()=>open(false));
$('msetX').addEventListener('click',close);
modal.addEventListener('click',e=>{ if(e.target===modal)close(); });
addEventListener('keydown',e=>{ if(e.key==='Escape'&&modal.classList.contains('on'))close(); });
$('msetOutfit').addEventListener('change',e=>{ mem.outfit=e.target.checked; MP.save(); window.AceonRobotLook={acc:mem.outfit?THEMES[THEME].acc:null}; });
function texts(){ btn.title=L('set'); btn.setAttribute('aria-label',L('set')); if(modal.classList.contains('on'))build(!mem.themeAsked); }
document.addEventListener('click',e=>{ if(e.target.closest('#langmenu button'))setTimeout(texts,0); });
texts();
apply(THEME);
if(!mem.themeAsked)setTimeout(()=>open(true),700);
window.MusicThemes={apply,get current(){ return THEME; }};
})();
