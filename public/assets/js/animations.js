/**
 * Love Meter ❤️ — Animation effects.
 *
 * Confetti, count-up, meter fill, heartbeat, typing, toast, ripple, image capture.
 */

/**
 * Launch confetti celebration.
 * @param {number} score - Determines how many pieces (50–200).
 */
export function launchConfetti(score = 100) {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#ff2f87', '#7c3aff', '#29ffc6', '#ffd700', '#ff5d8f', '#c0a0ff', '#ff6b9d'];
  const pieces = Math.min(200, 50 + Math.floor(score * 1.5));
  const confetti = [];

  for (let i = 0; i < pieces; i++) {
    confetti.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * -1 - 50,
      w: 4 + Math.random() * 8,
      h: 4 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 4,
      vy: 1 + Math.random() * 4,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
      opacity: 0.8 + Math.random() * 0.2,
    });
  }

  let frame = 0;
  const maxFrames = 180;

  function animate() {
    frame++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    for (const c of confetti) {
      if (c.y > canvas.height + 20) continue;
      alive = true;
      c.x += c.vx;
      c.y += c.vy;
      c.vy += 0.05;
      c.rotation += c.rotSpeed;
      c.vx *= 0.99;

      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate((c.rotation * Math.PI) / 180);
      ctx.globalAlpha = c.opacity * (1 - frame / maxFrames);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      ctx.restore();
    }

    if (alive && frame < maxFrames) requestAnimationFrame(animate);
    else { ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }
  animate();
}

/**
 * Animate a number counting up to a target.
 * @param {HTMLElement} element
 * @param {number} target
 * @param {number} duration - ms
 */
export function animateCountUp(element, target, duration = 1500) {
  if (!element) return;
  const start = performance.now();

  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    element.textContent = Math.round(eased * target) + '%';
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/**
 * Animate the SVG meter ring filling up.
 * @param {HTMLElement} meterElement - The circle element.
 * @param {number} score - 0–100
 */
export function animateMeterFill(meterElement, score, duration = 1600) {
  if (!meterElement) return;
  const circumference = 2 * Math.PI * 100;
  meterElement.style.strokeDasharray = circumference;
  meterElement.style.strokeDashoffset = circumference;

  void meterElement.getBoundingClientRect();

  const offset = circumference - (score / 100) * circumference;
  requestAnimationFrame(() => {
    meterElement.style.transition = `stroke-dashoffset ${duration}ms cubic-bezier(0.16, 0.84, 0.44, 1)`;
    meterElement.style.strokeDashoffset = offset;
  });
}

/**
 * Heartbeat pulse animation on an element.
 * @param {HTMLElement} element
 */
export function heartbeatEffect(element) {
  if (!element) return;
  element.style.animation = 'none';
  void element.offsetHeight;
  element.style.animation = 'heartbeat 1.2s ease-in-out 3';
  setTimeout(() => { element.style.animation = ''; }, 3600);
}

/**
 * Type text character by character.
 * @param {HTMLElement} element
 * @param {string} text
 * @param {number} speed - ms per char
 */
export function typeText(element, text, speed = 50) {
  return new Promise((resolve) => {
    if (!element) { resolve(); return; }
    element.textContent = '';
    let i = 0;
    function type() {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
        setTimeout(type, speed);
      } else {
        resolve();
      }
    }
    type();
  });
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'info'|'success'|'error'} type
 */
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/**
 * Ripple click effect on a button.
 * @param {MouseEvent} e
 */
export function rippleEffect(e) {
  const btn = e.currentTarget;
  const rect = btn.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

/**
 * Capture a DOM element as an image (PNG data URL).
 * @param {HTMLElement} element
 * @returns {Promise<string|null>}
 */
export async function captureResultCard(element) {
  if (!element) return null;
  try {
    const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js');
    const canvas = await html2canvas(element, {
      backgroundColor: '#0a0012',
      scale: 2,
      useCORS: true,
      allowTaint: false,
    });
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

/**
 * Download a result card as a PNG image.
 */
export function downloadResultImage(element, name1, name2) {
  captureResultCard(element).then((dataUrl) => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `love-meter-${name1}-${name2}.png`;
    link.href = dataUrl;
    link.click();
  });
}
