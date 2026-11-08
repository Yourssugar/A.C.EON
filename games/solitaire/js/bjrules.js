/* A.C.EON CARDS: правила 21 без ставок. Без DOM, проверяется в node.

   Два варианта:
   bj     блэкджек: колода 52 карты (4 колоды в башмаке), туз 1 или 11, картинки 10.
          Дилер берёт до 17 и на мягких 17 останавливается. Блэкджек (туз + десятка с двух карт)
          бьёт обычные 21. Пару можно разделить один раз; разделённые тузы получают по одной карте.
   ochko  очко: колода 36 карт (6..туз), валет 2, дама 3, король 4, туз 11, остальные по номиналу.
          Два туза сразу это «золотое очко» и победа. Банкир берёт до 17.
   Карта {s: масть 0..3, r: 1..13}. Итог руки: 'win' | 'loss' | 'push'. */
(function(){
'use strict';

function rng(seed){var a=seed|0;return function(){a=(a+0x6D2B79F5)|0;var t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};}

function shoe(kind,rnd){
  var cards=[],decks=kind==='bj'?4:1,ranks=kind==='bj'?[1,2,3,4,5,6,7,8,9,10,11,12,13]:[1,6,7,8,9,10,11,12,13];
  for(var d=0;d<decks;d++)for(var s=0;s<4;s++)ranks.forEach(function(r){cards.push({s:s,r:r});});
  for(var i=cards.length-1;i>0;i--){var j=Math.floor(rnd()*(i+1)),t=cards[i];cards[i]=cards[j];cards[j]=t;}
  return cards;
}
/* очки одной карты */
function cardVal(kind,c){
  if(kind==='ochko'){if(c.r===1)return 11;if(c.r===11)return 2;if(c.r===12)return 3;if(c.r===13)return 4;return c.r;}
  if(c.r===1)return 1;return Math.min(10,c.r);
}
/* сумма руки: {t: итог, soft: есть туз, считающийся за 11} */
function total(kind,cards){
  var t=0,aces=0;
  cards.forEach(function(c){t+=cardVal(kind,c);if(c.r===1)aces++;});
  if(kind==='ochko')return {t:t,soft:false};
  var soft=false;if(aces&&t+10<=21){t+=10;soft=true;}
  return {t:t,soft:soft};
}
function isNatural(kind,cards){
  if(cards.length!==2)return false;
  if(kind==='ochko')return cards[0].r===1&&cards[1].r===1;
  return total(kind,cards).t===21;
}
function bust(kind,cards){
  if(kind==='ochko'&&isNatural(kind,cards))return false;
  return total(kind,cards).t>21;
}
/* дилер (банкир) берёт ещё? */
function dealerHits(kind,cards){
  var tt=total(kind,cards);
  return tt.t<17;
}
function canSplit(kind,hand,nHands){
  if(kind!=='bj'||nHands>=2||hand.cards.length!==2||hand.fromSplit)return false;
  return cardVal(kind,hand.cards[0])===cardVal(kind,hand.cards[1]);
}

/* итог руки игрока против дилера */
function settle(kind,hand,dealer){
  var p=hand.cards,pn=isNatural(kind,p)&&!hand.fromSplit,dn=isNatural(kind,dealer);
  if(kind==='ochko'){
    if(pn&&!dn)return 'win';
    if(dn&&!pn)return 'loss';
    if(pn&&dn)return 'push';
  }else{
    if(pn&&dn)return 'push';
    if(pn)return 'win';
    if(dn)return 'loss';
  }
  if(bust(kind,p))return 'loss';
  if(bust(kind,dealer))return 'win';
  var a=total(kind,p).t,b=total(kind,dealer).t;
  return a>b?'win':a<b?'loss':'push';
}

/* подсказка и ход ботов: базовая стратегия без удвоения.
   Возвращает 'hit' | 'stand' | 'split'. up: открытая карта дилера. */
function advice(kind,hand,up,nHands){
  var c=hand.cards,tt=total(kind,c),u=cardVal(kind,up);
  if(kind==='ochko'){
    if(isNatural(kind,c))return 'stand';
    return tt.t<=16?'hit':'stand';
  }
  if(u===1)u=11;
  if(canSplit(kind,hand,nHands)){
    var v=cardVal(kind,c[0]);
    if(v===1||v===8)return 'split';
    if((v===2||v===3||v===7)&&u<=7)return 'split';
    if(v===6&&u<=6)return 'split';
    if(v===9&&u!==7&&u<10)return 'split';
  }
  if(tt.soft){
    if(tt.t>=19)return 'stand';
    if(tt.t===18)return u>=9?'hit':'stand';
    return 'hit';
  }
  if(tt.t>=17)return 'stand';
  if(tt.t>=13)return u<=6?'stand':'hit';
  if(tt.t===12)return u>=4&&u<=6?'stand':'hit';
  return 'hit';
}

window.BJRules={rng:rng,shoe:shoe,cardVal:cardVal,total:total,isNatural:isNatural,bust:bust,dealerHits:dealerHits,canSplit:canSplit,settle:settle,advice:advice};
})();
