import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gamepad2, Volume2, VolumeX, Trophy, Heart, Star, Skull } from 'lucide-react'

// Game constants
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 480
const GRAVITY = 0.6
const JUMP_FORCE = -12
const MOVE_SPEED = 5
const TILE_SIZE = 32

// Level data (1 = block, 2 = coin, 3 = goomba, 4 = mushroom, 5 = pipe, 6 = ground)
const LEVEL_DATA = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6],
]

// Entity classes
class Player {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.width = 32
    this.height = 32
    this.vx = 0
    this.vy = 0
    this.grounded = false
    this.facingRight = true
    this.big = false
    this.invincible = false
    this.invincibleTimer = 0
    this.animFrame = 0
    this.animTimer = 0
  }

  update(keys, tiles) {
    // Movement
    if (keys.left) {
      this.vx = -MOVE_SPEED
      this.facingRight = false
    } else if (keys.right) {
      this.vx = MOVE_SPEED
      this.facingRight = true
    } else {
      this.vx *= 0.8
    }

    // Jump
    if (keys.jump && this.grounded) {
      this.vy = JUMP_FORCE
      this.grounded = false
    }

    // Apply gravity
    this.vy += GRAVITY

    // Update position
    this.x += this.vx
    this.y += this.vy

    // Collision with tiles
    this.grounded = false
    for (const tile of tiles) {
      if (this.checkCollision(tile)) {
        // Resolve collision
        const overlapX = (this.x + this.width / 2) - (tile.x + tile.width / 2)
        const overlapY = (this.y + this.height / 2) - (tile.y + tile.height / 2)
        const combinedHalfWidths = this.width / 2 + tile.width / 2
        const combinedHalfHeights = this.height / 2 + tile.height / 2

        if (Math.abs(overlapX) < combinedHalfWidths && Math.abs(overlapY) < combinedHalfHeights) {
          const overlapDepthX = combinedHalfWidths - Math.abs(overlapX)
          const overlapDepthY = combinedHalfHeights - Math.abs(overlapY)

          if (overlapDepthX < overlapDepthY) {
            if (overlapX > 0) this.x += overlapDepthX
            else this.x -= overlapDepthX
            this.vx = 0
          } else {
            if (overlapY > 0) {
              this.y += overlapDepthY
              this.vy = 0
            } else {
              this.y -= overlapDepthY
              this.vy = 0
              this.grounded = true
            }
          }
        }
      }
    }

    // Screen boundaries
    if (this.x < 0) this.x = 0
    if (this.x > CANVAS_WIDTH - this.width) this.x = CANVAS_WIDTH - this.width
    if (this.y > CANVAS_HEIGHT) {
      this.y = 100
      this.vy = 0
      return 'death'
    }

    // Animation
    this.animTimer++
    if (this.animTimer > 8) {
      this.animTimer = 0
      this.animFrame = (this.animFrame + 1) % 3
    }

    // Invincibility
    if (this.invincible) {
      this.invincibleTimer--
      if (this.invincibleTimer <= 0) this.invincible = false
    }

    return null
  }

  checkCollision(rect) {
    return this.x < rect.x + rect.width &&
           this.x + this.width > rect.x &&
           this.y < rect.y + rect.height &&
           this.y + this.height > rect.y
  }

  grow() {
    if (!this.big) {
      this.big = true
      this.height = 48
      this.y -= 16
    }
  }

  takeDamage() {
    if (this.invincible) return false
    if (this.big) {
      this.big = false
      this.height = 32
      this.invincible = true
      this.invincibleTimer = 120
      return false
    }
    return true
  }

  draw(ctx, cameraX) {
    const drawX = this.x - cameraX

    // Flash when invincible
    if (this.invincible && Math.floor(Date.now() / 100) % 2 === 0) return

    ctx.save()

    // Body color
    ctx.fillStyle = this.big ? '#ff0000' : '#ff4444'

    // Draw Mario body (pixel art style)
    if (this.big) {
      // Big Mario
      ctx.fillRect(drawX + 4, this.y + 16, 24, 32)
      // Overalls
      ctx.fillStyle = '#0000ff'
      ctx.fillRect(drawX + 4, this.y + 32, 24, 16)
      // Buttons
      ctx.fillStyle = '#ffff00'
      ctx.fillRect(drawX + 8, this.y + 34, 4, 4)
      ctx.fillRect(drawX + 20, this.y + 34, 4, 4)
    } else {
      // Small Mario
      ctx.fillRect(drawX + 4, this.y + 8, 24, 24)
      // Overalls
      ctx.fillStyle = '#0000ff'
      ctx.fillRect(drawX + 4, this.y + 20, 24, 12)
    }

    // Head
    ctx.fillStyle = '#ffcc99'
    ctx.fillRect(drawX + 4, this.y, 24, 16)

    // Hat
    ctx.fillStyle = '#ff0000'
    ctx.fillRect(drawX + 2, this.y - 4, 28, 8)
    ctx.fillRect(drawX + 4, this.y - 8, 24, 4)

    // Face direction
    if (this.facingRight) {
      // Eyes
      ctx.fillStyle = '#000000'
      ctx.fillRect(drawX + 20, this.y + 4, 4, 4)
      // Mustache
      ctx.fillRect(drawX + 18, this.y + 10, 8, 4)
    } else {
      ctx.fillRect(drawX + 8, this.y + 4, 4, 4)
      ctx.fillRect(drawX + 6, this.y + 10, 8, 4)
    }

    ctx.restore()
  }
}

