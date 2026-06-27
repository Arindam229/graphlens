import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AuroraBackground } from '@/components/aceternity/aurora-background';
import { GridBackground }   from '@/components/aceternity/grid-background';
import { SignInLayout }     from '@/components/auth/SignInLayout';
import { Dashboard }        from './Dashboard';
import { useTheme }         from '@/hooks/useTheme';

function Inner() {
  const { token, user, loading } = useAuth();
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <span className="size-6 rounded-full border-2 border-green-500/30 border-t-green-500 animate-spin"/>
      </div>
    );
  }

  if (!token || !user) {
    return (
      <GridBackground className={`transition-colors duration-300 ${isDark ? '' : 'light'}`}>
        {isDark ? (
          <AuroraBackground className="min-h-dvh" showRadialGradient>
            <SignInLayout isDark={isDark} toggle={toggle}/>
          </AuroraBackground>
        ) : (
          <div className="relative min-h-dvh bg-background overflow-hidden">
            <div className="pointer-events-none absolute top-[-5%] left-[10%] w-[700px] h-[500px] rounded-full bg-green-500/6 blur-[130px]"/>
            <div className="pointer-events-none absolute bottom-0 right-[10%] w-[500px] h-[400px] rounded-full bg-cyan-500/5 blur-[110px]"/>
            <SignInLayout isDark={isDark} toggle={toggle}/>
          </div>
        )}
      </GridBackground>
    );
  }

  return <Dashboard isDark={isDark} toggle={toggle}/>;
}

export default function App() {
  return (
    <AuthProvider>
      <Inner/>
    </AuthProvider>
  );
}
