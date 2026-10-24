import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

export type StyleProp<T> =
  | T
  | ReadonlyArray<StyleProp<T>>
  | null
  | undefined
  | false;

export interface ShadowOffset {
  width: number;
  height: number;
}

export interface TransformItem {
  scale?: number | AnimatedValue;
  scaleX?: number | AnimatedValue;
  scaleY?: number | AnimatedValue;
  translateX?: number | AnimatedValue;
  translateY?: number | AnimatedValue;
}

export interface ViewStyle {
  display?: 'flex' | 'none';
  flex?: number;
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch';
  justifyContent?:
    | 'flex-start'
    | 'flex-end'
    | 'center'
    | 'space-between'
    | 'space-around'
    | 'space-evenly';
  flexWrap?: 'wrap' | 'nowrap';
  gap?: number;
  rowGap?: number;
  columnGap?: number;
  width?: number | string;
  height?: number | string;
  minWidth?: number | string;
  maxWidth?: number | string;
  minHeight?: number | string;
  maxHeight?: number | string;
  aspectRatio?: number | string;
  padding?: number | string;
  paddingHorizontal?: number | string;
  paddingVertical?: number | string;
  paddingTop?: number | string;
  paddingBottom?: number | string;
  paddingLeft?: number | string;
  paddingRight?: number | string;
  margin?: number | string;
  marginHorizontal?: number | string;
  marginVertical?: number | string;
  marginTop?: number | string;
  marginBottom?: number | string;
  marginLeft?: number | string;
  marginRight?: number | string;
  backgroundColor?: string;
  borderRadius?: number;
  borderTopLeftRadius?: number;
  borderTopRightRadius?: number;
  borderBottomLeftRadius?: number;
  borderBottomRightRadius?: number;
  borderWidth?: number;
  borderTopWidth?: number;
  borderBottomWidth?: number;
  borderLeftWidth?: number;
  borderRightWidth?: number;
  borderColor?: string;
  borderTopColor?: string;
  borderRightColor?: string;
  borderBottomColor?: string;
  borderLeftColor?: string;
  opacity?: number | AnimatedValue;
  overflow?: 'visible' | 'hidden' | 'scroll';
  position?: 'relative' | 'absolute';
  top?: number | string;
  bottom?: number | string;
  left?: number | string;
  right?: number | string;
  zIndex?: number;
  shadowColor?: string;
  shadowOffset?: ShadowOffset;
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number;
  transform?: TransformItem[];
}

export interface TextStyle extends ViewStyle {
  color?: string;
  fontSize?: number;
  fontWeight?:
    | 'normal'
    | 'bold'
    | '400'
    | '500'
    | '600'
    | '700'
    | '800';
  fontFamily?: string;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: 'auto' | 'left' | 'right' | 'center';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  fontVariant?: Array<'tabular-nums'>;
}

export interface ImageStyle extends ViewStyle {
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
}

export type NamedStyles<T> = {
  [P in keyof T]: ViewStyle | TextStyle | ImageStyle;
};

export const StyleSheet = {
  create<T extends NamedStyles<T> | NamedStyles<any>>(styles: T): T {
    return styles;
  },
  flatten<T>(style?: StyleProp<T>): Partial<T> {
    if (!style) return {};
    if (Array.isArray(style)) {
      return style.reduce<Partial<T>>((acc, item) => {
        if (item) {
          Object.assign(acc, StyleSheet.flatten(item));
        }
        return acc;
      }, {});
    }
    return { ...(style as object) } as Partial<T>;
  },
  absoluteFillObject: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  } as const,
};

function pxOrStr(val: number | string | undefined): string | number | undefined {
  if (typeof val === 'number') return `${val}px`;
  return val;
}

function resolveAnimatedNumber(val: number | AnimatedValue | undefined, fallback: number): number {
  if (val instanceof AnimatedValue) {
    return val.__getValue();
  }
  return typeof val === 'number' ? val : fallback;
}

