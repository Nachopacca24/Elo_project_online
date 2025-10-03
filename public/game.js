const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Sprites de tanques
const tankImgBlue = new Image();
tankImgBlue.src = "assets/tank_blue.png";
const tankImgRed = new Image();
tankImgRed.src = "assets/tank_red.png";

// Esperar que se carguen
let imagesLoaded = 0;
[tankImgBlue, tankImgRed].forEach(img => {
  img.onload = () => {
    imagesLoaded++;
    if (imagesLoaded === 2) initGame();
  };
});

function initGame() {
  class Wall {
    constructor(x, y, w, h) { this.x=x; this.y=y; this.width=w; this.height=h; }
    draw() {
      ctx.fillStyle = "#cccccc";
      ctx.fillRect(this.x,this.y,this.width,this.height);
      ctx.strokeStyle = "black";
      ctx.strokeRect(this.x,this.y,this.width,this.height);
    }
  }

  class Bullet {
    constructor(x,y,angle) { this.x=x; this.y=y; this.angle=angle; this.speed=7; this.radius=5; this.destroyed=false; }
    update() {
      const rad = (this.angle-90)*Math.PI/180;
      this.x += this.speed*Math.cos(rad);
      this.y += this.speed*Math.sin(rad);
      if(this.x<=0 || this.x>=canvas.width) this.angle = 180 - this.angle;
      if(this.y<=0 || this.y>=canvas.height) this.angle = -this.angle;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);
      ctx.fillStyle="black";
      ctx.fill();
      ctx.closePath();
    }
  }

  class Tank {
    constructor(x,y,sprite,controls) {
      this.x=x; this.y=y; this.sprite=sprite; this.controls=controls;
      this.angle=0; this.speed=3; this.bullets=[]; this.size=180; this.turnSpeed=2.5;
    }
    update() {
      if(keys[this.controls.left]) this.angle -= this.turnSpeed;
      if(keys[this.controls.right]) this.angle += this.turnSpeed;
      const rad = (this.angle-90)*Math.PI/180;
      if(keys[this.controls.up]) { this.x += this.speed*Math.cos(rad); this.y += this.speed*Math.sin(rad); }
      if(keys[this.controls.down]) { this.x -= this.speed*Math.cos(rad); this.y -= this.speed*Math.sin(rad); }
      if(keys[this.controls.shoot]) { this.shoot(); keys[this.controls.shoot]=false; }
      this.bullets.forEach(b=>b.update());
      this.bullets=this.bullets.filter(b=>!b.destroyed);
    }
    draw() {
      ctx.save();
      ctx.translate(this.x,this.y);
      ctx.rotate(this.angle*Math.PI/180);
      ctx.drawImage(this.sprite,-this.size/2,-this.size/2,this.size,this.size);
      ctx.restore();
      this.bullets.forEach(b=>b.draw());
    }
    shoot() { this.bullets.push(new Bullet(this.x,this.y,this.angle)); }
  }

  // Controles
  const p1Controls = { up:"ArrowUp", down:"ArrowDown", left:"ArrowLeft", right:"ArrowRight", shoot:" " };
  const p2Controls = { up:"w", down:"s", left:"a", right:"d", shoot:"f" };

  // Tanques
  const p1 = new Tank(400,300,tankImgBlue,p1Controls);
  const p2 = new Tank(800,300,tankImgRed,p2Controls);

  // Muros
  let walls=[];
  walls.push(new Wall(0,0,1280,20)); // superior
  walls.push(new Wall(0,700,1280,20)); // inferior
  walls.push(new Wall(0,0,20,720)); // izquierda
  walls.push(new Wall(1260,0,20,720)); // derecha
  walls.push(new Wall(590,310,100,100)); // centro
  walls.push(new Wall(200,150,300,20));
  walls.push(new Wall(780,550,300,20));
  walls.push(new Wall(400,300,20,200));
  walls.push(new Wall(850,200,20,200));
  walls.push(new Wall(150,600,80,20));
  walls.push(new Wall(1050,100,80,20));
  walls.push(new Wall(650,100,20,80));
  walls.push(new Wall(650,600,20,80));

  // Input
  let keys={};
  window.addEventListener("keydown",e=>keys[e.key]=true);
  window.addEventListener("keyup",e=>keys[e.key]=false);

  // Loop
  function gameLoop() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    walls.forEach(w=>w.draw());
    p1.update(); p2.update();
    p1.draw(); p2.draw();
    requestAnimationFrame(gameLoop);
  }

  gameLoop();
}
