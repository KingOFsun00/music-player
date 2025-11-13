// core/trackManager.js
export class TrackManager {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
    this.playlist = [];
    this.currentIndex = 0;
  }

  loadPlaylist(tracks) {
    this.playlist = tracks;
  }

  async loadTrack(index) {
    if (!this.playlist[index]) return;
    this.currentIndex = index;
    await this.audioEngine.loadTrack(this.playlist[index].src);
  }

  async next() {
    this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
    await this.loadTrack(this.currentIndex);
    this.audioEngine.play();
  }

  async previous() {
    this.currentIndex =
      (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
    await this.loadTrack(this.currentIndex);
    this.audioEngine.play();
  }

  getCurrentTrack() {
    return this.playlist[this.currentIndex] || null;
  }
}
