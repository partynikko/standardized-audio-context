import { Injector } from '@angular/core';
import { EventTarget } from '../event-target';
import { INVALID_ACCES_ERROR_FACTORY_PROVIDER, InvalidAccessErrorFactory } from '../factories/invalid-access-error';
import {
    AUDIO_NODE_RENDERER_DESTINATIONS_STORE,
    AUDIO_NODE_RENDERER_STORE,
    AUDIO_NODE_STORE,
    AUDIO_PARAM_RENDERER_STORE,
    AUDIO_PARAM_STORE,
    CONTEXT_STORE
} from '../globals';
import { isAudioNode } from '../guards/audio-node';
import { cacheTestResult } from '../helpers/cache-test-result';
import { getNativeContext } from '../helpers/get-native-context';
import { isOfflineAudioContext } from '../helpers/is-offline-audio-context';
import { IAudioNode, IAudioNodeOptions, IAudioParam, IMinimalBaseAudioContext } from '../interfaces';
import { DISCONNECTING_SUPPORT_TESTER_PROVIDER, DisconnectingSupportTester } from '../support-testers/disconnecting';
import { TChannelCountMode, TChannelInterpretation, TNativeAudioNode, TNativeAudioParam, TUnpatchedAudioContext } from '../types';
import { AUDIO_NODE_DISCONNECT_METHOD_WRAPPER_PROVIDER, AudioNodeDisconnectMethodWrapper } from '../wrappers/audio-node-disconnect-method';

const injector = Injector.create({
    providers: [
        AUDIO_NODE_DISCONNECT_METHOD_WRAPPER_PROVIDER,
        DISCONNECTING_SUPPORT_TESTER_PROVIDER,
        INVALID_ACCES_ERROR_FACTORY_PROVIDER
    ]
});

const audioNodeDisconnectMethodWrapper = injector.get(AudioNodeDisconnectMethodWrapper);
const disconnectingSupportTester = injector.get(DisconnectingSupportTester);
const invalidAccessErrorFactory = injector.get(InvalidAccessErrorFactory);

export class AudioNode<T extends TNativeAudioNode> extends EventTarget implements IAudioNode {

    protected _nativeNode: null | T;

    private _channelCount: number;

    private _channelCountMode: TChannelCountMode;

    private _channelInterpretation: TChannelInterpretation;

    private _context: IMinimalBaseAudioContext;

    private _numberOfInputs: number;

    private _numberOfOutputs: number;

    constructor (
        context: IMinimalBaseAudioContext,
        nativeNode: null | T,
        { channelCount, channelCountMode, channelInterpretation, numberOfInputs, numberOfOutputs }: IAudioNodeOptions,
        // @todo The parentNode property is only needed as long as the source gets transpiled to ES5.
        parentNode?: IAudioNode
    ) {
        super();

        this._channelCount = channelCount;
        this._channelCountMode = channelCountMode;
        this._channelInterpretation = channelInterpretation;
        this._context = context;
        this._nativeNode = nativeNode;
        this._numberOfInputs = numberOfInputs;
        this._numberOfOutputs = numberOfOutputs;

        const nativeContext = getNativeContext(context);

        if (nativeNode !== null) {
            // Bug #12: Firefox and Safari do not support to disconnect a specific destination.
            // @todo Make sure this is not used with an OfflineAudioContext.
            if (!isOfflineAudioContext(nativeContext) && true !== cacheTestResult(DisconnectingSupportTester, () => {
                return disconnectingSupportTester.test(<TUnpatchedAudioContext> nativeContext);
            })) {
                audioNodeDisconnectMethodWrapper.wrap(nativeNode);
            }

            AUDIO_NODE_STORE.set((parentNode === undefined) ? this : parentNode, nativeNode);
        }
    }

    public get channelCount () {
        // Bug #47: The AudioDestinationNode in Edge and Safari do not intialize the maxChannelCount property correctly.
        return (this._nativeNode === null || (<TNativeAudioNode> this._nativeNode) === this._nativeNode.context.destination) ?
            this._channelCount :
            this._nativeNode.channelCount;
    }

    public set channelCount (value) {
        // Bug #47: The AudioDestinationNode in Edge and Safari do not intialize the maxChannelCount property correctly.
        if (this._nativeNode === null || (<TNativeAudioNode> this._nativeNode) === this._nativeNode.context.destination) {
            this._channelCount = value;
        } else {
            this._nativeNode.channelCount = value;
        }
    }

    public get channelCountMode () {
        return (this._nativeNode === null) ? this._channelCountMode : this._nativeNode.channelCountMode;
    }

    public set channelCountMode (value) {
        if (this._nativeNode === null) {
            this._channelCountMode = value;
        } else {
            this._nativeNode.channelCountMode = value;
        }
    }

    public get channelInterpretation () {
        return (this._nativeNode === null) ? this._channelInterpretation : this._nativeNode.channelInterpretation;
    }

    public set channelInterpretation (value) {
        if (this._nativeNode === null) {
            this._channelInterpretation = value;
        } else {
            this._nativeNode.channelInterpretation = value;
        }
    }

