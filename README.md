

## Встановлення та запуск

Потрібен Node.js 18+.

```bash
npm install
npm start
```

Режим розробки (автоперезапуск): `npm run dev`. Для Yarn: `yarn install` та `yarn start`.

Відкрийте <http://localhost:3000/login>.

> Якщо PowerShell забороняє запуск `npm` (помилка *execution policies*), виконайте один раз:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

### Змінні середовища (необов'язкові)

| Змінна       | За замовчуванням             | Опис                                                         |
| ------------ | ---------------------------- | ------------------------------------------------------------ |
| `PORT`       | `3000`                       | Порт сервера                                                 |
| `JWT_SECRET` | `dev-jwt-secret-change-me`   | Секрет для підпису JWT. **У реальному проєкті обов'язково змініть** |
| `NODE_ENV`   | —                            | При `production` cookie з токеном отримує прапорець `secure` (лише HTTPS) |

## Тестові користувачі

| Логін   | Пароль     | Роль    |
| ------- | ---------- | ------- |
| `admin` | `admin123` | `admin` |
| `user`  | `user123`  | `user`  |

Нових користувачів можна створити на сторінці `/register` (роль завжди `user`). Дані зберігаються
в пам'яті, тому після перезапуску сервера повертаються до початкових.

## Структура проєкту

```
express-jwt-app/
├── package.json
├── README.md
├── public/
│   ├── favicon.ico                 # іконка сайту
│   └── css/style.css               # стилі (світла + темна тема)
└── src/
    ├── server.js                   # запуск (порт 3000)
    ├── app.js                      # шаблонізатори, мідлвари, маршрути
    ├── config.js                   # JWT_SECRET, терміни дії, імена cookies
    ├── models/                     # userModel.js, articleModel.js
    ├── controllers/                # index, auth, theme, users, articles
    ├── routes/                     # index, auth, theme, users, articles
    ├── middlewares/
    │   ├── logger.js               # логування запитів
    │   ├── textResponse.js         # text/plain за замовчуванням
    │   ├── theme.js                # читає тему з cookie
    │   ├── auth.js                 # identify, authenticate, requireRole, selfOrAdmin
    │   ├── validate.js             # валідація параметрів і тіла запитів
    │   ├── articleAccess.js        # права доступу до статей
    │   └── errorHandler.js         # 404 і обробник помилок
    ├── utils/
    │   ├── token.js                # створення/перевірка JWT, cookie з токеном
    │   ├── password.js             # bcrypt: хешування й перевірка паролів
    │   └── authPage.js             # рендер сторінок входу/реєстрації, safeNext
    └── views/
        ├── layout.pug, includes/   # макет і навігація (PUG)
        ├── users/, auth/           # сторінки користувачів, входу, реєстрації (PUG)
        └── partials/, articles/    # шапка/футер і сторінки статей (EJS)
```

## 1. Статичні файли та favicon

- `public/favicon.ico` відправляється пакетом **`serve-favicon`** — він підключений **першим** у `app.js`,
  тому іконка віддається швидко, з кешуванням і не потрапляє в логи.
- У всі шаблони додано тег `<link rel="icon" href="/favicon.ico">`: `views/layout.pug` (усі PUG-сторінки)
  та `views/partials/header.ejs` (усі EJS-сторінки). Сторінки входу й реєстрації успадковують `layout.pug`.
- Решта статики (`/css/style.css`) віддається через `express.static`. Він підключений **до** мідлвара
  `textResponse`, інакше CSS приходив би як `text/plain` і браузер його б проігнорував.

## 2. Cookies: тема оформлення

- `cookie-parser` розбирає заголовок `Cookie` у `req.cookies`.
- `POST /theme` зберігає вибір у cookie `theme` на 1 рік (`SameSite=Lax`).
  Значення перевіряється за білим списком (`light`, `dark`).
- Мідлвар `readTheme` читає cookie на **кожному** запиті й кладе тему в `res.locals.theme`;
  шаблони виводять `<html data-theme="...">`, а CSS перемикає змінні кольорів.
  Підроблене значення в cookie (наприклад, `theme=<script>`) ігнорується — діє світла тема.
- Cookie `theme` не секретна, тому `httpOnly` не потрібен (на відміну від токена).

## 3. JWT-авторизація

1. `POST /register` або `POST /login` перевіряє дані та створює **JWT** (HS256, діє **1 годину**)
   з payload `{ sub: id, username, role }`.
2. Токен зберігається в cookie `token` із прапорцями **`HttpOnly`** (JavaScript на сторінці
   не може його прочитати — захист від крадіжки через XSS) та **`SameSite=Lax`** (захист від CSRF).
3. Мідлвар **`identify`** (глобальний) на кожному запиті шукає токен у cookie `token` або в заголовку
   `Authorization: Bearer <token>`, перевіряє підпис і термін дії та заповнює `req.user`.
   Недійсний або прострочений токен ігнорується, а cookie очищається.
4. Мідлвар **`authenticate`** захищає маршрути: без дійсного токена браузер (`Accept: text/html`)
   перенаправляється на `/login?next=...`, а API-клієнт (curl, Postman) отримує `401`.
5. `POST /logout` видаляє cookie. JWT stateless, тому сервер не «відкликає» токен —
   він просто перестає надсилатися браузером.

Додатково: пароль перевіряється через `bcrypt`; на неправильний логін і неправильний пароль
повертається однакове повідомлення; самореєстрація завжди створює роль `user`; параметр `next`
приймає лише локальні шляхи (захист від open redirect).

## Маршрути

