// game.js — ทำงานบนหน้า game.html
// รับผิดชอบ: ระบบเกมทั้งหมด (สุ่มขยะตก, คลิกคัดแยก, คะแนน, เวลา)
// ใช้รูปภาพ (png/jpg) จาก itemsConfig.js ในการวาดขยะแต่ละชิ้น (ไม่ใช้วงกลมสีบอกใบ้ถูก/ผิดอีกต่อไป)

(function () {
  // ---------- ปรับขนาดพื้นที่เล่นเกมได้ตรงนี้ที่เดียว ----------
  // แก้เลขสองตัวนี้ตามใจได้เลย ไม่ผูกกับขนาดจอ/สัดส่วนหน้าจออัตโนมัติอีกต่อไป
  const CANVAS_W = 900; // ความกว้าง (px)
  const CANVAS_H = 800; // ความสูง (px)

  const GAME_DURATION = 60; // วินาที
  const LOW_TIME_THRESHOLD = 10;

  // ---------- ความถี่ในการสุ่มขยะตก (spawn rate) ----------
  // แต่ละครั้งที่ขยะตกแล้ว จะสุ่มระยะเวลาก่อนตกครั้งถัดไปในช่วง MIN–MAX นี้ (ทำให้จังหวะไม่เท่ากันทุกครั้ง)
  const SPAWN_INTERVAL_MIN_MS = 200;
  const SPAWN_INTERVAL_MAX_MS = 400;
  // ยิ่งเล่นนานขึ้น ช่วงเวลาระหว่างการตกจะสั้นลงเรื่อย ๆ (ขยะตกถี่ขึ้น) — ปรับ/ปิดได้ตรงนี้
  const SPAWN_RAMP_PER_SEC = 6; // ms ที่ลดลงจากทั้ง MIN และ MAX ต่อ 1 วินาทีที่ผ่านไป
  const SPAWN_RAMP_MAX_REDUCTION_MS = 200; // เพดานที่ลดได้สูงสุด (กันไม่ให้ถี่จนเล่นไม่ทัน)

  // ---------- ไอเทมพิเศษ (ดาว / ไดนาไมต์ / ระเบิดนิวเคลียร์) ----------
  // ทุกครั้งที่จะสุ่มขยะตกใหม่ 1 ชิ้น จะมีโอกาส SPECIAL_SPAWN_CHANCE ที่ชิ้นนั้นจะเป็นไอเทมพิเศษแทน
  // (สุ่มก่อนแล้วค่อยเลือกว่าจะเป็นดาว/ไดนาไมต์/นิวเคลียร์ชิ้นไหน ตาม weight ในกลุ่ม special ของ itemsConfig.js)
  // ตั้งค่าน้อย ๆ ไว้เพื่อให้ไอเทมพิเศษออกยากกว่าขยะปกติมาก
  const SPECIAL_SPAWN_CHANCE = 0.05; // 5% ต่อการตกแต่ละครั้ง

  // ---------- ความเร็วการตกของขยะ ----------
  // ความเร็วพื้นฐาน (px/วินาที) ถ้าไอเทมใน itemsConfig.js ไม่ได้กำหนด speedMin/speedMax ของตัวเองไว้
  const DEFAULT_SPEED_MIN = 180;
  const DEFAULT_SPEED_MAX = 300;
  // ยิ่งเล่นนานขึ้น ขยะจะตกเร็วขึ้นเรื่อย ๆ (difficulty ramp) — ปรับ/ปิดได้ตรงนี้
  const SPEED_RAMP_PER_SEC = 2.2; // px/วินาที ที่เพิ่มขึ้นต่อ 1 วินาทีที่ผ่านไป
  const SPEED_RAMP_MAX_BONUS = 90; // เพดานความเร็วที่เพิ่มได้สูงสุดจาก ramp

  // ---------- ขนาดไอคอนขยะที่ตกลงมา ----------
  // ขนาดพื้นฐาน (px) ถ้าไอเทมใน itemsConfig.js ไม่ได้กำหนด sizeMin/sizeMax ของตัวเองไว้
  // แก้ 2 ค่านี้ตัวเดียว ไอคอนทุกชิ้น (ที่ไม่ได้ override) จะใหญ่/เล็กขึ้นตาม
  const DEFAULT_ITEM_SIZE_MIN = 69;
  const DEFAULT_ITEM_SIZE_MAX = 96;

  // ---------- ระบบคอมโบ (Combo) ----------
  // กดขยะอิเล็กทรอนิกส์ (ของถูก) ให้ถูกต้องติดต่อกันเรื่อย ๆ เพื่อสะสมคอมโบ
  // ทุก ๆ COMBO_STEP ครั้งติดต่อกัน จะได้ตัวคูณคะแนนเพิ่มขึ้น COMBO_MULTIPLIER_STEP
  // (ใช้กับคะแนนที่เป็นบวกเท่านั้น) จนถึงเพดาน COMBO_MULTIPLIER_CAP
  // ถ้ากดขยะทั่วไป (ของผิด) พลาด คอมโบจะรีเซ็ตกลับเป็น 0 ทันที
  const COMBO_STEP = 5; // ทุกกี่ครั้งติดต่อกันถึงจะขยับตัวคูณ
  const COMBO_MULTIPLIER_STEP = 0.1; // เพิ่มตัวคูณครั้งละเท่าไหร่
  const COMBO_MULTIPLIER_CAP = 2.0; // ตัวคูณคะแนนสูงสุดที่เป็นไปได้

  // ---------- ช่วงเวลาโบนัส (Final Rush) ----------
  // ในช่วง LAST_BONUS_SECONDS วินาทีสุดท้ายของเกม:
  // - กดขยะอิเล็กทรอนิกส์ถูก -> ได้คะแนนเพิ่มขึ้นอีก (BONUS_GOOD_MULTIPLIER - 1) * 100%
  // - กดขยะทั่วไปพลาด -> เสียคะแนนมากขึ้นอีก (BONUS_BAD_MULTIPLIER - 1) * 100%
  // ตัวคูณช่วงโบนัสนี้จะคูณทบกับตัวคูณคอมโบด้านบนอีกที (สำหรับฝั่งคะแนนบวก)
  const LAST_BONUS_SECONDS = 10; // จำนวนวินาทีสุดท้ายที่นับเป็นช่วงโบนัส
  const BONUS_GOOD_MULTIPLIER = 1.3; // คะแนนดี +30%
  const BONUS_BAD_MULTIPLIER = 1.5; // คะแนนเสีย -50% (หักมากขึ้น)

  // รายการขยะ + คะแนน มาจากไฟล์ itemsConfig.js (ใช้ร่วมกับหน้า how-to-play.html)
  const E_WASTE_ITEMS = ITEMS_CONFIG.eWaste;
  const GENERAL_WASTE_ITEMS = ITEMS_CONFIG.general;
  const SPECIAL_ITEMS = ITEMS_CONFIG.special || [];
  const GOOD_POINTS = ITEMS_CONFIG.GOOD_POINTS;
  const BAD_POINTS = ITEMS_CONFIG.BAD_POINTS;

  // ---------- DOM refs ----------
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const canvasFrame = document.getElementById("canvasFrame");
  const scoreValueEl = document.getElementById("scoreValue");
  const timeValueEl = document.getElementById("timeValue");
  const playerValueEl = document.getElementById("playerValue");
  const countdownOverlay = document.getElementById("countdownOverlay");
  const comboBadgeEl = document.getElementById("comboBadge");
  const comboValueEl = document.getElementById("comboValue");
  const bonusBannerEl = document.getElementById("bonusBanner");
  const nukeFlashEl = document.getElementById("nukeFlash");

  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;

  // ---------- สีธีม (ดึงจาก CSS variables ให้เข้าธีมเดียวกับหน้าเว็บ พร้อม fallback เผื่อหาไม่เจอ) ----------
  const rootStyles = getComputedStyle(document.documentElement);
  function cssVar(name, fallback) {
    const v = rootStyles.getPropertyValue(name).trim();
    return v || fallback;
  }
  const THEME = {
    good: cssVar("--circuit", "#2f6a4f"),
    bad: cssVar("--alert", "#c1543f"),
    ink: cssVar("--ink", "#1e2b23"),
    gold: "#e8b923", // ดาว
    dynamite: "#d16464", // ไดนาไมต์
    nuke: "#7fd68a", // ระเบิดนิวเคลียร์ (เขียวเรืองรังสี)
  };

  // ---------- เอฟเฟกต์ระเบิด (ไดนาไมต์ / นิวเคลียร์) วาดทับบน canvas ตอนกดโดน ----------
  // แต่ละชิ้นมีอายุจำกัด (EXPLOSION_LIFETIME_MS) แล้วจะถูกลบออกจาก array อัตโนมัติใน loop()
  const EXPLOSION_LIFETIME_MS = 550;
  // ป้องกันการคลิกระเบิดหลายลูกติดกันจนมีอนุภาคสะสมและทำให้ canvas กระตุก/ค้าง
  const MAX_ACTIVE_EXPLOSIONS = 8;
  let explosions = [];

  function spawnExplosion(x, y, size, kind) {
    explosions.push({
      x,
      y,
      size,
      kind, // "dynamite" | "nuke"
      startedAt: performance.now(),
      // สุ่มมุม/ระยะของสะเก็ดแต่ละชิ้นไว้ล่วงหน้า ให้แต่ละครั้งดูไม่ซ้ำกัน
      shards: Array.from({ length: kind === "nuke" ? 16 : 10 }, () => ({
        angle: Math.random() * Math.PI * 2,
        dist: randRange(0.6, 1.0),
        len: randRange(0.5, 1),
      })),
    });
    if (explosions.length > MAX_ACTIVE_EXPLOSIONS) {
      explosions.splice(0, explosions.length - MAX_ACTIVE_EXPLOSIONS);
    }
  }

  function drawExplosions(nowTs) {
    explosions = explosions.filter((ex) => {
      const t = (nowTs - ex.startedAt) / EXPLOSION_LIFETIME_MS; // 0 -> 1
      if (t >= 1) return false;

      const eased = 1 - Math.pow(1 - t, 3); // ease-out
      const maxRadius = ex.size * (ex.kind === "nuke" ? 2.6 : 1.9);
      const alpha = 1 - t;
      const color = ex.kind === "nuke" ? THEME.nuke : THEME.dynamite;

      ctx.save();
      ctx.translate(ex.x, ex.y);

      // วงแหวนช็อกเวฟขยายออก + จางหาย
      ctx.beginPath();
      ctx.arc(0, 0, maxRadius * eased, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, 6 * alpha);
      ctx.globalAlpha = alpha * 0.8;
      ctx.stroke();

      // แกนกลางแฟลชสว่างช่วงแรก
      ctx.beginPath();
      ctx.arc(0, 0, ex.size * 0.5 * (1 - eased * 0.6), 0, Math.PI * 2);
      ctx.fillStyle = "#fff8e0";
      ctx.globalAlpha = Math.max(0, alpha - 0.3);
      ctx.fill();

      // สะเก็ดกระจายออกจากจุดศูนย์กลาง
      ctx.fillStyle = color;
      ex.shards.forEach((s) => {
        const dist = maxRadius * eased * s.dist;
        const sx = Math.cos(s.angle) * dist;
        const sy = Math.sin(s.angle) * dist;
        const shardSize = Math.max(1, ex.size * 0.09 * s.len * (1 - t));
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(sx, sy, shardSize, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
      return true;
    });
  }

  // ---------- เอฟเฟกต์จอขาวโพลนตอนโดนระเบิดนิวเคลียร์ ----------
  let nukeFlashTimeoutIds = [];
  function triggerNukeFlash() {
    if (!nukeFlashEl) return;
    // เคลียร์ timeout เก่า เผื่อกดโดนนิวเคลียร์ซ้อนกันเร็ว ๆ
    nukeFlashTimeoutIds.forEach((id) => clearTimeout(id));
    nukeFlashTimeoutIds = [];

    nukeFlashEl.style.transition = "opacity 0.18s ease-in";
    nukeFlashEl.style.opacity = "1";

    nukeFlashTimeoutIds.push(
      window.setTimeout(() => {
        nukeFlashEl.style.transition = "opacity 0.65s ease-out";
        nukeFlashEl.style.opacity = "0";
        // รับประกันว่า overlay จะไม่ค้างบังเกม แม้ browser จะไม่ทำ transition ให้ครบ
        nukeFlashTimeoutIds.push(
          window.setTimeout(() => {
            nukeFlashEl.style.transition = "none";
            nukeFlashEl.style.opacity = "0";
          }, 700)
        );
      }, 450)
    );
  }

  // ---------- Player ----------
  const playerName = sessionStorage.getItem("ewr_playerName");
  if (!playerName) {
    // ไม่มีชื่อผู้เล่น -> ย้อนกลับไปหน้าแรกให้กรอกชื่อ (หรือระบบจะตั้งชื่อ Player 0N ให้อัตโนมัติ)
    window.location.href = "index.php";
    return;
  }
  playerValueEl.textContent = playerName;

  // ---------- State ----------
  let score = 0;
  let combo = 0; // จำนวนครั้งที่กดขยะอิเล็กทรอนิกส์ถูกต้องติดต่อกัน ณ ปัจจุบัน
  let maxCombo = 0; // คอมโบสูงสุดที่ทำได้ในเกมนี้ (เก็บไว้โชว์ในหน้า Game Over)
  let timeLeft = GAME_DURATION;
  let fallingItems = [];
  let itemIdCounter = 0;
  let lastSpawnAt = 0;
  let nextSpawnGapMs = 0; // ระยะเวลาก่อนขยะชิ้นถัดไปจะตก (สุ่มใหม่ทุกครั้งหลังตก)
  let gameStartAt = 0;
  let rafId = null;
  let timerId = null;
  let gameRunning = false;

  function randRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  // สุ่มระยะเวลาก่อนขยะชิ้นถัดไปจะตก ในช่วง SPAWN_INTERVAL_MIN_MS–MAX_MS
  // และยิ่งเล่นนาน (elapsedSec) ยิ่งลดช่วงเวลาลง (ขยะตกถี่ขึ้น) จนถึงเพดานที่กำหนด
  // หมายเหตุ: มี safety floor เล็ก ๆ (100ms) กันไม่ให้ค่าติดลบ/เป็นศูนย์เท่านั้น
  // ไม่ได้บังคับขั้นต่ำไว้สูงเหมือนเดิม เพื่อให้ SPAWN_INTERVAL_MIN_MS/MAX_MS ที่ตั้งไว้มีผลจริง
  const SPAWN_GAP_SAFETY_FLOOR_MS = 100;
  function randomSpawnGap(timestamp) {
    const elapsedSec = gameStartAt ? (timestamp - gameStartAt) / 1000 : 0;
    const reduction = Math.min(elapsedSec * SPAWN_RAMP_PER_SEC, SPAWN_RAMP_MAX_REDUCTION_MS);
    const min = Math.max(SPAWN_GAP_SAFETY_FLOOR_MS, SPAWN_INTERVAL_MIN_MS - reduction);
    const max = Math.max(min + 10, SPAWN_INTERVAL_MAX_MS - reduction);
    return randRange(min, max);
  }

  // ---------- Preload รูปภาพขยะทั้งหมดล่วงหน้า (กันภาพกระตุกตอนตกลงมาครั้งแรก) ----------
  [...E_WASTE_ITEMS, ...GENERAL_WASTE_ITEMS, ...SPECIAL_ITEMS].forEach((def) => loadItemImage(def));

  // สุ่มเลือก 1 ไอเทมจาก pool โดยถ่วงน้ำหนักตาม def.weight (ยิ่ง weight เยอะ ยิ่งมีโอกาสถูกเลือกบ่อยกว่า)
  // ไอเทมที่ไม่ได้กำหนด weight ไว้ จะถือว่า weight = 1 (โอกาสพื้นฐานเท่ากันทุกชิ้น)
  function weightedRandomPick(pool) {
    const totalWeight = pool.reduce((sum, def) => sum + (def.weight ?? 1), 0);
    let roll = Math.random() * totalWeight;
    for (const def of pool) {
      roll -= def.weight ?? 1;
      if (roll <= 0) return def;
    }
    return pool[pool.length - 1]; // กันเคส floating-point เพี้ยนเล็กน้อย
  }

  function spawnItem(timestamp) {
    // สุ่มก่อนว่าชิ้นนี้จะเป็นไอเทมพิเศษ (ดาว/ไดนาไมต์/นิวเคลียร์) หรือไม่ ออกยากกว่าขยะปกติมาก
    const isSpecial = SPECIAL_ITEMS.length > 0 && Math.random() < SPECIAL_SPAWN_CHANCE;

    let pool, isGood;
    if (isSpecial) {
      pool = SPECIAL_ITEMS;
    } else {
      isGood = Math.random() < 0.55; // เอนเอียงให้ขยะอิเล็กทรอนิกส์ตกบ่อยกว่าเล็กน้อย
      pool = isGood ? E_WASTE_ITEMS : GENERAL_WASTE_ITEMS;
    }
    const def = weightedRandomPick(pool);

    if (isSpecial) {
      // สำหรับระบบคอมโบ: ดาว (effect: "bonus") นับเป็น "ถูก" ต่อคอมโบได้เหมือนขยะอิเล็กทรอนิกส์
      // ส่วนไดนาไมต์/นิวเคลียร์ (effect: "penalty" / "clearScore") นับเป็น "พลาด" รีเซ็ตคอมโบ
      isGood = def.effect === "bonus";
    }

    // ขนาดไอคอนต่อไอเทม: ถ้ากำหนด sizeMin/sizeMax ไว้ใน itemsConfig.js ของไอเทมนั้น ๆ จะใช้ค่านั้นก่อน
    // ไม่งั้น fallback ไปใช้ค่ากลาง DEFAULT_ITEM_SIZE_MIN/MAX
    const sizeMin = def.sizeMin ?? DEFAULT_ITEM_SIZE_MIN;
    const sizeMax = def.sizeMax ?? DEFAULT_ITEM_SIZE_MAX;
    const size = randRange(sizeMin, sizeMax);

    // ความเร็วต่อไอเทม: ถ้ากำหนด speedMin/speedMax ไว้ใน itemsConfig.js ของไอเทมนั้น ๆ จะใช้ค่านั้นก่อน
    // ไม่งั้น fallback ไปใช้ค่ากลาง DEFAULT_SPEED_MIN/MAX
    const speedMin = def.speedMin ?? DEFAULT_SPEED_MIN;
    const speedMax = def.speedMax ?? DEFAULT_SPEED_MAX;

    // difficulty ramp: ยิ่งเล่นนาน (วินาที) ยิ่งเพิ่มความเร็วฐานขึ้นเรื่อย ๆ จนถึงเพดานที่กำหนด
    const elapsedSec = gameStartAt ? (timestamp - gameStartAt) / 1000 : 0;
    const rampBonus = Math.min(elapsedSec * SPEED_RAMP_PER_SEC, SPEED_RAMP_MAX_BONUS);

    fallingItems.push({
      id: itemIdCounter++,
      def,
      isGood,
      isSpecial,
      x: randRange(size, CANVAS_W - size),
      y: -size,
      size,
      speed: randRange(speedMin, speedMax) + rampBonus, // px ต่อวินาที
      rotation: randRange(-0.12, 0.12),
      spinSpeed: randRange(-0.5, 0.5),
      hit: false,
      removedAt: null,
    });
  }

  function drawBackground() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = "#f7f4ea";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // เส้นตารางจาง ๆ แบบพื้นหลังแผงวงจร
    ctx.strokeStyle = "rgba(47, 106, 79, 0.08)";
    ctx.lineWidth = 1;
    for (let gx = 0; gx < CANVAS_W; gx += 24) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, CANVAS_H);
      ctx.stroke();
    }
    for (let gy = 0; gy < CANVAS_H; gy += 24) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(CANVAS_W, gy);
      ctx.stroke();
    }

    // เส้นพื้น (danger line)
    ctx.strokeStyle = "rgba(193, 84, 63, 0.4)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_H - 10);
    ctx.lineTo(CANVAS_W, CANVAS_H - 10);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // หมายเหตุ: ตั้งใจไม่วาดวงกลม/กรอบสีเขียว-แดงบอกใบ้ว่าอันไหนถูกหรือผิดอีกต่อไป
  // ผู้เล่นต้องดูจาก "รูปภาพ/ไอคอนขยะ" เองว่าเป็นขยะอิเล็กทรอนิกส์หรือขยะทั่วไป
  // ไอเทมดาว (โบนัส) กระพริบแสงวาบเป็นจังหวะตลอดเวลาที่ตกลงมา เพื่อให้เด่นและรู้สึกพิเศษ
  function isStarItem(item) {
    return item.isSpecial && item.def.effect === "bonus";
  }

  function drawItem(item, nowTs) {
    const img = ITEM_IMAGE_CACHE.get(item.def.image);
    const s = item.size;
    const star = isStarItem(item);

    ctx.save();
    ctx.translate(item.x, item.y);

    // ---------- เอฟเฟกต์แสงวูบวาบเฉพาะไอเทม "ดาว" (วาดก่อนตัวไอคอน ให้เป็นแสงเรืองอยู่ด้านหลัง) ----------
    if (star) {
      const twinkle = 0.55 + 0.45 * Math.sin(nowTs / 140 + item.id); // สั่นเร็ว ๆ ต่อเนื่อง แต่ละดวงจังหวะไม่ตรงกัน (offset ด้วย item.id)
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.35 * twinkle;
      ctx.shadowColor = THEME.gold;
      ctx.shadowBlur = s * (0.5 + 0.35 * twinkle);
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = THEME.gold;
      ctx.fill();
      ctx.restore();

      // เส้นแสงวาบสี่แฉกหมุนช้า ๆ รอบดวงดาว
      ctx.save();
      ctx.rotate(nowTs / 900);
      ctx.globalAlpha = 0.5 + 0.5 * twinkle;
      ctx.strokeStyle = "#fff3c4";
      ctx.lineWidth = Math.max(1.5, s * 0.03);
      const rayLen = s * (0.75 + 0.2 * twinkle);
      for (let a = 0; a < 4; a++) {
        ctx.save();
        ctx.rotate((Math.PI / 2) * a);
        ctx.beginPath();
        ctx.moveTo(0, -rayLen);
        ctx.lineTo(0, rayLen);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    ctx.rotate(item.rotation);

    // เงานุ่ม ๆ ใต้ไอเทม ช่วยแยกจากพื้นหลัง
    ctx.beginPath();
    ctx.ellipse(0, s * 0.38, s * 0.34, s * 0.1, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(30, 43, 34, 0.14)";
    ctx.fill();

    // ---------- backdrop ทึบแสงหลังไอคอน ----------
    // แก้ปัญหาไอคอน/รูปภาพดูจางกลืนกับพื้นหลังสีอ่อนของกระดาน โดยใส่แผ่นวงกลมสีทึบ (ตามหมวดของไอเทม)
    // ไว้หลังรูปเสมอ ทำให้ภาพ (โดยเฉพาะ PNG โปร่งใส หรือ emoji fallback) เด่นและคมชัดขึ้นชัดเจน
    let backdropColor = item.isGood ? THEME.good : THEME.bad;
    if (item.isSpecial) {
      backdropColor = star ? THEME.gold : item.def.effect === "penalty" ? THEME.dynamite : THEME.nuke;
    }
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = backdropColor;
    ctx.globalAlpha = 0.16;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
    ctx.lineWidth = Math.max(1.5, s * 0.025);
    ctx.strokeStyle = backdropColor;
    ctx.globalAlpha = 0.55;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // วาดตัวไอคอน/รูปภาพให้คมชัดเต็มความทึบเสมอ (กันกรณี globalAlpha ค้างจากส่วนอื่นของโค้ดในอนาคต)
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    if (img) {
      ctx.drawImage(img, -s / 2, -s / 2, s, s);
    } else {
      // fallback: ยังไม่มีรูปภาพ (โหลดไม่สำเร็จ) -> ใช้ emoji ไอคอนแทนชั่วคราว
      ctx.font = `${s * 0.72}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(item.def.icon, 0, 2);
    }

    ctx.restore();
  }

  function spawnFloater(x, y, text, isGood) {
    const floater = document.createElement("div");
    floater.className = `floater ${isGood ? "floater--good" : "floater--bad"}`;
    floater.textContent = text;

    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / CANVAS_W;
    const scaleY = rect.height / CANVAS_H;

    floater.style.left = `${x * scaleX}px`;
    floater.style.top = `${y * scaleY}px`;
    canvasFrame.appendChild(floater);

    setTimeout(() => floater.remove(), 720);
  }

  function updateScoreDisplay() {
    scoreValueEl.textContent = String(score);
  }

  // คำนวณตัวคูณคะแนนจากคอมโบปัจจุบัน (1.0 = ไม่มีตัวคูณ)
  function getComboMultiplier(comboCount) {
    const steps = Math.floor(comboCount / COMBO_STEP);
    return Math.min(1 + steps * COMBO_MULTIPLIER_STEP, COMBO_MULTIPLIER_CAP);
  }

  function updateComboDisplay() {
    if (combo <= 0) {
      comboBadgeEl.style.display = "none";
      return;
    }
    const mult = getComboMultiplier(combo);
    comboValueEl.textContent = `x${combo} · ${mult.toFixed(1)}× คะแนน`;
    comboBadgeEl.style.display = "flex";
    // รีสตาร์ท animation ทุกครั้งที่คอมโบขยับ (บังคับ reflow)
    comboBadgeEl.classList.remove("combo-badge--pulse");
    void comboBadgeEl.offsetWidth;
    comboBadgeEl.classList.add("combo-badge--pulse");
  }

  // ช่วงโบนัสวินาทีสุดท้าย: true เมื่อเวลาที่เหลือ <= LAST_BONUS_SECONDS และเกมยังไม่จบ
  function isBonusTime() {
    return gameRunning && timeLeft > 0 && timeLeft <= LAST_BONUS_SECONDS;
  }

  function updateTimeDisplay() {
    timeValueEl.textContent = String(timeLeft);
    timeValueEl.classList.toggle("is-low", timeLeft <= LOW_TIME_THRESHOLD);

    if (bonusBannerEl) {
      bonusBannerEl.style.display = isBonusTime() ? "flex" : "none";
    }
  }

  // ---------- Input handling ----------
  function getCanvasPos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function handlePointer(clientX, clientY) {
    if (!gameRunning) return;
    const pos = getCanvasPos(clientX, clientY);

    // เช็คจากบนสุด (item ที่ล่าสุด) ก่อน เพื่อให้คลิกโดนชิ้นที่ทับอยู่ด้านหน้า
    for (let i = fallingItems.length - 1; i >= 0; i--) {
      const item = fallingItems[i];
      if (item.hit) continue;
      const dx = pos.x - item.x;
      const dy = pos.y - item.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= item.size / 2 + 6) {
        item.hit = true;
        item.removedAt = performance.now();

        // ไอเทมพิเศษ "ระเบิดนิวเคลียร์" (effect: "clearScore") ไม่ใช้ระบบคำนวณคะแนนปกติ
        // กดโดนแล้วล้างคะแนนสะสมทั้งหมดกลับเป็น 0 ทันที + รีเซ็ตคอมโบ แล้วจบการจัดการตรงนี้เลย
        if (item.def.effect === "clearScore") {
          combo = 0;
          score = 0;
          updateScoreDisplay();
          updateComboDisplay();
          spawnFloater(item.x, item.y, "☢️ คะแนนหายหมด!", false);
          spawnExplosion(item.x, item.y, item.size, "nuke");
          SFX.game.explosionNuke();
          triggerNukeFlash(); // จอขาวโพลนทั้งหมด ~3 วินาที (เวลาเกมยังเดินต่อตามปกติ ไม่หยุด)
          break;
        }

        // คะแนนต่อชิ้น: ใช้ค่า points ที่กำหนดไว้เฉพาะของแต่ละไอเทมใน itemsConfig.js ก่อน
        // (เช่น มือถือเก่าอาจได้ +15 แต่ถ่านไฟฉายอาจได้ +5, ดาว/ไดนาไมต์ได้ ±100) ถ้าไอเทมไหนยังไม่ได้กำหนด points
        // จะ fallback ไปใช้ค่ากลาง GOOD_POINTS/BAD_POINTS เหมือนเดิม
        const basePoints = typeof item.def.points === "number" ? item.def.points : item.isGood ? GOOD_POINTS : BAD_POINTS;

        // อัปเดตคอมโบ: กดขยะอิเล็กทรอนิกส์ถูก -> คอมโบ +1 / กดขยะทั่วไปพลาด -> คอมโบรีเซ็ต
        if (item.isGood) {
          combo += 1;
          if (combo > maxCombo) maxCombo = combo;
        } else {
          combo = 0;
        }
        const comboMultiplier = getComboMultiplier(combo);
        const bonusActive = isBonusTime();

        let points = basePoints;
        if (item.isGood && basePoints > 0) {
          // ตัวคูณคอมโบ + ตัวคูณช่วงโบนัสวินาทีสุดท้าย (ถ้ามี) คูณทบกันกับคะแนนบวก
          points = basePoints * comboMultiplier;
          if (bonusActive) points *= BONUS_GOOD_MULTIPLIER;
        } else if (!item.isGood && basePoints < 0 && bonusActive) {
          // ช่วงโบนัสวินาทีสุดท้าย: กดขยะทั่วไปพลาด เสียคะแนนมากขึ้น
          points = basePoints * BONUS_BAD_MULTIPLIER;
        }
        points = Math.round(points);

        score += points;
        if (score < 0) score = 0;
        updateScoreDisplay();
        updateComboDisplay();

        const bonusTag = bonusActive ? " ⚡" : "";
        const floaterText =
          item.isGood && comboMultiplier > 1
            ? `+${points} (x${comboMultiplier.toFixed(1)})${bonusTag}`
            : `${points > 0 ? "+" : ""}${points}${bonusTag}`;
        spawnFloater(item.x, item.y, floaterText, item.isGood);

        // เสียงเอฟเฟกต์ตอนคัดแยกถูก/ผิด — อยู่ในโค้ดจุดที่จัดการการคลิก/แตะโดยตรง
        // ไดนาไมต์ (effect: "penalty") ได้เอฟเฟกต์ระเบิด (แอนิเมชัน + เสียง) แทนเสียง/ภาพปกติ
        const isDynamite = item.isSpecial && item.def.effect === "penalty";
        if (isDynamite) {
          spawnExplosion(item.x, item.y, item.size, "dynamite");
          SFX.game.explosionSmall();
        } else if (item.isGood) {
          SFX.game.hitGood();
        } else {
          SFX.game.hitBad();
        }
        break;
      }
    }
  }

  canvas.addEventListener("click", (e) => handlePointer(e.clientX, e.clientY));
  canvas.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      handlePointer(touch.clientX, touch.clientY);
    },
    { passive: false }
  );

  // ---------- ปุ่มออกจากเกม ----------
  const exitBtn = document.getElementById("exitBtn");
  if (exitBtn) {
    exitBtn.addEventListener("click", (e) => {
      e.preventDefault();
      SFX.playThenGo(SFX.game.exit, exitBtn.getAttribute("href"));
    });
  }

  // ---------- Main loop ----------
  let lastFrameTime = 0;

  function loop(timestamp) {
    if (!gameRunning) return;

    if (!lastFrameTime) lastFrameTime = timestamp;
    const dt = (timestamp - lastFrameTime) / 1000;
    lastFrameTime = timestamp;

    if (!gameStartAt) gameStartAt = timestamp;
    if (!lastSpawnAt) {
      lastSpawnAt = timestamp;
      nextSpawnGapMs = randomSpawnGap(timestamp);
    }
    if (timestamp - lastSpawnAt >= nextSpawnGapMs) {
      spawnItem(timestamp);
      lastSpawnAt = timestamp;
      nextSpawnGapMs = randomSpawnGap(timestamp); // สุ่มระยะเวลาก่อนตกครั้งถัดไปใหม่ ทำให้จังหวะไม่เท่ากัน
    }

    drawBackground();

    fallingItems = fallingItems.filter((item) => {
      if (item.hit) {
        // ปล่อยให้หายไปทันทีหลังจากคลิกโดน (มี floater แสดงแทน)
        return false;
      }
      item.y += item.speed * dt;
      item.rotation += item.spinSpeed * dt;
      if (item.y - item.size / 2 > CANVAS_H) {
        return false; // ตกพ้นจอ - ไม่มีผลต่อคะแนน
      }
      drawItem(item, timestamp);
      return true;
    });

    if (explosions.length) drawExplosions(timestamp);

    rafId = requestAnimationFrame(loop);
  }

  // ---------- Timer ----------
  function startTimer() {
    timerId = setInterval(() => {
      timeLeft -= 1;
      updateTimeDisplay();
      if (timeLeft <= 0) {
        endGame();
      }
    }, 1000);
  }

  function endGame() {
    gameRunning = false;
    clearInterval(timerId);
    cancelAnimationFrame(rafId);

    sessionStorage.setItem("ewr_lastScore", String(score));
    sessionStorage.setItem("ewr_maxCombo", String(maxCombo));
    window.location.href = "gameover.php";
  }

  // ---------- Countdown then start ----------
  function runCountdown() {
    let count = 3;
    countdownOverlay.textContent = String(count);
    countdownOverlay.style.display = "flex";
    SFX.game.countdownTick();

    const countdownId = setInterval(() => {
      count -= 1;
      if (count > 0) {
        countdownOverlay.textContent = String(count);
        SFX.game.countdownTick();
      } else if (count === 0) {
        countdownOverlay.textContent = "GO!";
        SFX.game.countdownGo();
      } else {
        clearInterval(countdownId);
        countdownOverlay.style.display = "none";
        beginGame();
      }
    }, 700);
  }

  function beginGame() {
    gameRunning = true;
    score = 0;
    combo = 0;
    maxCombo = 0;
    updateComboDisplay();
    timeLeft = GAME_DURATION;
    fallingItems = [];
    explosions = [];
    nukeFlashTimeoutIds.forEach((id) => clearTimeout(id));
    nukeFlashTimeoutIds = [];
    if (nukeFlashEl) {
      nukeFlashEl.style.transition = "none";
      nukeFlashEl.style.opacity = "0";
    }
    lastSpawnAt = 0;
    nextSpawnGapMs = 0;
    lastFrameTime = 0;
    gameStartAt = 0; // จะถูกตั้งค่าจริงในเฟรมแรกของ loop() (ใช้ timestamp เดียวกับ requestAnimationFrame)
    updateScoreDisplay();
    updateTimeDisplay();
    startTimer();
    rafId = requestAnimationFrame(loop);
  }

  drawBackground();
  runCountdown();
})();