function convertRNStyleToCSS(
  rawStyle?: StyleProp<ViewStyle | TextStyle | ImageStyle>,
  defaultFlexColumn = true
): React.CSSProperties {
  const flat = StyleSheet.flatten(rawStyle) as TextStyle & ImageStyle;
  const css: React.CSSProperties = {
    boxSizing: 'border-box',
  };

  if (defaultFlexColumn) {
    css.display = flat.display === 'none' ? 'none' : 'flex';
    css.flexDirection = flat.flexDirection ?? 'column';
  } else if (flat.display) {
    css.display = flat.display;
  }

  if (flat.flex !== undefined) {
    css.flex = flat.flex === 1 ? '1 1 0%' : String(flat.flex);
  }
  if (flat.alignItems) css.alignItems = flat.alignItems;
  if (flat.alignSelf) css.alignSelf = flat.alignSelf;
  if (flat.justifyContent) css.justifyContent = flat.justifyContent;
  if (flat.flexWrap) css.flexWrap = flat.flexWrap;
  if (flat.gap !== undefined) css.gap = pxOrStr(flat.gap);
  if (flat.rowGap !== undefined) css.rowGap = pxOrStr(flat.rowGap);
  if (flat.columnGap !== undefined) css.columnGap = pxOrStr(flat.columnGap);

  if (flat.width !== undefined) css.width = pxOrStr(flat.width);
  if (flat.height !== undefined) css.height = pxOrStr(flat.height);
  if (flat.minWidth !== undefined) css.minWidth = pxOrStr(flat.minWidth);
  if (flat.maxWidth !== undefined) css.maxWidth = pxOrStr(flat.maxWidth);
  if (flat.minHeight !== undefined) css.minHeight = pxOrStr(flat.minHeight);
  if (flat.maxHeight !== undefined) css.maxHeight = pxOrStr(flat.maxHeight);
  if (flat.aspectRatio !== undefined) css.aspectRatio = String(flat.aspectRatio);

  const pt = flat.paddingTop ?? flat.paddingVertical ?? flat.padding;
  const pb = flat.paddingBottom ?? flat.paddingVertical ?? flat.padding;
  const pl = flat.paddingLeft ?? flat.paddingHorizontal ?? flat.padding;
  const pr = flat.paddingRight ?? flat.paddingHorizontal ?? flat.padding;
  if (pt !== undefined) css.paddingTop = pxOrStr(pt);
  if (pb !== undefined) css.paddingBottom = pxOrStr(pb);
  if (pl !== undefined) css.paddingLeft = pxOrStr(pl);
  if (pr !== undefined) css.paddingRight = pxOrStr(pr);

  const mt = flat.marginTop ?? flat.marginVertical ?? flat.margin;
  const mb = flat.marginBottom ?? flat.marginVertical ?? flat.margin;
  const ml = flat.marginLeft ?? flat.marginHorizontal ?? flat.margin;
  const mr = flat.marginRight ?? flat.marginHorizontal ?? flat.margin;
  if (mt !== undefined) css.marginTop = pxOrStr(mt);
  if (mb !== undefined) css.marginBottom = pxOrStr(mb);
  if (ml !== undefined) css.marginLeft = pxOrStr(ml);
  if (mr !== undefined) css.marginRight = pxOrStr(mr);

  if (flat.backgroundColor) css.backgroundColor = flat.backgroundColor;
  if (flat.borderRadius !== undefined) css.borderRadius = pxOrStr(flat.borderRadius);
  if (flat.borderTopLeftRadius !== undefined)
    css.borderTopLeftRadius = pxOrStr(flat.borderTopLeftRadius);
  if (flat.borderTopRightRadius !== undefined)
    css.borderTopRightRadius = pxOrStr(flat.borderTopRightRadius);
  if (flat.borderBottomLeftRadius !== undefined)
    css.borderBottomLeftRadius = pxOrStr(flat.borderBottomLeftRadius);
  if (flat.borderBottomRightRadius !== undefined)
    css.borderBottomRightRadius = pxOrStr(flat.borderBottomRightRadius);

  const hasBorderWidth =
    flat.borderWidth !== undefined ||
    flat.borderTopWidth !== undefined ||
    flat.borderRightWidth !== undefined ||
    flat.borderBottomWidth !== undefined ||
    flat.borderLeftWidth !== undefined;

  if (hasBorderWidth) {
    const baseW = flat.borderWidth;
    const topW = flat.borderTopWidth ?? baseW ?? 0;
    const rightW = flat.borderRightWidth ?? baseW ?? 0;
    const bottomW = flat.borderBottomWidth ?? baseW ?? 0;
    const leftW = flat.borderLeftWidth ?? baseW ?? 0;

    css.borderTopStyle = 'solid';
    css.borderRightStyle = 'solid';
    css.borderBottomStyle = 'solid';
    css.borderLeftStyle = 'solid';
    css.borderTopWidth = pxOrStr(topW);
    css.borderRightWidth = pxOrStr(rightW);
    css.borderBottomWidth = pxOrStr(bottomW);
    css.borderLeftWidth = pxOrStr(leftW);
  }

  const hasBorderColor =
    flat.borderColor !== undefined ||
    flat.borderTopColor !== undefined ||
    flat.borderRightColor !== undefined ||
    flat.borderBottomColor !== undefined ||
    flat.borderLeftColor !== undefined;

  if (hasBorderColor) {
    const baseColor = flat.borderColor;
    const topColor = flat.borderTopColor ?? baseColor ?? 'transparent';
    const rightColor = flat.borderRightColor ?? baseColor ?? 'transparent';
    const bottomColor = flat.borderBottomColor ?? baseColor ?? 'transparent';
    const leftColor = flat.borderLeftColor ?? baseColor ?? 'transparent';

    css.borderTopColor = topColor;
    css.borderRightColor = rightColor;
    css.borderBottomColor = bottomColor;
    css.borderLeftColor = leftColor;
  }

  if (flat.opacity !== undefined) {
    css.opacity = resolveAnimatedNumber(flat.opacity, 1);
  }
  if (flat.overflow) css.overflow = flat.overflow;
  if (flat.position) css.position = flat.position;
  if (flat.top !== undefined) css.top = pxOrStr(flat.top);
  if (flat.bottom !== undefined) css.bottom = pxOrStr(flat.bottom);
  if (flat.left !== undefined) css.left = pxOrStr(flat.left);
  if (flat.right !== undefined) css.right = pxOrStr(flat.right);
  if (flat.zIndex !== undefined) css.zIndex = flat.zIndex;

  if (flat.shadowColor && (flat.shadowOpacity ?? 0) > 0) {
    const ox = flat.shadowOffset?.width ?? 0;
    const oy = flat.shadowOffset?.height ?? 8;
    const radius = flat.shadowRadius ?? 20;
    css.boxShadow = `${ox}px ${oy}px ${radius}px ${flat.shadowColor}`;
  }

  if (flat.transform && flat.transform.length > 0) {
    const parts: string[] = [];
    for (const item of flat.transform) {
      if (item.scale !== undefined) {
        parts.push(`scale(${resolveAnimatedNumber(item.scale, 1)})`);
      }
      if (item.scaleX !== undefined) {
        parts.push(`scaleX(${resolveAnimatedNumber(item.scaleX, 1)})`);
      }
      if (item.scaleY !== undefined) {
        parts.push(`scaleY(${resolveAnimatedNumber(item.scaleY, 1)})`);
      }
      if (item.translateX !== undefined) {
        parts.push(`translateX(${resolveAnimatedNumber(item.translateX, 0)}px)`);
      }
      if (item.translateY !== undefined) {
        parts.push(`translateY(${resolveAnimatedNumber(item.translateY, 0)}px)`);
      }
    }
    if (parts.length > 0) {
      css.transform = parts.join(' ');
      css.willChange = 'transform, opacity';
    }
  }

  if (flat.color) css.color = flat.color;
  if (flat.fontSize !== undefined) css.fontSize = pxOrStr(flat.fontSize);
  if (flat.fontWeight) css.fontWeight = flat.fontWeight;
  if (flat.fontFamily) css.fontFamily = flat.fontFamily;
  if (flat.lineHeight !== undefined) css.lineHeight = pxOrStr(flat.lineHeight);
  if (flat.letterSpacing !== undefined) css.letterSpacing = `${flat.letterSpacing}px`;
  if (flat.textAlign) {
    css.textAlign = flat.textAlign === 'auto' ? 'start' : flat.textAlign;
  }
  if (flat.textTransform) css.textTransform = flat.textTransform;
  if (flat.fontVariant?.includes('tabular-nums')) {
    css.fontVariantNumeric = 'tabular-nums';
  }

  return css;
}

