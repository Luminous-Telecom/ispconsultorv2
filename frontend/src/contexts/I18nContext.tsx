import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'pt-BR' | 'en-US' | 'es-ES';

interface TranslationKeys {
  // Navegação
  'nav.dashboard': string;
  'nav.clients': string;
  'nav.plans': string;
  'nav.banks': string;
  'nav.contracts': string;
  'nav.logout': string;

  // Ações comuns
  'actions.save': string;
  'actions.cancel': string;
  'actions.edit': string;
  'actions.delete': string;
  'actions.create': string;
  'actions.filter': string;
  'actions.export': string;
  'actions.import': string;

  // Mensagens
  'messages.confirmDelete': string;
  'messages.loading': string;
  'messages.noData': string;
  'messages.error': string;
  'messages.success': string;
  'messages.warning': string;

  // Formulários
  'form.required': string;
  'form.invalidEmail': string;
  'form.invalidCPF': string;
  'form.invalidCNPJ': string;

  // Status
  'status.active': string;
  'status.inactive': string;
  'status.pending': string;
  'status.approved': string;
  'status.rejected': string;

  // Dashboard
  'dashboard.title': string;
  'dashboard.totalClients': string;
  'dashboard.totalPlans': string;
  'dashboard.totalContracts': string;
  'dashboard.monthlyRevenue': string;

  // Pagination
  'pagination.to': string;
  'pagination.of': string;
  'pagination.perPage': string;
}

type Translations = Record<Language, TranslationKeys>;

const translations: Translations = {
  'pt-BR': {
    // Navegação
    'nav.dashboard': 'Dashboard',
    'nav.clients': 'Clientes',
    'nav.plans': 'Planos',
    'nav.banks': 'Bancos',
    'nav.contracts': 'Contratos',
    'nav.logout': 'Sair',

    // Ações comuns
    'actions.save': 'Salvar',
    'actions.cancel': 'Cancelar',
    'actions.edit': 'Editar',
    'actions.delete': 'Excluir',
    'actions.create': 'Criar',
    'actions.filter': 'Filtrar',
    'actions.export': 'Exportar',
    'actions.import': 'Importar',

    // Mensagens
    'messages.confirmDelete': 'Tem certeza que deseja excluir?',
    'messages.loading': 'Carregando...',
    'messages.noData': 'Nenhum dado encontrado',
    'messages.error': 'Ocorreu um erro',
    'messages.success': 'Operação realizada com sucesso',
    'messages.warning': 'Atenção',

    // Formulários
    'form.required': 'Campo obrigatório',
    'form.invalidEmail': 'E-mail inválido',
    'form.invalidCPF': 'CPF inválido',
    'form.invalidCNPJ': 'CNPJ inválido',

    // Status
    'status.active': 'Ativo',
    'status.inactive': 'Inativo',
    'status.pending': 'Pendente',
    'status.approved': 'Aprovado',
    'status.rejected': 'Rejeitado',

    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.totalClients': 'Total de Clientes',
    'dashboard.totalPlans': 'Total de Planos',
    'dashboard.totalContracts': 'Total de Contratos',
    'dashboard.monthlyRevenue': 'Receita Mensal',

    // Pagination
    'pagination.to': 'a',
    'pagination.of': 'de',
    'pagination.perPage': 'por página',
  },
  'en-US': {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.clients': 'Clients',
    'nav.plans': 'Plans',
    'nav.banks': 'Banks',
    'nav.contracts': 'Contracts',
    'nav.logout': 'Logout',

    // Common actions
    'actions.save': 'Save',
    'actions.cancel': 'Cancel',
    'actions.edit': 'Edit',
    'actions.delete': 'Delete',
    'actions.create': 'Create',
    'actions.filter': 'Filter',
    'actions.export': 'Export',
    'actions.import': 'Import',

    // Messages
    'messages.confirmDelete': 'Are you sure you want to delete?',
    'messages.loading': 'Loading...',
    'messages.noData': 'No data found',
    'messages.error': 'An error occurred',
    'messages.success': 'Operation completed successfully',
    'messages.warning': 'Warning',

    // Forms
    'form.required': 'Required field',
    'form.invalidEmail': 'Invalid email',
    'form.invalidCPF': 'Invalid CPF',
    'form.invalidCNPJ': 'Invalid CNPJ',

    // Status
    'status.active': 'Active',
    'status.inactive': 'Inactive',
    'status.pending': 'Pending',
    'status.approved': 'Approved',
    'status.rejected': 'Rejected',

    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.totalClients': 'Total Clients',
    'dashboard.totalPlans': 'Total Plans',
    'dashboard.totalContracts': 'Total Contracts',
    'dashboard.monthlyRevenue': 'Monthly Revenue',

    // Pagination
    'pagination.to': 'to',
    'pagination.of': 'of',
    'pagination.perPage': 'per page',
  },
  'es-ES': {
    // Navegación
    'nav.dashboard': 'Panel',
    'nav.clients': 'Clientes',
    'nav.plans': 'Planes',
    'nav.banks': 'Bancos',
    'nav.contracts': 'Contratos',
    'nav.logout': 'Salir',

    // Acciones comunes
    'actions.save': 'Guardar',
    'actions.cancel': 'Cancelar',
    'actions.edit': 'Editar',
    'actions.delete': 'Eliminar',
    'actions.create': 'Crear',
    'actions.filter': 'Filtrar',
    'actions.export': 'Exportar',
    'actions.import': 'Importar',

    // Mensajes
    'messages.confirmDelete': '¿Estás seguro de que quieres eliminar?',
    'messages.loading': 'Cargando...',
    'messages.noData': 'No se encontraron datos',
    'messages.error': 'Ocurrió un error',
    'messages.success': 'Operación completada con éxito',
    'messages.warning': 'Advertencia',

    // Formularios
    'form.required': 'Campo obligatorio',
    'form.invalidEmail': 'Correo electrónico inválido',
    'form.invalidCPF': 'CPF inválido',
    'form.invalidCNPJ': 'CNPJ inválido',

    // Estado
    'status.active': 'Activo',
    'status.inactive': 'Inactivo',
    'status.pending': 'Pendiente',
    'status.approved': 'Aprobado',
    'status.rejected': 'Rechazado',

    // Panel
    'dashboard.title': 'Panel',
    'dashboard.totalClients': 'Total de Clientes',
    'dashboard.totalPlans': 'Total de Planes',
    'dashboard.totalContracts': 'Total de Contratos',
    'dashboard.monthlyRevenue': 'Ingresos Mensuales',

    // Pagination
    'pagination.to': 'a',
    'pagination.of': 'de',
    'pagination.perPage': 'por página',
  },
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof TranslationKeys, params?: Record<string, unknown>) => string;
  availableLanguages: { code: Language; name: string; flag: string }[];
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const availableLanguages = [
  { code: 'pt-BR' as Language, name: 'Português', flag: '🇧🇷' },
  { code: 'en-US' as Language, name: 'English', flag: '🇺🇸' },
  { code: 'es-ES' as Language, name: 'Español', flag: '🇪🇸' },
];

