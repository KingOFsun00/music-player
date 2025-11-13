// core/drumPad.js
export class DrumPad {
  constructor(ctx) {
    this.ctx = ctx;
    this.buffers = new Map();
  }

  async loadSound(name, url) {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.buffers.set(name, buffer);
    } catch {
      console.warn(`Falha ao carregar ${name}, gerando som sintético...`);
      this.buffers.set(name, this.generateSynthetic(name));
    }
  }

  generateSynthetic(type) {
    const sampleRate = this.ctx.sampleRate;
    const duration = 0.3;
    const length = sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let s = 0;
      switch (type) {
        case 'kick':
          s = Math.sin(2 * Math.PI * 60 * t) * Math.exp(-t * 30);
          break;
        case 'snare':
          s = (Math.random() * 2 - 1) * Math.exp(-t * 20);
          break;
        case 'hihat':
          s = (Math.random() * 2 - 1) * Math.exp(-t * 50);
          break;
        default:
          s = Math.sin(2 * Math.PI * 200 * t) * Math.exp(-t * 10);
      }
      data[i] = s * 0.4;
    }
    return buffer;
  }

  play(name) {
    const buffer = this.buffers.get(name);
    if (!buffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.ctx.destination);
    src.start();
  }
}


// core/drumPad.js
export class DrumPad {
  constructor(ctx) {
    this.ctx = ctx;
    this.buffers = new Map();
    this.isRecording = false;
    this.sequence = [];
    this.startTime = 0;
  }

  async loadSounds(sounds) {
    for (const [name, url] of Object.entries(sounds)) {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.buffers.set(name, buffer);
    }
  }

  play(name) {
    const buffer = this.buffers.get(name);
    if (!buffer) return;

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    // Volume & filtros
    const gain = this.ctx.createGain();
    gain.gain.value = 0.8;

    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.start();

    // Efeito visual do botão
    const pad = document.querySelector(`.drum-pad[data-sound="${name}"]`);
    if (pad) {
      pad.classList.add("active");
      setTimeout(() => pad.classList.remove("active"), 100);
    }

    // Se estiver gravando, registra o evento
    if (this.isRecording) {
      const time = this.ctx.currentTime - this.startTime;
      this.sequence.push({ name, time });
    }
  }

  startRecording() {
    this.sequence = [];
    this.startTime = this.ctx.currentTime;
    this.isRecording = true;
    console.log("🎙️ Gravação iniciada...");
  }

  stopRecording() {
    this.isRecording = false;
    console.log("🛑 Gravação finalizada:", this.sequence);
  }

  playSequence() {
    console.log("▶️ Reproduzindo sequência...");
    this.sequence.forEach((note) => {
      setTimeout(() => this.play(note.name), note.time * 1000);
    });
  }
}
