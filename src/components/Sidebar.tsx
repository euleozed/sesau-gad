import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Menu, X, BarChart2, FileText } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useAuth } from '@/contexts/AuthContext';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();
  const { logout } = useAuth();

  const toggle = () => {
    setIsOpen(!isOpen);
  };

  // Adicionar a nova página "Produção por Setor"
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { name: 'Produção por Setor', path: '/producao', icon: <BarChart2 className="h-5 w-5" /> },
    { name: 'Processos', path: '/processos', icon: <FileText className="h-5 w-5" /> },
  ];

  return (
    <div className="relative h-screen">
      <div
        className={cn(
          "fixed h-screen bg-sidebar shadow-lg transition-all duration-300 z-30",
          isOpen ? "w-64" : "w-16"
        )}
      >
        <div className="flex items-center justify-between h-16 px-4">
          {isOpen && (
            <h1 className="text-xl font-bold text-sidebar-foreground">
              Menu
            </h1>
          )}
          <button
            onClick={toggle}
            className="p-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div className="py-4">
          <nav className="space-y-1 px-2">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center px-2 py-3 text-sidebar-foreground rounded-md transition-colors",
                  location.pathname === item.path
                    ? "bg-sidebar-accent"
                    : "hover:bg-sidebar-accent/50"
                )}
              >
                <div className="mx-2">{item.icon}</div>
                {isOpen && <span className="ml-2">{item.name}</span>}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      
      {/* Spacer to push content to the right */}
      <div className={`transition-all duration-300 ${isOpen ? "ml-64" : "ml-16"}`}></div>
    </div>
  );
};

export default Sidebar;
