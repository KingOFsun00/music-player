// arquivo.js

// --- Variáveis Globais e Constantes ---
// Lista de músicas. Os caminhos agora são relativos à raiz do seu repositório GitHub Pages.
const playlist = [
    { title: "A Via Láctea", artist: "Legião Urbana", duration: "4:00", src: "./musicas/A Via Láctea.mp3" },
    { title: "La Solitudine", artist: "Laura Pausini", duration: "4:00", src: "./musicas/La Solitudine.mp3" },
    { title: "Trem Bala", artist: "Ana Vilela", duration: "3:00", src: "./musicas/Trem Bala.mp3" }, 
    { title: "Moonlight", artist: "XXXTENTACION", duration: "2:15", src: "./musicas/MOONLIGHT.mp3" },
    { title: "Não Existe Amor Em SP", artist: "Criolo", duration: "3:45", src: "./musicas/criolo.mp3" },
    { title: "Vento no Litoral", artist: "Legião Urbana", duration: "6:00", src: "./musicas/vento no litoral.mp3" }
    // Adicione mais músicas aqui, certificando-se de que os arquivos .mp3 existem na pasta 'musicas/'
];

let currentTrackIndex = 0; // Índice da faixa principal sendo exibida/controlada
let isPlaying = false; // Estado global de reprodução da faixa principal

// Elementos de áudio HTML para as duas faixas
let audio1 = new Audio(); 
let audio2 = new Audio(); 

// Variáveis para o Web Audio API
let audioContext; // Contexto de áudio único para ambas as faixas
let audioSource1; // Fonte de áudio para a Faixa 1
let audioSource2; // Fonte de áudio para a Faixa 2
let gainNode1;    // Nó de ganho (volume) para a Faixa 1
let gainNode2;    // Nó de ganho (volume) para a Faixa 2
let analyser;     // Nó de análise para o visualizador
let eqFilters1 = []; // Array de filtros do equalizador para a Faixa 1
let eqFilters2 = []; // Array de filtros do equalizador para a Faixa 2
let lowPassFilter; // Filtro passa-baixa para redução de ruído
let compressor;    // Compressor para efeitos de masterização

let tracksInitialized = false; // Flag para garantir que o contexto de áudio seja inicializado apenas uma vez

// Frequências para as bandas do equalizador (5 bandas)
const eqFrequencies = [60, 250, 1000, 4000, 16000]; // Em Hz

// Predefinições do Equalizador: [60Hz, 250Hz, 1000Hz, 4000Hz, 16000Hz] - valores em dB
const eqPresets = {
    "Padrão (Flat)": [0, 0, 0, 0, 0],
    "Grave": [8, 4, 0, -2, -4],
    "Médio": [0, 2, 6, 2, 0],
    "Acústico": [2, 4, 3, 1, 0],
    "Rock": [6, 0, -4, 2, 5],
    "Pop": [4, 2, 0, 3, 1],
    "Vocal": [-2, 0, 5, 4, 2]
};


// --- Elementos do DOM ---
const visualizerCanvas = document.getElementById('visualizer');
const visualizerCtx = visualizerCanvas.getContext('2d');
const currentTrackTitle = document.getElementById('current-track');
const currentTrackArtist = document.getElementById('current-artist');
const progressBar = document.getElementById('progress-bar');
const progressContainer = document.getElementById('progress-container');
const currentTimeSpan = document.getElementById('current-time');
const totalTimeSpan = document.getElementById('total-time');
const playPauseBtn = document.getElementById('play-pause-btn');
const playIcon = document.getElementById('play-icon');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const playlistContainer = document.getElementById('playlist');
const albumArtEl = document.querySelector('.album-art'); // Seleciona a arte do álbum

const equalizerControlsDiv = document.getElementById('equalizer-controls');
const eqPresetSelect = document.getElementById('eq-preset-select'); // Novo elemento para presets