export class AnimatedValue {
  private value: number;
  private listeners = new Set<(val: number) => void>();
  private rafId: number | null = null;

  constructor(initialValue: number) {
    this.value = initialValue;
  }

  __getValue(): number {
    return this.value;
  }

  setValue(next: number): void {
    this.stopAnimation();
    this.value = next;
    this.notify();
  }

  subscribe(listener: (val: number) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn(this.value));
  }

  stopAnimation(): void {
    if (this.rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  animateTo(target: number, durationMs = 165): void {
    this.stopAnimation();
    if (typeof requestAnimationFrame === 'undefined') {
      this.value = target;
      this.notify();
      return;
    }
    const startVal = this.value;
    const delta = target - startVal;
    if (Math.abs(delta) < 0.0005) {
      this.value = target;
      this.notify();
      return;
    }
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      // Smooth cubic-bezier(0.16, 1, 0.3, 1) approximation
      const eased = 1 - Math.pow(1 - t, 3.4);
      this.value = startVal + delta * eased;
      this.notify();
      if (t < 1) {
        this.rafId = requestAnimationFrame(step);
      } else {
        this.value = target;
        this.rafId = null;
        this.notify();
      }
    };
    this.rafId = requestAnimationFrame(step);
  }
}

export interface AnimationComposite {
  start: (callback?: (result: { finished: boolean }) => void) => void;
  stop: () => void;
}

