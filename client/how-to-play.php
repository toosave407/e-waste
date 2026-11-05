<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>วิธีเล่นเก | E-Waste Rush</title>
  <link rel="stylesheet" href="css/main.css" />
  <link rel="stylesheet" href="css/game.css" />
</head>
<body>
  <main class="app-shell">
    <section class="howto">
      <p class="eyebrow">HOW TO PLAY</p>
      <h2>วิธีเล่น</h2>
      <p style="color: var(--ink-soft); margin-top: 6px;">
        ขยะจะสุ่มตกลงมาจากด้านบนของจอ แตะหรือคลิกให้ทันก่อนที่มันจะตกถึงพื้น
      </p>

      <div class="trace-divider" aria-hidden="true"></div>

      <h3 style="font-size:1.05rem; margin-bottom:10px; color: var(--circuit-dark);">
        ♻️ ขยะอิเล็กทรอนิกส์ <span id="goodPointsRange"></span>
      </h3>
      <div class="howto-grid" id="goodGrid"></div>

      <h3 style="font-size:1.05rem; margin-bottom:10px; color: var(--alert);">
        🚫 ขยะทั่วไป <span id="badPointsRange"></span>
      </h3>
      <div class="howto-grid" id="badGrid"></div>

      <div class="trace-divider" aria-hidden="true"></div>

      <h3 style="font-size:1.05rem; margin-bottom:10px; color: var(--copper-dark, var(--circuit-dark));">
        🌟 ไอเทมพิเศษ <span style="font-weight:400; font-size:0.85rem;">(หายาก มีผลแรงกว่าปกติ)</span>
      </h3>
      <div class="howto-grid" id="specialGrid"></div>

      <div class="trace-divider" aria-hidden="true"></div>

      <h3 style="font-size:1.05rem; margin-bottom:8px; color: var(--circuit-dark);">กติกา</h3>
      <ol>
        <li>คุณมีเวลาทั้งหมด 60 วินาที</li>
        <li>คลิกหรือแตะขยะที่ตกลงมาให้ทันก่อนถึงขอบล่าง</li>
        <li>คัดแยกขยะอิเล็กทรอนิกส์ได้คะแนนบวก — แต่ละชิ้นได้ไม่เท่ากัน ดูตัวเลขที่การ์ดแต่ละชิ้นด้านบน</li>
        <li>คัดแยกขยะทั่วไปโดยไม่ตั้งใจจะถูกหักคะแนน — แต่ละชิ้นหักไม่เท่ากัน ดูตัวเลขที่การ์ดแต่ละชิ้นด้านบน</li>
        <li>เมื่อหมดเวลา ระบบจะบันทึกคะแนนของคุณลง Leaderboard อัตโนมัติ</li>
      </ol>

      <a href="index.php" id="backLink" class="btn back-link">← กลับหน้าหลัก</a>
    </section>
  </main>

  <script src="js/sfx.js"></script>
  <script src="js/itemsConfig.js"></script>
  <script src="js/howto.js"></script>
  <script>
    // เติมช่วงคะแนน (min–max) ต่อท้ายหัวข้อ โดยอ่านค่า points จริงจาก itemsConfig.js
    // ทำแบบนี้แทนการเขียนตัวเลขตายตัว เพื่อให้ตรงกับค่าปัจจุบันเสมอแม้จะไปแก้ points ในอนาคต
    (function () {
      function pointsRangeText(items, fallback) {
        const pts = items.map((it) => (typeof it.points === "number" ? it.points : fallback));
        const min = Math.min(...pts);
        const max = Math.max(...pts);
        const fmt = (n) => (n > 0 ? `+${n}` : `${n}`);
        return min === max ? `(${fmt(min)} คะแนน)` : `(${fmt(min)} ถึง ${fmt(max)} คะแนน)`;
      }
      const goodEl = document.getElementById("goodPointsRange");
      const badEl = document.getElementById("badPointsRange");
      if (goodEl && window.ITEMS_CONFIG) {
        goodEl.textContent = pointsRangeText(ITEMS_CONFIG.eWaste, ITEMS_CONFIG.GOOD_POINTS);
      }
      if (badEl && window.ITEMS_CONFIG) {
        badEl.textContent = pointsRangeText(ITEMS_CONFIG.general, ITEMS_CONFIG.BAD_POINTS);
      }
    })();
  </script>
</body>
</html>