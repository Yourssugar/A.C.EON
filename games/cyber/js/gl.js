/* A.C.EON BREACH: фон на WebGL. Слои картинок с параллаксом, пылинки, развёртка, виньетка.
   CyberGL.define('server', [{tex:'bg/server_sky.webp', depth:6, anchor:'cover'}, ...])
   CyberGL.load([...имена]) -> Promise   CyberGL.show('server')   CyberGL.start()
   depth: сдвиг слоя за курсором в пикселях, ближние слои сдвигаются сильнее.
   anchor 'cover' заполняет экран, 'bottom' прижимает полосу к низу (средний и ближний планы).
   Без WebGL канвас прячется, а текст пролога работает и так. */
(function(){
'use strict';

var ART=new URL('../art/cyber/',location.href).href;
var canvas,gl,prog,loc={},tex={},sets={};
var cur=null,next=null,fade=1,running=false,dpr=1;
var par={x:0,y:0,tx:0,ty:0};
var OVERSCAN=1.14;   // запас по краям, чтобы параллакс не открывал пустоту

var VS='attribute vec2 p;uniform vec4 rect;uniform vec2 res;varying vec2 uv;'+
  'void main(){uv=p;vec2 px=rect.xy+p*rect.zw;gl_Position=vec4(px.x/res.x*2.-1.,1.-px.y/res.y*2.,0.,1.);}';
var FS='precision mediump float;varying vec2 uv;uniform sampler2D tx;uniform float alpha;uniform vec3 tint;'+
  'void main(){vec4 c=texture2D(tx,uv);gl_FragColor=vec4(c.rgb*tint,c.a)*alpha;}';

function shader(type,src){
  var s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));
  return s;
}

function init(cv){
  canvas=cv;
  try{gl=canvas.getContext('webgl',{alpha:false,antialias:true});}catch(e){gl=null;}
  if(!gl){canvas.style.display='none';return false;}
  try{
    prog=gl.createProgram();
    gl.attachShader(prog,shader(gl.VERTEX_SHADER,VS));
    gl.attachShader(prog,shader(gl.FRAGMENT_SHADER,FS));
    gl.linkProgram(prog);
  }catch(e){console.warn('[cyber gl]',e);gl=null;canvas.style.display='none';return false;}
  gl.useProgram(prog);
  var buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,0,1,1,0,1,1]),gl.STATIC_DRAW);
  var p=gl.getAttribLocation(prog,'p');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
  ['rect','res','alpha','tint','tx'].forEach(function(n){loc[n]=gl.getUniformLocation(prog,n);});
  gl.uniform1i(loc.tx,0);
  gl.enable(gl.BLEND);
  resize();
  addEventListener('resize',resize);
  addEventListener('pointermove',function(e){
    par.tx=(e.clientX/innerWidth-.5)*2;par.ty=(e.clientY/innerHeight-.5)*2;
  });
  return true;
}

function resize(){
  dpr=Math.min(window.devicePixelRatio||1,1.5);   // выше 1.5 на слабых видеокартах проседает fps
  canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);
}

function loadOne(name){
  return new Promise(function(done){
    if(tex[name]!==undefined)return done();
    var img=new Image();
    img.onload=function(){
      var id=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,id);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      tex[name]={id:id,w:img.width,h:img.height};done();
    };
    img.onerror=function(){console.warn('[cyber gl] нет картинки',name);tex[name]=null;done();};
    img.src=ART+name;
  });
}
function load(names){
  if(!gl)return Promise.resolve();
  return Promise.all(names.map(loadOne));
}

function define(key,layers){sets[key]=layers;}
function show(key){
  if(next){cur=next;next=null;fade=1;}   // новый переход посреди старого: старый сразу завершаем
  if(cur===null){cur=key;return;}
  if(key===cur)return;
  next=key;fade=1;
}

function draw(name,x,y,w,h,alpha,add,tint){
  var t=tex[name];if(!t)return;
  gl.blendFunc(gl.SRC_ALPHA,add?gl.ONE:gl.ONE_MINUS_SRC_ALPHA);
  gl.bindTexture(gl.TEXTURE_2D,t.id);
  gl.uniform4f(loc.rect,x,y,w,h);
  gl.uniform1f(loc.alpha,alpha);
  gl.uniform3f(loc.tint,tint?tint[0]:1,tint?tint[1]:1,tint?tint[2]:1);
  gl.drawArrays(gl.TRIANGLES,0,6);
}

function drawLayer(L,alpha,ox,oy){
  var t=tex[L.tex];if(!t)return;
  var W=canvas.width,H=canvas.height;
  var dx=ox*L.depth*dpr,dy=oy*L.depth*dpr*.5;
  if(L.anchor==='bottom'){
    var s=W*OVERSCAN/t.w,w=t.w*s,h=t.h*s;
    draw(L.tex,(W-w)/2+dx,H-h+(L.baseY||0)*s+dy,w,h,alpha*(L.alpha||1),L.add);
  }else{
    var c=Math.max(W*OVERSCAN/t.w,H*OVERSCAN/t.h),cw=t.w*c,ch=t.h*c;
    draw(L.tex,(W-cw)/2+dx,(H-ch)/2+dy,cw,ch,alpha*(L.alpha||1),L.add);
  }
}
function drawSet(key,alpha,ox,oy){
  (sets[key]||[]).forEach(function(L){drawLayer(L,alpha,ox,oy);});
}

var motes=[];
for(var i=0;i<18;i++)motes.push({x:Math.random(),y:Math.random(),s:40+Math.random()*120,a:.04+Math.random()*.1,
  vx:(Math.random()-.5)*.00004,vy:-.00002-Math.random()*.00004,ph:Math.random()*6.28});
function drawMotes(now,ox,oy){
  var W=canvas.width,H=canvas.height;
  motes.forEach(function(m){
    m.x+=m.vx;m.y+=m.vy;
    if(m.y<-.05){m.y=1.05;m.x=Math.random();}
    var tw=.6+.4*Math.sin(now*.0012+m.ph),sz=m.s*dpr;
    draw('fx/glow.webp',m.x*W+ox*10*dpr-sz/2,m.y*H+oy*10*dpr-sz/2,sz,sz,m.a*tw,true,[.5,.95,.9]);
  });
}
function overlay(name,alpha,add){draw(name,0,0,canvas.width,canvas.height,alpha,add);}

function frame(now){
  par.x+=(par.tx-par.x)*.06;par.y+=(par.ty-par.y)*.06;
  var t=now*.0003,ox=par.x+Math.sin(t)*.12,oy=par.y+Math.cos(t*.8)*.06;   // медленный дрейф, чтобы сцена жила и без мыши

  gl.viewport(0,0,canvas.width,canvas.height);
  gl.uniform2f(loc.res,canvas.width,canvas.height);
  gl.clearColor(.02,.027,.035,1);gl.clear(gl.COLOR_BUFFER_BIT);

  if(cur)drawSet(cur,1,ox,oy);
  if(next)drawSet(next,1-fade,ox,oy);
  drawMotes(now,ox,oy);
  overlay('fx/scan.webp',.10);
  overlay('fx/noise.webp',.05,true);
  overlay('fx/vignette.webp',.9);

  if(next){fade-=.05;if(fade<=0){cur=next;next=null;fade=1;}}
  requestAnimationFrame(frame);
}
function start(){
  if(!gl||running)return;
  running=true;requestAnimationFrame(frame);
}

window.CyberGL={init:init,load:load,define:define,show:show,start:start,
  get ok(){return !!gl;}};
})();
