import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Mic,
  MicOff,
  Radio,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { AmazonDarkPalette, TVFocusConfig, TVTypography } from '../theme/colors';
import { playTVFocusTick, playTVSelectSound } from '../utils/tvAudio';

export interface VoiceAssistantOverlayProps {
  visible: boolean;
  courseTitle: string;
  chapterTitle: string;
  timestampSeconds: number;
  currentSnapshot?: string | null;
  onClose: () => void;
}

const PRESET_QUERIES = [
  'Can you explain this diagram in simple terms?',
  'What is the physical intuition behind this equation?',
  'How is this validated experimentally in industry?',
  'Summarize the core takeaway of this timestamp',
];

export const VoiceAssistantOverlay: React.FC<VoiceAssistantOverlayProps> = ({
  visible,
  courseTitle,
  chapterTitle,
  timestampSeconds,
  currentSnapshot,
  onClose,
}) => {
  const [activeQuery, setActiveQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [spokenText, setSpokenText] = useState<string>('');
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [audioMuted, setAudioMuted] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);

  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      synthRef.current?.cancel();
    };
  }, []);

  const speakResponse = useCallback(
    (textToSpeak: string) => {
      if (!synthRef.current || audioMuted || !textToSpeak) return;
      try {
        synthRef.current.cancel();
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        synthRef.current.speak(utterance);
      } catch {
        setIsSpeaking(false);
      }
    },
    [audioMuted]
  );

  const handleAskQuery = useCallback(
    async (queryText: string) => {
      playTVSelectSound();
      setActiveQuery(queryText);
      setLoading(true);
      setAnswer(null);
      setIsListening(false);

      try {
        const response = await fetch('/api/ai/voice-query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: queryText,
            courseTitle,
            chapterTitle,
            timestampSeconds,
            imageBase64: currentSnapshot,
          }),
        });
        const data = await response.json();
        const ans = data.answer || 'Analyzing lecture scene and acoustic context...';
        const spoken = data.spokenText || ans;
        setAnswer(ans);
        setSpokenText(spoken);
        setFollowUps(data.suggestedFollowUps || []);
        speakResponse(spoken);
      } catch {
        const fallbackAns = `In this segment of "${courseTitle}", the primary invariant ensures that energy dissipation remains bounded as parameters scale.`;
        setAnswer(fallbackAns);
        setSpokenText(fallbackAns);
        setFollowUps(['How does this apply to real-world hardware?']);
        speakResponse(fallbackAns);
      } finally {
        setLoading(false);
      }
    },
    [chapterTitle, courseTitle, currentSnapshot, speakResponse, timestampSeconds]
  );

  const handleToggleMute = () => {
    playTVSelectSound();
    if (isSpeaking && synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
    setAudioMuted((prev) => !prev);
  };

  const handleSimulateVoiceInput = () => {
    playTVSelectSound();
    setIsListening(true);
    setActiveQuery('Listening to Fire TV Remote voice input...');
    // Simulate real speech recognition capture
    setTimeout(() => {
      handleAskQuery('Can you explain this diagram in simple terms?');
    }, 1200);
  };

  if (!visible) return null;

  return (
    <div
      id="tv-voice-assistant-overlay"
      className="fixed inset-x-8 bottom-6 z-50 flex flex-col pointer-events-auto"
      style={{
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <View style={styles.assistantContainer}>
        {/* Alexa / Fire TV Cyan & Gold Audio Horizon Line */}
        <View style={styles.ambientTopGlowRow}>
          <View style={styles.glowSegmentCyan} />
          <View style={styles.glowSegmentGold} />
          <View style={styles.glowSegmentCyan} />
        </View>

        {/* Header Bar */}
        <View style={styles.headerBar}>
          <View style={styles.alexaTag}>
            <View style={styles.micPulseIcon}>
              <Radio size={16} color={AmazonDarkPalette.primaryAccent} />
            </View>
            <Text style={styles.alexaTagTitle}>Alexa & Gemini Voice Tutor</Text>
            <View style={styles.liveContextChip}>
              <Text style={styles.liveContextText}>
                {courseTitle} · {chapterTitle}
              </Text>
            </View>
          </View>

          <View style={styles.rightActionsRow}>
            {/* Audio Voice Toggle */}
            <Pressable
              onFocus={() => playTVFocusTick()}
              onPress={handleToggleMute}
            >
              {({ focused }) => (
                <View
                  style={[
                    styles.iconButton,
                    focused ? styles.buttonFocused : undefined,
                  ]}
                >
                  {audioMuted ? (
                    <VolumeX size={16} color={AmazonDarkPalette.textSecondary} />
                  ) : (
                    <Volume2
                      size={16}
                      color={isSpeaking ? AmazonDarkPalette.primaryAccent : AmazonDarkPalette.textPrimary}
                    />
                  )}
                </View>
              )}
            </Pressable>

            {/* Dismiss Button */}
            <Pressable
              onFocus={() => playTVFocusTick()}
              onPress={() => {
                playTVSelectSound();
                synthRef.current?.cancel();
                onClose();
              }}
            >
              {({ focused }) => (
                <View
                  style={[
                    styles.iconButton,
                    focused ? styles.buttonFocused : undefined,
                  ]}
                >
                  <X size={16} color={AmazonDarkPalette.textPrimary} />
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* Active Query & Soundwave Visualization */}
        <View style={styles.queryVisualizationRow}>
          <View style={styles.soundwaveVisualizer}>
            <span className={`inline-block w-1 rounded bg-[#00A8E1] transition-all ${isListening || isSpeaking ? 'h-6 animate-pulse' : 'h-2'}`} />
            <span className={`inline-block w-1 rounded bg-[#FF9900] transition-all ${isListening || isSpeaking ? 'h-8 animate-pulse' : 'h-3'}`} />
            <span className={`inline-block w-1 rounded bg-[#00A8E1] transition-all ${isListening || isSpeaking ? 'h-10 animate-pulse' : 'h-4'}`} />
            <span className={`inline-block w-1 rounded bg-[#FF9900] transition-all ${isListening || isSpeaking ? 'h-7 animate-pulse' : 'h-2'}`} />
            <span className={`inline-block w-1 rounded bg-[#00A8E1] transition-all ${isListening || isSpeaking ? 'h-5 animate-pulse' : 'h-3'}`} />
          </View>

          <Text style={styles.queryDisplayHeadline} numberOfLines={1}>
            {activeQuery || 'Hold Fire TV Remote Voice Button or select a question below'}
          </Text>
        </View>

        {/* Answer Content Card */}
        {loading ? (
          <View style={styles.loadingAnswerBlock}>
            <ActivityIndicator size="small" color={AmazonDarkPalette.primaryAccent} />
            <Text style={styles.loadingAnswerText}>
              Gemini 2.0 Multi-Modal is synthesizing visual frame and audio explanation...
            </Text>
          </View>
        ) : answer ? (
          <View style={styles.answerBlock}>
            <View style={styles.sparkleIconCol}>
              <Sparkles size={18} color={AmazonDarkPalette.primaryAccent} />
            </View>
            <View style={styles.answerTextCol}>
              <Text style={styles.answerHeadline}>Explanation</Text>
              <Text style={styles.answerBodyText}>{answer}</Text>

              {/* Follow-up question pills */}
              {followUps.length > 0 && (
                <View style={styles.followUpsRow}>
                  <Text style={styles.followUpLabel}>SUGGESTED DEEP DIVE:</Text>
                  {followUps.map((fu, idx) => (
                    <Pressable
                      key={`fu-${idx}`}
                      onFocus={() => playTVFocusTick()}
                      onPress={() => handleAskQuery(fu)}
                    >
                      {({ focused }) => (
                        <View
                          style={[
                            styles.followUpChip,
                            focused ? styles.buttonFocused : undefined,
                          ]}
                        >
                          <Text style={styles.followUpChipText}>{fu}</Text>
                        </View>
                      )}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
        ) : null}

        {/* Preset Voice Questions Row (D-Pad Navigable) */}
        <View style={styles.presetQueriesRow}>
          {/* Push-to-Talk Simulation Button */}
          <Pressable
            hasTVPreferredFocus={!answer}
            onFocus={() => playTVFocusTick()}
            onPress={handleSimulateVoiceInput}
          >
            {({ focused }) => (
              <View
                style={[
                  styles.micVoiceActionButton,
                  focused ? styles.buttonFocused : undefined,
                ]}
              >
                <Mic size={16} color={AmazonDarkPalette.textInverse} />
                <Text style={styles.micVoiceActionText}>Speak Question</Text>
              </View>
            )}
          </Pressable>

          {/* Quick Select Questions */}
          {PRESET_QUERIES.map((q, idx) => (
            <Pressable
              key={`preset-q-${idx}`}
              onFocus={() => playTVFocusTick()}
              onPress={() => handleAskQuery(q)}
            >
              {({ focused }) => (
                <View
                  style={[
                    styles.presetQueryChip,
                    focused ? styles.buttonFocused : undefined,
                  ]}
                >
                  <Text style={styles.presetQueryText} numberOfLines={1}>
                    &ldquo;{q}&rdquo;
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </View>
    </div>
  );
};

const styles = StyleSheet.create({
  assistantContainer: {
    backgroundColor: 'rgba(14, 20, 30, 0.97)',
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'rgba(0, 168, 225, 0.35)',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    paddingBottom: 16,
    gap: 12,
  },
  ambientTopGlowRow: {
    flexDirection: 'row',
    width: '100%',
    height: 3,
  },
  glowSegmentCyan: {
    flex: 1,
    height: '100%',
    backgroundColor: '#00A8E1',
  },
  glowSegmentGold: {
    flex: 2,
    height: '100%',
    backgroundColor: AmazonDarkPalette.primaryAccent,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 4,
  },
  alexaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  micPulseIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 153, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alexaTagTitle: {
    color: '#00A8E1',
    fontFamily: TVTypography.fontBody,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  liveContextChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  liveContextText: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 12,
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'transparent',
  },
  queryVisualizationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 24,
    paddingVertical: 4,
  },
  soundwaveVisualizer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 28,
  },
  queryDisplayHeadline: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontDisplay,
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },
  loadingAnswerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 24,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  loadingAnswerText: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 14,
  },
  answerBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginHorizontal: 24,
    padding: 18,
    backgroundColor: 'rgba(18, 26, 38, 0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 153, 0, 0.35)',
  },
  sparkleIconCol: {
    paddingTop: 2,
  },
  answerTextCol: {
    flex: 1,
    gap: 6,
  },
  answerHeadline: {
    color: AmazonDarkPalette.primaryAccent,
    fontFamily: TVTypography.fontBody,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  answerBodyText: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontBody,
    fontSize: 15,
    lineHeight: 22,
  },
  followUpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  followUpLabel: {
    color: AmazonDarkPalette.textSecondary,
    fontFamily: TVTypography.fontBody,
    fontSize: 11,
    fontWeight: '700',
  },
  followUpChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  followUpChipText: {
    color: AmazonDarkPalette.primaryAccent,
    fontFamily: TVTypography.fontBody,
    fontSize: 12,
    fontWeight: '600',
  },
  presetQueriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 4,
  },
  micVoiceActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: AmazonDarkPalette.primaryAccent,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'transparent',
  },
  micVoiceActionText: {
    color: AmazonDarkPalette.textInverse,
    fontFamily: TVTypography.fontBody,
    fontSize: 13,
    fontWeight: '700',
  },
  presetQueryChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  presetQueryText: {
    color: AmazonDarkPalette.textPrimary,
    fontFamily: TVTypography.fontBody,
    fontSize: 13,
  },
  buttonFocused: {
    borderColor: AmazonDarkPalette.primaryAccent,
    transform: [{ scale: 1.04 }],
    backgroundColor: '#202E42',
    shadowColor: AmazonDarkPalette.primaryAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
});
