/* Aceonium: головные уборы и аксессуары (v28). Строятся из простых фигур прямо в three.js, моделей качать не нужно.
   Единицы: ширина головы = 1, начало координат - макушка, y вверх, z вперёд (лицо).
   Avatar сам масштабирует под голову и вешает на кость головы.
   Hats.make(T, id, [цвет1, цвет2], {toon, grad}) -> Group | null;  Hats.list - что есть */
(function(){
'use strict';
var LIST=['none','wizard','straw','beret','bard','cap','headband','wreath','crown','goggles','catears','glasses'];
var MATC={};
function mat(T,col,o,opt){
  var key=col+':'+(o.metal?1:0)+':'+(opt.toon?1:0);
  if(MATC[key])return MATC[key];
  var m=opt.toon?new T.MeshToonMaterial({color:col,gradientMap:opt.grad||null}):new T.MeshStandardMaterial({color:col,roughness:o.metal?0.35:0.85,metalness:o.metal?0.85:0});
  return (MATC[key]=m);
}
function make(T,id,cols,opt){
  if(!id||id==='none')return null;
  opt=opt||{};cols=cols||['#5a3a8a','#d8b040'];
  var G=new T.Group(),c1=cols[0],c2=cols[1]||cols[0];
  function add(geo,col,x,y,z,o){o=o||{};var m=new T.Mesh(geo,mat(T,col,o,opt));m.position.set(x||0,y||0,z||0);if(o.rx)m.rotation.x=o.rx;if(o.rz)m.rotation.z=o.rz;if(o.ry)m.rotation.y=o.ry;if(o.s)m.scale.set(o.s[0],o.s[1],o.s[2]);m.castShadow=true;G.add(m);return m;}
  if(id==='wizard'){
    /* высокий колпак с загнутой верхушкой и широкими полями */
    add(new T.CylinderGeometry(0.98,1.0,0.04,28),c1,0,-0.2,0);
    add(new T.CylinderGeometry(0.56,0.6,0.14,24),c2,0,-0.12,0);
    var a=add(new T.CylinderGeometry(0.4,0.58,0.55,24),c1,0,0.17,0);
    var b=add(new T.CylinderGeometry(0.22,0.4,0.5,20),c1,0.04,0.66,-0.02,{rz:-0.18,rx:-0.08});
    add(new T.ConeGeometry(0.22,0.5,16),c1,0.17,1.1,-0.07,{rz:-0.55,rx:-0.18});
    add(new T.SphereGeometry(0.07,10,8),c2,0.36,1.3,-0.13);
  }else if(id==='straw'){
    add(new T.CylinderGeometry(1.15,1.2,0.035,32),c1,0,-0.18,0);
    add(new T.CylinderGeometry(0.52,0.6,0.36,24),c1,0,0.0,0);
    add(new T.CylinderGeometry(0.61,0.61,0.1,24),c2,0,-0.12,0);
  }else if(id==='beret'||id==='bard'){
    add(new T.SphereGeometry(0.7,24,12),c1,0.08,0.02,-0.04,{s:[1,0.32,1],rz:0.22});
    add(new T.CylinderGeometry(0.55,0.56,0.08,24),c1,0,-0.1,0);
    add(new T.SphereGeometry(0.06,8,6),c2,0.08,0.24,-0.02);
    if(id==='bard'){var f=add(new T.SphereGeometry(0.5,12,8),c2,-0.42,0.28,-0.32,{s:[0.08,1,0.22],rz:0.7,rx:-0.5});}
  }else if(id==='cap'){
    /* вязаная шапка с отворотом */
    add(new T.SphereGeometry(0.58,24,12,0,Math.PI*2,0,Math.PI/2),c1,0,-0.12,0,{s:[1,1.05,1.05]});
    add(new T.TorusGeometry(0.57,0.09,10,28),c2,0,-0.14,0,{rx:Math.PI/2});
    add(new T.SphereGeometry(0.13,10,8),c2,0,0.5,0);
  }else if(id==='headband'){
    add(new T.TorusGeometry(0.56,0.06,8,28),c1,0,-0.3,0.02,{rx:Math.PI/2-0.12});
    add(new T.SphereGeometry(0.08,10,8),c2,0,-0.28,0.6);
  }else if(id==='wreath'){
    add(new T.TorusGeometry(0.57,0.07,8,26),'#4f8a32',0,-0.14,0,{rx:Math.PI/2-0.08});
    for(var i=0;i<8;i++){var an=i/8*Math.PI*2;add(new T.SphereGeometry(0.09,8,6),i%2?c1:c2,Math.sin(an)*0.58,-0.12+Math.cos(an)*0.04,Math.cos(an)*0.58);}
  }else if(id==='crown'){
    var gold=c2||'#d8b040';
    add(new T.CylinderGeometry(0.55,0.53,0.22,24,1,true),gold,0,-0.1,0,{metal:true});
    for(var k=0;k<6;k++){var a2=k/6*Math.PI*2;add(new T.ConeGeometry(0.1,0.24,8),gold,Math.sin(a2)*0.53,0.12,Math.cos(a2)*0.53,{metal:true});
      add(new T.SphereGeometry(0.055,8,6),c1,Math.sin(a2+0.52)*0.56,-0.08,Math.cos(a2+0.52)*0.56);}
  }else if(id==='goggles'){
    /* очки-гогглы из другого мира, подняты на лоб */
    add(new T.TorusGeometry(0.56,0.045,8,28),'#3a2a24',0,-0.3,0,{rx:Math.PI/2-0.25});
    [-0.2,0.2].forEach(function(x){add(new T.CylinderGeometry(0.15,0.15,0.12,16),c2,x,-0.22,0.55,{rx:Math.PI/2-0.25,metal:true});
      add(new T.CylinderGeometry(0.11,0.11,0.13,16),c1,x,-0.215,0.56,{rx:Math.PI/2-0.25});});
  }else if(id==='catears'){
    [-1,1].forEach(function(s){add(new T.ConeGeometry(0.2,0.42,4),c1,s*0.36,0.12,0,{rz:-s*0.35});add(new T.ConeGeometry(0.11,0.26,4),c2,s*0.35,0.1,0.06,{rz:-s*0.35});});
    add(new T.TorusGeometry(0.55,0.03,6,24,Math.PI),c1,0,-0.12,0,{ry:Math.PI/2});
  }else if(id==='glasses'){
    [-0.22,0.22].forEach(function(x){add(new T.TorusGeometry(0.13,0.025,6,18),c2,x,-0.5,0.6,{metal:true});});
    add(new T.CylinderGeometry(0.02,0.02,0.18,6),c2,0,-0.48,0.6,{rz:Math.PI/2,metal:true});
  }else return null;
  return G;
}
window.Hats={make:make,list:LIST};
})();