const track1Select = document.getElementById('track1-select');
const track2Select = document.getElementById('track2-select');
const track1VolumeSlider = document.getElementById('track1-volume');
const track2VolumeSlider = document.getElementById('track2-volume');
const track1PlayPauseBtn = document.getElementById('track1-play-pause');
const track2PlayPauseBtn = document.getElementById('track2-play-pause');

// Botões de efeito (funcionalidade placeholder)
const noiseReductionBtn = document.getElementById('noise-reduction-btn');
const reverbBtn = document.getElementById('reverb-btn');
const echoBtn = document.getElementById('echo-btn');

// --- Funções de Inicialização da Web Audio API ---

/**
 * Inicializa o contexto de áudio da Web Audio API e os nós necessários.
 * Esta função é chamada na primeira interação do usuário para contornar políticas de autoplay.
 */
function initializeAudioContext() {
    if (tracksInitialized) return; // Garante que a inicialização ocorra apenas uma vez

    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Cria nós MediaElementSource a partir dos elementos <audio>
    audioSource1 = audioContext.createMediaElementSource(audio1);
    audioSource2 = audioContext.createMediaElementSource(audio2);

    // Cria nós de Ganho (volume) para cada faixa
    gainNode1 = audioContext.createGain();
    gainNode2 = audioContext.createGain();

    // Inicializa o nó Analyser para a visualização
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048; // Tamanho da FFT (transformada rápida de Fourier)

    // Cria o filtro LowPass (para redução de ruído) e o Compressor (para masterização)
    lowPassFilter = audioContext.createBiquadFilter();
    lowPassFilter.type = 'lowpass';
    lowPassFilter.frequency.value = 5000; // Frequência de corte inicial
    lowPassFilter.Q.value = 1;

    compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.value = -20; // dB
    compressor.knee.value = 30; // dB
    compressor.ratio.value = 12; // 12:1
    compressor.attack.value = 0.003; // segundos
    compressor.release.value = 0.25; // segundos

    // Cria e encadeia os filtros do Equalizador para a Faixa 1
    eqFrequencies.forEach((freq, index) => {
        const filter = audioContext.createBiquadFilter();
        filter.type = 'peaking'; // Tipo de filtro para banda de pico
        filter.frequency.value = freq;
        filter.Q.value = 1; // Fator de qualidade (largura da banda)
        filter.gain.value = 0; // Ganho inicial (0 dB)
        eqFilters1.push(filter);

        if (index === 0) {
            audioSource1.connect(filter); // Conecta a fonte ao primeiro filtro
        } else {
            eqFilters1[index - 1].connect(filter); // Conecta o filtro anterior ao atual
        }
    });
    // Conecta o último filtro EQ da Faixa 1 ao seu nó de ganho
    eqFilters1[eqFilters1.length - 1].connect(gainNode1);

    // Cria e encadeia os filtros do Equalizador para a Faixa 2
    eqFrequencies.forEach((freq, index) => {
        const filter = audioContext.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1;
        filter.gain.value = 0;
        eqFilters2.push(filter);

        if (index === 0) {
            audioSource2.connect(filter);
        } else {
            eqFilters2[index - 1].connect(filter);
        }
    });
    // Conecta o último filtro EQ da Faixa 2 ao seu nó de ganho
    eqFilters2[eqFilters2.length - 1].connect(gainNode2);

    // Conecta os nós de ganho (volume) de ambas as faixas aos filtros globais
    // e, em seguida, ao analisador e ao destino (saída de áudio).
    // O analisador receberá a mistura de ambas as faixas processadas.
    gainNode1.connect(lowPassFilter);
    gainNode2.connect(lowPassFilter); // Ambas as saídas são somadas e passam pelo lowPassFilter

    lowPassFilter.connect(compressor);
    compressor.connect(analyser);
    analyser.connect(audioContext.destination); // O analisador se conecta à saída final

    tracksInitialized = true;
    console.log('Contexto de Áudio e cadeia de efeitos inicializados.');
}

