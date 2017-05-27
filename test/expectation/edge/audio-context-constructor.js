import 'core-js/es7/reflect';
import { UNPATCHED_AUDIO_CONTEXT_CONSTRUCTOR_PROVIDER, unpatchedAudioContextConstructor } from '../../../src/providers/unpatched-audio-context-constructor';
import { ReflectiveInjector } from '@angular/core';
import { WINDOW_PROVIDER } from '../../../src/providers/window';
import { loadFixture } from '../../helper/load-fixture';

describe('audioContextConstructor', () => {

    let audioContext;
    let AudioContext;

    afterEach(() => audioContext.close());

    beforeEach(() => {
        const injector = ReflectiveInjector.resolveAndCreate([
            UNPATCHED_AUDIO_CONTEXT_CONSTRUCTOR_PROVIDER,
            WINDOW_PROVIDER
        ]);

        AudioContext = injector.get(unpatchedAudioContextConstructor);

        audioContext = new AudioContext();
    });

    describe('baseLatency', () => {

        // bug #39

        it('should not be implemented', () => {
            expect(audioContext.baseLatency).to.be.undefined;
        });

    });

    describe('outputLatency', () => {

        // bug #40

        it('should not be implemented', () => {
            expect(audioContext.outputLatency).to.be.undefined;
        });

    });

    describe('createAnalyser()', () => {

        // bug #37

        it('should have a channelCount of 2', () => {
            const analyserNode = audioContext.createAnalyser();

            expect(analyserNode.channelCount).to.equal(2);
        });

        // bug #41

        it('should throw a SyntaxError when calling connect() with a node of another AudioContext', (done) => {
            const analyserNode = audioContext.createAnalyser();
            const anotherAudioContext = new AudioContext();

            try {
                analyserNode.connect(anotherAudioContext.destination);
            } catch (err) {
                expect(err.code).to.equal(12);
                expect(err.name).to.equal('SyntaxError');

                done();
            } finally {
                anotherAudioContext.close();
            }
        });

    });

    describe('createBiquadFilter()', () => {

        describe('getFrequencyResponse()', () => {

            // bug #22

            it('should fill the magResponse and phaseResponse arrays with the deprecated algorithm', () => {
                const biquadFilterNode = audioContext.createBiquadFilter();
                const magResponse = new Float32Array(5);
                const phaseResponse = new Float32Array(5);

                biquadFilterNode.getFrequencyResponse(new Float32Array([ 200, 400, 800, 1600, 3200 ]), magResponse, phaseResponse);

                expect(Array.from(magResponse)).to.deep.equal([ 1.1107852458953857, 0.8106917142868042, 0.20565471053123474, 0.04845593497157097, 0.011615658178925514 ]);
                expect(Array.from(phaseResponse)).to.deep.equal([ -0.7254799008369446, -1.8217267990112305, -2.6273605823516846, -2.906902313232422, -3.0283825397491455 ]);
            });

        });

    });

    describe('createBufferSource()', () => {

        describe('start()', () => {

            // bug #44

            it('should throw a DOMException', () => {
                const bufferSourceNode = audioContext.createBufferSource();

                expect(() => bufferSourceNode.start(-1)).to.throw('InvalidAccessError');
                expect(() => bufferSourceNode.start(0, -1)).to.throw('InvalidStateError');
                expect(() => bufferSourceNode.start(0, 0, -1)).to.throw('InvalidStateError');
            });

        });

        describe('stop()', () => {

            // bug #44

            it('should throw a DOMException', () => {
                const bufferSourceNode = audioContext.createBufferSource();

                expect(() => bufferSourceNode.stop(-1)).to.throw('InvalidStateError');
            });

        });

    });

    describe('createChannelSplitter()', () => {

        // bug #29

        it('should have a channelCountMode of max', () => {
            const channelSplitterNode = audioContext.createChannelSplitter();

            expect(channelSplitterNode.channelCountMode).to.equal('max');
        });

        // bug #30

        it('should allow to set the channelCountMode', () => {
            const channelSplitterNode = audioContext.createChannelSplitter();

            channelSplitterNode.channelCountMode = 'explicit';
        });

        // bug #31

        it('should have a channelInterpretation of max', () => {
            const channelSplitterNode = audioContext.createChannelSplitter();

            expect(channelSplitterNode.channelInterpretation).to.equal('speakers');
        });

        // bug #32

        it('should allow to set the channelInterpretation', () => {
            const channelSplitterNode = audioContext.createChannelSplitter();

            channelSplitterNode.channelInterpretation = 'discrete';
        });

    });

    describe('createGain()', () => {

        describe('cancelAndHoldAtTime()', () => {

            let gainNode;

            beforeEach(() => {
                gainNode = audioContext.createGain();
            });

            // bug #28

            it('should not be implemented', () => {
                expect(gainNode.cancelAndHoldAtTime).to.be.undefined;
            });

        });

    });

    describe('decodeAudioData()', () => {

        // bug #27

        it('should reject the promise with a DOMException', (done) => {
            audioContext
                .decodeAudioData(null)
                .catch((err) => {
                    expect(err).to.be.an.instanceOf(DOMException);

                    done();
                });
        });

        // bug #43

        it('should not throw a DataCloneError', (done) => {
            loadFixture('1000-frames-of-noise.wav', (err, arrayBuffer) => {
                expect(err).to.be.null;

                audioContext
                    .decodeAudioData(arrayBuffer)
                    .then(() => audioContext.decodeAudioData(arrayBuffer))
                    .catch((err) => {
                        expect(err.code).to.not.equal(25);
                        expect(err.name).to.not.equal('DataCloneError');

                        done();
                    });
            });
        });

    });

    describe('getOutputTimestamp()', () => {

        // bug #38

        it('should not be implemented', () => {
            expect(audioContext.getOutputTimestamp).to.be.undefined;
        });

    });

});
