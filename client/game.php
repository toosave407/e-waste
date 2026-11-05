<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>กำลังเล่นเก | E-Waste Rush</title>
  <link rel="stylesheet" href="css/main.css" />
  <link rel="stylesheet" href="css/game.css" />
</head>
<body>
  <main class="app-shell">
    <div class="game-wrap">
      <div class="hud">
        <div class="hud__block">
          <span class="hud__label">Score</span>
          <span class="hud__value" id="scoreValue">0</span>
        </div>
        <div class="hud__block">
          <span class="hud__label">Player</span>
          <span class="hud__value" id="playerValue" style="font-size:1rem;">-</span>
        </div>
        <div class="hud__block">
          <span class="hud__label">Time</span>
          <span class="hud__value hud__value--time" id="timeValue">60</span>
        </div>
      </div>

      <div class="canvas-frame" id="canvasFrame">
        <canvas id="gameCanvas" width="800" height="900" aria-label="พื้นที่เล่นเกม คลิกขยะที่ตกลงมา"></canvas>
        <div class="countdown-overlay" id="countdownOverlay">3</div>
        <div class="combo-badge" id="comboBadge" style="display:none;">
          <span class="combo-badge__label">COMBO</span>
          <span class="combo-badge__value" id="comboValue">x0</span>
        </div>
        <div class="bonus-banner" id="bonusBanner" style="display:none;">
          ⚡ โบนัส 10 วินาทีสุดท้าย! คะแนนดี +30% / คะแนนเสีย -50%
        </div>
        <div class="nuke-flash" id="nukeFlash"></div>
      </div>

      <div class="game-controls">
        <a href="index.php" id="exitBtn" class="btn btn-outline">⏹ ออกจากเกม</a>
      </div>
    </div>
  </main>

  <script src="js/sfx.js"></script>
  <script src="js/itemsConfig.js"></script>
  <script src="js/game.js"></script>
</body>
</html>