// Normalizar código de idioma do navegador
const normalizeLanguage = (lang: string): Language => {
  const langLower = lang.toLowerCase();
  if (langLower.startsWith('pt')) return 'pt-BR';
  if (langLower.startsWith('en')) return 'en-US';
  if (langLower.startsWith('es')) return 'es-ES';
  return 'pt-BR';
};

// Função para obter o idioma inicial
const getInitialLanguage = (): Language => {
  if (typeof window === 'undefined') return 'pt-BR';
  
  const savedLang = localStorage.getItem('app-language') as Language | null;
  if (savedLang && availableLanguages.some(lang => lang.code === savedLang)) {
    return savedLang;
  }
  
  const browserLang = navigator.language || navigator.languages?.[0] || 'pt-BR';
  const normalizedLang = normalizeLanguage(browserLang);
  localStorage.setItem('app-language', normalizedLang);
  return normalizedLang;
};

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Usar lazy initialization para getInitialLanguage ser chamado apenas uma vez
  const [language, setLanguageState] = useState<Language>(() => getInitialLanguage());

  // Sincronizar com localStorage quando mudar externamente (ex: outra aba)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'app-language' && e.newValue) {
        const newLang = e.newValue as Language;
        if (availableLanguages.some(lang => lang.code === newLang)) {
          setLanguageState(newLang);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app-language', lang);
  };

  const t = (key: keyof TranslationKeys, params?: Record<string, unknown>): string => {
    let translation = translations[language][key] || translations['pt-BR'][key] || key;

    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(new RegExp(`\\$\\{${param}\\}`, 'g'), String(value));
      });
    }

    return translation;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, availableLanguages }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

// Hook simplificado para traduções comuns
export const useTranslation = () => {
  const { t } = useI18n();
  return { t };
};