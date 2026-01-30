/**
 * =============================================================================
 * Homura - Content Script Entry Point
 * =============================================================================
 * 
 * This script is injected into every web page.
 * It initializes the message handler for communication with Background.
 */

import { initMessageHandler } from './messageHandler';

// Avoid duplicate injection
if (!(window as Window & { __HOMURA_INJECTED__?: boolean }).__HOMURA_INJECTED__) {
  (window as Window & { __HOMURA_INJECTED__?: boolean }).__HOMURA_INJECTED__ = true;
  
  console.log('[Homura] Content script loaded on:', window.location.href);
  
  // Initialize message handler
  initMessageHandler();
  
  // Add visual indicator for debug (optional)
  if (import.meta.env.DEV) {
    const indicator = document.createElement('div');
    indicator.id = 'homura-dev-indicator';
    Object.assign(indicator.style, {
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      width: '10px',
      height: '10px',
      backgroundColor: '#f97316',
      borderRadius: '50%',
      zIndex: '2147483647',
      opacity: '0.5',
      pointerEvents: 'none',
    });
    document.body.appendChild(indicator);
  }
}
