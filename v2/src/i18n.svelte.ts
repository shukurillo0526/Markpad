// Markpad Native — Internationalization Module (Svelte 5 Runes)

const locales = {
  en: {
    open: 'Open',
    save: 'Save',
    save_as: 'Save As',
    export: 'Export..',
    recents: 'Recents',
    find: 'Find',
    format: 'Format',
    legal: 'Vodiy Legal',
    edit: 'Edit',
    view: 'View',
    untitled: 'Markpad Native — Untitled',
    untitled_doc: 'Untitled',
    invalid_json: 'Invalid JSON document',
    error_open: 'Failed to open file',
    error_save: 'Failed to save file',
    saved: 'File saved',
    file_too_large: 'File is too large to open',
    binary_file: 'Cannot open binary files',
    unsaved: 'Unsaved',
    saved_state: 'Saved',
    ln: 'Ln',
    col: 'Col',
    selected: 'selected',
    words: 'words',
    chars: 'chars',
    wrap: 'Wrap',
    on: 'On',
    off: 'Off',
    plain_text: 'Plain text',
    export_title: 'Export & Print Engine',
    export_pdf_title: 'Export / Print as PDF',
    export_pdf_desc: 'Generate a clean styled PDF document via native print engine.',
    export_html_title: 'Export as Standalone HTML',
    export_html_desc: 'Save complete self-contained HTML document with embedded CSS.',
    export_html_copy_title: 'Copy Formatted HTML to Clipboard',
    export_html_copy_desc: 'Copy styled HTML for pasting into emails, Word, or Google Docs.',
    export_text_copy_title: 'Copy Plain Text to Clipboard',
    export_text_copy_desc: 'Copy raw document content to system clipboard.',
    recent_title: 'Recent Files',
    recent_empty: 'No recent files opened yet.',
    legal_title: 'Markpad Native — Legal & Publisher Information',
    legal_app_name: 'App Name:',
    legal_publisher: 'Publisher:',
    legal_author: 'Author:',
    legal_license: 'License:',
    legal_arch: 'Architecture:',
    legal_desc: 'Markpad Native is an open-source high-performance text and code utility published permanently under the name Vodiy.',
  },
  ru: {
    open: 'Открыть',
    save: 'Сохранить',
    save_as: 'Сохранить как',
    export: 'Экспорт..',
    recents: 'Недавние',
    find: 'Найти',
    format: 'Формат',
    legal: 'О Vodiy',
    edit: 'Правка',
    view: 'Просмотр',
    untitled: 'Markpad Native — Без имени',
    untitled_doc: 'Без имени',
    invalid_json: 'Неверный формат JSON',
    error_open: 'Не удалось открыть файл',
    error_save: 'Не удалось сохранить файл',
    saved: 'Файл сохранён',
    file_too_large: 'Файл слишком большой',
    binary_file: 'Невозможно открыть бинарный файл',
    unsaved: 'Не сохранено',
    saved_state: 'Сохранено',
    ln: 'Стр',
    col: 'Стлб',
    selected: 'выделено',
    words: 'слов',
    chars: 'символов',
    wrap: 'Перенос',
    on: 'Вкл',
    off: 'Выкл',
    plain_text: 'Обычный текст',
    export_title: 'Движок Экспорта и Печати',
    export_pdf_title: 'Экспорт / Печать в PDF',
    export_pdf_desc: 'Создать чистый PDF документ через встроенный движок печати.',
    export_html_title: 'Экспорт в автономный HTML',
    export_html_desc: 'Сохранить полноценный HTML документ со встроенным CSS.',
    export_html_copy_title: 'Копировать форматированный HTML в буфер',
    export_html_copy_desc: 'Скопировать HTML со стилями для вставки в письма, Word или Google Docs.',
    export_text_copy_title: 'Копировать простой текст в буфер',
    export_text_copy_desc: 'Скопировать содержимое документа без форматирования.',
    recent_title: 'Недавние файлы',
    recent_empty: 'Нет недавно открытых файлов.',
    legal_title: 'Markpad Native — Правовая информация',
    legal_app_name: 'Имя приложения:',
    legal_publisher: 'Издатель:',
    legal_author: 'Автор:',
    legal_license: 'Лицензия:',
    legal_arch: 'Архитектура:',
    legal_desc: 'Markpad Native — это высокопроизводительная утилита для текста и кода с открытым исходным кодом, опубликованная под именем Vodiy.',
  },
  uz: {
    open: 'Ochish',
    save: 'Saqlash',
    save_as: 'Boshqa nom bilan saqlash',
    export: 'Eksport..',
    recents: "So'nggi",
    find: 'Qidirish',
    format: 'Formatlash',
    legal: 'Vodiy haqida',
    edit: 'Tahrir',
    view: "Ko'rish",
    untitled: 'Markpad Native — Nomsiz',
    untitled_doc: 'Nomsiz',
    invalid_json: 'Yaroqsiz JSON hujjati',
    error_open: "Faylni ochib bo'lmadi",
    error_save: "Faylni saqlab bo'lmadi",
    saved: 'Fayl saqlandi',
    file_too_large: 'Fayl juda katta',
    binary_file: "Ikkilik faylni ochib bo'lmaydi",
    unsaved: 'Saqlanmagan',
    saved_state: 'Saqlangan',
    ln: 'Qat',
    col: 'Ust',
    selected: 'tanlangan',
    words: "so'z",
    chars: 'belgi',
    wrap: "O'rash",
    on: 'Yoniq',
    off: "O'chiq",
    plain_text: 'Oddiy matn',
    export_title: 'Eksport va Chop etish',
    export_pdf_title: 'PDF formatida eksport / chop etish',
    export_pdf_desc: "Mahalliy chop etish tizimi orqali toza uslubdagi PDF hujjat yaratish.",
    export_html_title: 'Mustaqil HTML sifatida eksport qilish',
    export_html_desc: "O'rnatilgan CSS bilan to'liq mustaqil HTML hujjatni saqlash.",
    export_html_copy_title: 'Formatlangan HTML ni xotiraga nusxalash',
    export_html_copy_desc: 'Elektron pochta, Word yoki Google Docs ga joylash uchun uslubli HTML ni nusxalash.',
    export_text_copy_title: 'Oddiy matnni xotiraga nusxalash',
    export_text_copy_desc: 'Hujjatning xom tarkibini tizim xotirasiga nusxalash.',
    recent_title: 'Yaqinda ochilgan fayllar',
    recent_empty: "Hali yaqinda ochilgan fayllar yo'q.",
    legal_title: "Markpad Native — Huquqiy va Nashriyot Ma'lumotlari",
    legal_app_name: 'Ilova nomi:',
    legal_publisher: 'Nashriyotchi:',
    legal_author: 'Muallif:',
    legal_license: 'Litsenziya:',
    legal_arch: 'Arxitektura:',
    legal_desc: "Markpad Native ochiq manbali yuqori samarali matn va kod yordamchi dasturi bo'lib, Vodiy nomi ostida doimiy nashr etiladi.",
  },
} as const;

export type LocaleKey = keyof typeof locales;
type TranslationKey = keyof (typeof locales)['en'];

// Shared reactive locale state (Svelte 5 rune)
let _locale = $state<LocaleKey>('en');

// Initialize from localStorage
if (typeof localStorage !== 'undefined') {
  const saved = localStorage.getItem('markpad-locale') as LocaleKey | null;
  if (saved && saved in locales) _locale = saved;
}

export function getLocale(): LocaleKey {
  return _locale;
}

export function setLocale(l: LocaleKey): void {
  _locale = l;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('markpad-locale', l);
  }
}

export function cycleLocale(): void {
  const order: LocaleKey[] = ['en', 'ru', 'uz'];
  const idx = order.indexOf(_locale);
  setLocale(order[(idx + 1) % order.length]);
}

/**
 * Returns the translated string for the given key.
 * Reactive: re-evaluates when locale changes.
 */
export function t(key: TranslationKey): string {
  return locales[_locale]?.[key] ?? locales['en'][key] ?? key;
}
