// Unveil Content Script - Optimized for Chrome Web Store

function enableCopyElements() {
  document.getElementById('unveil-copy-protection')?.remove();
  
  const style = document.createElement('style');
  style.id = 'unveil-copy-protection';
  style.textContent = `*,*::before,*::after{-webkit-user-select:text!important;-moz-user-select:text!important;-ms-user-select:text!important;user-select:text!important;-webkit-touch-callout:default!important;pointer-events:auto!important}body,html{-webkit-user-select:text!important;-moz-user-select:text!important;user-select:text!important}`;
  document.head.appendChild(style);
  
  ['copy', 'cut', 'paste', 'selectstart', 'contextmenu', 'dragstart', 'mousedown', 'mouseup'].forEach(type => {
    document.addEventListener(type, e => e.stopPropagation(), true);
  });
  
  const elements = document.querySelectorAll('*');
  let count = 0;
  
  elements.forEach(el => {
    const style = getComputedStyle(el);
    if (style.userSelect === 'none' || style.webkitUserSelect === 'none' || style.pointerEvents === 'none') {
      el.style.userSelect = 'text';
      el.style.webkitUserSelect = 'text';
      el.style.pointerEvents = 'auto';
      el.classList.add('unveil-copy-enabled');
      count++;
    }
  });
  
  return count;
}





function findBlockedElements() {
  const elements = document.querySelectorAll('*');
  let count = 0;
  const keywords = ['paywall', 'premium', 'subscription', 'locked', 'member-only'];
  
  elements.forEach(el => {
    const style = getComputedStyle(el);
    const className = el.className.toLowerCase();
    const id = el.id.toLowerCase();
    
    let reason = '';
    if (style.filter?.includes('blur')) reason = 'blur';
    else if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') reason = 'hidden';
    else if (keywords.some(k => className.includes(k) || id.includes(k))) reason = 'restricted';
    else if (style.userSelect === 'none' || style.webkitUserSelect === 'none') reason = 'no-select';
    
    if (reason) {
      el.style.outline = '2px solid #ff4444';
      el.style.backgroundColor = 'rgba(255, 68, 68, 0.1)';
      el.style.position = 'relative';
      el.classList.add('unveil-highlighted');
      
      const label = document.createElement('div');
      label.textContent = `Unveil: ${reason}`;
      label.style.cssText = 'position:absolute;top:-25px;left:0;background:#ff4444;color:white;padding:2px 8px;font-size:11px;font-family:Arial,sans-serif;z-index:10000;border-radius:3px;pointer-events:none';
      el.appendChild(label);
      count++;
    }
  });
  
  return count;
}

function darkModeElements() {
  const existing = document.getElementById('unveil-dark-mode');
  if (existing) {
    existing.remove();
    return 0;
  }
  
  const style = document.createElement('style');
  style.id = 'unveil-dark-mode';
  style.textContent = `html,body{background-color:#1a1a1a!important;color:#e0e0e0!important}*,*::before,*::after{background-color:#2a2a2a!important;color:#e0e0e0!important;border-color:#404040!important}div,section,article,main,aside,nav,header,footer{background-color:#2a2a2a!important;color:#e0e0e0!important}h1,h2,h3,h4,h5,h6{color:#ffffff!important}p,span,li,td,th{color:#e0e0e0!important}a,a:visited{color:#66b3ff!important}a:hover{color:#87ceeb!important}input,textarea,select,button{background-color:#333333!important;color:#e0e0e0!important;border:1px solid #555555!important}img{opacity:0.9!important;filter:brightness(0.9) contrast(1.1)!important}code,pre{background-color:#1e1e1e!important;color:#f8f8f2!important;border:1px solid #333!important}table{background-color:#2a2a2a!important;border-color:#404040!important}tr:nth-child(even){background-color:#333333!important}blockquote{background-color:#333333!important;border-left:4px solid #66b3ff!important;color:#e0e0e0!important}`;
  document.head.appendChild(style);
  return 1;
}

function toggleAllElements() {
  let total = 0;
  
  try {
    total += enableCopyElements();
    total += findBlockedElements();
    total += darkModeElements();
    
    const notification = document.createElement('div');
    notification.textContent = `Unveil: ${total} elements modified`;
    notification.style.cssText = 'position:fixed;top:20px;right:20px;background:#4CAF50;color:white;padding:12px 20px;border-radius:6px;font-family:Arial,sans-serif;font-size:14px;z-index:999999;box-shadow:0 4px 12px rgba(0,0,0,0.3)';
    document.body.appendChild(notification);
    
    setTimeout(() => notification.parentNode?.removeChild(notification), 3000);
    return total;
  } catch (error) {
    return 0;
  }
}

// Export functions globally and log readiness
Object.assign(window, {
  enableCopyElements,
  findBlockedElements,
  darkModeElements,
  toggleAllElements
});

// Signal that content script is ready
console.log('Unveil content script loaded and ready');