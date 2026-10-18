const TITLES = { login: 'Вхід', register: 'Реєстрація' };

/** Дозволяє редірект лише на локальні шляхи (захист від open redirect). */
export function safeNext(value, fallback = '/users') {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : fallback;
}

/** Рендерить сторінку входу/реєстрації (PUG) із переліком помилок. */
export function renderAuthPage(res, mode, { status = 200, errors = [], username = '', next } = {}) {
  res
    .status(status)
    .type('html')
    .render(`auth/${mode}.pug`, {
      title: TITLES[mode],
      section: mode,
      errors,
      username,
      redirectTo: safeNext(next),
    });
}
