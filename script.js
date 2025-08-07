const videoButton = document.getElementById('videoButton');
const videoElement = document.getElementById('videoElement');
const clickCounter = document.getElementById('clickCounter');

let clickCount = 0;

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
        ripple.remove();
    }, 600);
}

// Main click handler
videoButton.addEventListener('click', function (event) {
    // Prevent default behavior
    event.preventDefault();
    event.stopPropagation();

    // Visual feedback
    createRipple(event);
    videoButton.classList.add('clicked');

    // Update counter
    clickCount++;
    clickCounter.textContent = `Clicks: ${clickCount}`;

    // Create visual video overlay
    const visualVideo = document.createElement('video');
    visualVideo.src = 'lizard.mp4';
    visualVideo.className = 'video-overlay';
    visualVideo.muted = true;
    visualVideo.currentTime = 0;
    visualVideo.preload = 'auto';

    // Add to button
    videoButton.appendChild(visualVideo);

    // Play the visual video
    visualVideo.play().then(() => {
        console.log(`Visual video ${clickCount} started`);
    }).catch(e => console.log('Visual video play failed:', e));

    // Remove visual video when it ends
    visualVideo.addEventListener('ended', function () {
        console.log(`Visual video ${clickCount} ended`);
        visualVideo.remove();
    });

    // Create a completely new video element for audio playback
    const audioVideo = document.createElement('video');
    audioVideo.src = 'lizard.mp4'; // Set source directly
    audioVideo.style.display = 'none';
    audioVideo.style.position = 'absolute';
    audioVideo.style.top = '-9999px';
    audioVideo.muted = false;
    audioVideo.volume = 0.7;
    audioVideo.preload = 'auto';

    // Add unique ID for tracking
    audioVideo.setAttribute('data-click-id', clickCount);

    document.body.appendChild(audioVideo);

    // Play the video with audio
    const playPromise = audioVideo.play();

    if (playPromise !== undefined) {
        playPromise.then(() => {
            console.log(`Audio playing for click ${clickCount}`);
        }).catch((error) => {
            console.log(`Audio play failed for click ${clickCount}:`, error);
            setTimeout(() => {
                audioVideo.play().catch(e => console.log('Retry failed:', e));
            }, 100);
        });
    }

    // Clean up when video ends
    audioVideo.addEventListener('ended', function () {
        console.log(`Video ended for click ${audioVideo.getAttribute('data-click-id')}`);
        audioVideo.remove();
    });

    // Also clean up on error
    audioVideo.addEventListener('error', function () {
        console.log(`Video error for click ${audioVideo.getAttribute('data-click-id')}`);
        audioVideo.remove();
    });

    // Remove visual feedback after short time
    setTimeout(() => {
        videoButton.classList.remove('clicked');
    }, 200);
});

// Only play the visual video on click, not continuously
let visualVideoPlaying = false;

// Reset visual video when it ends
videoElement.addEventListener('ended', function () {
    visualVideoPlaying = false;
    videoElement.currentTime = 0;
});