// --- SEU ARQUIVO JAVASCRIPT (por exemplo, 'arquivo.js') ---

// --- Seleção de Elementos do DOM ---
// É fundamental que essas variáveis sejam declaradas E inicializadas AQUI,
// antes que qualquer função tente usá-las.
const currentTrackEl = document.getElementById('current-track');
const currentArtistEl = document.getElementById('current-artist');
const playPauseBtn = document.getElementById('play-pause-btn');
const playIcon = document.getElementById('play-icon');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const progressBar = document.getElementById('progress-bar');
const progressContainer = document.getElementById('progress-container');
const currentTimeEl = document.getElementById('current-time');
const totalTimeEl = document.getElementById('total-time');
const playlistEl = document.getElementById('playlist'); // Este é o div com id="playlist"
const visualizer = document.getElementById('visualizer');
const ctx = visualizer.getContext('2d');

// Controles de Equalizador
const bassSlider = document.getElementById('bass-slider');
const midSlider = document.getElementById('mid-slider');
const trebleSlider = document.getElementById('treble-slider');
const bassValueEl = document.getElementById('bass-value');
const midValueEl = document.getElementById('mid-value');
const trebleValueEl = document.getElementById('treble-value');

// Efeitos Sonoros
const noiseReductionBtn = document.getElementById('noise-reduction-btn');
const reverbBtn = document.getElementById('reverb-btn');
const echoBtn = document.getElementById('echo-btn');

// --- Variáveis Globais ---
// Mover a playlistData para o escopo global
const playlistData = [
    { title: "A Via Láctea", artist: "Legião Urbana", duration: "4:00", color: "color-1", file: "./musicas/A Via Láctea.mp3" },
    { title: "La Solitudine", artist: "Laura Pausini", duration: "4:00", color: "color-2", file: "./musicas/la Solitudine.mp3" },
    { title: "Trem Bala", artist: "Ana Vilela", duration: "3:00", color: "color-3", file: "./musicas/Ana Vilela.mp3" },
    { title: "Moonlight", artist: "XXXTENTACION", duration: "2:15", color: "color-4", file: "./musicas/MOONLIGHT.mp3" },
    { title: "Não Existe Amor Em SP", artist: "Criolo", duration: "3:45", color: "color-5", file: "./musicas/criolo.mp3" },
    { title: "Vento no Litoral", artist: "Legião Urbana", duration: "6:00", color: "color-1", file: "./musicas/vento no litoral.mp3" }
    // Adicione mais músicas aqui, se desejar
];

let currentTrackIndex = 0;
let isPlaying = false;
const audioElement = new Audio(); // O elemento Audio do HTML5
let audioContext;
let analyser;
let source; // MediaElementSourceNode para conectar o audioElement ao AudioContext
let animationId; // Para a animação do visualizador
let isInitialized = false; // Flag para garantir que o AudioContext seja configurado apenas uma vez

// Variáveis globais para os filtros do Web Audio API
let eqFilters = [];
let lowPassFilter;
let compressor;
let subBassFilter; // Declarar subBassFilter aqui também

// --- Funções de Controle do Reprodutor ---

// Função para criar um BiquadFilterNode
function createFilter(type, freq, gain = 0, Q = 1) {
    const filter = audioContext.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.gain.value = gain;
    filter.Q.value = Q;
    return filter;
}

function renderPlaylist() {
    playlistEl.innerHTML = ''; // Limpa a playlist existente no HTML
    playlistData.forEach((track, index) => {
        const item = document.createElement('div');
        item.classList.add('playlist-item');
        if (index === currentTrackIndex) {
            item.classList.add('playing'); // Adiciona a classe 'playing' para a música atual
        }
        item.dataset.index = index;

        item.innerHTML = `
            <div class="playlist-art ${track.color}">
                <i class="fas fa-music"></i>
            </div>
            <div class="playlist-info">
                <div class="playlist-track">${track.title}</div>
                <div class="playlist-artist">${track.artist}</div>
            </div>
            <div class="playlist-duration">${track.duration}</div>
        `;
        
        item.addEventListener('click', () => {
            currentTrackIndex = index; // Atualiza o índice da música atual
            loadTrack(currentTrackIndex); // Carrega a música clicada
            playTrack(); // Começa a tocar
            // Atualiza o destaque na playlist
            document.querySelectorAll('.playlist-item').forEach(el => el.classList.remove('playing'));
            item.classList.add('playing');
        });
        playlistEl.appendChild(item);
    });
}