function collectAnimatedValues(style?: StyleProp<ViewStyle>): AnimatedValue[] {
  const flat = StyleSheet.flatten(style);
  const found: AnimatedValue[] = [];
  if (flat.opacity instanceof AnimatedValue) {
    found.push(flat.opacity);
  }
  if (flat.transform) {
    for (const item of flat.transform) {
      for (const v of Object.values(item)) {
        if (v instanceof AnimatedValue) {
          found.push(v);
        }
      }
    }
  }
  return found;
}

export interface ViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityRole?: string;
  accessibilityLabel?: string;
}

export const View = forwardRef<HTMLDivElement, ViewProps>(
  ({ children, style, testID, accessibilityLabel }, ref) => {
    const css = useMemo(() => convertRNStyleToCSS(style, true), [style]);
    return (
      <div ref={ref} data-testid={testID} aria-label={accessibilityLabel} style={css}>
        {children}
      </div>
    );
  }
);
View.displayName = 'View';

const AnimatedView = forwardRef<HTMLDivElement, ViewProps>(
  ({ children, style, testID, accessibilityLabel }, ref) => {
    const [, setTick] = useState(0);
    const animValues = collectAnimatedValues(style);
    const prevAnimValuesRef = useRef<AnimatedValue[]>([]);

    useEffect(() => {
      const prev = prevAnimValuesRef.current;
      const isIdentical =
        prev.length === animValues.length &&
        prev.every((val, i) => val === animValues[i]);
      if (isIdentical && prev.length > 0) {
        return undefined;
      }
      prevAnimValuesRef.current = animValues;

      const unsubs = animValues.map((av) =>
        av.subscribe(() => {
          setTick((c) => (c + 1) % 1000000);
        })
      );
      return () => {
        unsubs.forEach((u) => u());
      };
    }, [animValues]);

    const css = convertRNStyleToCSS(style, true);
    return (
      <div ref={ref} data-testid={testID} aria-label={accessibilityLabel} style={css}>
        {children}
      </div>
    );
  }
);
AnimatedView.displayName = 'Animated.View';

