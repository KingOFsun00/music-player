// core/effects.js
export class Effects {
  constructor(ctx) {
    this.ctx = ctx;

    this.nodes = {
      convolver: ctx.createConvolver(),
      delay: ctx.createDelay(1.0),
      delayGain: ctx.createGain(),
      compressor: ctx.createDynamicsCompressor(),
      lowPass: ctx.createBiquadFilter()
    };

    this.nodes.delayGain.gain.value = 0.25;
    this.nodes.lowPass.type = 'lowpass';
    this.nodes.lowPass.frequency.value = 18000;

    this.enabled = {
      reverb: false,
      echo: false,
      compressor: false,
      noiseReduction: false
    };
  }

  toggle(effect) {
    this.enabled[effect] = !this.enabled[effect];
    console.log(`Efeito ${effect}:`, this.enabled[effect]);
  }

  apply(input, output) {
    let chain = input;

    if (this.enabled.noiseReduction) {
      chain.connect(this.nodes.lowPass);
      chain = this.nodes.lowPass;
    }

    if (this.enabled.compressor) {
      chain.connect(this.nodes.compressor);
      chain = this.nodes.compressor;
    }

    if (this.enabled.reverb) {
      chain.connect(this.nodes.convolver);
      chain = this.nodes.convolver;
    }

    if (this.enabled.echo) {
      chain.connect(this.nodes.delay);
      this.nodes.delay.connect(this.nodes.delayGain);
      this.nodes.delayGain.connect(output);
    }

    chain.connect(output);
  }
}
