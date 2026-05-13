import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'

const CW = 480
const CH = 540
const PLAYER_W = 52
const PLAYER_H = 52
const PLAYER_Y = CH - PLAYER_H - 32
const ITEM_SIZE = 38
const PLAYER_SPEED = 7

const GYRO_EMOJIS = ['🥙', '🧅', '🍅', '🥒', '🫓', '🧀', '🫒']

const STARS = Array.from({ length: 75 }, () => ({
  x: Math.floor(Math.random() * CW),
  y: Math.floor(Math.random() * (CH * 0.82)),
  size: Math.random() < 0.22 ? 2 : 1,
  brightness: 0.35 + Math.random() * 0.65,
}))

let itemId = 0

// ── Menu ─────────────────────────────────────────────────────────────────────

function MenuScreen({ playerName, setPlayerName, onStart, leaderboard }) {
  return (
    <div className="screen">
      <div className="pixel-box">
        <div className="title-block">
          <h1 className="game-title">GYRO<br />BLITZ</h1>
          <p className="game-subtitle">☆ CATCH · DODGE · SCORE ☆</p>
        </div>

        <div className="name-section">
          <p className="pixel-label">► ENTER YOUR NAME:</p>
          <input
            className="pixel-input"
            value={playerName}
            onChange={e => setPlayerName(e.target.value.slice(0, 10))}
            onKeyDown={e => e.key === 'Enter' && playerName.trim() && onStart()}
            placeholder="PLAYER1"
            maxLength={10}
            autoFocus
            spellCheck={false}
          />
          <button
            className="pixel-btn"
            onClick={onStart}
            disabled={!playerName.trim()}
          >
            ▶ START GAME
          </button>
        </div>

        <div className="how-to-play">
          <p className="section-label">HOW TO PLAY</p>
          <div className="how-list">
            <div className="how-row">
              <span className="how-emojis">🥙🧅🍅🥒🫓🧀🫒</span>
              <span className="how-desc">CATCH = +10 PTS</span>
            </div>
            <div className="how-row">
              <span className="how-emojis">⚡⚡⚡⚡⚡⚡⚡</span>
              <span className="how-desc">DODGE = -1 LIFE</span>
            </div>
            <div className="how-row">
              <span className="how-emojis">← →</span>
              <span className="how-desc">KEYS OR MOUSE</span>
            </div>
          </div>
        </div>

        {leaderboard.length > 0 && <Leaderboard leaderboard={leaderboard} />}
      </div>
    </div>
  )
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

function Leaderboard({ leaderboard, highlight }) {
  return (
    <div className="leaderboard">
      <p className="section-label">HIGH SCORES</p>
      {leaderboard.slice(0, 8).map((entry, i) => (
        <div
          key={i}
          className={[
            'lb-entry',
            i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '',
            highlight && entry.name === highlight.name && entry.score === highlight.score
              ? 'current'
              : '',
          ].join(' ')}
        >
          <span className="lb-rank">
            {i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
          </span>
          <span className="lb-name">{entry.name.toUpperCase()}</span>
          <span className="lb-score">{entry.score.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

// ── Game Over ─────────────────────────────────────────────────────────────────

function GameOverScreen({ playerName, score, leaderboard, onPlayAgain, onMenu }) {
  const rank = leaderboard.findIndex(
    e => e.name === playerName && e.score === score,
  )
  const medals = ['🥇 NEW RECORD!', '🥈 2ND PLACE!', '🥉 3RD PLACE!']

  return (
    <div className="screen">
      <div className="pixel-box">
        <h1 className="gameover-title">GAME OVER</h1>
        <p className="gameover-player">{playerName.toUpperCase()}</p>
        <p className="gameover-score">{score.toLocaleString()} PTS</p>
        {rank >= 0 && rank <= 2 && (
          <p className="rank-announce">{medals[rank]}</p>
        )}
        <Leaderboard leaderboard={leaderboard} highlight={{ name: playerName, score }} />
        <div className="gameover-btns">
          <button className="pixel-btn" onClick={onPlayAgain}>▶ PLAY AGAIN</button>
          <button className="pixel-btn pixel-btn-alt" onClick={onMenu}>◀ MENU</button>
        </div>
      </div>
    </div>
  )
}

// ── Game ──────────────────────────────────────────────────────────────────────

function GameScreen({ playerName, onGameOver }) {
  const canvasRef = useRef(null)
  const onGameOverRef = useRef(onGameOver)
  onGameOverRef.current = onGameOver

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false

    const state = {
      playerX: CW / 2 - PLAYER_W / 2,
      items: [],
      score: 0,
      lives: 3,
      frameCount: 0,
      nextSpawn: 80,
      baseSpeed: 2.5,
      keys: {},
      mouseX: null,
      inputMode: 'mouse',
      flashRed: 0,
      flashGreen: 0,
      gameOver: false,
      gameOverHandled: false,
    }

    const onMouseMove = e => {
      const rect = canvas.getBoundingClientRect()
      state.mouseX = (e.clientX - rect.left) * (CW / rect.width)
      state.inputMode = 'mouse'
    }
    const onMouseLeave = () => { state.mouseX = null }
    const onTouchMove = e => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      state.mouseX = (e.touches[0].clientX - rect.left) * (CW / rect.width)
      state.inputMode = 'mouse'
    }
    const onKeyDown = e => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        state.keys[e.key] = true
        state.inputMode = 'keyboard'
        state.mouseX = null
      }
    }
    const onKeyUp = e => { delete state.keys[e.key] }

    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseleave', onMouseLeave)
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    const update = () => {
      if (state.gameOver) return

      if (state.inputMode === 'mouse' && state.mouseX !== null) {
        const target = Math.max(0, Math.min(CW - PLAYER_W, state.mouseX - PLAYER_W / 2))
        state.playerX += (target - state.playerX) * 0.2
      } else {
        if (state.keys.ArrowLeft) state.playerX = Math.max(0, state.playerX - PLAYER_SPEED)
        if (state.keys.ArrowRight) state.playerX = Math.min(CW - PLAYER_W, state.playerX + PLAYER_SPEED)
      }

      state.frameCount++
      if (state.frameCount >= state.nextSpawn) {
        state.frameCount = 0
        const lightChance = 0.18 + Math.min(0.38, state.score / 1100)
        const isLightning = Math.random() < lightChance
        state.items.push({
          id: itemId++,
          x: ITEM_SIZE * 0.6 + Math.random() * (CW - ITEM_SIZE * 1.8),
          y: -ITEM_SIZE,
          emoji: isLightning
            ? '⚡'
            : GYRO_EMOJIS[Math.floor(Math.random() * GYRO_EMOJIS.length)],
          isLightning,
          speed: state.baseSpeed + (Math.random() - 0.5) * 1.2,
        })
        const lo = Math.max(22, 58 - state.score / 55)
        const hi = Math.max(42, 92 - state.score / 55)
        state.nextSpawn = Math.round(lo + Math.random() * (hi - lo))
      }

      const alive = []
      for (const item of state.items) {
        item.y += item.speed
        if (item.y > CH + ITEM_SIZE) continue

        const px = state.playerX + PLAYER_W * 0.12
        const pw = PLAYER_W * 0.76
        const py = PLAYER_Y + PLAYER_H * 0.12
        const ph = PLAYER_H * 0.76
        const ix = item.x + ITEM_SIZE * 0.12
        const iw = ITEM_SIZE * 0.76
        const iy = item.y + ITEM_SIZE * 0.12
        const ih = ITEM_SIZE * 0.76

        if (ix + iw > px && ix < px + pw && iy + ih > py && iy < py + ph) {
          if (item.isLightning) {
            state.lives = Math.max(0, state.lives - 1)
            state.flashRed = 28
            if (state.lives === 0) state.gameOver = true
          } else {
            state.score += 10
            state.flashGreen = 7
          }
        } else {
          alive.push(item)
        }
      }
      state.items = alive

      if (state.flashRed > 0) state.flashRed--
      if (state.flashGreen > 0) state.flashGreen--
      state.baseSpeed = 2.5 + state.score / 650
    }

    const draw = () => {
      ctx.fillStyle = '#060618'
      ctx.fillRect(0, 0, CW, CH)

      for (const s of STARS) {
        ctx.fillStyle = `rgba(255,255,255,${s.brightness.toFixed(2)})`
        ctx.fillRect(s.x, s.y, s.size, s.size)
      }

      if (state.flashRed > 0) {
        ctx.fillStyle = `rgba(255,20,20,${(state.flashRed / 38).toFixed(2)})`
        ctx.fillRect(0, 0, CW, CH)
      }
      if (state.flashGreen > 0) {
        ctx.fillStyle = `rgba(20,255,90,${(state.flashGreen / 16).toFixed(2)})`
        ctx.fillRect(0, 0, CW, CH)
      }

      ctx.fillStyle = '#1e0e00'
      ctx.fillRect(0, CH - 32, CW, 32)
      ctx.fillStyle = '#3a1f00'
      ctx.fillRect(0, CH - 32, CW, 8)
      ctx.fillStyle = '#4f2a00'
      for (let x = 0; x < CW; x += 44) ctx.fillRect(x + 4, CH - 16, 20, 4)

      ctx.font = '28px serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (const item of state.items) {
        ctx.fillText(item.emoji, item.x + ITEM_SIZE / 2, item.y + ITEM_SIZE / 2)
      }

      ctx.font = '40px serif'
      ctx.fillText('🧑', state.playerX + PLAYER_W / 2, PLAYER_Y + PLAYER_H / 2)

      ctx.fillStyle = 'rgba(6,6,24,0.9)'
      ctx.fillRect(0, 0, CW, 46)
      ctx.fillStyle = '#ffd700'
      ctx.fillRect(0, 46, CW, 2)

      ctx.font = 'bold 12px "Press Start 2P", monospace'
      ctx.fillStyle = '#ffd700'
      ctx.textAlign = 'left'
      ctx.fillText(String(state.score), 10, 28)
      ctx.font = '6px "Press Start 2P", monospace'
      ctx.fillStyle = '#7a5c00'
      ctx.fillText('SCORE', 10, 41)

      ctx.font = '8px "Press Start 2P", monospace'
      ctx.fillStyle = '#00ff41'
      ctx.textAlign = 'center'
      ctx.fillText(playerName.toUpperCase().slice(0, 10), CW / 2, 28)

      ctx.font = '18px serif'
      ctx.textAlign = 'right'
      for (let i = 0; i < 3; i++) {
        ctx.fillText(i < state.lives ? '❤️' : '🖤', CW - 8 - i * 26, 30)
      }

      ctx.fillStyle = 'rgba(0,0,0,0.1)'
      for (let y = 0; y < CH; y += 3) ctx.fillRect(0, y, CW, 1)

      if (state.gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.78)'
        ctx.fillRect(0, 0, CW, CH)
        ctx.font = 'bold 22px "Press Start 2P", monospace'
        ctx.fillStyle = '#ff3333'
        ctx.textAlign = 'center'
        ctx.fillText('GAME OVER', CW / 2, CH / 2 - 28)
        ctx.font = '11px "Press Start 2P", monospace'
        ctx.fillStyle = '#ffd700'
        ctx.fillText(`SCORE: ${state.score}`, CW / 2, CH / 2 + 12)
        ctx.font = '7px "Press Start 2P", monospace'
        ctx.fillStyle = '#888'
        ctx.fillText('LOADING RESULTS...', CW / 2, CH / 2 + 44)
      }
    }

    let running = true
    let gameOverTimer = null

    const loop = () => {
      if (!running) return
      update()
      draw()
      if (state.gameOver && !state.gameOverHandled) {
        state.gameOverHandled = true
        gameOverTimer = setTimeout(() => {
          running = false
          onGameOverRef.current(state.score)
        }, 1800)
      }
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)

    return () => {
      running = false
      clearTimeout(gameOverTimer)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseleave', onMouseLeave)
      canvas.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [playerName])

  return (
    <div className="screen">
      <canvas ref={canvasRef} width={CW} height={CH} className="game-canvas" />
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState('menu')
  const [playerName, setPlayerName] = useState('')
  const [finalScore, setFinalScore] = useState(0)
  const [gameKey, setGameKey] = useState(0)
  const [leaderboard, setLeaderboard] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gyro-lb') || '[]') }
    catch { return [] }
  })

  const handleStart = () => { if (playerName.trim()) setScreen('game') }

  const handleGameOver = useCallback((score) => {
    setFinalScore(score)
    setLeaderboard(prev => {
      const updated = [...prev, { name: playerName.trim(), score }]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
      try { localStorage.setItem('gyro-lb', JSON.stringify(updated)) } catch {}
      return updated
    })
    setScreen('gameover')
  }, [playerName])

  const handlePlayAgain = () => {
    setGameKey(k => k + 1)
    setScreen('game')
  }

  return (
    <div className="app">
      {screen === 'menu' && (
        <MenuScreen
          playerName={playerName}
          setPlayerName={setPlayerName}
          onStart={handleStart}
          leaderboard={leaderboard}
        />
      )}
      {screen === 'game' && (
        <GameScreen key={gameKey} playerName={playerName.trim()} onGameOver={handleGameOver} />
      )}
      {screen === 'gameover' && (
        <GameOverScreen
          playerName={playerName.trim()}
          score={finalScore}
          leaderboard={leaderboard}
          onPlayAgain={handlePlayAgain}
          onMenu={() => setScreen('menu')}
        />
      )}
    </div>
  )
}
