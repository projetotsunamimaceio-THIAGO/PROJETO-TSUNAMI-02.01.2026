
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-tsunami w-full flex flex-col items-center p-4 md:p-8 selection:bg-blue-500 selection:text-white">
      <div className="w-full max-w-7xl flex flex-col items-center">
        {children}
      </div>
    </div>
  );
};

export default Layout;
