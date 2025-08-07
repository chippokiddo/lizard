// DOM elements
const gifButton = document.getElementById('gifButton');
const clickCounter = document.getElementById('clickCounter');

// State variables
let clickCount = 0;
let userHasInteracted = false;

// Device detection utilities
const isMobileDevice = () => {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || ('ontouchstart' in window);
};

// Create new audio element for each click
function createAudio() {
    const audio = new Audio('assets/lizard.m4a');
    audio.volume = 0.7;
    audio.preload = 'auto';

    // Hide audio element
    audio.style.cssText = `
        position: fixed !important;
        top: -9999px !important;
        opacity: 0 !important;
        pointer-events: none !important;
    `;

    document.body.appendChild(audio);
    return audio;
}

// Create GIF element
function createGifElement() {
    const gif = document.createElement('img');

    Object.assign(gif, {
        src: 'assets/lizard.gif',
        alt: 'Lizard animation',
        className: 'gif-overlay'
    });

    return gif;
}

// Play audio
async function playAudio() {
    if (!userHasInteracted) {
        console.log('Skipping audio - no user interaction yet');
        return false;
    }

    try {
        const audioElement = createAudio();

        // Auto-cleanup audio when it ends
        audioElement.addEventListener('ended', () => {
            if (audioElement.parentNode) {
                audioElement.remove();
            }
        }, { once: true });

        audioElement.currentTime = 0;
        await audioElement.play();
        console.log('Audio playing successfully');
        return audioElement;
    } catch (error) {
        console.warn('Audio play failed:', error.message);
        return false;
    }
}

// Play GIF animation once
function playGif(gifElement) {
    try {
        // Force GIF restart by reloading with timestamp
        const currentSrc = gifElement.src;
        const baseSrc = currentSrc.split('?')[0];
        const separator = '?';
        gifElement.src = baseSrc + separator + 't=' + Date.now();

        // Show the GIF
        gifElement.style.opacity = '1';

        // Stop the GIF after one loop
        setTimeout(() => {
            gifElement.style.opacity = '0';
        }, 1000); // Match 1-second audio duration

        console.log('GIF playing successfully');
        return true;
    } catch (error) {
        console.error('GIF play failed:', error.message);
        return false;
    }
}

// UI effects
function createRipple(event) {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement('span');

    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    Object.assign(ripple, {
        className: 'click-ripple'
    });

    Object.assign(ripple.style, {
        width: `${size}px`,
        height: `${size}px`,
        left: `${x}px`,
        top: `${y}px`
    });

    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
}

// Cleanup function
function cleanupMedia(gif) {
    if (gif && gif.parentNode) {
        try {
            gif.style.opacity = '0';
            setTimeout(() => {
                if (gif.parentNode) {
                    gif.remove();
                }
            }, 300); // Fade out transition
        } catch (error) {
            console.warn('Cleanup error:', error.message);
        }
    }
}

// Main click handler
gifButton.addEventListener('click', async function (event) {
    // Remove isProcessing check to allow rapid clicking

    event.preventDefault();
    event.stopPropagation();

    userHasInteracted = true;

    // Update counter and add visual feedback
    clickCount++;
    clickCounter.textContent = `Clicks: ${clickCount}`;
    createRipple(event);
    gifButton.classList.add('clicked');

    let gif;

    try {
        // Create GIF element
        gif = createGifElement();
        gifButton.appendChild(gif);

        // Start playback
        // both can happen independently
        const audioPromise = playAudio();
        const gifPlaying = playGif(gif);

        audioPromise; // Audio will play and auto-cleanup

        // Cleanup GIF after animation
        setTimeout(() => cleanupMedia(gif), 1500);

    } catch (error) {
        console.error('Click handler error:', error);
        cleanupMedia(gif);
    } finally {
        setTimeout(() => {
            gifButton.classList.remove('clicked');
        }, 150);
    }
});

// Mobile touch handling
if (isMobileDevice()) {
    gifButton.addEventListener('touchstart', () => {
        userHasInteracted = true;
    }, {passive: true});

    // Prevent double-tap zoom on iOS
    gifButton.addEventListener('touchend', (event) => {
        event.preventDefault();
    }, {passive: false});
}

// Page visibility handling
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause all audio when page is hidden
        const allAudio = [...document.querySelectorAll('audio')];
        allAudio.forEach(audio => {
            try {
                if (!audio.paused) audio.pause();
            } catch (error) {
                console.warn('Error pausing audio:', error);
            }
        });
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    const allAudio = [...document.querySelectorAll('audio')];
    allAudio.forEach(audio => {
        try {
            audio.pause();
            audio.currentTime = 0;
            if (audio.parentNode) audio.remove();
        } catch (error) {
            console.warn('Unload cleanup error:', error);
        }
    });
});

console.log('Lizard button script loaded successfully');