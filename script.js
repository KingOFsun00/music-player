// =============================================
// DJ Mixer Pro - Sistema Avançado de Áudio
// Versão Otimizada para GitHub Pages
// =============================================

class DJMixerPro {
    constructor() {
        this.state = {
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
            isShuffled: false,
            isLooping: false,
            volume: 0.8,
            theme: 'dark',
            visualizerEnabled: true,
            visualizerColors: {
                start: '#4ECDC4',
                end: '#C7F464'
            },
            effects: {
                noiseReduction: false,
                reverb: false,
                echo: false,
                flanger: false,
                phaser: false,
                compressor: false
            }
        };

        this.audioContext = null;
        this.drumAudioContext = null;
        this.audioTracks = {};
        this.analyser = null;
        this.visualizerAnimationId = null;
        this.eqFrequencies = [60, 250, 1000, 4000, 16000];
        this.drumSounds = new Map();
        
        this.eqPresets = {
            "Padrão (Flat)": [0, 0, 0, 0, 0],
            "Grave": [8, 4, 0, -2, -4],
            "Médio": [0, 2, 6, 2, 0],
            "Acústico": [2, 4, 3, 1, 0],
            "Rock": [6, 0, -4, 2, 5],
            "Pop": [4, 2, 0, 3, 1],
            "Vocal": [-2, 0, 5, 4, 2],
            "Eletrônico": [5, 3, 0, 2, 4],
            "Jazz": [3, 2, -1, 2, 3],
            "Clássico": [0, 0, 0, 0, 0]
        };

        this.init();
    }

    // ==========================================
    // INICIALIZAÇÃO
    // ==========================================

    async init() {
        try {
            this.showLoadingScreen();
            await this.initializeAudioSystem();
            this.initializeElements();
            this.setupEventListeners();
            this.setupKeyboardShortcuts();
            this.loadUserPreferences();
            this.populateUI();
            this.startVisualizer();
            this.hideLoadingScreen();
            
            console.log('🎵 DJ Mixer Pro inicializado com sucesso!');
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            this.showError('Erro ao inicializar o sistema de áudio. Verifique se seu navegador suporta Web Audio API.');
        }
    }

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const app = document.getElementById('app');
        
