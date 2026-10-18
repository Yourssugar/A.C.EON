/* Проверка баланса v15 (промыслы: NOPROD=1 отключает): node tools/sim.js [дней] [осторожность 1|0] [заходов в день]
   Игрок заходит каждый час с 7 до 23 (по умолчанию): забирает уголь, учит рецепты, нанимает,
   строит, заказывает улучшения посоха/сумки/склада, забивает очереди мастеров товаром,
   надевает лучшее и отправляет мага на дальний открытый тракт.
   Время между заходами считается через game.offline(), то есть по офлайн-правилам. */
var D=require('../js/data.js');
var G=require('../js/game.js');
if(process.env.OV){var ov=JSON.parse(process.env.OV);for(var k in ov)D[k]=ov[k];}

var DAYS=+process.argv[2]||10, CAUT=process.argv[3]!=='0';
var S=G.defaults();S.profile={name:'sim',gender:'m'};S.cautious=CAUT;
var g=new G.Game(S);g.start=function(){};
var T=0,log=[];
function fmtT(s){var d=Math.floor(s/86400),h=Math.floor(s%86400/3600);return 'd'+d+' '+(h<10?'0':'')+h+'h';}
function lack(cost){for(var k in cost)if(g.have(k)<cost[k])return k;return null;}
var RES_TRACT={};D.TRACTS.forEach(function(tr,i){tr.res.concat([tr.rare]).forEach(function(r){if(RES_TRACT[r]===undefined)RES_TRACT[r]=i;});});
var marks={};
function mark(k,txt){if(!marks[k]){marks[k]=1;log.push(fmtT(T)+'  '+txt+'  gold '+D.fmt(S.gold)+' staff '+S.staff+' mlvl '+S.mlvl);}}

