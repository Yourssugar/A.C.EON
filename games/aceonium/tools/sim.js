/* Проверка баланса v15-v20 (промыслы: NOPROD=1 отключает): node tools/sim.js [дней] [осторожность 1|0] [заходов в день]
   Игрок заходит каждый час с 7 до 23 (по умолчанию): забирает уголь, учит рецепты, нанимает,
   строит, заказывает улучшения посоха/сумки/склада, забивает очереди мастеров товаром,
   надевает лучшее и отправляет мага на дальний открытый тракт.
   Время между заходами считается через game.offline(), то есть по офлайн-правилам. */
var D=require('../js/data.js');
global.AcData=D;global.AcHall=require('../js/hall.js');
var G=require('../js/game.js');
if(process.env.OV){var ov=JSON.parse(process.env.OV);for(var k in ov)D[k]=ov[k];}

var DAYS=+process.argv[2]||10, CAUT=process.argv[3]!=='0';
var S=G.defaults();S.profile={name:'sim',gender:'m'};S.cautious=CAUT;
var g=new G.Game(S);g.start=function(){};g.sanitize();
S.started=true;   // v31: первый поход игрок начинает сам
/* v31: почему маг возвращался (ранен, не по силам, поражение) */
var WHY={};
var _rh=g.returnHome,_pt=g.pauseTrip;
g.returnHome=function(why){WHY[why]=(WHY[why]||0)+1;return _rh.apply(this,arguments);};
g.pauseTrip=function(m,why){var k=m?'pause':(why||'tired');WHY[k]=(WHY[k]||0)+1;return _pt.apply(this,arguments);};
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
  g.order('carpenter','staff');g.order('tanner','bag');
  /* v27: склад улучшает бригада; сундуки, когда места под вещи мало */
  var stc=g.storeCost();if(stc&&g.canPay(stc)&&S.gold>stc.gold*2)g.buyStore();
  if(g.chestRoom()<5){var own=S.furn.filter(function(x){return x.t==='schest'&&!x.st&&x.lv<3;}).sort(function(a,b){return a.lv-b.lv;})[0];
    var bc=g.furnBuyBlock('schest')?null:g.furnBuyCost('schest'),uc=own?g.furnUpCost(own):null,pick=bc&&(!uc||bc.gold<=uc.gold)?'buy':uc?'up':null;
    var cc2=pick==='buy'?bc:uc;if(pick&&g.canPay(cc2)&&S.gold>cc2.gold*2){if(pick==='buy')g.furnBuy('schest');else g.furnUp(own);}}
  /* рецепты: всё, что по карману, но не больше трети золота */
  D.GOODS.forEach(function(gd){if(g.canLearn(gd.id)&&gd.teach<=S.gold*0.5)g.learn(gd.id);});
  /* постройки таверны, если золота много */
  ['hall','bedroom'].forEach(function(b){var c=g.buildCost(b);if(c&&S.gold>c.gold*2)g.buildUp(b);});
  /* v25: декор и стойка за золото и репутацию (вместо уровней убранства) */
  for(var di=0;di<4;di++){
    var best=null,bc=null;
    D.FURN_ORDER.forEach(function(t){if(t==='table'||g.furnBuyBlock(t))return;var c=g.furnBuyCost(t);if(!bc||c.gold<bc.gold){bc=c;best={buy:t};}});
    S.furn.forEach(function(it){if(D.FURN[it.t].cat==='table'||it.st||g.furnUpBlock(it))return;var c=g.furnUpCost(it);if(!bc||c.gold<bc.gold){bc=c;best={up:it};}});
    if(!best||S.gold<bc.gold*6)break;
    var r=best.buy?g.furnBuy(best.buy):g.furnUp(best.up);if(typeof r!=='object')break;
  }
  var cc=g.counterCost();if(cc&&g.canPay(cc)&&S.gold>cc.gold*2)g.counterUp();
  /* v26: витрины и грузчик. Игрок в сети сам выкладывает всё со склада */
  if(!process.env.NOSHELF){
    D.SHELF_CATS.forEach(function(cat){
      var waiting=D.GOODS.some(function(gd){return D.shelfCat(gd.id)===cat&&g.storeFreeTotal(gd.id)>0;});
      if(!waiting||g.shelfUsed(cat)<g.shelfCap(cat))return;
      var t=D.SHELF_OF[cat],own=S.furn.filter(function(x){return x.t===t&&!x.st&&x.lv<3;})[0];
      var c=own?g.furnUpCost(own):g.furnBuyCost(t);
      if(c&&g.canPay(c)&&S.gold>c.gold*3){if(own)g.furnUp(own);else g.furnBuy(t);}
    });
    if(!g.loader().hired&&S.gold>D.LOADER.hire*3)g.loaderHire();
    var lc=g.loaderUpCost();if(lc&&g.canPay(lc)&&S.gold>lc.gold*4)g.loaderUp();
  }
  g.shelfFill(9999);
  /* общая очередь и инструменты */
  var qc=g.qSlotCost();if(qc&&S.gold>qc.gold*3)g.buyQSlot();
  /* товар: по кругу мастерам самый дорогой из известных, но не трогая запас на посох */
  var reserve=g.orderCost('staff'),ids=Object.keys(S.masters).filter(function(id){return S.masters[id].hired;});
  for(var round=0;round<20&&S.queue.length<S.qSlots;round++){
    var any=false;
    ids.forEach(function(id2){
      if(S.queue.length>=S.qSlots||g.queueOf(id2).length>round)return;
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
    for(var si=0;si<5;si++){
      var opt=null,oc=null;
      if(!g.furnBuyBlock('table')||g.furnBuyBlock('table')==='cost'){if(g.furnBuyBlock('table')!=='seats'){oc=g.furnBuyCost('table');opt={buy:1};}}
      S.furn.forEach(function(it){if(it.t!=='table'||it.st)return;var bl=g.furnUpBlock(it);if(bl&&bl!=='cost')return;var c=g.furnUpCost(it);if(!oc||c.gold<oc.gold){oc=c;opt={up:it};}});
      if(!opt||!g.canPay(oc)||S.gold<oc.gold*4)break;
      var rr=opt.buy?g.furnBuy('table'):g.furnUp(opt.up);if(typeof rr!=='object')break;
    }
  }
  /* питомцы: нанять мастера, когда есть лишнее золото, тренировать активного */
  if(!S.pets.hired&&S.gold>D.PETMASTER_HIRE*2&&g.petHire())mark('pets','мастер питомцев');
  if(S.pets.hired&&S.pets.active){var pc=g.petCost(S.pets.active);if(pc&&S.gold>pc.gold*3)g.petTrain(S.pets.active);}
  /* лучший питомец: у кого больше урона на текущем уровне */
  var best=S.pets.active,bv=-1;for(var pid in S.pets.own){var dd=D.PET_BY[pid],v=(dd.eff.dmg||0)*S.pets.own[pid].lvl;if(v>bv){bv=v;best=pid;}}if(best)S.pets.active=best;
  /* коллекции: обычная копия, когда их две и больше */
  D.GOODS.forEach(function(gd){
    if(g.invCount(gd.id)>1&&!g.collQ(gd.m,gd.id,0)&&S.inv[gd.id+':0']>0)g.collAdd(gd.id,0);
    /* v20: копии, которые держатся для книги, игрок сразу вкладывает (SIMFREE=1: отпускает в продажу) */
    for(var q=1;q<4;q++)if(S.inv[gd.id+':'+q]>0&&g.bookNeed(gd.id,q)){if(process.env.SIMFREE)g.setBookFree(gd.id,q,true);else g.collAdd(gd.id,q);}
  });
  /* надеть лучшее */
  D.GOODS.forEach(function(gd){if(!gd.slot||!g.invCount(gd.id))return;var cur=S.equip[gd.slot],cv=cur?(D.GOOD_BY[cur.id].price*D.QUAL[cur.q]):0;if(gd.price>cv)g.equipItem(gd.id);});
  /* v32: долги - DEBT=доля золота за заход (по умолчанию 0.15) */
  g.payDebt(S.gold*(process.env.DEBT!==undefined?+process.env.DEBT:0.15));
  D.SKILLS.forEach(function(s){while(g.buySkill(s.id));});
  /* куда идти */
  var top=0;for(var t=0;t<D.TRACTS.length;t++)if(g.tractOpen(t))top=t;
  var target=top,cands=S.tracts[top].clears?[g.staffCost(),g.orderCost('bag')||{},g.storeCost()||{}]:[g.staffCost()];
  for(var j=0;j<cands.length;j++){var nd=lack(cands[j]);
    if(nd&&RES_TRACT[nd]!==undefined&&RES_TRACT[nd]<top&&!D.RES_BY[nd].rare){target=RES_TRACT[nd];break;}}
  S.lastTract=target;S.plan.c=[0,0,0,0];S.plan.i=4;
}
var gold0=0,sold0=0;
while(T<DAYS*86400){
  var hour=Math.floor(T%86400/3600);
  if(hour>=7&&hour<23)shop();
  /* VISIT=минуты: как часто игрок заходит (по умолчанию раз в час) */
  var STEP=(+process.env.VISIT||60)*60;
  g.offline(STEP);T+=STEP;
  for(var t=0;t<4;t++)if(S.tracts[t].clears>0)mark('clear'+t,'ТРАКТ '+t+' пройден');
  if(T%86400===0){
    log.push(fmtT(T)+'  gold '+D.fmt(S.gold)+' (+'+D.fmt(S.stats.goldEarned-gold0)+' продаж '+(S.stats.sold-sold0)+') staff '+S.staff+' dps '+D.fmt(g.rawDps())+' mlvl '+S.mlvl+
      ' bag '+S.bagLvl+' store '+S.storeLvl+' prod '+D.PROD.map(function(d){return d.id[0]+S.prod[d.id].lvl;}).join('')+' st'+S.prod.stable.lvl+' cr'+S.crews+' hall '+S.build.hall+' best '+S.tracts.map(function(x){return x.best+'/'+x.clears;}).join(',')+' lost '+S.stats.lostBags+' why '+JSON.stringify(WHY)+' debts '+S.debt.n+' sk '+D.SKILLS.map(function(x){return S.skills[x.id].l;}).join('/'));WHY={};
    log.push('      masters '+Object.keys(S.masters).map(function(id){var m=S.masters[id];return id[0]+(m.hired?m.lvl+'/'+m.known.length:'-');}).join(' ')+
      ' pets '+Object.keys(S.pets.own).map(function(k){return k+S.pets.own[k].lvl;}).join(',')+
      ' coll '+Object.keys(S.masters).map(function(id){return id[0]+g.collCount(id)+'/'+g.collList(id).length;}).join(' ')+
      ' equip '+D.SLOTS.map(function(sl){return S.equip[sl]?S.equip[sl].id:'-';}).join(',')+' hp '+D.fmt(g.maxHp())+' tav '+g.seatCount()+'м d'+g.decorPts()+' c'+S.counter+' rep'+Math.floor(S.rep)+' L'+(S.loader.hired?S.loader.lvl:0)+' it'+g.itemCount()+'/'+g.itemCap()+' hold'+S.queue.filter(function(o){return o.hold;}).length+' sh'+D.SHELF_CATS.map(function(c){return g.shelfUsed(c)+'/'+g.shelfCap(c);}).join(',')+' '+(S.tav.brewer.hired?'b'+S.tav.brewer.lvl+'/'+S.tav.brewer.help:'-')+(S.tav.cook.hired?' c'+S.tav.cook.lvl+'/'+S.tav.cook.help:'')+' зал+'+D.fmt(S.tav.inc-(global.__tinc||0))+' tools '+Object.keys(S.masters).map(function(id){return S.masters[id].tools;}).join('')+' wait '+Object.keys(S.masters).map(function(id){var m=S.masters[id];return id[0]+(m.tst>=D.STAGES&&!m.tbt?'W':'')+Math.round(m.sav||0)+'/'+(m.tools<D.TOOLS_MAX?D.masterPart(m.tools):0);}).join(' '));
    gold0=S.stats.goldEarned;sold0=S.stats.sold;global.__tinc=S.tav.inc;
  }
}
console.log(log.join('\n'));
console.log('store',JSON.stringify(S.store));
