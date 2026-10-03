'use client';

import { useEffect, useState } from 'react';
import Icon from './Icon';

// Shows "Install app" where the browser supports it, and Add-to-Home-Screen steps on iPhone/iPad.
export default function InstallButton() {
  const [prompt, setPrompt] = useState(null);
  const [platform, setPlatform] = useState('other');

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (standalone) { setPlatform('installed'); return; }
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) setPlatform('ios');
    const onPrompt = (e) => { e.preventDefault(); setPrompt(e); };
    const onInstalled = () => { setPrompt(null); setPlatform('installed'); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (platform === 'installed') return null;
  if (prompt) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { prompt.prompt(); await prompt.userChoice; setPrompt(null); }}>
        <Icon name="download" size={16} /> Install the app on this device
      </button>
    );
  }
  if (platform === 'ios') {
    return <p>Install on iPhone: tap the Share button in Safari, then “Add to Home Screen”.</p>;
  }
  return <p>Tip: install this as an app from your browser menu (“Install app” or “Add to Home screen”).</p>;
}
