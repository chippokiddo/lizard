const videoButton = document.getElementById('videoButton');
const clickCounter = document.getElementById('clickCounter');

let clickCount = 0;
let isProcessing = false; // Prevent rapid clicking issues

// Preload video
const preloadedVideo = document.createElement('video');
preloadedVideo.src = 'assets/lizard.mp4';
preloadedVideo.preload = 'auto';
preloadedVideo.muted = true;
preloadedVideo.playsInline = true; // Critical for mobile
preloadedVideo.setAttribute('playsinline', ''); // Backup attribute

// Create ripple effect
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

    // Use requestAnimationFrame
    requestAnimationFrame(() => {
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.remove();
            }
        }, 600);
    });
}

// Create visual video overlay
function createVisualVideo() {
    const visualVideo = document.createElement('video');
    visualVideo.src = 'assets/lizard.mp4';
    visualVideo.className = 'video-overlay';
    visualVideo.muted = true;
    visualVideo.currentTime = 0;
    visualVideo.preload = 'auto';

    // Critical mobile attributes
    visualVideo.playsInline = true;
    visualVideo.setAttribute('playsinline', '');
    visualVideo.setAttribute('webkit-playsinline', '');
    visualVideo.controls = false;
    visualVideo.disablePictureInPicture = true;

    // Additional mobile-specific properties
    visualVideo.setAttribute('x-webkit-airplay', 'deny');
    visualVideo.setAttribute('disableremoteplayback', '');

    return visualVideo;
}

// Create audio-only video element
function createAudioVideo(clickId) {
    const audioVideo = document.createElement('video');
    audioVideo.src = 'assets/lizard.mp4';
    audioVideo.style.cssText = 'display: none; position: absolute; top: -9999px; left: -9999px; width: 1px; height: 1px;';
    audioVideo.muted = false;
    audioVideo.volume = 0.7;
    audioVideo.preload = 'auto';
    audioVideo.setAttribute('data-click-id', clickId);

    // Mobile-specific attributes for hidden audio video
    audioVideo.playsInline = true;
    audioVideo.setAttribute('playsinline', '');
    audioVideo.setAttribute('webkit-playsinline', '');
    audioVideo.controls = false;
    audioVideo.disablePictureInPicture = true;

    return audioVideo;
}

// Handle video playback
async function playVideoWithRetry(video, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Check video is ready for mobile
            if (video.readyState < 2) {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => reject(new Error('Video load timeout')), 3000);
                    video.addEventListener('loadeddata', () => {
                        clearTimeout(timeout);
                        resolve();
                    }, {once: true});
                });
            }

            const playPromise = video.play();
            if (playPromise !== undefined) {
                await playPromise;
            }
            return true;
        } catch (error) {
            console.log(`Play attempt ${attempt} failed:`, error.message);

            // Handle specific mobile errors
            if (error.name === 'NotAllowedError') {
                console.log('Autoplay prevented by browser policy');
                return false;
            }

            if (attempt < maxRetries) {
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 100 * attempt));
            }
        }
    }
    return false;
}

// Clean up function for video elements
function cleanupVideo(video, type, clickId) {
    console.log(`${type} cleanup for click ${clickId}`);
    try {
        if (!video.paused) {
            video.pause();
        }
        video.currentTime = 0;
        if (video.parentNode) {
            video.remove();
        }
    } catch (error) {
        console.log('Cleanup error:', error);
    }
}

// Detect if on mobile
function isMobileDevice() {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        ('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0);
}

// Initialize audio context on first user interaction - required for mobile
let audioContextInitialized = false;

function initializeAudioContext() {
    if (!audioContextInitialized && isMobileDevice()) {
        // Create a silent audio context to unlock audio playback
        const tempAudio = new Audio();
        tempAudio.volume = 0;
        tempAudio.muted = true;
        tempAudio.play().catch(() => {
        });
        audioContextInitialized = true;
    }
}

// Main click handler
videoButton.addEventListener('click', async function (event) {
    // Prevent rapid clicking
    if (isProcessing) return;
    isProcessing = true;

    // Prevent default behavior and stop propagation
    event.preventDefault();
    event.stopPropagation();

    // Initialize audio context on first click - mobile requirement
    initializeAudioContext();

    // Update counter immediately
    clickCount++;
    clickCounter.textContent = `Clicks: ${clickCount}`;

    const currentClickId = clickCount;

    try {
        // Visual feedback
        createRipple(event);
        videoButton.classList.add('clicked');

        // Create and setup visual video
        const visualVideo = createVisualVideo();
        videoButton.appendChild(visualVideo);

        // Create and setup audio video only if not mobile or user has interacted
        const audioVideo = createAudioVideo(currentClickId);
        document.body.appendChild(audioVideo);

        // Setup event listeners for cleanup
        const visualCleanup = () => cleanupVideo(visualVideo, 'Visual video', currentClickId);
        const audioCleanup = () => cleanupVideo(audioVideo, 'Audio video', currentClickId);

        visualVideo.addEventListener('ended', visualCleanup, {once: true});
        visualVideo.addEventListener('error', visualCleanup, {once: true});

        audioVideo.addEventListener('ended', audioCleanup, {once: true});
        audioVideo.addEventListener('error', audioCleanup, {once: true});

        // Start playback
        const playPromises = [];

        // Always try to play visual video
        playPromises.push(playVideoWithRetry(visualVideo));

        // Audio on mobile
        if (!isMobileDevice() || audioContextInitialized) {
            playPromises.push(playVideoWithRetry(audioVideo));
        }

        const results = await Promise.allSettled(playPromises);

        if (results[0] && results[0].status === 'fulfilled' && results[0].value) {
            console.log(`Visual video ${currentClickId} started successfully`);
        }

        if (results[1] && results[1].status === 'fulfilled' && results[1].value) {
            console.log(`Audio video ${currentClickId} started successfully`);
        }

        // Emergency cleanup after reasonable time
        setTimeout(() => {
            if (visualVideo.parentNode) {
                console.log(`Emergency cleanup for visual video ${currentClickId}`);
                cleanupVideo(visualVideo, 'Emergency visual', currentClickId);
            }
            if (audioVideo.parentNode) {
                console.log(`Emergency cleanup for audio video ${currentClickId}`);
                cleanupVideo(audioVideo, 'Emergency audio', currentClickId);
            }
        }, 30000); // 30 seconds max

    } catch (error) {
        console.error('Error in click handler:', error);
    } finally {
        // Remove visual feedback and allow next click
        setTimeout(() => {
            videoButton.classList.remove('clicked');
            isProcessing = false;
        }, 200);
    }
});

// Handle touch events for mobile
if (isMobileDevice()) {
    videoButton.addEventListener('touchstart', function (event) {
        event.preventDefault();
    }, {passive: false});

    videoButton.addEventListener('touchend', function (event) {
        event.preventDefault();
        // The click event will still fire
    }, {passive: false});
}

// Pause video when page is hidden
document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
        // Pause all active videos when page becomes hidden
        const activeVideos = document.querySelectorAll('video[data-click-id], .video-overlay');
        activeVideos.forEach(video => {
            try {
                if (!video.paused) {
                    video.pause();
                }
            } catch (error) {
                console.log('Error pausing video:', error);
            }
        });
    }
});

// Handle memory cleanup on page unload
window.addEventListener('beforeunload', function () {
    const activeVideos = document.querySelectorAll('video[data-click-id], .video-overlay');
    activeVideos.forEach(video => {
        try {
            cleanupVideo(video, 'Page unload', 'unknown');
        } catch (error) {
            console.log('Error during page unload cleanup:', error);
        }
    });
});