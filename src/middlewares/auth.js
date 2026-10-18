import * as User from '../models/userModel.js';
import { verifyToken, clearAuthCookie } from '../utils/token.js';
import { TOKEN_COOKIE } from '../config.js';

// У шаблони передаємо лише безпечні поля.
export const publicUser = ({ id, username, role }) => ({ id, username, role });

/** Токен береться з заголовка Authorization: Bearer ... або з httpOnly-cookie. */
function readToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.[TOKEN_COOKIE];
}

/** Браузер явно просить HTML-сторінку (а не curl/Postman). */
const wantsPage = req => (req.headers.accept || '').includes('text/html');

/**
 * М'яка ідентифікація (діє глобально): якщо є дійсний JWT — заповнює req.user
 * та res.locals.currentUser, інакше просто йде далі. Нічого не блокує.
 */
export function identify(req, res, next) {
  res.locals.currentUser = null;

  const token = readToken(req);
  if (!token) return next();

  try {
    const payload = verifyToken(token);
    const user = User.getById(Number(payload.sub));
    if (user) {
      req.user = user;
      res.locals.currentUser = publicUser(user);
    }
  } catch {
    // токен недійсний або прострочений — прибираємо cookie
    clearAuthCookie(res);
  }
  next();
}

/** Сувора перевірка для захищених маршрутів: без дійсного JWT доступу немає. */
export function authenticate(req, res, next) {
  if (req.user) return next();

  if (wantsPage(req)) {
    return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
  }
  res
    .status(401)
    .send('Доступ заборонено. Увійдіть через POST /login або передайте заголовок Authorization: Bearer <token>.');
}

/** Дозволяє доступ лише користувачам із вказаною роллю. */
export const requireRole = role => (req, res, next) => {
  if (req.user.role !== role) {
    return res.status(403).send(`Доступ заборонено. Потрібна роль: ${role}.`);
  }
  next();
};

/** Дозволяє доступ адміністратору або самому користувачу (за :param). */
export const selfOrAdmin = paramName => (req, res, next) => {
  const isSelf = req.user.id === Number(req.params[paramName]);
  if (req.user.role === 'admin' || isSelf) return next();
  res.status(403).send('Доступ заборонено. Можна змінювати лише власний профіль.');
};
