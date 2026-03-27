import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProfileAvatar } from "../components/ProfileAvatar";
import { useLocale } from "../context/LocaleContext";
import { useTheme } from "../context/ThemeContext";
import { useTaskRewards, todayKey } from "../context/TaskRewardsContext";
import { navigate as navigateRoot } from "../navigation/navigationRef";
import { createHomeStyles } from "./homeScreenStyles";

export default function HomeScreen({ navigation }) {
  const { tx, ready: localeReady } = useLocale();
  const { colors, ready: themeReady } = useTheme();
  const styles = useMemo(() => createHomeStyles(colors), [colors]);
  const {
    profiles,
    activeProfile,
    stars,
    tasks,
    rewards,
    hydrated,
    completeTask,
  } = useTaskRewards();

  const dayKey = todayKey();
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun ... 6=Sat
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const COMPLETED_VISIBLE = 3;

  const { activeTasks, completedToday, completedTodayTotal, scheduledTodayCount } =
    useMemo(() => {
    const active = [];
    const done = [];
    for (const task of tasks) {
      const recurrence = task?.recurrence ?? 'daily';
      const scheduledToday =
        recurrence === 'none'
          ? task.lastCompletedDate == null || task.lastCompletedDate === dayKey
          : recurrence === 'daily' ||
            (recurrence === 'weekdays' && !isWeekend) ||
            (recurrence === 'weekend' && isWeekend);

      if (!scheduledToday) continue;

      if (task.lastCompletedDate === dayKey) done.push(task);
      else active.push(task);
    }
    done.sort((a, b) => (b.completedAtMs ?? 0) - (a.completedAtMs ?? 0));
    const total = done.length;
    return {
      activeTasks: active,
      completedToday: done.slice(0, COMPLETED_VISIBLE),
      completedTodayTotal: total,
      scheduledTodayCount: active.length + done.length,
    };
  }, [tasks, dayKey, isWeekend]);

  const nextReward = useMemo(() => {
    const affordable = rewards.filter((r) => r.starCost <= stars);
    const cheapest = rewards.reduce(
      (best, r) => (r.starCost < best.starCost ? r : best),
      rewards[0] || { starCost: Infinity },
    );
    if (rewards.length === 0) return null;
    if (affordable.length > 0) {
      return { kind: "ready", text: tx("reward.pickBelow") };
    }
    const need = cheapest.starCost - stars;
    const saveKey =
      need === 1 ? "reward.saveMore_one" : "reward.saveMore_other";
    return {
      kind: "save",
      text: tx(saveKey, { need, title: cheapest.title }),
    };
  }, [rewards, stars, tx]);

  const openSwitchProfile = () => {
    const root = navigation.getParent()?.getParent();
    if (root?.navigate) {
      root.navigate("SwitchProfile");
    } else {
      navigateRoot("SwitchProfile");
    }
  };

  if (!hydrated || !localeReady || !themeReady) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{tx("common.loading")}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={({ pressed }) => [
            styles.profileEntryCard,
            pressed && styles.profileEntryCardPressed,
          ]}
          onPress={openSwitchProfile}
          accessibilityRole="button"
          accessibilityLabel={tx("home.openSwitchProfileA11y")}
        >
          <ProfileAvatar
            profile={activeProfile || profiles[0]}
            size={62}
            colors={colors}
          />
          <View style={styles.profileEntryTextCol}>
            <Text style={styles.whosPlayingLabel}>
              {tx("home.whosPlaying")}
            </Text>
            <Text style={styles.profileEntryName} numberOfLines={1}>
              {(activeProfile || profiles[0])?.name}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={26} color={colors.primary} />
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.kicker}>{tx("home.yourStars")}</Text>
          <View style={styles.starHero}>
            <Ionicons name="star" size={54} color={colors.starGold} />
            <Text
              style={styles.starCount}
              accessibilityLabel={tx("home.starsA11y", { count: stars })}
            >
              {stars}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.subSectionHeading}>{tx("tasks.tabTodo")}</Text>
          {activeTasks.length === 0 ? (
            <Text style={styles.empty}>
              {tasks.length === 0
                ? tx("tasks.emptyNoTasks")
                : scheduledTodayCount === 0
                  ? tx("tasks.emptyNoneScheduled")
                  : tx("tasks.emptyAllDone")}
            </Text>
          ) : (
            activeTasks.map((task) => (
              <Pressable
                key={task.id}
                onPress={() => completeTask(task.id)}
                style={({ pressed }) => [
                  styles.taskCard,
                  pressed && styles.taskCardPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={tx("tasks.a11yWhenDone", {
                  title: task.title,
                  stars: task.starsReward,
                })}
              >
                <View style={styles.taskRow}>
                  <Ionicons
                    name="sparkles-outline"
                    size={32}
                    color={colors.taskIcon}
                  />
                  <Text style={styles.taskTitle}>{task.title}</Text>
                </View>
                <View style={styles.taskMeta}>
                  <View style={styles.starPill}>
                    <Ionicons
                      name="star"
                      size={16}
                      color={colors.starGoldDark}
                    />
                    <Text style={styles.starPillText}>+{task.starsReward}</Text>
                  </View>
                </View>
              </Pressable>
            ))
          )}
          <Text style={styles.sectionSub}>{tx("tasks.activeSub")}</Text>

          <Text
            style={[styles.subSectionHeading, styles.subSectionHeadingSpaced]}
          >
            {tx("tasks.tabCompleted")}
          </Text>
          {completedTodayTotal === 0 ? (
            <Text style={styles.empty}>{tx("tasks.emptyCompleted")}</Text>
          ) : (
            <>
              {completedTodayTotal > COMPLETED_VISIBLE ? (
                <Text style={styles.completedLimitNote}>
                  {tx("tasks.completedLimited", { total: completedTodayTotal })}
                </Text>
              ) : null}
              {completedToday.map((task) => (
                <View
                  key={task.id}
                  style={styles.completedCard}
                  accessibilityLabel={tx("tasks.a11yEarned", {
                    title: task.title,
                    stars: task.starsReward,
                  })}
                >
                  <View style={styles.completedIconWrap}>
                    <Ionicons
                      name="checkmark-circle"
                      size={38}
                      color={colors.success}
                    />
                  </View>
                  <View style={styles.completedBody}>
                    <Text style={styles.completedTitle}>{task.title}</Text>
                    <View style={styles.earnedRow}>
                      <Ionicons name="star" size={20} color={colors.starGold} />
                      <Text style={styles.earnedText}>
                        {tx(
                          task.starsReward === 1
                            ? "tasks.earned_one"
                            : "tasks.earned_other",
                          { count: task.starsReward },
                        )}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
