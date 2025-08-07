// DOM elements
const videoButton = document.getElementById('videoButton');
const clickCounter = document.getElementById('clickCounter');

// State variables
let clickCount = 0;
let isProcessing = false;
let userHasInteracted = false;

// Device detection utilities
const isIOSSafari = () => {
    const ua = navigator.userAgent;
    return /iPhone|iPad|iPod/i.test(ua) && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
};

const isMobileDevice = () => {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || ('ontouchstart' in window);
};

// Media element creators
function createVisualVideo() {
    const video = document.createElement('video');

    // Configure video attributes
    Object.assign(video, {
        muted: true,
        playsInline: true,
        controls: false,
        disablePictureInPicture: true,
        src: 'assets/lizard.mp4',
        className: 'video-overlay',
        preload: isIOSSafari() ? 'auto' : 'metadata'
    });

    // Set required attributes for iOS
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');

    return video;
}

function createAudioElement() {
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

    return audio;
}

// Media playback functions
async function playVideo(video) {
    try {
        video.currentTime = 0;

        // Wait for video to be ready on iOS
        if (isIOSSafari() && video.readyState < 3) {
            await waitForVideoReady(video);
        }

        await video.play();
        console.log('Video playing successfully');
        return true;
    } catch (error) {
        console.error('Video play failed:', error.message);
        return false;
    }
}

async function playAudio(audio) {
    try {
        if (!userHasInteracted) {
            console.log('Skipping audio - no user interaction yet');
            return false;
        }

        audio.currentTime = 0;

        // Wait for audio to load if needed
        if (audio.readyState < 3) {
            await waitForAudioReady(audio);
        }

        await audio.play();
        console.log('Audio playing successfully');
        return true;
    } catch (error) {
        console.warn('Audio play failed:', error.message);
        return false;
    }
}

// Helper functions for media loading
function waitForVideoReady(video) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Video load timeout')), 2000);

        const cleanup = () => {
            clearTimeout(timeout);
            video.removeEventListener('canplaythrough', onReady);
            video.removeEventListener('error', onError);
        };

        const onReady = () => {
            cleanup();
            resolve();
        };

        const onError = (e) => {
            cleanup();
            reject(e);
        };

        video.addEventListener('canplaythrough', onReady);
        video.addEventListener('error', onError);

        if (video.networkState === 3) {
            video.load();
        }
    });
}

function waitForAudioReady(audio) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Audio load timeout')), 2000);

        const cleanup = () => {
            clearTimeout(timeout);
            audio.removeEventListener('canplaythrough', onReady);
            audio.removeEventListener('error', onError);
        };

        const onReady = () => {
            cleanup();
            resolve();
        };

        const onError = (e) => {
            cleanup();
            reject(e);
        };

        audio.addEventListener('canplaythrough', onReady);
        audio.addEventListener('error', onError);

        if (audio.networkState === 3) {
            audio.load();
        }
    });
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
function cleanupMedia(video, audio) {
    const elements = [video, audio].filter(Boolean);

    elements.forEach(element => {
        try {
            element.pause();
            element.currentTime = 0;

            if (isIOSSafari()) {
                element.src = '';
                if (element.load) element.load();
            }

            if (element.parentNode) {
                element.remove();
            }
        } catch (error) {
            console.warn('Cleanup error:', error.message);
        }
    });
}

// Main click handler
videoButton.addEventListener('click', async function (event) {
    if (isProcessing) return;

    event.preventDefault();
    event.stopPropagation();

    isProcessing = true;
    userHasInteracted = true;

    // Update counter and add visual feedback
    clickCount++;
    clickCounter.textContent = `Clicks: ${clickCount}`;
    createRipple(event);
    videoButton.classList.add('clicked');

    let video, audio;

    try {
        // Create media elements
        video = createVisualVideo();
        audio = createAudioElement();

        videoButton.appendChild(video);
        document.body.appendChild(audio);

        // Set up cleanup when both media end
        let mediaEndedCount = 0;
        const onMediaEnd = () => {
            mediaEndedCount++;
            if (mediaEndedCount >= 2) {
                cleanupMedia(video, audio);
            }
        };

        video.addEventListener('ended', onMediaEnd, {once: true});
        audio.addEventListener('ended', onMediaEnd, {once: true});

        // Handle errors
        video.addEventListener('error', () => cleanupMedia(video, audio), {once: true});

        // Start playback
        await Promise.allSettled([
            playVideo(video),
            playAudio(audio)
        ]);

        // Emergency cleanup after 10 seconds
        setTimeout(() => cleanupMedia(video, audio), 10000);

    } catch (error) {
        console.error('Click handler error:', error);
        cleanupMedia(video, audio);
    } finally {
        setTimeout(() => {
            videoButton.classList.remove('clicked');
            isProcessing = false;
        }, 150);
    }
});

// Mobile touch handling
if (isMobileDevice()) {
    videoButton.addEventListener('touchstart', () => {
        userHasInteracted = true;
    }, {passive: true});

    // Prevent double-tap zoom on iOS
    videoButton.addEventListener('touchend', (event) => {
        event.preventDefault();
    }, {passive: false});
}

// Page visibility handling
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause all media when page is hidden
        const allMedia = [...document.querySelectorAll('.video-overlay'), ...document.querySelectorAll('audio')];
        allMedia.forEach(media => {
            try {
                if (!media.paused) media.pause();
            } catch (error) {
                console.warn('Error pausing media:', error);
            }
        });
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    const allMedia = [...document.querySelectorAll('.video-overlay'), ...document.querySelectorAll('audio')];
    allMedia.forEach(media => {
        try {
            media.pause();
            if (isIOSSafari() && media.src) {
                media.src = '';
                if (media.load) media.load();
            }
        } catch (error) {
            console.warn('Unload cleanup error:', error);
        }
    });
});

console.log('Lizard button script loaded successfully');