function loadTrack(index) {
    currentTrackIndex = index;
    const track = playlistData[currentTrackIndex];
    currentTrackEl.textContent = track.title;
    currentArtistEl.textContent = track.artist;
    
    // Atualiza a arte do álbum com a cor da faixa
    const albumArtEl = document.querySelector('.album-art');
    if (albumArtEl) { // Verifica se o elemento existe antes de manipular
      albumArtEl.className = `album-art ${track.color}`;
    }

    audioElement.src = track.file; // Define o caminho do arquivo de áudio
    audioElement.load(); // Carrega a música
    
    // Resetar tempo e barra de progresso
    currentTimeEl.textContent = '0:00';
    progressBar.style.width = '0%';
    
    // Remove a classe 'playing' de todas as faixas e adiciona à faixa atual
    document.querySelectorAll('.playlist-item').forEach((item, i) => {
        item.classList.toggle('playing', i === index);
    });

    // Quando os metadados são carregados, atualizamos a duração
    audioElement.addEventListener('loadedmetadata', () => {
        const duration = audioElement.duration;
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        totalTimeEl.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    });
}

function playTrack() {
    // Inicializa AudioContext e AnalyserNode apenas uma vez e na primeira interação do usuário
    if (!isInitialized) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256; // Ajusta a qualidade da visualização

        // Crie a cadeia de áudio aqui uma única vez
        source = audioContext.createMediaElementSource(audioElement);
        
        subBassFilter = createFilter('peaking', 60, 0, 0.707); // Sub-graves
        
        eqFilters = [
            createFilter('lowshelf', 150),   // Graves
            createFilter('peaking', 1000),  // Médios
            createFilter('highshelf', 4000) // Agudos
        ];
        
        lowPassFilter = audioContext.createBiquadFilter();
        lowPassFilter.type = 'lowpass';
        lowPassFilter.frequency.value = 5000; // Frequência de corte inicial

        compressor = audioContext.createDynamicsCompressor();
        compressor.threshold.value = -20;
        compressor.ratio.value = 4;
        
        // Conexão da cadeia de áudio:
        // source -> subBassFilter -> eqFilters[0] -> eqFilters[1] -> eqFilters[2] -> lowPassFilter -> compressor -> analyser -> destination
        
        source.connect(subBassFilter);
        subBassFilter.connect(eqFilters[0]);
        eqFilters[0].connect(eqFilters[1]);
        eqFilters[1].connect(eqFilters[2]);
        eqFilters[2].connect(lowPassFilter);
        lowPassFilter.connect(compressor);
        compressor.connect(analyser);
        analyser.connect(audioContext.destination);

        console.log("Cadeia de áudio conectada!");
        isInitialized = true;
        animateVisualizer(); // Inicia a animação do visualizador após a inicialização do AudioContext
    }

    // Garante que o AudioContext não esteja suspenso (política de autoplay)
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    audioElement.play()
        .then(() => {
            isPlaying = true;
            playIcon.className = 'fas fa-pause';
            audioElement.addEventListener('timeupdate', updateProgress);
        })
        .catch(error => {
            console.error("Erro ao reproduzir:", error);
            alert("Não foi possível reproduzir a música. Verifique se o navegador permite autoplay ou tente interagir com a página primeiro (clicar em play).");
        });
}

function pauseTrack() {
    audioElement.pause();
    isPlaying = false;
    playIcon.className = 'fas fa-play';
    audioElement.removeEventListener('timeupdate', updateProgress);
}

function togglePlayPause() {
    if (isPlaying) {
        pauseTrack();
    } else {
        playTrack();
    }
}

function nextTrack() {
    currentTrackIndex = (currentTrackIndex + 1) % playlistData.length;
    loadTrack(currentTrackIndex);
    if (isPlaying) { // Só toca se já estava tocando
        playTrack();
    }
}

function prevTrack() {
    currentTrackIndex = (currentTrackIndex - 1 + playlistData.length) % playlistData.length;
    loadTrack(currentTrackIndex);
    if (isPlaying) { // Só toca se já estava tocando
        playTrack();
    }
}

function updateProgress() {
    const { currentTime, duration } = audioElement;
    if (isNaN(duration)) return; // Evita erros se a duração ainda não estiver disponível

    const progressPercent = (currentTime / duration) * 100;
    progressBar.style.width = `${progressPercent}%`;
    
    const minutes = Math.floor(currentTime / 60);
    const seconds = Math.floor(currentTime % 60);
    currentTimeEl.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

    if (audioElement.ended) {
        nextTrack();
    }
}

