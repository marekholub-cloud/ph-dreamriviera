(function() {
  'use strict';

  // Find the script tag that loaded this file
  const currentScript = document.currentScript;
  
  if (!currentScript) {
    console.error('WLM Seminars Widget: Could not find script element');
    return;
  }

  // Read configuration from data attributes
  const apiKey = currentScript.getAttribute('data-api-key');
  const maxWidth = currentScript.getAttribute('data-max-width') || '100%';
  const containerId = currentScript.getAttribute('data-container') || 'wlm-seminars-widget';

  if (!apiKey) {
    console.error('WLM Seminars Widget: Missing data-api-key attribute');
    return;
  }

  // Get the base URL from the script src
  const scriptSrc = currentScript.src;
  const baseUrl = scriptSrc.replace(/\/widget\/seminars\.js.*$/, '');

  // Create the widget container
  const container = document.getElementById(containerId);
  
  if (!container) {
    console.error(`WLM Seminars Widget: Container element #${containerId} not found`);
    return;
  }

  // Apply max-width styling to container
  container.style.maxWidth = maxWidth;
  container.style.margin = '0 auto';
  container.style.width = '100%';

  // Create iframe for the widget
  const iframe = document.createElement('iframe');
  iframe.src = `${baseUrl}/embed/investor-form?api_key=${encodeURIComponent(apiKey)}`;
  iframe.style.cssText = `
    width: 100%;
    min-height: 600px;
    border: none;
    border-radius: 12px;
    background: transparent;
  `;
  iframe.setAttribute('frameborder', '0');
  iframe.setAttribute('scrolling', 'no');
  iframe.setAttribute('title', 'WLM Seminars Widget');
  iframe.setAttribute('loading', 'lazy');

  // Handle iframe resize messages
  window.addEventListener('message', function(event) {
    // Verify the message is from our iframe
    if (event.source !== iframe.contentWindow) return;
    
    try {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      
      if (data.type === 'wlm-widget-resize' && data.height) {
        iframe.style.height = data.height + 'px';
      }
    } catch (e) {
      // Ignore non-JSON messages
    }
  });

  // Append iframe to container
  container.appendChild(iframe);
})();
