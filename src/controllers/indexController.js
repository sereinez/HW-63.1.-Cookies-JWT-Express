export function home(req, res) {
  res.send(
    [
      'Ласкаво просимо до Express-сервера (статика, cookies, JWT)!',
      '',
      'Автентифікація:',
      'GET    /login, /register     (сторінки, PUG)',
      'POST   /register, /login, /logout',
      'GET    /me                   (захищений)',
      '',
      'Налаштування (cookie):',
      'GET    /theme, POST /theme',
      '',
      'Захищені HTML-сторінки:',
      'GET    /users, /users/:userId        (PUG)',
      'GET    /articles, /articles/:articleId (EJS)',
      '',
      'Захищені текстові маршрути:',
      'POST   /users, PUT /users/:userId, DELETE /users/:userId',
      'POST   /articles, PUT /articles/:articleId, DELETE /articles/:articleId',
    ].join('\n')
  );
}
