const videoButton = document.getElementById('videoButton');
const clickCounter = document.getElementById('clickCounter');

let clickCount = 0;
let isProcessing = false;
let userHasInteracted = false; // Track user interaction for Safari iOS

// Create a single preloaded video
const masterVideo = document.createElement('video');
masterVideo.src = 'assets/lizard.mp4';
masterVideo.preload = 'none'; // Let iOS decide when to load
masterVideo.muted = true;
masterVideo.playsInline = true;
masterVideo.setAttribute('playsinline', '');
masterVideo.setAttribute('webkit-playsinline', '');
masterVideo.setAttribute('x5-playsinline', ''); // Additional mobile attribute
masterVideo.style.display = 'none';
masterVideo.crossOrigin = 'anonymous'; // Help with iOS loading

// Don't add to DOM immediately
// Do it after first interaction

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

    setTimeout(() => {
        if (ripple.parentNode) {
            ripple.remove();
        }
    }, 600);
}

// Create visual video overlay
function createVisualVideo() {
    const visualVideo = document.createElement('video');
    visualVideo.src = 'assets/lizard.mp4';
    visualVideo.className = 'video-overlay';
    visualVideo.muted = true;
    visualVideo.currentTime = 0;
    visualVideo.preload = 'none';
    visualVideo.style.display = 'block';
    visualVideo.playsInline = true;
    visualVideo.setAttribute('playsinline', '');
    visualVideo.setAttribute('webkit-playsinline', '');
    visualVideo.setAttribute('x5-playsinline', '');
    visualVideo.controls = false;
    visualVideo.disablePictureInPicture = true;
    visualVideo.setAttribute('disableremoteplayback', '');
    visualVideo.crossOrigin = 'anonymous';

    return visualVideo;
}

// Create audio video element
function createAudioVideo(clickId) {
    const audioVideo = document.createElement('video');
    audioVideo.src = 'assets/lizard.mp4';
    audioVideo.style.cssText = 'position: fixed; top: -1000px; left: -1000px; width: 1px; height: 1px; opacity: 0; z-index: -1;';
    audioVideo.muted = false;
    audioVideo.volume = 0.7;
    audioVideo.currentTime = 0;
    audioVideo.preload = 'none';
    audioVideo.setAttribute('data-click-id', clickId);
    audioVideo.playsInline = true;
    audioVideo.setAttribute('playsinline', '');
    audioVideo.setAttribute('webkit-playsinline', '');
    audioVideo.setAttribute('x5-playsinline', '');
    audioVideo.controls = false;
    audioVideo.disablePictureInPicture = true;
    audioVideo.crossOrigin = 'anonymous';

    return audioVideo;
}

// Handle video playback
async function playVideoWithRetry(video, isAudio = false) {
    try {
        if (isIOSSafari()) {
            video.load();
            if (video.readyState < 3) {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Video load timeout'));
                    }, 3000);

                    const onCanPlay = () => {
                        clearTimeout(timeout);
                        cleanup();
                        resolve();
                    };

                    const onError = (e) => {
                        clearTimeout(timeout);
                        cleanup();
                        reject(e);
                    };

                    const cleanup = () => {
                        video.removeEventListener('canplaythrough', onCanPlay);
                        video.removeEventListener('loadeddata', onCanPlay);
                        video.removeEventListener('error', onError);
                    };

                    video.addEventListener('canplaythrough', onCanPlay);
                    video.addEventListener('loadeddata', onCanPlay);
                    video.addEventListener('error', onError);
                });
            }
        }

        // Reset video position and play
        video.currentTime = 0;

        const playPromise = video.play();
        if (playPromise) {
            await playPromise;
        }
        return true;

    } catch (error) {
        console.log(`Play failed (${isAudio ? 'audio' : 'visual'}):`, error.message);

        // Don't retry on iOS Safari
        if (isIOSSafari() && (error.name === 'NotAllowedError' || error.name === 'NotSupportedError')) {
            console.log('iOS Safari blocked playback');
            return false;
        }

        return false;
    }
}

// Clean up function
function cleanupVideo(video, type, clickId) {
    try {
        if (!video.paused) {
            video.pause();
        }
        video.currentTime = 0;
        video.src = '';
        video.load(); // This helps with memory cleanup on iOS
        if (video.parentNode) {
            video.remove();
        }
    } catch (error) {
        console.log(`${type} cleanup error:`, error);
    }
}

// Detect mobile
function isMobileDevice() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        /Android/i.test(navigator.userAgent) ||
        ('ontouchstart' in window);
}

