// Copyright (C) 2024 Andrew Wason
// SPDX-License-Identifier: MIT

import * as animations from '@shoelace-style/animations';
import { fromError } from 'zod-validation-error';
import { TransitionInfo, transitionSchema } from './schema/index.js';

interface TransitionsMap {
  [key: string]: TransitionInfo;
}

const buildTransition = (source?: Keyframe[], dest?: Keyframe[]) => {
  const transition: TransitionInfo = {};
  if (source) transition.source = { effects: [{ keyframes: source }] };
  if (dest) transition.dest = { effects: [{ keyframes: dest }] };
  return transition;
};

const wipe = (direction: 'top' | 'bottom' | 'left' | 'right') => {
  let top = '0';
  let bottom = '0';
  let left = '0';
  let right = '0';
  switch (direction) {
    case 'top':
      top = '100%';
      break;
    case 'bottom':
      bottom = '100%';
      break;
    case 'left':
      left = '100%';
      break;
    case 'right':
      right = '100%';
      break;
    default:
  }
  return [
    {
      clipPath: `inset(${top} ${right} ${bottom} ${left})`,
    },
    {
      clipPath: 'inset(0)',
    },
  ];
};

export const clockWipe = (size: number) => ({
  source: {
    style: `
        :host {
          mask-image: conic-gradient(black calc(var(--mediafx-angle) - ${size}deg), white var(--mediafx-angle), white);
          mask-mode: luminance;
        }
      `,
    effects: [
      {
        keyframes: [
          { offset: 0, '--mediafx-angle': '0deg' },
          { offset: 1, '--mediafx-angle': `${360 + size}deg` },
        ],
      },
    ],
  },
});

export const Transitions: TransitionsMap = {
  get crossFade() {
    return {
      source: {
        style: ':host { mix-blend-mode: plus-lighter; }',
        effects: [{ keyframes: [{ opacity: 1 }, { opacity: 0 }] }],
      },
      dest: {
        effects: [
          {
            keyframes: [{ opacity: 0 }, { opacity: 1 }],
          },
        ],
      },
    };
  },
  get wipeLeft() {
    return buildTransition(undefined, wipe('left'));
  },
  get wipeRight() {
    return buildTransition(undefined, wipe('right'));
  },
  get wipeTop() {
    return buildTransition(undefined, wipe('top'));
  },
  get wipeBottom() {
    return buildTransition(undefined, wipe('bottom'));
  },
  get bounceLeft() {
    return buildTransition(animations.bounceOutLeft, animations.bounceInRight);
  },
  get bounceRight() {
    return buildTransition(animations.bounceOutRight, animations.bounceInLeft);
  },
  get bounceUp() {
    return buildTransition(animations.bounceOutUp, animations.bounceInUp);
  },
  get bounceDown() {
    return buildTransition(animations.bounceOutDown, animations.bounceInDown);
  },
  get spotlight() {
    return {
      dest: {
        effects: [
          {
            keyframes: [
              { offset: 0, clipPath: 'circle(0% at 50% 50%)' },
              { offset: 0.25, clipPath: 'circle(20% at 80% 80%)' },
              { offset: 0.5, clipPath: 'circle(20% at 12% 84%)' },
              { offset: 0.75, clipPath: 'circle(20% at 93% 51%)' },
              { offset: 0.87, clipPath: 'circle(20% at 20% 20%)' },
              { offset: 1, clipPath: 'circle(100% at 50% 50%)' },
            ],
          },
        ],
      },
    };
  },
  get chevron() {
    return {
      source: {
        effects: [
          {
            keyframes: [
              {
                offset: 0,
                clipPath:
                  'polygon(100% 0%, 100% 50%, 100% 100%, 0% 100%, 0% 50%, 0% 0%)',
              },
              {
                offset: 0.25,
                clipPath:
                  'polygon(75% 0%, 100% 50%, 75% 100%, 0% 100%, 25% 50%, 0% 0%)',
              },
              {
                offset: 1,
                clipPath:
                  'polygon(175% 0%, 200% 50%, 175% 100%, 100% 100%, 125% 50%, 100% 0%)',
              },
            ],
          },
        ],
      },
      dest: {
        effects: [
          {
            keyframes: [
              {
                offset: 0,
                clipPath:
                  'polygon(-175% 0%, -200% 50%, -175% 100%, -100% 100%, -125% 50%, -100% 0%)',
              },
              {
                offset: 0.8,
                clipPath:
                  'polygon(75% 0%, 100% 50%, 75% 100%, 0% 100%, 25% 50%, 0% 0%)',
              },
              {
                offset: 1,
                clipPath:
                  'polygon(100% 0%, 100% 50%, 100% 100%, 0% 100%, 0% 50%, 0% 0%)',
              },
            ],
          },
        ],
      },
    };
  },
  get clockWipe() {
    return clockWipe(10);
  },
} as const;

export const addCustomTransition = (
  name: string,
  transition: unknown,
): void => {
  try {
    Transitions[name] = transitionSchema.parse(transition);
  } catch (error) {
    throw fromError(error);
  }
};
