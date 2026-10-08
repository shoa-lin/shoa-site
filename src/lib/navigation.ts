import { getDictionary, type Locale } from './i18n';
import { localizedPath } from './routes';

export function navigationItems(locale: Locale): Array<{ path: string; href: string; label: string }> {
  const dictionary = getDictionary(locale);
  return [
    { path: '/', href: localizedPath(locale, '/'), label: dictionary.nav.home },
    { path: '/about', href: localizedPath(locale, '/about'), label: dictionary.nav.about },
    { path: '/blog', href: localizedPath(locale, '/blog'), label: dictionary.nav.blog },
    { path: '/comics', href: localizedPath(locale, '/comics'), label: dictionary.nav.comics },
    { path: '/food', href: localizedPath(locale, '/food'), label: dictionary.nav.food },
    { path: '/favorites', href: localizedPath(locale, '/favorites'), label: dictionary.nav.favorites },
    { path: '/contact', href: localizedPath(locale, '/contact'), label: dictionary.nav.contact },
  ];
}
