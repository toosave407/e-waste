// sfx.js — ระบบเสียงเอฟเฟกต์ ใช้ร่วมกันทุกหน้า (index / game / gameover / leaderboard / how-to-play)
// รับผิดชอบ: เล่นเสียงตอนกดปุ่ม และเสียงตอนคัดแยกขยะถูก/ผิด
//
// ทำไมถึงใช้เสียง "สังเคราะห์" (Web Audio API) แทนไฟล์เสียงสำเร็จรูป:
//   - ไม่ต้องพึ่งไฟล์เสียงภายนอกที่อาจหายหรือติดลิขสิทธิ์ ทำงานได้ทันทีแบบออฟไลน์
//   - ไฟล์นี้จุดเดียวคุมเสียงทั้งหมด ปรับ/เปลี่ยนทีเดียวมีผลทุกหน้า
//
// ถ้าอยากเปลี่ยนไปใช้ไฟล์เสียงจริง (.mp3 / .wav) ของคุณเอง:
//   1. วางไฟล์เสียงไว้ที่ client/assets/audio/ (สร้างโฟลเดอร์นี้ไว้ให้แล้ว)
//   2. ในฟังก์ชัน playTone(...) ด้านล่าง ให้แทนที่ด้วยโค้ดประมาณนี้:
//        const audio = new Audio("assets/audio/ชื่อไฟล์.mp3");
//        audio.play();
//      หรือจะสร้างฟังก์ชันใหม่ playFile(path) แล้วเรียกแทน playTone ในแต่ละปุ่มก็ได้
//      โครงสร้าง SFX.xxx() ด้านล่างจะไม่ต้องแก้ไขที่หน้าอื่นเลย แก้ที่ไฟล์นี้ไฟล์เดียวพอ

