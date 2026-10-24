import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from './reactNativeTVWeb';

export interface OnProgressData {
  currentTime: number;
  playableDuration: number;
  seekableDuration: number;
}

export interface OnLoadData {
  duration: number;
  naturalSize: {
    width: number;
    height: number;
    orientation: 'landscape' | 'portrait';
  };
}

export interface VideoRef {
  seek: (seconds: number) => void;
}

export interface VideoProps {
  source: {
    uri: string;
    poster?: string;
    lectureTheme?: 'quantum' | 'neural' | 'astro' | 'bio' | 'robotics';
    durationSeconds?: number;
  };
  paused?: boolean;
  muted?: boolean;
  rate?: number;
  repeat?: boolean;
  resizeMode?: 'contain' | 'cover' | 'stretch';
  style?: StyleProp<ViewStyle>;
  onProgress?: (data: OnProgressData) => void;
  onLoad?: (data: OnLoadData) => void;
  onEnd?: () => void;
}

/**
 * Smart TV Video Engine (<Video /> from 'react-native-video')
 * Supports native HTML5 HLS/MP4 playback with a seamless 60fps interactive
 * STEM lecture visualization stage so playback, scrubbing, chapters, and
 * Prime Video X-Ray sync reliably even in offline/hermetic environments.
 */
