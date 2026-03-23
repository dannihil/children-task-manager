import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassButton } from '../components/GlassButton';
import { useLocale } from '../context/LocaleContext';
import { useTheme } from '../context/ThemeContext';
import { useTaskRewards } from '../context/TaskRewardsContext';
import { markIntroSeen } from '../lib/introStorage';
import { createIntroStyles } from './introScreenStyles';

const SLIDE_IMAGES = [
  require('../assets/intro/slide0.png'),
  require('../assets/intro/slide1.png'),
  require('../assets/intro/slide2.png'),
];

export default function IntroScreen({ navigation }) {
  const { tx, ready: localeReady } = useLocale();
  const { colors, ready: themeReady } = useTheme();
  const { onboardingComplete } = useTaskRewards();
  const styles = useMemo(() => createIntroStyles(colors), [colors]);
  const [index, setIndex] = useState(0);

  const finish = async () => {
    await markIntroSeen();
    const next = onboardingComplete ? 'SwitchProfile' : 'OnboardingLanguage';
    navigation.reset({ index: 0, routes: [{ name: next }] });
  };

  const goNext = () => {
    if (index < SLIDE_IMAGES.length - 1) setIndex((i) => i + 1);
    else void finish();
  };

  if (!localeReady || !themeReady) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.safePad}>
        <View style={styles.skipWrap}>
          <Pressable onPress={() => void finish()} hitSlop={12} accessibilityRole="button">
            <Text style={styles.skipText}>{tx('intro.skip')}</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.slideScroll}
          contentContainerStyle={styles.slideScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.slide} key={index}>
            <Text style={styles.title}>{tx(`intro.slide${index}Title`)}</Text>
            <View style={styles.screenshotFrame}>
              <Image
                source={SLIDE_IMAGES[index]}
                style={styles.screenshotImage}
                resizeMode="contain"
                accessible
                accessibilityLabel={tx('intro.screenshotA11y', {
                  title: tx(`intro.slide${index}Title`),
                })}
              />
            </View>
            <Text style={styles.body}>{tx(`intro.slide${index}Body`)}</Text>
          </View>
        </ScrollView>

        <View style={styles.dots}>
          {SLIDE_IMAGES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.footer}>
          <GlassButton
            variant="primary"
            size="intro"
            onPress={goNext}
            accessibilityLabel={
              index < SLIDE_IMAGES.length - 1 ? tx('intro.next') : tx('intro.getStarted')
            }
          >
            {index < SLIDE_IMAGES.length - 1 ? tx('intro.next') : tx('intro.getStarted')}
          </GlassButton>
        </View>
      </View>
    </SafeAreaView>
  );
}
