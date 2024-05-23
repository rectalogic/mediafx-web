// Copyright (C) 2024 Andrew Wason
// SPDX-License-Identifier: MIT

import createMedia from './MediaFactory.js';
import { Media } from './Media.js';
import { MediaClip, isMediaClipArray } from './MediaClip.js';

const enum MediaState {
  Uninitialized = 0,
  Initialized,
  Playing,
  Paused,
  Error,
}

export class MediaSequence extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['playlist', 'width', 'height'];
  }

  private sheet: CSSStyleSheet;

  private activeMedia?: Media;

  private loadingMedia?: Media;

  private playlist?: ReadonlyArray<MediaClip>;

  private mediaClips?: MediaClip[];

  private state = MediaState.Uninitialized;

  private resizeObserver: ResizeObserver;

  // XXX handle video/img onerror, set error property and fire error event, also set/fire for playlist issues

  // styling canvas just stretches content, width/height are the real size
  // video is different, it object-fits video into the styled element (or used w/h or native size)
  // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas#sizing_the_canvas_using_css_versus_html
  // so just use w/h and force it

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    this.sheet = new CSSStyleSheet();
    this.updateSize();
    shadow.adoptedStyleSheets.push(this.sheet);

    this.resizeObserver = new ResizeObserver(entries => {
      if (!(this.activeMedia || this.loadingMedia)) return;
      for (const entry of entries) {
        if (entry.target === this) {
          const size = entry.contentBoxSize[0];
          if (this.activeMedia)
            this.activeMedia.resize(size.inlineSize, size.blockSize);
          if (this.loadingMedia)
            this.loadingMedia.resize(size.inlineSize, size.blockSize);
        }
      }
    });
    this.resizeObserver.observe(this, { box: 'content-box' });
  }

  public connectedCallback() {
    console.log('Custom media-sequence element added to page.');
  }

  public attributeChangedCallback(
    attr: string,
    _oldValue: string,
    newValue: string,
  ) {
    console.log(`Custom media-sequence attributeChangedCallback ${attr}`);
    switch (attr) {
      case 'width':
      case 'height':
        this.updateSize();
        break;
      case 'playlist':
        this.updatePlaylist(newValue);
        break;
      default:
    }
  }

  private async updatePlaylist(url: string) {
    this.playlist = undefined;
    this.stop();
    try {
      const response = await fetch(url);
      if (!response.ok) {
        this.state = MediaState.Error;
        this.dispatchEvent(
          new ErrorEvent('error', {
            message: `Failed to fetch playlist ${url}`,
            error: response,
          }),
        );
      }
      const json = await response.json();

      if (isMediaClipArray(json)) {
        this.playlist = json;
        this.mediaClips = [...this.playlist];
        this.state = MediaState.Initialized;
      } else {
        this.state = MediaState.Error;
        this.dispatchEvent(
          new ErrorEvent('error', {
            message: `Invalid playlist contents`,
          }),
        );
      }
    } catch (error) {
      this.state = MediaState.Error;
      this.dispatchEvent(
        new ErrorEvent('error', {
          message: 'Failed to parse playlist contents',
          error: error as any,
        }),
      );
    }
  }

  private updateSize() {
    const width = this.getAttribute('width');
    const height = this.getAttribute('height');
    this.sheet.replaceSync(`
      :host {
        display: inline-block;
        width: ${width !== null ? `${width}px` : 'auto'};
        height: ${height !== null ? `${height}px` : 'auto'};
      }
    `);
  }

  public play() {
    if (this.state === MediaState.Initialized) {
      this.state = MediaState.Playing;
      this.nextVideo();
      requestAnimationFrame(this.onAnimationFrame);
    } else if (this.state === MediaState.Paused && this.activeMedia) {
      this.state = MediaState.Playing;
      this.activeMedia.play();
      requestAnimationFrame(this.onAnimationFrame);
    }
  }

  public pause() {
    if (this.state === MediaState.Playing && this.activeMedia) {
      this.activeMedia.pause();
      this.state = MediaState.Paused;
    }
  }

  public stop() {
    if (this.activeMedia) {
      MediaSequence.disposeMedia(this.activeMedia);
      this.shadowRoot?.removeChild(this.activeMedia.element);
      this.activeMedia = undefined;
    }
    if (this.loadingMedia) {
      MediaSequence.disposeMedia(this.loadingMedia);
      this.loadingMedia = undefined;
    }
    if (this.playlist) {
      this.mediaClips = [...this.playlist];
      this.state = MediaState.Initialized;
    } else {
      this.mediaClips = undefined;
      this.state = MediaState.Uninitialized;
    }
  }

  private createMedia(mediaClip: MediaClip): Media {
    const media = createMedia(mediaClip, this.onError);
    media.resize(this.offsetWidth, this.offsetHeight);
    return media;
  }

  private static disposeMedia(media: Media): undefined {
    media.dispose();
    return undefined;
  }

  private onError = (event: ErrorEvent) => {
    this.stop();
    this.dispatchEvent(event);
  };

  private onAnimationFrame = (timestamp: number) => {
    if (this.activeMedia && this.mediaClips) {
      this.activeMedia.animationTime = timestamp;
      if (
        this.activeMedia.ended ||
        (this.mediaClips[0].endTime &&
          this.activeMedia.currentTime >= this.mediaClips[0].endTime)
      ) {
        this.nextVideo();
      }
    }
    if (this.state === MediaState.Playing)
      requestAnimationFrame(this.onAnimationFrame);
  };

  private nextVideo() {
    if (!this.mediaClips) return;

    // First call, setup initial 2 videos
    if (!this.activeMedia) {
      this.activeMedia = this.createMedia(this.mediaClips[0]);
      this.activeMedia.show();
      this.shadowRoot?.appendChild(this.activeMedia.element);
      this.activeMedia.play();

      if (this.mediaClips.length > 1) {
        this.loadingMedia = this.createMedia(this.mediaClips[1]);
      }
    } else if (this.loadingMedia) {
      const currentMedia = this.activeMedia;
      this.activeMedia = this.loadingMedia;
      this.activeMedia.show();
      currentMedia.element.replaceWith(this.activeMedia.element);
      MediaSequence.disposeMedia(currentMedia);
      this.mediaClips.shift();
      this.activeMedia.play();

      if (this.mediaClips.length > 1) {
        this.loadingMedia = this.createMedia(this.mediaClips[1]);
      } else {
        this.loadingMedia = undefined;
      }
    } else {
      this.stop();
    }
  }
}
