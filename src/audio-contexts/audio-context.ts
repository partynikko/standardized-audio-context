import { Injector } from '@angular/core';
import { AnalyserNode } from '../audio-nodes/analyser-node';
import { ChannelMergerNode } from '../audio-nodes/channel-merger-node';
import { ChannelSplitterNode } from '../audio-nodes/channel-splitter-node';
import { MediaElementAudioSourceNode } from '../audio-nodes/media-element-audio-source-node';
import { MediaStreamAudioSourceNode } from '../audio-nodes/media-stream-audio-source-node';
import { OscillatorNode } from '../audio-nodes/oscillator-node';
import { INVALID_STATE_ERROR_FACTORY_PROVIDER, InvalidStateErrorFactory } from '../factories/invalid-state-error';
import { isValidLatencyHint } from '../helpers/is-valid-latency-hint';
import { IAnalyserNode, IAudioContext, IAudioContextOptions, IOscillatorNode } from '../interfaces';
import {
    UNPATCHED_AUDIO_CONTEXT_CONSTRUCTOR_PROVIDER,
    unpatchedAudioContextConstructor as nptchdDCntxtCnstrctr
} from '../providers/unpatched-audio-context-constructor';
import { WINDOW_PROVIDER } from '../providers/window';
import { TUnpatchedAudioContext } from '../types';
import { BaseAudioContext } from './base-audio-context';

const injector = Injector.create({
    providers: [
        INVALID_STATE_ERROR_FACTORY_PROVIDER,
        UNPATCHED_AUDIO_CONTEXT_CONSTRUCTOR_PROVIDER,
        WINDOW_PROVIDER
    ]
});

const invalidStateErrorFactory = injector.get(InvalidStateErrorFactory);
const unpatchedAudioContextConstructor = injector.get(nptchdDCntxtCnstrctr);

export class AudioContext extends BaseAudioContext implements IAudioContext {
    private _state: null | 'suspended';

    private _unpatchedAudioContext: TUnpatchedAudioContext;

    constructor (options: IAudioContextOptions = {}) {
        if (unpatchedAudioContextConstructor === null) {
            throw new Error(); // @todo
        }

        const unpatchedAudioContext = new unpatchedAudioContextConstructor(options);

        // Bug #51 Only Chrome and Opera throw an error if the given latencyHint is invalid.
        if (!isValidLatencyHint(options.latencyHint)) {
            throw new TypeError(
                `The provided value '${ options.latencyHint }' is not a valid enum value of type AudioContextLatencyCategory.`
            );
        }

        super(unpatchedAudioContext, unpatchedAudioContext.destination.channelCount);

        this._state = null;
        this._unpatchedAudioContext = unpatchedAudioContext;

        /*
         * Bug #34: Chrome and Opera pretend to be running right away, but fire an onstatechange event when the state actually changes to
         * 'running'.
         */
        if (unpatchedAudioContext.state === 'running') {
            this._state = 'suspended';

            const revokeState = () => {
                if (this._state === 'suspended') {
                    this._state = null;
                }

                if (unpatchedAudioContext.removeEventListener) {
                    unpatchedAudioContext.removeEventListener('statechange', revokeState);
                }
            };

            unpatchedAudioContext.addEventListener('statechange', revokeState);
        }
    }

    public get state () {
        return (this._state !== null) ? this._state : this._unpatchedAudioContext.state;
    }

    public createAnalyser (): IAnalyserNode {
        return new AnalyserNode(this);
    }

    public createChannelMerger (numberOfInputs = 6) {
        return new ChannelMergerNode(this, { numberOfInputs });
    }

    public createChannelSplitter (numberOfOutputs = 6) {
        return new ChannelSplitterNode(this, { numberOfOutputs });
    }

    public createMediaElementSource (mediaElement: HTMLMediaElement) {
        return new MediaElementAudioSourceNode(this, { mediaElement });
    }

    public createMediaStreamSource (mediaStream: MediaStream) {
        return new MediaStreamAudioSourceNode(this, { mediaStream });
    }

    public createOscillator (): IOscillatorNode {
        return new OscillatorNode(this);
    }

    public close () {
        // Bug #35: Firefox does not throw an error if the AudioContext was closed before.
        if (this.state === 'closed') {
            return this._unpatchedAudioContext
                .close()
                .then(() => {
                    throw invalidStateErrorFactory.create();
                });
        }

        // Bug #34: If the state was set to suspended before it should be revoked now.
        if (this._state === 'suspended') {
            this._state = null;
        }

        return this._unpatchedAudioContext.close();
    }

    public resume () {
        return this._unpatchedAudioContext
            .resume()
            .catch((err) => {
                // Bug #55: Chrome, Edge and Opera do throw an InvalidAccessError instead of an InvalidStateError.
                // Bug #56: Safari invokes the catch handler but without an error.
                if (err === undefined || err.code === 15) {
                    throw invalidStateErrorFactory.create();
                }

                throw err;
            });
    }

    public suspend () {
        return this._unpatchedAudioContext
            .suspend()
            .catch((err) => {
                // Bug #56: Safari invokes the catch handler but without an error.
                if (err === undefined) {
                    throw invalidStateErrorFactory.create();
                }

                throw err;
            });
    }

}
