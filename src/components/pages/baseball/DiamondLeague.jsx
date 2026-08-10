import React, { useEffect, useRef } from 'react';
import './diamond.css';

// ============================================================
//  PIXEL BASEBALL – ported into a React component.
//  All game state/loop logic is scoped inside the mount effect
//  (mirrors the original vanilla-JS structure 1:1), with
//  proper cleanup on unmount so it doesn't leak listeners or
//  animation frames when the user navigates to another page.
// ============================================================
export default function DiamondLeague() {
  const canvasRef = useRef(null);
  const scoreRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // ---------- CUSTOMIZATION DEFAULTS ----------
    let team1Name = 'HOME';
    let team2Name = 'AWAY';
    let team1Color = '#e94560';
    let team1Color2 = '#ffd700';
    let team2Color = '#0f3460';
    let team2Color2 = '#ffffff';
    let player1Name = 'SLUGGER';
    let player2Name = 'FLAME';

    // ---------- GAME STATE ----------
    let state = 'MENU'; // MENU, PLAYING, CUSTOMIZE
    let inning = 1;
    let topBottom = 'top';
    let outs = 0;
    let strikes = 0;
    let balls = 0;
    let score1 = 0;
    let score2 = 0;
    let hitCount = 0;
    let errorCount = 0;

    let bases = { first: false, second: false, third: false };
    let runsThisInning = 0;

    let pitchPower = 0;
    let pitchCharging = false;
    let ballX = 450, ballY = 420;
    let ballSpeedX = 0, ballSpeedY = 0;
    let isBallInPlay = false;
    let isPitching = true;

    let batAngle = 0;
    let isSwinging = false;
    let swingTimer = 0;

    let fielderX = 450, fielderY = 300;

    const keys = {};

    function updateScoreDisplay() {
      const text = `${score1} - ${score2}`;
      if (scoreRef.current) scoreRef.current.innerText = text;
    }

    // ---------- MENU DRAW ----------
    function drawMenu() {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, 900, 600);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 60px "Courier New", monospace';
      ctx.fillText('⚾ PIXEL BASEBALL', 450, 140);

      ctx.fillStyle = '#eee';
      ctx.font = '24px "Courier New", monospace';
      ctx.fillText(`${team1Name} (${team1Color})  vs  ${team2Name} (${team2Color})`, 450, 220);

      ctx.fillStyle = '#e94560';
      ctx.font = 'bold 30px "Courier New", monospace';
      ctx.fillText('PRESS  ENTER  TO  PLAY', 450, 320);

      ctx.fillStyle = '#aaa';
      ctx.font = '18px "Courier New", monospace';
      ctx.fillText('Press  C  for Customization', 450, 400);
      ctx.fillText('2-Player: P1 pitches/fields · P2 bats/runs', 450, 450);
      ctx.fillText('P1: WASD + Space  |  P2: Arrows + Enter', 450, 490);

      drawPixelPlayer(300, 520, team1Color, team1Color2, 'P1');
      drawPixelPlayer(600, 520, team2Color, team2Color2, 'P2');
    }

    function drawPixelPlayer(x, y, col1, col2, label) {
      ctx.fillStyle = col1;
      ctx.fillRect(x - 20, y - 40, 40, 30);
      ctx.fillStyle = col2;
      ctx.fillRect(x - 16, y - 50, 32, 14);
      ctx.fillStyle = '#f5d0b8';
      ctx.fillRect(x - 10, y - 36, 20, 12);
      ctx.fillStyle = '#222';
      ctx.fillRect(x - 14, y - 18, 8, 14);
      ctx.fillRect(x + 6, y - 18, 8, 14);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, y + 12);
    }

    // ---------- CUSTOMIZATION ----------
    let customStep = 0;
    const customLabels = [
      'HOME TEAM NAME (type & press Enter)',
      'HOME PRIMARY COLOR (hex, e.g. #e94560)',
      'HOME SECONDARY COLOR (hex)',
      'AWAY TEAM NAME',
      'AWAY PRIMARY COLOR',
      'AWAY SECONDARY COLOR',
      'PLAYER 1 NAME (batter)',
      'PLAYER 2 NAME (pitcher)',
    ];
    let customInput = '';

    function toggleCustomize() {
      if (state === 'CUSTOMIZE') { state = 'MENU'; return; }
      state = 'CUSTOMIZE';
      customStep = 0;
      customInput = '';
    }

    function isValidHex(str) { return /^#[0-9A-Fa-f]{6}$/.test(str); }

    function drawCustomize() {
      ctx.fillStyle = '#0f0e1a';
      ctx.fillRect(0, 0, 900, 600);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 28px "Courier New", monospace';
      ctx.fillText('⚾ CUSTOMIZE', 450, 80);

      ctx.fillStyle = '#fff';
      ctx.font = '22px "Courier New", monospace';
      ctx.fillText(customLabels[customStep] || 'DONE', 450, 180);

      ctx.fillStyle = '#aaa';
      ctx.font = '18px "Courier New", monospace';
      const currentVals = [team1Name, team1Color, team1Color2, team2Name, team2Color, team2Color2, player1Name, player2Name];
      ctx.fillText('CURRENT: ' + (currentVals[customStep] || ''), 450, 240);

      ctx.fillStyle = '#e94560';
      ctx.font = 'bold 40px "Courier New", monospace';
      ctx.fillText(customInput + '▌', 450, 320);

      ctx.fillStyle = '#888';
      ctx.font = '16px "Courier New", monospace';
      ctx.fillText('Type then press ENTER to confirm each field.', 450, 420);
      ctx.fillText('Press C again to exit customization.', 450, 470);

      drawPixelPlayer(250, 530, team1Color, team1Color2, team1Name);
      drawPixelPlayer(650, 530, team2Color, team2Color2, team2Name);
    }

    // ---------- GAME RESET / START ----------
    function resetGame() {
      score1 = 0;
      score2 = 0;
      inning = 1;
      topBottom = 'top';
      outs = 0;
      strikes = 0;
      balls = 0;
      bases = { first: false, second: false, third: false };
      runsThisInning = 0;
      hitCount = 0;
      errorCount = 0;
      isPitching = true;
      isBallInPlay = false;
      pitchPower = 0;
      pitchCharging = false;
      ballX = 450;
      ballY = 420;
      fielderX = 450;
      fielderY = 300;
      state = 'PLAYING';
    }

    function startGame() { resetGame(); }

    function resetPitch() {
      isBallInPlay = false;
      isPitching = true;
      ballX = 450 + (Math.random() - 0.5) * 20;
      ballY = 420;
      ballSpeedX = 0;
      ballSpeedY = 0;
      pitchPower = 0;
      pitchCharging = false;
      batAngle = 0;
      isSwinging = false;
      swingTimer = 0;
    }

    function endInning() {
      if (topBottom === 'top') {
        topBottom = 'bottom';
      } else {
        topBottom = 'top';
        inning++;
      }
      outs = 0;
      strikes = 0;
      balls = 0;
      bases = { first: false, second: false, third: false };
      runsThisInning = 0;
      resetPitch();
      if (inning > 9) state = 'MENU';
    }

    function hitBall() {
      const baseHit = Math.floor(Math.random() * 4) + 1;
      let runsScored = 0;
      if (baseHit >= 4) runsScored += 1;
      if (bases.third) { runsScored += 1; bases.third = false; }
      if (bases.second && baseHit >= 2) { runsScored += 1; bases.second = false; }
      if (bases.first && baseHit >= 3) { runsScored += 1; bases.first = false; }

      if (baseHit >= 3) bases.third = true;
      if (baseHit >= 2) bases.second = true;
      if (baseHit >= 1) bases.first = true;

      if (baseHit >= 1) {
        if (bases.first) { runsScored += 1; bases.first = false; }
        bases.first = true;
      }

      score1 += runsScored;
      runsThisInning += runsScored;
      hitCount++;
      resetPitch();
      if (outs >= 3) endInning();
    }

    function outRecord() {
      outs++;
      if (outs >= 3) endInning();
      resetPitch();
    }

    function strikeOut() {
      outs++;
      strikes = 0;
      balls = 0;
      if (outs >= 3) endInning();
      resetPitch();
    }

    function walkBatter() {
      if (bases.first && bases.second && bases.third) {
        score1 += 1;
        runsThisInning += 1;
        bases.third = false;
        bases.second = true;
        bases.first = true;
      } else if (bases.first && bases.second) {
        bases.third = true;
        bases.second = true;
        bases.first = true;
      } else if (bases.first) {
        bases.second = true;
        bases.first = true;
      } else {
        bases.first = true;
      }
      balls = 0;
      resetPitch();
    }

    // ---------- UPDATE LOGIC ----------
    function update() {
      if (state !== 'PLAYING') return;

      if (isPitching && !isBallInPlay) {
        if (keys[' ']) {
          pitchCharging = true;
          pitchPower = Math.min(pitchPower + 1.8, 100);
        }
        if (pitchCharging && !keys[' ']) {
          const speed = 4 + (pitchPower / 25);
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.3;
          ballSpeedX = Math.cos(angle) * speed * 0.3;
          ballSpeedY = Math.sin(angle) * speed;
          ballX = 450 + (Math.random() - 0.5) * 20;
          ballY = 420;
          isBallInPlay = true;
          isPitching = false;
          pitchCharging = false;
          pitchPower = 0;
          batAngle = 0;
          isSwinging = false;
        }
        if (keys['w'] || keys['W']) fielderY = Math.max(200, fielderY - 2);
        if (keys['s'] || keys['S']) fielderY = Math.min(450, fielderY + 2);
        if (keys['a'] || keys['A']) fielderX = Math.max(200, fielderX - 2);
        if (keys['d'] || keys['D']) fielderX = Math.min(700, fielderX + 2);
      }

      if (!isPitching && isBallInPlay && !isSwinging) {
        if (keys['Enter']) {
          isSwinging = true;
          swingTimer = 20;
          const pitchSpeed = Math.sqrt(ballSpeedX * ballSpeedX + ballSpeedY * ballSpeedY);
          let hitPower = Math.min(100, 40 + pitchSpeed * 3 + Math.random() * 20);
          if (ballY > 350 && ballY < 400) hitPower *= 1.3;
        }
      }

      if (isBallInPlay && !isSwinging) {
        ballX += ballSpeedX;
        ballY += ballSpeedY;
        ballSpeedY += 0.15;

        if (ballY > 460 && !isSwinging) {
          if (ballX > 400 && ballX < 500) {
            strikes++;
            if (strikes >= 3) strikeOut();
          } else {
            balls++;
            if (balls >= 4) walkBatter();
          }
          resetPitch();
        }

        if (ballY > 580 || ballX < 50 || ballX > 850) {
          if (ballY > 580) {
            if (Math.random() > 0.5) hitBall();
            else outRecord();
          } else {
            strikes = Math.min(strikes + 1, 2);
            resetPitch();
          }
        }

        if (isSwinging && swingTimer > 0) {
          swingTimer--;
          batAngle = Math.sin((swingTimer / 20) * Math.PI) * 0.8;
          const dx = ballX - 450;
          const dy = ballY - 390;
          if (Math.sqrt(dx * dx + dy * dy) < 40) {
            hitBall();
            isSwinging = false;
            swingTimer = 0;
          }
          if (swingTimer === 0) {
            isSwinging = false;
            batAngle = 0;
            if (!isBallInPlay) {
              strikes++;
              if (strikes >= 3) strikeOut();
              resetPitch();
            }
          }
        }

        if (isBallInPlay && ballY > 500 && !isSwinging) {
          const dist = Math.sqrt((ballX - fielderX) ** 2 + (ballY - fielderY) ** 2);
          if (dist < 60) {
            outRecord();
            resetPitch();
          } else {
            hitBall();
          }
        }
      }

      updateScoreDisplay();
    }

    // ---------- DRAWING ----------
    function draw() {
      ctx.clearRect(0, 0, 900, 600);

      if (state === 'MENU') { drawMenu(); return; }
      if (state === 'CUSTOMIZE') { drawCustomize(); return; }

      ctx.fillStyle = '#2d7d3a';
      ctx.fillRect(0, 0, 900, 600);
      ctx.fillStyle = '#b87c4b';
      ctx.beginPath();
      ctx.ellipse(450, 380, 300, 180, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f5f5dc';
      ctx.fillRect(430, 340, 40, 40);
      ctx.fillRect(600, 340, 30, 30);
      ctx.fillRect(600, 450, 30, 30);
      ctx.fillRect(430, 450, 30, 30);

      ctx.fillStyle = '#ffd700';
      if (bases.first) ctx.fillRect(610, 350, 14, 14);
      if (bases.second) ctx.fillRect(610, 460, 14, 14);
      if (bases.third) ctx.fillRect(440, 460, 14, 14);

      ctx.fillStyle = team1Color;
      ctx.fillRect(fielderX - 14, fielderY - 20, 28, 40);
      ctx.fillStyle = team1Color2;
      ctx.fillRect(fielderX - 10, fielderY - 28, 20, 10);
      ctx.fillStyle = '#f5d0b8';
      ctx.fillRect(fielderX - 8, fielderY - 18, 16, 12);
      ctx.fillStyle = '#8b4513';
      ctx.fillRect(fielderX + 10, fielderY - 6, 12, 8);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('P1', fielderX, fielderY + 32);

      const batX = 450, batY = 390;
      ctx.fillStyle = team2Color;
      ctx.fillRect(batX - 14, batY - 20, 28, 40);
      ctx.fillStyle = team2Color2;
      ctx.fillRect(batX - 10, batY - 28, 20, 10);
      ctx.fillStyle = '#f5d0b8';
      ctx.fillRect(batX - 8, batY - 18, 16, 12);
      ctx.save();
      ctx.translate(batX + 16, batY + 6);
      ctx.rotate(batAngle);
      ctx.fillStyle = '#c49a6c';
      ctx.fillRect(0, -4, 30, 8);
      ctx.restore();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('P2', batX, batY + 32);

      if (isBallInPlay || isPitching) {
        ctx.fillStyle = '#f5f5dc';
        ctx.beginPath();
        ctx.arc(ballX, ballY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#c0392b';
        ctx.beginPath();
        ctx.arc(ballX, ballY, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      if (pitchCharging) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(20, 40, 40, 300);
        ctx.fillStyle = '#e94560';
        ctx.fillRect(22, 320 - pitchPower * 2.8, 36, pitchPower * 2.8);
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('PWR', 40, 370);
      }

      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(700, 10, 180, 130);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`INNING: ${inning} ${topBottom}`, 710, 35);
      ctx.fillText(`OUTS: ${outs}`, 710, 58);
      ctx.fillText(`STRIKES: ${strikes}`, 710, 78);
      ctx.fillText(`BALLS: ${balls}`, 710, 98);
      ctx.fillText(`HITS: ${hitCount}`, 710, 118);
      ctx.fillText(`ERRORS: ${errorCount}`, 710, 138);

      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(330, 8, 240, 50);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 28px "Courier New", monospace';
      ctx.fillText(`${score1} - ${score2}`, 450, 45);

      ctx.fillStyle = '#fff';
      ctx.font = '12px monospace';
      ctx.fillText(team1Name, 380, 32);
      ctx.fillText(team2Name, 520, 32);

      ctx.fillStyle = '#eee';
      ctx.font = '12px monospace';
      ctx.fillText(isPitching ? '▶ P1 PITCHING' : '▶ P2 BATTING', 30, 30);
    }

    // ---------- INPUT ----------
    function handleKeyDown(e) {
      keys[e.key] = true;
      if (e.key === 'c' || e.key === 'C') toggleCustomize();
      if (e.key === 'r' || e.key === 'R') resetGame();
      if (e.key === 'Enter' && state === 'MENU') startGame();

      if (state === 'CUSTOMIZE') {
        if (e.key === 'Enter') {
          const val = customInput.trim() || 'DEFAULT';
          switch (customStep) {
            case 0: team1Name = val.toUpperCase(); break;
            case 1: if (isValidHex(val)) team1Color = val; break;
            case 2: if (isValidHex(val)) team1Color2 = val; break;
            case 3: team2Name = val.toUpperCase(); break;
            case 4: if (isValidHex(val)) team2Color = val; break;
            case 5: if (isValidHex(val)) team2Color2 = val; break;
            case 6: player1Name = val.toUpperCase(); break;
            case 7: player2Name = val.toUpperCase(); break;
            default: break;
          }
          customInput = '';
          if (customStep < 7) customStep++;
          else state = 'MENU';
        } else if (e.key === 'Backspace') {
          customInput = customInput.slice(0, -1);
        } else if (e.key.length === 1 && e.key.match(/[a-zA-Z0-9#]/)) {
          customInput += e.key;
        }
      }
      e.preventDefault();
    }

    function handleKeyUp(e) {
      keys[e.key] = false;
      e.preventDefault();
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    let rafId = null;
    function gameLoop() {
      update();
      draw();
      rafId = requestAnimationFrame(gameLoop);
    }
    state = 'MENU';
    gameLoop();

    // ---------- CLEANUP ----------
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="pixel-baseball-wrapper">
      <div className="game-wrapper">
        <canvas ref={canvasRef} id="gameCanvas" width="900" height="600" />
        <div className="controls">
          <span>⚾ P1: WASD + Space (pitch/throw)</span>
          <span>🏆 <span ref={scoreRef}>0 - 0</span></span>
          <span>⚾ P2: Arrows + Enter (hit/run)</span>
        </div>
        <div className="footer">↓ Press 'C' for Customization Menu | 'R' to reset game</div>
      </div>
    </div>
  );
}
