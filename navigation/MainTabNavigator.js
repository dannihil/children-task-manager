import { Ionicons } from '@expo/vector-icons';
import { BottomTabBar, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocale } from '../context/LocaleContext';
import { useTaskRewards } from '../context/TaskRewardsContext';
import { useTheme } from '../context/ThemeContext';
import HomeScreen from '../screens/HomeScreen';
import ParentScreen from '../screens/ParentScreen';
import RewardShopScreen from '../screens/RewardShopScreen';

const Tab = createBottomTabNavigator();

/** Locks parent gate whenever the focused tab is not Parent (authoritative tab state). */
function TabBarWithParentLock(props) {
  const { lockParentArea } = useTaskRewards();
  const routeName = props.state.routes[props.state.index]?.name;

  useEffect(() => {
    if (routeName !== 'Parent') {
      lockParentArea();
    }
  }, [routeName, lockParentArea]);

  return <BottomTabBar {...props} />;
}

export default function MainTabNavigator() {
  const { colors } = useTheme();
  const { tx } = useLocale();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { lockParentArea } = useTaskRewards();

  /** Leaving MainTabs (e.g. Switch Profile) must lock even if Parent tab stays selected in memory. */
  useEffect(() => {
    const unsub = navigation.addListener('blur', () => {
      lockParentArea();
    });
    return unsub;
  }, [navigation, lockParentArea]);

  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textSecondary,
      tabBarStyle: {
        backgroundColor: colors.surface,
        borderTopWidth: 0,
        paddingTop: 6,
        paddingBottom: Math.max(insets.bottom, 10),
        height: 58 + Math.max(insets.bottom, 10),
        shadowColor: colors.cardShadow,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 16,
      },
      tabBarLabelStyle: {
        fontWeight: '800',
        fontSize: 12,
        marginBottom: 2,
      },
      tabBarIconStyle: { marginTop: 2 },
      tabBarHideOnKeyboard: true,
    }),
    [colors, insets.bottom]
  );

  return (
    <Tab.Navigator screenOptions={screenOptions} tabBar={(props) => <TabBarWithParentLock {...props} />}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: tx('tabs.home'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size + 4} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="RewardShop"
        component={RewardShopScreen}
        options={{
          tabBarLabel: tx('tabs.shop'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="gift" size={size + 4} color={color} />
          ),
          headerShown: true,
          title: tx('shop.title'),
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          headerTitleStyle: { fontWeight: '800', fontSize: 19, color: colors.text },
          headerShadowVisible: false,
        }}
      />
      <Tab.Screen
        name="Parent"
        component={ParentScreen}
        options={{
          tabBarLabel: tx('tabs.parent'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size + 2} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
