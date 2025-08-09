// DOM elements and state
const gifButton = document.getElementById('gifButton');
const clickCounter = document.getElementById('clickCounter');
let clickCount = 0;
let userHasInteracted = false;
let audioContext = null;
let audioBuffer = null;
let gifElement = null;

// Device detection
const isIOSDevice = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isMobileDevice = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || ('ontouchstart' in window);

// Create and play audio
async function initializeAudio() {
    if (!userHasInteracted) return;

    try {
        // Create audio context if not exists
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        // Resume context if suspended
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        // Load audio buffer if not loaded
        if (!audioBuffer) {
            const response = await fetch('assets/lizard.m4a');
            const arrayBuffer = await response.arrayBuffer();
            audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        }
    } catch (err) {
        console.warn('Audio initialization failed:', err);
        // Fallback to regular audio element
        audioContext = null;
        audioBuffer = null;
    }
}

// Play audio
async function playAudio() {
    if (!userHasInteracted) return;

    try {
        // Try Web Audio API first
        if (audioContext && audioBuffer) {
            const source = audioContext.createBufferSource();
            const gainNode = audioContext.createGain();

            source.buffer = audioBuffer;
            gainNode.gain.value = 0.7;

            source.connect(gainNode);
            gainNode.connect(audioContext.destination);

            source.start(0);
        } else {
            // Fallback to audio element
            const audio = new Audio('assets/lizard.m4a');
            audio.volume = 0.7;
            audio.preload = 'auto';

            // Play immediately in the user gesture
            await audio.play();

            // Cleanup
            audio.addEventListener('ended', () => {
                audio.remove();
            }, {once: true});
        }
    } catch (err) {
        console.warn('Audio playback failed:', err);

        // try creating and playing audio immediately
        try {
            const audio = new Audio('assets/lizard.m4a');
            audio.volume = 0.7;
            await audio.play();
            setTimeout(() => audio.remove(), 3000);
        } catch (fallbackErr) {
            console.warn('All audio playback methods failed:', fallbackErr);
        }
    }
}

// Initialize gif element
function initializeGif() {
    if (!gifElement) {
        gifElement = document.createElement('img');
        gifElement.className = 'gif-overlay';
        gifElement.alt = 'Lizard animation';
        gifElement.style.opacity = '0';
        gifButton.appendChild(gifElement);
    }
}

// Create and animate GIF
function playGif() {
    // Initialize gif element if it doesn't exist
    if (!gifElement) {
        initializeGif();
    }

    // Force reload with timestamp to restart GIF animation
    gifElement.src = `assets/lizard.gif?t=${Date.now()}`;
    
    // Show the gif
    gifElement.style.opacity = '1';
    
    // Hide after 1 second
    setTimeout(() => {
        if (gifElement) {
            gifElement.style.opacity = '0';
        }
    }, 1000);
}

// Create ripple effect
function createRipple(event) {
    const rect = gifButton.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);

    // Handle both mouse and touch events
    let clientX, clientY;
    if (event.touches && event.touches.length > 0) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else if (event.changedTouches && event.changedTouches.length > 0) {
        clientX = event.changedTouches[0].clientX;
        clientY = event.changedTouches[0].clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }

    ripple.className = 'click-ripple';
    ripple.style.cssText = `
        width:${size}px;
        height:${size}px;
        left:${clientX - rect.left - size / 2}px;
        top:${clientY - rect.top - size / 2}px;
    `;

    gifButton.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

// Main interaction handler
async function handleInteraction(event) {
    event.preventDefault();
    event.stopPropagation();

    // Mark user interaction
    userHasInteracted = true;

    // Initialize audio on first interaction
    if (!audioContext && !audioBuffer) {
        await initializeAudio();
    }

    // Update UI
    clickCount++;
    clickCounter.textContent = `Clicks: ${clickCount}`;
    createRipple(event);
    gifButton.classList.add('clicked');

    // Play media
    // must be synchronous with user gesture
    await playAudio();
    playGif();

    // Remove clicked animation
    setTimeout(() => gifButton.classList.remove('clicked'), 150);
}

// Event listeners for both desktop and mobile
gifButton.addEventListener('click', handleInteraction);

if (isMobileDevice()) {
    let touchStartTime = 0;
    let hasTouchMoved = false;

    gifButton.addEventListener('touchstart', (e) => {
        touchStartTime = Date.now();
        hasTouchMoved = false;
        userHasInteracted = true;
    }, {passive: true});

    gifButton.addEventListener('touchmove', () => {
        hasTouchMoved = true;
    }, {passive: true});

    gifButton.addEventListener('touchend', async (e) => {
        e.preventDefault();

        // Only trigger if it was a quick tap
        const touchDuration = Date.now() - touchStartTime;
        if (touchDuration < 500 && !hasTouchMoved) {
            await handleInteraction(e);
        }
    }, {passive: false});
}

if (isIOSDevice()) {
    // Handle iOS audio context suspension
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
    });
}

// Preload audio on first user interaction
document.addEventListener('touchstart', async () => {
    if (!userHasInteracted) {
        userHasInteracted = true;
        await initializeAudio();
    }
}, {once: true, passive: true});

document.addEventListener('click', async () => {
    if (!userHasInteracted) {
        userHasInteracted = true;
        await initializeAudio();
    }
}, {once: true});

// Initialize gif when DOM is ready
document.addEventListener('DOMContentLoaded', initializeGif);

// Cleanup on page hide/unload
['visibilitychange', 'beforeunload', 'pagehide'].forEach(event => {
    document.addEventListener(event, () => {
        if (document.hidden || event === 'beforeunload' || event === 'pagehide') {
            // Clean up audio context
            if (audioContext) {
                audioContext.close();
                audioContext = null;
                audioBuffer = null;
            }

            // Clean up any remaining audio elements
            document.querySelectorAll('audio').forEach(audio => {
                audio.pause();
                audio.remove();
            });
        }
    });
});

console.log('Lizard button loaded successfully');
