/* https://stackoverflow.com/questions/64566873/how-to-check-a-user-watched-the-full-video-in-html5-video-player-without-skippin */

/* VideoTour.js – Optimized video loading and autoplay */

document.addEventListener('DOMContentLoaded', function() {
    // ---------- Helper Functions ----------
    // 3 seconds after playback starts
    const UNMUTE_DELAY = 3000;
    const MAX_RETRIES = 10;
    let retryCount = 0;
    let retryTimer = null;
    let prevTime = 0;

    const onTimeUpdate = event => {
        const timeUpdate = checkSkipped(event.target.currentTime);
        if (timeUpdate) {
            console.log('skip detected', timeUpdate);
            videoTour.record[localSessionTime].push({
                [new Date().getTime() + '_skip']: timeUpdate
            });
        }
    };

    const onRecordUpdate = event => {
        console.log('video event', event.type);
        videoTour.record[localSessionTime].push({
            [new Date().getTime() + '_' + event.type]: event
        });
        // Persist via external analytics if available
        if (typeof videoTour !== 'undefined' &&
            typeof videoTour.RECORD_USER_ACTION !== 'undefined' &&
            typeof videoTour.RECORD_USER_ACTION.Append_Only === 'function') {
            videoTour.RECORD_USER_ACTION.Append_Only(0, {
                [localSessionTime]: videoTour.record
            });
        }
        // Unmute after a short delay when playback starts
        if (event.type === 'playing') {
            setTimeout(() => {
                // $video.muted = false; // uncomment if you want to unmute
                console.log('Video unmuted after delay');
            }, UNMUTE_DELAY);
        }
    };

    const checkSkipped = currentTime => {
        // seconds
        const skipThreshold = 2;
        const skip = [];
        if (currentTime - prevTime > skipThreshold) {
            skip.push({
                periodSkipped: currentTime - prevTime,
                startAt: prevTime,
                endAt: currentTime
            });
            prevTime = currentTime;
            return skip;
        }
        prevTime = currentTime;
        return false;
    };

    // ---------- Initialise Global VideoTour Object ----------

    window.videoTour = {
        record: {},
        URL_PARAMETER: {}
    };

    // Parse URL parameters
    const sPageURL = decodeURIComponent(window.location.search.substring(1));
    const sURLVariables = sPageURL.split('&');
    sURLVariables.forEach(pair => {
        const [key, value] = pair.split('=');
        videoTour.URL_PARAMETER[key] = value;
    });

    // Build video URL based on parameters

    let videoSourceURL = '',
        defaultVideoSource = ``;
    const getSafeBucketUrl = () => {
        if (typeof BUCKET_URL === 'undefined' || !BUCKET_URL) return '';
        const safeBucketUrl = String(BUCKET_URL);
        if (window.location.protocol === 'https:' &&
            !window.location.hostname.includes('localhost') &&
            safeBucketUrl.indexOf('http://localhost/xmleditor/') === 0) {
            return `${window.location.origin}/xmleditor/`;
        }
        return safeBucketUrl;
    };
    if (videoTour.URL_PARAMETER.client) {
        // default fallback
        let v_name = ROLE_IDS.AU;
        if (videoTour.URL_PARAMETER.role && ROLE_IDS[videoTour.URL_PARAMETER.role]) {
            if (ROLE_IDS[videoTour.URL_PARAMETER.role]['tour'][videoTour.URL_PARAMETER.client] === 'role-wise') {
                v_name = videoTour.URL_PARAMETER.role;
            }
        }
        var basePrefix = `${getSafeBucketUrl()}_SUPPORT_FILES/${videoTour.URL_PARAMETER.client.toUpperCase()}/`;
        videoSourceURL = `${basePrefix}${v_name}.mp4`;
        defaultVideoSource = `${basePrefix}default.mp4`;
    }


    // Session identifier for this user view
    const localSessionTime = new Date().getTime();
    videoTour.record[localSessionTime] = [];

    // Grab video element and configure it
    const $video = document.querySelector('video');
    if (!$video) {
        console.error('Video element not found');
        return;
    }
    const $videoSource = $video.querySelector('source[type="video/mp4"]') || $video.querySelector('source');
    const setVideoSource = (src) => {
        if ($videoSource) {
            $videoSource.src = src;
        } else {
            $video.src = src;
        }
        $video.load();
    };
    const showVideoError = (message, primarySrc, fallbackSrc) => {
        console.error('[VideoTour] Video load failed', {
            primary: primarySrc,
            fallback: fallbackSrc,
            message: message
        });
        Swal.fire({
            icon: 'error',
            title: 'Video Not Found',
            text: message,
        });
    };
    const checkVideoExistsXHR = (url, onSuccess, onFail) => {
        if (!url) {
            onFail();
            return;
        }
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('HEAD', url, true);
            xhr.timeout = 12000;
            xhr.onreadystatechange = function() {
                if (xhr.readyState !== 4) return;
                if (xhr.status >= 200 && xhr.status < 400) {
                    onSuccess(url);
                } else {
                    onFail();
                }
            };
            xhr.onerror = onFail;
            xhr.onabort = onFail;
            xhr.ontimeout = onFail;
            xhr.send();
        } catch (error) {
            console.warn('[VideoTour] XHR HEAD check failed', error);
            onFail();
        }
    };

    const checkVideoExistsAjax = (url, onSuccess, onFail) => {
        if (!url) {
            onFail();
            return;
        }
        if (typeof $ === 'undefined' || typeof $.ajax !== 'function') {
            checkVideoExistsXHR(url, onSuccess, onFail);
            return;
        }
        $.ajax({
            url,
            type: 'HEAD',
            cache: false,
            timeout: 12000,
            success() {
                onSuccess(url);
            },
            error() {
                onFail();
            }
        });
    };

    (async function() {
        const primaryVideoSrc = videoSourceURL;
        const fallbackVideoSrc = defaultVideoSource;
        let isFallbackAttempted = false;
        let ReloadAttemptedCount = 0;

        // required for autoplay on most browsers
        $video.muted = true;
        $video.playsInline = true;
        $video.preload = 'metadata';

        // Attach analytics listeners
        $video.addEventListener('play', onRecordUpdate);
        $video.addEventListener('playing', function(event) {
            onRecordUpdate(event);
        });
        $video.addEventListener('pause', onRecordUpdate);
        $video.addEventListener('ended', onRecordUpdate);
        $video.addEventListener('error', function(event) {
            onRecordUpdate(event);
            if (!isFallbackAttempted && fallbackVideoSrc && fallbackVideoSrc !== primaryVideoSrc) {
                isFallbackAttempted = true;
                setVideoSource(fallbackVideoSrc);
                tryPlay();
                return;
            }
            if (ReloadAttemptedCount < 3) {
                ReloadAttemptedCount++;
                window.location.reload();
                return;
            }
            showVideoError('Neither the requested nor the default video file exists.', primaryVideoSrc, fallbackVideoSrc);
        });
        $video.addEventListener('timeupdate', onTimeUpdate);

        // Start as soon as the browser has enough metadata/data. Large videos may
        // never fire canplaythrough, so do not wait for the full file to buffer.

        const tryPlay = () => {
            $video.play().catch(err => {
                console.warn('Autoplay failed', err);
                if (retryCount < MAX_RETRIES) {
                    retryCount++;
                    retryTimer = setTimeout(tryPlay, 1500);
                } else {
                    console.error('Max autoplay retries reached');
                }
            });
        };

        $video.addEventListener('loadedmetadata', tryPlay, {
            once: true
        });
        $video.addEventListener('canplay', tryPlay, {
            once: true
        });

        // Fallback: user interaction (click) to start playback

        const enablePlayback = () => {
            tryPlay();
        };
        document.addEventListener('click', enablePlayback, {
            once: true
        });


        if (!primaryVideoSrc) {
            showVideoError('Client video source is not available.', primaryVideoSrc, fallbackVideoSrc);
            return;
        }
        checkVideoExistsAjax(primaryVideoSrc, function(validPrimarySrc) {
            setVideoSource(validPrimarySrc);
            tryPlay();
        }, function() {
            checkVideoExistsAjax(fallbackVideoSrc, function(validFallbackSrc) {
                isFallbackAttempted = true;
                setVideoSource(validFallbackSrc);
                tryPlay();
            }, function() {
                showVideoError('Neither the requested nor the default video file exists.', primaryVideoSrc, fallbackVideoSrc);
            });
        });
    })();
});