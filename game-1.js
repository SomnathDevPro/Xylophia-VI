class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    this.enemyData = [];
    this.playerSpeed = 250;
    this.playerHealth = 200;
    this.killCount = 0;
    this.score = 0;
    this.scoreText;
  }
  preload() {
    const randint = Math.floor(Math.random() * 3)
    const mapSrcArray = ["map.jpg", "map2.jpg", "map3.jpg"]
    this.load.image("map", mapSrcArray[randint]);
    this.load.image("player", "player.png", {
      compress: true
    });
    this.load.image("alien", "alien.png", {
      compress: true
    });
    this.load.image("projectile", "projectile.png", {
      compress: true
    });
    this.load.image("healthTile", "healthTile.png", {
      compress: true
    });
    this.load.audio("bgm", "bgm.mp3");
    this.load.audio("shootSound", "shoot.mp3")
    this.load.audio("attackSound", "attackSound.mp3")
    this.load.audio("healthSound", "health.mp3")
  }

  create() {
    //checking if player already has a highscore
    if (!localStorage.getItem("highScore")) {
      localStorage.setItem("highScore", 0)
    }
    //loading sounds
    this.shootSound = this.sound.add("shootSound");
    this.attackSound = this.sound.add("attackSound");
    this.healthSound = this.sound.add("healthSound")
    this.bgm = this.sound.add("bgm");
    //play background music
    this.bgm.play({ loop: true, volume: 0.5 });
    //setting background as a tileSprite for scroll effect
    this.sys.game.config.width = window.innerWidth;
    this.sys.game.config.height = window.innerHeight;
    this.background = this.add.tileSprite(1, 1, this.sys.game.config.width * 3, this.sys.game.config.height * 2.2, "map");
    this.background.setOrigin(0, 0);
    //setting current score text
    this.scoreText = this.add.text(340, 500, "kills:0", {
      fontsize: 32,
      fill: "#fff"
    });
    this.scoreText.angle = 90;
    this.scoreText.setOrigin(0.5, 0.5)
    this.scoreText.setScrollFactor(0)
    //setting highscore text
    this.highScoreText = this.add.text(340, 400, "high:0", {
      fontsize: 32,
      fill: "#fff"
    });
    this.highScoreText.angle = 90;
    this.highScoreText.setOrigin(0.5, 0.5)

    this.highScoreText.setScrollFactor(0)
    this.healthBar = this.add.graphics()
    this.healthBar.fillStyle(0xff0000)
    this.healthBar.fillRect(this.sys.game.config.width, 100, 15, 200)
    this.healthBar.setScrollFactor(0)

    //initialising player
    this.player = this.physics.add.image(100, 150, "player");
    this.player.setOrigin(0.5, 0.5);
    this.player.setScale(0.4);
    this.player.setDepth(1)
    this.player.setDrag(1)
    // Enemies
    this.enemyGroup = this.physics.add.group();
    this.radiationZones = this.physics.add.group()
    for (var i = 0; i < 4; i++) {
      // Tab to edit
      const x = Math.random() * (this.background.height - 200) + 100;
      const y = Math.random() * (this.background.width - 200) + 100;
      const alien = this.enemyGroup.create(x, y, 'alien');
      alien.setOrigin(0.5, 0.5);
      alien.setScale(0.1);
      alien.setActive(true)
      this.enemyData.push({ x, y, alien, type: 'normal' });
    }
    // Projectiles
    this.projectileGroup = this.physics.add.group();
    this.healthTile = this.physics.add.sprite(200, 400, 'healthTile').setVisible(true);
    this.healthTile.setScale(0.1)
    // Collision and overlap checking 
    this.physics.add.overlap(this.player, this.healthTile, (player, healthTile) => {
      if (this.playerHealth < 120) {
        this.playerHealth += 80;
        this.healthTile.setVisible(false)
        this.healthBar.clear()
        this.healthBar.fillStyle(0xff0000)
        this.healthBar.fillRect(340, 100, 15, this.playerHealth)
        this.healthSound.play({
          loop: false,
          volume: 0.8
        })
        this.time.addEvent({
          delay: 10000,
          callback: this.spawnHealthTile,
          callbackScope: this,
          loop: true
        })
      }
    })
    this.physics.add.collider(this.enemyGroup, this.projectileGroup, (enemy, projectile) => {
      projectile.destroy()
      enemy.setActive(false)
      enemy.destroy()
      this.score++
      this.scoreText.setText(`kills:${this.score}`)
      this.enemyData = this.enemyData.filter((data) => {
        data.alien !== enemy;
      })
      this.time.addEvent({
        delay: 2500,
        callback: () => {
          this.respawnEnemy()
        },
        callbackScope: this
      })
    })

    this.physics.add.collider(this.enemyGroup, this.enemyGroup, (e1, e2) => {
      const angle = Math.atan2(e2.y - e1.y, e2.x - e1.x)
      e1.setVelocity(Math.cos(angle) * 10, Math.sin(angle) * 10)
      e2.setVelocity(-Math.cos(angle) * 10, -Math.sin(angle) * 10)
    })

    this.physics.add.collider(this.player, this.enemyGroup, (player, enemy) => {
      const enemyData = this.enemyData.find((data) => data.alien === enemy)
      if (enemyData && enemyData.type === 'boss') {
        this.playerHealth -= 100
      } else {
        this.playerHealth -= 20
      }
      this.healthBar.clear()
      this.healthBar.fillStyle(0xff0000)
      this.healthBar.fillRect(340, 100, 15, this.playerHealth)
      this.attackSound.play({
        loop: false,
        volume: 0.7
      })
      enemy.setActive(false)
      enemy.destroy()
      this.enemyData = this.enemyData.filter((data) => {
        data.alien !== enemy;
      })

      this.cameras.main.shake(200, 0.01)
      this.time.addEvent({
        delay: 500,
        callback: () => {
          this.respawnEnemy()
        },
        callbackScope: this
      })
      if (this.playerHealth < 0) {
        this.playerHealth = 0
      } else if (this.playerHealth === 0) {
        const gameOverText = this.add.text(this.sys.game.config.height / 2, this.sys.game.config.width / 2, "Game Over", {
          fontSize: 64,
          fill: "#ff0000"
        })
        gameOverText.angle = 90
        gameOverText.setOrigin(0.5, 0.5)
        gameOverText.setScrollFactor(0)
        this.scene.pause()
        if (localStorage.getItem("highScore") < this.score) {
          localStorage.setItem("highScore", this.score)
        }
        setTimeout(() => {
          location.reload()
        }, 2000)
      }
    })
    this.time.addEvent({
      delay: 60000,
      callback: this.spawnWave,
      callbackScope: this,
      loop: true
    })
    this.time.addEvent({
      delay: 10000,
      callback: this.surroundAttack,
      loop: true,
      callbackScope: this
    })

    // Joystick
    this.joystickBG = this.add.graphics();
    this.joystickBG.fillStyle(0x444444);
    this.joystickBG.fillCircle(80, 80, 75);

    this.joystick = this.add.graphics();
    this.joystick.fillStyle(0xffffff);
    this.joystick.fillCircle(80, 80, 50);
    this.joystick.setDepth(2)
    this.joystickBG.setDepth(2)

    this.joystickBG.setScrollFactor(0);
    this.joystick.setScrollFactor(0);

    let joystickX, joystickY;

    // Joystick logic
    this.input.multiTouch=true
    this.input.on('pointerdown', (pointer) => {
      if (pointer.x > 5 && pointer.x < 100 && pointer.y > 5 && pointer.y < 100) {
        joystickX = pointer.x;
        joystickY = pointer.y;
      } else {
        this.shootSound.play({
          loop: false,
          volume: 0.7
        })
        this.shootProjectile(pointer);
      }
    });
    this.input.on("pointermove", (pointer) => {
      this.time.addEvent({
        delay: 16,

        callback: () => {
          if (joystickX && joystickY) {
            const angle = Math.atan2(pointer.y - joystickY, pointer.x - joystickX);

            this.player.rotation = angle;
            this.player.setVelocity(Math.cos(angle) * this.playerSpeed * 1.2, Math.sin(angle) * this.playerSpeed * 1.2);
            const distance = Math.sqrt(Math.pow(pointer.x - joystickX, 2) + Math.pow(pointer.y - joystickY, 2));

            if (distance > 5 && distance < 110) {
              this.joystick.clear();
              this.joystick.fillStyle(0xffffff);
              this.joystick.fillCircle(pointer.x, pointer.y, 50);
            }
          }
        },
        callbackScope: this,
        loop:true
      })
    });

    this.input.on("pointerup", (pointer) => {
      joystickX = null;
      joystickY = null;
      this.player.setVelocity(0);
      this.joystick.clear();
      this.joystick.fillStyle(0xffffff);
      this.joystick.fillCircle(80, 80, 50);
    });

    // Camera follows player
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setBounds(0, 0, this.background.width, this.background.height);
  }

  update() {
    this.highScoreText.setText(`high:${localStorage.getItem('highScore')}`)
    this.physics.world.bounds.width = this.background.width;
    this.physics.world.bounds.height = this.background.height;
    this.player.setCollideWorldBounds(true)

    const chaseRange = 500;
    const chaseSpeed = 3.3;
    const bossCR = 1000;
    const bossCS = 6;
    this.enemyData.forEach((enemy) => {
      if (enemy.alien.active && enemy.type !== 'boss') {

        const distance = Phaser.Math.Distance.Between(enemy.alien.x, enemy.alien.y, this.player.x, this.player.y);
        const theta = Phaser.Math.Angle.Between(enemy.alien.x, enemy.alien.y, this.player.x, this.player.y);

        if (distance < chaseRange) {
          enemy.alien.x += Math.cos(theta) * chaseSpeed
          enemy.alien.y += Math.sin(theta) * chaseSpeed
          enemy.alien.rotation = theta;
        }
      } else {
        const distance = Phaser.Math.Distance.Between(enemy.alien.x, enemy.alien.y, this.player.x, this.player.y);
        const theta = Phaser.Math.Angle.Between(enemy.alien.x, enemy.alien.y, this.player.x, this.player.y);
        if (distance < bossCR) {
          enemy.alien.x += Math.cos(theta) * 2;
          enemy.alien.y += Math.sin(theta) * 2;
        } else {
          enemy.alien.x += Math.cos(theta) * bossCS;
          enemy.alien.y += Math.sin(theta) * bossCS;
        }
      }
    });
  }

  respawnEnemy() {
    if (this.enemyData.length < 2) {
      const x = Math.random() * (this.background.height - 200) + 100;
      const y = Math.random() * (this.background.width - 200) + 100;
      const alien = this.enemyGroup.create(x, y, 'alien');
      alien.setOrigin(0.5, 0.5);
      alien.setScale(0.1);
      // alien.setActive(true);
      alien.active = true;
      this.physics.world.bounds.width = this.background.width;
      this.physics.world.bounds.height = this.background.height;
      alien.setCollideWorldBounds(true)
      this.enemyData.push({ x, y, alien, type: 'normal' });
    }
  }

  shootProjectile(pointer) {
    const angle = this.player.rotation;
    const projectileSpeed = 400;
    const projectile = this.physics.add.image(this.player.x, this.player.y, "projectile");
    this.projectileGroup.add(projectile);
    projectile.setScale(0.01);
    projectile.body.setVelocity(Math.cos(angle) * projectileSpeed, Math.sin(angle) * projectileSpeed);
    projectile.body.setCircle(5);
    projectile.setDepth(1);
  }

  spawnHealthTile() {
    const x = Math.random() * (this.background.height - 200) + 150;
    const y = Math.random() * (this.background.width - 200) + 150;
    this.healthTile.setPosition(x, y).setVisible(true)
    this.healthTile.setScale(0.1)
    this.healthTile.setDepth(0)

  }
  //spawns a wave of enemy with a boss every minute
  spawnWave() {
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * (this.background.height - 200) + 100;
      const y = Math.random() * (this.background.width - 200) + 100;
      const alien = this.enemyGroup.create(x, y, 'alien');
      alien.setOrigin(0.5, 0.5);
      alien.setScale(0.1);
      alien.setActive(true)
      this.enemyData.push({ x, y, alien, type: 'normal' });
    }
    const x = Math.random() * (this.background.height - 200) + 100;
    const y = Math.random() * (this.background.width - 200) + 100;
    const enragedEnemy = this.enemyGroup.create(x, y, 'alien')
    enragedEnemy.setScale(0.3)
    enragedEnemy.body.setSize(500, 500)
    enragedEnemy.setOrigin(0, 0)
    enragedEnemy.setTint(0x00ff00)
    this.physics.world.bounds.width = this.background.width;
    this.physics.world.bounds.height = this.background.height;
    enragedEnemy.setCollideWorldBounds(true)
    enragedEnemy.setActive(true)

    this.enemyData.push({ x, y, alien: enragedEnemy, type: 'boss' });
  }

  surroundAttack() {
    const player = this.player;
    const enemies = this.enemyGroup.getChildren().filter(enemy => enemy.active);
    const surroundEnemies = [];
    for (var i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * enemies.length);
      surroundEnemies.push(enemies[randomIndex])
    }
    surroundEnemies.forEach((enemy, index) => {
      if (enemy && enemy.body) {
        const angle = index * 90 * Math.PI / 180;
        const x = player.x + 100 * Math.cos(angle);
        const y = player.y + 100 * Math.sin(angle);
        enemy.x = x
        enemy.y = y
      }
    });

    this.time.addEvent({
      delay: 5000,
      callback: () => {
        surroundEnemies.forEach((enemy) => {
          enemy.x = Math.random() * this.background.width;
          enemy.y = Math.random() * this.background.height
        })
      },
    })
  }
}

const config = {
  type: Phaser.CANVAS,
  width: window.innerWidth,
  height: window.innerHeight,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  input: {
    multiTouch:true
  },
  scene: [GameScene]
};

const game = new Phaser.Game(config);
