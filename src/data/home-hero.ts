const base = import.meta.env.BASE_URL;
const image = (crop: string, width: number) => `${base}images/rivera-canadian-flag-${crop}-${width}w.webp`;
const srcset = (crop: string, widths: number[]) => widths.map((width) => `${image(crop, width)} ${width}w`).join(', ');

export const homeHero = {
  wide: {
    media: '(width >= 768px)',
    src: image('wide', 1920),
    srcset: srcset('wide', [1280, 1920, 2560, 3200]),
  },
  mobile: {
    media: '(width < 768px)',
    src: image('mobile', 480),
    srcset: srcset('mobile', [480, 840, 1080]),
  },
  credit: {
    source: 'https://unsplash.com/photos/ahHn48-zKWo',
    author: 'Hermes Rivera',
  },
};
