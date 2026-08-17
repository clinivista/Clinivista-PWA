import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, useSearch, Redirect, Router as WouterRouter } from 'wouter';
import { LanguageProvider } from '@/lib/language';

import Home from '@/pages/home';
import Patient from '@/pages/patient';
import Admin from '@/pages/admin';
import Login from '@/pages/login';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function HomeWithTokenRedirect() {
  // Legacy invitation links pointed to /?token=TOKEN — forward them to /patient
  const search = useSearch();
  const token = new URLSearchParams(search).get('token');
  if (token) {
    return <Redirect to={`/patient?token=${encodeURIComponent(token)}`} replace />;
  }
  return <Home />;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={HomeWithTokenRedirect} />
        <Route path="/patient" component={Patient} />
        <Route path="/admin" component={Admin} />
        <Route path="/admin/login" component={Login} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </LanguageProvider>
  );
}

export default App;