// --- Funções de Controle de Áudio ---

/**
 * Carrega uma faixa no elemento de áudio especificado e atualiza a UI se for a faixa principal.
 * @param {HTMLAudioElement} audioElement - O elemento <audio> para carregar a faixa.
 * @param {object} track - O objeto da faixa da playlist.
 * @param {string} trackId - 'track1' ou 'track2' para identificação (para logs e UI principal).
 */
function loadTrack(audioElement, track, trackId) {
    audioElement.src = track.src;
    audioElement.load(); // Carrega o áudio
    console.log(`Carregando ${track.title} na ${trackId}`);

    // Atualiza as informações da faixa principal na UI (referente a audio1)
    if (trackId === 'track1') {
        currentTrackTitle.textContent = track.title;
        currentTrackArtist.textContent = track.artist;
        // Atualiza a cor da arte do álbum
        if (albumArtEl) {
            // Remove todas as classes de cor existentes
            albumArtEl.classList.remove('color-1', 'color-2', 'color-3', 'color-4', 'color-5');
            // Adiciona a nova classe de cor baseada no índice (para randomizar cores)
            const trackIndex = playlist.indexOf(track); // Encontra o índice da track no playlist
            albumArtEl.classList.add(`color-${(trackIndex % 5) + 1}`);
        }
    }

    // Define o volume inicial a partir do slider correspondente, se os nós de ganho existirem
    if (trackId === 'track1' && gainNode1) {
        gainNode1.gain.value = track1VolumeSlider.value;
    } else if (trackId === 'track2' && gainNode2) {
        gainNode2.gain.value = track2VolumeSlider.value;
    }
}

/**
 * Inicia a reprodução do elemento de áudio especificado.
 * @param {HTMLAudioElement} audioElement - O elemento <audio> para reproduzir.
 */
function playAudio(audioElement) {
    initializeAudioContext(); // Garante que o contexto esteja inicializado antes de reproduzir
    // Resume o contexto de áudio se estiver suspenso (útil após interações ou mudanças de aba)
    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            audioElement.play().catch(e => console.error("Erro ao reproduzir áudio:", e));
        });
    } else {
        audioElement.play().catch(e => console.error("Erro ao reproduzir áudio:", e));
    }
    console.log("Reproduzindo áudio:", audioElement.src);
}

/**
 * Pausa a reprodução do elemento de áudio especificado.
 * @param {HTMLAudioElement} audioElement - O elemento <audio> para pausar.
 */
function pauseAudio(audioElement) {
    audioElement.pause();
    console.log("Pausando áudio:", audioElement.src);
}

/**
 * Alterna entre reproduzir e pausar a faixa principal (audio1).
 */
function togglePlayPause() {
    // Se o contexto não foi inicializado (primeira interação), inicializa e toca a primeira faixa
    if (!tracksInitialized) {
        initializeAudioContext();
        loadTrack(audio1, playlist[currentTrackIndex], 'track1');
        playAudio(audio1);
        isPlaying = true;
        playIcon.classList.remove('fa-play');
        playIcon.classList.add('fa-pause');
        updatePlaylistUI();
        return;
    }

    if (audio1.paused) {
        playAudio(audio1);
        isPlaying = true;
        playIcon.classList.remove('fa-play');
        playIcon.classList.add('fa-pause');
    } else {
        pauseAudio(audio1);
        isPlaying = false;
        playIcon.classList.remove('fa-pause');
        playIcon.classList.add('fa-play');
    }
    updatePlaylistUI();
}

/**
 * Reproduz a próxima faixa na playlist para a faixa principal (audio1).
 */
function playNextTrack() {
    currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
    loadTrack(audio1, playlist[currentTrackIndex], 'track1');
    playAudio(audio1);
    isPlaying = true;
    playIcon.classList.remove('fa-play');
    playIcon.classList.add('fa-pause');
    updatePlaylistUI();
}

