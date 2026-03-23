import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassButton } from '../components/GlassButton';
import { RewardCelebrationModal } from '../components/RewardCelebrationModal';
import { useLocale } from '../context/LocaleContext';
import { useTheme } from '../context/ThemeContext';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { useTaskRewards } from '../context/TaskRewardsContext';
import { createHomeStyles } from './homeScreenStyles';

export default function RewardShopScreen() {
  const { tx } = useLocale();
  const { colors, ready: themeReady } = useTheme();
  const styles = useMemo(() => createHomeStyles(colors), [colors]);
  const { stars, rewards, redeemReward, hydrated, activeProfile } = useTaskRewards();
  const [celebration, setCelebration] = useState(null);

  if (!hydrated || !themeReady) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{tx('common.loading')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.shopScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.shopStarsBanner}>
          {activeProfile ? (
            <ProfileAvatar profile={activeProfile} size={58} colors={colors} />
          ) : (
            <Ionicons name="star" size={44} color={colors.starGold} />
          )}
          <View style={styles.shopStarsTextCol}>
            <Text style={styles.shopStarsLabel}>{tx('home.yourStars')}</Text>
            <Text style={styles.shopStarsValue}>{stars}</Text>
            {activeProfile?.name ? (
              <Text style={styles.shopStarsForName} numberOfLines={1}>
                {activeProfile.name}
              </Text>
            ) : null}
          </View>
        </View>

        <Text style={styles.sectionSub}>{tx('shop.sub')}</Text>

        {rewards.length === 0 ? (
          <Text style={styles.empty}>{tx('shop.empty')}</Text>
        ) : (
          rewards.map((reward) => {
            const canBuy = stars >= reward.starCost;
            return (
              <View key={reward.id} style={styles.rewardCard}>
                <View style={styles.rewardInfo}>
                  <Text style={styles.rewardTitle}>{reward.title}</Text>
                  <View style={styles.costRow}>
                    <Ionicons name="star" size={16} color={colors.starGold} />
                    <Text style={styles.costText}>
                      {tx('shop.costStars', { n: reward.starCost })}
                    </Text>
                  </View>
                </View>
                <GlassButton
                  variant="primary"
                  size="default"
                  fullWidth={false}
                  disabled={!canBuy}
                  onPress={() => {
                    if (!canBuy) return;
                    const res = redeemReward(reward.id);
                    if (res?.ok) {
                      setCelebration({ title: res.title, starCost: res.starCost });
                    }
                  }}
                  accessibilityState={{ disabled: !canBuy }}
                  accessibilityLabel={tx('shop.buyA11y', {
                    title: reward.title,
                    cost: reward.starCost,
                  })}
                >
                  {canBuy ? tx('shop.getIt') : tx('shop.notYet')}
                </GlassButton>
              </View>
            );
          })
        )}
      </ScrollView>
      <RewardCelebrationModal
        visible={Boolean(celebration)}
        rewardTitle={celebration?.title ?? ''}
        starCost={celebration?.starCost ?? 0}
        onClose={() => setCelebration(null)}
      />
    </SafeAreaView>
  );
}