Формат відповіді: **HTML** — сторінка, **текст** — `text/plain`. Дії з HTML-форм (`application/x-www-form-urlencoded`)
завершуються редіректом, а запити з `Content-Type: application/json` отримують текстову відповідь
(для `/login` і `/register` — разом із `Token: <jwt>`, який можна використати як Bearer).

### Публічні

| Метод | Шлях        | Мідлвари                | Відповіді                                                            |
| ----- | ----------- | ----------------------- | -------------------------------------------------------------------- |
| GET   | `/`         | логування               | `200` текст — опис маршрутів                                         |
| GET   | `/favicon.ico` | `serve-favicon`      | `200` `image/x-icon`                                                 |
| GET   | `/login`    | —                       | `200` HTML (PUG); якщо вже увійшли — редірект на `/users`            |
| POST  | `/login`    | `validateAuthBody`      | форма: `303` на `next` (за замовч. `/users`) + cookie `token`; API: `200` текст + токен; `400` валідація; `401` невірні дані |
| GET   | `/register` | —                       | `200` HTML (PUG)                                                     |
| POST  | `/register` | `validateAuthBody`      | форма: `303` на `/users` + cookie `token`; API: `201` текст + токен; `400`; `409` логін зайнятий |
| POST  | `/logout`   | —                       | форма: `303` на `/login`; API: `200` текст; cookie `token` видаляється |
| GET   | `/theme`    | `readTheme`             | `200` текст — поточна тема                                           |
| POST  | `/theme`    | —                       | поле `theme` = `light` / `dark`. Форма: `303` назад (за `Referer`); API: `200` текст; `400` невідома тема |

### Захищені (потрібен JWT)

| Метод  | Шлях                   | Мідлвари (після `authenticate`)                                             | Відповіді                                                  |
| ------ | ---------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------- |
| GET    | `/me`                  | —                                                                           | `200` текст — дані користувача з токена; `401`             |
| GET    | `/users`               | —                                                                           | `200` HTML (PUG) — таблиця користувачів                    |
| GET    | `/users/:userId`       | `validateIdParam`                                                           | `200` HTML (PUG); `400`; `404`                             |
| POST   | `/users`               | `requireRole('admin')`, `validateUserBody`                                  | `201`; `400`; `403`; `409`                                 |
| PUT    | `/users/:userId`       | `validateIdParam`, `selfOrAdmin`, `validateUserBody`                        | `200`; `400`; `403`; `404`; `409`                          |
| DELETE | `/users/:userId`       | `validateIdParam`, `requireRole('admin')`                                   | `200`; `400`; `403`; `404`                                 |
| GET    | `/articles`            | —                                                                           | `200` HTML (EJS) — картки статей                           |
| GET    | `/articles/:articleId` | `validateIdParam`, `loadArticle`                                            | `200` HTML (EJS); `400`; `404`                             |
| POST   | `/articles`            | `validateArticleBody`                                                       | `201`; `400`                                               |
| PUT    | `/articles/:articleId` | `validateIdParam`, `loadArticle`, `canModifyArticle`, `validateArticleBody` | `200`; `400`; `403` не автор; `404`                        |
| DELETE | `/articles/:articleId` | `validateIdParam`, `loadArticle`, `canModifyArticle`                        | `200`; `400`; `403` не автор; `404`                        |

Усі захищені маршрути без токена: браузер → `302 /login?next=...`, API-клієнт → `401`.
Неіснуючий маршрут → `404`, внутрішня помилка → `500` (текст).

## Порядок мідлварів (`src/app.js`)

| №  | Мідлвар                   | Призначення                                        |
| -- | ------------------------- | -------------------------------------------------- |
| 1  | `serve-favicon`           | віддає `favicon.ico`                               |
| 2  | `logRequests`             | логування запитів                                  |
| 3  | `express.static`          | CSS з `public/` (до `textResponse`!)               |
| 4  | `textResponse`            | `text/plain` за замовчуванням                      |
| 5  | `express.json` / `urlencoded` | розбір тіла запиту (JSON і форм)               |
| 6  | `cookieParser`            | `req.cookies`                                      |
| 7  | `readTheme`               | `res.locals.theme` з cookie                        |
| 8  | `identify`                | JWT → `req.user`, `res.locals.currentUser`         |
| 9  | маршрути → `notFound` → `errorHandler` | обробка запитів, 404, помилки         |

## Приклади

Сторінки: відкрийте <http://localhost:3000/login>, увійдіть як `admin` / `admin123`, перемикайте тему кнопкою
у верхньому правому куті — вибір збережеться після перезавантаження сторінки та перезапуску браузера.

Запити через API (у **PowerShell** використовуйте `curl.exe`):

```bash
# Вхід: у відповіді буде токен
curl.exe -X POST http://localhost:3000/login -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"admin123\"}"

# Захищений маршрут із токеном
curl.exe http://localhost:3000/me -H "Authorization: Bearer <ваш-токен>"

# Без токена -> 401
curl.exe -i http://localhost:3000/users

# Реєстрація
curl.exe -X POST http://localhost:3000/register -H "Content-Type: application/json" -d "{\"username\":\"ivan\",\"password\":\"pass1234\"}"

# Зберегти тему (відповідь міститиме Set-Cookie: theme=dark)
curl.exe -i -X POST http://localhost:3000/theme -H "Content-Type: application/json" -d "{\"theme\":\"dark\"}"
```

Перевірити cookie у браузері: DevTools → *Application* → *Cookies*. У `token` увімкнено `HttpOnly`,
а `theme` видно й у JS.

