/* The final ten seconds use the same audio master gain as all game sounds. */
const RugbyCountdown = (() => {
    const active = new Set();
    function stop() {
        active.forEach(node => { try { node.stop(); } catch (_) {} });
        active.clear();
    }
    function play(seconds) {
        const ctx = Howler.ctx;
        if (!s_bAudioActive || Howler._muted || document.hidden || !ctx || ctx.state !== 'running' || !Howler.masterGain) return false;
        const tone = ctx.createOscillator();
        const gain = ctx.createGain();
        tone.type = 'sine';
        tone.frequency.value = seconds <= 3 ? 1120 : 880;
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(.22, now + .008);
        gain.gain.exponentialRampToValueAtTime(.001, now + .13);
        tone.connect(gain);
        gain.connect(Howler.masterGain);
        active.add(tone);
        tone.onended = () => { active.delete(tone); tone.disconnect(); gain.disconnect(); };
        tone.start(now);
        tone.stop(now + .15);
        return true;
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    return {play, stop};
})();

function CMatchHud(onAudioToggle, owner) {
    const root = new createjs.Container();
    root.name = 'match-hud';
    s_oStage.addChild(root);
    let previousSecond = null;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const panel = new createjs.Shape();
    panel.graphics.setStrokeStyle(1.5).beginStroke('#91a5b4')
        .beginLinearGradientFill(['#344b5b', '#152432', '#111d28'], [0, .5, 1], 0, 20, 0, 104)
        .drawRoundRect(14, 20, 612, 84, 25);
    panel.shadow = new createjs.Shadow('#0008', 0, 4, 8);
    root.addChild(panel);

    const alert = new createjs.Shape();
    alert.name = 'countdown-alert';
    alert.graphics.setStrokeStyle(3).beginStroke('#ff3047').beginFill('#b9092699').drawRoundRect(15, 21, 610, 82, 24);
    alert.alpha = 0;
    alert.mouseEnabled = false;
    root.addChild(alert);

    const scoreWell = new createjs.Shape();
    scoreWell.graphics.beginFill('#101d2b88').drawRoundRect(27, 33, 213, 58, 13);
    const rules = new createjs.Shape();
    rules.graphics.setStrokeStyle(1.3).beginStroke('#b6c1cb99').moveTo(247, 43).lineTo(247, 79)
        .moveTo(489, 43).lineTo(489, 79);
    rules.graphics.endStroke().beginFill('#ff243d').moveTo(128, 40).lineTo(139, 40).lineTo(126, 81).lineTo(116, 81).closePath();
    root.addChild(scoreWell, rules);
    function label(text, size, x, y, align, name) {
        const item = DolphinsTheme.label(text, size, align);
        item.set({x, y, name, mouseEnabled: false});
        root.addChild(item);
        return item;
    }
    label('SCORE', 27, 35, 62, 'left', 'score-label');
    const score = label('0', 39, 147, 62, 'left', 'score-value');
    score.maxWidth = 91;

    const timerPlate = new createjs.Shape();
    timerPlate.graphics.setStrokeStyle(2.5).beginStroke('#ff213b')
        .beginLinearGradientFill(['#253744', '#07121b'], [0, 1], 0, 32, 0, 91)
        .moveTo(291, 32).lineTo(435, 32).quadraticCurveTo(453, 32, 449, 47)
        .lineTo(441, 77).quadraticCurveTo(438, 91, 424, 91).lineTo(280, 91)
        .quadraticCurveTo(264, 91, 268, 77).lineTo(276, 47).quadraticCurveTo(280, 32, 291, 32).closePath();
    root.addChild(timerPlate);
    const timer = label('2:00', 47, 359, 62, 'center', 'match-timer');

    const badges = new createjs.Shape();
    badges.graphics.setStrokeStyle(1.3).beginStroke('#b9ccd8').beginFill('#172b3beF')
        .drawRoundRect(142, 117, 166, 37, 19).drawRoundRect(334, 117, 163, 37, 19);
    root.addChild(badges);
    const pin = new createjs.Shape();
    pin.graphics.beginFill('#edf3f8').moveTo(182, 125).bezierCurveTo(168, 125, 171, 138, 182, 147)
        .bezierCurveTo(193, 138, 196, 125, 182, 125).closePath()
        .beginFill('#172b3b').drawCircle(182, 132, 4);
    root.addChild(pin);
    const distance = label('22 m', 23, 239, 136, 'center', 'match-distance');
    distance.font = 'bold 23px Arial, sans-serif';
    const arrow = label('—', 31, 386, 135, 'center', 'match-wind-arrow');
    arrow.font = '27px Arial, sans-serif';
    const wind = label('0 m/s', 23, 446, 136, 'center', 'match-wind');
    wind.font = 'bold 23px Arial, sans-serif';

    function audioSprite() {
        const canvas = document.createElement('canvas');
        canvas.width = 124; canvas.height = 62;
        const ctx = canvas.getContext('2d');
        for (let muted = 0; muted < 2; muted++) {
            ctx.save(); ctx.translate(muted * 62, 0);
            const gradient = ctx.createLinearGradient(0, 0, 0, 62);
            gradient.addColorStop(0, '#354550'); gradient.addColorStop(1, '#0b1720');
            ctx.fillStyle = gradient; ctx.strokeStyle = '#e0e8ee'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.roundRect(1, 1, 60, 60, 17); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(15, 25); ctx.lineTo(23, 25);
            ctx.lineTo(31, 18); ctx.lineTo(31, 44); ctx.lineTo(23, 37); ctx.lineTo(15, 37); ctx.closePath(); ctx.fill();
            ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.beginPath();
            if (muted) { ctx.moveTo(39, 26); ctx.lineTo(47, 36); ctx.moveTo(47, 26); ctx.lineTo(39, 36); }
            else { ctx.arc(31, 31, 11, -.8, .8); ctx.moveTo(43, 18); ctx.arc(31, 31, 18, -.8, .8); }
            ctx.stroke(); ctx.restore();
        }
        return canvas;
    }
    this.audioToggle = null;
    if (!DISABLE_SOUND_MOBILE || !s_bMobile) {
        this.audioToggle = new CToggle(577, 62, audioSprite(), s_bAudioActive, root);
        this.audioToggle.addEventListener(ON_MOUSE_UP, onAudioToggle, owner);
    }
    this.setPosition = (x, y) => root.set({x, y});
    this.refreshScore = value => { score.text = String(value); };
    this.refreshConditions = (meters, speed) => {
        distance.text = meters + ' m';
        wind.text = Math.abs(speed) + ' m/s';
        arrow.text = speed > 0 ? '→' : speed < 0 ? '←' : '—';
    };
    this.refreshTime = ms => {
        const seconds = Math.max(0, Math.ceil(ms / 1000));
        timer.text = Math.floor(seconds / 60) + ':' + ('0' + seconds % 60).slice(-2);
        if (seconds === previousSecond) return;
        previousSecond = seconds;
        createjs.Tween.removeTweens(alert);
        createjs.Tween.removeTweens(timer);
        timer.scaleX = timer.scaleY = 1;
        const lastTen = seconds > 0 && seconds <= 10;
        timer.color = lastTen ? '#ff7584' : '#fff';
        alert.alpha = lastTen ? .48 : 0;
        if (lastTen) {
            if (!reducedMotion) {
                createjs.Tween.get(alert).to({alpha: .86}, 100).to({alpha: .22}, 650);
                createjs.Tween.get(timer).to({scaleX: 1.08, scaleY: 1.08}, 100).to({scaleX: 1, scaleY: 1}, 220);
            }
            RugbyCountdown.play(seconds);
        } else RugbyCountdown.stop();
    };
    this.unload = () => {
        RugbyCountdown.stop();
        createjs.Tween.removeTweens(alert); createjs.Tween.removeTweens(timer);
        if (this.audioToggle) this.audioToggle.unload();
        s_oStage.removeChild(root);
    };
}