/**
 * Reproduz a faixa anterior na playlist para a faixa principal (audio1).
 */
function playPrevTrack() {
    currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    loadTrack(audio1, playlist[currentTrackIndex], 'track1');
    playAudio(audio1);
    isPlaying = true;
    playIcon.classList.remove('fa-play');
    playIcon.classList.add('fa-pause');
    updatePlaylistUI();
}

/**
 * Atualiza a barra de progresso e a exibição do tempo da faixa principal.
 */
function updateProgressBar() {
    const { duration, currentTime } = audio1;
    const progressPercent = (currentTime / duration) * 100;
    progressBar.style.width = `${progressPercent}%`;

    let currentMinutes = Math.floor(currentTime / 60);
    let currentSeconds = Math.floor(currentTime % 60);
    if (currentSeconds < 10) {
        currentSeconds = `0${currentSeconds}`;
    }
    currentTimeSpan.textContent = `${currentMinutes}:${currentSeconds}`;

    if (duration && !isNaN(duration)) { // Verifica se a duração é um número válido
        let totalMinutes = Math.floor(duration / 60);
        let totalSeconds = Math.floor(duration % 60);
        if (totalSeconds < 10) {
            totalSeconds = `0${totalSeconds}`;
        }
        totalTimeSpan.textContent = `${totalMinutes}:${totalSeconds}`;
    } else {
        totalTimeSpan.textContent = '0:00';
    }
}

/**
 * Define o tempo de reprodução da faixa principal quando a barra de progresso é clicada.
 * @param {MouseEvent} e - O evento de clique.
 */
function setProgressBar(e) {
    const width = this.clientWidth;
    const clickX = e.offsetX;
    const duration = audio1.duration;
    if (!isNaN(duration)) { // Garante que a duração é um número válido
        audio1.currentTime = (clickX / width) * duration;
    }
}

// --- Funções de Visualização de Áudio ---

/**
 * Renderiza a visualização de áudio no canvas.
 * Usa `requestAnimationFrame` para um loop contínuo de renderização.
 */
function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);

    // Retorna se o analisador não foi inicializado ou o contexto está suspenso
    if (!analyser || (audioContext && audioContext.state === 'suspended')) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray); // Obtém os dados de frequência do áudio

    visualizerCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height); // Limpa o canvas
    // A cor de fundo é definida no CSS para a visualizer-container

    const barWidth = (visualizerCanvas.width / bufferLength) * 2.5; // Ajusta a largura da barra para preencher melhor
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2; // Escala a altura para melhor visualização

        // Desenha as barras com cores dinâmicas e gradiente
        const gradient = visualizerCtx.createLinearGradient(0, visualizerCanvas.height, 0, visualizerCanvas.height - barHeight);
        gradient.addColorStop(0, `rgb(78, 205, 196)`); // Cor inicial (azul-verde)
        gradient.addColorStop(1, `rgb(${barHeight + 100}, 50, ${255 - barHeight})`); // Cor final dinâmica
        visualizerCtx.fillStyle = gradient;
        visualizerCtx.fillRect(x, visualizerCanvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1; // Espaçamento entre as barras
    }
}

// --- Funções do Equalizador ---

/**
 * Cria os sliders do equalizador dinamicamente com base nas frequências definidas.
 */
