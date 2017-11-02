import { Injectable } from '@angular/core';
import { IndexSizeErrorFactory } from '../factories/index-size-error';

@Injectable()
export class AudioBufferWrapper {

    constructor (private _indexSizeErrorFactory: IndexSizeErrorFactory) { }

    public wrap (audioBuffer: AudioBuffer) {
        audioBuffer.copyFromChannel = (destination, channelNumber, startInChannel = 0) => {
            if (channelNumber >= audioBuffer.numberOfChannels || startInChannel >= audioBuffer.length) {
                throw this._indexSizeErrorFactory.create();
            }

            const channelData = audioBuffer.getChannelData(channelNumber);

            const channelLength = channelData.length;

            const destinationLength = destination.length;

            for (let i = 0; i + startInChannel < channelLength && i < destinationLength; i += 1) {
                destination[i] = channelData[i + startInChannel];
            }
        };

        audioBuffer.copyToChannel = (source, channelNumber, startInChannel = 0) => {
            if (channelNumber >= audioBuffer.numberOfChannels || startInChannel >= audioBuffer.length) {
                throw this._indexSizeErrorFactory.create();
            }

            const channelData = audioBuffer.getChannelData(channelNumber);

            const channelLength = channelData.length;

            const sourceLength = source.length;

            for (let i = 0; i + startInChannel < channelLength && i < sourceLength; i += 1) {
                channelData[i + startInChannel] = source[i];
            }
        };
    }

}

export const AUDIO_BUFFER_WRAPPER_PROVIDER = { deps: [ IndexSizeErrorFactory ], provide: AudioBufferWrapper };
