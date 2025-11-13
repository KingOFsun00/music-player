// core/audioEngine.js
export class AudioEngine {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.masterGain.connect(this.analyser);

    this.eqBands = [60, 250, 1000, 4000, 16000];
    this.eqNodes = this.eqBands.map(f => this.createEQBand(f));

    this.eqNodes.reduce((prev, curr) => {
      prev.connect(curr);
      return curr;
    }).connect(this.masterGain);

    this.currentSource = null;
    this.currentBuffer = null;
  }

  createEQBand(frequency) {
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'peaking';
    filter.frequency.value = frequency;
    filter.Q.value = 1;
    filter.gain.value = 0;
    return filter;
  }

  async loadTrack(url) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this.currentBuffer = await this.ctx.decodeAudioData(arrayBuffer);
  }

  play() {
    if (!this.currentBuffer) return;
    this.stop();

    const src = this.ctx.createBufferSource();
    src.buffer = this.currentBuffer;
    src.connect(this.eqNodes[0]);
    src.start(0);
    this.currentSource = src;
  }

  stop() {
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource.disconnect();
      this.currentSource = null;
    }
  }

  setVolume(value) {
    this.masterGain.gain.value = value;
  }

  setEQGain(bandIndex, gainValue) {
    if (this.eqNodes[bandIndex]) {
      this.eqNodes[bandIndex].gain.value = gainValue;
    }
  }

  getAnalyser() {
    return this.analyser;
  }
}
 