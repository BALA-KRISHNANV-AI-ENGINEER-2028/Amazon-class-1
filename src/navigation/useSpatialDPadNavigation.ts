import { useCallback, useEffect } from 'react';
import { playTVBackSound } from '../utils/tvAudio';

export type DPadDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type DPadAction = DPadDirection | 'SELECT' | 'BACK';

interface SpatialOptions {
  onBack?: () => boolean; // Return true if back action was consumed
  scopeSelector?: string; // Optional modal/overlay selector to trap D-Pad focus inside active modal
}

function getFocusableElements(scopeSelector?: string): HTMLElement[] {
  const root: ParentNode = scopeSelector
    ? document.querySelector(scopeSelector) ?? document
    : document;

  const nodes = Array.from(
    root.querySelectorAll<HTMLElement>('[data-tv-focusable="true"]:not([disabled])')
  );

  return nodes.filter((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    const style = window.getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none';
  });
}

function findNextSpatialTarget(
  current: HTMLElement,
  candidates: HTMLElement[],
  direction: DPadDirection
): HTMLElement | null {
  const curRect = current.getBoundingClientRect();
  const curCx = curRect.left + curRect.width / 2;
  const curCy = curRect.top + curRect.height / 2;

  let bestEl: HTMLElement | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const el of candidates) {
    if (el === current) continue;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const dx = cx - curCx;
    const dy = cy - curCy;

    let primaryDist = 0;
    let perpDist = 0;
    let overlapBonus = 0;

    if (direction === 'RIGHT') {
      if (dx <= 6) continue;
      primaryDist = Math.max(1, rect.left - curRect.right);
      if (rect.left < curRect.right) primaryDist = dx;
      perpDist = Math.abs(dy);
      const vOverlap = Math.max(
        0,
        Math.min(curRect.bottom, rect.bottom) - Math.max(curRect.top, rect.top)
      );
      if (vOverlap > 0) overlapBonus = -250;
      // Strongly prefer staying on the same horizontal row when pressing LEFT/RIGHT
      if (perpDist > curRect.height * 1.45) continue;
    } else if (direction === 'LEFT') {
      if (dx >= -6) continue;
      primaryDist = Math.max(1, curRect.left - rect.right);
      if (curRect.left < rect.right) primaryDist = Math.abs(dx);
      perpDist = Math.abs(dy);
      const vOverlap = Math.max(
        0,
        Math.min(curRect.bottom, rect.bottom) - Math.max(curRect.top, rect.top)
      );
      if (vOverlap > 0) overlapBonus = -250;
      if (perpDist > curRect.height * 1.45) continue;
    } else if (direction === 'DOWN') {
      if (dy <= 10) continue;
      primaryDist = Math.max(1, rect.top - curRect.bottom);
      if (rect.top < curRect.bottom) primaryDist = dy;
      perpDist = Math.abs(dx);
      const hOverlap = Math.max(
        0,
        Math.min(curRect.right, rect.right) - Math.max(curRect.left, rect.left)
      );
      if (hOverlap > 0) overlapBonus = -180;
    } else if (direction === 'UP') {
      if (dy >= -10) continue;
      primaryDist = Math.max(1, curRect.top - rect.bottom);
      if (curRect.top < rect.bottom) primaryDist = Math.abs(dy);
      perpDist = Math.abs(dx);
      const hOverlap = Math.max(
        0,
        Math.min(curRect.right, rect.right) - Math.max(curRect.left, rect.left)
      );
      if (hOverlap > 0) overlapBonus = -180;
    }

    const perpWeight = direction === 'LEFT' || direction === 'RIGHT' ? 3.6 : 0.55;
    const score = primaryDist + perpDist * perpWeight + overlapBonus;

    if (score < bestScore) {
      bestScore = score;
      bestEl = el;
    }
  }

  return bestEl;
}

/**
 * Spatial 2D Fire TV D-Pad Navigation Engine
 * Maps hardware/keyboard remote keys (UP, DOWN, LEFT, RIGHT, SELECT, BACK)
 * to deterministic 2D geometric focus movement and smooth 10-foot scrolling.
 */
export function useSpatialDPadNavigation({ onBack, scopeSelector }: SpatialOptions = {}) {
  const triggerDPadAction = useCallback(
    (action: DPadAction) => {
      if (typeof document === 'undefined') return;

      if (action === 'BACK') {
        const consumed = onBack?.() ?? false;
        if (consumed) {
          playTVBackSound();
        }
        return;
      }

      const candidates = getFocusableElements(scopeSelector);
      if (candidates.length === 0) return;

      const active = document.activeElement as HTMLElement | null;
      const isActiveCandidate = active && candidates.includes(active);

      if (action === 'SELECT') {
        if (isActiveCandidate && active) {
          active.click();
        } else {
          const preferred =
            candidates.find((c) => c.dataset.tvPreferred === 'true') ?? candidates[0];
          preferred?.focus();
        }
        return;
      }

      if (!isActiveCandidate || !active) {
        const preferred =
          candidates.find((c) => c.dataset.tvPreferred === 'true') ?? candidates[0];
        preferred?.focus();
        preferred?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        return;
      }

      const next = findNextSpatialTarget(active, candidates, action);
      if (next) {
        next.focus({ preventScroll: true });
        next.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    },
    [onBack, scopeSelector]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTextInput =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';

      if (e.key === 'Escape') {
        e.preventDefault();
        triggerDPadAction('BACK');
        return;
      }

      if (e.key === 'Backspace' && !isTextInput) {
        e.preventDefault();
        triggerDPadAction('BACK');
        return;
      }

      if (isTextInput) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          triggerDPadAction(e.key === 'ArrowDown' ? 'DOWN' : 'UP');
        }
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          triggerDPadAction('UP');
          break;
        case 'ArrowDown':
          e.preventDefault();
          triggerDPadAction('DOWN');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          triggerDPadAction('LEFT');
          break;
        case 'ArrowRight':
          e.preventDefault();
          triggerDPadAction('RIGHT');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerDPadAction]);

  return { triggerDPadAction };
}