function createEqualizerSliders() {
    equalizerControlsDiv.innerHTML = ''; // Limpa controles existentes

    eqFrequencies.forEach((freq, index) => {
        const eqBand = document.createElement('div');
        eqBand.classList.add('eq-band');
        eqBand.innerHTML = `
            <span class="eq-band-label">${freq >= 1000 ? `${freq / 1000}K` : freq} Hz</span>
            <input type="range" min="-12" max="12" value="0" step="0.1" class="eq-band-slider" data-band-index="${index}">
            <span class="eq-band-value" id="eq-band-${index}-value">0 dB</span>
        `;
        equalizerControlsDiv.appendChild(eqBand);
    });

    // Adiciona event listeners aos novos sliders do equalizador
    document.querySelectorAll('.eq-band-slider').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const index = parseInt(e.target.dataset.bandIndex);
            const gainValue = parseFloat(e.target.value);

            // Aplica o ganho do equalizador a ambos os conjuntos de filtros (para Faixa 1 e Faixa 2)
            if (eqFilters1[index]) {
                eqFilters1[index].gain.value = gainValue;
            }
            if (eqFilters2[index]) {
                eqFilters2[index].gain.value = gainValue;
            }

            document.getElementById(`eq-band-${index}-value`).textContent = `${gainValue.toFixed(1)} dB`;
            // Redefine a seleção de preset para "Personalizado" se o usuário ajustar um slider manualmente
            eqPresetSelect.value = "Personalizado";
        });
    });
}

/**
 * Popula o dropdown de presets do equalizador e adiciona o event listener.
 */
function populateEqPresets() {
    eqPresetSelect.innerHTML = ''; // Limpa opções existentes

    // Adiciona uma opção para "Personalizado" que não altera os sliders automaticamente
    const customOption = document.createElement('option');
    customOption.value = "Personalizado";
    customOption.textContent = "Personalizado";
    eqPresetSelect.appendChild(customOption);

    for (const presetName in eqPresets) {
        const option = document.createElement('option');
        option.value = presetName;
        option.textContent = presetName;
        eqPresetSelect.appendChild(option);
    }

    eqPresetSelect.addEventListener('change', (e) => {
        const selectedPreset = e.target.value;
        if (selectedPreset !== "Personalizado") {
            applyEqPreset(selectedPreset);
        }
    });
}

/**
 * Aplica um preset de equalizador, atualizando os filtros e os sliders da UI.
 * @param {string} presetName - O nome do preset a ser aplicado.
 */
function applyEqPreset(presetName) {
    const gains = eqPresets[presetName];
    if (!gains || !tracksInitialized) {
        console.warn(`Preset "${presetName}" não encontrado ou AudioContext não inicializado.`);
        return;
    }

    document.querySelectorAll('.eq-band-slider').forEach((slider, index) => {
        const gainValue = gains[index];
        slider.value = gainValue; // Atualiza a posição do slider
        document.getElementById(`eq-band-${index}-value`).textContent = `${gainValue.toFixed(1)} dB`; // Atualiza o valor dB

        // Aplica o ganho ao filtro correspondente para ambas as faixas
        if (eqFilters1[index]) {
            eqFilters1[index].gain.value = gainValue;
        }
        if (eqFilters2[index]) {
            eqFilters2[index].gain.value = gainValue;
        }
    });
    console.log(`Preset "${presetName}" aplicado.`);
}


// --- Funções da Playlist ---

/**
 * Popula os dropdowns de seleção de faixa com as músicas da playlist.
 */
function populateTrackSelectors() {
    track1Select.innerHTML = '';
    track2Select.innerHTML = '';

    playlist.forEach((track, index) => {
        // Opções para o seletor da Faixa 1
        const option1 = document.createElement('option');
        option1.value = index;
        option1.textContent = `${track.title} - ${track.artist}`;
        track1Select.appendChild(option1);

        // Opções para o seletor da Faixa 2
        const option2 = document.createElement('option');
        option2.value = index;
        option2.textContent = `${track.title} - ${track.artist}`;
        track2Select.appendChild(option2);
    });

    // Define as faixas selecionadas inicialmente
    track1Select.value = 0; // Primeira faixa por padrão na Faixa 1
    track2Select.value = 1 % playlist.length; // Segunda faixa por padrão na Faixa 2 (ou volta para 0 se só tiver 1)

    // Carrega as faixas iniciais assim que os seletores são populados e o contexto de áudio estiver pronto (após a primeira interação)
    loadTrack(audio1, playlist[track1Select.value], 'track1');
    loadTrack(audio2, playlist[track2Select.value], 'track2');
}