class Goomba {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.width = 32
    this.height = 32
    this.vx = -1
    this.vy = 0
    this.animFrame = 0
    this.animTimer = 0
    this.dead = false
    this.deadTimer = 0
  }

  update(tiles) {
    if (this.dead) {
      this.deadTimer--
      return this.deadTimer <= 0
    }

    this.vy += GRAVITY
    this.x += this.vx
    this.y += this.vy

    // Collision with tiles
    for (const tile of tiles) {
      if (this.checkCollision(tile)) {
        const overlapX = (this.x + this.width / 2) - (tile.x + tile.width / 2)
        const overlapY = (this.y + this.height / 2) - (tile.y + tile.height / 2)
        const combinedHalfWidths = this.width / 2 + tile.width / 2
        const combinedHalfHeights = this.height / 2 + tile.height / 2

        if (Math.abs(overlapX) < combinedHalfWidths && Math.abs(overlapY) < combinedHalfHeights) {
          const overlapDepthX = combinedHalfWidths - Math.abs(overlapX)
          const overlapDepthY = combinedHalfHeights - Math.abs(overlapY)

          if (overlapDepthX < overlapDepthY) {
            if (overlapX > 0) this.x += overlapDepthX
            else this.x -= overlapDepthX
            this.vx *= -1
          } else if (overlapY < 0) {
            this.y -= overlapDepthY
            this.vy = 0
          }
        }
      }
    }

    // Turn around at edges
    if (this.x <= 0 || this.x >= CANVAS_WIDTH - this.width) {
      this.vx *= -1
    }

    // Animation
    this.animTimer++
    if (this.animTimer > 10) {
      this.animTimer = 0
      this.animFrame = (this.animFrame + 1) % 2
    }

    return false
  }

  checkCollision(rect) {
    return this.x < rect.x + rect.width &&
           this.x + this.width > rect.x &&
           this.y < rect.y + rect.height &&
           this.y + this.height > rect.y
  }

  stomp() {
    this.dead = true
    this.deadTimer = 30
    this.height = 8
    this.y += 24
  }

  draw(ctx, cameraX) {
    if (this.dead && this.deadTimer < 15) return

    const drawX = this.x - cameraX

    ctx.save()

    // Body (brown mushroom)
    ctx.fillStyle = '#8B4513'
    ctx.fillRect(drawX + 4, this.y + 8, 24, 20)

    // Head
    ctx.fillStyle = '#D2691E'
    ctx.beginPath()
    ctx.ellipse(drawX + 16, this.y + 12, 14, 10, 0, 0, Math.PI * 2)
    ctx.fill()

    // Eyebrows
    ctx.fillStyle = '#000000'
    ctx.fillRect(drawX + 8, this.y + 8, 6, 3)
    ctx.fillRect(drawX + 18, this.y + 8, 6, 3)

    // Feet
    if (!this.dead && this.animFrame === 0) {
      ctx.fillStyle = '#000000'
      ctx.fillRect(drawX + 4, this.y + 26, 8, 6)
      ctx.fillRect(drawX + 20, this.y + 26, 8, 6)
    }

    ctx.restore()
  }
}

