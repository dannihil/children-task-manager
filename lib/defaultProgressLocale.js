import de from '../locales/de.json';
import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import is from '../locales/is.json';
import pl from '../locales/pl.json';
import pt from '../locales/pt.json';

const DICTS = { en, is, es, de, fr, pt, pl };

const SUPPORTED = new Set(Object.keys(DICTS));

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Starter tasks & rewards for a profile, using locale JSON `defaultProgress` entries.
 */
export function createDefaultProgressForLanguage(langCode) {
  const code = SUPPORTED.has(langCode) ? langCode : 'en';
  const dict = DICTS[code];
  const src = dict?.defaultProgress ?? DICTS.en.defaultProgress;
  const tasks = (src?.tasks ?? []).map((t) => ({
    id: generateId(),
    title: typeof t.title === 'string' ? t.title : '',
    starsReward: Math.max(1, Number(t.starsReward) || 1),
    lastCompletedDate: null,
  }));
  const rewards = (src?.rewards ?? []).map((r) => ({
    id: generateId(),
    title: typeof r.title === 'string' ? r.title : '',
    starCost: Math.max(1, Number(r.starCost) || 1),
  }));
  return {
    stars: 0,
    tasks,
    taskTemplates: [],
    rewards,
  };
}
