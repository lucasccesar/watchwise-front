const links = (page, paths) => Promise.all(paths.map((path) =>
  page.locator('a[href="' + path + '"]').filter({visible: true}).first().isVisible()
)).then((visible) => visible.every(Boolean));
const controls = (page, names) => Promise.all(names.map((name) =>
  page.locator('input[formcontrolname="' + name + '"]').isEditable()
)).then((editable) => editable.every(Boolean));
function legal(path, source, title, section) {
  return {
    path, source, link: '.public-document-tabs a[href="' + path + '"]',
    ready: (page) => page.locator('.legal-section h2').filter({hasText: section}).first(),
    verify: async (page) => title.test(await page.locator('#public-info-title').innerText()) &&
      await links(page, ['/terms', '/privacy', '/community-guidelines']),
  };
}

const screens = {
  login: {
    path: '/login', source: '/forgot-password', link: 'a.recovery-back[href="/login"]',
    ready: (page) => page.locator('#login-title'),
    verify: async (page) => await controls(page, ['identifier','password']) &&
      await page.locator('button[type="submit"]').isVisible() &&
      await links(page, ['/register','/forgot-password']),
  },
  register: {
    path: '/register', source: '/login', link: 'a[href="/register"]',
    ready: (page) => page.locator('#signup-title'),
    verify: async (page) => await controls(page, ['name','username','email','password','terms','ageConfirmation']) &&
      await links(page, ['/terms','/privacy','/login']),
  },
  'forgot-password': {
    path: '/forgot-password', source: '/login',
    ready: (page) => page.getByRole('heading', {name: 'Recuperar senha', exact: true}),
    verify: async (page) => await page.locator('#recovery-email').isEditable() &&
      await page.getByRole('button', {name: 'Enviar instruções', exact: true}).isVisible() &&
      await links(page, ['/login']),
    link: 'a.password-forgot-link[href="/forgot-password"]',
  },
  terms: legal('/terms', '/privacy', /Termos de Uso/i, 'Quem oferece o Watchwise'),
  privacy: legal('/privacy', '/terms', /Privacidade/i, 'Dados tratados'),
  'community-guidelines': legal('/community-guidelines', '/terms', /Diretrizes da comunidade/i, 'Quem pode usar'),
  'help-contact': {
    path: '/help-contact', source: '/login', link: 'app-home-footer a[href="/help-contact"]',
    ready: (page) => page.getByRole('heading', {name: 'Fale conosco', exact: true}),
    verify: async (page) => await page.getByRole('heading', {name: 'Ajuda e contato', exact: true}).isVisible() &&
      await page.locator('#conta-e-acesso').isVisible() &&
      await links(page, ['/terms','/privacy','/community-guidelines']),
  },
};
export const groupSix = Object.fromEntries(Object.entries(screens).map(([name, screen]) =>
  [name, { ...screen, anonymous: true, readOnly: true }]
));
