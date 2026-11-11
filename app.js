/**
 * ZUKKO TA'LIM MARKAZI ("IQTIDORT") — 120FPS GPU SCROLL ENGINE & INTERACTIVE HUB
 * Created by ETHITH Solutions | Zero Black Frames | Transparent Neon Glass UI
 */

(() => {
  'use strict';

  const TOTAL_FRAMES = 300; // f_000.webp -> f_299.webp (0.00s to 25.55s, zero black frames)
  const CACHE_BUST = '?cb=zukko_v1';

  // DOM Elements
  const canvas = document.getElementById('scrubber-canvas');
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  const topScrollLaser = document.getElementById('top-scroll-laser');
  const navButtons = Array.from(document.querySelectorAll('.nav-btn[data-scroll-to]'));
  const scrollTriggers = Array.from(document.querySelectorAll('[data-scroll-to]'));

  // 4-Program "IQTIDORT" & ZUKKO Facade Overlay Elements
  const fourProgramsOverlay = document.getElementById('zukko-four-programs-overlay');
  const cardIqtidort = document.getElementById('pillar-card-iqtidort');
  const cardIelts = document.getElementById('pillar-card-ielts');
  const cardIt = document.getElementById('pillar-card-it');
  const cardScience = document.getElementById('pillar-card-science');

  const hudLine1 = document.getElementById('hud-line-1');
  const hudLine2 = document.getElementById('hud-line-2');
  const hudLine3 = document.getElementById('hud-line-3');
  const hudLine4 = document.getElementById('hud-line-4');

  const poly1 = document.getElementById('poly-1');
  const poly2 = document.getElementById('poly-2');
  const poly3 = document.getElementById('poly-3');
  const poly4 = document.getElementById('poly-4');

  const ring1 = document.getElementById('target-ring-1');
  const ring2 = document.getElementById('target-ring-2');
  const ring3 = document.getElementById('target-ring-3');
  const ring4 = document.getElementById('target-ring-4');

  const dot1 = document.getElementById('target-dot-1');
  const dot2 = document.getElementById('target-dot-2');
  const dot3 = document.getElementById('target-dot-3');
  const dot4 = document.getElementById('target-dot-4');

  // GPU Decoded Frame Storage
  const frames = new Array(TOTAL_FRAMES).fill(null);
  const frameLoading = new Array(TOTAL_FRAMES).fill(false);

  // Scroll & Animation State
  let targetProgress = 0;
  let smoothProgress = 0;
  let lastRenderedFrameIdx = -1;
  let hoveredPillarCard = null;

  const pad3 = (n) => String(n).padStart(3, '0');
  const frameUrl = (idx) => `assets/frames/f_${pad3(idx)}.webp${CACHE_BUST}`;
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  // Initial Royal Sapphire Fill (never black!)
  ctx.fillStyle = '#091e3a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  /**
   * Decode a single WebP frame into GPU-ready ImageBitmap
   */
  async function loadSingleFrame(idx) {
    if (idx < 0 || idx >= TOTAL_FRAMES || frames[idx] || frameLoading[idx]) {
      return frames[idx];
    }
    frameLoading[idx] = true;

    try {
      const response = await fetch(frameUrl(idx), { cache: 'force-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();

      if (window.createImageBitmap) {
        const bitmap = await createImageBitmap(blob, {
          premultiplyAlpha: 'none',
          colorSpaceConversion: 'default'
        });
        frames[idx] = bitmap;
      } else {
        const img = new Image();
        img.decoding = 'async';
        const objUrl = URL.createObjectURL(blob);
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = objUrl;
        });
        frames[idx] = img;
      }

      if (idx === 0 || lastRenderedFrameIdx === -1) {
        renderCanvasAtProgress(smoothProgress, true);
      }
      return frames[idx];
    } catch (err) {
      const fallbackImg = new Image();
      fallbackImg.decoding = 'async';
      fallbackImg.src = frameUrl(idx);
      await new Promise((res) => {
        fallbackImg.onload = res;
        fallbackImg.onerror = res;
      });
      if (fallbackImg.complete && fallbackImg.naturalWidth > 0) {
        frames[idx] = fallbackImg;
      }
      return frames[idx];
    } finally {
      frameLoading[idx] = false;
    }
  }

  /**
   * Progressive High-Speed Frame Preloader:
   * 1) Frame 0 immediately for instant opening
   * 2) Every 8th keyframe for instant full-page scrubbing
   * 3) All remaining 300 frames in parallel batches
   */
  async function preloadAllFrames() {
    await loadSingleFrame(0);
    renderCanvasAtProgress(getScrollProgress(), true);

    const keyIndices = [];
    for (let i = 0; i < TOTAL_FRAMES; i += 8) {
      if (!frames[i]) keyIndices.push(i);
    }
    if (!frames[TOTAL_FRAMES - 1]) keyIndices.push(TOTAL_FRAMES - 1);

    const keyConcurrency = 8;
    let kPtr = 0;
    async function keyWorker() {
      while (kPtr < keyIndices.length) {
        const idx = keyIndices[kPtr++];
        await loadSingleFrame(idx);
      }
    }
    await Promise.all(Array.from({ length: keyConcurrency }, () => keyWorker()));
    renderCanvasAtProgress(smoothProgress, true);

    const fullQueue = [];
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      if (!frames[i]) fullQueue.push(i);
    }

    const fullConcurrency = 10;
    let fPtr = 0;
    async function fullWorker() {
      while (fPtr < fullQueue.length) {
        const idx = fullQueue[fPtr++];
        await loadSingleFrame(idx);
      }
    }
    await Promise.all(Array.from({ length: fullConcurrency }, () => fullWorker()));
    renderCanvasAtProgress(smoothProgress, true);
  }

  /**
   * Find closest loaded frame to index
   */
  function getClosestLoadedFrameIndex(targetIdx) {
    const idx = clamp(Math.round(targetIdx), 0, TOTAL_FRAMES - 1);
    if (frames[idx]) return idx;
    for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
      if (idx - offset >= 0 && frames[idx - offset]) return idx - offset;
      if (idx + offset < TOTAL_FRAMES && frames[idx + offset]) return idx + offset;
    }
    return -1;
  }

  /**
   * Render a single crystal-clear frame on the canvas (zero alpha blending / zero ghosting)
   */
  function renderCanvasAtProgress(progress, force = false) {
    const exactFrame = clamp(progress, 0, 1) * (TOTAL_FRAMES - 1);
    const frameIdx = getClosestLoadedFrameIndex(exactFrame);
    if (frameIdx === -1) return;

    if (!force && frameIdx === lastRenderedFrameIdx) return;
    const img = frames[frameIdx];
    if (!img) return;

    ctx.globalAlpha = 1.0;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    lastRenderedFrameIdx = frameIdx;
  }

  /**
   * Convert viewport (clientX, clientY) coordinates into 1920x1080 SVG xMidYMid slice space
   */
  function clientToSvgCoords(clientX, clientY) {
    const vw = window.innerWidth || 1920;
    const vh = window.innerHeight || 1080;
    const scale = Math.max(vw / 1920, vh / 1080);
    const renderedW = 1920 * scale;
    const renderedH = 1080 * scale;
    const offsetX = (vw - renderedW) * 0.5;
    const offsetY = (vh - renderedH) * 0.5;
    return {
      x: (clientX - offsetX) / scale,
      y: (clientY - offsetY) / scale
    };
  }

  /**
   * Update SVG HUD connectors between the 4 "IQTIDORT" & ZUKKO Program cards and the building facade
   * Active between scroll 41.5% and 56.5% (frames f_124 to f_169)
   */
  function updateFourProgramConnectors(p) {
    // Normalize progress within the facade zoom zone (0.415 -> 0.565)
    const t = clamp((p - 0.415) / (0.565 - 0.415), 0, 1);

    // Building facade target coordinates in 1920x1080 space as drone zooms toward "IQTIDORT"
    // Target 1: ZUKKO Roof Emblem & Upper Center
    const t1 = {
      x: Math.round(950 - t * 10),
      y: Math.round(185 - t * 85)
    };
    // Target 2: Right Wing Smart Classrooms
    const t2 = {
      x: Math.round(1340 + t * 55),
      y: Math.round(330 - t * 35)
    };
    // Target 3: "IQTIDORT" Golden Entrance Sign
    const t3 = {
      x: Math.round(955),
      y: Math.round(510 - t * 230)
    };
    // Target 4: Science & IT Lower Wing
    const t4 = {
      x: Math.round(1310 + t * 65),
      y: Math.round(575 - t * 40)
    };

    const setTarget = (ring, dot, pt) => {
      if (ring) {
        ring.setAttribute('cx', pt.x);
        ring.setAttribute('cy', pt.y);
      }
      if (dot) {
        dot.setAttribute('cx', pt.x);
        dot.setAttribute('cy', pt.y);
      }
    };

    setTarget(ring1, dot1, t1);
    setTarget(ring2, dot2, t2);
    setTarget(ring3, dot3, t3);
    setTarget(ring4, dot4, t4);

    if (cardIqtidort && poly1) {
      const r = cardIqtidort.getBoundingClientRect();
      const start = clientToSvgCoords(r.right - 4, r.top + r.height * 0.44);
      const elbowX = Math.round(start.x + (t1.x - start.x) * 0.34);
      poly1.setAttribute('points', `${Math.round(start.x)},${Math.round(start.y)} ${elbowX},${Math.round(start.y)} ${t1.x},${t1.y}`);
    }

    if (cardIelts && poly2) {
      const r = cardIelts.getBoundingClientRect();
      const start = clientToSvgCoords(r.left + 4, r.top + r.height * 0.44);
      const elbowX = Math.round(start.x - (start.x - t2.x) * 0.34);
      poly2.setAttribute('points', `${Math.round(start.x)},${Math.round(start.y)} ${elbowX},${Math.round(start.y)} ${t2.x},${t2.y}`);
    }

    if (cardIt && poly3) {
      const r = cardIt.getBoundingClientRect();
      const start = clientToSvgCoords(r.right - 4, r.top + r.height * 0.42);
      const elbowX = Math.round(start.x + (t3.x - start.x) * 0.34);
      poly3.setAttribute('points', `${Math.round(start.x)},${Math.round(start.y)} ${elbowX},${Math.round(start.y)} ${t3.x},${t3.y}`);
    }

    if (cardScience && poly4) {
      const r = cardScience.getBoundingClientRect();
      const start = clientToSvgCoords(r.left + 4, r.top + r.height * 0.42);
      const elbowX = Math.round(start.x - (start.x - t4.x) * 0.34);
      poly4.setAttribute('points', `${Math.round(start.x)},${Math.round(start.y)} ${elbowX},${Math.round(start.y)} ${t4.x},${t4.y}`);
    }
  }

  /**
   * Read normalized scroll progress [0..1]
   */
  function getScrollProgress() {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    return clamp(window.scrollY / maxScroll, 0, 1);
  }

  /**
   * Update Navigation Bar, Top Laser Bar & 4-Program Overlay State
   */
  function updateUIForProgress(p) {
    if (topScrollLaser) {
      topScrollLaser.style.width = `${(p * 100).toFixed(1)}%`;
    }

    // Show 4-Program Overlay strictly in the dedicated runway (41.5% to 56.5%)
    const inProgramsZone = p >= 0.415 && p <= 0.565;
    if (fourProgramsOverlay) {
      fourProgramsOverlay.classList.toggle('visible', inProgramsZone);
    }

    if (inProgramsZone) {
      updateFourProgramConnectors(p);

      const allCards = [cardIqtidort, cardIelts, cardIt, cardScience];
      const allLines = [hudLine1, hudLine2, hudLine3, hudLine4];
      allCards.forEach((c) => c && c.classList.remove('focused'));
      allLines.forEach((l) => l && l.classList.remove('highlighted'));

      if (hoveredPillarCard) {
        hoveredPillarCard.classList.add('focused');
      } else if (p >= 0.445 && p < 0.475) {
        cardIqtidort && cardIqtidort.classList.add('focused');
        hudLine1 && hudLine1.classList.add('highlighted');
      } else if (p >= 0.475 && p < 0.505) {
        cardIelts && cardIelts.classList.add('focused');
        hudLine2 && hudLine2.classList.add('highlighted');
      } else if (p >= 0.505 && p < 0.535) {
        cardIt && cardIt.classList.add('focused');
        hudLine3 && hudLine3.classList.add('highlighted');
      } else if (p >= 0.535 && p <= 0.565) {
        cardScience && cardScience.classList.add('focused');
        hudLine4 && hudLine4.classList.add('highlighted');
      }
    }

    // Highlight active top navigation button
    let activeNavIdx = 0;
    if (p < 0.14) activeNavIdx = 0;        // Markaz (Hero)
    else if (p < 0.40) activeNavIdx = 1;   // 360° Kampus
    else if (p < 0.57) activeNavIdx = 2;   // "IQTIDORT" & Yo'nalishlar
    else if (p < 0.71) activeNavIdx = 3;   // Smart Turniket & ERP
    else if (p < 0.82) activeNavIdx = 4;   // Grant Kalkulyator
    else if (p < 0.92) activeNavIdx = 5;   // Natijalar
    else activeNavIdx = 6;                 // Bog'lanish

    navButtons.forEach((btn, i) => {
      btn.classList.toggle('active', i === activeNavIdx);
    });
  }

  /**
   * Main 120FPS RequestAnimationFrame Loop
   */
  function tick() {
    targetProgress = getScrollProgress();
    const diff = targetProgress - smoothProgress;

    if (Math.abs(diff) > 0.00008) {
      smoothProgress += diff * 0.24;
      renderCanvasAtProgress(smoothProgress, false);
      updateUIForProgress(smoothProgress);
    } else if (Math.abs(diff) > 0) {
      smoothProgress = targetProgress;
      renderCanvasAtProgress(smoothProgress, false);
      updateUIForProgress(smoothProgress);
    }

    requestAnimationFrame(tick);
  }

  // Hover listeners for the 4 Program cards
  [cardIqtidort, cardIelts, cardIt, cardScience].forEach((card) => {
    if (!card) return;
    card.addEventListener('mouseenter', () => {
      hoveredPillarCard = card;
      updateUIForProgress(smoothProgress);
    });
    card.addEventListener('mouseleave', () => {
      hoveredPillarCard = null;
      updateUIForProgress(smoothProgress);
    });
  });

  // Smooth Scroll Navigation Triggers
  scrollTriggers.forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const ratio = parseFloat(el.getAttribute('data-scroll-to'));
      if (Number.isNaN(ratio)) return;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo({
        top: ratio * maxScroll,
        behavior: 'smooth'
      });
    });
  });

  // =========================================================================
  // INTERACTIVE COURSE EXPLORER TABS
  // =========================================================================
  const COURSE_DATA = {
    ielts: {
      title: 'IELTS 7.5–8.5+ & SAT 1560+ Intensive',
      badge: 'HAFTASIGA 6 KUN • +SUPPORT USTOZ',
      badgeClass: 'pillar-badge badge-cyan',
      desc: 'Xalqaro CELTA sertifikatli va IELTS 8.5 natijaga ega mentorlar bilan General English’dan Academic IELTS va SAT Math/Verbal bosqichigacha tizimli tayyorlov. Har yakshanba bepul CD-IELTS Mock imtihoni!',
      duration: '3 – 6 Oy (Bosqichma-bosqich)',
      size: '12–14 nafar o‘quvchi (Smart Xona)',
      guarantee: 'Shartnoma asosida +1.5–2.0 Band o‘sish'
    },
    iqtidort: {
      title: '"IQTIDORT" Olimpiada & Prezident Maktablari',
      badge: '100% GRANT VA OYLIK STIPENDIYA',
      badgeClass: 'pillar-badge badge-gold',
      desc: 'Binoning asosiy kirish qismidagi "IQTIDORT" maxsus akademiyasi — Prezident, Al-Xorazmiy va ixtisoslashgan maktablarga hamda xalqaro Matematika, Fizika va Kimyo olimpiadalariga elita tayyorlov dasturi.',
      duration: '4 – 8 Oy (Chuqurlashtirilgan)',
      size: '10–12 nafar saralangan o‘quvchi',
      guarantee: '98% Kirish ko‘rsatkichi va "IQTIDORT" Granti'
    },
    it: {
      title: 'ZUKKO IT, AI & Full-Stack Dasturlash',
      badge: 'AMALIY PORTFOLIO • ZUKKO LAB',
      badgeClass: 'pillar-badge badge-purple',
      desc: '"Ilm — Kuchda, Zukko Avlod" zamonaviy noutbukli laboratoriyalarida Python, JavaScript, React, Next.js, Node.js, Sun’iy Intellekt (AI Prompting) va 3D/Grafik dizaynni real loyihalar orqali o‘rganing.',
      duration: '4 – 6 Oy (Real Startap Loyihalar)',
      size: '12 nafar o‘quvchi (Shaxsiy Noutbuk bilan)',
      guarantee: 'Tayyor GitHub Portfolio va IT-Sertifikat'
    },
    dtm: {
      title: 'Milliy Sertifikat A+ va DTM Maksimal Ball',
      badge: '189.0 BALL • MUDDATIDAN OLDIN TALABA',
      badgeClass: 'pillar-badge badge-emerald',
      desc: 'Matematika, Fizika, Kimyo, Biologiya, Tarix va Ona tili fanlaridan Milliy Sertifikat (A/A+ daraja) olib, yozgi kirish imtihonlariga qadar 100% maksimal ballni naqd qiling!',
      duration: '3 – 7 Oy (Har yakshanba DTM Diagnostika)',
      size: '12–15 nafar o‘quvchi + Support Ustoz',
      guarantee: 'Milliy Sertifikat A / A+ Natija Kafolati'
    }
  };

  const courseTabBtns = Array.from(document.querySelectorAll('.ctab-btn[data-course]'));
  const ctabDisplay = document.getElementById('course-tab-display');
  const ctabTitle = document.getElementById('ctab-title');
  const ctabBadge = document.getElementById('ctab-badge');
  const ctabDesc = document.getElementById('ctab-desc');
  const ctabDuration = document.getElementById('ctab-duration');
  const ctabSize = document.getElementById('ctab-size');
  const ctabGuarantee = document.getElementById('ctab-guarantee');

  courseTabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-course');
      const data = COURSE_DATA[key];
      if (!data) return;

      courseTabBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const updateContent = () => {
        if (ctabTitle) ctabTitle.textContent = data.title;
        if (ctabBadge) {
          ctabBadge.textContent = data.badge;
          ctabBadge.className = data.badgeClass;
        }
        if (ctabDesc) ctabDesc.textContent = data.desc;
        if (ctabDuration) ctabDuration.textContent = data.duration;
        if (ctabSize) ctabSize.textContent = data.size;
        if (ctabGuarantee) ctabGuarantee.textContent = data.guarantee;
      };

      if (window.gsap && ctabDisplay) {
        window.gsap.fromTo(
          ctabDisplay,
          { opacity: 0.35, y: 6 },
          { opacity: 1, y: 0, duration: 0.28, ease: 'power2.out', onStart: updateContent }
        );
      } else {
        updateContent();
      }
    });
  });

  // =========================================================================
  // INTERACTIVE "IQTIDORT" GRANT & STIPENDIYA CALCULATOR
  // =========================================================================
  const grantSlider = document.getElementById('grant-score-slider');
  const grantScoreVal = document.getElementById('grant-score-val');
  const grantTierName = document.getElementById('grant-tier-name');
  const grantDiscountVal = document.getElementById('grant-discount-val');
  const claimGrantBtn = document.getElementById('claim-grant-btn');

  function updateGrantCalculator(score) {
    const s = Number(score);
    if (grantScoreVal) grantScoreVal.textContent = `${s} / 100 Ball`;

    let tier = '';
    let discount = '';

    if (s >= 95) {
      tier = 'IQTIDORT PLATINUM GRANTI';
      discount = '100% BEPUL O‘QISH + Stipendiya + 500 Coin';
    } else if (s >= 85) {
      tier = 'IQTIDORT GOLD GRANTI';
      discount = '50% CHEGIRMA + 250 Zukko Coin';
    } else if (s >= 75) {
      tier = 'IQTIDORT SILVER GRANTI';
      discount = '30% CHEGIRMA + 150 Zukko Coin';
    } else if (s >= 60) {
      tier = 'ZUKKO START GRANTI';
      discount = '15% CHEGIRMA + 100 Zukko Coin';
    } else {
      tier = 'BAZAVIY QABUL + SUPPORT';
      discount = 'Bepul 2-Ustoz (Support) + 50 Zukko Coin';
    }

    if (grantTierName) grantTierName.textContent = tier;
    if (grantDiscountVal) grantDiscountVal.textContent = discount;
  }

  if (grantSlider) {
    grantSlider.addEventListener('input', (e) => {
      updateGrantCalculator(e.target.value);
    });
    updateGrantCalculator(grantSlider.value);
  }

  // =========================================================================
  // ENROLLMENT MODAL, CONFETTI CELEBRATION & COPY-TO-CLIPBOARD
  // =========================================================================
  const enrollModal = document.getElementById('enroll-modal');
  const openModalBtn = document.getElementById('open-enroll-modal-btn');
  const heroEnrollBtn = document.getElementById('hero-enroll-btn');
  const closeModalBtn = document.getElementById('close-enroll-modal-btn');

  function openEnrollModal() {
    if (!enrollModal) return;
    enrollModal.classList.add('open');
    enrollModal.setAttribute('aria-hidden', 'false');
  }

  function closeEnrollModal() {
    if (!enrollModal) return;
    enrollModal.classList.remove('open');
    enrollModal.setAttribute('aria-hidden', 'true');
  }

  if (openModalBtn) openModalBtn.addEventListener('click', openEnrollModal);
  if (heroEnrollBtn) heroEnrollBtn.addEventListener('click', openEnrollModal);
  if (claimGrantBtn) {
    claimGrantBtn.addEventListener('click', () => {
      openEnrollModal();
      fireZukkoConfetti();
    });
  }
  if (closeModalBtn) closeModalBtn.addEventListener('click', closeEnrollModal);
  if (enrollModal) {
    enrollModal.addEventListener('click', (e) => {
      if (e.target === enrollModal) closeEnrollModal();
    });
  }

  function fireZukkoConfetti() {
    if (typeof window.confetti === 'function') {
      window.confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#00f2fe', '#fde047', '#c084fc', '#34d399']
      });
    }
  }

  const inlineForm = document.getElementById('inline-enroll-form');
  const inlineStatus = document.getElementById('inline-form-status');
  if (inlineForm) {
    inlineForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('enroll-name')?.value || 'Hurmatli o‘quvchi';
      const course = document.getElementById('enroll-course')?.value || 'ZUKKO kursi';
      if (inlineStatus) {
        inlineStatus.textContent = `Tabriklaymiz, ${name}! "${course}" bo‘yicha arizangiz qabul qilindi. Tez orada bog‘lanamiz!`;
      }
      fireZukkoConfetti();
      inlineForm.reset();
    });
  }

  const modalForm = document.getElementById('modal-enroll-form');
  const modalStatus = document.getElementById('modal-form-status');
  if (modalForm) {
    modalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('modal-name')?.value || 'Hurmatli o‘quvchi';
      if (modalStatus) {
        modalStatus.textContent = `Rahmat, ${name}! Arizangiz "IQTIDORT" qabul komissiyasiga yuborildi!`;
      }
      fireZukkoConfetti();
      setTimeout(() => {
        closeEnrollModal();
        if (modalStatus) modalStatus.textContent = '';
        modalForm.reset();
      }, 2200);
    });
  }

  // Copy-to-clipboard buttons for Phone Numbers & Gmails
  document.querySelectorAll('.copy-btn[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const value = btn.getAttribute('data-copy');
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        const orig = btn.textContent;
        btn.textContent = 'Nusxalandi ✓';
        setTimeout(() => {
          btn.textContent = orig;
        }, 1600);
      } catch (_) {
        btn.textContent = 'Nusxalandi ✓';
      }
    });
  });

  // Resize Handler
  window.addEventListener('resize', () => {
    updateUIForProgress(smoothProgress);
    renderCanvasAtProgress(smoothProgress, true);
  }, { passive: true });

  // Initialize External Libraries (Lucide Icons & Vanilla-Tilt) once DOM/scripts load
  function initLibraries() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
    if (window.VanillaTilt) {
      const tiltNodes = document.querySelectorAll('[data-tilt]');
      window.VanillaTilt.init(Array.from(tiltNodes), {
        max: 4,
        speed: 400,
        glare: true,
        'max-glare': 0.14
      });
    }
  }

  window.addEventListener('load', initLibraries);
  initLibraries();

  // Start Preloading & 120FPS Engine
  preloadAllFrames();
  updateUIForProgress(getScrollProgress());
  requestAnimationFrame(tick);
})();
