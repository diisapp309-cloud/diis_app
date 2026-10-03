export default function manifest() {
  return {
    name: 'DIIS Dispatch Log',
    short_name: 'DIIS Log',
    description: 'Record truck movements with FBR invoice, NTNs, goods value and sales tax.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#f3f1ec',
    theme_color: '#0e5a4a',
    icons: [
      { src: '/icons/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
