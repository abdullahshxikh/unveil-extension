class UnveilBackground {
  constructor() {
    this.init();
  }

  init() {
    this.setupCommandListener();
    this.setupTabListener();
    this.setupInstallListener();
  }

  // Extract domain from URL for storage key
  getDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, ''); // Remove www prefix
    } catch (error) {
      console.error('Invalid URL:', url);
      return null;
    }
  }

  setupCommandListener() {
    if (chrome.commands && chrome.commands.onCommand) {
      chrome.commands.onCommand.addListener(async (command) => {
        if (command === 'toggleAll') {
          await this.handleToggleAllCommand();
        }
      });
    } else {
      console.warn('Chrome commands API not available');
    }
  }

  setupTabListener() {
    // Handle tab updates - auto-apply stored preferences
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
        await this.autoApplyPreferences(tabId, tab.url);
      }
    });

    // Handle tab activation - auto-apply when switching tabs
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab.url && !tab.url.startsWith('chrome://')) {
          await this.autoApplyPreferences(activeInfo.tabId, tab.url);
        }
      } catch (error) {
        console.log('Tab activation handling skipped:', error.message);
      }
    });

    // Clean up tab-specific storage when tabs are closed
    chrome.tabs.onRemoved.addListener(async (tabId) => {
      try {
        await chrome.storage.local.remove([`unveil_tab_${tabId}`]);
      } catch (error) {
        console.error('Failed to clean up tab storage:', error);
      }
    });
  }

  setupInstallListener() {
    chrome.runtime.onInstalled.addListener(async (details) => {
      if (details.reason === 'install') {
        // Set default settings
        await chrome.storage.local.set({
          unveil_settings: {
            version: '1.0.0',
            firstInstall: Date.now(),
            autoApplyEnabled: true
          }
        });

        // Show welcome notification
        if (chrome.notifications) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon48.png',
            title: 'Unveil Installed!',
            message: 'Press Ctrl+Shift+U to toggle all features, or click the extension icon.'
          });
        }
      }
    });
  }

  async handleToggleAllCommand() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url || tab.url.startsWith('chrome://')) {
        console.log('Cannot run Unveil on this page');
        return;
      }

      console.log('Running toggleAllElements via keyboard command');

      // Execute toggleAllElements function directly
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          if (typeof window.toggleAllElements === 'function') {
            return window.toggleAllElements();
          } else {
            console.error('toggleAllElements function not found');
            return 0;
          }
        }
      });

      // Save domain preference
      const domain = this.getDomain(tab.url);
      if (domain) {
        await this.saveDomainPreference(domain, {
          toggleAll: true,
          lastUsed: Date.now()
        });
      }

      // Show notification
      if (chrome.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon48.png',
          title: 'Unveil',
          message: 'Toggle All features applied!'
        });
      }

    } catch (error) {
      console.error('Failed to handle toggle all command:', error);
    }
  }

  async autoApplyPreferences(tabId, url) {
    try {
      const domain = this.getDomain(url);
      if (!domain) return;

      // Check if auto-apply is enabled
      const settings = await chrome.storage.local.get(['unveil_settings']);
      if (!settings.unveil_settings?.autoApplyEnabled) return;

      // Get stored preferences for this domain
      const preferences = await this.getDomainPreference(domain);
      if (!preferences) return;

      console.log(`Auto-applying Unveil preferences for ${domain}:`, preferences);

      // Small delay to ensure page is fully loaded
      setTimeout(async () => {
        try {
          // Apply individual functions based on stored preferences
          if (preferences.unblur) {
            await chrome.scripting.executeScript({
              target: { tabId: tabId },
              function: () => window.unblurElements?.()
            });
          }

          if (preferences.enableCopy) {
            await chrome.scripting.executeScript({
              target: { tabId: tabId },
              function: () => window.enableCopyElements?.()
            });
          }

          if (preferences.removeOverlays) {
            await chrome.scripting.executeScript({
              target: { tabId: tabId },
              function: () => window.removeOverlayElements?.()
            });
          }

          if (preferences.cleanPage) {
            await chrome.scripting.executeScript({
              target: { tabId: tabId },
              function: () => window.cleanPageElements?.()
            });
          }

          if (preferences.darkMode) {
            await chrome.scripting.executeScript({
              target: { tabId: tabId },
              function: () => window.darkModeElements?.()
            });
          }

          if (preferences.toggleAll) {
            await chrome.scripting.executeScript({
              target: { tabId: tabId },
              function: () => window.toggleAllElements?.()
            });
          }

        } catch (error) {
          console.error('Error auto-applying preferences:', error);
        }
      }, 1000);

    } catch (error) {
      console.error('Failed to auto-apply preferences:', error);
    }
  }

  async saveDomainPreference(domain, preferences) {
    try {
      if (!chrome.storage || !chrome.storage.sync) {
        console.warn('Chrome storage sync not available');
        return;
      }
      
      const key = `unveil_domain_${domain}`;
      const existing = await chrome.storage.sync.get([key]);
      const updated = {
        ...existing[key],
        ...preferences,
        lastUpdated: Date.now()
      };
      
      await chrome.storage.sync.set({ [key]: updated });
      console.log(`Saved preferences for ${domain}:`, updated);
    } catch (error) {
      console.error('Failed to save domain preference:', error);
      // Fallback to local storage
      try {
        if (chrome.storage && chrome.storage.local) {
          const key = `unveil_domain_local_${domain}`;
          await chrome.storage.local.set({ [key]: updated });
          console.log('Saved to local storage as fallback');
        }
      } catch (localError) {
        console.error('Local storage fallback also failed:', localError);
      }
    }
  }

  async getDomainPreference(domain) {
    try {
      const key = `unveil_domain_${domain}`;
      const result = await chrome.storage.sync.get([key]);
      return result[key] || null;
    } catch (error) {
      console.error('Failed to get domain preference:', error);
      return null;
    }
  }

  // Public method to save individual feature preferences
  async saveFeaturePreference(domain, feature, enabled) {
    if (!domain) return;
    
    const preferences = await this.getDomainPreference(domain) || {};
    preferences[feature] = enabled;
    await this.saveDomainPreference(domain, preferences);
  }

  // Public method to clear domain preferences
  async clearDomainPreference(domain) {
    try {
      const key = `unveil_domain_${domain}`;
      await chrome.storage.sync.remove([key]);
      console.log(`Cleared preferences for ${domain}`);
    } catch (error) {
      console.error('Failed to clear domain preference:', error);
    }
  }
}

// Initialize background script
const unveilBackground = new UnveilBackground();

// Expose background instance for popup to use
self.unveilBackground = unveilBackground;