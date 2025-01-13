import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Animated
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection } from 'firebase/firestore';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';
import { auth, db } from '../../services/firebase';
import { 
  DEEPGRAM_API_KEY, 
  OPENAI_API_KEY
} from '@env';

type Tip = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
};

export default function BrainDumpScreen() {
  const insets = useSafeAreaInsets();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rawTranscription, setRawTranscription] = useState('');
  const [mood, setMood] = useState('');
  const [sentiment, setSentiment] = useState('');
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const breatheAnim = useRef(new Animated.Value(1)).current;

  const tips: Tip[] = [
    {
      icon: 'volume-mute',
      title: 'Find a Quiet Spot',
      text: 'Record in a calm area to minimize background noise.'
    },
    {
      icon: 'mic-outline',
      title: 'Speak Clearly & Steadily',
      text: 'Articulate each word and keep a steady pace.'
    },
    {
      icon: 'phone-portrait-outline',
      title: 'Hold Phone Steady & Near',
      text: 'Keep the mic close (but not too close) for clear audio.'
    },
    {
      icon: 'timer-outline',
      title: 'Avoid Interruptions',
      text: 'Pause briefly before and after speaking.'
    },
    {
      icon: 'eye-outline',
      title: 'Check Preview',
      text: 'Review the short transcript; re-record if needed.'
    }
  ];

  // Smooth transition for tips
  useEffect(() => {
    if (!transcription) {
      const interval = setInterval(() => {
        Animated.parallel([
          Animated.sequence([
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            })
          ]),
          Animated.sequence([
            Animated.timing(slideAnim, {
              toValue: -30,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            })
          ])
        ]).start();

        setCurrentTipIndex((prev) => (prev + 1) % tips.length);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [transcription]);

  // Cleanup the recorder when component unmounts
  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, [recording]);

  // Breathing animation for record button
  useEffect(() => {
    if (!transcription && !isRecording) {
      const breathe = Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      ]);

      Animated.loop(breathe).start();
    } else {
      breatheAnim.setValue(1);
    }
  }, [transcription, isRecording]);

  // --- Start Recording ---
  async function startRecording() {
    try {
      // Request permission to record
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Microphone permissions are required to record audio.');
        return;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create a new recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to start recording');
      console.error(err);
    }
  }

  // --- Stop Recording ---
  async function stopRecording() {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setIsRecording(false);
      setRecording(null);

      // Once stopped, transcribe the recorded audio
      if (uri) {
        await transcribeAudio(uri);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to stop recording');
      console.error(err);
    }
  }

  async function processWithGPT(text: string) {
    try {
      setIsProcessing(true);
      console.log('Sending to GPT:', text); // Debug log

      const requestBody = {
        model: "gpt-3.5-turbo",
        messages: [{
          role: "system",
          content: `You are a professional journal editor and emotional analyst. Your task is to:
1. Fix any grammatical errors
2. Remove unnecessary words
3. Structure the text into a proper journal entry
4. Make it look professional
5. Maintain the original meaning and personal tone of the journal entry
6. Analyze the mood and sentiment of the entry
7. Return a JSON object with the following structure:
{
  "entry": "the enhanced journal entry (start with Dear Journal)",
  "mood": "a single word describing the primary mood (e.g., happy, sad, anxious, excited)",
  "sentiment": "a brief phrase describing the emotional sentiment (e.g., very positive, slightly negative)"
}`
        }, {
          role: "user",
          content: text
        }],
        temperature: 0.7,
        max_tokens: 1000
      };

      console.log('Request body:', JSON.stringify(requestBody)); // Debug log

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      console.log('GPT Response:', data); // Debug log

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
      }

      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid response format from OpenAI');
      }

      try {
        const parsedResponse = JSON.parse(data.choices[0].message.content);
        setMood(parsedResponse.mood);
        setSentiment(parsedResponse.sentiment);
        return parsedResponse.entry;
      } catch (parseError) {
        console.error('Error parsing GPT response:', parseError);
        return data.choices[0].message.content;
      }
    } catch (error) {
      console.error('GPT Processing error:', error);
      Alert.alert('AI Enhancement Failed', 'Using original transcription instead');
      return text;
    } finally {
      setIsProcessing(false);
    }
  }

  async function transcribeAudio(uri: string) {
    try {
      setIsTranscribing(true);

      // Create FormData and append the recorded file
      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'audio/m4a',
        name: 'audio.m4a',
      } as any);

      // Send to Deepgram
      const response = await fetch('https://api.deepgram.com/v1/listen', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        },
        body: formData,
      });

      const data = await response.json();
      const transcribedText = data.results?.channels[0]?.alternatives[0]?.transcript || 'No transcription available';
      
      // Store raw transcription
      setRawTranscription(transcribedText);
      
      // Process with GPT
      const enhancedText = await processWithGPT(transcribedText);
      setTranscription(enhancedText);

    } catch (err) {
      console.error('Transcription error:', err);
      Alert.alert('Error', 'Failed to transcribe audio');
    } finally {
      setIsTranscribing(false);
    }
  }

  // --- Save Journal Entry to Firestore ---
  async function saveJournal() {
    if (!transcription || !auth.currentUser) return;

    try {
      await addDoc(collection(db, 'journals'), {
        userId: auth.currentUser.uid,
        content: transcription,
        mood: mood,
        sentiment: sentiment,
        createdAt: new Date().toISOString(),
      });

      Alert.alert('Success', 'Journal entry saved successfully');
      setTranscription('');
      setMood('');
      setSentiment('');
    } catch (err) {
      Alert.alert('Error', 'Failed to save journal entry');
      console.error(err);
    }
  }

  // Function to determine mood icon
  const getMoodIcon = (mood: string) => {
    const lowerMood = mood.toLowerCase();
    
    // Positive moods
    if (lowerMood.match(/happy|joy|excited|great|wonderful|fantastic|good|positive|cheerful|delighted|pleased|content|grateful|optimistic|confident/)) {
      return 'happy-outline';
    }
    
    // Negative moods
    if (lowerMood.match(/sad|angry|upset|frustrated|anxious|depressed|worried|stressed|tired|exhausted|disappointed|hurt|lonely|negative|fear/)) {
      return 'sad-outline';
    }
    
    // Neutral moods
    return 'logo-tux';
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScrollView 
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: insets.bottom + 100 }
          ]}
          showsVerticalScrollIndicator={true}
          bounces={true}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
              <View style={styles.header}>
                <Text style={styles.title}>Brain Dump</Text>
                <Text style={styles.subtitle}>Record your thoughts</Text>
              </View>

              {!transcription && (
                <>
                  <View style={styles.recordingContainer}>
                    <Animated.View style={{
                      transform: [{ scale: breatheAnim }]
                    }}>
                      <TouchableOpacity
                        style={[styles.recordButton, isRecording && styles.recordingActive]}
                        onPress={isRecording ? stopRecording : startRecording}
                      >
                        <Ionicons
                          name={isRecording ? 'stop' : 'mic'}
                          size={32}
                          color={COLORS.white}
                        />
                      </TouchableOpacity>
                    </Animated.View>
                    <Text style={styles.recordingText}>
                      {isRecording ? 'Tap to stop' : 'Tap to record'}
                    </Text>
                  </View>

                  <View style={styles.guideHeaderContainer}>
                    <Text style={styles.guideHeaderTitle}>Guidelines</Text>
                    <View style={styles.guideHeaderDivider} />
                    <Text style={styles.guideHeaderSubtitle}>Follow these tips for optimal quality</Text>
                  </View>

                  <Animated.View 
                    style={[
                      styles.tipContainer,
                      {
                        opacity: fadeAnim,
                        transform: [{
                          translateX: slideAnim
                        }]
                      }
                    ]}
                  >
                    <View style={styles.tipContent}>
                      <View style={styles.tipIconContainer}>
                        <Ionicons 
                          name={tips[currentTipIndex].icon} 
                          size={28} 
                          color={COLORS.primary} 
                        />
                      </View>
                      <View style={styles.tipTextContainer}>
                        <Text style={styles.tipTitle}>{tips[currentTipIndex].title}</Text>
                        <Text style={styles.tipText}>{tips[currentTipIndex].text}</Text>
                      </View>
                    </View>
                    <View style={styles.dotsContainer}>
                      {tips.map((_, index) => (
                        <View
                          key={index}
                          style={[
                            styles.dot,
                            index === currentTipIndex && styles.activeDot
                          ]}
                        />
                      ))}
                    </View>
                  </Animated.View>
                </>
              )}

              {(isTranscribing || isProcessing) && (
                <View style={styles.transcribingContainer}>
                  <ActivityIndicator color={COLORS.primary} />
                  <Text style={styles.transcribingText}>
                    {isTranscribing ? 'Transcribing...' : 'Enhancing with AI...'}
                  </Text>
                </View>
              )}

              {transcription && (
                <View style={styles.transcriptionContainer}>
                  <Text style={styles.transcriptionTitle}>Enhanced Journal Entry</Text>
                  <TextInput
                    style={styles.transcriptionInput}
                    value={transcription}
                    onChangeText={setTranscription}
                    multiline
                    placeholder="Your enhanced journal entry will appear here..."
                    placeholderTextColor={COLORS.textSecondary}
                  />
                  {mood && sentiment && (
                    <View style={styles.analysisContainer}>
                      <View style={styles.analysisHeader}>
                        <Text style={styles.analysisTitle}>Emotional Analysis</Text>
                        <Ionicons name="heart" size={20} color={COLORS.primary} />
                      </View>
                      <View style={styles.analysisDivider} />
                      <View style={styles.analysisContent}>
                        <View style={styles.analysisItem}>
                          <View style={[
                            styles.analysisIconContainer,
                            {
                              backgroundColor: mood.toLowerCase().match(/happy|joy|excited|great|wonderful|fantastic|good|positive|cheerful|delighted|pleased|content|grateful|optimistic|confident/)
                                ? COLORS.primary + '15'
                                : mood.toLowerCase().match(/sad|angry|upset|frustrated|anxious|depressed|worried|stressed|tired|exhausted|disappointed|hurt|lonely|negative|fear/)
                                  ? COLORS.error + '15'
                                  : COLORS.textSecondary + '15'
                            }
                          ]}>
                            <Ionicons 
                              name={getMoodIcon(mood)}
                              size={24}
                              color={mood.toLowerCase().match(/happy|joy|excited|great|wonderful|fantastic|good|positive|cheerful|delighted|pleased|content|grateful|optimistic|confident/)
                                ? COLORS.primary
                                : mood.toLowerCase().match(/sad|angry|upset|frustrated|anxious|depressed|worried|stressed|tired|exhausted|disappointed|hurt|lonely|negative|fear/)
                                  ? COLORS.error
                                  : COLORS.textSecondary
                              }
                            />
                          </View>
                          <View style={styles.analysisTextContainer}>
                            <Text style={styles.analysisLabel}>Mood</Text>
                            <Text style={[
                              styles.analysisValue,
                              {
                                color: mood.toLowerCase().match(/happy|joy|excited|great|wonderful|fantastic|good|positive|cheerful|delighted|pleased|content|grateful|optimistic|confident/)
                                  ? COLORS.primary
                                  : mood.toLowerCase().match(/sad|angry|upset|frustrated|anxious|depressed|worried|stressed|tired|exhausted|disappointed|hurt|lonely|negative|fear/)
                                    ? COLORS.error
                                    : COLORS.text
                              }
                            ]}>{mood}</Text>
                          </View>
                        </View>
                        <View style={[styles.analysisItem, styles.analysisItemBorder]}>
                          <View style={styles.analysisIconContainer}>
                            <Ionicons name="pulse" size={24} color={COLORS.primary} />
                          </View>
                          <View style={styles.analysisTextContainer}>
                            <Text style={styles.analysisLabel}>Sentiment</Text>
                            <Text style={styles.analysisValue}>{sentiment}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  )}
                  {rawTranscription && (
                    <>
                      <Text style={styles.rawTranscriptionTitle}>Original Transcription</Text>
                      <Text style={styles.rawTranscriptionText}>{rawTranscription}</Text>
                    </>
                  )}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.button, styles.discardButton]}
                      onPress={() => {
                        setTranscription('');
                        setRawTranscription('');
                      }}
                    >
                      <Text style={styles.buttonText}>Discard</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.saveButton]}
                      onPress={saveJournal}
                    >
                      <Text style={[styles.buttonText, styles.saveButtonText]}>
                        Save to Vault
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: SIZES.padding,
  },
  contentContainer: {
    paddingTop: SIZES.padding,
    flexGrow: 1,
  },
  header: {
    marginBottom: SIZES.padding,
  },
  title: {
    ...FONTS.h1,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  subtitle: {
    ...FONTS.body1,
    color: COLORS.textSecondary,
  },
  recordingContainer: {
    alignItems: 'center',
    marginBottom: SIZES.padding * 3,
    marginTop: SIZES.padding * 2,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  recordingActive: {
    backgroundColor: COLORS.error,
  },
  recordingText: {
    ...FONTS.body1,
    color: COLORS.textSecondary,
    marginTop: SIZES.padding,
  },
  transcribingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.base,
  },
  transcribingText: {
    ...FONTS.body1,
    color: COLORS.textSecondary,
  },
  transcriptionContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginTop: SIZES.padding * -0.1,
    ...SHADOWS.small,
  },
  transcriptionTitle: {
    ...FONTS.h3,
    color: COLORS.text,
    marginBottom: SIZES.base,
  },
  transcriptionInput: {
    ...FONTS.body1,
    color: COLORS.text,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    minHeight: 150,
    maxHeight: 300,
    textAlignVertical: 'top',
    marginBottom: SIZES.padding,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SIZES.padding,
    marginTop: SIZES.padding,
  },
  button: {
    paddingVertical: SIZES.base,
    paddingHorizontal: SIZES.padding,
    borderRadius: SIZES.radius,
    ...SHADOWS.small,
  },
  discardButton: {
    backgroundColor: COLORS.surface,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    ...FONTS.body2,
    color: COLORS.textSecondary,
  },
  saveButtonText: {
    color: COLORS.white,
  },
  rawTranscriptionTitle: {
    ...FONTS.body2,
    color: COLORS.textSecondary,
    marginTop: SIZES.padding,
    marginBottom: SIZES.base,
  },
  rawTranscriptionText: {
    ...FONTS.body2,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  analysisContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginTop: SIZES.base,
    marginBottom: SIZES.padding,
    ...SHADOWS.medium,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.base,
  },
  analysisTitle: {
    ...FONTS.h3,
    color: COLORS.text,
    fontWeight: '600',
  },
  analysisDivider: {
    height: 1,
    backgroundColor: COLORS.primary + '20',
    marginVertical: SIZES.base,
  },
  analysisContent: {
    marginTop: SIZES.base,
  },
  analysisItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.base,
  },
  analysisItemBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.primary + '20',
    marginTop: SIZES.base,
    paddingTop: SIZES.padding,
  },
  analysisIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.padding,
  },
  analysisTextContainer: {
    flex: 1,
  },
  analysisLabel: {
    ...FONTS.body2,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  analysisValue: {
    ...FONTS.h3,
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  guideContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.padding * 1.5,
    marginTop: SIZES.padding,
    marginBottom: SIZES.padding * 2,
    ...SHADOWS.medium,
  },
  guideTitle: {
    ...FONTS.h2,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: SIZES.padding * 1.5,
    textAlign: 'center',
  },
  guideTipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.padding,
    backgroundColor: COLORS.background,
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    ...SHADOWS.small,
  },
  guideTipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.padding,
  },
  guideTipContent: {
    flex: 1,
  },
  guideTipTitle: {
    ...FONTS.h4,
    color: COLORS.text,
    marginBottom: 4,
    fontWeight: '600',
  },
  guideTipText: {
    ...FONTS.body2,
    color: COLORS.textSecondary,
  },
  tipContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginHorizontal: SIZES.padding,
    marginBottom: SIZES.padding * 3,
    ...SHADOWS.medium,
  },
  tipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 80,
  },
  tipIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.padding,
  },
  tipTextContainer: {
    flex: 1,
  },
  tipTitle: {
    ...FONTS.h3,
    color: COLORS.text,
    marginBottom: 4,
    fontWeight: '600',
  },
  tipText: {
    ...FONTS.body2,
    color: COLORS.textSecondary,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SIZES.padding,
    gap: SIZES.base,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary + '30',
  },
  activeDot: {
    backgroundColor: COLORS.primary,
    transform: [{ scale: 1.2 }],
  },
  guideHeaderContainer: {
    alignItems: 'center',
    marginBottom: SIZES.padding * 1.5,
    marginTop: SIZES.padding,
  },
  guideHeaderTitle: {
    ...FONTS.h2,
    color: COLORS.text,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  guideHeaderDivider: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.primary,
    marginVertical: SIZES.base,
  },
  guideHeaderSubtitle: {
    ...FONTS.body2,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
