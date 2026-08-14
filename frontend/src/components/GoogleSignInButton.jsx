import React, { useEffect, useRef } from 'react';
import { GOOGLE_CLIENT_ID } from '../config.js';

export default function GoogleSignInButton({ onSuccess, onError }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!window.google || !buttonRef.current) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => onSuccess(response.credential),
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: 'filled_black',
      size: 'large',
      width: '100%',
      text: 'continue_with',
    });
  }, [onSuccess]);

  return <div ref={buttonRef} style={{ margin: '12px 0' }} />;
}