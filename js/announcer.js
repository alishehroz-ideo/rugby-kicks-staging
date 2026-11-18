/* Short female cheers generated in Runway; local files also work offline. */
const RugbyAnnouncer = (() => {
    const files = {"PERFECT!": "perfect", "GOAL!": "goal", "GREAT!": "great", "MISS!": "try_again", "POST HIT!": "try_again"};
    const sounds = {};
    let active = null;
    let background = [];

    function restore() {
        background.forEach(item => item.sound.volume(item.volume));
        background = [];
    }

    function stop() {
        const previous = active;
        active = null;
        if (previous) previous.stop();
        restore();
    }

    function init() {
        Object.values(files).forEach(key => {
            if (sounds[key]) return;
            const sound = new Howl({
                src: [rugbyAsset('./sounds/voice_' + key + '.mp3')],
                format: ['mp3'], volume: 1, preload: true,
                onend: () => { if (active === sound) { active = null; restore(); } },
                onplayerror: () => { if (active === sound) stop(); }
            });
            sounds[key] = sound;
        });
    }

    function play(label) {
        stop();
        const sound = sounds[files[label]];
        // Never queue a delayed cheer if audio is muted or has not loaded yet.
        if (!s_bAudioActive || !sound || sound.state() !== 'loaded') return;
        ['crowd', 'soundtrack'].forEach(key => {
            const bed = s_aSounds[key];
            if (!bed) return;
            const volume = bed.volume();
            background.push({sound: bed, volume: volume});
            bed.volume(volume * .22);
        });
        active = sound;
        sound.play();
    }

    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    return {init, play, stop};
})();
