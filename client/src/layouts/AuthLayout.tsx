import { Outlet, Link } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-arg-purple-500/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[300px] bg-arg-cyan-500/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Logo */}
      <Link to="/" className="mb-8 flex items-center gap-3 z-10">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-arg-purple-500 to-arg-cyan-500 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="35" stroke="currentColor" strokeWidth="4"/>
            <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="2"/>
            <circle cx="50" cy="50" r="8" fill="currentColor"/>
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold gradient-text">ARG Studio</h1>
          <p className="text-xs text-gray-500">ARG Collaboration Platform</p>
        </div>
      </Link>

      {/* Auth form container */}
      <div className="w-full max-w-md z-10">
        <Outlet />
      </div>

      {/* Footer */}
      <p className="mt-8 text-sm text-gray-500 z-10">
        Create immersive alternate reality experiences
      </p>
    </div>
  );
}
