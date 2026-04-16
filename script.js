/* ═══════════════════════════════════════════════════════════════
   SLAP TRUMP — Canvas Game Engine
   Physics · Audio · Damage · Combos · Speech · Rage
   ═══════════════════════════════════════════════════════════════ */

// ───────────────────────────────────────
// CONFIGURATION
// ───────────────────────────────────────

const CW = 500;  // canvas internal width
const CH = 620;  // canvas internal height
const FACE_CX = 250;
const FACE_CY = 250;

const EQUIPMENT = {
    hand:    { name: 'Hand',    emoji: '✋', damage: 15, force: 1.0, freq: 2200, noiseLen: 0.08 },
    chappal: { name: 'Chappal', emoji: '🩴', damage: 25, force: 1.4, freq: 1600, noiseLen: 0.12 },
    boxing:  { name: 'Boxing',  emoji: '🥊', damage: 40, force: 2.0, freq: 800,  noiseLen: 0.15 },
    hammer:  { name: 'Hammer',  emoji: '🔨', damage: 60, force: 2.8, freq: 400,  noiseLen: 0.20 },
    broom:   { name: 'Broom',   emoji: '🧹', damage: 30, force: 1.6, freq: 1200, noiseLen: 0.10 }
};

const PHASE_QUOTES = {
    // Phase 0: Smiling — arrogant, taunting
    smile: [
        "Is that all you've got?!",
        "FAKE slap! Didn't feel a thing!",
        "I've had bigger hits from Melania!",
        "Pathetic! Try harder!",
        "You hit like a Democrat!",
        "Nobody can hurt THIS face!",
        "I'm built DIFFERENT!",
        "My face is TREMENDOUS!",
        "You're FIRED... at hitting!",
        "Weak! Very weak!"
    ],
    // Phase 1: Angry — threatening, in pain
    angry: [
        "OW! Tremendous pain!",
        "I'll tariff your WHOLE family!",
        "That's the biggest slap EVER!",
        "WRONG! OW! WRONG!",
        "NOT THE HAIR!!!",
        "This is a WITCH SLAP!",
        "I will build a WALL around my face!",
        "The media won't report this!",
        "Believe me, that HURT!",
        "I have the best bruises!",
        "Make my face great again!"
    ],
    // Phase 2: Crying — sobbing, breaking down
    crying: [
        "*sobbing* Please stop...",
        "I'm crying! Are you happy?!",
        "My beautiful face!! 😭",
        "My eyes are leaking... BIGLY!",
        "These are MANLY tears!",
        "I'm not crying, YOU'RE crying!",
        "WHY?! What did I do?!",
        "*wailing* NOOOOOO!",
        "My face... it's DESTROYED!",
        "SAD! Very sad! 😭"
    ],
    // Phase 3: Begging — desperate, pleading
    begging: [
        "*sniff* ...I want my mommy",
        "PLEASE! I'll do anything!",
        "I'll cancel ALL the tariffs!",
        "I SURRENDER! Please stop!",
        "I'm SORRY! Is that what you want?!",
        "You WIN! You WIN! STOP!",
        "I'll resign! JUST STOP!",
        "Have MERCY! 🙏",
        "I can't take anymore...",
        "You've broken me... completely..."
    ]
};

const MILESTONES = [
    { hits: 5,   text: "💥 HE FELT THAT!",         victory: false },
    { hits: 15,  text: "😤 HIS FACE IS TURNING RED!", victory: false },
    { hits: 25,  text: "😭 HE'S CRYING!",           victory: false },
    { hits: 40,  text: "🤕 FACE IS WRECKED!",       victory: false },
    { hits: 60,  text: "💀 FACE COMPLETELY DESTROYED!", victory: false },
    { hits: 80,  text: "👑 TOTAL DOMINATION!",       victory: false },
    { hits: 100, text: "🏆 YOU WON!",               victory: true  }
];

// ───────────────────────────────────────
// GAME STATE
// ───────────────────────────────────────