function setProgress(e) {
    const width = this.clientWidth;
    const clickX = e.offsetX;
    const duration = audioElement.duration;
    if (isNaN(duration)) return; // Evita erros se a duração não estiver disponível

    audioElement.currentTime = (clickX / width) * duration;
}

// --- Funções de Visualização ---

function resizeCanvas() {
    visualizer.width = visualizer.clientWidth;
    visualizer.height = visualizer.clientHeight;
}

function animateVisualizer() {
    if (!analyser) {
        animationId = requestAnimationFrame(animateVisualizer); // Tenta novamente se o analisador não estiver pronto
        return;
    }
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    const width = visualizer.width;
    const height = visualizer.height;
    
    ctx.clearRect(0, 0, width, height);
    
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#4ecdc4';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#4ecdc4';
    
    ctx.beginPath();
    
    const sliceWidth = width * 1.0 / bufferLength;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * height / 2;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
    }
    
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    
    animationId = requestAnimationFrame(animateVisualizer);
}

// --- Configuração de Event Listeners ---

function setupEventListeners() {
    playPauseBtn.addEventListener('click', togglePlayPause);
    prevBtn.addEventListener('click', prevTrack);
    nextBtn.addEventListener('click', nextTrack);
    progressContainer.addEventListener('click', setProgress);
    window.addEventListener('resize', resizeCanvas);

    // Event listeners para os sliders do equalizador
    bassSlider.addEventListener('input', updateEqualizer);
    midSlider.addEventListener('input', updateEqualizer);
    trebleSlider.addEventListener('input', updateEqualizer);

    // Event listeners para os botões de efeito
    noiseReductionBtn.addEventListener('click', function() {
        if (this.textContent === 'Ativar') {
            this.textContent = 'Desativar';
            this.style.background = 'rgba(255, 107, 107, 0.8)';
            if (lowPassFilter) {
                lowPassFilter.frequency.value = 3000;
            }
        } else {
            this.textContent = 'Ativar';
            this.style.background = 'rgba(40, 40, 60, 0.7)';
            if (lowPassFilter) {
                lowPassFilter.frequency.value = 5000;
            }
        }
    });

    reverbBtn.addEventListener('click', function() {
        toggleEffect(reverbBtn, 'reverb');
    });
    
    echoBtn.addEventListener('click', function() {
        toggleEffect(echoBtn, 'echo');
    });
}

// Adapte a função updateEqualizer para controlar os filtros corretos
function updateEqualizer() {
    if (eqFilters.length > 0 && bassSlider && midSlider && trebleSlider) { // Verifica se os elementos e filtros existem
        eqFilters[0].gain.value = parseFloat(bassSlider.value); // Graves (lowshelf)
        eqFilters[1].gain.value = parseFloat(midSlider.value);  // Médios (peaking)
        eqFilters[2].gain.value = parseFloat(trebleSlider.value); // Agudos (highshelf)

        // Atualizar os valores exibidos
        bassValueEl.textContent = `${bassSlider.value} dB`;
        midValueEl.textContent = `${midSlider.value} dB`;
        trebleValueEl.textContent = `${trebleSlider.value} dB`;
    }
}

// Função placeholder para toggleEffect - implemente a lógica real de áudio para efeitos
function toggleEffect(button, effectName) {
    if (button.textContent.includes('Ativar')) {
        button.textContent = `Desativar ${effectName}`;
        button.style.background = 'rgba(255, 107, 107, 0.8)';
        console.log(`Efeito ${effectName} ativado.`);
        // Lógica para ativar o efeito de áudio
    } else {
        button.textContent = `Ativar ${effectName}`;
        button.style.background = 'rgba(40, 40, 60, 0.7)';
        console.log(`Efeito ${effectName} desativado.`);
        // Lógica para desativar o efeito de áudio
    }
}


// --- Inicialização ---
function init() {
    // A inicialização do AudioContext e da cadeia de áudio agora está na playTrack()
    // e é chamada apenas uma vez após a primeira interação do usuário,
    // para estar em conformidade com as políticas de autoplay.

    renderPlaylist(); // Renderiza a playlist no HTML
    loadTrack(currentTrackIndex); // Carrega a primeira música na UI
    setupEventListeners(); // Configura todos os ouvintes de eventos
    resizeCanvas(); // Garante que o canvas tenha o tamanho correto na inicialização
    // animateVisualizer() é chamado dentro de playTrack na primeira vez
}

// Iniciar quando a página carregar
window.addEventListener('load', init);