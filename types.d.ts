import React from 'react';

/**
 * Global type definitions for commonly used props.
 * These are auto-applied across the project.
 */

declare global {
  /** Header Component Props */
  interface HeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string;
    showBack?: boolean;
    onBack?: () => void;
    showProfile?: boolean;
  }

  /** BottomNavigation Component Props */
  interface BottomNavigationProps
    extends React.HTMLAttributes<HTMLDivElement> {
    activeTab: string;
    setActiveTab: (tab: string) => void;
  }

  /** Verification Badge Props */
  interface VerificationStatusBadgeProps
    extends React.HTMLAttributes<HTMLDivElement> {
    status: 'pending' | 'verified' | 'unverified' | 'rejected';
    size?: 'sm' | 'md' | 'lg';
  }
}

export {};
