import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';
import { useLocale } from './LocaleContext';
import { deleteProfileAvatarFile } from '../lib/avatarFiles';
import { createDefaultProgressForLanguage } from '../lib/defaultProgressLocale';
import { AVATAR_PRESET_IDS } from '../lib/avatarPresets';
import {
  digitsOnlyPin,
  hashParentPin,
  isValidStoredPinHash,
  MIN_PIN_LENGTH,
  pinsEqual,
} from '../lib/pinHash';
import { notifyParentEvent } from '../lib/notifyParent';

const STORAGE_KEY = '@ctm/persist/v1';
/** Isolated PIN hash so a race on the main JSON blob cannot drop the parent lock. */
const PARENT_PIN_HASH_STORAGE_KEY = '@ctm/parent-pin-hash/v1';
const DEFAULT_PROFILE_ID = 'default-profile-1';

function appSettingsFromParsed(parsed) {
  const p = parsed && typeof parsed === 'object' ? parsed : {};
  const onboardingComplete = Object.prototype.hasOwnProperty.call(p, 'onboardingComplete')
    ? Boolean(p.onboardingComplete)
    : true;
  const email = typeof p.parentEmail === 'string' ? p.parentEmail.trim().slice(0, 320) : '';
  const taskNotify = Boolean(p.emailNotifyTaskComplete);
  /** Older saves had no key; treat “task emails on” as wanting activity emails for rewards too. */
  const hasRewardKey = Object.prototype.hasOwnProperty.call(p, 'emailNotifyRewardRedeem');
  const rewardNotify = hasRewardKey ? Boolean(p.emailNotifyRewardRedeem) : taskNotify;
  return {
    onboardingComplete,
    parentEmail: email,
    emailNotifyTaskComplete: taskNotify,
    emailNotifyRewardRedeem: rewardNotify,
  };
}