function shop(){
  g.prodCollectAll(true);
  /* найм и постройки по порядку */
  ['carpenter','smith','tanner','jeweler'].forEach(function(id){
    var d=D.MASTER_BY[id];
    if(d.build&&!g.buildLvl(d.build)&&g.buildUp(d.build))mark('b'+d.build,'постройка '+d.build);
    if(g.hire(id))mark('h'+id,'нанят '+id);
  });
  if(S.masters.smith.hired&&!S.prod.mine.lvl&&!S.prod.mine.bt&&g.prodBuild('mine'))mark('pmine','построена шахта');
  /* улучшения мага заказом */
  g.order('carpenter','staff');g.order('tanner','bag');g.order('carpenter','store');
  /* рецепты: всё, что по карману, но не больше трети золота */
  D.GOODS.forEach(function(gd){if(g.canLearn(gd.id)&&gd.teach<=S.gold*0.5)g.learn(gd.id);});
  /* постройки таверны, если золота много */
  ['hall','bedroom','decor'].forEach(function(b){var c=g.buildCost(b);if(c&&S.gold>c.gold*2)g.buildUp(b);});
  /* общая очередь и инструменты */
  var qc=g.qSlotCost();if(qc&&S.gold>qc.gold*3)g.buyQSlot();
  /* товар: по кругу мастерам самый дорогой из известных, но не трогая запас на посох */
  var reserve=g.orderCost('staff'),ids=Object.keys(S.masters).filter(function(id){return S.masters[id].hired;});
  for(var round=0;round<20&&S.queue.length<S.qSlots-2;round++){
    var any=false;
    ids.forEach(function(id2){
      if(S.queue.length>=S.qSlots-2||g.queueOf(id2).length>round)return;
      var list=S.masters[id2].known.map(function(r){return D.GOOD_BY[r];}).sort(function(a,b){return b.price-a.price;});
      for(var i=0;i<list.length;i++){
        var gd=list[i];if(g.invCount(gd.id)>=8)continue;
        var after=true;for(var k in gd.cost){var need=gd.cost[k]+(reserve[k]||0);if(g.have(k)<need){after=false;break;}}
        if(after&&g.order(id2,gd.id)){any=true;break;}
      }
    });
    if(!any)break;
  }
  /* промыслы и инструменты: не больше трети золота за заход, после рецептов и товара */
  var budget=S.gold/3,spend=function(c){if(!c||c.gold>budget)return false;budget-=c.gold;return true;};
  var plist=process.env.NOPROD?[{id:'mine'}]:D.PROD.concat([{id:'stable'}]);
  plist.forEach(function(d){
    var o=S.prod[d.id],def=g.prodDef(d.id);
    if(!o.lvl&&!o.bt){if(g.prodBuildBlock(d.id)===''&&spend(def.build)&&g.prodBuild(d.id))mark('p'+d.id,'построен '+d.id);return;}
    for(var i=0;i<20;i++){var c=g.prodCost(d.id);if(!spend(c))break;g.prodInvest(d.id);}
  });
  var cc=g.crewCost();if(!process.env.NOPROD&&cc&&S.gold>cc.gold*4&&g.buyCrew())mark('crew'+S.crews,'бригада '+S.crews);
  for(var id3 in S.masters){if(!S.masters[id3].hired)continue;
    for(var ti=0;ti<20;ti++){var tc=g.toolsCost(id3);if(!tc||!g.canPay(tc)||!spend(tc))break;g.buyTools(id3);}}
  /* зал (v16): пивовар, повар, места, помощники, если не хватает порций */
  if(!process.env.NOTAV){
    D.WORKER_ORDER.forEach(function(w){
      var o=S.tav[w];
      if(!o.hired){if(g.workerBlock(w)===''&&S.gold>D.WORKERS[w].hire*3&&g.workerHire(w))mark('w'+w,'нанят '+w);return;}
      var hc=g.helpCost(w);if(hc&&g.needH(w)>g.capacityH(w)&&S.gold>hc.gold*3&&g.hireHelp(w))mark('h'+w+o.help,w+' помощник '+o.help);
    });
    for(var si=0;si<5;si++){var sc=g.seatCost();if(!sc||S.gold<sc.gold*4)break;g.buySeat();}
  }
  /* питомцы: нанять мастера, когда есть лишнее золото, тренировать активного */
  if(!S.pets.hired&&S.gold>D.PETMASTER_HIRE*2&&g.petHire())mark('pets','мастер питомцев');
  if(S.pets.hired&&S.pets.active){var pc=g.petCost(S.pets.active);if(pc&&S.gold>pc.gold*3)g.petTrain(S.pets.active);}
  /* лучший питомец: у кого больше урона на текущем уровне */
  var best=S.pets.active,bv=-1;for(var pid in S.pets.own){var dd=D.PET_BY[pid],v=(dd.eff.dmg||0)*S.pets.own[pid].lvl;if(v>bv){bv=v;best=pid;}}if(best)S.pets.active=best;
  /* коллекции: по одной вещи каждого рецепта */
  D.GOODS.forEach(function(gd){if(g.invCount(gd.id)>1)g.collAdd(gd.id);});
  /* надеть лучшее */
  D.GOODS.forEach(function(gd){if(!gd.slot||!g.invCount(gd.id))return;var cur=S.equip[gd.slot],cv=cur?(D.GOOD_BY[cur.id].price*D.QUAL[cur.q]):0;if(gd.price>cv)g.equipItem(gd.id);});
  D.SKILLS.forEach(function(s){while(g.buySkill(s.id));});
  /* куда идти */
  var top=0;for(var t=0;t<D.TRACTS.length;t++)if(g.tractOpen(t))top=t;
  var target=top,cands=S.tracts[top].clears?[g.staffCost(),g.orderCost('bag')||{},g.orderCost('store')||{}]:[g.staffCost()];
  for(var j=0;j<cands.length;j++){var nd=lack(cands[j]);
    if(nd&&RES_TRACT[nd]!==undefined&&RES_TRACT[nd]<top&&!D.RES_BY[nd].rare){target=RES_TRACT[nd];break;}}
  S.lastTract=target;S.plan.c=[0,0,0,0];S.plan.i=4;
}
var gold0=0,sold0=0;
while(T<DAYS*86400){
  var hour=Math.floor(T%86400/3600);
  if(hour>=7&&hour<23)shop();
  g.offline(3600);T+=3600;
  for(var t=0;t<4;t++)if(S.tracts[t].clears>0)mark('clear'+t,'ТРАКТ '+t+' пройден');
  if(T%86400===0){
    log.push(fmtT(T)+'  gold '+D.fmt(S.gold)+' (+'+D.fmt(S.stats.goldEarned-gold0)+' продаж '+(S.stats.sold-sold0)+') staff '+S.staff+' dps '+D.fmt(g.rawDps())+' mlvl '+S.mlvl+
      ' bag '+S.bagLvl+' store '+S.storeLvl+' prod '+D.PROD.map(function(d){return d.id[0]+S.prod[d.id].lvl;}).join('')+' st'+S.prod.stable.lvl+' cr'+S.crews+' hall '+S.build.hall+' best '+S.tracts.map(function(x){return x.best+'/'+x.clears;}).join(',')+' lost '+S.stats.lostBags);
    log.push('      masters '+Object.keys(S.masters).map(function(id){var m=S.masters[id];return id[0]+(m.hired?m.lvl+'/'+m.known.length:'-');}).join(' ')+
      ' pets '+Object.keys(S.pets.own).map(function(k){return k+S.pets.own[k].lvl;}).join(',')+
      ' coll '+Object.keys(S.masters).map(function(id){return id[0]+g.collCount(id)+'/'+g.collList(id).length;}).join(' ')+
      ' equip '+D.SLOTS.map(function(sl){return S.equip[sl]?S.equip[sl].id:'-';}).join(',')+' hp '+D.fmt(g.maxHp())+' tav '+S.tav.seats+'м '+(S.tav.brewer.hired?'b'+S.tav.brewer.lvl+'/'+S.tav.brewer.help:'-')+(S.tav.cook.hired?' c'+S.tav.cook.lvl+'/'+S.tav.cook.help:'')+' зал+'+D.fmt(S.tav.inc-(global.__tinc||0))+' tools '+Object.keys(S.masters).map(function(id){return S.masters[id].tools;}).join(''));
    gold0=S.stats.goldEarned;sold0=S.stats.sold;global.__tinc=S.tav.inc;
  }
}
console.log(log.join('\n'));
console.log('store',JSON.stringify(S.store));
