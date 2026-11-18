/* Local tournament UI. All game assets and scores remain on this browser. */
const RugbyTournament = (() => {
    const key = 'rugby-kicks-120-progressive-v1-ranking';
    const duration = 120000;
    let dialog;
    let records = [];
    let persistent = true;
    try {
        const data = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(data)) records = data.filter(row => row && typeof row.name === 'string' &&
            Number.isFinite(row.score) && Number.isFinite(row.greens) && Number.isFinite(row.attempts)).slice(0, 10);
    } catch (_) { persistent = false; }

    function close() {
        if (dialog && dialog.open) dialog.close();
    }

    function open(markup) {
        if (!dialog) {
            dialog = document.createElement('dialog');
            dialog.className = 'tournament';
            dialog.setAttribute('aria-labelledby', 'tournament-title');
            dialog.addEventListener('cancel', event => event.preventDefault());
            document.body.append(dialog);
        }
        close();
        dialog.innerHTML = markup;
        dialog.showModal();
        return dialog;
    }

    function ready(game) {
        const panel = open(`
            <p class="eyebrow">RUGBY KICKS / SCORE TOURNAMENT</p>
            <h1 id="tournament-title">120 SECOND CHALLENGE</h1>
            <p>Tap, click, or press Space to set your <strong>direction</strong>, then your <strong>power</strong>.</p>
            <p><strong>Wind:</strong> Aim against the arrow.<br><strong>Distance:</strong> Use more power for longer kicks. Higher on the vertical meter means more power. The markers help you adjust your aim.</p>
            <p class="points"><span>GREEN <b>500</b></span><span>YELLOW <b>200</b></span><span>RED <b>100</b></span></p>
            <p class="small">Each round gets harder: longer kicks, stronger winds, faster meters. Lock in your power before time runs out for your final kick to count.</p>
            <button class="primary" id="round-start" type="button" autofocus>START 120 SECOND ROUND</button>
            <button id="round-back" type="button">BACK TO TITLE</button>`);
        panel.querySelector('#round-start').onclick = () => game.startRound();
        panel.querySelector('#round-back').onclick = () => game.onExit();
    }

    function result(game, stats) {
        const panel = open(`
            <p class="eyebrow">RUGBY KICKS / FINAL SCORE</p>
            <h1 id="tournament-title">TIME'S UP!</h1>
            <p class="total"><strong>${stats.score.toLocaleString('en-US')}</strong> PTS</p>
            <p class="small">Kicks: ${stats.attempts} / Scoring kicks: ${stats.hits} / Perfect: ${stats.greens}</p>
            <form id="round-save">
                <label for="round-name">Player name</label>
                <div class="row"><input id="round-name" maxlength="20" placeholder="Player name" autocomplete="off">
                <button class="primary" type="submit">SAVE SCORE</button></div>
            </form>
            <p id="round-status" class="small" role="status"></p>
            <h2>LOCAL LEADERBOARD</h2>
            <p class="small">Highest score wins. Ties are ranked by perfect kicks; identical results share a rank.</p>
            <div class="ranking"><ol id="round-ranking"></ol></div>
            <div class="row actions">
                <button id="round-retry" type="button">PLAY AGAIN</button>
                <button id="round-home" type="button">TITLE</button>
            </div>`);
        const list = panel.querySelector('#round-ranking');
        const status = panel.querySelector('#round-status');
        const form = panel.querySelector('#round-save');
        const name = panel.querySelector('#round-name');
        function render() {
            list.replaceChildren();
            let rank = 0;
            records.forEach((row, index) => {
                if (index === 0 || row.score !== records[index-1].score || row.greens !== records[index-1].greens) rank = index + 1;
                const li = document.createElement('li');
                li.value = rank;
                li.textContent = row.name + ' / ' + row.score.toLocaleString('en-US') + ' pts (Perfect: ' + row.greens + ')';
                list.append(li);
            });
            if (!records.length) {
                const li = document.createElement('li');
                li.textContent = 'No scores yet';
                li.className = 'empty';
                list.append(li);
            }
        }
        let saved = false;
        form.onsubmit = event => {
            event.preventDefault();
            if (saved) return;
            saved = true;
            records.push({...stats, name: name.value.trim() || 'Guest'});
            records.sort((a, b) => b.score - a.score || b.greens - a.greens);
            records = records.slice(0, 10);
            try { localStorage.setItem(key, JSON.stringify(records)); } catch (_) { persistent = false; }
            form.querySelector('button').disabled = true;
            name.readOnly = true;
            status.textContent = persistent ? 'Score saved. The leaderboard shows the top 10.' : 'Scores will be kept until you close this tab.';
            render();
        };
        panel.querySelector('#round-retry').onclick = () => game.restartGame();
        panel.querySelector('#round-home').onclick = () => game.onExit();
        render();
    }
    return Object.freeze({duration, ready, result, close});
})();