class Coin {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.width = 24
    this.height = 24
    this.collected = false
    this.animY = 0
    this.animTimer = 0
  }

  update() {
    this.animTimer += 0.1
    this.animY = Math.sin(this.animTimer) * 3
    return this.collected
  }

  draw(ctx, cameraX) {
    if (this.collected) return

    const drawX = this.x - cameraX
    const drawY = this.y + this.animY

    ctx.save()

    // Coin circle
    ctx.fillStyle = '#FFD700'
    ctx.beginPath()
    ctx.arc(drawX + 12, drawY + 12, 10, 0, Math.PI * 2)
    ctx.fill()

    // Inner detail
    ctx.fillStyle = '#FFA500'
    ctx.beginPath()
    ctx.arc(drawX + 12, drawY + 12, 6, 0, Math.PI * 2)
    ctx.fill()

    // Shine
    ctx.fillStyle = '#FFFF99'
    ctx.beginPath()
    ctx.arc(drawX + 9, drawY + 9, 3, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }
}

class Mushroom {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.width = 32
    this.height = 32
    this.vx = 1
    this.vy = 0
    this.collected = false
  }

  update(tiles) {
    if (this.collected) return true

    this.vy += GRAVITY * 0.5
    this.x += this.vx
    this.y += this.vy

    // Collision with tiles
    for (const tile of tiles) {
      if (this.checkCollision(tile)) {
        const overlapX = (this.x + this.width / 2) - (tile.x + tile.width / 2)
        const overlapY = (this.y + this.height / 2) - (tile.y + tile.height / 2)
        const combinedHalfWidths = this.width / 2 + tile.width / 2
        const combinedHalfHeights = this.height / 2 + tile.height / 2

        if (Math.abs(overlapX) < combinedHalfWidths && Math.abs(overlapY) < combinedHalfHeights) {
          const overlapDepthX = combinedHalfWidths - Math.abs(overlapX)
          const overlapDepthY = combinedHalfHeights - Math.abs(overlapY)

          if (overlapDepthX < overlapDepthY) {
            if (overlapX > 0) this.x += overlapDepthX
            else this.x -= overlapDepthX
            this.vx *= -1
          } else if (overlapY < 0) {
            this.y -= overlapDepthY
            this.vy = 0
          }
        }
      }
    }

    return false
  }

  checkCollision(rect) {
    return this.x < rect.x + rect.width &&
           this.x + this.width > rect.x &&
           this.y < rect.y + rect.height &&
           this.y + this.height > rect.y
  }

  draw(ctx, cameraX) {
    if (this.collected) return

    const drawX = this.x - cameraX

    ctx.save()

    // Cap (red)
    ctx.fillStyle = '#ff0000'
    ctx.beginPath()
    ctx.arc(drawX + 16, drawY + 12, 14, Math.PI, 0)
    ctx.fill()

    // Stem (beige)
    ctx.fillStyle = '#FFE4C4'
    ctx.fillRect(drawX + 8, drawY + 12, 16, 14)

    // Spots
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(drawX + 10, drawY + 8, 3, 0, Math.PI * 2)
    ctx.arc(drawX + 22, drawY + 8, 3, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }
}

// Particle effect
class Particle {
  constructor(x, y, color) {
    this.x = x
    this.y = y
    this.vx = (Math.random() - 0.5) * 4
    this.vy = (Math.random() - 0.5) * 4
    this.life = 30
    this.color = color
    this.size = Math.random() * 4 + 2
  }

  update() {
    this.x += this.vx
    this.y += this.vy
    this.vy += 0.2
    this.life--
    return this.life <= 0
  }

  draw(ctx, cameraX) {
    const drawX = this.x - cameraX
    ctx.fillStyle = this.color
    ctx.fillRect(drawX, this.y, this.size, this.size)
  }
}

