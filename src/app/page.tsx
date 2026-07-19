import { Dashboard } from "@/components/dashboard";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background font-sans antialiased selection:bg-primary/20 selection:text-primary">
      {/* Background Pattern */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-dot-pattern-light dark:bg-dot-pattern opacity-50"></div>
      
      {/* Soft Gradient Overlay */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-tr from-background via-background/80 to-primary/5 dark:to-primary/10"></div>
      
      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl">
        <Dashboard />
      </div>
    </div>
  );
}
