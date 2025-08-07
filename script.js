// DOM elements and state
const gifButton = document.getElementById('gifButton');
const clickCounter = document.getElementById('clickCounter');
let clickCount = 0;
let userHasInteracted = false;

// Device detection
const isIOSDevice = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isMobileDevice = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || ('ontouchstart' in window);

// Create and play audio
function playAudio() {
    if (!userHasInteracted) return;

    const audio = new Audio('assets/lizard.m4a');
    audio.volume = 0.7;
    audio.style.cssText = 'position:fixed!important;top:-9999px!important;opacity:0!important;pointer-events:none!important;';

    document.body.appendChild(audio);

    // Auto-cleanup when finished
    audio.addEventListener('ended', () => audio.remove(), {once: true});

    audio.play().catch(err => {
        console.warn('Audio failed:', err);
        audio.remove();
    });
}

// Create and animate GIF
function playGif() {
    const gif = document.createElement('img');
    gif.className = 'gif-overlay';
    gif.alt = 'Lizard animation';

    gif.onload = () => {
        gif.style.opacity = '1';
        // Hide after 1 second
        setTimeout(() => gif.style.opacity = '0', 1000);
    };

    // Force reload with timestamp to restart GIF
    gif.src = `assets/lizard.gif?t=${Date.now()}`;

    gifButton.appendChild(gif);

    // Remove after fade out
    setTimeout(() => {
        if (gif.parentNode) {
            gif.remove();
        }
    }, 1500);
}

// Create ripple effect
function createRipple(event) {
    const rect = gifButton.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);

    ripple.className = 'click-ripple';
    ripple.style.cssText = `
        width:${size}px;
        height:${size}px;
        left:${event.clientX - rect.left - size / 2}px;
        top:${event.clientY - rect.top - size / 2}px;
    `;

    gifButton.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

// Main click handler
gifButton.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();

    userHasInteracted = true;

    // Update UI
    clickCount++;
    clickCounter.textContent = `Clicks: ${clickCount}`;
    createRipple(event);
    gifButton.classList.add('clicked');

    // Play media
    playAudio();
    playGif();

    // Remove clicked animation
    setTimeout(() => gifButton.classList.remove('clicked'), 150);
});

// Mobile handling
if (isMobileDevice()) {
    // Initialize on first touch
    gifButton.addEventListener('touchstart', () => {
        userHasInteracted = true;
    }, {passive: true});

    // Prevent zoom on iOS
    gifButton.addEventListener('touchend', e => e.preventDefault(), {passive: false});
}

// Cleanup on page hide/unload
['visibilitychange', 'beforeunload'].forEach(event => {
    document.addEventListener(event, () => {
        if (document.hidden || event === 'beforeunload') {
            document.querySelectorAll('audio').forEach(audio => {
                audio.pause();
                audio.remove();
            });
        }
    });
});

console.log('Lizard button loaded successfully');