const state = {
    equipment: 'hand',
    isSlapping: false,
    mouseX: 0,
    mouseY: 0,

    // Physics (spring-damper)
    physics: {
        x: 0, y: 0,          // displacement
        vx: 0, vy: 0,        // velocity
        rot: 0,               // rotation (radians)
        vr: 0,                // angular velocity
        stiffness: 320,
        damping: 14,
        rotStiffness: 250,
        rotDamping: 11
    },

    // Damage visuals
    damage: {
        redness: 0,           // 0-1
        bruises: [],          // { x, y, radius, opacity, age }
        marks: [],            // { x, y, opacity, age }
        swelling: 0
    },


    // Stats
    sessionSlaps: 0,

    // Speech bubble
    speechText: '',
    speechTimer: 0,

    // Stars (dizzy effect)
    starsAngle: 0,

    // Tears
    tears: [],             // { x, y, vy, size, opacity }
    tearIntensity: 0,      // 0-1 how much crying

    // Milestones
    lastMilestone: 0       // last milestone hit count triggered
};

// ───────────────────────────────────────
// DOM ELEMENTS
// ───────────────────────────────────────

const $ = (id) => document.getElementById(id);
const app = $('app');
const canvas = $('faceCanvas');
const ctx = canvas.getContext('2d');
const canvasContainer = $('canvasContainer');
const handCursor = $('handCursor');
const speechBubble = $('speechBubble');
const equipmentFly = $('equipmentFly');
const milestoneDisplay = $('milestoneDisplay');
const resetBtn = $('resetBtn');
const screenFlash = $('screenFlash');
const equipButtons = document.querySelectorAll('.equip-btn');
const arena = $('arena');

// ───────────────────────────────────────
// CANVAS SETUP
// ───────────────────────────────────────

canvas.width = CW;
canvas.height = CH;

// ───────────────────────────────────────
// AUDIO ENGINE
// ───────────────────────────────────────

let audioCtx = null;

function initAudio() {
    if (audioCtx) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { /* silent fail */ }
}

function playSlap(type, force) {
    if (!audioCtx) return;
    const eq = EQUIPMENT[type];
    const now = audioCtx.currentTime;

    // 1. Noise burst (the "slap" crack)
    const noiseDuration = eq.noiseLen * (0.8 + Math.random() * 0.4);
    const sampleRate = audioCtx.sampleRate;
    const bufferSize = Math.floor(sampleRate * noiseDuration);
    const buffer = audioCtx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        const envelope = Math.exp(-t * 25);
        data[i] = (Math.random() * 2 - 1) * envelope;
    }
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = eq.freq * (0.85 + Math.random() * 0.3);
    filter.Q.value = 1.5;

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(Math.min(force * 0.4, 1.0), now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDuration);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);
    noiseSource.start(now);

    // 2. Low thud
    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90 + Math.random() * 30, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);
    oscGain.gain.setValueAtTime(Math.min(force * 0.25, 0.6), now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(oscGain);
    oscGain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.2);

    // 3. Mid-range impact body
    const osc2 = audioCtx.createOscillator();
    const osc2Gain = audioCtx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(180 + Math.random() * 60, now);
    osc2.frequency.exponentialRampToValueAtTime(60, now + 0.08);
    osc2Gain.gain.setValueAtTime(Math.min(force * 0.15, 0.4), now);
    osc2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc2.connect(osc2Gain);
    osc2Gain.connect(audioCtx.destination);
    osc2.start(now);
    osc2.stop(now + 0.15);
}

// ───────────────────────────────────────
// DRAWING ENGINE — REAL TRUMP PHOTO
// ───────────────────────────────────────

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// Load all 4 Trump face images
const faceImages = {
    smile:   new Image(),
    angry:   new Image(),
    crying:  new Image(),
    begging: new Image()
};
faceImages.smile.src   = './trump-smile.jpg';
faceImages.angry.src   = './trump-angry.png';
faceImages.crying.src  = './trump-cry.png';
faceImages.begging.src = './trump-begging.png';

