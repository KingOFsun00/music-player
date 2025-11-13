// ui/uiManager.js
import { Utils } from "../core/utils.js";

export class UIManager {
  constructor({ audioEngine, trackManager, effects, drumPad, visualizer }) {
    this.audioEngine = audioEngine;
    this.trackManager = trackManager;
    this.effects = effects;
    this.drumPad = drumPad;
    this.visualizer = visualizer;
    this.isPlaying = false;
  }

  async init() {
    // === Referências principais ===
    this.elements = {
      playPauseBtn: document.getElementById("play-pause-btn"),
      playIcon: document.getElementById("play-icon"),
      nextBtn: document.getElementById("next-btn"),
      prevBtn: document.getElementById("prev-btn"),
      progressBar: document.getElementById("progress-bar"),
      progressContainer: document.getElementById("progress-container"),
      masterVolume: document.getElementById("master-volume"),
      volumeDisplay: document.getElementById("volume-display"),
      trackTitle: document.getElementById("current-track"),
      trackArtist: document.getElementById("current-artist"),
      eqSliders: document.querySelectorAll(".eq-band-slider"),
      effectButtons: document.querySelectorAll(".effect-btn"),
      drumPads: document.querySelectorAll(".drum-pad"),
      themeToggle: document.getElementById("theme-toggle"),
      visualizerToggle: document.getElementById("visualizer-toggle"),
    };

    // === Eventos principais ===
    this.setupPlayerControls();
    this.setupVolume();
    this.setupEqualizer();
    this.setupEffects();
    this.setupDrumPad();
    this.setupVisualizerToggle();

    console.log("🎛️ UI Manager inicializado");
  }

  // =====================================
  // 🎵 PLAYER PRINCIPAL
  // =====================================
  setupPlayerControls() {
    this.elements.playPauseBtn?.addEventListener("click", async () => {
      if (!this.isPlaying) {
        const current = this.trackManager.getCurrentTrack();
        if (!current) {
          await this.trackManager.loadTrack(0);
        }
        this.audioEngine.play();
        this.isPlaying = true;
        this.updatePlayButton(true);
      } else {
        this.audioEngine.stop();
        this.isPlaying = false;
        this.updatePlayButton(false);
      }
    });

    this.elements.nextBtn?.addEventListener("click", async () => {
      await this.trackManager.next();
      this.updateTrackInfo();
    });

    this.elements.prevBtn?.addEventListener("click", async () => {
      await this.trackManager.previous();
      this.updateTrackInfo();
    });

    this.elements.progressContainer?.addEventListener("click", (e) => {
      // (Para versão avançada: vincular posição via áudio element)
      console.log("Barra de progresso clicada em:", e.offsetX);
    });
  }

  updatePlayButton(isPlaying) {
    if (this.elements.playIcon) {
      this.elements.playIcon.className = isPlaying
        ? "fas fa-pause"
        : "fas fa-play";
    }
  }

  updateTrackInfo() {
    const track = this.trackManager.getCurrentTrack();
    if (!track) return;
    this.elements.trackTitle.textContent = track.title;
    this.elements.trackArtist.textContent = track.artist;
  }

  // =====================================
  // 🔊 VOLUME E EQUALIZADOR
  // =====================================
  setupVolume() {
    const { masterVolume, volumeDisplay } = this.elements;
    if (!masterVolume) return;

    masterVolume.addEventListener("input", (e) => {
      const vol = parseFloat(e.target.value);
      this.audioEngine.setVolume(vol);
      if (volumeDisplay) volumeDisplay.textContent = `${Math.round(vol * 100)}%`;
    });
  }

  setupEqualizer() {
    const eqContainer = document.getElementById("equalizer-controls");
    if (!eqContainer) return;

    // Cria 5 bandas de EQ dinamicamente
    this.audioEngine.eqBands.forEach((freq, i) => {
      const wrapper = document.createElement("div");
      wrapper.classList.add("eq-band");

      const label = document.createElement("div");
      label.classList.add("eq-band-label");
      label.textContent = `${freq}Hz`;

      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = -12;
      slider.max = 12;
      slider.value = 0;
      slider.step = 0.1;
      slider.classList.add("eq-band-slider");
      slider.addEventListener("input", () => {
        this.audioEngine.setEQGain(i, parseFloat(slider.value));
      });

      wrapper.appendChild(label);
      wrapper.appendChild(slider);
      eqContainer.appendChild(wrapper);
    });
  }

  // =====================================
  // ✨ EFEITOS
  // =====================================
  setupEffects() {
    this.elements.effectButtons?.forEach((btn) => {
      const effect = btn.dataset.effect;
      btn.addEventListener("click", () => {
        this.effects.toggle(effect);
        btn.classList.toggle("active");
      });
    });
  }

  // =====================================
  // 🥁 DRUM PAD
  // =====================================
  setupDrumPad() {
    this.elements.drumPads?.forEach((pad) => {
      const sound = pad.dataset.sound;
      pad.addEventListener("click", () => {
        this.drumPad.play(sound);
        this.animatePad(pad);
      });
    });

    // Atalhos de teclado (A–L)
    document.addEventListener("keydown", (e) => {
      const pad = document.querySelector(`.drum-pad[data-key="${e.keyCode}"]`);
      if (pad) {
        const sound = pad.dataset.sound;
        this.drumPad.play(sound);
        this.animatePad(pad);
      }
    });
  }

  animatePad(pad) {
    pad.classList.add("active");
    setTimeout(() => pad.classList.remove("active"), 150);
  }

  // =====================================
  // 🌈 VISUALIZADOR E TEMA
  // =====================================
  setupVisualizerToggle() {
    const toggle = this.elements.visualizerToggle;
    if (!toggle) return;
    toggle.addEventListener("click", () => {
      toggle.classList.toggle("active");
      if (toggle.classList.contains("active")) {
        this.visualizer.start();
      } else {
        this.visualizer.stop();
      }
    });
  }
}

<div class="drum-controls">
  <button id="record-pad">🎙️ Gravar</button>
  <button id="play-seq">▶️ Reproduzir</button>
</div>

document.getElementById('record-pad').addEventListener('click', () => {
  drumPad.startRecording();
});

document.getElementById('play-seq').addEventListener('click', () => {
  drumPad.playSequence();
});
