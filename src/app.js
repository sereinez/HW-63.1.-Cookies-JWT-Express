import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';
import cookieParser from 'cookie-parser';
import favicon from 'serve-favicon';
import ejs from 'ejs';

import indexRouter from './routes/index.js';
import authRouter from './routes/auth.js';
import themeRouter from './routes/theme.js';
import usersRouter from './routes/users.js';
import articlesRouter from './routes/articles.js';

import { logRequests } from './middlewares/logger.js';
import { textResponse } from './middlewares/textResponse.js';
import { readTheme } from './middlewares/theme.js';
import { identify } from './middlewares/auth.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

const app = express();

// ---------- Шаблонізатори ----------
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');          // PUG — за замовчуванням (файли .pug)
app.engine('ejs', ejs.__express);       // EJS — для файлів .ejs

// ---------- Мідлвари (порядок має значення!) ----------
app.use(favicon(path.join(publicDir, 'favicon.ico')));   // 1. favicon (віддається до логування й усього іншого)
app.use(logRequests);                                      // 2. логування
app.use(express.static(publicDir));                        // 3. статика (CSS) — ДО textResponse
app.use(textResponse);                                     // 4. за замовчуванням відповіді — text/plain
app.use(express.json());                                   // 5. парсинг JSON-тіла
app.use(express.urlencoded({ extended: true }));           //    і HTML-форм
app.use(cookieParser());                                   // 6. розбір cookies -> req.cookies
app.use(readTheme);                                        // 7. тема з cookie -> res.locals.theme
app.use(identify);                                         // 8. JWT з cookie/заголовка -> req.user (м'яко)

// ---------- Маршрути ----------
app.use('/', indexRouter);
app.use('/', authRouter);                // /login, /register, /logout, /me
app.use('/theme', themeRouter);          // збереження теми в cookie
app.use('/users', usersRouter);          // захищені, PUG
app.use('/articles', articlesRouter);    // захищені, EJS

app.use(notFound);                                         // 404
app.use(errorHandler);                                     // обробка помилок (останнім)

export default app;