/** Read canonical PIN hash from disk (isolated key first, then main JSON). Used for verify and hydrate. */
async function loadParentPinHashFromStorage() {
  try {
    const isolated = (await AsyncStorage.getItem(PARENT_PIN_HASH_STORAGE_KEY)) ?? '';
    const t = isolated.trim().toLowerCase();
    if (isValidStoredPinHash(t)) return t;
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      const h =
        parsed.parentPinHash == null ? null : String(parsed.parentPinHash).trim().toLowerCase();
      return isValidStoredPinHash(h ?? '') ? h : null;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

export const todayKey = () => new Date().toDateString();

function normalizeRecurrence(r) {
  if (r === 'daily' || r === 'weekdays' || r === 'weekend' || r === 'none') return r;
  return 'daily';
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeProfileEntry(p) {
  if (!p || !p.id || typeof p.name !== 'string') return null;
  const preset =
    p.avatarPreset != null &&
    typeof p.avatarPreset === 'string' &&
    AVATAR_PRESET_IDS.has(p.avatarPreset)
      ? p.avatarPreset
      : null;
  return {
    id: p.id,
    name: p.name,
    avatarPreset: preset,
    avatarUri: typeof p.avatarUri === 'string' ? p.avatarUri : null,
  };
}

function normalizePendingRewardRequests(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((x) => {
      if (!x || typeof x !== 'object') return null;
      if (typeof x.id !== 'string' || typeof x.rewardId !== 'string') return null;
      if (typeof x.title !== 'string') return null;
      return {
        id: x.id,
        rewardId: x.rewardId,
        title: x.title,
        starCost: Math.max(1, Number(x.starCost) || 1),
        requestedAtMs: Number.isFinite(x.requestedAtMs) ? x.requestedAtMs : Date.now(),
      };
    })
    .filter(Boolean);
}

const initialState = {
  profiles: [
    {
      id: DEFAULT_PROFILE_ID,
      name: '',
      avatarPreset: null,
      avatarUri: null,
    },
  ],
  activeProfileId: DEFAULT_PROFILE_ID,
  progressByProfile: {
    [DEFAULT_PROFILE_ID]: createDefaultProgressForLanguage('en'),
  },
  onboardingComplete: false,
  parentEmail: '',
  emailNotifyTaskComplete: false,
  emailNotifyRewardRedeem: false,
};

function mapActiveProfile(state, updater) {
  const id = state.activeProfileId;
  const current = state.progressByProfile[id];
  if (!current) return state;
  const next = updater(current);
  if (next === current) return state;
  return {
    ...state,
    progressByProfile: {
      ...state.progressByProfile,
      [id]: next,
    },
  };
}

/** Same trimmed title and normalized star reward as an existing template (optionally excluding one id). */
function isReusableDuplicate(templates, title, starsReward, excludeTemplateId = null) {
  const trimmed = typeof title === 'string' ? title.trim() : '';
  if (!trimmed) return false;
  const stars = Math.max(1, Number(starsReward) || 1);
  return templates.some((x) => {
    if (excludeTemplateId != null && x.id === excludeTemplateId) return false;
    return x.title.trim() === trimmed && Math.max(1, Number(x.starsReward) || 1) === stars;
  });
}

/** Same trimmed title and normalized stars as another active task (optionally excluding one task id). */
function isActiveTaskDuplicate(tasks, title, starsReward, excludeTaskId = null) {
  const trimmed = typeof title === 'string' ? title.trim() : '';
  if (!trimmed) return false;
  const stars = Math.max(1, Number(starsReward) || 1);
  return tasks.some((x) => {
    if (excludeTaskId != null && x.id === excludeTaskId) return false;
    return x.title.trim() === trimmed && Math.max(1, Number(x.starsReward) || 1) === stars;
  });
}

function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE': {
      const p = action.payload || {};
      if (p.profiles && p.activeProfileId && p.progressByProfile) {
        return {
          ...state,
          profiles: Array.isArray(p.profiles) && p.profiles.length ? p.profiles : state.profiles,
          activeProfileId: p.activeProfileId,
          progressByProfile:
            typeof p.progressByProfile === 'object' ? p.progressByProfile : state.progressByProfile,
          ...(p.onboardingComplete !== undefined ? { onboardingComplete: p.onboardingComplete } : {}),
          ...(p.parentEmail !== undefined ? { parentEmail: p.parentEmail } : {}),
          ...(p.emailNotifyTaskComplete !== undefined
            ? { emailNotifyTaskComplete: p.emailNotifyTaskComplete }
            : {}),
          ...(p.emailNotifyRewardRedeem !== undefined
            ? { emailNotifyRewardRedeem: p.emailNotifyRewardRedeem }
            : {}),
        };
      }
      return state;
    }
    case 'SELECT_PROFILE': {
      if (!state.profiles.some((x) => x.id === action.profileId)) return state;
      let { progressByProfile } = state;
      if (!progressByProfile[action.profileId]) {
        const lang = typeof action.seedLang === 'string' ? action.seedLang : 'en';
        progressByProfile = {
          ...state.progressByProfile,
          [action.profileId]: createDefaultProgressForLanguage(lang),
        };
      }
      return { ...state, activeProfileId: action.profileId, progressByProfile };
    }
    case 'PARENT_ADD_PROFILE': {
      const name = action.name?.trim();
      if (!name) return state;
      const newId = generateId();
      const lang = typeof action.seedLang === 'string' ? action.seedLang : 'en';
      return {
        ...state,
        profiles: [
          ...state.profiles,
          { id: newId, name, avatarPreset: null, avatarUri: null },
        ],
        progressByProfile: {
          ...state.progressByProfile,
          [newId]: createDefaultProgressForLanguage(lang),
        },
      };
    }
    case 'APPLY_ONBOARDING_LANGUAGE_DEFAULTS': {
      const lang = typeof action.lang === 'string' ? action.lang : 'en';
      const nextProgress = {};
      for (const p of state.profiles) {
        nextProgress[p.id] = createDefaultProgressForLanguage(lang);
      }
      return { ...state, progressByProfile: nextProgress };
    }
    case 'PARENT_REMOVE_PROFILE': {
      if (state.profiles.length <= 1) return state;
      const { profileId } = action;
      const nextProfiles = state.profiles.filter((p) => p.id !== profileId);
      if (nextProfiles.length === state.profiles.length) return state;
      const { [profileId]: _removed, ...restProgress } = state.progressByProfile;
      let nextActive = state.activeProfileId;
      if (nextActive === profileId) {
        nextActive = nextProfiles[0].id;
      }
      return {
        ...state,
        profiles: nextProfiles,
        activeProfileId: nextActive,
        progressByProfile: restProgress,
      };
    }
    case 'SET_PROFILE_NAME': {
      const { profileId, name } = action;
      const trimmed = typeof name === 'string' ? name.trim() : '';
      if (!trimmed || !state.profiles.some((p) => p.id === profileId)) return state;
      return {
        ...state,
        profiles: state.profiles.map((p) =>
          p.id === profileId ? { ...p, name: trimmed } : p
        ),
      };
    }
    case 'SET_PARENT_SETTINGS': {
      const next = { ...state };
      if (action.parentEmail !== undefined) {
        next.parentEmail =
          typeof action.parentEmail === 'string' ? action.parentEmail.trim().slice(0, 320) : '';
      }
      if (action.emailNotifyTaskComplete !== undefined) {
        next.emailNotifyTaskComplete = Boolean(action.emailNotifyTaskComplete);
      }
      if (action.emailNotifyRewardRedeem !== undefined) {
        next.emailNotifyRewardRedeem = Boolean(action.emailNotifyRewardRedeem);
      }
      if (action.onboardingComplete !== undefined) {
        next.onboardingComplete = Boolean(action.onboardingComplete);
      }
      return next;
    }
    case 'SET_PROFILE_AVATAR': {
      const { profileId, patch } = action;
      if (!patch || typeof patch !== 'object') return state;
      if (!state.profiles.some((p) => p.id === profileId)) return state;
      const next = { ...patch };
      if (
        next.avatarPreset != null &&
        (typeof next.avatarPreset !== 'string' || !AVATAR_PRESET_IDS.has(next.avatarPreset))
      ) {
        delete next.avatarPreset;
      }
      return {
        ...state,
        profiles: state.profiles.map((p) =>
          p.id === profileId ? { ...p, ...next } : p
        ),
      };
    }
    case 'COMPLETE_TASK': {
      const t = todayKey();
      return mapActiveProfile(state, (prog) => {
        const task = prog.tasks.find((x) => x.id === action.taskId);
        if (!task || task.lastCompletedDate === t) return prog;
        return {
          ...prog,
          stars: prog.stars + task.starsReward,
          tasks: prog.tasks.map((x) =>
            x.id === action.taskId
              ? { ...x, lastCompletedDate: t, completedAtMs: Date.now() }
              : x
          ),
        };
      });
    }
    case 'REDEEM_REWARD':
      return mapActiveProfile(state, (prog) => {
        const reward = prog.rewards.find((x) => x.id === action.rewardId);
        if (!reward || prog.stars < reward.starCost) return prog;
        return { ...prog, stars: prog.stars - reward.starCost };
      });
    case 'REQUEST_REWARD_APPROVAL':
      return mapActiveProfile(state, (prog) => {
        const reward = prog.rewards.find((x) => x.id === action.rewardId);
        if (!reward || prog.stars < reward.starCost) return prog;
        const pending = normalizePendingRewardRequests(prog.pendingRewardRequests);
        if (pending.some((x) => x.rewardId === action.rewardId)) return prog;
        return {
          ...prog,
          pendingRewardRequests: [
            ...pending,
            {
              id: generateId(),
              rewardId: reward.id,
              title: reward.title,
              starCost: reward.starCost,
              requestedAtMs: Date.now(),
            },
          ],
        };
      });
    case 'APPROVE_REWARD_REQUEST':
      return mapActiveProfile(state, (prog) => {
        const pending = normalizePendingRewardRequests(prog.pendingRewardRequests);
        const req = pending.find((x) => x.id === action.requestId);
        if (!req) return prog;
        if (prog.stars < req.starCost) return prog;
        return {
          ...prog,
          stars: prog.stars - req.starCost,
          pendingRewardRequests: pending.filter((x) => x.id !== action.requestId),
        };
      });
    case 'DECLINE_REWARD_REQUEST':
      return mapActiveProfile(state, (prog) => ({
        ...prog,
        pendingRewardRequests: normalizePendingRewardRequests(prog.pendingRewardRequests).filter(
          (x) => x.id !== action.requestId
        ),
      }));
    case 'PARENT_ADD_TASK':
      return mapActiveProfile(state, (prog) => ({
        ...prog,
        tasks: [
          ...prog.tasks,
          {
            id: generateId(),
            title: action.title.trim(),
            starsReward: Math.max(1, action.starsReward || 1),
            lastCompletedDate: null,
            recurrence: normalizeRecurrence(action.recurrence),
          },
        ],
      }));
    case 'PARENT_ADD_REWARD':
      return mapActiveProfile(state, (prog) => ({
        ...prog,
        rewards: [
          ...prog.rewards,
          {
            id: generateId(),
            title: action.title.trim(),
            starCost: Math.max(1, action.starCost || 1),
          },
        ],
      }));
    case 'PARENT_REMOVE_TASK':
      return mapActiveProfile(state, (prog) => ({
        ...prog,
        tasks: prog.tasks.filter((x) => x.id !== action.taskId),
      }));
    case 'PARENT_EDIT_TASK': {
      const title = action.title?.trim();
      if (!title) return state;
      const starsReward = Math.max(1, Number(action.starsReward) || 1);
      return mapActiveProfile(state, (prog) => {
        if (!prog.tasks.some((x) => x.id === action.taskId)) return prog;
        return {
          ...prog,
          tasks: prog.tasks.map((x) =>
            x.id === action.taskId
              ? {
                  ...x,
                  title,
                  starsReward,
                  recurrence: normalizeRecurrence(action.recurrence ?? x.recurrence),
                }
              : x
          ),
        };
      });
    }
    case 'PARENT_SAVE_REUSABLE_TASK': {
      if (!action.title?.trim()) return state;
      const title = action.title.trim();
      const starsReward = Math.max(1, action.starsReward || 1);
      return mapActiveProfile(state, (prog) => {
        if (isReusableDuplicate(prog.taskTemplates, title, starsReward)) return prog;
        return {
          ...prog,
          taskTemplates: [
            ...prog.taskTemplates,
            {
              id: generateId(),
              title,
              starsReward,
              recurrence: normalizeRecurrence(action.recurrence),
            },
          ],
        };
      });
    }
    case 'PARENT_TASK_TO_REUSABLE': {
      return mapActiveProfile(state, (prog) => {
        const src = prog.tasks.find((x) => x.id === action.taskId);
        if (!src) return prog;
        if (isReusableDuplicate(prog.taskTemplates, src.title, src.starsReward)) return prog;
        return {
          ...prog,
          taskTemplates: [
            ...prog.taskTemplates,
            {
              id: generateId(),
              title: src.title,
              starsReward: src.starsReward,
              recurrence: normalizeRecurrence(src.recurrence),
            },
          ],
        };
      });
    }
    case 'PARENT_REMOVE_REUSABLE_TASK':
      return mapActiveProfile(state, (prog) => ({
        ...prog,
        taskTemplates: prog.taskTemplates.filter((x) => x.id !== action.templateId),
      }));
    case 'PARENT_EDIT_REUSABLE_TASK': {
      const title = action.title?.trim();
      if (!title) return state;
      const starsReward = Math.max(1, Number(action.starsReward) || 1);
      return mapActiveProfile(state, (prog) => {
        if (!prog.taskTemplates.some((x) => x.id === action.templateId)) return prog;
        if (isReusableDuplicate(prog.taskTemplates, title, starsReward, action.templateId)) {
          return prog;
        }
        return {
          ...prog,
          taskTemplates: prog.taskTemplates.map((x) =>
            x.id === action.templateId
              ? {
                  ...x,
                  title,
                  starsReward,
                  recurrence: normalizeRecurrence(action.recurrence ?? x.recurrence),
                }
              : x
          ),
        };
      });
    }
    case 'PARENT_ADD_TASK_FROM_TEMPLATE': {
      return mapActiveProfile(state, (prog) => {
        const tpl = prog.taskTemplates.find((x) => x.id === action.templateId);
        if (!tpl) return prog;
        return {
          ...prog,
          tasks: [
            ...prog.tasks,
            {
              id: generateId(),
              title: tpl.title,
              starsReward: tpl.starsReward,
              lastCompletedDate: null,
              recurrence: normalizeRecurrence(tpl.recurrence),
            },
          ],
        };
      });
    }
    case 'PARENT_REMOVE_REWARD':
      return mapActiveProfile(state, (prog) => ({
        ...prog,
        rewards: prog.rewards.filter((x) => x.id !== action.rewardId),
        pendingRewardRequests: normalizePendingRewardRequests(prog.pendingRewardRequests).filter(
          (x) => x.rewardId !== action.rewardId
        ),
      }));
    case 'PARENT_RESET_STAR_PROGRESS': {
      const tk = todayKey();
      return mapActiveProfile(state, (prog) => ({
        ...prog,
        stars: 0,
        tasks: prog.tasks.map((x) =>
          x.lastCompletedDate === tk
            ? { ...x, lastCompletedDate: null, completedAtMs: null }
            : x
        ),
      }));
    }
    default:
      return state;
  }
}

