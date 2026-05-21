export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export function loadGoogleIdentity() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve(window.google);
      return;
    }

    const existing = document.querySelector('script[data-google-identity]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google), { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = () => resolve(window.google);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export async function renderGoogleButton(container, callback) {
  if (!GOOGLE_CLIENT_ID) throw new Error('Google client ID is not configured');
  if (!container) return;

  const google = await loadGoogleIdentity();
  container.innerHTML = '';
  const buttonWidth = Math.min(
    400,
    Math.max(300, Math.floor(container.getBoundingClientRect().width || container.offsetWidth || 400)),
  );
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback,
    ux_mode: 'popup',
    auto_select: false,
    cancel_on_tap_outside: true,
    use_fedcm_for_prompt: false,
    use_fedcm_for_button: true,
    button_auto_select: false,
  });
  google.accounts.id.renderButton(container, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'rectangular',
    logo_alignment: 'left',
    width: buttonWidth,
  });
}
