/* KOTAE!: правила забега, без экрана.
   Вопросы подтемы: data/<язык>/<жанр-подтема>.json, пока только ru (другие языки берут ru).
   Забег: вопросы идут, пока нет 10 верных или не кончились жизни (QCat.lives).
   Сначала берутся вопросы, которых игрок ещё не видел (seen), потом остальные.
   "Ты уверен?": шанс 15% на вопрос, не на первом, не чаще 2 раз за забег, не после 50/50 и NODE,
   и всегда независимо от того, верен ли выбор. */
(function(){
'use strict';

var GOAL=10,SURE_P=.15,SURE_MAX=2;
var cache={};

function mem(){return Store.get('quiz');}
function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.random()*(i+1)|0,t=a[i];a[i]=a[j];a[j]=t;}return a;}

function load(key){
  if(cache[key])return Promise.resolve(cache[key]);
  var u='data/ru/'+key+'.json';
  return fetch(window.Boot?Boot.url(u):u).then(function(r){if(!r.ok)throw new Error(r.status);return r.json();})
    .then(function(d){cache[key]=d;return d;});
}
function levelData(d,n){for(var i=0;i<d.levels.length;i++)if(d.levels[i].level===n)return d.levels[i];return null;}
function title(d,n){var l=levelData(d,n);return (l&&l.card)||(d.titles&&d.titles[n-1])||'';}

function Run(key,level,d){
  var L=levelData(d,level),m=mem(),sk=key+'-'+level;
  var seen=m.seen[sk]||[],fresh=[],old=[];
  L.q.forEach(function(q){(seen.indexOf(q.id)<0?fresh:old).push(q);});
  if(!fresh.length){m.seen[sk]=[];fresh=old;old=[];}
  this.key=key;this.level=level;this.card=title(d,level);
  this.queue=shuffle(fresh).concat(shuffle(old));
  this.lives=QCat.lives(level);this.maxLives=this.lives;
  this.correct=0;this.wrong=0;this.asked=0;this.used={fifty:false,node:false,host:false};
  this.sureCount=0;this.cur=null;this.done=false;this.won=false;
  m.stats.runs++;Store.save('quiz');
}
Run.prototype.next=function(){
  var q=this.queue.shift();
  if(!q){this.queue=shuffle(levelData(cache[this.key],this.level).q.slice());q=this.queue.shift();}
  var order=shuffle([0,1,2,3]);
  this.cur={q:q,opts:order.map(function(k){return {text:q.a[k],ok:k===0};}),pick:-1,gone:[],sureAsked:false,helped:false,answered:false};
  this.asked++;
  var m=mem(),sk=this.key+'-'+this.level;
  (m.seen[sk]=m.seen[sk]||[]).indexOf(q.id)<0&&m.seen[sk].push(q.id);
  Store.save('quiz');
  return this.cur;
};
Run.prototype.right=function(){for(var i=0;i<4;i++)if(this.cur.opts[i].ok)return i;return -1;};
/* выбор варианта: 'sure' (спросить), 'ok' или 'bad' (засчитано) */
Run.prototype.choose=function(i){
  var c=this.cur;if(c.answered||c.gone.indexOf(i)>=0)return null;
  c.pick=i;
  if(!c.sureAsked&&!c.helped&&this.asked>1&&this.sureCount<SURE_MAX&&Math.random()<SURE_P){
    c.sureAsked=true;this.sureCount++;mem().stats.sureAsked++;return 'sure';
  }
  return this.commit();
};
Run.prototype.change=function(){this.cur.pick=-1;mem().stats.sureChanged++;Store.save('quiz');};
Run.prototype.commit=function(){
  var c=this.cur,m=mem();c.answered=true;
  var ok=c.opts[c.pick].ok;
  if(ok){this.correct++;m.stats.correct++;}else{this.wrong++;this.lives--;m.stats.wrong++;}
  if(this.correct>=GOAL){this.done=true;this.won=true;}
  else if(this.lives<=0){this.done=true;this.won=false;}
  Store.save('quiz');
  return ok?'ok':'bad';
};
Run.prototype.fifty=function(){
  if(this.used.fifty)return null;this.used.fifty=true;this.cur.helped=true;mem().stats.hints++;
  var bad=[];for(var i=0;i<4;i++)if(!this.cur.opts[i].ok)bad.push(i);
  this.cur.gone=shuffle(bad).slice(0,2);return this.cur.gone;
};
Run.prototype.node=function(){if(this.used.node)return null;this.used.node=true;this.cur.helped=true;mem().stats.hints++;return this.cur.q.a[0];};
Run.prototype.host=function(){if(this.used.host)return null;this.used.host=true;mem().stats.hints++;return this.cur.q.h;};
Run.prototype.hinted=function(){return this.used.fifty||this.used.node||this.used.host;};
Run.prototype.stars=function(){return !this.won?0:1+(this.wrong===0?1:0)+(this.wrong===0&&!this.hinted()?1:0);};
/* итог: сохраняет прогресс, возвращает {stars, newCard, best} */
Run.prototype.finish=function(){
  var m=mem(),st=this.stars(),res={stars:st,newCard:false};
  if(this.won){
    var p=m.prog[this.key]||(m.prog[this.key]={done:0,stars:[]});
    p.done=Math.max(p.done||0,this.level);
    p.stars[this.level-1]=Math.max(p.stars[this.level-1]||0,st);
    var cid=this.key+'-'+this.level;
    if(m.cards.indexOf(cid)<0){m.cards.push(cid);res.newCard=true;}
  }
  Store.save('quiz');
  return res;
};

window.QEngine={
  load:load,title:title,GOAL:GOAL,
  cached:function(key){return cache[key]||null;},
  start:function(key,level){return load(key).then(function(d){if(!levelData(d,level))throw new Error('no level');return new Run(key,level,d);});}
};
})();
