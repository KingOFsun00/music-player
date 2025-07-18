// =============================================
// Player de Música Avançado - Versão Aprimorada
// =============================================

const AudioPlayer = (() => {
    // --- Estado da Aplicação ---
    const state = {
        playlist: [
            { title: "A Via Láctea", artist: "Legião Urbana", duration: "4:00", src: "./musicas/A Via Láctea.mp3" },
            { title: "La Solitudine", artist: "Laura Pausini", duration: "4:00", src: "./musicas/La Solitudine.mp3" },
            { title: "Trem Bala", artist: "Ana Vilela", duration: "3:00", src: "./musicas/Trem Bala.mp3" },
            { title: "Moonlight", artist: "XXXTENTACION", duration: "2:15", src: "./musicas/MOONLIGHT.mp3" },
            { title: "Não Existe Amor Em SP", artist: "Criolo", duration: "3:45", src: "./musicas/criolo.mp3" },
            { title: "Vento no Litoral", artist: "Legião Urbana", duration: "6:00", src: "./musicas/vento no litoral.mp3" }
        ],
        currentTrackIndex: 0,
        isPlaying: false,
        currentLanguage: 'pt',
        theme: 'light',
        audioContext: null,
        drumAudioContext: null,
        visualizerColorStart: '#4ECDC4',
        visualizerColorEnd: '#C7F464'
    };

    // --- Elementos do DOM ---
    const elements = {
        visualizerCanvas: document.getElementById('visualizer'),
        currentTrackTitle: document.getElementById('current-track'),
        currentTrackArtist: document.getElementById('current-artist'),
        progressBar: document.getElementById('progress-bar'),
        progressContainer: document.getElementById('progress-container'),
        currentTimeSpan: document.getElementById('current-time'),
        totalTimeSpan: document.getElementById('total-time'),
        playPauseBtn: document.getElementById('play-pause-btn'),
        playIcon: document.getElementById('play-icon'),
        prevBtn: document.getElementById('prev-btn'),
        nextBtn: document.getElementById('next-btn'),
        playlistContainer: document.getElementById('playlist'),
        albumArtEl: document.querySelector('.album-art'),
        equalizerControlsDiv: document.getElementById('equalizer-controls'),
        eqPresetSelect: document.getElementById('eq-preset-select'),
        track1Select: document.getElementById('track1-select'),
        track2Select: document.getElementById('track2-select'),
        track1VolumeSlider: document.getElementById('track1-volume'),
        track2VolumeSlider: document.getElementById('track2-volume'),
        track1PlayPauseBtn: document.getElementById('track1-play-pause'),
        track2PlayPauseBtn: document.getElementById('track2-play-pause'),
        drumPads: document.querySelectorAll('.drum-pad'),
        colorBoxes: document.querySelectorAll('.color-box'),
        noiseReductionBtn: document.getElementById('noise-reduction-btn'),
        reverbBtn: document.getElementById('reverb-btn'),
        echoBtn: document.getElementById('echo-btn')
    };

    // --- Classes para Gerenciamento de Áudio ---
    class AudioTrack {
        constructor(context, eqFrequencies) {
            this.audioElement = new Audio();
            this.sourceNode = context.createMediaElementSource(this.audioElement);
            this.gainNode = context.createGain();
            this.filters = this.createEQFilters(context, eqFrequencies);
            this.connected = false;
            
            // Configura volume inicial
            this.gainNode.gain.value = 0.8;
            
            // Conecta a cadeia de áudio
            this.connectChain();
        }
        
        createEQFilters(context, frequencies) {
            return frequencies.map(freq => {
                const filter = context.createBiquadFilter();
                filter.type = 'peaking';
                filter.frequency.value = freq;
                filter.Q.value = 1;
                filter.gain.value = 0;
                return filter;
            });
        }
        
        connectChain() {
            if (this.connected) return;
            
            // Conecta a fonte ao primeiro filtro
            this.sourceNode.connect(this.filters[0]);
            
            // Conecta os filtros em série
            for (let i = 0; i < this.filters.length - 1; i++) {
                this.filters[i].connect(this.filters[i + 1]);
            }
            
            // Conecta o último filtro ao nó de ganho
            this.filters[this.filters.length - 1].connect(this.gainNode);
            
            this.connected = true;
        }
        
        connectTo(destination) {
            this.gainNode.connect(destination);
        }
        
        disconnect() {
            if (!this.connected) return;
            this.gainNode.disconnect();
            this.connected = false;
        }
        
        async play() {
            try {
                if (state.audioContext.state === 'suspended') {
                    await state.audioContext.resume();
                }
                await this.audioElement.play();
                return true;
            } catch (error) {
                console.error('Erro ao reproduzir:', error);
                return false;
            }
        }
        
        pause() {
            this.audioElement.pause();
        }
        
        setVolume(value) {
            this.gainNode.gain.value = value;
        }
        
        setEQBand(index, gainValue) {
            if (this.filters[index]) {
                this.filters[index].gain.value = gainValue;
            }
        }
    }

    // --- Instâncias de Áudio ---
    let audioTrack1, audioTrack2;
    let analyser, compressor, lowPassFilter, convolverNode, delayNode;
    const eqFrequencies = [60, 250, 1000, 4000, 16000];
    
    // Predefinições do Equalizador
    const eqPresets = {
        "Padrão (Flat)": [0, 0, 0, 0, 0],
        "Grave": [8, 4, 0, -2, -4],
        "Médio": [0, 2, 6, 2, 0],
        "Acústico": [2, 4, 3, 1, 0],
        "Rock": [6, 0, -4, 2, 5],
        "Pop": [4, 2, 0, 3, 1],
        "Vocal": [-2, 0, 5, 4, 2]
    };

    // --- Funções Principais ---
    function initializeAudioContext() {
        if (state.audioContext) return;
        
        state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        state.drumAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Cria nós de efeitos globais
        analyser = state.audioContext.createAnalyser();
        analyser.fftSize = 2048;
        
        compressor = state.audioContext.createDynamicsCompressor();
        compressor.threshold.value = -20;
        compressor.knee.value = 30;
        compressor.ratio.value = 12;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;
        
        lowPassFilter = state.audioContext.createBiquadFilter();
        lowPassFilter.type = 'lowpass';
        lowPassFilter.frequency.value = 5000;
        lowPassFilter.Q.value = 1;
        
        // Inicializa as faixas de áudio
        audioTrack1 = new AudioTrack(state.audioContext, eqFrequencies);
        audioTrack2 = new AudioTrack(state.audioContext, eqFrequencies);
        
        // Conecta as faixas à cadeia de efeitos globais
        audioTrack1.connectTo(lowPassFilter);
        audioTrack2.connectTo(lowPassFilter);
        
        lowPassFilter.connect(compressor);
        compressor.connect(analyser);
        analyser.connect(state.audioContext.destination);
        
        // Inicializa nós para efeitos (não conectados por padrão)
        convolverNode = state.audioContext.createConvolver();
        delayNode = state.audioContext.createDelay(1.0);
        
        console.log('Sistema de áudio inicializado');
    }

    async function loadTrack(audioTrack, trackIndex, trackId) {
        const track = state.playlist[trackIndex];
        audioTrack.audioElement.src = track.src;
        
        try {
            await audioTrack.audioElement.load();
            console.log(`Carregada: ${track.title} em ${trackId}`);
            
            if (trackId === 'track1') {
                updateMainTrackInfo(track, trackIndex);
            }
            
            // Atualiza o volume conforme o slider
            if (trackId === 'track1') {
                audioTrack.setVolume(elements.track1VolumeSlider.value);
            } else if (trackId === 'track2') {
                audioTrack.setVolume(elements.track2VolumeSlider.value);
            }
            
            return true;
        } catch (error) {
            console.error(`Erro ao carregar ${track.title}:`, error);
            return false;
        }
    }

    function updateMainTrackInfo(track, trackIndex) {
        elements.currentTrackTitle.textContent = track.title;
        elements.currentTrackArtist.textContent = track.artist;
        
        // Atualiza a arte do álbum
        if (elements.albumArtEl) {
            elements.albumArtEl.classList.remove('color-1', 'color-2', 'color-3', 'color-4', 'color-5');
            elements.albumArtEl.classList.add(`color-${(trackIndex % 5) + 1}`);
        }
    }

    async function togglePlayPause() {
        if (!state.audioContext) {
            initializeAudioContext();
            await loadTrack(audioTrack1, state.currentTrackIndex, 'track1');
        }
        
        if (audioTrack1.audioElement.paused) {
            const success = await audioTrack1.play();
            if (success) {
                state.isPlaying = true;
                elements.playIcon.classList.replace('fa-play', 'fa-pause');
                updatePlaylistUI();
            }
        } else {
            audioTrack1.pause();
            state.isPlaying = false;
            elements.playIcon.classList.replace('fa-pause', 'fa-play');
            updatePlaylistUI();
        }
    }

    async function playNextTrack() {
        state.currentTrackIndex = (state.currentTrackIndex + 1) % state.playlist.length;
        await loadTrack(audioTrack1, state.currentTrackIndex, 'track1');
        const success = await audioTrack1.play();
        if (success) {
            state.isPlaying = true;
            elements.playIcon.classList.replace('fa-play', 'fa-pause');
            updatePlaylistUI();
        }
    }

    async function playPrevTrack() {
        state.currentTrackIndex = (state.currentTrackIndex - 1 + state.playlist.length) % state.playlist.length;
        await loadTrack(audioTrack1, state.currentTrackIndex, 'track1');
        const success = await audioTrack1.play();
        if (success) {
            state.isPlaying = true;
            elements.playIcon.classList.replace('fa-play', 'fa-pause');
            updatePlaylistUI();
        }
    }

    function updateProgressBar() {
        const { duration, currentTime } = audioTrack1.audioElement;
        const progressPercent = (currentTime / duration) * 100;
        elements.progressBar.style.width = `${progressPercent}%`;
        
        // Atualiza o buffer carregado
        if (audioTrack1.audioElement.buffered.length > 0) {
            const bufferedEnd = audioTrack1.audioElement.buffered.end(audioTrack1.audioElement.buffered.length - 1);
            const bufferedPercent = (bufferedEnd / duration) * 100;
            elements.progressBar.style.setProperty('--buffered', `${bufferedPercent}%`);
        }
        
        // Formata o tempo atual
        let currentMinutes = Math.floor(currentTime / 60);
        let currentSeconds = Math.floor(currentTime % 60);
        if (currentSeconds < 10) currentSeconds = `0${currentSeconds}`;
        elements.currentTimeSpan.textContent = `${currentMinutes}:${currentSeconds}`;
        
        // Formata o tempo total
        if (duration && !isNaN(duration)) {
            let totalMinutes = Math.floor(duration / 60);
            let totalSeconds = Math.floor(duration % 60);
            if (totalSeconds < 10) totalSeconds = `0${totalSeconds}`;
            elements.totalTimeSpan.textContent = `${totalMinutes}:${totalSeconds}`;
        } else {
            elements.totalTimeSpan.textContent = '0:00';
        }
    }

    function setProgressBar(e) {
        const width = this.clientWidth;
        const clickX = e.offsetX;
        const duration = audioTrack1.audioElement.duration;
        
        if (!isNaN(duration)) {
            audioTrack1.audioElement.currentTime = (clickX / width) * duration;
        }
    }

    // --- Visualizador de Áudio ---
    function drawVisualizer() {
        requestAnimationFrame(drawVisualizer);
        
        if (!analyser || (state.audioContext && state.audioContext.state === 'suspended')) return;
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);
        
        const ctx = elements.visualizerCanvas.getContext('2d');
        ctx.clearRect(0, 0, elements.visualizerCanvas.width, elements.visualizerCanvas.height);
        
        // Fundo com gradiente e opacidade para efeito de rastro
        const bgGradient = ctx.createLinearGradient(0, 0, elements.visualizerCanvas.width, elements.visualizerCanvas.height);
        bgGradient.addColorStop(0, state.visualizerColorStart);
        bgGradient.addColorStop(1, state.visualizerColorEnd);
        ctx.fillStyle = bgGradient;
        ctx.globalAlpha = 0.2;
        ctx.fillRect(0, 0, elements.visualizerCanvas.width, elements.visualizerCanvas.height);
        ctx.globalAlpha = 1.0;
        
        // Configurações responsivas
        const barCount = 64; // Número fixo de barras para melhor performance
        const barWidth = elements.visualizerCanvas.width / barCount * 0.8;
        const gap = elements.visualizerCanvas.width / barCount * 0.2;
        
        for (let i = 0; i < barCount; i++) {
            const barIndex = Math.floor((i / barCount) * bufferLength);
            const barHeight = (dataArray[barIndex] / 255) * elements.visualizerCanvas.height * 0.8;
            
            // Gradiente dinâmico
            const gradient = ctx.createLinearGradient(0, elements.visualizerCanvas.height, 0, elements.visualizerCanvas.height - barHeight);
            gradient.addColorStop(0, state.visualizerColorStart);
            gradient.addColorStop(1, state.visualizerColorEnd);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(
                i * (barWidth + gap),
                elements.visualizerCanvas.height - barHeight,
                barWidth,
                barHeight
            );
            
            // Efeito de brilho
            ctx.fillStyle = `rgba(255, 255, 255, ${dataArray[barIndex] / 510})`;
            ctx.fillRect(
                i * (barWidth + gap),
                elements.visualizerCanvas.height - barHeight,
                barWidth,
                2
            );
        }
    }

    // --- Equalizador ---
    function createEqualizerSliders() {
        elements.equalizerControlsDiv.innerHTML = '';
        
        eqFrequencies.forEach((freq, index) => {
            const eqBand = document.createElement('div');
            eqBand.classList.add('eq-band');
            eqBand.innerHTML = `
                <span class="eq-band-label">${freq >= 1000 ? `${freq / 1000}K` : freq} Hz</span>
                <input type="range" min="-12" max="12" value="0" step="0.1" class="eq-band-slider" data-band-index="${index}">
                <span class="eq-band-value" id="eq-band-${index}-value">0 dB</span>
            `;
            elements.equalizerControlsDiv.appendChild(eqBand);
        });
        
        // Event listeners para os sliders
        document.querySelectorAll('.eq-band-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const index = parseInt(e.target.dataset.bandIndex);
                const gainValue = parseFloat(e.target.value);
                
                audioTrack1.setEQBand(index, gainValue);
                audioTrack2.setEQBand(index, gainValue);
                
                document.getElementById(`eq-band-${index}-value`).textContent = `${gainValue.toFixed(1)} dB`;
                elements.eqPresetSelect.value = "Personalizado";
            });
        });
    }

    function populateEqPresets() {
        elements.eqPresetSelect.innerHTML = '';
        
        const customOption = document.createElement('option');
        customOption.value = "Personalizado";
        customOption.textContent = "Personalizado";
        elements.eqPresetSelect.appendChild(customOption);
        
        for (const presetName in eqPresets) {
            const option = document.createElement('option');
            option.value = presetName;
            option.textContent = presetName;
            elements.eqPresetSelect.appendChild(option);
        }
        
        elements.eqPresetSelect.addEventListener('change', (e) => {
            if (e.target.value !== "Personalizado") {
                applyEqPreset(e.target.value);
            }
        });
    }

    function applyEqPreset(presetName) {
        const gains = eqPresets[presetName];
        if (!gains) return;
        
        document.querySelectorAll('.eq-band-slider').forEach((slider, index) => {
            const gainValue = gains[index];
            slider.value = gainValue;
            document.getElementById(`eq-band-${index}-value`).textContent = `${gainValue.toFixed(1)} dB`;
            
            audioTrack1.setEQBand(index, gainValue);
            audioTrack2.setEQBand(index, gainValue);
        });
    }

    // --- Playlist ---
    function populatePlaylist() {
        elements.playlistContainer.innerHTML = '';
        
        state.playlist.forEach((track, index) => {
            const playlistItem = document.createElement('div');
            playlistItem.classList.add('playlist-item');
            playlistItem.dataset.index = index;
            
            const colorClass = `color-${(index % 5) + 1}`;
            
            playlistItem.innerHTML = `
                <div class="playlist-art ${colorClass}">
                    <i class="fas fa-headphones"></i>
                </div>
                <div class="playlist-info">
                    <div class="playlist-track">${track.title}</div>
                    <div class="playlist-artist">${track.artist}</div>
                </div>
                <div class="playlist-duration">${track.duration}</div>
            `;
            
            playlistItem.addEventListener('click', async () => {
                state.currentTrackIndex = index;
                await loadTrack(audioTrack1, state.currentTrackIndex, 'track1');
                const success = await audioTrack1.play();
                if (success) {
                    state.isPlaying = true;
                    elements.playIcon.classList.replace('fa-play', 'fa-pause');
                    updatePlaylistUI();
                }
            });
            
            elements.playlistContainer.appendChild(playlistItem);
        });
    }

    function updatePlaylistUI() {
        document.querySelectorAll('.playlist-item').forEach(item => {
            item.classList.remove('playing');
        });
        
        const playingItem = document.querySelector(`.playlist-item[data-index="${state.currentTrackIndex}"]`);
        if (playingItem) {
            playingItem.classList.add('playing');
        }
    }

    // --- Drum Pad ---
    async function playDrumSound(soundSrc) {
        if (!state.drumAudioContext || state.drumAudioContext.state === 'closed') {
            state.drumAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        if (state.drumAudioContext.state === 'suspended') {
            await state.drumAudioContext.resume();
        }
        
        try {
            const response = await fetch(soundSrc);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await state.drumAudioContext.decodeAudioData(arrayBuffer);
            
            const source = state.drumAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(state.drumAudioContext.destination);
            source.start(0);
        } catch (error) {
            console.error("Erro no Drum Pad:", error);
        }
    }

    function animateDrumPad(pad) {
        pad.classList.add('playing');
        setTimeout(() => pad.classList.remove('playing'), 100);
    }

    // --- Efeitos de Áudio ---
    async function toggleNoiseReduction() {
        if (!lowPassFilter) return;
        
        if (elements.noiseReductionBtn.classList.toggle('active')) {
            elements.noiseReductionBtn.textContent = 'Desativar';
            lowPassFilter.frequency.value = 3000;
        } else {
            elements.noiseReductionBtn.textContent = 'Ativar';
            lowPassFilter.frequency.value = 5000;
        }
    }

    async function toggleReverb() {
        if (!convolverNode) return;
        
        if (elements.reverbBtn.classList.toggle('active')) {
            elements.reverbBtn.textContent = 'Desativar';
            
            // Tenta carregar um impulso de reverb se ainda não estiver carregado
            if (!convolverNode.buffer) {
                try {
                    const response = await fetch('./impulses/hall-reverb.wav');
                    const arrayBuffer = await response.arrayBuffer();
                    convolverNode.buffer = await state.audioContext.decodeAudioData(arrayBuffer);
                    
                    // Reconecta a cadeia de áudio com o reverb
                    audioTrack1.disconnect();
                    audioTrack1.connectTo(convolverNode);
                    convolverNode.connect(lowPassFilter);
                } catch (error) {
                    console.error("Erro ao carregar reverb:", error);
                    elements.reverbBtn.classList.remove('active');
                    return;
                }
            }
        } else {
            elements.reverbBtn.textContent = 'Ativar';
            
            // Reconecta sem o reverb
            audioTrack1.disconnect();
            audioTrack1.connectTo(lowPassFilter);
        }
    }

    function toggleEcho() {
        if (!delayNode) return;
        
        if (elements.echoBtn.classList.toggle('active')) {
            elements.echoBtn.textContent = 'Desativar';
            
            // Configura o echo
            delayNode.delayTime.value = 0.5;
            const feedbackGain = state.audioContext.createGain();
            feedbackGain.gain.value = 0.6;
            
            // Reconecta com o echo
            audioTrack1.disconnect();
            audioTrack1.connectTo(delayNode);
            delayNode.connect(lowPassFilter);
            delayNode.connect(feedbackGain);
            feedbackGain.connect(delayNode); // Loop de feedback
        } else {
            elements.echoBtn.textContent = 'Ativar';
            
            // Reconecta sem o echo
            audioTrack1.disconnect();
            audioTrack1.connectTo(lowPassFilter);
        }
    }

    // --- UI/UX Melhorias ---
    function setupHapticFeedback() {
        if ('vibrate' in navigator) {
            document.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', () => navigator.vibrate(10));
            });
        }
    }

    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Evita conflito quando digitando em inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    togglePlayPause();
                    break;
                case 'ArrowRight':
                    playNextTrack();
                    break;
                case 'ArrowLeft':
                    playPrevTrack();
                    break;
                case 'KeyM':
                    toggleMute();
                    break;
            }
        });
    }

    function toggleMute() {
        if (audioTrack1) {
            const isMuted = audioTrack1.gainNode.gain.value === 0;
            audioTrack1.setVolume(isMuted ? elements.track1VolumeSlider.value : 0);
            elements.track1VolumeSlider.value = isMuted ? elements.track1VolumeSlider.dataset.lastVolume || 0.8 : 0;
        }
    }

    function setupTheme() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        state.theme = prefersDark ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', state.theme);
    }

    // --- Inicialização ---
    function initEventListeners() {
        // Player principal
        elements.playPauseBtn.addEventListener('click', togglePlayPause);
        elements.prevBtn.addEventListener('click', playPrevTrack);
        elements.nextBtn.addEventListener('click', playNextTrack);
        elements.progressContainer.addEventListener('click', setProgressBar);
        
        // Eventos do elemento de áudio
        audioTrack1.audioElement.addEventListener('timeupdate', updateProgressBar);
        audioTrack1.audioElement.addEventListener('ended', playNextTrack);
        audioTrack1.audioElement.addEventListener('loadedmetadata', updateProgressBar);
        
        // Multi-faixa
        elements.track1Select.addEventListener('change', async (e) => {
            const selectedIndex = parseInt(e.target.value);
            await loadTrack(audioTrack1, selectedIndex, 'track1');
            if (state.isPlaying) await audioTrack1.play();
        });
        
        elements.track2Select.addEventListener('change', async (e) => {
            const selectedIndex = parseInt(e.target.value);
            await loadTrack(audioTrack2, selectedIndex, 'track2');
        });
        
        // Volumes
        elements.track1VolumeSlider.addEventListener('input', (e) => {
            if (audioTrack1) audioTrack1.setVolume(parseFloat(e.target.value));
            e.target.dataset.lastVolume = e.target.value;
        });
        
        elements.track2VolumeSlider.addEventListener('input', (e) => {
            if (audioTrack2) audioTrack2.setVolume(parseFloat(e.target.value));
        });
        
        // Botões de play/pause independentes
        elements.track1PlayPauseBtn.addEventListener('click', async () => {
            if (audioTrack1.audioElement.paused) {
                await audioTrack1.play();
                elements.track1PlayPauseBtn.querySelector('i').classList.replace('fa-play', 'fa-pause');
                state.isPlaying = true;
                elements.playIcon.classList.replace('fa-play', 'fa-pause');
            } else {
                audioTrack1.pause();
                elements.track1PlayPauseBtn.querySelector('i').classList.replace('fa-pause', 'fa-play');
                state.isPlaying = false;
                elements.playIcon.classList.replace('fa-pause', 'fa-play');
            }
            updatePlaylistUI();
        });
        
        elements.track2PlayPauseBtn.addEventListener('click', async () => {
            if (audioTrack2.audioElement.paused) {
                await audioTrack2.play();
                elements.track2PlayPauseBtn.querySelector('i').classList.replace('fa-play', 'fa-pause');
            } else {
                audioTrack2.pause();
                elements.track2PlayPauseBtn.querySelector('i').classList.replace('fa-pause', 'fa-play');
            }
        });
        
        // Drum Pad
        elements.drumPads.forEach(pad => {
            pad.addEventListener('click', () => {
                const soundSrc = pad.dataset.sound;
                if (soundSrc) {
                    playDrumSound(soundSrc);
                    animateDrumPad(pad);
                }
            });
        });
        
        // Atalhos de teclado para Drum Pad
        document.addEventListener('keydown', (e) => {
            const pad = document.querySelector(`.drum-pad[data-key="${e.keyCode}"]`);
            if (pad) {
                const soundSrc = pad.dataset.sound;
                if (soundSrc) {
                    playDrumSound(soundSrc);
                    animateDrumPad(pad);
                }
            }
        });
        
        // Paleta de Cores
        elements.colorBoxes.forEach(colorBox => {
            colorBox.addEventListener('click', () => {
                const colors = colorBox.dataset.color.split(',');
                if (colors.length === 2) {
                    state.visualizerColorStart = colors[0].trim();
                    state.visualizerColorEnd = colors[1].trim();
                }
            });
        });
        
        // Efeitos
        elements.noiseReductionBtn.addEventListener('click', toggleNoiseReduction);
        elements.reverbBtn.addEventListener('click', toggleReverb);
        elements.echoBtn.addEventListener('click', toggleEcho);
        
        // Gerenciamento de recursos
        window.addEventListener('beforeunload', cleanup);
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(resizeVisualizer, 200);
        });
    }

    function populateTrackSelectors() {
        elements.track1Select.innerHTML = '';
        elements.track2Select.innerHTML = '';
        
        state.playlist.forEach((track, index) => {
            const option1 = document.createElement('option');
            option1.value = index;
            option1.textContent = `${track.title} - ${track.artist}`;
            elements.track1Select.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = index;
            option2.textContent = `${track.title} - ${track.artist}`;
            elements.track2Select.appendChild(option2);
        });
        
        elements.track1Select.value = 0;
        elements.track2Select.value = 1 % state.playlist.length;
        
        // Carrega as faixas iniciais
        loadTrack(audioTrack1, 0, 'track1');
        loadTrack(audioTrack2, 1 % state.playlist.length, 'track2');
    }

    function resizeVisualizer() {
        const container = elements.visualizerCanvas.parentElement;
        elements.visualizerCanvas.width = container.clientWidth;
        elements.visualizerCanvas.height = container.clientHeight;
    }

    function cleanup() {
        // Para e limpa todos os recursos de áudio
        if (audioTrack1) {
            audioTrack1.audioElement.pause();
            audioTrack1.audioElement.src = '';
            audioTrack1.disconnect();
        }
        
        if (audioTrack2) {
            audioTrack2.audioElement.pause();
            audioTrack2.audioElement.src = '';
            audioTrack2.disconnect();
        }
        
        if (state.audioContext && state.audioContext.state !== 'closed') {
            state.audioContext.close();
        }
        
        if (state.drumAudioContext && state.drumAudioContext.state !== 'closed') {
            state.drumAudioContext.close();
        }
    }

    // --- Inicialização Pública ---
    function init() {
        initializeAudioContext();
        populatePlaylist();
        createEqualizerSliders();
        populateEqPresets();
        applyEqPreset("Padrão (Flat)");
        populateTrackSelectors();
        drawVisualizer();
        initEventListeners();
        setupHapticFeedback();
        setupKeyboardShortcuts();
        setupTheme();
        resizeVisualizer();
        
        console.log('Player de música inicializado');
    }

    // Expõe métodos públicos
    return {
        init,
        togglePlayPause,
        playNextTrack,
        playPrevTrack
    };
})();

// Inicializa o player quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', AudioPlayer.init);