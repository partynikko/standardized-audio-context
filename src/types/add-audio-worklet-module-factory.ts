import { TAddAudioWorkletModuleFunction } from './add-audio-worklet-module-function';
import { TCacheTestResultFunction } from './cache-test-result-function';
import { TContext } from './context';
import { TEvaluateSourceFunction } from './evaluate-source-function';
import { TExposeCurrentFrameAndCurrentTimeFunction } from './expose-current-frame-and-current-time-function';
import { TFetchSourceFunction } from './fetch-source-function';
import { TGetNativeContextFunction } from './get-native-context-function';
import { TNotSupportedErrorFactory } from './not-supported-error-factory';
import { TWindow } from './window';

export type TAddAudioWorkletModuleFactory = (
    cacheTestResult: TCacheTestResultFunction,
    createNotSupportedError: TNotSupportedErrorFactory,
    evaluateSource: TEvaluateSourceFunction,
    exposeCurrentFrameAndCurrentTime: TExposeCurrentFrameAndCurrentTimeFunction,
    fetchSource: TFetchSourceFunction,
    getNativeContext: TGetNativeContextFunction,
    ongoingRequests: WeakMap<TContext, Map<string, Promise<void>>>,
    resolvedRequests: WeakMap<TContext, Set<string>>,
    testAudioWorkletProcessorPostMessageSupport: () => Promise<boolean>,
    window: TWindow
) => TAddAudioWorkletModuleFunction;