    public get context () {
        return this._context;
    }

    public get numberOfInputs () {
        return (this._nativeNode === null) ? this._numberOfInputs : this._nativeNode.numberOfInputs;
    }

    public get numberOfOutputs () {
        return (this._nativeNode === null) ? this._numberOfOutputs : this._nativeNode.numberOfOutputs;
    }

    public addEventListener (type: string, listener?: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
        if (this._nativeNode === null) {
            return super.addEventListener(type, listener, options);
        }

        return this._nativeNode.addEventListener(type, listener, options);
    }

    public connect (destinationNode: IAudioNode, output?: number, input?: number): IAudioNode;
    public connect (destinationParam: IAudioParam, output?: number): void;
    public connect (destination: IAudioNode | IAudioParam, output = 0, input = 0): void | IAudioNode {
        const nativeContext = CONTEXT_STORE.get(this._context);

        if (isAudioNode(destination)) {
            // Bug #41: Only Chrome, Firefox and Opera throw the correct exception by now.
            if (this._context !== destination.context) {
                throw invalidAccessErrorFactory.create();
            }

            if (nativeContext === undefined) {
                throw new Error('The native (Offline)AudioContext is missing.');
            }

            if (isOfflineAudioContext(nativeContext)) {
                const renderer = AUDIO_NODE_RENDERER_STORE.get(destination);

                if (renderer === undefined) {
                    throw invalidAccessErrorFactory.create();
                }

                const source = AUDIO_NODE_RENDERER_STORE.get(this);

                if (source === undefined) {
                    throw new Error('The associated renderer is missing.');
                }

                renderer.wire(source, output, input);

                return destination;
            }

            const nativeDestinationNode = AUDIO_NODE_STORE.get(destination);

            if (this._nativeNode === null || nativeDestinationNode === undefined) {
                throw new Error('The associated nativeNode is missing.');
            }

            this._nativeNode.connect(nativeDestinationNode, output, input);

            // Bug #11: Safari does not support chaining yet. This can be tested with the ChainingSupportTester.
            return destination;
        }

        if (nativeContext === undefined) {
            throw new Error('The native (Offline)AudioContext is missing.');
        }

        if (isOfflineAudioContext(nativeContext)) {
            const renderer = AUDIO_PARAM_RENDERER_STORE.get(destination);

            if (renderer === undefined) {
                throw invalidAccessErrorFactory.create();
            }

            const source = AUDIO_NODE_RENDERER_STORE.get(this);

            if (source === undefined) {
                throw new Error('The associated renderer is missing.');
            }

            if (this._nativeNode !== null) {
                const nativeAudioParam = AUDIO_PARAM_STORE.get(destination);

                if (nativeAudioParam === undefined) {
                    throw new Error('The associated nativeAudioParam is missing.');
                }

                try {
                    this._nativeNode.connect(nativeAudioParam, output);
                } catch (err) {
                    // Bug #58: Only Firefox does throw an InvalidStateError yet.
                    if (err.code === 12) {
                        throw invalidAccessErrorFactory.create();
                    }

                    throw err;
                }
            }

            renderer.wire(source, output);
        } else {
            if (this._nativeNode === null) {
                throw new Error('The associated nativeNode is missing.');
            }

            try {
                this._nativeNode.connect(<TNativeAudioParam> (<any> destination), output);
            } catch (err) {
                // Bug #58: Only Firefox does throw an InvalidStateError yet.
                if (err.code === 12) {
                    throw invalidAccessErrorFactory.create();
                }

                throw err;
            }
        }
    }

    public disconnect (destination?: IAudioNode): void {
        const nativeContext = CONTEXT_STORE.get(this._context);

        if (nativeContext === undefined) {
            throw new Error('The native (Offline)AudioContext is missing.');
        }

        if (isOfflineAudioContext(nativeContext)) {
            const source = AUDIO_NODE_RENDERER_STORE.get(this);

            if (source === undefined) {
                throw new Error('The associated renderer is missing.');
            }

            if (destination === undefined) {
                const renderers = AUDIO_NODE_RENDERER_DESTINATIONS_STORE.get(source);

                if (renderers === undefined) {
                    return;
                }

                return renderers.forEach((rndrr) => rndrr.unwire(source));
            }

            const renderer = AUDIO_NODE_RENDERER_STORE.get(destination);

            if (renderer === undefined) {
                throw new Error('The associated renderer is missing.');
            }

            return renderer.unwire(source);
        }

        if (this._nativeNode === null) {
            throw new Error('The associated nativeNode is missing.');
        }

        if (destination === undefined) {
            return this._nativeNode.disconnect();
        }

        const nativeDestinationNode = AUDIO_NODE_STORE.get(destination);

        if (nativeDestinationNode === undefined) {
            throw new Error('The associated nativeNode is missing.');
        }

        return this._nativeNode.disconnect(nativeDestinationNode);
    }

    public removeEventListener (type: string, listener?: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) {
        if (this._nativeNode === null) {
            return super.removeEventListener(type, listener, options);
        }

        return this._nativeNode.removeEventListener(type, listener, options);
    }

}