const SFX = (function () {
  let audioCtx = null;
  let lastExplosionAt = 0;
  function getCtx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
    }
    // เบราว์เซอร์บางตัวจะ suspend AudioContext จนกว่าจะมี user gesture
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  /**
   * เล่นโทนเสียงสั้น ๆ 1 ตัว หรือหลายตัวต่อกัน (arpeggio)
   * @param {number[]} freqs รายการความถี่ (Hz) ที่จะเล่นเรียงกัน
   * @param {object} opts { type: waveform, duration: ต่อโน้ต (วินาที), gain: ความดัง, gap: ระยะห่างระหว่างโน้ต }
   */
  function playTone(freqs, opts = {}) {
    try {
      const ctx = getCtx();
      const type = opts.type || "sine";
      const duration = opts.duration ?? 0.11;
      const gap = opts.gap ?? duration * 0.85;
      const peakGain = opts.gain ?? 0.09;

      freqs.forEach((freq, i) => {
        const startAt = ctx.currentTime + i * gap;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startAt);
        gainNode.gain.setValueAtTime(0.0001, startAt);
        gainNode.gain.exponentialRampToValueAtTime(peakGain, startAt + 0.012);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(startAt);
        osc.stop(startAt + duration + 0.02);
      });
    } catch (err) {
      // เบราว์เซอร์ไม่รองรับ / ยังไม่มี user gesture -> เงียบไว้ ไม่ทำให้เกมพัง
    }
  }

  /**
   * เล่นเสียง "ระเบิด" — ผสม white noise (เสียงลมระเบิด) + โทนเสียงทุ้มไล่ความถี่ลง (แรงสั่นสะเทือน)
   * ใช้แทน playTone ธรรมดาเพราะโทนเสียงล้วน ๆ ฟังดูไม่เหมือนระเบิดจริง
   * @param {object} opts { duration, gain (ความดัง noise), boomGain (ความดังเสียงทุ้ม),
   *                        filterStart/filterEnd (ความถี่ low-pass ไล่จากสว่างไปทึบ),
   *                        boomFreqStart/boomFreqEnd (ความถี่เสียงทุ้มไล่ลง) }
   */
  function playExplosion(opts = {}) {
    try {
      // ไม่สร้าง Web Audio nodes จำนวนมากเมื่อผู้เล่นกดระเบิดติดกันเร็ว ๆ
      const now = performance.now();
      if (now - lastExplosionAt < 90) return;
      lastExplosionAt = now;

      const ctx = getCtx();
      const duration = opts.duration ?? 0.6;
      const startAt = ctx.currentTime;

      // --- เสียงลม/เศษระเบิด (white noise ที่ decay ลงเรื่อย ๆ) ---
      const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const decay = Math.pow(1 - i / bufferSize, 2);
        data[i] = (Math.random() * 2 - 1) * decay;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(opts.filterStart ?? 2200, startAt);
      filter.frequency.exponentialRampToValueAtTime(opts.filterEnd ?? 120, startAt + duration);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(opts.gain ?? 0.32, startAt);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(startAt);
      noise.stop(startAt + duration + 0.05);

      // --- เสียงทุ้ม/แรงสั่นสะเทือน (ไล่ความถี่ลงจากกลางไปต่ำ) ---
      const boom = ctx.createOscillator();
      const boomGainNode = ctx.createGain();
      boom.type = "sine";
      boom.frequency.setValueAtTime(opts.boomFreqStart ?? 160, startAt);
      boom.frequency.exponentialRampToValueAtTime(opts.boomFreqEnd ?? 35, startAt + duration);
      boomGainNode.gain.setValueAtTime(opts.boomGain ?? 0.26, startAt);
      boomGainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
      boom.connect(boomGainNode);
      boomGainNode.connect(ctx.destination);
      boom.start(startAt);
      boom.stop(startAt + duration + 0.05);
    } catch (err) {
      // เบราว์เซอร์ไม่รองรับ / ยังไม่มี user gesture -> เงียบไว้ ไม่ทำให้เกมพัง
    }
  }

  /**
   * แตะปุ่มแล้วรอเสียงเล่นสักครู่ก่อนค่อยเปลี่ยนหน้า (เพื่อให้ได้ยินเสียงก่อนหน้าเปลี่ยน)
   */
  function playThenGo(playFn, url, delayMs = 140) {
    playFn();
    window.setTimeout(() => {
      window.location.href = url;
    }, delayMs);
  }

  return {
    playThenGo,

    // ---------- หน้าเมนูหลัก (index.html) ----------
    menu: {
      start: () => playTone([440, 660, 880], { type: "triangle", duration: 0.1, gain: 0.1 }),
      navHowTo: () => playTone([520, 660], { type: "square", duration: 0.09, gain: 0.06 }),
      navLeaderboard: () => playTone([600, 760], { type: "sawtooth", duration: 0.08, gain: 0.05 }),
    },

    // ---------- หน้าเล่นเกม (game.html) ----------
    game: {
      hitGood: () => playTone([700, 1050], { type: "triangle", duration: 0.09, gain: 0.11 }),
      hitBad: () => playTone([220, 140], { type: "sawtooth", duration: 0.14, gain: 0.09 }),
      countdownTick: () => playTone([392], { type: "square", duration: 0.08, gain: 0.07 }),
      countdownGo: () => playTone([523, 659, 784], { type: "triangle", duration: 0.12, gain: 0.1 }),
      exit: () => playTone([500, 350], { type: "square", duration: 0.09, gain: 0.06 }),
      // ระเบิดไดนาไมต์ — สั้น แหลม กว่า
      explosionSmall: () =>
        playExplosion({ duration: 0.45, gain: 0.3, boomGain: 0.22, filterStart: 2400, filterEnd: 200, boomFreqStart: 190, boomFreqEnd: 55 }),
      // ระเบิดนิวเคลียร์ — ยาว ลึก และดังกว่า
      explosionNuke: () =>
        playExplosion({ duration: 1.2, gain: 0.42, boomGain: 0.36, filterStart: 3000, filterEnd: 80, boomFreqStart: 130, boomFreqEnd: 22 }),
    },

    // ---------- หน้าจบเกม (gameover.html) ----------
    gameover: {
      reveal: () => playTone([523, 659, 784, 1046], { type: "triangle", duration: 0.14, gain: 0.09 }),
      playAgain: () => playTone([440, 550, 660], { type: "triangle", duration: 0.1, gain: 0.1 }),
      navLeaderboard: () => playTone([600, 760], { type: "sawtooth", duration: 0.08, gain: 0.05 }),
      navHome: () => playTone([500, 350], { type: "square", duration: 0.09, gain: 0.06 }),
    },

    // ---------- หน้า Leaderboard (leaderboard.html) ----------
    leaderboard: {
      tabSwitch: () => playTone([494, 622], { type: "sine", duration: 0.07, gain: 0.07 }),
      navHome: () => playTone([500, 350], { type: "square", duration: 0.09, gain: 0.06 }),
    },

    // ---------- หน้าวิธีเล่น (how-to-play.html) ----------
    howto: {
      back: () => playTone([420, 300], { type: "sine", duration: 0.09, gain: 0.06 }),
    },
  };
})();
