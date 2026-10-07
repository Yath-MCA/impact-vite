import { createContext, useContext, useState, useEffect } from 'react';
import { BRANDING, THEME } from '../../config/theme';

const ClientContext = createContext();

export const CLIENT_CONFIGS = {
  'default-client': {
    name: BRANDING.productName,
    theme: 'light',
    primaryColor: THEME.primary,
    logo: BRANDING.companyLogo,
    productIcon: BRANDING.productIcon,
    apiBaseUrl: 'https://api.default-client.com',
    features: {
      dashboard: true,
      adminDashboard: false,
      editor: true,
      pdfExport: true,
      collaboration: false
    },
    layout: {
      showHeader: true,
      showFooter: true,
      sidebarPosition: 'left'
    }
  },
  'enterprise-client': {
    name: `${BRANDING.productName} Enterprise`,
    theme: 'dark',
    primaryColor: THEME.primary,
    logo: BRANDING.companyLogo,
    productIcon: BRANDING.productIcon,
    apiBaseUrl: 'https://api.enterprise-client.com',
    features: {
      dashboard: true,
      adminDashboard: true,
      editor: true,
      pdfExport: true,
      collaboration: true,
      advancedAnalytics: true
    },
    layout: {
      showHeader: true,
      showFooter: false,
      sidebarPosition: 'right'
    }
  },
  'basic-client': {
    name: `${BRANDING.productName} Basic`,
    theme: 'light',
    primaryColor: THEME.primary,
    logo: BRANDING.companyLogo,
    productIcon: BRANDING.productIcon,
    apiBaseUrl: 'https://api.basic-client.com',
    features: {
      dashboard: true,
      adminDashboard: false,
      editor: true,
      pdfExport: false,
      collaboration: false
    },
    layout: {
      showHeader: true,
      showFooter: true,
      sidebarPosition: 'left'
    }
  }
};

export function ClientProvider({ children }) {
  const [clientConfig, setClientConfig] = useState(CLIENT_CONFIGS['default-client']);
  const [clientId, setClientId] = useState('default-client');

  const loadClientConfig = (client) => {
    const config = CLIENT_CONFIGS[client] || CLIENT_CONFIGS['default-client'];
    setClientConfig(config);
    setClientId(client);

    if (config.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const updateClientConfig = (updates) => {
    setClientConfig(prev => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    const savedClient = localStorage.getItem('lastClient');
    if (savedClient && CLIENT_CONFIGS[savedClient]) {
      loadClientConfig(savedClient);
    }

    // Check for dynamic branding from validateurl response in sessionStorage
    try {
      const validateRes = sessionStorage.getItem('xmleditor:validateuserpost');
      if (validateRes) {
        const response = JSON.parse(validateRes);
        const resData = response.data ?? response;
        const branding = resData.branding || resData.client_metadata || resData.client_config;

        if (branding) {
          updateClientConfig({
            name: branding.LOGO_ALT || resData.client || 'Impact Client',
            logo: branding.LOGO_SRC || branding.logo_src || branding.logoSrc,
            productIcon: branding.PRODUCT_ICON || branding.product_icon || branding.productIcon || BRANDING.productIcon,
            primaryColor: branding.PRIMARY_COLOR || THEME.primary
          });
        }
      }
    } catch (err) {
      console.warn('Failed to load branding from session:', err);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('lastClient', clientId);
  }, [clientId]);

  const value = {
    clientConfig,
    clientId,
    loadClientConfig,
    updateClientConfig,
    availableClients: Object.keys(CLIENT_CONFIGS)
  };

  return (
    <ClientContext.Provider value={value}>
      {children}
    </ClientContext.Provider>
  );
}

export const useClient = () => {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useClient must be used within ClientProvider');
  }
  return context;
};
