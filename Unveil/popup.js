// Unveil Popup Script
class UnveilPopup {
  constructor() {
    this.init();
  }

  async init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
    } else {
      this.setupEventListeners();
    }
  }

  setupEventListeners() {
    // Toggle All button
    const toggleAllBtn = document.getElementById('toggleAll');
    if (toggleAllBtn) {
      toggleAllBtn.addEventListener('click', () => this.executeFunction('toggleAllElements'));
    }

    // Enable Copy & Paste button
    const enableCopyBtn = document.getElementById('enableCopyPaste');
    if (enableCopyBtn) {
      enableCopyBtn.addEventListener('click', () => this.executeFunction('enableCopyElements'));
    }

    // Find Blocked Elements button
    const highlightProblemsBtn = document.getElementById('highlightProblems');
    if (highlightProblemsBtn) {
      highlightProblemsBtn.addEventListener('click', () => this.executeFunction('findBlockedElements'));
    }

    // Toggle Dark Mode button
    const darkModeBtn = document.getElementById('toggleDarkMode');
    if (darkModeBtn) {
      darkModeBtn.addEventListener('click', () => this.executeFunction('darkModeElements'));
    }

    // Inject Custom CSS button
    const injectCSSBtn = document.getElementById('injectCustomCSS');
    if (injectCSSBtn) {
      injectCSSBtn.addEventListener('click', () => this.injectCustomCSS());
    }
  }

  async executeFunction(functionName) {
    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.url || tab.url.startsWith('chrome://')) {
        this.showError('Cannot run Unveil on this page');
        return;
      }

      // Execute the function in the content script
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: (fnName) => {
          if (typeof window[fnName] === 'function') {
            const result = window[fnName]();
            return { success: true, result: result };
          } else {
            return { success: false, error: `Function ${fnName} not found` };
          }
        },
        args: [functionName]
      });

      if (results && results[0] && results[0].result) {
        const { success, result, error } = results[0].result;
        if (success) {
          this.showSuccess(`${functionName} executed successfully. Result: ${result}`);
        } else {
          this.showError(error || 'Function execution failed');
        }
      }

    } catch (error) {
      console.error(`Error executing ${functionName}:`, error);
      this.showError(`Failed to execute ${functionName}: ${error.message}`);
    }
  }

  async injectCustomCSS() {
    try {
      const textarea = document.getElementById('customCSSTextarea');
      if (!textarea) {
        this.showError('CSS textarea not found');
        return;
      }

      const customCSS = textarea.value.trim();
      if (!customCSS) {
        this.showError('Please enter some CSS to inject');
        return;
      }

      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.url || tab.url.startsWith('chrome://')) {
        this.showError('Cannot inject CSS on this page');
        return;
      }

      // Execute CSS injection in the content script
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: (cssContent) => {
          try {
            // Remove previous custom CSS if it exists
            const existingStyle = document.getElementById('unveil-custom-css');
            if (existingStyle) {
              existingStyle.remove();
            }

            // Inject new custom CSS
            const style = document.createElement('style');
            style.id = 'unveil-custom-css';
            style.textContent = cssContent;
            document.head.appendChild(style);

            return { success: true, message: 'Custom CSS injected successfully' };
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
        args: [customCSS]
      });

      if (results && results[0] && results[0].result) {
        const { success, message, error } = results[0].result;
        if (success) {
          this.showSuccess(message);
        } else {
          this.showError(error || 'CSS injection failed');
        }
      }

    } catch (error) {
      console.error('Error injecting custom CSS:', error);
      this.showError(`Failed to inject CSS: ${error.message}`);
    }
  }

  showSuccess(message) {
    console.log('Success:', message);
    // You could add visual feedback here if needed
  }

  showError(message) {
    console.error('Error:', message);
    // You could add visual feedback here if needed
  }
}

// Initialize the popup when the script loads
new UnveilPopup();