        setTimeout(() => {
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }
            if (app) {
                app.style.display = 'block';
                app.classList.add('fade-in');
            }
        }, 1500);
    }

    async initializeAudioSystem() {
        try {
            // Inicializa contextos de áudio
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.drumAudioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Cria analisador para visualização
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.8;

            // Cria nós de efeitos
            this.createEffectNodes();

            // Inicializa faixas de áudio
            this.audioTracks.main = new AudioTrack(this.audioContext, this.eqFrequencies);
            this.audioTracks.deckA = new AudioTrack(this.audioContext, this.eqFrequencies);
            this.audioTracks.deckB = new AudioTrack(this.audioContext, this.eqFrequencies);

            // Conecta à cadeia de áudio
            this.connectAudioChain();

            // Pré-carrega sons do drum pad
            await this.preloadDrumSounds();

        } catch (error) {
            throw new Error(`Falha ao inicializar sistema de áudio: ${error.message}`);
        }
    }

    createEffectNodes() {
        // Compressor
        this.compressor = this.audioContext.createDynamicsCompressor();
        this.compressor.threshold.value = -20;
        this.compressor.knee.value = 30;
        this.compressor.ratio.value = 12;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;

        // Filtro passa-baixa para redução de ruído
        this.lowPassFilter = this.audioContext.createBiquadFilter();
        this.lowPassFilter.type = 'lowpass';
        this.lowPassFilter.frequency.value = 20000;
        this.lowPassFilter.Q.value = 1;

        // Reverb (convolver)
        this.convolverNode = this.audioContext.createConvolver();
        this.reverbGain = this.audioContext.createGain();
        this.reverbGain.gain.value = 0;

        // Delay para echo
        this.delayNode = this.audioContext.createDelay(1.0);
        this.delayNode.delayTime.value = 0.3;
        this.delayFeedback = this.audioContext.createGain();
        this.delayFeedback.gain.value = 0;
        this.delayGain = this.audioContext.createGain();
        this.delayGain.gain.value = 0;

        // Master gain
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = this.state.volume;
    }

    connectAudioChain() {
        // Conecta a cadeia principal de efeitos
        this.audioTracks.main.connectTo(this.lowPassFilter);
        this.audioTracks.deckA.connectTo(this.lowPassFilter);
        this.audioTracks.deckB.connectTo(this.lowPassFilter);

        // Cadeia de efeitos
        this.lowPassFilter.connect(this.compressor);
        this.compressor.connect(this.masterGain);
        
        // Conecta reverb em paralelo
        this.compressor.connect(this.reverbGain);
        this.reverbGain.connect(this.convolverNode);
        this.convolverNode.connect(this.masterGain);

        // Conecta delay em paralelo
        this.compressor.connect(this.delayGain);
        this.delayGain.connect(this.delayNode);
        this.delayNode.connect(this.delayFeedback);
        this.delayFeedback.connect(this.delayNode);
        this.delayNode.connect(this.masterGain);

        // Conecta ao analisador e saída
        this.masterGain.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
    }

    async preloadDrumSounds() {
        const drumSoundMap = {
            'clap': './sounds/clap.wav',
            'hihat': './sounds/hihat.wav',
            'kick': './sounds/kick.wav',
            'openhat': './sounds/openhat.wav',
            'boom': './sounds/boom.wav',
            'ride': './sounds/ride.wav',
            'snare': './sounds/snare.wav',
            'tom': './sounds/tom.wav',
            'tink': './sounds/tink.wav'
        };

        // Gera sons sintéticos se os arquivos não existirem
        for (const [name, url] of Object.entries(drumSoundMap)) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await this.drumAudioContext.decodeAudioData(arrayBuffer);
                    this.drumSounds.set(name, audioBuffer);
                } else {
                    // Gera som sintético
                    this.drumSounds.set(name, this.generateSyntheticDrumSound(name));
                }
            } catch (error) {
                console.warn(`Gerando som sintético para ${name}:`, error);
                this.drumSounds.set(name, this.generateSyntheticDrumSound(name));
            }
        }
    }

    generateSyntheticDrumSound(type) {
        const sampleRate = this.drumAudioContext.sampleRate;
        const duration = type === 'kick' ? 0.5 : 0.2;
        const length = sampleRate * duration;
        const buffer = this.drumAudioContext.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            let sample = 0;

            switch (type) {
                case 'kick':
                    sample = Math.sin(2 * Math.PI * 60 * t) * Math.exp(-t * 30);
                    break;
                case 'snare':
                    sample = (Math.random() * 2 - 1) * Math.exp(-t * 20);
                    break;
                case 'hihat':
                    sample = (Math.random() * 2 - 1) * Math.exp(-t * 50);
                    break;
                case 'clap':
                    sample = (Math.random() * 2 - 1) * Math.exp(-t * 15);
                    break;
                default:
                    sample = Math.sin(2 * Math.PI * 200 * t) * Math.exp(-t * 10);
            }

            data[i] = sample * 0.3;
        }

        return buffer;
    }

    initializeElements() {
        this.elements = {
            // Player principal
            visualizerCanvas: document.getElementById('visualizer'),
            currentTrack: document.getElementById('current-track'),
            currentArtist: document.getElementById('current-artist'),
            progressBar: document.getElementById('progress-bar'),
            progressContainer: document.getElementById('progress-container'),
            progressBuffer: document.getElementById('progress-buffer'),
            currentTime: document.getElementById('current-time'),
            totalTime: document.getElementById('total-time'),
            playPauseBtn: document.getElementById('play-pause-btn'),
            playIcon: document.getElementById('play-icon'),
            prevBtn: document.getElementById('prev-btn'),
            nextBtn: document.getElementById('next-btn'),
            loopBtn: document.getElementById('loop-btn'),
            shuffleBtn: document.getElementById('shuffle-btn'),
            masterVolume: document.getElementById('master-volume'),
            volumeDisplay: document.getElementById('volume-display'),

            // Mixer
            track1Select: document.getElementById('track1-select'),
            track2Select: document.getElementById('track2-select'),
            track1Volume: document.getElementById('track1-volume'),
            track2Volume: document.getElementById('track2-volume'),
            track1PlayPause: document.getElementById('track1-play-pause'),
            track2PlayPause: document.getElementById('track2-play-pause'),

            // Equalizador
            equalizerControls: document.getElementById('equalizer-controls'),
            eqPresetSelect: document.getElementById('eq-preset-select'),
            eqReset: document.getElementById('eq-reset'),

            // Efeitos
            effectButtons: document.querySelectorAll('.effect-btn'),

            // Drum pad
            drumPads: document.querySelectorAll('.drum-pad'),

            // Paleta de cores
            colorBoxes: document.querySelectorAll('.color-box'),

            // Playlist
            playlist: document.getElementById('playlist'),

            // Controles gerais
            themeToggle: document.getElementById('theme-toggle'),
            visualizerToggle: document.getElementById('visualizer-toggle'),

            // Modal de erro
            errorModal: document.getElementById('error-modal'),
            errorMessage: document.getElementById('error-message')
        };

        // Redimensiona o canvas do visualizador
        this.resizeVisualizer();
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================

    setupEventListeners() {
        // Player principal
        this.elements.playPauseBtn?.addEventListener('click', () => this.togglePlayPause());
        this.elements.prevBtn?.addEventListener('click', () => this.playPrevious());
        this.elements.nextBtn?.addEventListener('click', () => this.playNext());
        this.elements.loopBtn?.addEventListener('click', () => this.toggleLoop());
        this.elements.shuffleBtn?.addEventListener('click', () => this.toggleShuffle());
        this.elements.progressContainer?.addEventListener('click', (e) => this.setProgress(e));
        this.elements.masterVolume?.addEventListener('input', (e) => this.setMasterVolume(e.target.value));

        // Mixer
        this.elements.track1Select?.addEventListener('change', (e) => this.loadTrack('deckA', parseInt(e.target.value)));
        this.elements.track2Select?.addEventListener('change', (e) => this.loadTrack('deckB', parseInt(e.target.value)));
        this.elements.track1Volume?.addEventListener('input', (e) => this.setTrackVolume('deckA', e.target.value));
        this.elements.track2Volume?.addEventListener('input', (e) => this.setTrackVolume('deckB', e.target.value));
        this.elements.track1PlayPause?.addEventListener('click', () => this.toggleTrackPlayPause('deckA'));
        this.elements.track2PlayPause?.addEventListener('click', () => this.toggleTrackPlayPause('deckB'));

        // Equalizador
        this.elements.eqPresetSelect?.addEventListener('change', (e) => this.applyEQPreset(e.target.value));
        this.elements.eqReset?.addEventListener('click', () => this.resetEqualizer());

        // Efeitos
        this.elements.effectButtons?.forEach(btn => {
            btn.addEventListener('click', () => this.toggleEffect(btn.dataset.effect));
        });

        // Drum pad
        this.elements.drumPads?.forEach(pad => {
            pad.addEventListener('click', () => this.playDrumSound(pad.dataset.sound));
        });

        // Paleta de cores
        this.elements.colorBoxes?.forEach((box, index) => {
            box.addEventListener('click', () => this.changeVisualizerColors(box.dataset.colors, index));
        });

        // Controles gerais
        this.elements.themeToggle?.addEventListener('click', () => this.toggleTheme());
        this.elements.visualizerToggle?.addEventListener('click', () => this.toggleVisualizer());

        // Eventos de redimensionamento
        window.addEventListener('resize', () => this.debounce(this.resizeVisualizer.bind(this), 250)());

        // Eventos de áudio
        this.setupAudioEventListeners();

        // Modal de erro
        this.setupModalEventListeners();
    }

    setupAudioEventListeners() {
        if (this.audioTracks.main?.audioElement) {
            const audio = this.audioTracks.main.audioElement;
            
            audio.addEventListener('timeupdate', () => this.updateProgress());
            audio.addEventListener('ended', () => this.handleTrackEnd());
            audio.addEventListener('loadedmetadata', () => this.updateTrackInfo());
            audio.addEventListener('error', (e) => this.handleAudioError(e));
            audio.addEventListener('canplaythrough', () => this.updateBufferProgress());
            audio.addEventListener('progress', () => this.updateBufferProgress());
        }
    }

    setupModalEventListeners() {
        const modal = this.elements.errorModal;
        const closeBtn = modal?.querySelector('.modal-close');
        
        closeBtn?.addEventListener('click', () => this.hideError());
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) this.hideError();
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ignora se estiver digitando em um input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    this.togglePlayPause();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.playNext();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.playPrevious();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.adjustVolume(0.1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.adjustVolume(-0.1);
                    break;
                case 'KeyM':
                    e.preventDefault();
                    this.toggleMute();
                    break;
                case 'KeyL':
                    e.preventDefault();
                    this.toggleLoop();
                    break;
                case 'KeyS':
                    e.preventDefault();
                    this.toggleShuffle();
                    break;
            }

            // Drum pad shortcuts
            this.handleDrumPadKeyboard(e);
        });
    }

    handleDrumPadKeyboard(e) {
        const pad = document.querySelector(`.drum-pad[data-key="${e.keyCode}"]`);
        if (pad) {
            e.preventDefault();
            const sound = pad.dataset.sound;
            this.playDrumSound(sound);
            this.animateDrumPad(pad);
        }
    }

    // ==========================================
    // PLAYER PRINCIPAL
    // ==========================================

    async togglePlayPause() {
        try {
            if (!this.audioContext) {
                await this.initializeAudioSystem();
            }

            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            const audio = this.audioTracks.main.audioElement;
            
            if (audio.paused) {
                if (!audio.src) {
                    await this.loadTrack('main', this.state.currentTrackIndex);
                }
                await audio.play();
                this.state.isPlaying = true;
                this.updatePlayButton(true);
            } else {
                audio.pause();
                this.state.isPlaying = false;
                this.updatePlayButton(false);
            }

            this.updatePlaylistUI();
        } catch (error) {
            console.error('Erro ao reproduzir:', error);
            this.showError('Erro ao reproduzir a música. Verifique se o arquivo existe.');
        }
    }

    async playNext() {
        if (this.state.isShuffled) {
            this.state.currentTrackIndex = Math.floor(Math.random() * this.state.playlist.length);
        } else {
            this.state.currentTrackIndex = (this.state.currentTrackIndex + 1) % this.state.playlist.length;
        }

        await this.loadTrack('main', this.state.currentTrackIndex);
        if (this.state.isPlaying) {
            await this.audioTracks.main.audioElement.play();
        }
        this.updatePlaylistUI();
    }

    async playPrevious() {
        this.state.currentTrackIndex = (this.state.currentTrackIndex - 1 + this.state.playlist.length) % this.state.playlist.length;
        await this.loadTrack('main', this.state.currentTrackIndex);
        if (this.state.isPlaying) {
            await this.audioTracks.main.audioElement.play();
        }
        this.updatePlaylistUI();
    }

    toggleLoop() {
        this.state.isLooping = !this.state.isLooping;
        this.elements.loopBtn?.classList.toggle('active', this.state.isLooping);
        if (this.audioTracks.main?.audioElement) {
            this.audioTracks.main.audioElement.loop = this.state.isLooping;
        }
    }

    toggleShuffle() {
        this.state.isShuffled = !this.state.isShuffled;
        this.elements.shuffleBtn?.classList.toggle('active', this.state.isShuffled);
    }

    setProgress(e) {
        const audio = this.audioTracks.main.audioElement;
        if (!audio || !audio.duration) return;

        const rect = this.elements.progressContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const percentage = clickX / width;
        
        audio.currentTime = percentage * audio.duration;
    }

    setMasterVolume(value) {
        this.state.volume = parseFloat(value);
        if (this.masterGain) {
            this.masterGain.gain.value = this.state.volume;
        }
        
        if (this.elements.volumeDisplay) {
            this.elements.volumeDisplay.textContent = `${Math.round(this.state.volume * 100)}%`;
        }
        
        this.saveUserPreferences();
    }

    adjustVolume(delta) {
        const newVolume = Math.max(0, Math.min(1, this.state.volume + delta));
        this.setMasterVolume(newVolume);
        if (this.elements.masterVolume) {
            this.elements.masterVolume.value = newVolume;
        }
    }

    toggleMute() {
        if (this.state.volume > 0) {
            this.previousVolume = this.state.volume;
            this.setMasterVolume(0);
            if (this.elements.masterVolume) {
                this.elements.masterVolume.value = 0;
            }
        } else {
            const restoreVolume = this.previousVolume || 0.8;
            this.setMasterVolume(restoreVolume);
            if (this.elements.masterVolume) {
                this.elements.masterVolume.value = restoreVolume;
            }
        }
    }

    updatePlayButton(isPlaying) {
        if (this.elements.playIcon) {
            this.elements.playIcon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
        }
    }

    updateProgress() {
        const audio = this.audioTracks.main.audioElement;
        if (!audio || !audio.duration) return;

        const progress = (audio.currentTime / audio.duration) * 100;
        if (this.elements.progressBar) {
            this.elements.progressBar.style.width = `${progress}%`;
        }

        // Atualiza tempo atual
        if (this.elements.currentTime) {
            this.elements.currentTime.textContent = this.formatTime(audio.currentTime);
        }

        // Atualiza tempo total
        if (this.elements.totalTime) {
            this.elements.totalTime.textContent = this.formatTime(audio.duration);
        }
    }

    updateBufferProgress() {
        const audio = this.audioTracks.main.audioElement;
        if (!audio || !audio.buffered.length) return;

        const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
        const duration = audio.duration;
        
        if (duration > 0) {
            const bufferedProgress = (bufferedEnd / duration) * 100;
            if (this.elements.progressBuffer) {
                this.elements.progressBuffer.style.width = `${bufferedProgress}%`;
            }
        }
    }

    handleTrackEnd() {
        if (this.state.isLooping) {
            return; // O loop é tratado pelo elemento audio
        }
        
        this.playNext();
    }

    handleAudioError(e) {
        console.error('Erro de áudio:', e);
        this.showError('Erro ao carregar a música. Verifique se o arquivo existe e está acessível.');
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // ==========================================
    // SISTEMA DE FAIXAS
    // ==========================================

    async loadTrack(trackType, trackIndex) {
        try {
            const track = this.state.playlist[trackIndex];
            if (!track) return;

            const audioTrack = this.audioTracks[trackType];
            if (!audioTrack) return;

            audioTrack.audioElement.src = track.src;
            
            return new Promise((resolve, reject) => {
                audioTrack.audioElement.addEventListener('loadedmetadata', () => {
                    if (trackType === 'main') {
                        this.updateTrackInfo();
                        this.state.currentTrackIndex = trackIndex;
                    }
                    resolve();
                }, { once: true });

                audioTrack.audioElement.addEventListener('error', reject, { once: true });
                audioTrack.audioElement.load();
            });

        } catch (error) {
            console.error(`Erro ao carregar faixa ${trackType}:`, error);
            this.showError(`Erro ao carregar a música: ${error.message}`);
        }
    }

    updateTrackInfo() {
        const track = this.state.playlist[this.state.currentTrackIndex];
        if (!track) return;

        if (this.elements.currentTrack) {
            this.elements.currentTrack.textContent = track.title;
        }
        
        if (this.elements.currentArtist) {
            this.elements.currentArtist.textContent = track.artist;
        }

        // Atualiza a arte do álbum
        const albumArt = document.querySelector('.album-art');
        if (albumArt) {
            albumArt.className = `album-art color-${(this.state.currentTrackIndex % 6) + 1}`;
        }
    }

    setTrackVolume(trackType, value) {
        const audioTrack = this.audioTracks[trackType];
        if (audioTrack) {
            audioTrack.setVolume(parseFloat(value));
        }

        // Atualiza display do volume
        const volumeDisplay = document.querySelector(`#track${trackType === 'deckA' ? '1' : '2'}-volume`).parentElement.querySelector('.volume-value');
        if (volumeDisplay) {
            volumeDisplay.textContent = `${Math.round(value * 100)}%`;
        }
    }

    async toggleTrackPlayPause(trackType) {
        const audioTrack = this.audioTracks[trackType];
        if (!audioTrack) return;

        const audio = audioTrack.audioElement;
        const button = trackType === 'deckA' ? this.elements.track1PlayPause : this.elements.track2PlayPause;
        const icon = button?.querySelector('i');

        try {
            if (audio.paused) {
                await audio.play();
                if (icon) icon.className = 'fas fa-pause';
            } else {
                audio.pause();
                if (icon) icon.className = 'fas fa-play';
            }
        } catch (error) {
            console.error(`Erro ao reproduzir ${trackType}:`, error);
        }
    }

    // ==========================================
    // EQUALIZADOR
    // ==========================================

    createEqualizerControls() {
        if (!this.elements.equalizerControls) return;

        this.elements.equalizerControls.innerHTML = '';

        this.eqFrequencies.forEach((freq, index) => {
            const eqBand = document.createElement('div');
            eqBand.className = 'eq-band';
            
            eqBand.innerHTML = `
                <div class="eq-band-label">${freq >= 1000 ? `${freq / 1000}K` : freq} Hz</div>
                <input type="range" min="-12" max="12" value="0" step="0.1" 
                       class="eq-band-slider" data-band-index="${index}" 
                       aria-label="Equalizador ${freq}Hz">
                <div class="eq-band-value" id="eq-band-${index}-value">0 dB</div>
            `;

            this.elements.equalizerControls.appendChild(eqBand);
        });

        // Adiciona event listeners
        this.elements.equalizerControls.querySelectorAll('.eq-band-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const index = parseInt(e.target.dataset.bandIndex);
                const value = parseFloat(e.target.value);
                this.setEQBand(index, value);
                
                const valueDisplay = document.getElementById(`eq-band-${index}-value`);
                if (valueDisplay) {
                    valueDisplay.textContent = `${value.toFixed(1)} dB`;
                }

                // Marca como personalizado
                if (this.elements.eqPresetSelect) {
                    this.elements.eqPresetSelect.value = 'Personalizado';
                }
            });
        });
    }

    populateEQPresets() {
        if (!this.elements.eqPresetSelect) return;

        this.elements.eqPresetSelect.innerHTML = '<option value="Personalizado">Personalizado</option>';

        Object.keys(this.eqPresets).forEach(presetName => {
            const option = document.createElement('option');
            option.value = presetName;
            option.textContent = presetName;
            this.elements.eqPresetSelect.appendChild(option);
        });
    }

    applyEQPreset(presetName) {
        const gains = this.eqPresets[presetName];
        if (!gains) return;

        const sliders = this.elements.equalizerControls?.querySelectorAll('.eq-band-slider');
        sliders?.forEach((slider, index) => {
            const value = gains[index];
            slider.value = value;
            this.setEQBand(index, value);
            
            const valueDisplay = document.getElementById(`eq-band-${index}-value`);
            if (valueDisplay) {
                valueDisplay.textContent = `${value.toFixed(1)} dB`;
            }
        });
    }

    setEQBand(index, value) {
        Object.values(this.audioTracks).forEach(track => {
            if (track && track.setEQBand) {
                track.setEQBand(index, value);
            }
        });
    }

    resetEqualizer() {
        this.applyEQPreset('Padrão (Flat)');
        if (this.elements.eqPresetSelect) {
            this.elements.eqPresetSelect.value = 'Padrão (Flat)';
        }
    }

    // ==========================================
    // EFEITOS DE ÁUDIO
    // ==========================================

    toggleEffect(effectName) {
        if (!effectName || !this.state.effects.hasOwnProperty(effectName)) return;

        this.state.effects[effectName] = !this.state.effects[effectName];
        const button = document.querySelector(`[data-effect="${effectName}"]`);
        
        if (button) {
            button.classList.toggle('active', this.state.effects[effectName]);
        }

        switch (effectName) {
            case 'noiseReduction':
                this.toggleNoiseReduction();
                break;
            case 'reverb':
                this.toggleReverb();
                break;
            case 'echo':
                this.toggleEcho();
                break;
            case 'compressor':
                this.toggleCompressor();
                break;
        }

        this.saveUserPreferences();
    }

    toggleNoiseReduction() {
        if (this.lowPassFilter) {
            this.lowPassFilter.frequency.value = this.state.effects.noiseReduction ? 8000 : 20000;
        }
    }

    async toggleReverb() {
        if (!this.convolverNode || !this.reverbGain) return;

        if (this.state.effects.reverb) {
            // Ativa reverb
            this.reverbGain.gain.value = 0.3;
            
            // Cria impulso de reverb sintético se não existir
            if (!this.convolverNode.buffer) {
                this.convolverNode.buffer = this.createReverbImpulse();
            }
        } else {
            // Desativa reverb
            this.reverbGain.gain.value = 0;
        }
    }

    createReverbImpulse() {
        const sampleRate = this.audioContext.sampleRate;
        const length = sampleRate * 2; // 2 segundos
        const impulse = this.audioContext.createBuffer(2, length, sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                const decay = Math.pow(1 - i / length, 2);
                channelData[i] = (Math.random() * 2 - 1) * decay;
            }
        }

        return impulse;
    }

    toggleEcho() {
        if (this.delayGain && this.delayFeedback) {
            if (this.state.effects.echo) {
                this.delayGain.gain.value = 0.3;
                this.delayFeedback.gain.value = 0.4;
            } else {
                this.delayGain.gain.value = 0;
                this.delayFeedback.gain.value = 0;
            }
        }
    }

    toggleCompressor() {
        if (this.compressor) {
            if (this.state.effects.compressor) {
                this.compressor.threshold.value = -24;
                this.compressor.ratio.value = 6;
            } else {
                this.compressor.threshold.value = -20;
                this.compressor.ratio.value = 12;
            }
        }
    }

    // ==========================================
    // DRUM PAD
    // ==========================================

    async playDrumSound(soundName) {
        try {
            if (this.drumAudioContext.state === 'suspended') {
                await this.drumAudioContext.resume();
            }

            const buffer = this.drumSounds.get(soundName);
            if (!buffer) return;

            const source = this.drumAudioContext.createBufferSource();
            const gainNode = this.drumAudioContext.createGain();
            
            source.buffer = buffer;
            source.connect(gainNode);
            gainNode.connect(this.drumAudioContext.destination);
            
            gainNode.gain.value = 0.7;
            source.start(0);

            // Animação visual
            const pad = document.querySelector(`[data-sound="${soundName}"]`);
            if (pad) {
                this.animateDrumPad(pad);
            }

        } catch (error) {
            console.error('Erro ao reproduzir som do drum pad:', error);
        }
    }

    animateDrumPad(pad) {
        pad.classList.add('playing');
        setTimeout(() => {
            pad.classList.remove('playing');
        }, 150);
    }

    // ==========================================
    // VISUALIZADOR
    // ==========================================

    startVisualizer() {
        if (!this.state.visualizerEnabled) return;
        
        this.resizeVisualizer();
        this.drawVisualizer();
    }

    drawVisualizer() {
        if (!this.state.visualizerEnabled || !this.elements.visualizerCanvas) {
            this.visualizerAnimationId = requestAnimationFrame(() => this.drawVisualizer());
            return;
        }

        const canvas = this.elements.visualizerCanvas;
        const ctx = canvas.getContext('2d');
        
        if (!this.analyser) {
            this.visualizerAnimationId = requestAnimationFrame(() => this.drawVisualizer());
            return;
        }

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteFrequencyData(dataArray);

        // Limpa o canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Fundo com gradiente
        const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        bgGradient.addColorStop(0, this.state.visualizerColors.start + '20');
        bgGradient.addColorStop(1, this.state.visualizerColors.end + '20');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Configurações das barras
        const barCount = Math.min(128, bufferLength / 4);
        const barWidth = (canvas.width / barCount) * 0.8;
        const barGap = (canvas.width / barCount) * 0.2;

        // Desenha as barras
        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor((i / barCount) * bufferLength);
            const barHeight = (dataArray[dataIndex] / 255) * canvas.height * 0.9;
            
            // Gradiente da barra
            const barGradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
            barGradient.addColorStop(0, this.state.visualizerColors.start);
            barGradient.addColorStop(1, this.state.visualizerColors.end);
            
            ctx.fillStyle = barGradient;
            ctx.fillRect(
                i * (barWidth + barGap),
                canvas.height - barHeight,
                barWidth,
                barHeight
            );

            // Efeito de brilho no topo
            ctx.fillStyle = `rgba(255, 255, 255, ${dataArray[dataIndex] / 510})`;
            ctx.fillRect(
                i * (barWidth + barGap),
                canvas.height - barHeight,
                barWidth,
                3
            );
        }

        this.visualizerAnimationId = requestAnimationFrame(() => this.drawVisualizer());
    }

    toggleVisualizer() {
        this.state.visualizerEnabled = !this.state.visualizerEnabled;
        
        if (this.elements.visualizerToggle) {
            this.elements.visualizerToggle.classList.toggle('active', this.state.visualizerEnabled);
        }

        if (!this.state.visualizerEnabled && this.visualizerAnimationId) {
            cancelAnimationFrame(this.visualizerAnimationId);
            
            // Limpa o canvas
            const canvas = this.elements.visualizerCanvas;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        } else if (this.state.visualizerEnabled) {
            this.startVisualizer();
        }

        this.saveUserPreferences();
    }

    changeVisualizerColors(colorsString, index) {
        if (!colorsString) return;

        const colors = colorsString.split(',');
        if (colors.length === 2) {
            this.state.visualizerColors.start = colors[0].trim();
            this.state.visualizerColors.end = colors[1].trim();

            // Atualiza UI
            this.elements.colorBoxes?.forEach((box, i) => {
                box.classList.toggle('active', i === index);
            });

            this.saveUserPreferences();
        }
    }

    resizeVisualizer() {
        const canvas = this.elements.visualizerCanvas;
        if (!canvas) return;

        const container = canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        canvas.width = rect.width;
        canvas.height = rect.height;
    }

    // ==========================================
    // PLAYLIST
    // ==========================================

    populatePlaylist() {
        if (!this.elements.playlist) return;

        this.elements.playlist.innerHTML = '';

        this.state.playlist.forEach((track, index) => {
            const item = document.createElement('div');
            item.className = 'playlist-item';
            item.dataset.index = index;
            item.setAttribute('role', 'listitem');
            
            const colorClass = `color-${(index % 6) + 1}`;
            
            item.innerHTML = `
                <div class="playlist-art ${colorClass}">
                    <i class="fas fa-music"></i>
                </div>
                <div class="playlist-info">
                    <div class="playlist-track">${this.escapeHtml(track.title)}</div>
                    <div class="playlist-artist">${this.escapeHtml(track.artist)}</div>
                </div>
                <div class="playlist-duration">${track.duration}</div>
            `;

            item.addEventListener('click', () => this.playTrackFromPlaylist(index));
            this.elements.playlist.appendChild(item);
        });

        this.updatePlaylistUI();
    }

    async playTrackFromPlaylist(index) {
        this.state.currentTrackIndex = index;
        await this.loadTrack('main', index);
        
        if (this.state.isPlaying || !this.audioTracks.main.audioElement.paused) {
            await this.audioTracks.main.audioElement.play();
            this.state.isPlaying = true;
            this.updatePlayButton(true);
        }
        
        this.updatePlaylistUI();
    }

    updatePlaylistUI() {
        const items = this.elements.playlist?.querySelectorAll('.playlist-item');
        items?.forEach((item, index) => {
            item.classList.toggle('playing', index === this.state.currentTrackIndex);
        });
    }

    // ==========================================
    // TEMA E PREFERÊNCIAS
    // ==========================================

    toggleTheme() {
        this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.state.theme);
        
        const icon = this.elements.themeToggle?.querySelector('i');
        if (icon) {
            icon.className = this.state.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }

        this.saveUserPreferences();
    }

    loadUserPreferences() {
        try {
            const saved = localStorage.getItem('djMixerProPreferences');
            if (saved) {
                const preferences = JSON.parse(saved);
                
                // Aplica preferências salvas
                if (preferences.theme) {
                    this.state.theme = preferences.theme;
                    document.documentElement.setAttribute('data-theme', this.state.theme);
                }
                
                if (preferences.volume !== undefined) {
                    this.state.volume = preferences.volume;
                    if (this.elements.masterVolume) {
                        this.elements.masterVolume.value = this.state.volume;
                    }
                }
                
                if (preferences.visualizerColors) {
                    this.state.visualizerColors = preferences.visualizerColors;
                }
                
                if (preferences.effects) {
                    this.state.effects = { ...this.state.effects, ...preferences.effects };
                }
            }
        } catch (error) {
            console.warn('Erro ao carregar preferências:', error);
        }
    }

    saveUserPreferences() {
        try {
            const preferences = {
                theme: this.state.theme,
                volume: this.state.volume,
                visualizerColors: this.state.visualizerColors,
                effects: this.state.effects
            };
            
            localStorage.setItem('djMixerProPreferences', JSON.stringify(preferences));
        } catch (error) {
            console.warn('Erro ao salvar preferências:', error);
        }
    }

    // ==========================================
    // UI E UTILIDADES
    // ==========================================

    populateUI() {
        this.populatePlaylist();
        this.populateTrackSelectors();
        this.createEqualizerControls();
        this.populateEQPresets();
        this.applyEQPreset('Padrão (Flat)');
        
        // Carrega primeira música
        this.loadTrack('main', 0);
        this.loadTrack('deckA', 0);
        this.loadTrack('deckB', 1 % this.state.playlist.length);
    }

    populateTrackSelectors() {
        [this.elements.track1Select, this.elements.track2Select].forEach((select, deckIndex) => {
            if (!select) return;
            
            select.innerHTML = '';
            this.state.playlist.forEach((track, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `${track.title} - ${track.artist}`;
                select.appendChild(option);
            });
            
            select.value = deckIndex;
        });
    }

    showError(message) {
        if (this.elements.errorMessage) {
            this.elements.errorMessage.textContent = message;
        }
        
        if (this.elements.errorModal) {
            this.elements.errorModal.style.display = 'flex';
            document.body.classList.add('no-scroll');
        }
    }

    hideError() {
        if (this.elements.errorModal) {
            this.elements.errorModal.style.display = 'none';
            document.body.classList.remove('no-scroll');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ==========================================
    // CLEANUP
    // ==========================================

    destroy() {
        // Cancela animações
        if (this.visualizerAnimationId) {
            cancelAnimationFrame(this.visualizerAnimationId);
        }

        // Para e limpa áudio
        Object.values(this.audioTracks).forEach(track => {
            if (track?.audioElement) {
                track.audioElement.pause();
                track.audioElement.src = '';
            }
        });

        // Fecha contextos de áudio
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
        
        if (this.drumAudioContext && this.drumAudioContext.state !== 'closed') {
            this.drumAudioContext.close();
        }

        // Remove event listeners
        window.removeEventListener('resize', this.resizeVisualizer);
        document.removeEventListener('keydown', this.setupKeyboardShortcuts);
    }
}

// ==========================================
// CLASSE AUDIOTRACK
// ==========================================

class AudioTrack {
    constructor(context, eqFrequencies) {
        this.audioElement = new Audio();
        this.audioElement.crossOrigin = 'anonymous';
        this.context = context;
        
        try {
            this.sourceNode = context.createMediaElementSource(this.audioElement);
            this.gainNode = context.createGain();
            this.filters = this.createEQFilters(context, eqFrequencies);
            
            this.gainNode.gain.value = 0.8;
            this.connectChain();
        } catch (error) {
            console.error('Erro ao criar AudioTrack:', error);
        }
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
        try {
            // Conecta fonte ao primeiro filtro
            this.sourceNode.connect(this.filters[0]);
            
            // Conecta filtros em série
            for (let i = 0; i < this.filters.length - 1; i++) {
                this.filters[i].connect(this.filters[i + 1]);
            }
            
            // Conecta último filtro ao ganho
            this.filters[this.filters.length - 1].connect(this.gainNode);
        } catch (error) {
            console.error('Erro ao conectar cadeia de áudio:', error);
        }
    }

    connectTo(destination) {
        try {
            this.gainNode.connect(destination);
        } catch (error) {
            console.error('Erro ao conectar destino:', error);
        }
    }

    setVolume(value) {
        if (this.gainNode) {
            this.gainNode.gain.value = Math.max(0, Math.min(1, value));
        }
    }

    setEQBand(index, gainValue) {
        if (this.filters[index]) {
            this.filters[index].gain.value = Math.max(-12, Math.min(12, gainValue));
        }
    }
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.djMixerPro = new DJMixerPro();
});

// Cleanup ao sair da página
window.addEventListener('beforeunload', () => {
    if (window.djMixerPro) {
        window.djMixerPro.destroy();
    }
});

// Service Worker para PWA (opcional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('SW registrado:', registration);
            })
            .catch(error => {
                console.log('Erro no SW:', error);
            });
    });
}
