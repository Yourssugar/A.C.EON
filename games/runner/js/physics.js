/* A.C.EON RUNNER: движение героя. Общее для бесконечного бега и приключения.
   Всё в пикселях и секундах, ось y вниз.

   Прыжок: чем дольше держишь кнопку, тем выше (до HOLD секунд ослабленной гравитации).
   Отпустил рано: скорость вверх срезается, прыжок низкий. Запас «койота» и буфер нажатия,
   чтобы прыжок срабатывал, даже если нажал чуть раньше приземления или чуть позже края.
   Вниз на земле: пригнуться (ниже рост), вниз в воздухе: быстрое падение.

   RunPhys.hero(x, y)                         новый герой (x, y: левый нижний угол ног)
   RunPhys.step(h, inp, dt, world)            inp: {left, right, jump, jumpHit, down}
   world.collide(h, axis)                     разбирает столкновения после сдвига по оси, возвращает true, если стоит на земле
   world.auto                                 бесконечный бег: по горизонтали не двигаемся сами */
(function(){
'use strict';

var C={
  G:2700,          // гравитация
  JUMP:930,        // скорость прыжка
  HOLD:0.2,        // сколько секунд держать для высокого прыжка
  HOLD_G:0.42,     // доля гравитации, пока держишь
  CUT:0.5,         // срез скорости, если отпустил рано
  MINHOLD:0.08,    // столько прыжок держится в любом случае
  FALL:4200,       // доп. ускорение при быстром падении
  MAXFALL:1500,
  RUN:330,ACC:2600,FRIC:2900,AIR:0.65,
  COYOTE:0.09,BUFFER:0.13,
  W:38,H:62,DUCK_H:34
};

function hero(x,y){
  return {x:x,y:y-C.H,w:C.W,h:C.H,vx:0,vy:0,ground:false,duck:false,coyote:0,buffer:0,hold:0,face:1,
    run:0,jumps:0,landed:0,squash:0};
}

function step(h,inp,dt,world){
  /* пригнуться: на земле и вниз; рост меняется от ног */
  var wantDuck=!!inp.down&&h.ground;
  if(wantDuck!==h.duck){
    var nh=wantDuck?C.DUCK_H:C.H;
    if(!wantDuck&&world.roomAbove&&!world.roomAbove(h,C.H-C.DUCK_H)){/* под потолком не встать */}
    else{h.y+=h.h-nh;h.h=nh;h.duck=wantDuck;}
  }
  /* по горизонтали */
  if(!world.auto){
    var dir=(inp.right?1:0)-(inp.left?1:0),k=h.ground?1:C.AIR,max=C.RUN*(h.duck?0.45:1);
    if(dir){h.vx+=dir*C.ACC*k*dt;h.face=dir;}
    else{var f=C.FRIC*k*dt;h.vx=Math.abs(h.vx)<=f?0:h.vx-Math.sign(h.vx)*f;}
    if(h.vx>max)h.vx=Math.max(max,h.vx-C.FRIC*dt);if(h.vx<-max)h.vx=Math.min(-max,h.vx+C.FRIC*dt);
  }
  /* прыжок */
  if(inp.jumpHit)h.buffer=C.BUFFER;else if(h.buffer>0)h.buffer-=dt;
  if(h.ground)h.coyote=C.COYOTE;else if(h.coyote>0)h.coyote-=dt;
  if(h.buffer>0&&h.coyote>0&&!h.duck){
    h.vy=-C.JUMP;h.ground=false;h.coyote=0;h.buffer=0;h.hold=C.HOLD;h.jumps++;
    if(world.onJump)world.onJump(h);
  }
  /* гравитация */
  var g=C.G;
  if(h.vy<0){
    if(inp.jump&&h.hold>0){g*=C.HOLD_G;h.hold-=dt;}
    else if(!inp.jump&&h.hold>0){
      /* короткое касание всё равно даёт нормальный низкий прыжок */
      if(C.HOLD-h.hold<C.MINHOLD){g*=C.HOLD_G;h.hold-=dt;}
      else{h.vy*=C.CUT;h.hold=0;}
    }
    else h.hold=0;
  }
  if(inp.down&&!h.ground)g+=C.FALL;
  h.vy=Math.min(C.MAXFALL,h.vy+g*dt);
  /* сдвиг и столкновения по осям */
  var wasGround=h.ground,vyBefore=h.vy;
  if(!world.auto){h.x+=h.vx*dt;world.collide(h,'x');}
  h.y+=h.vy*dt;
  h.ground=world.collide(h,'y');
  if(h.ground&&!wasGround){h.landed=Math.min(1,vyBefore/1200);h.squash=0.12;if(world.onLand)world.onLand(h,vyBefore);}
  if(h.squash>0)h.squash-=dt;
  if(h.ground)h.run+=dt*(world.auto?world.speed/330:Math.abs(h.vx)/330)*9;
}

window.RunPhys={C:C,hero:hero,step:step};
})();
