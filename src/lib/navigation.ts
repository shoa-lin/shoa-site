import { getDictionary, type Locale } from './i18n';
import { localizedPath } from './routes';

export const comicCopy: Record<Locale, { title: string; description: string }> = {
  zh: { title: '漫画', description: '用漫画阅读技术主题，浏览漫画文章。' },
  en: { title: 'Comics', description: 'Explore technical topics through comic-style articles.' },
  ja: { title: '漫画', description: '技術の話題を漫画形式の記事で読む。' },
  ko: { title: '만화', description: '만화 형식의 글로 기술 주제를 살펴보세요.' },
  th: { title: 'การ์ตูน', description: 'อ่านเรื่องราวทางเทคนิคผ่านบทความรูปแบบการ์ตูน' },
  fr: { title: 'Bandes dessinées', description: 'Découvrez des sujets techniques sous forme de bandes dessinées.' },
  de: { title: 'Comics', description: 'Technische Themen als Comic-Artikel entdecken.' },
  vi: { title: 'Truyện tranh', description: 'Khám phá các chủ đề kỹ thuật qua bài viết dạng truyện tranh.' },
};

export function navigationItems(locale: Locale): Array<{ path: string; href: string; label: string }> {
  const dictionary = getDictionary(locale);
  return [
    { path: '/', href: localizedPath(locale, '/'), label: dictionary.nav.home },
    { path: '/about', href: localizedPath(locale, '/about'), label: dictionary.nav.about },
    { path: '/blog', href: localizedPath(locale, '/blog'), label: dictionary.nav.blog },
    { path: '/comics', href: '/comics/', label: comicCopy[locale].title },
    { path: '/favorites', href: localizedPath(locale, '/favorites'), label: dictionary.nav.favorites },
    { path: '/contact', href: localizedPath(locale, '/contact'), label: dictionary.nav.contact },
  ];
}
