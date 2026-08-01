/**
 * Love Meter ❤️ — Particles & background effects.
 *
 * Floating hearts, sparkle stars, glowing orbs, heart trail, custom cursor.
 */

/** Initialize floating hearts, stars, and glowing orbs. */
export function initParticles() {
  const layer = document.getElementById('particles-layer');
  if (!layer) return;

  // Floating hearts
  const heartChars = ['💗', '💖', '💘', '💞', '💕', '❤️', '✨', '💫', '🌟'];
  for (let i = 0; i < 20; i++) {
    const el = document.createElement('div');
    el.className = 'heart-particle';
    el.textContent = heartChars[Math.floor(Math.random() * heartChars.length)];
    el.style.cssText = `
      position: absolute;
      bottom: -40px;
      left: ${Math.random() * 100}vw;
      font-size: ${12 + Math.random() * 18}px;
      opacity: 0.4;
      animation: floatUp ${10 + Math.random() * 16}s linear infinite;
      animation-delay: ${Math.random() * 12}s;
      filter: drop-shadow(0 0 6px rgba(255, 47, 135, 0.4));
      pointer-events: none;
    `;
    layer.appendChild(el);
  }

  // Sparkle stars
  for (let i = 0; i < 30; i++) {
    const star = document.createElement('div');
    star.className = 'star-particle';
    const size = 1 + Math.random() * 3;
    star.style.cssText = `
      position: absolute;
      top: ${Math.random() * 100}vh;
      left: ${Math.random() * 100}vw;
      width: ${size}px;
      height: ${size}px;
      background: #fff;
      border-radius: 50%;
      opacity: ${0.2 + Math.random() * 0.5};
      animation: twinkle ${2 + Math.random() * 4}s ease-in-out infinite alternate;
      animation-delay: ${Math.random() * 3}s;
      pointer-events: none;
    `;
    layer.appendChild(star);
  }

  // Glowing orbs
  for (let i = 0; i < 5; i++) {
    const orb = document.createElement('div');
    orb.className = 'glow-orb';
    const colors = ['rgba(255, 47, 135, 0.08)', 'rgba(124, 58, 255, 0.08)', 'rgba(41, 255, 198, 0.06)'];
    const size = 60 + Math.random() * 120;
    orb.style.cssText = `
      position: absolute;
      top: ${Math.random() * 100}vh;
      left: ${Math.random() * 100}vw;
      width: ${size}px;
      height: ${size}px;
      background: ${colors[i % colors.length]};
      border-radius: 50%;
      filter: blur(40px);
      animation: orbFloat ${15 + Math.random() * 10}s ease-in-out infinite alternate;
      animation-delay: ${Math.random() * 5}s;
      pointer-events: none;
    `;
    layer.appendChild(orb);
  }
}

/** Heart trail effect following the mouse cursor. */
export function initHeartTrail() {
  let lastTime = 0;

  document.addEventListener('mousemove', (e) => {
    const now = Date.now();
    if (now - lastTime < 80) return;
    lastTime = now;

    const trail = document.createElement('div');
    trail.className = 'heart-trail';
    const hearts = ['❤️', '💗', '💖', '💘', '💕', '✨'];
    trail.textContent = hearts[Math.floor(Math.random() * hearts.length)];
    trail.style.left = `${e.clientX}px`;
    trail.style.top = `${e.clientY}px`;
    document.body.appendChild(trail);
    setTimeout(() => trail.remove(), 1500);
  });
}

/** Custom cursor with smooth follow. */
export function initCustomCursor() {
  const cursor = document.createElement('div');
  cursor.id = 'custom-cursor';
  document.body.appendChild(cursor);

  let mouseX = 0, mouseY = 0;
  let cursorX = 0, cursorY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function animate() {
    cursorX += (mouseX - cursorX) * 0.15;
    cursorY += (mouseY - cursorY) * 0.15;
    cursor.style.left = `${cursorX}px`;
    cursor.style.top = `${cursorY}px`;
    requestAnimationFrame(animate);
  }
  animate();

  document.querySelectorAll('button, a, input, select').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.style.width = '30px';
      cursor.style.height = '30px';
      cursor.style.background = 'radial-gradient(circle, rgba(255, 47, 135, 0.4), transparent)';
    });
    el.addEventListener('mouseleave', () => {
      cursor.style.width = '20px';
      cursor.style.height = '20px';
      cursor.style.background = 'radial-gradient(circle, rgba(255, 47, 135, 0.3), transparent)';
    });
  });
}

/** Inject particle keyframe styles. */
export function injectParticleStyles() {
  if (document.getElementById('particle-styles')) return;
  const style = document.createElement('style');
  style.id = 'particle-styles';
  style.textContent = `
    @keyframes floatUp {
      0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
      10% { opacity: 0.5; }
      90% { opacity: 0.3; }
      100% { transform: translateY(-110vh) translateX(20px) rotate(25deg); opacity: 0; }
    }
    @keyframes twinkle {
      0% { opacity: 0.2; transform: scale(0.8); }
      100% { opacity: 0.8; transform: scale(1.2); }
    }
    @keyframes orbFloat {
      0% { transform: translate(0, 0) scale(1); }
      100% { transform: translate(30px, -20px) scale(1.1); }
    }
  `;
  document.head.appendChild(style);
}
