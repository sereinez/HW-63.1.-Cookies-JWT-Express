import jwt from 'jsonwebtoken';
import {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  TOKEN_COOKIE,
  TOKEN_MAX_AGE,
} from '../config.js';

/** Створює підписаний JWT. У payload — лише потрібне: id (sub), логін і роль. */
export function signToken(user) {
  return jwt.sign(
    { sub: String(user.id), username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/** Перевіряє підпис і термін дії; кидає помилку, якщо токен недійсний. */
export const verifyToken = token => jwt.verify(token, JWT_SECRET);

// httpOnly — JavaScript у браузері не бачить cookie (захист від крадіжки токена через XSS).
// sameSite: 'lax' — cookie не надсилається з чужих сайтів у POST-запитах (захист від CSRF).
// secure — лише по HTTPS (вмикається у production).
const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: TOKEN_MAX_AGE,
});

export const setAuthCookie = (res, token) =>
  res.cookie(TOKEN_COOKIE, token, cookieOptions());

export const clearAuthCookie = res =>
  res.clearCookie(TOKEN_COOKIE, { ...cookieOptions(), maxAge: undefined });
