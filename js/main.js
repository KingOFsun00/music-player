// js/main.js
import { AudioEngine } from './core/audioEngine.js';
import { TrackManager } from './core/trackManager.js';
import { DrumPad } from './core/drumPad.js';
import { Visualizer } from './core/visualizer.js';
import { Effects } from './core/effects.js';
import { UIManager } from './ui/uiManager.js';
import { ThemeManager } from './ui/theme.js';


//Inicialização dos módulos principais

const audioEngine = new AudioEngine();
const trackManager = new TrackManager(audioEngine);
const effects = new Effects(audioEngine.ctx);
const drumPad = new DrumPad(audioEngine.ctx);

//Canvas para o visualizador
const canvas = document.getElementById('visualizer');
const visualizer = new Visualizer(canvas, audioEngine.getAnalyser());
visualizer.start();


//Adiciona todas as músicas da versão original

trackManager.loadPlaylist([
  { title: "A Via Láctea", artist: "Legião Urbana", src: "./musicas/A Via Láctea.mp3" },
  { title: "Trem Bala", artist: "Ana Vilela", src: "./musicas/Trem Bala.mp3" },
  { title: "MOONLIGHT", artist: "XXXTENTACION", src: "./musicas/MOONLIGHT.mp3" },
  { title: "Arms Around You", artist: "XXXTENTACION", src: "./musicas/Arms Around You.mp3" },
  { title: "Let Her Go", artist: "Passenger", src: "./musicas/Let Her Go.mp3" },
  { title: "Snap", artist: "Rosa Linn", src: "./musicas/Snap.mp3" },
  { title: "Falling", artist: "Trevor Daniel", src: "./musicas/Falling.mp3" },
  { title: "Dandelions", artist: "Ruth B.", src: "./musicas/Dandelions.mp3" },
  { title: "Something Just Like This", artist: "The Chainsmokers & Coldplay", src: "./musicas/Something Just Like This.mp3" },
  { title: "Infinity", artist: "Jaymes Young", src: "./musicas/Infinity.mp3" }
]);


//Inicializa o gerenciador da interface

const ui = new UIManager({
  audioEngine,
  trackManager,
  effects,
  drumPad,
  visualizer
});
await ui.init();


// Tema (modo claro/escuro)

const theme = new ThemeManager();
theme.attachToggle("theme-toggle");
theme.initColorPicker();


// Começa a tocar automaticamente

(async () => {
  await trackManager.loadTrack(0);  // Carrega a primeira faixa
  audioEngine.play();               // Começa a reprodução
})();
// duplicate theme initialization removed
theme.initColorPicker(); // 🔥 ativa o seletor
