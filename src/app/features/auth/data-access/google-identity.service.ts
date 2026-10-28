import { Injectable } from '@angular/core';

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleButtonOptions {
  theme: 'filled_black';
  size: 'large';
  text: 'continue_with';
  shape: 'rectangular';
  logo_alignment: 'left';
  width: number;
  locale: 'pt_BR';
}

interface GoogleIdentityApi {
  accounts: {
    id: {
      initialize(options: {
        client_id: string;
        callback(response: GoogleCredentialResponse): void;
        ux_mode: 'popup';
      }): void;
      renderButton(element: HTMLElement, options: GoogleButtonOptions): void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityApi;
  }
}

@Injectable({ providedIn: 'root' })
export class GoogleIdentityService {
  private scriptPromise?: Promise<void>;

  async renderButton(
    element: HTMLElement,
    clientId: string,
    onCredential: (idToken: string) => void,
  ): Promise<void> {
    await this.loadScript();

    const googleIdentity = window.google;
    if (!googleIdentity) {
      throw new Error('Google Identity Services did not load.');
    }

    googleIdentity.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        if (response.credential) {
          onCredential(response.credential);
        }
      },
      ux_mode: 'popup',
    });
    googleIdentity.accounts.id.renderButton(element, {
      theme: 'filled_black',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: Math.min(element.clientWidth || 360, 360),
      locale: 'pt_BR',
    });
  }

  private loadScript(): Promise<void> {
    if (window.google) {
      return Promise.resolve();
    }
    if (this.scriptPromise) {
      return this.scriptPromise;
    }

    this.scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset['watchwiseGoogleIdentity'] = 'true';
      script.onload = () => (window.google ? resolve() : reject(new Error('Google Identity Services unavailable.')));
      script.onerror = () => reject(new Error('Google Identity Services failed to load.'));
      document.head.appendChild(script);
    });

    return this.scriptPromise;
  }
}
