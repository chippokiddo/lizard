const videoButton = document.getElementById('videoButton');
const clickCounter = document.getElementById('clickCounter');

let clickCount = 0;
let isProcessing = false; // Prevent rapid clicking issues

// Preload video
const preloadedVideo = document.createElement('video');
preloadedVideo.src = 'assets/lizard.mp4';
preloadedVideo.preload = 'auto';
preloadedVideo.muted = true;

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

    return visualVideo;
}

// Create audio-only video element
function createAudioVideo(clickId) {
    const audioVideo = document.createElement('video');
    audioVideo.src = 'assets/lizard.mp4';
    audioVideo.style.cssText = 'display: none; position: absolute; top: -9999px; left: -9999px;';
    audioVideo.muted = false;
    audioVideo.volume = 0.7;
    audioVideo.preload = 'auto';
    audioVideo.setAttribute('data-click-id', clickId);

    return audioVideo;
}

// Handle video playback
async function playVideoWithRetry(video, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await video.play();
            return true;
        } catch (error) {
            console.log(`Play attempt ${attempt} failed:`, error.message);

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
    if (video.parentNode) {
        video.remove();
    }
}

// Main click handler
videoButton.addEventListener('click', async function (event) {
    // Prevent rapid clicking
    if (isProcessing) return;
    isProcessing = true;

    // Prevent default behavior
    event.preventDefault();
    event.stopPropagation();

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

        // Create and setup audio video
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
        const [visualSuccess, audioSuccess] = await Promise.allSettled([
            playVideoWithRetry(visualVideo),
            playVideoWithRetry(audioVideo)
        ]);

        if (visualSuccess.status === 'fulfilled' && visualSuccess.value) {
            console.log(`Visual video ${currentClickId} started successfully`);
        }

        if (audioSuccess.status === 'fulfilled' && audioSuccess.value) {
            console.log(`Audio video ${currentClickId} started successfully`);
        }

        // Emergency cleanup after reasonable time in case ended event doesn't fire
        setTimeout(() => {
            if (visualVideo.parentNode) {
                console.log(`Emergency cleanup for visual video ${currentClickId}`);
                visualVideo.remove();
            }
            if (audioVideo.parentNode) {
                console.log(`Emergency cleanup for audio video ${currentClickId}`);
                audioVideo.remove();
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

// Pause video when page is hidden
document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
        // Pause all active videos when page becomes hidden
        const activeVideos = document.querySelectorAll('video[data-click-id]');
        activeVideos.forEach(video => {
            if (!video.paused) {
                video.pause();
            }
        });
    }
});

// Handle memory cleanup on page unload
window.addEventListener('beforeunload', function () {
    const activeVideos = document.querySelectorAll('video[data-click-id], .video-overlay');
    activeVideos.forEach(video => video.remove());
});