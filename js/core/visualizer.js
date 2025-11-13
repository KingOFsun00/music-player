// core/visualizer.js
export class Visualizer {
  constructor(canvas, analyser) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.analyser = analyser;
    this.data = new Uint8Array(this.analyser.frequencyBinCount);
    this.animationId = null;

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
  }

  start() {
    const render = () => {
      this.analyser.getByteFrequencyData(this.data);
      const { width, height } = this.canvas;
      this.ctx.clearRect(0, 0, width, height);

      const barWidth = (width / this.data.length) * 2.5;
      let x = 0;

      for (let i = 0; i < this.data.length; i++) {
        const barHeight = this.data[i];
        const hue = (i / this.data.length) * 360;
        this.ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
        this.ctx.fillRect(x, height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }

      this.animationId = requestAnimationFrame(render);
    };
    render();
  }

  stop() {
    cancelAnimationFrame(this.animationId);
  }
}