export const Animated = {
  Value: AnimatedValue,
  View: AnimatedView,
  spring(
    value: AnimatedValue,
    config: {
      toValue: number;
      friction?: number;
      tension?: number;
      useNativeDriver?: boolean;
    }
  ): AnimationComposite {
    return {
      start(cb) {
        value.animateTo(config.toValue, 165);
        if (cb) setTimeout(() => cb({ finished: true }), 170);
      },
      stop() {
        value.stopAnimation();
      },
    };
  },
  timing(
    value: AnimatedValue,
    config: {
      toValue: number;
      duration?: number;
      useNativeDriver?: boolean;
    }
  ): AnimationComposite {
    const dur = config.duration ?? 160;
    return {
      start(cb) {
        value.animateTo(config.toValue, dur);
        if (cb) setTimeout(() => cb({ finished: true }), dur + 5);
      },
      stop() {
        value.stopAnimation();
      },
    };
  },
  parallel(animations: AnimationComposite[]): AnimationComposite {
    return {
      start(cb) {
        animations.forEach((a) => a.start());
        if (cb) setTimeout(() => cb({ finished: true }), 175);
      },
      stop() {
        animations.forEach((a) => a.stop());
      },
    };
  },
};

export interface TextProps {
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  accessibilityRole?: string;
}

export const Text: React.FC<TextProps> = ({ children, style, numberOfLines }) => {
  const css = useMemo(() => {
    const base = convertRNStyleToCSS(style, false);
    base.margin = base.margin ?? 0;
    if (numberOfLines === 1) {
      base.whiteSpace = 'nowrap';
      base.overflow = 'hidden';
      base.textOverflow = 'ellipsis';
    } else if (numberOfLines && numberOfLines > 1) {
      base.display = '-webkit-box';
      base.WebkitLineClamp = numberOfLines;
      base.WebkitBoxOrient = 'vertical';
      base.overflow = 'hidden';
    }
    return base;
  }, [style, numberOfLines]);

  return <span style={css}>{children}</span>;
};

export interface PressableStateCallbackType {
  pressed: boolean;
  focused?: boolean;
}

export interface PressableProps {
  children?:
    | React.ReactNode
    | ((state: PressableStateCallbackType) => React.ReactNode);
  style?:
    | StyleProp<ViewStyle>
    | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
  onPress?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  hasTVPreferredFocus?: boolean;
  isTVSelectable?: boolean;
  nextFocusUp?: number;
  nextFocusDown?: number;
  nextFocusLeft?: number;
  nextFocusRight?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: string;
  testID?: string;
  tvGroup?: string;
}