const Ctx = createContext(null);

function normalizePersisted(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  if (
    Array.isArray(parsed.profiles) &&
    parsed.profiles.length > 0 &&
    typeof parsed.activeProfileId === 'string' &&
    parsed.progressByProfile &&
    typeof parsed.progressByProfile === 'object'
  ) {
    const onboardingSettings = appSettingsFromParsed(parsed);
    const profiles = parsed.profiles.map(normalizeProfileEntry).filter(Boolean);
    // Migration: old saves seeded onboarding with "Child"; keep first onboarding input empty.
    if (
      !onboardingSettings.onboardingComplete &&
      profiles.length === 1 &&
      profiles[0].id === DEFAULT_PROFILE_ID &&
      profiles[0].name.trim() === 'Child'
    ) {
      profiles[0] = { ...profiles[0], name: '' };
    }
    if (profiles.length === 0) return null;
    const progressByProfile = { ...parsed.progressByProfile };
    for (const p of profiles) {
      if (!progressByProfile[p.id]) {
        progressByProfile[p.id] = createDefaultProgressForLanguage('en');
      } else {
        const existing = progressByProfile[p.id];
        const nextTasks =
          existing?.tasks && Array.isArray(existing.tasks)
            ? existing.tasks.map((t) => ({
                ...t,
                recurrence: normalizeRecurrence(t?.recurrence),
              }))
            : existing?.tasks;
        const nextTemplates =
          existing?.taskTemplates && Array.isArray(existing.taskTemplates)
            ? existing.taskTemplates.map((tpl) => ({
                ...tpl,
                recurrence: normalizeRecurrence(tpl?.recurrence),
              }))
            : existing?.taskTemplates;
        progressByProfile[p.id] = {
          ...existing,
          tasks: nextTasks,
          taskTemplates: nextTemplates,
          pendingRewardRequests: normalizePendingRewardRequests(existing.pendingRewardRequests),
        };
      }
    }
    let activeProfileId = parsed.activeProfileId;
    if (!profiles.some((p) => p.id === activeProfileId)) {
      activeProfileId = profiles[0].id;
    }
    return {
      profiles,
      activeProfileId,
      progressByProfile,
      parentPinHash:
        parsed.parentPinHash == null
          ? null
          : String(parsed.parentPinHash).trim().toLowerCase(),
      ...onboardingSettings,
    };
  }
  const id = generateId();
  const seedEn = createDefaultProgressForLanguage('en');
  const legacyTasks = Array.isArray(parsed.tasks) ? parsed.tasks : seedEn.tasks;
  const legacyRewards = Array.isArray(parsed.rewards) ? parsed.rewards : seedEn.rewards;
  const legacyTemplates = Array.isArray(parsed.taskTemplates) ? parsed.taskTemplates : [];
  return {
    profiles: [normalizeProfileEntry({ id, name: '', avatarPreset: null, avatarUri: null })],
    activeProfileId: id,
    progressByProfile: {
      [id]: {
        stars: typeof parsed.stars === 'number' && parsed.stars >= 0 ? parsed.stars : 0,
        tasks: (legacyTasks ?? []).map((t) => ({
          ...t,
          recurrence: normalizeRecurrence(t?.recurrence),
        })),
        taskTemplates: legacyTemplates.map((tpl) => ({
          ...tpl,
          recurrence: normalizeRecurrence(tpl?.recurrence),
        })),
        rewards: legacyRewards,
        pendingRewardRequests: normalizePendingRewardRequests(parsed.pendingRewardRequests),
      },
    },
    parentPinHash:
      parsed.parentPinHash == null
        ? null
        : String(parsed.parentPinHash).trim().toLowerCase(),
    ...appSettingsFromParsed(parsed),
  };
}

