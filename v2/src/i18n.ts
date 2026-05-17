import { writable, derived } from 'svelte/store';

export const locales = {
  en: {
    open: 'Open',
    save: 'Save',
    edit: 'Edit',
    view: 'View',
    untitled: 'Markpad Native - Untitled',
    invalid_json: 'Invalid JSON document'
  },
  ru: {
    open: 'Открыть',
    save: 'Сохранить',
    edit: 'Правка',
    view: 'Просмотр',
    untitled: 'Markpad Native - Без имени',
    invalid_json: 'Неверный формат JSON'
  },
  uz: {
    open: 'Ochish',
    save: 'Saqlash',
    edit: 'Tahrir',
    view: 'Ko\'rish',
    untitled: 'Markpad Native - Nomsiz',
    invalid_json: 'Yaroqsiz JSON hujjati'
  }
};

export type LocaleKey = keyof typeof locales;

// Read initial from localstorage
const initialLocale = (localStorage.getItem('markpad-locale') as LocaleKey) || 'en';

export const currentLocale = writable<LocaleKey>(locales[initialLocale] ? initialLocale : 'en');

currentLocale.subscribe((val) => {
  localStorage.setItem('markpad-locale', val);
});

export const t = derived(currentLocale, ($locale) => {
  return (key: keyof typeof locales['en']) => {
    return locales[$locale][key] || locales['en'][key];
  };
});
