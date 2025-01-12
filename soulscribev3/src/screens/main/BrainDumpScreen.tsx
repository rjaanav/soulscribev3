import React, { useState, useEffect } from 'react';
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
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection } from 'firebase/firestore';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';
import { auth, db } from '../../services/firebase';

export default function BrainDumpScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rawTranscription, setRawTranscription] = useState('');

  // Replace with your API Keys
  const DEEPGRAM_API_KEY = '1a0a4ab31b59c23961ad2f6054994805631bcdf9';
  const OPENAI_API_KEY = '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';

  // Cleanup the recorder when component unmounts
  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, [recording]);

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
          content: "You are a professional journal editor. Your task is to:\n1. Fix any grammatical errors\n2. Remove unnecessary words\n3. Structure the text into a proper journal entry\n4. Make it look professional\nMaintain the original meaning and personal tone of the journal entry."
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

      return data.choices[0].message.content;
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
        createdAt: new Date().toISOString(),
      });

      Alert.alert('Success', 'Journal entry saved successfully');
      setTranscription('');
    } catch (err) {
      Alert.alert('Error', 'Failed to save journal entry');
      console.error(err);
    }
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.container}>
          <ScrollView style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Brain Dump</Text>
              <Text style={styles.subtitle}>Record your thoughts</Text>
            </View>

            <View style={styles.recordingContainer}>
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
              <Text style={styles.recordingText}>
                {isRecording ? 'Tap to stop' : 'Tap to record'}
              </Text>
            </View>

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
          </ScrollView>
        </SafeAreaView>
      </TouchableWithoutFeedback>
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
    paddingVertical: SIZES.padding,
  },
  header: {
    marginBottom: SIZES.padding * 2,
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
    marginVertical: SIZES.padding * 2,
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
    marginTop: SIZES.padding,
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
});