export const Pressable = forwardRef<HTMLButtonElement, PressableProps>(
  (
    {
      children,
      style,
      onPress,
      onFocus,
      onBlur,
      hasTVPreferredFocus = false,
      isTVSelectable = true,
      disabled = false,
      accessibilityLabel,
      testID,
      tvGroup,
    },
    forwardedRef
  ) => {
    const innerRef = useRef<HTMLButtonElement | null>(null);
    useImperativeHandle(forwardedRef, () => innerRef.current as HTMLButtonElement);

    const [focused, setFocused] = useState(false);
    const [pressed, setPressed] = useState(false);

    useEffect(() => {
      if (hasTVPreferredFocus && innerRef.current && !disabled) {
        const timer = window.setTimeout(() => {
          innerRef.current?.focus({ preventScroll: true });
        }, 40);
        return () => window.clearTimeout(timer);
      }
      return undefined;
    }, [hasTVPreferredFocus, disabled]);

    const resolvedStyle =
      typeof style === 'function' ? style({ pressed, focused }) : style;
    const css = convertRNStyleToCSS(resolvedStyle, true);

    return (
      <button
        ref={innerRef}
        type="button"
        disabled={disabled}
        tabIndex={disabled || !isTVSelectable ? -1 : 0}
        data-tv-focusable={disabled || !isTVSelectable ? 'false' : 'true'}
        data-tv-preferred={hasTVPreferredFocus ? 'true' : undefined}
        data-tv-group={tvGroup}
        data-testid={testID}
        aria-label={accessibilityLabel}
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => {
          setFocused(false);
          setPressed(false);
          onBlur?.();
        }}
        onMouseEnter={(e) => {
          // On TV web preview, hovering focuses the tile cleanly so mouse + D-Pad stay unified
          if (!disabled && document.activeElement !== e.currentTarget) {
            e.currentTarget.focus({ preventScroll: true });
          }
        }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onClick={() => {
          if (!disabled) {
            onPress?.();
          }
        }}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            setPressed(true);
            onPress?.();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setPressed(false);
          }
        }}
        style={{
          appearance: 'none',
          background: 'transparent',
          borderTopWidth: 0,
          borderRightWidth: 0,
          borderBottomWidth: 0,
          borderLeftWidth: 0,
          borderTopStyle: 'none',
          borderRightStyle: 'none',
          borderBottomStyle: 'none',
          borderLeftStyle: 'none',
          outline: 'none',
          padding: 0,
          margin: 0,
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          color: 'inherit',
          ...css,
        }}
      >
        {typeof children === 'function' ? children({ pressed, focused }) : children}
      </button>
    );
  }
);
Pressable.displayName = 'Pressable';

export interface ImageSourcePropType {
  uri: string;
}

export interface ImageProps {
  source: ImageSourcePropType | string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  accessibilityLabel?: string;
  alt?: string;
  fallbackTitle?: string;
}

