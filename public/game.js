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
    constructor(x, y, w, h) {
      this.x = x; this.y = y;
      this.width = w; this.height = h;
    }
    draw() {
      ctx.fillStyle = "#cccccc";
      ctx.fillRect(this.x, this.y, this.width, this.height);
      ctx.strokeStyle = "black";
      ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
  }

  class Bullet {
    constructor(x, y, angle) {
      this.x = x; this.y = y;
      this.angle = angle;
      this.speed = 7;
      this.radius = 5;
      this.destroyed = false;
    }
    update() {
      const rad = (this.angle - 90) * Math.PI / 180;
      this.x += this.speed * Math.cos(rad);
      this.y += this.speed * Math.sin(rad);

      if (this.x <= 0 || this.x >= canvas.width) this.angle = 180 - this.angle;
      if (this.y <= 0 || this.y >= canvas.height) this.angle = -this.angle;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = "black";
      ctx.fill();
      ctx.closePath();
    }
  }

  class Tank {
    constructor(x, y, sprite, controls) {
      this.x = x;
      this.y = y;
      this.sprite = sprite;
      this.controls = controls;
      this.angle = 0;
      this.speed = 3;
      this.bullets = [];
      this.size = 180;
      this.turnSpeed = 2.5;
    }

    // Vértices del rectángulo de colisión (centrado y rotando con el tanque)
    getCollisionRectVertices() {
      const w = this.size * 0.3;
      const h = this.size * 0.35;
      const rad = this.angle * Math.PI / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      return [
        { x: this.x + (-w/2.3) * cos - (-h/1.5) * sin, y: this.y + (-w/2.3) * sin + (-h/1.3) * cos },
        { x: this.x + (w/2) * cos - (-h/1.5) * sin,  y: this.y + (w/2) * sin + (-h/1.3) * cos },
        { x: this.x + (w/2) * cos - (h/2) * sin,     y: this.y + (w/2) * sin + (h/2.5) * cos },
        { x: this.x + (-w/2.3) * cos - (h/2) * sin,  y: this.y + (-w/2) * sin + (h/2.5) * cos }
      ];
    }

    // Colisiones
    collidesWith(wall, x = this.x, y = this.y) {
      const verts = this.getCollisionRectVertices();
      const minX = Math.min(...verts.map(v => v.x));
      const maxX = Math.max(...verts.map(v => v.x));
      const minY = Math.min(...verts.map(v => v.y));
      const maxY = Math.max(...verts.map(v => v.y));
      return !(maxX < wall.x || minX > wall.x + wall.width || maxY < wall.y || minY > wall.y + wall.height);
    }

    collidesAny(x = this.x, y = this.y) {
      return walls.some(w => this.collidesWith(w, x, y));
    }

    update() {
      if (keys[this.controls.left])  this.angle -= this.turnSpeed;
      if (keys[this.controls.right]) this.angle += this.turnSpeed;

      const rad = (this.angle - 90) * Math.PI / 180;
      let nx = this.x;
      let ny = this.y;

      if (keys[this.controls.up]) {
        nx += this.speed * Math.cos(rad);
        ny += this.speed * Math.sin(rad);
      }
      if (keys[this.controls.down]) {
        nx -= this.speed * Math.cos(rad);
        ny -= this.speed * Math.sin(rad);
      }

      if (!this.collidesAny(nx, this.y)) this.x = nx;
      if (!this.collidesAny(this.x, ny)) this.y = ny;

      // Limitar dentro de la pantalla
      const verts = this.getCollisionRectVertices();
      const minX = Math.min(...verts.map(v => v.x));
      const maxX = Math.max(...verts.map(v => v.x));
      const minY = Math.min(...verts.map(v => v.y));
      const maxY = Math.max(...verts.map(v => v.y));
      const padding = 0;
      if (minX < 0 + padding) this.x += (0 + padding - minX);
      if (maxX > canvas.width - padding) this.x -= (maxX - (canvas.width - padding));
      if (minY < 0 + padding) this.y += (0 + padding - minY);
      if (maxY > canvas.height - padding) this.y -= (maxY - (canvas.height - padding));

      if (keys[this.controls.shoot]) {
        this.shoot();
        keys[this.controls.shoot] = false;
      }

      this.bullets.forEach(b => b.update());
      this.bullets = this.bullets.filter(b => !b.destroyed);
    }

    draw() {
      // Rectángulo de colisión TRANSPARENTE
      const verts = this.getCollisionRectVertices();
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(verts[0].x, verts[0].y);
      verts.slice(1).forEach(v => ctx.lineTo(v.x, v.y));
      ctx.closePath();
      // ctx.fillStyle = "rgba(255,255,255,0.3)"; // eliminado para transparencia
      // ctx.fill();
      ctx.restore();

      // Dibujar tanque
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle * Math.PI / 180);
      ctx.drawImage(this.sprite, -this.size/2, -this.size/2, this.size, this.size);
      ctx.restore();

      this.bullets.forEach(b => b.draw());
    }

    shoot() {
      this.bullets.push(new Bullet(this.x, this.y, this.angle));
    }
  }

  // --- Muros ---
  let walls = [];
  walls.push(new Wall(0, 0, 1280, 20)); // superior
  walls.push(new Wall(0, 700, 1280, 20)); // inferior
  walls.push(new Wall(0, 0, 20, 720)); // izquierda
  walls.push(new Wall(1260, 0, 20, 720)); // derecha
  walls.push(new Wall(590, 310, 100, 100)); // centro
  walls.push(new Wall(200, 150, 300, 20));
  walls.push(new Wall(780, 550, 300, 20));
  walls.push(new Wall(400, 300, 20, 200));
  walls.push(new Wall(850, 200, 20, 200));
  walls.push(new Wall(150, 600, 80, 20));
  walls.push(new Wall(1050, 100, 80, 20));
  walls.push(new Wall(650, 100, 20, 80));
  walls.push(new Wall(650, 600, 20, 80));

  const p1Controls = { up: "arrowup", down: "arrowdown", left: "arrowleft", right: "arrowright", shoot: " " };
  const p2Controls = { up: "w", down: "s", left: "a", right: "d", shoot: "f" };

  const p1 = new Tank(300, 300, tankImgBlue, p1Controls);
  const p2 = new Tank(1000, 500, tankImgRed, p2Controls);

  function ensureValidSpawn(tank) {
    if (!tank.collidesAny()) return;
    const step = 10;
    let attempts = 0;
    while (tank.collidesAny() && attempts < 50) { tank.y -= step; attempts++; }
    attempts = 0;
    while (tank.collidesAny() && attempts < 50) { tank.x -= step; attempts++; }
    attempts = 0;
    while (tank.collidesAny() && attempts < 50) { tank.x += step; attempts++; }
  }

  ensureValidSpawn(p1);
  ensureValidSpawn(p2);

  let keys = {};
  window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
  window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

  function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    walls.forEach(w => w.draw());
    p1.update(); p2.update();
    p1.draw(); p2.draw();
    requestAnimationFrame(gameLoop);
  }

  gameLoop();
}