const Video = forwardRef<VideoRef, VideoProps>(
  (
    {
      source,
      paused = false,
      muted = false,
      rate = 1.0,
      style,
      onProgress,
      onLoad,
      onEnd,
    },
    ref
  ) => {
    const videoElRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [useVisualizerStage, setUseVisualizerStage] = useState<boolean>(
      !source.uri || source.uri.startsWith('classstream://')
    );

    const totalDuration = source.durationSeconds ?? 1560; // 26:00 default lecture
    const simTimeRef = useRef<number>(0);

    const onLoadRef = useRef(onLoad);
    onLoadRef.current = onLoad;
    const onProgressRef = useRef(onProgress);
    onProgressRef.current = onProgress;
    const onEndRef = useRef(onEnd);
    onEndRef.current = onEnd;

    const hasLoadedRef = useRef(false);

    useImperativeHandle(ref, () => ({
      seek(seconds: number) {
        const clamped = Math.max(0, Math.min(totalDuration, seconds));
        simTimeRef.current = clamped;
        if (!useVisualizerStage && videoElRef.current) {
          videoElRef.current.currentTime = clamped;
        }
        onProgressRef.current?.({
          currentTime: clamped,
          playableDuration: totalDuration,
          seekableDuration: totalDuration,
        });
      },
    }));

    useEffect(() => {
      if (useVisualizerStage && !hasLoadedRef.current) {
        hasLoadedRef.current = true;
        onLoadRef.current?.({
          duration: totalDuration,
          naturalSize: { width: 1920, height: 1080, orientation: 'landscape' },
        });
      }
    }, [useVisualizerStage, totalDuration]);

    // Timecode progression & animated scientific lecture stage for hermetic reliability
    useEffect(() => {
      if (!useVisualizerStage) return undefined;

      let animFrameId: number;
      let lastTick = performance.now();
      let lastReported = -1;

      const renderStage = (now: number) => {
        const dt = (now - lastTick) / 1000;
        lastTick = now;

        if (!paused) {
          simTimeRef.current += dt * rate;
          if (simTimeRef.current >= totalDuration) {
            simTimeRef.current = totalDuration;
            onEndRef.current?.();
          }
        }

        if (Math.abs(simTimeRef.current - lastReported) >= 0.25) {
          lastReported = simTimeRef.current;
          onProgressRef.current?.({
            currentTime: simTimeRef.current,
            playableDuration: totalDuration,
            seekableDuration: totalDuration,
          });
        }

        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const w = canvas.width;
            const h = canvas.height;
            const t = simTimeRef.current;

            ctx.clearRect(0, 0, w, h);

            // Subtle translucent dark vignette over poster image
            const grad = ctx.createRadialGradient(
              w * 0.5,
              h * 0.48,
              w * 0.08,
              w * 0.5,
              h * 0.5,
              w * 0.72
            );
            grad.addColorStop(0, 'rgba(11, 14, 20, 0.32)');
            grad.addColorStop(1, 'rgba(11, 14, 20, 0.82)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            // Subtle coordinate grid
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.045)';
            ctx.lineWidth = 1;
            const step = 64;
            for (let x = 0; x < w; x += step) {
              ctx.beginPath();
              ctx.moveTo(x, 0);
              ctx.lineTo(x, h);
              ctx.stroke();
            }
            for (let y = 0; y < h; y += step) {
              ctx.beginPath();
              ctx.moveTo(0, y);
              ctx.lineTo(w, y);
              ctx.stroke();
            }

            // Live mathematical wave / phase trajectory synced to lecture playback time
            const centerY = h * 0.52;
            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 153, 0, 0.82)';
            ctx.lineWidth = 2.6;
            for (let x = w * 0.14; x <= w * 0.86; x += 4) {
              const norm = (x - w * 0.14) / (w * 0.72);
              const envelope = Math.sin(norm * Math.PI);
              const wave =
                Math.sin(norm * 14 - t * 2.1) * 44 * envelope +
                Math.cos(norm * 7 + t * 1.3) * 22 * envelope;
              const py = centerY + wave;
              if (x === w * 0.14) ctx.moveTo(x, py);
              else ctx.lineTo(x, py);
            }
            ctx.stroke();

            // Secondary harmonic curve (Prime Cyan)
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(0, 168, 225, 0.65)';
            ctx.lineWidth = 1.8;
            for (let x = w * 0.14; x <= w * 0.86; x += 4) {
              const norm = (x - w * 0.14) / (w * 0.72);
              const envelope = Math.sin(norm * Math.PI);
              const wave =
                Math.cos(norm * 11 - t * 1.65) * 34 * envelope -
                Math.sin(norm * 5 + t * 0.9) * 18 * envelope;
              const py = centerY + wave;
              if (x === w * 0.14) ctx.moveTo(x, py);
              else ctx.lineTo(x, py);
            }
            ctx.stroke();
            ctx.restore();
          }
        }

        animFrameId = requestAnimationFrame(renderStage);
      };

      animFrameId = requestAnimationFrame(renderStage);
      return () => cancelAnimationFrame(animFrameId);
    }, [useVisualizerStage, paused, rate, totalDuration]);

    useEffect(() => {
      const el = videoElRef.current;
      if (!el || useVisualizerStage) return;
      el.muted = muted;
      el.playbackRate = rate;
      if (paused) {
        el.pause();
      } else {
        el.play().catch(() => {
          setUseVisualizerStage(true);
        });
      }
    }, [paused, muted, rate, useVisualizerStage]);

    const flat = StyleSheet.flatten(style);

    return (
      <div
        style={{
          position: (flat.position as 'relative' | 'absolute') ?? 'relative',
          width: flat.width ?? '100%',
          height: flat.height ?? '100%',
          backgroundColor: '#0B0E14',
          overflow: 'hidden',
        }}
      >
        {source.poster ? (
          <img
            src={source.poster}
            alt="Lecture backdrop"
            referrerPolicy="no-referrer"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: useVisualizerStage ? 0.55 : 0,
              filter: ' saturate(0.95) contrast(1.05)',
              transition: 'opacity 200ms ease',
            }}
          />
        ) : null}

        {useVisualizerStage ? (
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
            }}
          />
        ) : (
          <video
            ref={videoElRef}
            src={source.uri}
            poster={source.poster}
            muted={muted}
            playsInline
            onError={() => setUseVisualizerStage(true)}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              onLoadRef.current?.({
                duration: v.duration || totalDuration,
                naturalSize: {
                  width: v.videoWidth || 1920,
                  height: v.videoHeight || 1080,
                  orientation: 'landscape',
                },
              });
            }}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              onProgressRef.current?.({
                currentTime: v.currentTime,
                playableDuration: v.duration || totalDuration,
                seekableDuration: v.duration || totalDuration,
              });
            }}
            onEnded={() => onEndRef.current?.()}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}
      </div>
    );
  }
);

Video.displayName = 'Video';
export default Video;