export const Image: React.FC<ImageProps> = ({
  source,
  style,
  resizeMode = 'cover',
  accessibilityLabel,
  alt,
  fallbackTitle,
}) => {
  const [errored, setErrored] = useState(false);
  const srcUri = typeof source === 'string' ? source : source.uri;
  const flat = StyleSheet.flatten(style);
  const mode = flat.resizeMode ?? resizeMode;
  const css = convertRNStyleToCSS(style, false);

  if (errored || !srcUri) {
    return (
      <div
        aria-label={alt ?? accessibilityLabel ?? fallbackTitle ?? 'Course artwork'}
        style={{
          ...css,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(circle at 25% 25%, rgba(255, 153, 0, 0.20), rgba(26, 34, 45, 0.96) 70%)',
          color: '#C8D1DC',
          padding: '16px',
          textAlign: 'center',
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#FF9900"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        {fallbackTitle ? (
          <span
            style={{
              marginTop: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#FFFFFF',
            }}
          >
            {fallbackTitle}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <img
      src={srcUri}
      alt={alt ?? accessibilityLabel ?? fallbackTitle ?? 'Course artwork'}
      referrerPolicy="no-referrer"
      onError={() => setErrored(true)}
      style={{
        display: 'block',
        objectFit: mode === 'stretch' ? 'fill' : mode === 'center' ? 'none' : mode,
        ...css,
      }}
    />
  );
};

export interface ScrollViewProps {
  children?: React.ReactNode;
  horizontal?: boolean;
  showsHorizontalScrollIndicator?: boolean;
  showsVerticalScrollIndicator?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export const ScrollView = forwardRef<HTMLDivElement, ScrollViewProps>(
  (
    {
      children,
      horizontal = false,
      showsHorizontalScrollIndicator = false,
      showsVerticalScrollIndicator = false,
      style,
      contentContainerStyle,
    },
    ref
  ) => {
    const outerCss = convertRNStyleToCSS(style, true);
    const innerCss = convertRNStyleToCSS(contentContainerStyle, true);
    const hideBars = !showsHorizontalScrollIndicator && !showsVerticalScrollIndicator;

    return (
      <div
        ref={ref}
        className={hideBars ? 'no-scrollbar' : undefined}
        style={{
          ...outerCss,
          overflowX: horizontal ? 'auto' : 'hidden',
          overflowY: horizontal ? 'hidden' : 'auto',
          scrollBehavior: 'smooth',
        }}
      >
        <div
          style={{
            ...innerCss,
            display: 'flex',
            flexDirection: horizontal ? 'row' : innerCss.flexDirection ?? 'column',
          }}
        >
          {children}
        </div>
      </div>
    );
  }
);
ScrollView.displayName = 'ScrollView';

export interface TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  style?: StyleProp<TextStyle>;
  onSubmitEditing?: () => void;
  autoFocus?: boolean;
  accessibilityLabel?: string;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      value,
      onChangeText,
      placeholder,
      style,
      onSubmitEditing,
      autoFocus,
      accessibilityLabel,
    },
    ref
  ) => {
    const css = convertRNStyleToCSS(style, false);
    return (
      <input
        ref={ref}
        type="text"
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={accessibilityLabel ?? placeholder}
        data-tv-focusable="true"
        onChange={(e) => onChangeText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSubmitEditing?.();
          }
        }}
        style={{
          background: 'transparent',
          borderTopWidth: 0,
          borderRightWidth: 0,
          borderBottomWidth: 0,
          borderLeftWidth: 0,
          borderTopStyle: 'none',
          borderRightStyle: 'none',
          borderBottomStyle: 'none',
          borderLeftStyle: 'none',
          outline: 'none',
          color: '#FFFFFF',
          fontFamily: 'inherit',
          ...css,
        }}
      />
    );
  }
);
TextInput.displayName = 'TextInput';

export interface ActivityIndicatorProps {
  size?: 'small' | 'large' | number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export const ActivityIndicator: React.FC<ActivityIndicatorProps> = ({
  size = 'small',
  color = '#FF9900',
  style,
}) => {
  const pixelSize = typeof size === 'number' ? size : size === 'large' ? 36 : 20;
  const css = convertRNStyleToCSS(style, true);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...css,
      }}
    >
      <svg
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 24 24"
        fill="none"
        style={{
          animation: 'spin 1s linear infinite',
        }}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={color}
          strokeWidth="3"
          strokeDasharray="31.4 31.4"
          strokeLinecap="round"
          opacity="0.8"
        />
      </svg>
    </div>
  );
};
ActivityIndicator.displayName = 'ActivityIndicator';

export const Platform = {
  OS: 'android' as const,
  isTV: true,
  select<T>(specifics: { android?: T; ios?: T; web?: T; default?: T }): T | undefined {
    return specifics.android ?? specifics.default ?? specifics.web;
  },
};

export const Dimensions = {
  get(_dim: 'window' | 'screen') {
    if (typeof window === 'undefined') {
      return { width: 1920, height: 1080, scale: 1, fontScale: 1 };
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      scale: window.devicePixelRatio || 1,
      fontScale: 1,
    };
  },
};

export interface TVRemoteEvent {
  eventType: 'up' | 'down' | 'left' | 'right' | 'select' | 'back' | 'playPause';
}

export function useTVEventHandler(handler: (evt: TVRemoteEvent) => void): void {
  const savedHandler = useRef(handler);
  savedHandler.current = handler;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const map: Record<string, TVRemoteEvent['eventType'] | undefined> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        Enter: 'select',
        Escape: 'back',
        Backspace: 'back',
        MediaPlayPause: 'playPause',
      };
      const eventType = map[e.key];
      if (eventType) {
        savedHandler.current({ eventType });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
