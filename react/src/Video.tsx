import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {Audio} from '@remotion/media';
import {TransitionSeries, linearTiming, type TransitionPresentation} from '@remotion/transitions';
import {clockWipe} from '@remotion/transitions/clock-wipe';
import {flip} from '@remotion/transitions/flip';
import {iris} from '@remotion/transitions/iris';
import {pushCut} from '@remotion/transitions/push-cut';
import {slide} from '@remotion/transitions/slide';
import {wipe} from '@remotion/transitions/wipe';
import {SceneStart} from './components/beat';
import {markerWipe} from './components/markerWipe';
import {SCENES, TRANSITION_FRAMES} from './constants';
import {Intro} from './scenes/01-Intro';
import {Problem} from './scenes/02-Problem';
import {Detect} from './scenes/03-Detect';
import {Summary} from './scenes/04-Summary';
import {Score} from './scenes/05-Score';
import {Clauses} from './scenes/06-Clauses';
import {Ask} from './scenes/07-Ask';
import {Outro} from './scenes/08-Outro';
import {COLORS} from './theme';

const SCENE_COMPONENTS = [Intro, Problem, Detect, Summary, Score, Clauses, Ask, Outro];

const Music: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  // İlk saniyede açılır, son iki saniyede kısılır.
  const volume = interpolate(
    frame,
    [0, fps, durationInFrames - 2 * fps, durationInFrames - 1],
    [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  return <Audio src={staticFile('music.wav')} volume={volume} />;
};

export const Video: React.FC = () => {
  const {width, height} = useVideoConfig();

  // Her sahne değişiminde farklı bir geçiş; sıra TRANSITION_FRAMES ile aynıdır.
  const presentations: TransitionPresentation<Record<string, unknown>>[] = [
    slide({direction: 'from-right'}),
    wipe({direction: 'from-top-left'}),
    flip({direction: 'from-right', perspective: 1600}),
    clockWipe({width, height}),
    iris({width, height}),
    pushCut({
      outgoingScale: 1.2,
      incomingStartScale: 1.25,
      incomingEndScale: 1,
      flashColor: COLORS.paper,
      flashOpacity: 0.55,
      flashFrames: 3,
    }),
    markerWipe({color: COLORS.marker, edgeColor: '#F2CF2A'}),
  ] as TransitionPresentation<Record<string, unknown>>[];

  return (
    <AbsoluteFill style={{backgroundColor: COLORS.ink}}>
      <TransitionSeries>
        {SCENE_COMPONENTS.map((Scene, i) => (
          <React.Fragment key={i}>
            <TransitionSeries.Sequence durationInFrames={SCENES[i].durationInFrames}>
              <SceneStart.Provider value={SCENES[i].from}>
                <Scene />
              </SceneStart.Provider>
            </TransitionSeries.Sequence>
            {i < presentations.length ? (
              <TransitionSeries.Transition
                presentation={presentations[i]}
                timing={linearTiming({
                  durationInFrames: TRANSITION_FRAMES[i],
                  easing: Easing.inOut(Easing.cubic),
                })}
              />
            ) : null}
          </React.Fragment>
        ))}
      </TransitionSeries>
      <Music />
    </AbsoluteFill>
  );
};
