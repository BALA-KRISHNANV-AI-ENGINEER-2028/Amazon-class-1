import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CornerDownLeft,
  Gamepad2,
  Mic,
  Minimize2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { DPadAction } from '../navigation/useSpatialDPadNavigation';
import { isTVSoundEnabled, setTVSoundEnabled } from '../utils/tvAudio';

export interface FireTVRemoteSimulatorProps {
  onDPadAction: (action: DPadAction) => void;
}

/**
 * Interactive Fire TV Remote D-Pad Companion (Excluded from TV spatial focus graph
 * via tabIndex={-1} so pressing buttons drives the active TV focus target without stealing focus).
 */
export const FireTVRemoteSimulator: React.FC<FireTVRemoteSimulatorProps> = ({
  onDPadAction,
}) => {
  const [expanded, setExpanded] = useState<boolean>(true);
  const [soundOn, setSoundOn] = useState<boolean>(isTVSoundEnabled());

  const preventFocusSteal = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  if (!expanded) {
    return (
      <div className="fixed bottom-5 right-5 z-50">
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={preventFocusSteal}
          onClick={() => setExpanded(true)}
          className="flex items-center gap-2 rounded-xl border border-white/15 bg-[#1A222D]/95 px-4 py-2.5 text-sm font-semibold text-white shadow-xl backdrop-blur-md transition-transform hover:scale-105"
        >
          <Gamepad2 size={17} className="text-[#FF9900]" />
          <span>Fire TV Remote</span>
        </button>
      </div>
    );
  }

  return (
    <div
      aria-label="Fire TV Remote D-Pad Simulator"
      className="fixed bottom-5 right-5 z-50 w-52 rounded-2xl border border-white/15 bg-[#121822]/95 p-4 shadow-2xl backdrop-blur-md select-none"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide text-[#C8D1DC]">
          Fire TV Remote
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            tabIndex={-1}
            title={soundOn ? 'Mute UI Sounds' : 'Enable UI Sounds'}
            onMouseDown={preventFocusSteal}
            onClick={() => {
              const next = !soundOn;
              setSoundOn(next);
              setTVSoundEnabled(next);
            }}
            className="rounded-lg p-1.5 text-[#C8D1DC] transition-colors hover:bg-white/10 hover:text-white"
          >
            {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
          <button
            type="button"
            tabIndex={-1}
            title="Minimize Remote"
            onMouseDown={preventFocusSteal}
            onClick={() => setExpanded(false)}
            className="rounded-lg p-1.5 text-[#C8D1DC] transition-colors hover:bg-white/10 hover:text-white"
          >
            <Minimize2 size={14} />
          </button>
        </div>
      </div>

      {/* Circular Fire TV D-Pad Ring */}
      <div className="mx-auto my-2 grid h-36 w-36 grid-cols-3 grid-rows-3 place-items-center rounded-full border-2 border-white/15 bg-[#1A222D] p-1.5 shadow-inner">
        <div />
        <button
          type="button"
          tabIndex={-1}
          aria-label="D-Pad Up"
          onMouseDown={preventFocusSteal}
          onClick={() => onDPadAction('UP')}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 active:bg-[#FF9900] active:text-[#0B0E14]"
        >
          <ChevronUp size={20} />
        </button>
        <div />

        <button
          type="button"
          tabIndex={-1}
          aria-label="D-Pad Left"
          onMouseDown={preventFocusSteal}
          onClick={() => onDPadAction('LEFT')}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 active:bg-[#FF9900] active:text-[#0B0E14]"
        >
          <ChevronLeft size={20} />
        </button>

        <button
          type="button"
          tabIndex={-1}
          aria-label="D-Pad Select"
          onMouseDown={preventFocusSteal}
          onClick={() => onDPadAction('SELECT')}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-[#FF9900]/60 bg-[#0B0E14] text-[11px] font-bold text-[#FF9900] transition-transform hover:scale-105 active:bg-[#FF9900] active:text-[#0B0E14]"
        >
          OK
        </button>

        <button
          type="button"
          tabIndex={-1}
          aria-label="D-Pad Right"
          onMouseDown={preventFocusSteal}
          onClick={() => onDPadAction('RIGHT')}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 active:bg-[#FF9900] active:text-[#0B0E14]"
        >
          <ChevronRight size={20} />
        </button>

        <div />
        <button
          type="button"
          tabIndex={-1}
          aria-label="D-Pad Down"
          onMouseDown={preventFocusSteal}
          onClick={() => onDPadAction('DOWN')}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 active:bg-[#FF9900] active:text-[#0B0E14]"
        >
          <ChevronDown size={20} />
        </button>
        <div />
      </div>

      {/* Back & Voice Buttons */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={preventFocusSteal}
          onClick={() => onDPadAction('BACK')}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-[#1A222D] py-2 text-xs font-semibold text-white transition-colors hover:border-[#FF9900] active:bg-[#FF9900] active:text-[#0B0E14]"
        >
          <CornerDownLeft size={14} />
          <span>Back</span>
        </button>
        <button
          type="button"
          tabIndex={-1}
          title="Hold/Press Voice button for Alexa / Gemini Voice Tutor"
          onMouseDown={preventFocusSteal}
          onClick={() => {
            window.dispatchEvent(new CustomEvent('tv-voice-trigger'));
          }}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#00A8E1]/40 bg-[#00A8E1]/15 py-2 text-xs font-semibold text-[#00A8E1] transition-colors hover:border-[#00A8E1] hover:bg-[#00A8E1]/25 active:bg-[#00A8E1] active:text-[#0B0E14]"
        >
          <Mic size={14} />
          <span>Voice</span>
        </button>
      </div>

      <p className="mt-2.5 text-center text-[11px] text-[#8B97A8]">
        Arrow keys · Enter · Esc
      </p>
    </div>
  );
};

export default FireTVRemoteSimulator;