// Sound manager using Web Audio API
class SoundManager {
  constructor() {
    this.enabled = true
    this.audioContext = null
  }

  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }
  }

  playTone(frequency, duration, type = 'square') {
    if (!this.enabled || !this.audioContext) return

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)

    oscillator.frequency.value = frequency
    oscillator.type = type

    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration)

    oscillator.start(this.audioContext.currentTime)
    oscillator.stop(this.audioContext.currentTime + duration)
  }

  playJump() {
    this.playTone(150, 0.1)
    setTimeout(() => this.playTone(200, 0.1), 50)
  }

  playCoin() {
    this.playTone(900, 0.1)
    setTimeout(() => this.playTone(1200, 0.2), 50)
  }

  playStomp() {
    this.playTone(100, 0.15, 'sawtooth')
  }

  playPowerUp() {
    this.playTone(400, 0.1)
    setTimeout(() => this.playTone(500, 0.1), 100)
    setTimeout(() => this.playTone(600, 0.2), 200)
  }

  playDie() {
    this.playTone(300, 0.3)
    setTimeout(() => this.playTone(250, 0.3), 300)
    setTimeout(() => this.playTone(200, 0.5), 600)
  }
}

function App() {
  const canvasRef = useRef(null)
  const [gameState, setGameState] = useState('menu') // menu, playing, paused, gameover, win
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [godMode, setGodMode] = useState(false)
  const [showControls, setShowControls] = useState(false)

  const gameRef = useRef({
    player,
    enemies: [],
    coins: [],
    mushrooms: [],
    particles: [],
    tiles: [],
    cameraX: 0,
    keys: { left: false, right: false, jump: false },
    soundManager: new SoundManager(),
    animationId: null
  })

  // Initialize level
  const initLevel = useCallback(() => {
    const game = gameRef.current
    game.tiles = []
    game.coins = []
    game.enemies = []
    game.mushrooms = []
    game.particles = []

    // Parse level data
    for (let row = 0; row < LEVEL_DATA.length; row++) {
      for (let col = 0; col < LEVEL_DATA[row].length; col++) {
        const cell = LEVEL_DATA[row][col]
        const x = col * TILE_SIZE
        const y = row * TILE_SIZE

        if (cell === 1) {
          game.tiles.push({ x, y, width: TILE_SIZE, height: TILE_SIZE, type: 'block' })
        } else if (cell === 6) {
          game.tiles.push({ x, y, width: TILE_SIZE, height: TILE_SIZE, type: 'ground' })
        } else if (cell === 2) {
          game.coins.push(new Coin(x + 4, y + 4))
        } else if (cell === 3) {
          game.enemies.push(new Goomba(x, y))
        } else if (cell === 4) {
          game.mushrooms.push(new Mushroom(x, y))
        }
      }
    }

    // Add some extra coins and enemies
    game.coins.push(new Coin(200, 300))
    game.coins.push(new Coin(250, 300))
    game.coins.push(new Coin(300, 250))
    game.coins.push(new Coin(500, 200))
    game.coins.push(new Coin(550, 200))
    game.coins.push(new Coin(600, 200))

    game.enemies.push(new Goomba(400, 300))
    game.enemies.push(new Goomba(700, 300))

    game.player = new Player(50, 200)
  }, [])

  // Game loop
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const game = gameRef.current

    // Clear canvas
    ctx.fillStyle = '#5c94fc'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw background (clouds)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.beginPath()
    ctx.arc(100 - (game.cameraX * 0.3) % CANVAS_WIDTH, 80, 30, 0, Math.PI * 2)
    ctx.arc(140 - (game.cameraX * 0.3) % CANVAS_WIDTH, 80, 40, 0, Math.PI * 2)
    ctx.arc(180 - (game.cameraX * 0.3) % CANVAS_WIDTH, 80, 30, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.arc(500 - (game.cameraX * 0.3) % CANVAS_WIDTH, 120, 25, 0, Math.PI * 2)
    ctx.arc(540 - (game.cameraX * 0.3) % CANVAS_WIDTH, 120, 35, 0, Math.PI * 2)
    ctx.arc(580 - (game.cameraX * 0.3) % CANVAS_WIDTH, 120, 25, 0, Math.PI * 2)
    ctx.fill()

    // Update camera
    if (game.player) {
      game.cameraX = game.player.x - CANVAS_WIDTH / 3
      if (game.cameraX < 0) game.cameraX = 0
      if (game.cameraX > CANVAS_WIDTH * 2) game.cameraX = CANVAS_WIDTH * 2
    }

    // Draw tiles
    for (const tile of game.tiles) {
      if (tile.x - game.cameraX > -TILE_SIZE && tile.x - game.cameraX < CANVAS_WIDTH) {
        if (tile.type === 'block') {
          ctx.fillStyle = '#B87333'
          ctx.fillRect(tile.x - game.cameraX, tile.y, tile.width, tile.height)
          ctx.fillStyle = '#D2691E'
          ctx.fillRect(tile.x - game.cameraX + 2, tile.y + 2, tile.width - 4, tile.height - 4)
          // Brick pattern
          ctx.fillStyle = '#8B4513'
          ctx.fillRect(tile.x - game.cameraX + 14, tile.y + 4, 4, 10)
          ctx.fillRect(tile.x - game.cameraX + 4, tile.y + 16, 10, 4)
          ctx.fillRect(tile.x - game.cameraX + 18, tile.y + 16, 10, 4)
        } else if (tile.type === 'ground') {
          ctx.fillStyle = '#8B4513'
          ctx.fillRect(tile.x - game.cameraX, tile.y, tile.width, tile.height)
          ctx.fillStyle = '#228B22'
          ctx.fillRect(tile.x - game.cameraX, tile.y, tile.width, 4)
        }
      }
    }

    // Update and draw coins
    for (let i = game.coins.length - 1; i >= 0; i--) {
      const coin = game.coins[i]
      coin.update()
      coin.draw(ctx, game.cameraX)

      // Check collection
      if (!coin.collected && game.player && game.player.checkCollision(coin)) {
        coin.collected = true
        setScore(s => s + 100)
        game.soundManager.playCoin()
        // Sparkle particles
        for (let j = 0; j < 5; j++) {
          game.particles.push(new Particle(coin.x + 12, coin.y + 12, '#FFD700'))
        }
        game.coins.splice(i, 1)
      }
    }

    // Update and draw mushrooms
    for (let i = game.mushrooms.length - 1; i >= 0; i--) {
      const mushroom = game.mushrooms[i]
      mushroom.update(game.tiles)
      mushroom.draw(ctx, game.cameraX)

      // Check collection
      if (!mushroom.collected && game.player && game.player.checkCollision(mushroom)) {
        mushroom.collected = true
        game.player.grow()
        setScore(s => s + 200)
        game.soundManager.playPowerUp()
        game.mushrooms.splice(i, 1)
      }
    }

    // Update and draw enemies
    for (let i = game.enemies.length - 1; i >= 0; i--) {
      const enemy = game.enemies[i]
      const shouldRemove = enemy.update(game.tiles)
      enemy.draw(ctx, game.cameraX)

      if (shouldRemove) {
        game.enemies.splice(i, 1)
        continue
      }

      // Check collision with player
      if (game.player && !enemy.dead && game.player.checkCollision(enemy)) {
        // Check if stomping from above
        if (game.player.vy > 0 && game.player.y + game.player.height - game.player.vy <= enemy.y + enemy.height / 2) {
          enemy.stomp()
          game.player.vy = -6
          setScore(s => s + 200)
          game.soundManager.playStomp()
        } else if (!godMode) {
          const died = game.player.takeDamage()
          if (died) {
            game.soundManager.playDie()
            setLives(l => {
              const newLives = l - 1
              if (newLives <= 0) {
                setGameState('gameover')
              } else {
                setTimeout(() => initLevel(), 1000)
              }
              return newLives
            })
          }
        }
      }
    }

    // Update and draw player
    if (game.player) {
      const result = game.player.update(game.keys, game.tiles)
      if (result === 'death' && !godMode) {
        game.soundManager.playDie()
        setLives(l => {
          const newLives = l - 1
          if (newLives <= 0) {
            setGameState('gameover')
          } else {
            setTimeout(() => initLevel(), 1000)
          }
          return newLives
        })
      }
      game.player.draw(ctx, game.cameraX)
    }

    // Update and draw particles
    for (let i = game.particles.length - 1; i >= 0; i--) {
      const particle = game.particles[i]
      const shouldRemove = particle.update()
      particle.draw(ctx, game.cameraX)
      if (shouldRemove) {
        game.particles.splice(i, 1)
      }
    }

    // Continue loop
    if (gameState === 'playing') {
      game.animationId = requestAnimationFrame(gameLoop)
    }
  }, [gameState, godMode, initLevel])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      const game = gameRef.current

      // Cheat codes
      if (e.key === 'g' || e.key === 'G') {
        setGodMode(g => !g)
      }

      if (gameState !== 'playing') return

      switch(e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          game.keys.left = true
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          game.keys.right = true
          break
        case 'ArrowUp':
        case 'w':
        case 'W':
        case ' ':
          if (!game.keys.jump) {
            game.keys.jump = true
            game.soundManager.playJump()
          }
          break
        case 'Escape':
          setGameState('paused')
          break
      }
    }

    const handleKeyUp = (e) => {
      const game = gameRef.current
      switch(e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          game.keys.left = false
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          game.keys.right = false
          break
        case 'ArrowUp':
        case 'w':
        case 'W':
        case ' ':
          game.keys.jump = false
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [gameState])

  // Start game loop
  useEffect(() => {
    if (gameState === 'playing') {
      gameRef.current.animationId = requestAnimationFrame(gameLoop)
    } else {
      cancelAnimationFrame(gameRef.current.animationId)
    }

    return () => cancelAnimationFrame(gameRef.current.animationId)
  }, [gameState, gameLoop])

  // Initialize sound
  useEffect(() => {
    gameRef.current.soundManager.enabled = soundEnabled
  }, [soundEnabled])

  const startGame = () => {
    gameRef.current.soundManager.init()
    setScore(0)
    setLives(3)
    setGodMode(false)
    initLevel()
    setGameState('playing')
  }

  const resumeGame = () => {
    setGameState('playing')
  }

  const restartGame = () => {
    startGame()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-400 via-blue-500 to-green-400 flex items-center justify-center p-4 overflow-hidden">
      {/* CRT Overlay Effect */}
      <div className="fixed inset-0 crt-overlay pointer-events-none z-50" />

      {/* Game Container */}
      <div className="relative bg-black rounded-lg shadow-2xl overflow-hidden max-w-full">
        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block max-w-full h-auto"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* UI Overlay */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-none">
          <div className="flex gap-6">
            <div className="bg-black/70 px-4 py-2 rounded-lg border-2 border-yellow-400">
              <span className="pixel-font text-yellow-400 text-sm">SCORE</span>
              <div className="pixel-font text-white text-lg">{score.toString().padStart(6, '0')}</div>
            </div>
            <div className="bg-black/70 px-4 py-2 rounded-lg border-2 border-red-400">
              <span className="pixel-font text-red-400 text-sm">LIVES</span>
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                <span className="pixel-font text-white text-lg">{lives}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pointer-events-auto">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="bg-black/70 p-2 rounded-lg border-2 border-white/30 hover:border-white/60 transition-colors"
            >
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-white" />
              ) : (
                <VolumeX className="w-5 h-5 text-white" />
              )}
            </button>
            <button
              onClick={() => setShowControls(!showControls)}
              className="bg-black/70 p-2 rounded-lg border-2 border-white/30 hover:border-white/60 transition-colors"
            >
              <Gamepad2 className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* God Mode Indicator */}
        {godMode && (
          <div className="absolute top-20 left-4 bg-yellow-500/90 px-3 py-1 rounded pixel-font text-black text-xs animate-pulse">
            GOD MODE
          </div>
        )}

        {/* Menu Screen */}
        <AnimatePresence>
          {gameState === 'menu' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center"
            >
              <motion.div
                initial={{ y: -50 }}
                animate={{ y: 0 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="text-center"
              >
                <h1 className="pixel-font text-4xl md:text-6xl text-red-500 mb-2 drop-shadow-lg">
                  SUPER
                </h1>
                <h1 className="pixel-font text-4xl md:text-6xl text-yellow-400 mb-8 drop-shadow-lg">
                  MARIO BROS
                </h1>
              </motion.div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startGame}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg pixel-font text-lg mb-4 border-4 border-red-800 shadow-lg"
              >
                START GAME
              </motion.button>

              <div className="text-gray-400 pixel-font text-xs text-center mt-8 space-y-2">
                <p>ARROWS / WASD - Move</p>
                <p>SPACE - Jump</p>
                <p>ESC - Pause</p>
                <p className="text-yellow-500/70">Press G for God Mode</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pause Screen */}
        <AnimatePresence>
          {gameState === 'paused' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center"
            >
              <h2 className="pixel-font text-4xl text-white mb-8">PAUSED</h2>
              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={resumeGame}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg pixel-font border-4 border-green-800"
                >
                  RESUME
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setGameState('menu')}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg pixel-font border-4 border-gray-800"
                >
                  MENU
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Over Screen */}
        <AnimatePresence>
          {gameState === 'gameover' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center"
            >
              <Skull className="w-20 h-20 text-gray-500 mb-4" />
              <h2 className="pixel-font text-4xl text-red-500 mb-4">GAME OVER</h2>
              <p className="pixel-font text-white text-lg mb-2">SCORE: {score}</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={restartGame}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg pixel-font text-lg mt-4 border-4 border-red-800"
              >
                TRY AGAIN
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls Help */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="absolute right-0 top-16 bg-black/90 p-4 rounded-l-lg border-l-2 border-yellow-400 max-w-xs"
            >
              <h3 className="pixel-font text-yellow-400 text-sm mb-4">CONTROLS</h3>
              <div className="space-y-2 text-white pixel-font text-xs">
                <div className="flex justify-between">
                  <span>Move Left</span>
                  <span className="text-gray-400">← / A</span>
                </div>
                <div className="flex justify-between">
                  <span>Move Right</span>
                  <span className="text-gray-400">→ / D</span>
                </div>
                <div className="flex justify-between">
                  <span>Jump</span>
                  <span className="text-gray-400">↑ / W / Space</span>
                </div>
                <div className="flex justify-between">
                  <span>Pause</span>
                  <span className="text-gray-400">ESC</span>
                </div>
                <div className="flex justify-between text-yellow-500">
                  <span>God Mode</span>
                  <span>G</span>
                </div>
              </div>
              <button
                onClick={() => setShowControls(false)}
                className="mt-4 w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded pixel-font text-xs"
              >
                CLOSE
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Controls */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end md:hidden pointer-events-auto">
          <div className="flex gap-4">
            <button
              className="mobile-btn w-16 h-16 bg-white/20 rounded-full border-2 border-white/40 active:bg-white/40 flex items-center justify-center"
              onTouchStart={() => gameRef.current.keys.left = true}
              onTouchEnd={() => gameRef.current.keys.left = false}
              onMouseDown={() => gameRef.current.keys.left = true}
              onMouseUp={() => gameRef.current.keys.left = false}
            >
              <span className="text-white text-2xl">←</span>
            </button>
            <button
              className="mobile-btn w-16 h-16 bg-white/20 rounded-full border-2 border-white/40 active:bg-white/40 flex items-center justify-center"
              onTouchStart={() => gameRef.current.keys.right = true}
              onTouchEnd={() => gameRef.current.keys.right = false}
              onMouseDown={() => gameRef.current.keys.right = true}
              onMouseUp={() => gameRef.current.keys.right = false}
            >
              <span className="text-white text-2xl">→</span>
            </button>
          </div>
          <button
            className="mobile-btn w-20 h-20 bg-red-500/80 rounded-full border-2 border-red-400 active:bg-red-600 flex items-center justify-center"
            onTouchStart={() => {
              if (!gameRef.current.keys.jump) {
                gameRef.current.keys.jump = true
                gameRef.current.soundManager.playJump()
              }
            }}
            onTouchEnd={() => gameRef.current.keys.jump = false}
            onMouseDown={() => {
              if (!gameRef.current.keys.jump) {
                gameRef.current.keys.jump = true
                gameRef.current.soundManager.playJump()
              }
            }}
            onMouseUp={() => gameRef.current.keys.jump = false}
          >
            <span className="text-white font-bold">JUMP</span>
          </button>
        </div>
      </div>

      {/* Instructions Footer */}
      <div className="fixed bottom-4 left-0 right-0 text-center pointer-events-none hidden md:block">
        <p className="text-white/60 pixel-font text-xs">
          Use ARROWS or WASD to move • SPACE to jump • G for God Mode
        </p>
      </div>
    </div>
  )
}

export default App