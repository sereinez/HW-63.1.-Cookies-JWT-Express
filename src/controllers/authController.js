import * as User from '../models/userModel.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signToken, setAuthCookie, clearAuthCookie } from '../utils/token.js';
import { renderAuthPage, safeNext } from '../utils/authPage.js';

const isForm = req => Boolean(req.is('urlencoded'));

/** GET /login — сторінка входу. */
export function loginPage(req, res) {
  if (req.user) return res.redirect('/users');
  renderAuthPage(res, 'login', { next: req.query.next });
}

/** GET /register — сторінка реєстрації. */
export function registerPage(req, res) {
  if (req.user) return res.redirect('/users');
  renderAuthPage(res, 'register');
}

/** POST /register — створює користувача, генерує JWT і кладе його в httpOnly-cookie. */
export async function register(req, res, next) {
  try {
    const username = req.body.username.trim();

    if (User.getByUsername(username)) {
      const message = 'Користувач із таким логіном вже існує.';
      return isForm(req)
        ? renderAuthPage(res, 'register', { status: 409, errors: [message], username })
        : res.status(409).send(message);
    }

    // Роль завжди 'user' — самореєстрація не може створити адміністратора.
    const user = User.create({
      username,
      passwordHash: await hashPassword(req.body.password),
      role: 'user',
    });

    const token = signToken(user);
    setAuthCookie(res, token);

    if (isForm(req)) return res.redirect(303, '/users');
    res.status(201).send(`Користувача зареєстровано: #${user.id} ${user.username}\nToken: ${token}`);
  } catch (error) {
    next(error);
  }
}

/** POST /login — перевіряє пароль, генерує JWT і кладе його в httpOnly-cookie. */
export async function login(req, res, next) {
  try {
    const username = req.body.username.trim();
    const user = User.getByUsername(username);
    const valid = user && (await verifyPassword(req.body.password, user.passwordHash));

    if (!valid) {
      // Однакове повідомлення для "немає користувача" і "невірний пароль" —
      // так не видно, які логіни існують.
      const message = 'Невірний логін або пароль.';
      return isForm(req)
        ? renderAuthPage(res, 'login', { status: 401, errors: [message], username, next: req.body.next })
        : res.status(401).send(message);
    }

    const token = signToken(user);
    setAuthCookie(res, token);

    if (isForm(req)) return res.redirect(303, safeNext(req.body.next));
    res.send(`Вхід виконано: ${user.username}\nToken: ${token}`);
  } catch (error) {
    next(error);
  }
}

/** POST /logout — прибирає cookie з токеном. */
export function logout(req, res) {
  clearAuthCookie(res);
  if (isForm(req)) return res.redirect(303, '/login');
  res.send('Ви вийшли з системи.');
}

/** GET /me — захищений маршрут: показує дані користувача з JWT. */
export function me(req, res) {
  res.send(`Ви увійшли як: #${req.user.id} ${req.user.username} (${req.user.role})`);
}