/**
 * Popula a exibição da playlist no DOM.
 */
function populatePlaylist() {
    playlistContainer.innerHTML = '';
    playlist.forEach((track, index) => {
        const playlistItem = document.createElement('div');
        playlistItem.classList.add('playlist-item');
        playlistItem.dataset.index = index; // Armazena o índice da faixa
        
        // Determina a classe de cor da arte do álbum
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
        // Adiciona um evento de clique para reproduzir a faixa selecionada da playlist na Faixa 1
        playlistItem.addEventListener('click', () => {
            currentTrackIndex = index;
            loadTrack(audio1, playlist[currentTrackIndex], 'track1');
            playAudio(audio1);
            isPlaying = true;
            playIcon.classList.remove('fa-play');
            playIcon.classList.add('fa-pause');
            updatePlaylistUI();
        });
        playlistContainer.appendChild(playlistItem);
    });
}

/**
 * Atualiza a classe 'playing' nos itens da playlist para destacar a faixa principal em reprodução.
 */
function updatePlaylistUI() {
    document.querySelectorAll('.playlist-item').forEach(item => {
        item.classList.remove('playing');
    });
    const playingItem = document.querySelector(`.playlist-item[data-index="${currentTrackIndex}"]`);
    if (playingItem) {
        playingItem.classList.add('playing');
    }
}

// --- Listeners de Eventos ---

// Controles do Player Principal (controla Faixa 1)
playPauseBtn.addEventListener('click', togglePlayPause);
prevBtn.addEventListener('click', playPrevTrack);
nextBtn.addEventListener('click', playNextTrack);
progressContainer.addEventListener('click', setProgressBar);

// Eventos do elemento de áudio principal (audio1)
audio1.addEventListener('timeupdate', updateProgressBar); // Atualiza barra de progresso durante a reprodução
audio1.addEventListener('ended', playNextTrack); // Toca a próxima faixa quando a atual termina
audio1.addEventListener('loadedmetadata', updateProgressBar); // Atualiza o tempo total quando os metadados são carregados

// Seletores de Faixa para Multi-Faixa
track1Select.addEventListener('change', (e) => {
    const selectedIndex = parseInt(e.target.value);
    loadTrack(audio1, playlist[selectedIndex], 'track1');
    if (isPlaying) { // Se o player principal estiver tocando, continua a reprodução
        playAudio(audio1);
    }
});

track2Select.addEventListener('change', (e) => {
    const selectedIndex = parseInt(e.target.value);
    loadTrack(audio2, playlist[selectedIndex], 'track2');
    // A Faixa 2 não inicia automaticamente, o usuário precisa clicar em seu próprio botão de play
});

// Sliders de Volume Independentes para cada Faixa
track1VolumeSlider.addEventListener('input', (e) => {
    if (gainNode1) {
        gainNode1.gain.value = parseFloat(e.target.value);
    }
});

track2VolumeSlider.addEventListener('input', (e) => {
    if (gainNode2) {
        gainNode2.gain.value = parseFloat(e.target.value);
    }
});

// Botões de Play/Pause Independentes para cada Faixa
track1PlayPauseBtn.addEventListener('click', () => {
    initializeAudioContext(); // Garante que o contexto esteja inicializado
    if (audio1.paused) {
        playAudio(audio1);
        track1PlayPauseBtn.querySelector('i').classList.remove('fa-play');
        track1PlayPauseBtn.querySelector('i').classList.add('fa-pause');
    } else {
        pauseAudio(audio1);
        track1PlayPauseBtn.querySelector('i').classList.remove('fa-pause');
        track1PlayPauseBtn.querySelector('i').classList.add('fa-play');
    }
    // Sincroniza o botão de play/pause principal se a Faixa 1 for controlada
    if (audio1.paused) {
        playIcon.classList.remove('fa-pause');
        playIcon.classList.add('fa-play');
        isPlaying = false;
    } else {
        playIcon.classList.remove('fa-play');
        playIcon.classList.add('fa-pause');
        isPlaying = true;
    }
    updatePlaylistUI();
});