export function TaskRewardsProvider({ children }) {
  const { language } = useLocale();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [parentPinHash, setParentPinHash] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  /** PIN gate must not rely on ParentScreen focus alone — tab switches often skip useFocusEffect cleanup. */
  const [parentAreaUnlocked, setParentAreaUnlocked] = useState(false);

  const unlockParentArea = useCallback(() => {
    setParentAreaUnlocked(true);
  }, []);

  const lockParentArea = useCallback(() => {
    setParentAreaUnlocked(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            const normalized = normalizePersisted(parsed);
            if (normalized) {
              dispatch({
                type: 'HYDRATE',
                payload: {
                  profiles: normalized.profiles,
                  activeProfileId: normalized.activeProfileId,
                  progressByProfile: normalized.progressByProfile,
                  onboardingComplete: normalized.onboardingComplete,
                  parentEmail: normalized.parentEmail,
                  emailNotifyTaskComplete: normalized.emailNotifyTaskComplete,
                  emailNotifyRewardRedeem: normalized.emailNotifyRewardRedeem,
                },
              });
            }
          } catch {
            /* ignore corrupt */
          }
        }
        const loadedHash = await loadParentPinHashFromStorage();
        if (!cancelled) setParentPinHash(loadedHash);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    void (async () => {
      let pinForBlob = parentPinHash;
      if (!isValidStoredPinHash(pinForBlob ?? '')) {
        const recovered = await loadParentPinHashFromStorage();
        if (!cancelled && isValidStoredPinHash(recovered ?? '')) {
          pinForBlob = recovered;
          setParentPinHash(recovered);
        }
      }
      if (cancelled) return;
      const payload = JSON.stringify({
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
        progressByProfile: state.progressByProfile,
        parentPinHash: isValidStoredPinHash(pinForBlob ?? '') ? pinForBlob : null,
        onboardingComplete: state.onboardingComplete,
        parentEmail: state.parentEmail,
        emailNotifyTaskComplete: state.emailNotifyTaskComplete,
        emailNotifyRewardRedeem: state.emailNotifyRewardRedeem,
      });
      await AsyncStorage.setItem(STORAGE_KEY, payload).catch(() => {});
    })();
    return () => {
      cancelled = true;
    };
  }, [
    hydrated,
    state.profiles,
    state.activeProfileId,
    state.progressByProfile,
    state.onboardingComplete,
    state.parentEmail,
    state.emailNotifyTaskComplete,
    state.emailNotifyRewardRedeem,
    parentPinHash,
  ]);

  useEffect(() => {
    if (!hydrated) return;
    if (isValidStoredPinHash(parentPinHash ?? '')) {
      AsyncStorage.setItem(PARENT_PIN_HASH_STORAGE_KEY, parentPinHash).catch(() => {});
    }
    /* Never remove isolated PIN when state is null — a brief desync would wipe a valid lock. */
  }, [hydrated, parentPinHash]);

  const activeProgress = useMemo(() => {
    const p = state.progressByProfile[state.activeProfileId];
    return p || createDefaultProgressForLanguage(language);
  }, [state.progressByProfile, state.activeProfileId, language]);

  const selectProfile = useCallback(
    (profileId) => {
      dispatch({ type: 'SELECT_PROFILE', profileId, seedLang: language });
    },
    [language]
  );

  const addProfile = useCallback(
    (name) => {
      dispatch({ type: 'PARENT_ADD_PROFILE', name, seedLang: language });
    },
    [language]
  );

  const applyOnboardingLanguageDefaults = useCallback((lang) => {
    dispatch({ type: 'APPLY_ONBOARDING_LANGUAGE_DEFAULTS', lang });
  }, []);

  const renameProfile = useCallback((profileId, name) => {
    dispatch({ type: 'SET_PROFILE_NAME', profileId, name });
  }, []);

  const setParentSettings = useCallback((patch) => {
    dispatch({ type: 'SET_PARENT_SETTINGS', ...patch });
  }, []);

  const completeOnboarding = useCallback(() => {
    dispatch({ type: 'SET_PARENT_SETTINGS', onboardingComplete: true });
  }, []);

  const removeProfile = useCallback((profileId) => {
    void deleteProfileAvatarFile(profileId);
    dispatch({ type: 'PARENT_REMOVE_PROFILE', profileId });
  }, []);

  const setProfileAvatar = useCallback((profileId, patch) => {
    dispatch({ type: 'SET_PROFILE_AVATAR', profileId, patch });
  }, []);

  const completeTask = useCallback(
    (taskId) => {
      const id = state.activeProfileId;
      const prog = state.progressByProfile[id];
      const task = prog?.tasks.find((x) => x.id === taskId);
      const tk = todayKey();
      if (!task || task.lastCompletedDate === tk) return;
      const dayOfWeek = new Date().getDay(); // 0=Sun ... 6=Sat
      const weekend = dayOfWeek === 0 || dayOfWeek === 6;
      const recurrence = task?.recurrence ?? 'daily';
      if (recurrence === 'none') {
        // One-time tasks disappear after completion.
        if (task.lastCompletedDate != null) return;
      } else {
        const scheduledToday =
          recurrence === 'daily' ||
          (recurrence === 'weekdays' && !weekend) ||
          (recurrence === 'weekend' && weekend);
        if (!scheduledToday) return;
      }
      const profile = state.profiles.find((p) => p.id === id);
      const totalAfter = (prog?.stars ?? 0) + (task.starsReward ?? 0);
      dispatch({ type: 'COMPLETE_TASK', taskId });
      void notifyParentEvent({
        kind: 'task_complete',
        to: state.parentEmail,
        notifyEnabled: state.emailNotifyTaskComplete,
        childName: profile?.name ?? '',
        taskTitle: task.title,
        starsEarned: task.starsReward,
        totalStars: totalAfter,
        locale: language,
      });
    },
    [
      state.activeProfileId,
      state.progressByProfile,
      state.profiles,
      state.parentEmail,
      state.emailNotifyTaskComplete,
      language,
    ]
  );

  const redeemReward = useCallback(
    (rewardId) => {
      const reward = activeProgress.rewards.find((x) => x.id === rewardId);
      if (!reward || activeProgress.stars < reward.starCost) return { ok: false };
      const profile = state.profiles.find((p) => p.id === state.activeProfileId);
      const totalAfter = activeProgress.stars - reward.starCost;
      void notifyParentEvent({
        kind: 'reward_redeem',
        to: state.parentEmail,
        notifyEnabled: state.emailNotifyRewardRedeem,
        childName: profile?.name ?? '',
        rewardTitle: reward.title,
        starCost: reward.starCost,
        totalStars: totalAfter,
        locale: language,
      });
      dispatch({ type: 'REDEEM_REWARD', rewardId });
      return {
        ok: true,
        title: reward.title,
        starCost: reward.starCost,
      };
    },
    [
      activeProgress.rewards,
      activeProgress.stars,
      state.activeProfileId,
      state.profiles,
      state.parentEmail,
      state.emailNotifyRewardRedeem,
      language,
    ]
  );

  const requestRewardApproval = useCallback(
    (rewardId) => {
      const reward = activeProgress.rewards.find((x) => x.id === rewardId);
      if (!reward) return { ok: false, error: 'missing' };
      if (activeProgress.stars < reward.starCost) return { ok: false, error: 'stars' };
      const pending = normalizePendingRewardRequests(activeProgress.pendingRewardRequests);
      if (pending.some((x) => x.rewardId === rewardId)) return { ok: false, error: 'duplicate' };
      dispatch({ type: 'REQUEST_REWARD_APPROVAL', rewardId });
      return { ok: true, title: reward.title };
    },
    [activeProgress.rewards, activeProgress.stars, activeProgress.pendingRewardRequests]
  );

  const approveRewardRequest = useCallback(
    (requestId) => {
      const pending = normalizePendingRewardRequests(activeProgress.pendingRewardRequests);
      const req = pending.find((x) => x.id === requestId);
      if (!req) return { ok: false, error: 'missing' };
      if (activeProgress.stars < req.starCost) return { ok: false, error: 'stars' };
      const profile = state.profiles.find((p) => p.id === state.activeProfileId);
      const totalAfter = activeProgress.stars - req.starCost;
      dispatch({ type: 'APPROVE_REWARD_REQUEST', requestId });
      void notifyParentEvent({
        kind: 'reward_redeem',
        to: state.parentEmail,
        notifyEnabled: state.emailNotifyRewardRedeem,
        childName: profile?.name ?? '',
        rewardTitle: req.title,
        starCost: req.starCost,
        totalStars: totalAfter,
        locale: language,
      });
      return { ok: true };
    },
    [
      activeProgress.pendingRewardRequests,
      activeProgress.stars,
      state.profiles,
      state.activeProfileId,
      state.parentEmail,
      state.emailNotifyRewardRedeem,
      language,
    ]
  );

  const declineRewardRequest = useCallback((requestId) => {
    dispatch({ type: 'DECLINE_REWARD_REQUEST', requestId });
    return { ok: true };
  }, []);

  const approveRewardRequestByRewardId = useCallback(
    (rewardId) => {
      const pending = normalizePendingRewardRequests(activeProgress.pendingRewardRequests);
      const req = pending.find((x) => x.rewardId === rewardId);
      if (!req) return { ok: false, error: 'missing' };
      return approveRewardRequest(req.id);
    },
    [activeProgress.pendingRewardRequests, approveRewardRequest]
  );

  const declineRewardRequestByRewardId = useCallback(
    (rewardId) => {
      const pending = normalizePendingRewardRequests(activeProgress.pendingRewardRequests);
      const req = pending.find((x) => x.rewardId === rewardId);
      if (!req) return { ok: false, error: 'missing' };
      return declineRewardRequest(req.id);
    },
    [activeProgress.pendingRewardRequests, declineRewardRequest]
  );

  const parentAddTask = useCallback(
    (title, starsReward, recurrence = 'daily') => {
      const t = title?.trim();
      if (!t) return { ok: false, error: 'empty' };
      const stars = Math.max(1, Number(starsReward) || 1);
      if (isActiveTaskDuplicate(activeProgress.tasks, t, stars)) {
        return { ok: false, error: 'duplicate' };
      }
      dispatch({
        type: 'PARENT_ADD_TASK',
        title,
        starsReward,
        recurrence: normalizeRecurrence(recurrence),
      });
      return { ok: true };
    },
    [activeProgress.tasks]
  );

  const parentAddReward = useCallback((title, starCost) => {
    if (!title?.trim()) return;
    dispatch({ type: 'PARENT_ADD_REWARD', title, starCost });
  }, []);

  const parentRemoveTask = useCallback((taskId) => {
    dispatch({ type: 'PARENT_REMOVE_TASK', taskId });
  }, []);

  const parentEditTask = useCallback(
    (taskId, title, starsReward, recurrence = 'daily') => {
      const t = title?.trim();
      if (!t) return { ok: false, error: 'empty' };
      const stars = Math.max(1, Number(starsReward) || 1);
      if (isActiveTaskDuplicate(activeProgress.tasks, t, stars, taskId)) {
        return { ok: false, error: 'duplicate' };
      }
      dispatch({
        type: 'PARENT_EDIT_TASK',
        taskId,
        title,
        starsReward,
        recurrence: normalizeRecurrence(recurrence),
      });
      return { ok: true };
    },
    [activeProgress.tasks]
  );

  const parentSaveReusableTask = useCallback(
    (title, starsReward, recurrence = 'daily') => {
      const t = title?.trim();
      if (!t) return { ok: false, error: 'empty' };
      const stars = Math.max(1, Number(starsReward) || 1);
      if (isReusableDuplicate(activeProgress.taskTemplates, t, stars)) {
        return { ok: false, error: 'duplicate' };
      }
      dispatch({
        type: 'PARENT_SAVE_REUSABLE_TASK',
        title,
        starsReward,
        recurrence: normalizeRecurrence(recurrence),
      });
      return { ok: true };
    },
    [activeProgress.taskTemplates]
  );

  const parentCopyTaskToReusable = useCallback(
    (taskId) => {
      const src = activeProgress.tasks.find((x) => x.id === taskId);
      if (!src) return { ok: false, error: 'missing' };
      if (isReusableDuplicate(activeProgress.taskTemplates, src.title, src.starsReward)) {
        return { ok: false, error: 'duplicate' };
      }
      dispatch({ type: 'PARENT_TASK_TO_REUSABLE', taskId });
      return { ok: true };
    },
    [activeProgress.tasks, activeProgress.taskTemplates]
  );

  const taskIsSavedAsReusable = useCallback(
    (taskId) => {
      const task = activeProgress.tasks.find((x) => x.id === taskId);
      if (!task) return false;
      return isReusableDuplicate(activeProgress.taskTemplates, task.title, task.starsReward);
    },
    [activeProgress.tasks, activeProgress.taskTemplates]
  );

  const parentRemoveReusableTask = useCallback((templateId) => {
    dispatch({ type: 'PARENT_REMOVE_REUSABLE_TASK', templateId });
  }, []);

  const parentEditReusableTask = useCallback(
    (templateId, title, starsReward, recurrence = 'daily') => {
      const t = title?.trim();
      if (!t) return { ok: false, error: 'empty' };
      const stars = Math.max(1, Number(starsReward) || 1);
      if (isReusableDuplicate(activeProgress.taskTemplates, t, stars, templateId)) {
        return { ok: false, error: 'duplicate' };
      }
      dispatch({
        type: 'PARENT_EDIT_REUSABLE_TASK',
        templateId,
        title,
        starsReward,
        recurrence: normalizeRecurrence(recurrence),
      });
      return { ok: true };
    },
    [activeProgress.taskTemplates]
  );

  const parentAddTaskFromTemplate = useCallback(
    (templateId) => {
      const tpl = activeProgress.taskTemplates.find((x) => x.id === templateId);
      if (!tpl) return { ok: false, error: 'missing' };
      if (isActiveTaskDuplicate(activeProgress.tasks, tpl.title, tpl.starsReward)) {
        return { ok: false, error: 'duplicate' };
      }
      dispatch({ type: 'PARENT_ADD_TASK_FROM_TEMPLATE', templateId });
      return { ok: true };
    },
    [activeProgress.tasks, activeProgress.taskTemplates]
  );

  const parentRemoveReward = useCallback((rewardId) => {
    dispatch({ type: 'PARENT_REMOVE_REWARD', rewardId });
  }, []);

  const parentResetStarProgress = useCallback(() => {
    dispatch({ type: 'PARENT_RESET_STAR_PROGRESS' });
  }, []);

  const setParentPin = useCallback(async (pin) => {
    const normalized = digitsOnlyPin(pin);
    if (normalized.length < MIN_PIN_LENGTH) return { ok: false, error: 'short' };
    const hash = await hashParentPin(normalized);
    setParentPinHash(hash);
    await AsyncStorage.setItem(PARENT_PIN_HASH_STORAGE_KEY, hash).catch(() => {});
    return { ok: true };
  }, []);

  const verifyParentPin = useCallback(async (pin) => {
    const stored = await loadParentPinHashFromStorage();
    const normalized = digitsOnlyPin(pin);
    if (normalized.length < MIN_PIN_LENGTH) return false;
    if (!stored) return false;
    return pinsEqual(normalized, stored);
  }, []);

  const changeParentPin = useCallback(async (currentPin, nextPin) => {
    const stored = await loadParentPinHashFromStorage();
    if (!stored) return { ok: false, error: 'no_pin' };
    const cur = digitsOnlyPin(currentPin);
    if (cur.length < MIN_PIN_LENGTH) return { ok: false, error: 'wrong' };
    if (!(await pinsEqual(cur, stored))) return { ok: false, error: 'wrong' };
    const nextNorm = digitsOnlyPin(nextPin);
    if (nextNorm.length < MIN_PIN_LENGTH) return { ok: false, error: 'short' };
    const hash = await hashParentPin(nextNorm);
    setParentPinHash(hash);
    await AsyncStorage.setItem(PARENT_PIN_HASH_STORAGE_KEY, hash).catch(() => {});
    return { ok: true };
  }, []);

  /**
   * Single path for parent lock screen: create vs enter follows disk, not React state.
   * When a PIN exists on disk we only verify enterPin — never hidden create-field state,
   * or a wrong code in the visible field could still unlock if createPin held a stale match.
   */
  const attemptParentUnlock = useCallback(
    async ({ createPin, createPinConfirm, enterPin }) => {
      const stored = await loadParentPinHashFromStorage();
      if (!stored) {
        const a = digitsOnlyPin(createPin);
        const b = digitsOnlyPin(createPinConfirm);
        if (a.length < MIN_PIN_LENGTH) return { ok: false, error: 'short' };
        if (a !== b) return { ok: false, error: 'mismatch' };
        const hash = await hashParentPin(a);
        setParentPinHash(hash);
        await AsyncStorage.setItem(PARENT_PIN_HASH_STORAGE_KEY, hash).catch(() => {});
        return { ok: true };
      }
      const e = digitsOnlyPin(enterPin);
      if (e.length < MIN_PIN_LENGTH) return { ok: false, error: 'short' };
      const ok = await pinsEqual(e, stored);
      if (!ok) return { ok: false, error: 'wrong' };
      setParentPinHash(stored);
      return { ok: true };
    },
    []
  );

  const syncParentPinFromStorage = useCallback(async () => {
    try {
      const h = await loadParentPinHashFromStorage();
      setParentPinHash(h);
    } catch {
      /* keep in-memory hash; avoid clearing lock on transient storage errors */
    }
  }, []);

  const hasParentPin = isValidStoredPinHash(parentPinHash ?? '');

  const value = useMemo(
    () => ({
      profiles: state.profiles,
      activeProfileId: state.activeProfileId,
      activeProfile: state.profiles.find((p) => p.id === state.activeProfileId),
      stars: activeProgress.stars,
      tasks: activeProgress.tasks,
      rewards: activeProgress.rewards,
      pendingRewardRequests: normalizePendingRewardRequests(activeProgress.pendingRewardRequests),
      hydrated,
      hasParentPin,
      onboardingComplete: state.onboardingComplete,
      parentEmail: state.parentEmail,
      emailNotifyTaskComplete: state.emailNotifyTaskComplete,
      emailNotifyRewardRedeem: state.emailNotifyRewardRedeem,
      setParentPin,
      verifyParentPin,
      attemptParentUnlock,
      syncParentPinFromStorage,
      changeParentPin,
      selectProfile,
      addProfile,
      renameProfile,
      setParentSettings,
      completeOnboarding,
      applyOnboardingLanguageDefaults,
      removeProfile,
      setProfileAvatar,
      completeTask,
      redeemReward,
      requestRewardApproval,
      approveRewardRequest,
      declineRewardRequest,
      approveRewardRequestByRewardId,
      declineRewardRequestByRewardId,
      parentAddTask,
      parentAddReward,
      parentRemoveTask,
      parentEditTask,
      parentRemoveReward,
      parentResetStarProgress,
      parentAreaUnlocked,
      unlockParentArea,
      lockParentArea,
    }),
    [
      state.profiles,
      state.activeProfileId,
      state.onboardingComplete,
      state.parentEmail,
      state.emailNotifyTaskComplete,
      state.emailNotifyRewardRedeem,
      activeProgress,
      hydrated,
      hasParentPin,
      setParentPin,
      verifyParentPin,
      attemptParentUnlock,
      syncParentPinFromStorage,
      changeParentPin,
      parentAreaUnlocked,
      unlockParentArea,
      lockParentArea,
      selectProfile,
      addProfile,
      renameProfile,
      setParentSettings,
      completeOnboarding,
      applyOnboardingLanguageDefaults,
      removeProfile,
      setProfileAvatar,
      completeTask,
      redeemReward,
      requestRewardApproval,
      approveRewardRequest,
      declineRewardRequest,
      approveRewardRequestByRewardId,
      declineRewardRequestByRewardId,
      parentAddTask,
      parentAddReward,
      parentRemoveTask,
      parentEditTask,
      parentRemoveReward,
      parentResetStarProgress,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTaskRewards() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTaskRewards must be used within TaskRewardsProvider');
  return v;
}
