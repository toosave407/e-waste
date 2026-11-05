<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>จบเกมแล้ว | E-Waste Rush</title>
  <link rel="stylesheet" href="css/main.css" />
  <link rel="stylesheet" href="css/game.css" />
</head>
<body>
  <main class="app-shell">
    <section class="result-card">
      <p class="eyebrow">GAME OVER</p>
      <h2 style="margin-top:6px; color: var(--circuit-dark);">หมดเวลาแล้ว!</h2>

      <div class="trace-divider" aria-hidden="true"></div>

      <div class="pcb-card">
        <p class="result-card__label">คะแนนของคุณ</p>
        <p class="result-card__score" id="finalScore">0</p>
        <p class="result-card__player" id="finalPlayer">-</p>
        <p class="result-card__combo" id="finalMaxCombo">คอมโบสูงสุด: -</p>

        <p class="save-status" id="saveStatus">กำลังบันทึกคะแนน...</p>

        <div class="result-actions">
          <button id="playAgainBtn" class="btn btn-block">🔁 เล่นอีกครั้ง</button>
          <a href="leaderboard.php" id="leaderboardLink" class="btn btn-copper btn-block">🏆 Leaderboard</a>
          <a href="index.php" id="homeLink" class="btn btn-outline btn-block">🏠 กลับหน้าหลัก</a>
        </div>
      </div>
    </section>
  </main>

  <script src="js/sfx.js"></script>
  <script src="js/gameover.js"></script>
</body>
</html>