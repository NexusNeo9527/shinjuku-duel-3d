import assert from 'node:assert/strict';
import { AudioEngine, BGM_TRACKS } from '../src/audio.js';

globalThis.window = {};
globalThis.Audio = class {
  dataset = {};
  paused = true;
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
};
const audio = new AudioEngine();
audio.fadeBgm = () => {};
assert.equal(audio.bgmId, null, 'menu starts without music');
audio.setScene('gojo');
assert.equal(audio.bgmId, 'normal');
audio.cycleBgm();
assert.equal(audio.bgmId, 'sifeng');
audio.cycleBgm();
assert.equal(audio.bgmId, 'yuta', 'all three tracks are reachable');
audio.cycleBgm();
assert.equal(audio.bgmId, 'normal', 'version cycle must never switch sound off');
audio.setMuted(true);
audio.cycleBgm();
assert.equal(audio.bgmId, 'sifeng');
assert.equal(audio.muted, true, 'changing version must preserve mute');
assert.equal(audio.bgm.muted, true);
audio.setMuted(false);
assert.equal(audio.bgmId, 'sifeng', 'unmuting must preserve selected version');
assert.equal(audio.bgm.muted, false);
assert.equal(BGM_TRACKS.length, 3);
audio.setScene('practice'); assert.equal(audio.bgmId, 'sifeng');
audio.setScene('story'); assert.equal(audio.bgmId, 'yuta');
console.log('Audio controls: three-track cycle, scene defaults and independent sound toggle passed.');
