/* A.C.EON BREACH: пролог. Шесть сцен, у каждой фон (набор слоёв в CyberGL) и строки из lang.js.
   Строки печатаются по буквам; второй пробел или клик допечатывает сразу, третий листает дальше.
   Атака здесь только предыстория: всё, что могло бы сойти за способ, затёрто плашкой [r]. */
(function(){
'use strict';

var t=I18n.t;
var $=function(id){return document.getElementById(id);};

CyberGL.define('server',[
  {tex:'bg/server_sky.webp',depth:6,anchor:'cover'},
  {tex:'bg/server_mid.webp',depth:20,anchor:'bottom',baseY:40},
  {tex:'bg/server_near.webp',depth:46,anchor:'bottom'}
]);
CyberGL.define('archive',[
  {tex:'bg/archive.webp',depth:8,anchor:'cover'},
  {tex:'bg/archive_dust.webp',depth:30,anchor:'cover',add:true,alpha:.7}
]);
CyberGL.define('building',[
  {tex:'bg/building_sky.webp',depth:5,anchor:'cover'},
  {tex:'bg/building_far.webp',depth:18,anchor:'bottom',baseY:60},
  {tex:'bg/building_near.webp',depth:44,anchor:'bottom'}
]);
var TEXTURES=['bg/server_sky.webp','bg/server_mid.webp','bg/server_near.webp','bg/archive.webp','bg/archive_dust.webp',
  'bg/building_sky.webp','bg/building_far.webp','bg/building_near.webp',
  'fx/glow.webp','fx/scan.webp','fx/noise.webp','fx/vignette.webp'];

/* строка: [ключ, 'mute' для приглушённой] */
var SCENES=[
  {bg:'server',kicker:'pr.k.init',lines:[['pr.boot.1','mute'],['pr.boot.2','mute'],['pr.boot.3']]},
  {bg:'server',kicker:'pr.k.title',center:{title:'pr.title',sub:'pr.title.sub'},lines:[['pr.title.1']]},
  {bg:'archive',kicker:'pr.k.archive',lead:'pr.arch.lead',leadAmber:true,report:true,
    lines:[['pr.arch.1','mute'],['pr.arch.2']]},
  {bg:'building',kicker:'pr.k.role',lead:'pr.role.lead',lines:[['pr.role.1'],['pr.role.2'],['pr.role.3','mute']]},
  {bg:'building',kicker:'pr.k.sword',lead:'pr.sword.lead',leadAmber:true,
    lines:[['pr.sword.1'],['pr.sword.2'],['pr.sword.3']]},
  {bg:'server',kicker:'pr.k.shield',center:{title:'pr.shield.title',sub:'pr.shield.sub',cyan:true},final:true,
    lines:[['pr.shield.1','mute'],['pr.shield.2']]}
];

/* строки отчёта: ключ подписи, ключ значения (или null: затёрто), класс */
var REPORT=[['pr.arch.k1',null],['pr.arch.k2','pr.arch.v2','crit'],['pr.arch.k3',null],
  ['pr.arch.k4','pr.arch.v4'],['pr.arch.k5','pr.arch.v5','crit'],['pr.arch.k6','pr.arch.v6','ok']];

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function markup(s){
  return esc(s)
    .replace(/\[a\]/g,'<span class="cy-a">').replace(/\[\/a\]/g,'</span>')
    .replace(/\[c\]/g,'<span class="cy-c">').replace(/\[\/c\]/g,'</span>')
    .replace(/\[r\]/g,'<span class="cy-redact"></span>');
}
/* первые n видимых символов размеченной строки, теги не режутся */
function sliceHTML(html,n){
  var out='',count=0,k=0;
  while(k<html.length&&count<n){
    if(html[k]==='<'){var j=html.indexOf('>',k);out+=html.slice(k,j+1);k=j+1;}
    else if(html[k]==='&'){var e=html.indexOf(';',k);out+=html.slice(k,e+1);k=e+1;count++;}
    else{out+=html[k];k++;count++;}
  }
  var open=(out.match(/<span/g)||[]).length,close=(out.match(/<\/span>/g)||[]).length;
  for(var z=0;z<open-close;z++)out+='</span>';
  return out;
}
function visibleLen(html){var d=document.createElement('div');d.innerHTML=html;return d.textContent.length;}

var idx=0,typing=null,onDone=null,active=false;

function typeLines(host,lines,done){
  var li=0,ci=0,p=null,timer=0;
  var caret=document.createElement('span');caret.className='cy-caret';
  var html=lines.map(function(l){return markup(t(l[0]));});
  function finish(){
    clearTimeout(timer);
    host.innerHTML=html.map(function(h,i){return '<p'+(lines[i][1]?' class="mute"':'')+'>'+h+'</p>';}).join('');
    typing=null;if(done)done();
  }
  function step(){
    if(li>=html.length){if(p&&caret.parentNode)caret.remove();typing=null;if(done)done();return;}
    if(ci===0){p=document.createElement('p');if(lines[li][1])p.className='mute';host.appendChild(p);}
    ci++;p.innerHTML=sliceHTML(html[li],ci);p.appendChild(caret);
    if(ci>=visibleLen(html[li])){li++;ci=0;timer=setTimeout(step,240);}
    else timer=setTimeout(step,14+Math.random()*20);
  }
  typing={finish:finish};
  host.innerHTML='';step();
}

function paint(){
  var sc=SCENES[idx],center=$('cy-center'),lower=$('cy-lower'),inner=$('cy-lower-inner');
  CyberGL.show(sc.bg);
  $('cy-kicker').innerHTML=esc(t(sc.kicker)).replace('//','<b>//</b>');

  if(sc.center){
    center.innerHTML='<h1 class="cy-title'+(sc.center.cyan?' cyan':'')+'">'+esc(t(sc.center.title))+'</h1>'+
      '<div class="cy-sub">'+esc(t(sc.center.sub))+'</div>';
    center.classList.remove('hidden');center.classList.remove('cy-fade');void center.offsetWidth;center.classList.add('cy-fade');
  }else center.classList.add('hidden');

  var h='';
  if(sc.lead)h+='<p class="cy-lead'+(sc.leadAmber?' amber':'')+'">'+esc(t(sc.lead))+'</p>';
  if(sc.report){
    h+='<div class="cy-report">'+REPORT.map(function(r){
      var v=r[1]?'<span class="'+(r[2]||'')+'">'+esc(t(r[1]))+'</span>':'<span class="cy-redact"></span> <span class="cy-redact"></span>';
      return '<div class="row"><span class="k">'+esc(t(r[0]))+'</span>'+v+'</div>';
    }).join('')+'</div>';
  }
  h+='<div class="cy-body" id="cy-body"></div>';
  inner.innerHTML=h;
  lower.classList.remove('hidden');lower.classList.remove('cy-fade');void lower.offsetWidth;lower.classList.add('cy-fade');

  [].forEach.call($('cy-progress').children,function(d,n){d.className='cy-pd'+(n<idx?' done':n===idx?' on':'');});
  $('cy-cta').classList.remove('show');
  $('cy-hint').classList.toggle('hidden',!!sc.final);
  $('cy-skip').classList.toggle('hidden',!!sc.final);
  typeLines($('cy-body'),sc.lines,function(){if(sc.final)$('cy-cta').classList.add('show');});
}

function advance(){
  if(!active)return;
  if(typing){typing.finish();return;}
  if(idx<SCENES.length-1){idx++;paint();}
}
function go(n){idx=Math.max(0,Math.min(SCENES.length-1,n));paint();}
function finish(){
  if(!active)return;
  active=false;
  $('cy-cta').firstElementChild.textContent=t('ui.loading');
  if(onDone)onDone();
}

function start(done){
  onDone=done;active=true;idx=0;
  var prog=$('cy-progress');prog.innerHTML='';
  SCENES.forEach(function(){var d=document.createElement('div');d.className='cy-pd';prog.appendChild(d);});

  document.addEventListener('keydown',function(e){
    if(e.code!=='Space'&&e.code!=='Enter')return;
    if(e.target.closest&&e.target.closest('.arc-top'))return;   // пробел на кнопке настроек не листает
    e.preventDefault();
    if(SCENES[idx].final&&$('cy-cta').classList.contains('show'))finish();else advance();
  });
  document.addEventListener('click',function(e){
    if(e.target.closest('.arc-top,.cy-skip,.cy-cta'))return;
    advance();
  });
  $('cy-skip').addEventListener('click',function(){if(typing)typing.finish();go(SCENES.length-1);});
  $('cy-cta').addEventListener('click',finish);
  I18n.onChange(function(){if(active){if(typing)typing.finish();paint();}});
  paint();
}

window.CyberPrologue={start:start,textures:TEXTURES,go:go};
})();
