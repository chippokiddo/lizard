const videoButton = document.getElementById('videoButton');
const clickCounter = document.getElementById('clickCounter');

let clickCount = 0;
let isProcessing = false;
let userHasInteracted = false;
let videoPool = []; // Pool for reusing video elements on iOS

// Device detection
const isIOSSafari = () => {
    const ua = navigator.userAgent;
    return /iPhone|iPad|iPod/i.test(ua) && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
};

const isMobileDevice = () => {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || ('ontouchstart' in window);
};

// Create optimized video element for iOS
function createVideoElement(options = {}) {
    const video = document.createElement('video');
    video.src = 'assets/lizard.mp4';
    video.muted = options.muted !== false;
    video.playsInline = true;
    video.preload = 'metadata';
    video.controls = false;
    video.disablePictureInPicture = true;
    video.crossOrigin = 'anonymous';

    // Essential iOS attributes
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('x5-playsinline', '');
    video.setAttribute('disableremoteplayback', '');

    // Hide media controls completely
    video.style.cssText += '-webkit-media-controls: none !important;';

    if (options.isAudio) {
        video.style.cssText = `
            position: absolute; 
            top: -9999px; 
            left: -9999px; 
            width: 1px; 
            height: 1px; 
            opacity: 0; 
            pointer-events: none;
            z-index: -1;
        `;
        video.volume = 0.7;
        video.muted = false;
    } else {
        video.className = 'video-overlay';
        video.style.cssText += `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            pointer-events: none;
            z-index: 1;
        `;
    }

    return video;
}

// Handle video playback
async function playVideo(video, isAudioTrack = false) {
    try {
        // Reset video state
        video.currentTime = 0;

        // Make sure video is loaded before attempting play for iOS
        if (isIOSSafari()) {
            if (video.readyState < 2) {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Load timeout')), 2000);

                    const onLoaded = () => {
                        clearTimeout(timeout);
                        video.removeEventListener('loadeddata', onLoaded);
                        video.removeEventListener('error', onError);
                        resolve();
                    };

                    const onError = (e) => {
                        clearTimeout(timeout);
                        video.removeEventListener('loadeddata', onLoaded);
                        video.removeEventListener('error', onError);
                        reject(e);
                    };

                    video.addEventListener('loadeddata', onLoaded, {once: true});
                    video.addEventListener('error', onError, {once: true});

                    video.load();
                });
            }
        }

        // Attempt to play
        const playPromise = video.play();
        if (playPromise) {
            await playPromise;
            return true;
        }

    } catch (error) {
        console.warn(`Video play failed (${isAudioTrack ? 'audio' : 'visual'}):`, error.message);

        // On iOS, if autoplay fails due to policy, that's expected for audio
        if (isIOSSafari() && isAudioTrack && error.name === 'NotAllowedError') {
            console.log('iOS blocked audio autoplay (expected behavior)');
        }

        return false;
    }
}

// Clean video element
function cleanupVideo(video) {
    try {
        if (video && video.parentNode) {
            video.pause();
            video.currentTime = 0;

            // For iOS memory management
            if (isIOSSafari()) {
                video.src = '';
                video.load();
            }

            video.remove();
        }
    } catch (error) {
        console.warn('Video cleanup error:', error);
    }
}

// Ripple effect
function createRipple(event) {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement('span');

    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.className = 'click-ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';

    button.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
}

// Mark user interaction for iOS autoplay policy
function markUserInteraction() {
    if (!userHasInteracted) {
        userHasInteracted = true;
        console.log('User interaction registered');
    }
}

// Main click handler
videoButton.addEventListener('click', async function (event) {
    if (isProcessing) return;

    event.preventDefault();
    event.stopPropagation();

    isProcessing = true;
    markUserInteraction();

    // Update counter
    clickCount++;
    clickCounter.textContent = `Clicks: ${clickCount}`;

    try {
        // Visual feedback
        createRipple(event);
        videoButton.classList.add('clicked');

        // Create visual video
        const visualVideo = createVideoElement({muted: true});
        videoButton.appendChild(visualVideo);

        // Create audio video (only if user has interacted and not muted)
        let audioVideo = null;
        if (userHasInteracted) {
            audioVideo = createVideoElement({
                muted: false,
                isAudio: true
            });
            document.body.appendChild(audioVideo);
        }

        // Set up cleanup on video end
        const cleanup = () => {
            cleanupVideo(visualVideo);
            if (audioVideo) cleanupVideo(audioVideo);
        };

        visualVideo.addEventListener('ended', cleanup, {once: true});
        if (audioVideo) {
            audioVideo.addEventListener('ended', cleanup, {once: true});
        }

        // Play videos
        const visualPromise = playVideo(visualVideo, false);
        const audioPromise = audioVideo ? playVideo(audioVideo, true) : Promise.resolve();

        await Promise.all([visualPromise, audioPromise]);

        // Emergency cleanup after 10 seconds
        setTimeout(cleanup, 10000);

    } catch (error) {
        console.error('Click handler error:', error);
    } finally {
        setTimeout(() => {
            videoButton.classList.remove('clicked');
            isProcessing = false;
        }, 150);
    }
});

// Touch handling for mobile
if (isMobileDevice()) {
    let touchStartTime = 0;

    videoButton.addEventListener('touchstart', (event) => {
        touchStartTime = Date.now();
        markUserInteraction();
    }, {passive: true});

    videoButton.addEventListener('touchend', (event) => {
        const touchDuration = Date.now() - touchStartTime;
        if (touchDuration < 500) {
            event.preventDefault();
        }
    }, {passive: false});
}

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause all active videos when page becomes hidden
        const activeVideos = document.querySelectorAll('.video-overlay, video');
        activeVideos.forEach(video => {
            try {
                if (!video.paused) video.pause();
            } catch (error) {
                console.warn('Error pausing video on visibility change:', error);
            }
        });
    }
});

// Handle cleanup on page unload
window.addEventListener('beforeunload', () => {
    const allVideos = document.querySelectorAll('video');
    allVideos.forEach(video => {
        try {
            video.pause();
            if (isIOSSafari()) {
                video.src = '';
                video.load();
            }
        } catch (error) {
            console.warn('Unload cleanup error:', error);
        }
    });
});

// iOS event handlers
if (isIOSSafari()) {
    // Handle iOS app backgrounding
    window.addEventListener('pagehide', () => {
        document.querySelectorAll('video').forEach(video => {
            try {
                video.pause();
            } catch (error) {
                console.warn('Page hide cleanup error:', error);
            }
        });
    }, {passive: true});

    // Handle focus loss
    window.addEventListener('blur', () => {
        document.querySelectorAll('video').forEach(video => {
            try {
                if (!video.paused) video.pause();
            } catch (error) {
                console.warn('Blur cleanup error:', error);
            }
        });
    }, {passive: true});
}