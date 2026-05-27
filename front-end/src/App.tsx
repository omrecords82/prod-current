import { CssBaseline, ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useContext, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css'; // Import Tailwind CSS
import AdminMessageNotification from './components/AdminMessageNotification';
import { ErrorBoundary } from './components/ErrorBoundary';
import FilterErrorBoundary from './components/ErrorBoundary/FilterErrorBoundary';
import UpdateAvailableBanner from './components/global/UpdateAvailableBanner';
import { AuthProvider } from './context/AuthContext';
import { ChurchProvider } from './context/ChurchContext';
import { ChurchRecordsProvider } from './context/ChurchRecordsContext';
import { CustomizerContext } from './context/CustomizerContext';
import { EnvironmentProvider } from './context/EnvironmentContext';
import { LanguageProvider } from './context/LanguageContext';
import { MenuVisibilityProvider } from './context/MenuVisibilityContext';
import { NotificationProvider } from './context/NotificationContext';
import { WebSocketProvider } from './context/WebSocketContext';
import LiturgicalThemeSync from './features/liturgical-calendar/LiturgicalThemeSync';
import RTL from './layouts/full/shared/customizer/RTL';
import router from './routes/Router';
import { ThemeSettings } from './theme/Theme';
import { setupAxiosInterceptors } from './utils/axiosInterceptor';

// Import Orthodox Theme System
//import { ThemeProvider as OrthodoxThemeProvider } from './context/ThemeContext';
//import './styles/themes/orthodox-traditional.css';
//import './styles/themes/lent-season.css';
//import './styles/themes/pascha-theme.css';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes (previously cacheTime)
    },
  },
});



function App() {

  const theme = ThemeSettings();
  const { activeDir, activeMode } = useContext(CustomizerContext);

  // Set up global axios interceptors for 401 error handling
  useEffect(() => {
    console.log('🚀 Setting up global axios interceptors...');
    setupAxiosInterceptors();
  }, []);


  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
      <AuthProvider>
        <ChurchProvider>
          <EnvironmentProvider>
            <WebSocketProvider>
              <ChurchRecordsProvider>
                <MenuVisibilityProvider>
                  <NotificationProvider>
                  <ThemeProvider theme={theme}>
                    <RTL direction={activeDir}>
                      <CssBaseline />
                      <div 
                        className="orthodox-app" 
                        data-theme={activeMode}
                        style={{ 
                          minHeight: '100vh',
                          backgroundColor: theme.palette.background.default,
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <ErrorBoundary>
                          <FilterErrorBoundary>
                            <LiturgicalThemeSync />
                            <AdminMessageNotification />
                            <UpdateAvailableBanner />
                            <RouterProvider router={router} />
                            <ToastContainer
                              position="top-right"
                              autoClose={3000}
                              hideProgressBar={false}
                              newestOnTop={false}
                              closeOnClick
                              rtl={false}
                              pauseOnFocusLoss
                              draggable
                              pauseOnHover
                              theme="light"
                            />
                          </FilterErrorBoundary>
                        </ErrorBoundary>
                      </div>
                      <ReactQueryDevtools initialIsOpen={false} />
                    </RTL>
                  </ThemeProvider>
                  </NotificationProvider>
                </MenuVisibilityProvider>
              </ChurchRecordsProvider>
            </WebSocketProvider>
          </EnvironmentProvider>
        </ChurchProvider>
      </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