// Check if specifically iOS Safari
function isIOSSafari() {
    const ua = navigator.userAgent;
    return /iPhone|iPad|iPod/i.test(ua) && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
}

// Initialize user interaction tracking
function markUserInteraction() {
    if (!userHasInteracted) {
        userHasInteracted = true;
        console.log('User interaction registered for Safari iOS');

        // Add master video to DOM only after first interaction on iOS
        if (isIOSSafari() && !document.body.contains(masterVideo)) {
            document.body.appendChild(masterVideo);
        }
    }
}

// Main click handler
videoButton.addEventListener('click', async function (event) {
    if (isProcessing) return;
    isProcessing = true;

    event.preventDefault();
    event.stopPropagation();

    // Mark user interaction for Safari iOS
    markUserInteraction();

    // Update counter
    clickCount++;
    clickCounter.textContent = `Clicks: ${clickCount}`;

    const currentClickId = clickCount;

    try {
        // Visual feedback
        createRipple(event);
        videoButton.classList.add('clicked');

        // Create visual video
        const visualVideo = createVisualVideo();
        videoButton.appendChild(visualVideo);

        // Setup cleanup handlers
        const visualCleanupHandler = () => {
            cleanupVideo(visualVideo, 'Visual video', currentClickId);
        };

        visualVideo.addEventListener('ended', visualCleanupHandler, {once: true});
        visualVideo.addEventListener('error', visualCleanupHandler, {once: true});

        // Create audio video only after user interaction
        let audioVideo = null;
        let audioCleanupHandler = null;

        if (userHasInteracted && !isIOSSafari()) {
            // Only create audio video for non-iOS or after user interaction
            audioVideo = createAudioVideo(currentClickId);
            document.body.appendChild(audioVideo);

            audioCleanupHandler = () => {
                cleanupVideo(audioVideo, 'Audio video', currentClickId);
            };

            audioVideo.addEventListener('ended', audioCleanupHandler, {once: true});
            audioVideo.addEventListener('error', audioCleanupHandler, {once: true});
        }

        // Start playback
        const visualPlayPromise = playVideoWithRetry(visualVideo, false);

        let audioPlayPromise = Promise.resolve(true);
        if (audioVideo) {
            audioPlayPromise = playVideoWithRetry(audioVideo, true);
        }

        // Wait for both to complete
        await Promise.all([visualPlayPromise, audioPlayPromise]);

        // Emergency cleanup
        setTimeout(() => {
            if (visualVideo.parentNode) {
                cleanupVideo(visualVideo, 'Emergency visual', currentClickId);
            }
            if (audioVideo && audioVideo.parentNode) {
                cleanupVideo(audioVideo, 'Emergency audio', currentClickId);
            }
        }, 15000);

    } catch (error) {
        console.error('Click handler error:', error);
    } finally {
        setTimeout(() => {
            videoButton.classList.remove('clicked');
            isProcessing = false;
        }, 150);
    }
});

// Touch handling for iOS
if (isMobileDevice()) {
    let touchStartTime = 0;

    videoButton.addEventListener('touchstart', function (event) {
        touchStartTime = Date.now();
        markUserInteraction();
    }, {passive: true});

    videoButton.addEventListener('touchend', function (event) {
        const touchDuration = Date.now() - touchStartTime;

        // Only trigger if it was a quick tap, not a drag
        if (touchDuration < 500) {
            event.preventDefault();
        }
    }, {passive: false});
}

// Handle visibility changes
document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
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
    const allVideos = document.querySelectorAll('video');
    allVideos.forEach(video => {
        try {
            video.pause();
            video.src = '';
            video.load();
        } catch (error) {
            console.log('Unload cleanup error:', error);
        }
    });
});

// Additional iOS event listeners
if (isIOSSafari()) {
    // Handle iOS app state changes
    window.addEventListener('pagehide', function () {
        const allVideos = document.querySelectorAll('video');
        allVideos.forEach(video => {
            try {
                video.pause();
            } catch (error) {
                console.log('Page hide cleanup error:', error);
            }
        });
    });

    // Handle focus/blur for Safari iOS
    window.addEventListener('blur', function () {
        const activeVideos = document.querySelectorAll('.video-overlay, video[data-click-id]');
        activeVideos.forEach(video => {
            try {
                if (!video.paused) {
                    video.pause();
                }
            } catch (error) {
                console.log('Blur cleanup error:', error);
            }
        });
    });
}