const imagesLoaded = { smile: false, angry: false, crying: false, begging: false };
faceImages.smile.onload   = () => { imagesLoaded.smile = true; };
faceImages.angry.onload   = () => { imagesLoaded.angry = true; };
faceImages.crying.onload  = () => { imagesLoaded.crying = true; };
faceImages.begging.onload = () => { imagesLoaded.begging = true; };

// Face state phases
const PHASE_SMILE  = 0;  // 0-5 hits: confident, hasn't felt anything
const PHASE_ANGRY  = 1;  // 5-25 hits: angry, starting to hurt
const PHASE_CRYING = 2;  // 25-60 hits: crying, face wrecked
const PHASE_BEGGING = 3; // 60+ hits: begging for mercy

const PHASE_KEYS = ['smile', 'angry', 'crying', 'begging'];

function getCurrentPhase() {
    const s = state.sessionSlaps;
    if (s < 5)  return PHASE_SMILE;
    if (s < 25) return PHASE_ANGRY;
    if (s < 60) return PHASE_CRYING;
    return PHASE_BEGGING;
}

function drawFrame() {
    ctx.clearRect(0, 0, CW, CH);

    // Dark background
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, CW, CH);

    // Background spotlight
    const spotGrad = ctx.createRadialGradient(FACE_CX, FACE_CY, 60, FACE_CX, FACE_CY, 350);
    spotGrad.addColorStop(0, 'rgba(255, 220, 180, 0.08)');
    spotGrad.addColorStop(0.5, 'rgba(255, 180, 120, 0.03)');
    spotGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = spotGrad;
    ctx.fillRect(0, 0, CW, CH);

    ctx.save();

    // Apply physics transform (whole image moves as a unit)
    const px = state.physics.x;
    const py = state.physics.y;
    const pr = state.physics.rot;

    ctx.translate(FACE_CX + px, FACE_CY + py);
    ctx.rotate(pr);
    ctx.translate(-FACE_CX, -FACE_CY);

    // Select which face to draw based on phase
    const phase = getCurrentPhase();
    const key = PHASE_KEYS[phase];
    const img = faceImages[key];
    const loaded = imagesLoaded[key];

    if (loaded) {
        // Draw the image scaled to fill the canvas
        ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, CW, CH);
    } else {
        // Loading placeholder
        ctx.fillStyle = '#222';
        ctx.fillRect(100, 100, 300, 400);
        ctx.fillStyle = '#888';
        ctx.font = '16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Loading...', FACE_CX, FACE_CY);
    }

    // Draw damage overlays ON TOP of the photo
    drawRedOverlay();
    drawBruises();
    drawTears();
    drawDizzyStars();

    ctx.restore();
}

function drawRedOverlay() {
    if (state.damage.redness <= 0) return;

    ctx.save();
    ctx.globalAlpha = state.damage.redness * 0.35;
    ctx.fillStyle = '#ff1100';
    ctx.fillRect(0, 0, CW, CH);
    ctx.restore();
}

