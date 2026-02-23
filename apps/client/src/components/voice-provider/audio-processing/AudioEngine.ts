// Use the packaged worklet - it includes proper WASM glue and an exported
// worklet entrypoint that works with bundlers like Vite.
import { NoiseSuppressorWorklet_Name } from '@timephy/rnnoise-wasm';
import NoiseSuppressorWorklet from '@timephy/rnnoise-wasm/NoiseSuppressorWorklet?worker&url';

export class AudioEngine {
  private context!: AudioContext;
  private source!: MediaStreamAudioSourceNode;
  private workletNode!: AudioWorkletNode;
  private destination!: MediaStreamAudioDestinationNode;

  async init(inputStream: MediaStream) {
    if (!this.context) {
      this.context = new AudioContext({ sampleRate: 48000 });
    }

    await this.context.audioWorklet.addModule(
      NoiseSuppressorWorklet as unknown as string
    );

    this.source = this.context.createMediaStreamSource(inputStream);

    this.workletNode = new AudioWorkletNode(
      this.context,
      NoiseSuppressorWorklet_Name
    );

    this.destination = this.context.createMediaStreamDestination();

    this.source.connect(this.workletNode);
    this.workletNode.connect(this.destination);

    return this.destination.stream;
  }

  async destroy() {
    try {
      this.workletNode?.disconnect();
      this.source?.disconnect();
    } catch (e) {
      // ignore
    }

    await this.context?.close();
  }
}