track2PlayPauseBtn.addEventListener('click', () => {
    initializeAudioContext(); // Garante que o contexto esteja inicializado
    if (audio2.paused) {
        playAudio(audio2);
        track2PlayPauseBtn.querySelector('i').classList.remove('fa-play');
        track2PlayPauseBtn.querySelector('i').classList.add('fa-pause');
    } else {
        pauseAudio(audio2);
        track2PlayPauseBtn.querySelector('i').classList.remove('fa-pause');
        track2PlayPauseBtn.querySelector('i').classList.add('fa-play');
    }
});

// Botões de Efeito
noiseReductionBtn.addEventListener('click', function() {
    if (!lowPassFilter) {
        console.warn("AudioContext ou LowPassFilter não inicializado.");
        return;
    }
    if (this.textContent === 'Ativar') {
        this.textContent = 'Desativar';
        this.style.background = 'rgba(78, 205, 196, 0.8)'; // Cor de ativado
        lowPassFilter.frequency.value = 3000; // Reduz a frequência de corte para filtrar mais agudos (ruído)
        console.log("Remoção de Ruído ativada (LowPassFilter em 3000Hz).");
    } else {
        this.textContent = 'Ativar';
        this.style.background = 'rgba(40, 40, 60, 0.7)'; // Cor de desativado
        lowPassFilter.frequency.value = 5000; // Restaura a frequência de corte padrão
        console.log("Remoção de Ruído desativada (LowPassFilter em 5000Hz).");
    }
});

reverbBtn.addEventListener('click', function() {
    // Para uma funcionalidade real de Reverb, você precisaria de um ConvolverNode
    // e carregar um arquivo de resposta de impulso (impulse response audio file).
    // Isso é mais complexo e vai além de um simples toggle.
    this.textContent = this.textContent === 'Ativar' ? 'Desativar' : 'Ativar';
    this.style.background = this.textContent === 'Desativar' ? 'rgba(78, 205, 196, 0.8)' : 'rgba(40, 40, 60, 0.7)';
    console.log("Reverb alternado (funcionalidade placeholder).");
});

echoBtn.addEventListener('click', function() {
    // Para uma funcionalidade real de Eco, você precisaria de um DelayNode
    // e talvez um nó de ganho para feedback.
    this.textContent = this.textContent === 'Ativar' ? 'Desativar' : 'Ativar';
    this.style.background = this.textContent === 'Desativar' ? 'rgba(78, 205, 196, 0.8)' : 'rgba(40, 40, 60, 0.7)';
    console.log("Eco alternado (funcionalidade placeholder).");
});

// --- Chamadas de Configuração Inicial ---
// Garante que o DOM esteja totalmente carregado antes de manipular elementos
document.addEventListener('DOMContentLoaded', () => {
    populatePlaylist();          // Popula a playlist
    createEqualizerSliders();    // Cria os sliders do equalizador
    populateEqPresets();         // Popula os presets do equalizador
    applyEqPreset("Padrão (Flat)"); // Aplica o preset padrão na inicialização
    populateTrackSelectors();    // Popula os seletores de faixa e carrega as faixas iniciais
    drawVisualizer();            // Inicia o loop de renderização do visualizador (ele espera o analyser)
});

// Lida com a suspensão e retomada do AudioContext em mudanças de visibilidade da aba do navegador
document.addEventListener('visibilitychange', () => {
    if (audioContext) {
        if (document.hidden) {
            audioContext.suspend();
        } else {
            audioContext.resume();
        }
    }
});