function drawBruises() {
    // Dark bruise marks
    for (const bruise of state.damage.bruises) {
        if (bruise.opacity <= 0) continue;
        ctx.save();
        ctx.globalAlpha = bruise.opacity * 0.7;

        const bx = FACE_CX + bruise.x;
        const by = FACE_CY + bruise.y;
        const bruiseGrad = ctx.createRadialGradient(bx, by, 0, bx, by, bruise.radius);
        bruiseGrad.addColorStop(0, 'rgba(80, 15, 50, 0.85)');
        bruiseGrad.addColorStop(0.4, 'rgba(120, 30, 60, 0.5)');
        bruiseGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = bruiseGrad;
        ctx.fillRect(bx - bruise.radius, by - bruise.radius, bruise.radius * 2, bruise.radius * 2);
        ctx.restore();
    }

    // Red slap / finger marks
    for (const mark of state.damage.marks) {
        if (mark.opacity <= 0) continue;
        ctx.save();
        ctx.globalAlpha = mark.opacity * 0.55;
        ctx.fillStyle = '#ff2222';

        const mx = FACE_CX + mark.x;
        const my = FACE_CY + mark.y;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.ellipse(mx + (i - 1.5) * 9, my, 3.5, 16, mark.angle || 0.2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

function drawDizzyStars() {
    if (state.sessionSlaps < 20) return;

    state.starsAngle += 0.03;
    const count = Math.min(Math.floor((state.sessionSlaps - 20) / 8) + 2, 7);
    const radius = 160;

    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < count; i++) {
        const angle = state.starsAngle + (i / count) * Math.PI * 2;
        const sx = FACE_CX + Math.cos(angle) * radius;
        const sy = FACE_CY - 80 + Math.sin(angle) * 30;
        const scale = 0.7 + Math.sin(angle * 2) * 0.3;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.scale(scale, scale);
        ctx.globalAlpha = 0.8 + Math.sin(angle) * 0.2;
        ctx.fillText(i % 3 === 0 ? '⭐' : i % 3 === 1 ? '💫' : '✦', 0, 0);
        ctx.restore();
    }
    ctx.globalAlpha = 1;
}

function drawTears() {
    if (state.tears.length === 0) return;

    for (const tear of state.tears) {
        if (tear.opacity <= 0) continue;
        ctx.save();
        ctx.globalAlpha = tear.opacity;

        const tx = tear.x;
        const ty = tear.y;
        const sz = tear.size;

        // Shiny blue teardrop gradient
        const tearGrad = ctx.createRadialGradient(tx, ty, 0, tx, ty, sz);
        tearGrad.addColorStop(0, 'rgba(120, 180, 255, 0.9)');
        tearGrad.addColorStop(0.5, 'rgba(80, 140, 240, 0.7)');
        tearGrad.addColorStop(1, 'rgba(60, 120, 220, 0.3)');
        ctx.fillStyle = tearGrad;

        // Teardrop shape
        ctx.beginPath();
        ctx.moveTo(tx, ty - sz * 1.5);
        ctx.quadraticCurveTo(tx + sz, ty, tx, ty + sz);
        ctx.quadraticCurveTo(tx - sz, ty, tx, ty - sz * 1.5);
        ctx.closePath();
        ctx.fill();

        // Shine highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.ellipse(tx - sz * 0.2, ty - sz * 0.3, sz * 0.2, sz * 0.15, -0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

function updateTears(dt) {
    // Spawn new tears based on intensity
    if (state.tearIntensity > 0 && Math.random() < state.tearIntensity * 0.3) {
        // Approximate eye positions on the Trump portrait
        const eyeLX = FACE_CX - 45;
        const eyeRX = FACE_CX + 35;
        const eyeY = FACE_CY + 10;

        const side = Math.random() < 0.5 ? eyeLX : eyeRX;
        state.tears.push({
            x: side + (Math.random() - 0.5) * 15,
            y: eyeY + Math.random() * 10,
            vy: 40 + Math.random() * 60,
            size: 3 + Math.random() * 4 + state.tearIntensity * 3,
            opacity: 0.7 + Math.random() * 0.3
        });
    }

    // Update existing tears (fall down with gravity)
    for (let i = state.tears.length - 1; i >= 0; i--) {
        const tear = state.tears[i];
        tear.y += tear.vy * dt;
        tear.vy += 120 * dt;  // gravity
        tear.x += (Math.random() - 0.5) * 1;  // slight wobble

        // Fade as they fall past the chin
        if (tear.y > FACE_CY + 150) {
            tear.opacity -= dt * 2;
        }

        if (tear.opacity <= 0 || tear.y > CH) {
            state.tears.splice(i, 1);
        }
    }

    // Tear intensity slowly decays when not hitting
    state.tearIntensity = Math.max(0, state.tearIntensity - dt * 0.08);
}

// ───────────────────────────────────────
// MILESTONE SYSTEM
// ───────────────────────────────────────

function checkMilestone() {
    for (const ms of MILESTONES) {
        if (state.sessionSlaps === ms.hits && state.lastMilestone < ms.hits) {
            state.lastMilestone = ms.hits;
            showMilestone(ms.text, ms.victory);

            // Big hit milestones trigger max crying
            if (ms.hits >= 25) {
                state.tearIntensity = 1.0;
            }
            break;
        }
    }
}

function showMilestone(text, isVictory) {
    milestoneDisplay.textContent = text;
    milestoneDisplay.classList.remove('visible', 'victory');
    void milestoneDisplay.offsetWidth;  // force reflow
    milestoneDisplay.classList.add('visible');
    if (isVictory) milestoneDisplay.classList.add('victory');

    // Big screen flash for milestones
    doScreenFlash('rgba(255, 209, 102, 0.9)', '0.18', 200);
    doScreenShake(3);
}

// ───────────────────────────────────────
// PHYSICS ENGINE
// ───────────────────────────────────────

function updatePhysics(dt) {
    const p = state.physics;

    // Spring-damper: F = -k*x - c*v
    const fx = -p.stiffness * p.x - p.damping * p.vx;
    const fy = -p.stiffness * p.y - p.damping * p.vy;
    const fr = -p.rotStiffness * p.rot - p.rotDamping * p.vr;

    p.vx += fx * dt;
    p.vy += fy * dt;
    p.vr += fr * dt;

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;

    // Clamp to reasonable bounds
    p.x = clamp(p.x, -80, 80);
    p.y = clamp(p.y, -50, 50);
    p.rot = clamp(p.rot, -0.5, 0.5);
}

function applyImpact(canvasX, canvasY, force) {
    const p = state.physics;
    const dx = FACE_CX - canvasX;
    const dy = FACE_CY - canvasY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    // Impulse: head moves AWAY from click point
    const impulseScale = force * 180;
    p.vx += (dx / dist) * impulseScale;
    p.vy += (dy / dist) * impulseScale * 0.6;

    // Rotation: based on horizontal offset
    p.vr += (dx / dist) * force * 4;
}

// ───────────────────────────────────────
// DAMAGE SYSTEM
// ───────────────────────────────────────

function addDamage(canvasX, canvasY, amount, isCritical) {
    const d = state.damage;

    // Increase redness
    d.redness = clamp(d.redness + amount * 0.0015, 0, 0.85);

    // Add bruise at impact location (face-relative coords)
    const fx = canvasX - FACE_CX;
    const fy = canvasY - FACE_CY;

    if (isCritical || Math.random() < 0.4) {
        d.bruises.push({
            x: fx + (Math.random() - 0.5) * 20,
            y: fy + (Math.random() - 0.5) * 20,
            radius: 12 + Math.random() * 16 + (isCritical ? 8 : 0),
            opacity: 0.8 + Math.random() * 0.2,
            age: 0
        });
    }

    // Add slap mark
    if (Math.random() < 0.3) {
        d.marks.push({
            x: fx + (Math.random() - 0.5) * 15,
            y: fy + (Math.random() - 0.5) * 15,
            opacity: 0.9,
            angle: (Math.random() - 0.5) * 0.5,
            age: 0
        });
    }
}

function updateDamage(dt) {
    const d = state.damage;

    // Redness slowly fades
    d.redness = Math.max(0, d.redness - dt * 0.01);

    // Age and fade bruises
    for (let i = d.bruises.length - 1; i >= 0; i--) {
        d.bruises[i].age += dt;
        if (d.bruises[i].age > 5) {
            d.bruises[i].opacity -= dt * 0.15;
        }
        if (d.bruises[i].opacity <= 0) {
            d.bruises.splice(i, 1);
        }
    }

    // Age and fade marks
    for (let i = d.marks.length - 1; i >= 0; i--) {
        d.marks[i].age += dt;
        if (d.marks[i].age > 2) {
            d.marks[i].opacity -= dt * 0.3;
        }
        if (d.marks[i].opacity <= 0) {
            d.marks.splice(i, 1);
        }
    }
}

// ───────────────────────────────────────
// VISUAL EFFECTS
// ───────────────────────────────────────

function doScreenShake(force) {
    const cls = force > 2 ? 'big-shake' : 'shake';
    app.classList.remove('shake', 'big-shake');
    void app.offsetWidth; // force reflow
    app.classList.add(cls);
    setTimeout(() => app.classList.remove(cls), force > 2 ? 400 : 300);
}

function doCanvasFlash() {
    canvasContainer.classList.add('hit');
    setTimeout(() => canvasContainer.classList.remove('hit'), 200);
}

function doScreenFlash(color, opacity, duration) {
    screenFlash.style.backgroundColor = color;
    screenFlash.style.opacity = opacity;
    setTimeout(() => { screenFlash.style.opacity = '0'; }, duration);
}

function flyEquipment(emoji, targetX, targetY, force, isCritical) {
    const rect = arena.getBoundingClientRect();
    const relX = targetX - rect.left;
    const relY = targetY - rect.top;

    // Random starting edge
    const edge = Math.floor(Math.random() * 4);
    let startX, startY;
    switch (edge) {
        case 0: startX = -100; startY = relY + (Math.random() - 0.5) * 200; break;
        case 1: startX = rect.width + 100; startY = relY + (Math.random() - 0.5) * 200; break;
        case 2: startX = relX + (Math.random() - 0.5) * 200; startY = -100; break;
        default: startX = relX + (Math.random() - 0.5) * 200; startY = rect.height + 100; break;
    }

    const angle = Math.atan2(relY - startY, relX - startX) * 180 / Math.PI;
    const scale = 0.8 + force * 0.2 + (isCritical ? 0.15 : 0);
    const duration = 200;
    const t0 = performance.now();

    equipmentFly.textContent = emoji;
    equipmentFly.style.opacity = '1';

    function frame(now) {
        const t = clamp((now - t0) / duration, 0, 1);
        const e = 1 - Math.pow(1 - t, 3); // ease out cubic
        const x = lerp(startX, relX, e);
        const y = lerp(startY, relY, e);
        const rot = angle + (isCritical ? 25 : 12) * (1 - e);

        equipmentFly.style.left = `${x}px`;
        equipmentFly.style.top = `${y}px`;
        equipmentFly.style.transform = `translate(-50%, -50%) rotate(${rot}deg) scale(${scale})`;

        if (t < 1) {
            requestAnimationFrame(frame);
        } else {
            equipmentFly.style.opacity = '0';
        }
    }

    requestAnimationFrame(frame);
}



// ───────────────────────────────────────
// SPEECH BUBBLE
// ───────────────────────────────────────

function showSpeech() {
    // Show speech bubble ~35% of hits
    if (Math.random() > 0.35) return;

    // Pick quotes based on current emotional phase
    const phase = getCurrentPhase();
    const quotes = PHASE_QUOTES[PHASE_KEYS[phase]];
    const quote = quotes[Math.floor(Math.random() * quotes.length)];

    speechBubble.textContent = quote;
    speechBubble.classList.add('visible');

    clearTimeout(speechBubble._timer);
    speechBubble._timer = setTimeout(() => {
        speechBubble.classList.remove('visible');
    }, 1800);
}

// ───────────────────────────────────────
// MAIN SLAP HANDLER
// ───────────────────────────────────────

function handleSlap(clientX, clientY) {
    if (state.isSlapping) return;
    state.isSlapping = true;

    initAudio();

    const eq = EQUIPMENT[state.equipment];
    const forceVar = 0.8 + Math.random() * 0.4;
    const force = eq.force * forceVar;
    const isCritical = Math.random() < 0.18;
    let damage = Math.round(eq.damage * forceVar);
    if (isCritical) damage = Math.round(damage * 1.6);

    // Convert click to canvas space
    const rect = canvas.getBoundingClientRect();
    const scaleX = CW / rect.width;
    const scaleY = CH / rect.height;
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;

    // Apply effects
    applyImpact(canvasX, canvasY, force);
    addDamage(canvasX, canvasY, damage, isCritical);
    playSlap(state.equipment, force);
    doScreenShake(force);
    doCanvasFlash();
    flyEquipment(eq.emoji, clientX, clientY, force, isCritical);
    showSpeech();

    // Screen flash
    if (isCritical) {
        doScreenFlash('rgba(255, 200, 50, 0.8)', '0.12', 100);
    } else {
        doScreenFlash('rgba(255, 255, 255, 0.9)', '0.06', 60);
    }

    // Cursor slap animation
    handCursor.classList.add('slapping');
    setTimeout(() => handCursor.classList.remove('slapping'), 150);

    // Update stats
    state.sessionSlaps++;

    // Increase tear intensity (crying gets worse with more hits)
    if (state.sessionSlaps >= 10) {
        state.tearIntensity = clamp(state.tearIntensity + 0.08, 0, 1);
    }
    if (isCritical && state.sessionSlaps >= 5) {
        state.tearIntensity = clamp(state.tearIntensity + 0.2, 0, 1);
    }

    // Check milestones
    checkMilestone();

    // Update UI

    setTimeout(() => { state.isSlapping = false; }, 180);
}

// ───────────────────────────────────────
// RESET
// ───────────────────────────────────────

function resetGame() {
    // Reset session state
    state.sessionSlaps = 0;

    // Reset physics
    const p = state.physics;
    p.x = p.y = p.vx = p.vy = p.rot = p.vr = 0;

    // Reset damage
    state.damage.redness = 0;
    state.damage.bruises = [];
    state.damage.marks = [];

    // Reset tears
    state.tears = [];
    state.tearIntensity = 0;
    state.lastMilestone = 0;

    // Reset UI
    speechBubble.classList.remove('visible');
    milestoneDisplay.classList.remove('visible', 'victory');
}

// ───────────────────────────────────────
// EVENT HANDLERS
// ───────────────────────────────────────

function setupEvents() {
    // Mouse
    document.addEventListener('mousemove', (e) => {
        state.mouseX = e.clientX;
        state.mouseY = e.clientY;
        handCursor.style.left = `${e.clientX}px`;
        handCursor.style.top = `${e.clientY}px`;
        handCursor.classList.add('visible');
    });

    // Click on arena to slap
    arena.addEventListener('click', (e) => {
        handleSlap(e.clientX, e.clientY);
    });

    // Touch support
    arena.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        state.mouseX = touch.clientX;
        state.mouseY = touch.clientY;
        handCursor.style.left = `${touch.clientX}px`;
        handCursor.style.top = `${touch.clientY}px`;
        handCursor.classList.add('visible');
    }, { passive: true });

    arena.addEventListener('touchend', (e) => {
        // Don't trigger slap if the touch target is the reset button
        if (e.target === resetBtn || resetBtn.contains(e.target)) return;
        e.preventDefault();
        handleSlap(state.mouseX, state.mouseY);
    });

    // Equipment selection
    equipButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const equip = btn.dataset.equip;
            state.equipment = equip;
            equipButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateCursorEmoji();
        });
    });

    // Reset — click for desktop, touchend for mobile
    resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetGame();
    });

    resetBtn.addEventListener('touchend', (e) => {
        e.stopPropagation();
        e.preventDefault();
        resetGame();
    });

    // Resize
    window.addEventListener('resize', handleResize);
}

function updateCursorEmoji() {
    const eq = EQUIPMENT[state.equipment];
    handCursor.textContent = eq.emoji;
}

function handleResize() {
    // Canvas maintains internal resolution, CSS handles display size
}

// ───────────────────────────────────────
// GAME LOOP
// ───────────────────────────────────────

let lastTime = 0;

function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.033);
    lastTime = timestamp;

    updatePhysics(dt);
    updateDamage(dt);
    updateTears(dt);
    drawFrame();

    requestAnimationFrame(gameLoop);
}

// ───────────────────────────────────────
// INITIALIZATION
// ───────────────────────────────────────

function init() {
    updateCursorEmoji();
    setupEvents();
    requestAnimationFrame(gameLoop);
}

init();
