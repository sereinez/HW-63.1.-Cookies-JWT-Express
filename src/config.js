// Єдине місце для налаштувань. У production задавайте значення через змінні середовища.
export const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';
export const JWT_EXPIRES_IN = '1h';

export const TOKEN_COOKIE = 'token';
export const THEME_COOKIE = 'theme';

export const THEMES = ['light', 'dark'];
export const DEFAULT_THEME = 'light';

const HOUR = 60 * 60 * 1000;
export const TOKEN_MAX_AGE = HOUR;                 // збігається з JWT_EXPIRES_IN
export const THEME_MAX_AGE = 365 * 24 * HOUR;      // тема запам'ятовується на рік
