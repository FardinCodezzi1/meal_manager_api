'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface AppConfigState {
  appName: string;
  appIconSvg: string;
  creatorName: string;
  creatorEmail: string;
  creatorPortfolio: string;
  creatorBio: string;
  broadcastNotice: string;
  noticeActive: boolean;
}

interface UserSummary {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isSuperAdmin: boolean;
  createdAt: string;
  currentRole: string;
  activeMess: {
    id: string;
    name: string;
    inviteCode: string;
    role: string;
    joinedAt: string;
  } | null;
}

interface MessSummary {
  id: string;
  name: string;
  inviteCode: string;
  managerId: string;
  managerName: string;
  managerEmail: string;
  totalMembersCount: number;
  activeMembersCount: number;
  createdAt: string;
}

interface PlatformStats {
  totalUsers: number;
  totalMesses: number;
  totalMeals: number;
  totalBazarAmount: number;
}

export default function SuperAdminConsole() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'config' | 'analytics' | 'users'>('config');

  // Auth State
  const [emailInput, setEmailInput] = useState('fardin1.codezzi@gmail.com');
  const [passwordInput, setPasswordInput] = useState('');
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    email: string;
    isSuperAdmin: boolean;
  } | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // App Config State
  const [config, setConfig] = useState<AppConfigState>({
    appName: 'Mess Meal Manager',
    appIconSvg: '',
    creatorName: 'Fardin Abu Ubaid',
    creatorEmail: 'fardin1.codezzi@gmail.com',
    creatorPortfolio: 'https://portfolio-fardin.vercel.app',
    creatorBio: 'Full-Stack Developer & Creator of Mess Meal Manager',
    broadcastNotice: 'Welcome to Mess Meal Manager! Real-time syncing is active.',
    noticeActive: true,
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Admin Data State
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [usersList, setUsersList] = useState<UserSummary[]>([]);
  const [messesList, setMessesList] = useState<MessSummary[]>([]);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false);
  const [deletingMessId, setDeletingMessId] = useState<string | null>(null);

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch initial config on load
  useEffect(() => {
    async function loadPublicConfig() {
      try {
        const res = await fetch('/api/config');
        if (res.ok) {
          const data = await res.json();
          if (data.config) {
            setConfig({
              appName: data.config.appName || 'Mess Meal Manager',
              appIconSvg: data.config.appIconSvg || '',
              creatorName: data.config.creatorName || 'Fardin Abu Ubaid',
              creatorEmail: data.config.creatorEmail || 'fardin1.codezzi@gmail.com',
              creatorPortfolio: data.config.creatorPortfolio || 'https://portfolio-fardin.vercel.app',
              creatorBio: data.config.creatorBio || 'Full-Stack Developer & Creator of Mess Meal Manager',
              broadcastNotice: data.config.broadcastNotice || '',
              noticeActive: Boolean(data.config.noticeActive),
            });
          }
        }
      } catch (err) {
        console.error('Failed to load initial config:', err);
      }
    }
    loadPublicConfig();

    // Check stored token
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('mmm_token') : null;
    if (storedToken) {
      setAuthToken(storedToken);
      fetchMe(storedToken);
    }
  }, []);

  // Fetch user profile with token
  async function fetchMe(token: string) {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        if (data.user?.isSuperAdmin || data.user?.email.toLowerCase() === 'fardin1.codezzi@gmail.com') {
          fetchAdminData(token);
        }
      } else {
        localStorage.removeItem('mmm_token');
        setAuthToken(null);
        setCurrentUser(null);
      }
    } catch {
      localStorage.removeItem('mmm_token');
      setAuthToken(null);
      setCurrentUser(null);
    }
  }

  // Fetch admin dashboard data
  async function fetchAdminData(token: string) {
    setIsLoadingAdmin(true);
    try {
      const res = await fetch('/api/admin', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setUsersList(data.users || []);
        setMessesList(data.messes || []);
      }
    } catch (err) {
      console.error('Failed to fetch admin statistics:', err);
    } finally {
      setIsLoadingAdmin(false);
    }
  }

  // Handle Login
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      showToast('Please enter both email and password', 'error');
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      setAuthToken(data.token);
      setCurrentUser(data.user);
      localStorage.setItem('mmm_token', data.token);
      showToast(`Welcome back, ${data.user.name}!`, 'success');

      if (data.user.isSuperAdmin || data.user.email.toLowerCase() === 'fardin1.codezzi@gmail.com') {
        fetchAdminData(data.token);
      }
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || 'Login error', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  }

  // Handle Logout
  function handleLogout() {
    localStorage.removeItem('mmm_token');
    setAuthToken(null);
    setCurrentUser(null);
    setStats(null);
    setUsersList([]);
    setMessesList([]);
    showToast('Logged out successfully', 'info');
  }

  // Save Config Changes
  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!authToken) {
      showToast('Please log in with admin credentials to save changes', 'error');
      return;
    }

    setIsSavingConfig(true);
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(config),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update configuration');
      }

      showToast('App configuration and branding updated successfully!', 'success');
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || 'Error saving config', 'error');
    } finally {
      setIsSavingConfig(false);
    }
  }

  // Delete Mess (Super Admin)
  async function handleDeleteMess(messId: string, messName: string) {
    if (!confirm(`Are you sure you want to permanently delete mess "${messName}"? This will delete all member records, meals, and bazars for this mess.`)) {
      return;
    }

    if (!authToken) return;
    setDeletingMessId(messId);

    try {
      const res = await fetch(`/api/admin/messes/${messId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete mess');
      }

      showToast(`Mess "${messName}" was deleted.`, 'info');
      fetchAdminData(authToken);
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || 'Deletion failed', 'error');
    } finally {
      setDeletingMessId(null);
    }
  }

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    if (!searchUserQuery.trim()) return usersList;
    const q = searchUserQuery.toLowerCase();
    return usersList.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q)) ||
        (u.activeMess && u.activeMess.name.toLowerCase().includes(q))
    );
  }, [usersList, searchUserQuery]);

  const isSuperAdminUser = currentUser?.isSuperAdmin || currentUser?.email.toLowerCase() === 'fardin1.codezzi@gmail.com';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: '600',
            backgroundColor: toast.type === 'success' ? '#059669' : toast.type === 'error' ? '#dc2626' : '#2563eb',
            color: '#fff',
            transition: 'all 0.3s ease',
          }}
        >
          {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'} {toast.message}
        </div>
      )}

      {/* Top Header */}
      <header
        style={{
          borderBottom: '1px solid #1e293b',
          backgroundColor: '#090d16',
          padding: '16px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
              fontSize: '22px',
            }}
          >
            🥘
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#f8fafc', letterSpacing: '-0.02em' }}>
              Mess Meal Manager — Super Admin & CMS Console
            </h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
              Dynamic Branding • Mobile WebView CMS • Platform Statistics
            </p>
          </div>
        </div>

        {/* Action Links & Swagger Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <a
            href="/docs"
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '8px 14px',
              backgroundColor: '#1e293b',
              color: '#38bdf8',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              textDecoration: 'none',
              border: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            📖 Swagger UI
          </a>
          <a
            href="/api/openapi.json"
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '8px 14px',
              backgroundColor: '#1e293b',
              color: '#94a3b8',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              textDecoration: 'none',
              border: '1px solid #334155',
            }}
          >
            📄 OpenAPI Spec
          </a>
        </div>
      </header>

      {/* Auth Bar */}
      <section
        style={{
          backgroundColor: '#111827',
          borderBottom: '1px solid #1f2937',
          padding: '12px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', width: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {isSuperAdminUser ? (
                <div
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.5)',
                    color: '#fbbf24',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 0 16px rgba(245, 158, 11, 0.25)',
                  }}
                >
                  👑 Super Admin: Fardin Abu Ubaid
                </div>
              ) : (
                <div style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: '600' }}>
                  Logged in as: <span style={{ color: '#38bdf8' }}>{currentUser.email}</span>
                </div>
              )}
              <span style={{ color: '#64748b', fontSize: '13px' }}>({currentUser.name})</span>
            </div>

            <button
              onClick={handleLogout}
              style={{
                backgroundColor: '#374151',
                color: '#f9fafb',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', width: '100%' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>🔐 Admin Login:</span>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Admin Email"
              style={{
                padding: '7px 12px',
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '6px',
                color: '#f9fafb',
                fontSize: '13px',
                minWidth: '220px',
              }}
            />
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Password"
              style={{
                padding: '7px 12px',
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '6px',
                color: '#f9fafb',
                fontSize: '13px',
                minWidth: '150px',
              }}
            />
            <button
              type="submit"
              disabled={isLoggingIn}
              style={{
                backgroundColor: '#2563eb',
                color: '#fff',
                border: 'none',
                padding: '7px 16px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              {isLoggingIn ? 'Authenticating...' : 'Sign In as Super Admin'}
            </button>
            <span style={{ fontSize: '12px', color: '#64748b', marginLeft: 'auto' }}>
              Default Super Admin: <code style={{ color: '#fbbf24' }}>fardin1.codezzi@gmail.com</code>
            </span>
          </form>
        )}
      </section>

      {/* Navigation Tabs */}
      <div style={{ borderBottom: '1px solid #1e293b', padding: '0 24px', display: 'flex', gap: '8px', backgroundColor: '#0b1120' }}>
        <button
          onClick={() => setActiveTab('config')}
          style={{
            padding: '14px 20px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'config' ? '3px solid #f59e0b' : '3px solid transparent',
            color: activeTab === 'config' ? '#fbbf24' : '#94a3b8',
            fontWeight: activeTab === 'config' ? '700' : '500',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          🎨 Tab 1: App Config & Creator Branding
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          style={{
            padding: '14px 20px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'analytics' ? '3px solid #38bdf8' : '3px solid transparent',
            color: activeTab === 'analytics' ? '#38bdf8' : '#94a3b8',
            fontWeight: activeTab === 'analytics' ? '700' : '500',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          📊 Tab 2: Platform Analytics & Messes
        </button>

        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '14px 20px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'users' ? '3px solid #10b981' : '3px solid transparent',
            color: activeTab === 'users' ? '#34d399' : '#94a3b8',
            fontWeight: activeTab === 'users' ? '700' : '500',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          👥 Tab 3: User Directory
        </button>
      </div>

      {/* Main Content Area */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>

        {/* TAB 1: App Config & Live Phone Mockup */}
        {activeTab === 'config' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '32px', alignItems: 'start' }}>
            
            {/* Form Column */}
            <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#f8fafc' }}>
                    Branding & Announcement CMS
                  </h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                    Modifications synchronize instantly with Android WebViews and Web clients.
                  </p>
                </div>
                <div style={{ padding: '4px 10px', backgroundColor: '#0f172a', borderRadius: '20px', fontSize: '12px', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                  Singleton Config
                </div>
              </div>

              <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                    App Header Title
                  </label>
                  <input
                    type="text"
                    value={config.appName}
                    onChange={(e) => setConfig({ ...config, appName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                      Creator Name
                    </label>
                    <input
                      type="text"
                      value={config.creatorName}
                      onChange={(e) => setConfig({ ...config, creatorName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        backgroundColor: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                      Creator Email
                    </label>
                    <input
                      type="email"
                      value={config.creatorEmail}
                      onChange={(e) => setConfig({ ...config, creatorEmail: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        backgroundColor: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                    Creator Portfolio URL
                  </label>
                  <input
                    type="url"
                    value={config.creatorPortfolio}
                    onChange={(e) => setConfig({ ...config, creatorPortfolio: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
                    Creator Bio
                  </label>
                  <textarea
                    rows={2}
                    value={config.creatorBio}
                    onChange={(e) => setConfig({ ...config, creatorBio: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#cbd5e1' }}>
                      Custom App Icon SVG (optional)
                    </label>
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, appIconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f59e0b" width="28" height="28"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/></svg>' })}
                      style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Insert Fork/Knife SVG
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="<svg ...>...</svg>"
                    value={config.appIconSvg}
                    onChange={(e) => setConfig({ ...config, appIconSvg: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#38bdf8',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Announcement Banner */}
                <div style={{ backgroundColor: '#090d16', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      📢 Announcement Banner
                    </span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#cbd5e1' }}>
                      <input
                        type="checkbox"
                        checked={config.noticeActive}
                        onChange={(e) => setConfig({ ...config, noticeActive: e.target.checked })}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      Notice Active
                    </label>
                  </div>

                  <input
                    type="text"
                    placeholder="Broadcast text shown across mobile apps..."
                    value={config.broadcastNotice}
                    onChange={(e) => setConfig({ ...config, broadcastNotice: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingConfig}
                  style={{
                    backgroundColor: '#f59e0b',
                    color: '#0f172a',
                    border: 'none',
                    padding: '14px',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
                    transition: 'all 0.2s',
                  }}
                >
                  {isSavingConfig ? 'Saving...' : '💾 Save Changes (PUT /api/config)'}
                </button>
              </form>
            </div>

            {/* Live Phone Mockup Column */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ marginBottom: '12px', fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>
                📱 Real-Time Android WebView / Mobile Preview
              </div>

              {/* Realistic Phone Shell */}
              <div
                style={{
                  width: '320px',
                  height: '640px',
                  backgroundColor: '#000',
                  borderRadius: '44px',
                  border: '8px solid #334155',
                  boxShadow: '0 25px 60px -15px rgba(0,0,0,0.8), 0 0 20px rgba(56, 189, 248, 0.2)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Phone Notch */}
                <div
                  style={{
                    position: 'absolute',
                    top: '0',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '120px',
                    height: '22px',
                    backgroundColor: '#1e293b',
                    borderBottomLeftRadius: '14px',
                    borderBottomRightRadius: '14px',
                    zIndex: 50,
                  }}
                />

                {/* Status Bar */}
                <div
                  style={{
                    height: '36px',
                    padding: '0 20px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    color: '#94a3b8',
                    fontWeight: '600',
                    paddingBottom: '4px',
                    backgroundColor: '#090d16',
                  }}
                >
                  <span>9:41</span>
                  <span>5G 100%</span>
                </div>

                {/* Mobile App Header */}
                <div
                  style={{
                    backgroundColor: '#0f172a',
                    borderBottom: '1px solid #1e293b',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  {config.appIconSvg ? (
                    <div
                      style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      dangerouslySetInnerHTML={{ __html: config.appIconSvg }}
                    />
                  ) : (
                    <span style={{ fontSize: '22px' }}>🥘</span>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {config.appName || 'Mess Meal Manager'}
                    </div>
                  </div>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                </div>

                {/* Mobile Broadcast Notice Banner */}
                {config.noticeActive && config.broadcastNotice && (
                  <div
                    style={{
                      backgroundColor: '#d97706',
                      color: '#ffffff',
                      padding: '8px 12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      borderBottom: '1px solid #b45309',
                    }}
                  >
                    <span>⚡</span>
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {config.broadcastNotice}
                    </span>
                  </div>
                )}

                {/* Phone Inner Body */}
                <div style={{ flex: 1, padding: '16px', backgroundColor: '#020617', overflowY: 'auto' }}>
                  
                  {/* Mockup Meal Card */}
                  <div style={{ backgroundColor: '#0f172a', borderRadius: '12px', padding: '14px', border: '1px solid #1e293b', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Today's Meals</span>
                      <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: '600' }}>Active Month</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc' }}>1.0</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Lunch</div>
                      </div>
                      <div style={{ borderLeft: '1px solid #1e293b' }} />
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc' }}>1.0</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Dinner</div>
                      </div>
                      <div style={{ borderLeft: '1px solid #1e293b' }} />
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>৳65</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Rate</div>
                      </div>
                    </div>
                  </div>

                  {/* Creator Profile Card (Dynamic CMS Preview) */}
                  <div
                    style={{
                      background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
                      borderRadius: '12px',
                      padding: '16px',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                          fontWeight: '800',
                          color: '#fff',
                        }}
                      >
                        {config.creatorName ? config.creatorName.charAt(0) : 'F'}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {config.creatorName} <span style={{ color: '#38bdf8', fontSize: '12px' }}>✓</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {config.creatorEmail}
                        </div>
                      </div>
                    </div>

                    <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.4' }}>
                      {config.creatorBio}
                    </p>

                    <a
                      href={config.creatorPortfolio}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'block',
                        textAlign: 'center',
                        backgroundColor: '#f59e0b',
                        color: '#0f172a',
                        padding: '7px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        textDecoration: 'none',
                      }}
                    >
                      Visit Creator Portfolio →
                    </a>
                  </div>

                </div>

                {/* Bottom Home Indicator */}
                <div style={{ height: '18px', backgroundColor: '#020617', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ width: '80px', height: '4px', backgroundColor: '#475569', borderRadius: '2px' }} />
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: Platform Analytics & Mess Management */}
        {activeTab === 'analytics' && (
          <div>
            {!isSuperAdminUser ? (
              <div style={{ backgroundColor: '#1e293b', padding: '32px', borderRadius: '12px', textAlign: 'center', border: '1px solid #334155' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</div>
                <h3 style={{ margin: '0 0 8px 0', color: '#f8fafc' }}>Super Admin Authorization Required</h3>
                <p style={{ margin: '0 0 20px 0', color: '#94a3b8', fontSize: '14px' }}>
                  Please sign in with <code style={{ color: '#fbbf24' }}>fardin1.codezzi@gmail.com</code> above to view platform analytics and manage messes.
                </p>
              </div>
            ) : (
              <div>
                {/* 4 KPI Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                  
                  <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600', marginBottom: '6px' }}>👥 TOTAL REGISTERED USERS</div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: '#38bdf8' }}>
                      {stats ? stats.totalUsers : '...'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Active database profiles</div>
                  </div>

                  <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600', marginBottom: '6px' }}>🏠 TOTAL ACTIVE MESSES</div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: '#f59e0b' }}>
                      {stats ? stats.totalMesses : '...'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Managed room groups</div>
                  </div>

                  <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600', marginBottom: '6px' }}>🍽️ TOTAL RECORDED MEALS</div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: '#10b981' }}>
                      {stats ? stats.totalMeals : '...'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Cumulative lunch & dinner</div>
                  </div>

                  <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600', marginBottom: '6px' }}>৳ APPROVED BAZAR TOTAL</div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: '#ec4899' }}>
                      ৳{stats ? stats.totalBazarAmount.toLocaleString() : '...'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Approved grocery expenditures</div>
                  </div>

                </div>

                {/* Mess Management Table */}
                <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '17px', color: '#f8fafc' }}>
                      Messes Management ({messesList.length})
                    </h3>
                    {authToken && (
                      <button
                        onClick={() => fetchAdminData(authToken)}
                        disabled={isLoadingAdmin}
                        style={{ background: '#334155', border: 'none', color: '#cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                      >
                        {isLoadingAdmin ? 'Refreshing...' : '🔄 Refresh'}
                      </button>
                    )}
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #334155', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>
                          <th style={{ padding: '12px 14px' }}>Mess Name</th>
                          <th style={{ padding: '12px 14px' }}>Invite Code</th>
                          <th style={{ padding: '12px 14px' }}>Manager</th>
                          <th style={{ padding: '12px 14px' }}>Active Members</th>
                          <th style={{ padding: '12px 14px' }}>Created Date</th>
                          <th style={{ padding: '12px 14px', textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {messesList.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                              No messes created yet.
                            </td>
                          </tr>
                        ) : (
                          messesList.map((m) => (
                            <tr key={m.id} style={{ borderBottom: '1px solid #334155' }}>
                              <td style={{ padding: '14px', fontWeight: '600', color: '#f8fafc' }}>{m.name}</td>
                              <td style={{ padding: '14px' }}>
                                <span style={{ backgroundColor: '#0f172a', border: '1px solid #475569', padding: '3px 8px', borderRadius: '4px', fontFamily: 'monospace', color: '#38bdf8' }}>
                                  {m.inviteCode}
                                </span>
                              </td>
                              <td style={{ padding: '14px' }}>
                                <div style={{ color: '#e2e8f0', fontWeight: '500' }}>{m.managerName}</div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>{m.managerEmail}</div>
                              </td>
                              <td style={{ padding: '14px' }}>
                                <span style={{ backgroundColor: '#064e3b', color: '#6ee7b7', padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                                  {m.activeMembersCount} active ({m.totalMembersCount} total)
                                </span>
                              </td>
                              <td style={{ padding: '14px', color: '#94a3b8', fontSize: '13px' }}>
                                {new Date(m.createdAt).toLocaleDateString()}
                              </td>
                              <td style={{ padding: '14px', textAlign: 'right' }}>
                                <button
                                  onClick={() => handleDeleteMess(m.id, m.name)}
                                  disabled={deletingMessId === m.id}
                                  style={{
                                    backgroundColor: '#7f1d1d',
                                    color: '#fca5a5',
                                    border: '1px solid #b91c1c',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {deletingMessId === m.id ? 'Deleting...' : '🗑️ Delete Mess'}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: User Directory */}
        {activeTab === 'users' && (
          <div>
            {!isSuperAdminUser ? (
              <div style={{ backgroundColor: '#1e293b', padding: '32px', borderRadius: '12px', textAlign: 'center', border: '1px solid #334155' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</div>
                <h3 style={{ margin: '0 0 8px 0', color: '#f8fafc' }}>Super Admin Authorization Required</h3>
                <p style={{ margin: '0 0 20px 0', color: '#94a3b8', fontSize: '14px' }}>
                  Please sign in with <code style={{ color: '#fbbf24' }}>fardin1.codezzi@gmail.com</code> to browse and search the user directory.
                </p>
              </div>
            ) : (
              <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #334155' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', color: '#f8fafc' }}>
                      Registered User Directory ({filteredUsers.length} / {usersList.length})
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                      Search by user name, email, phone number, or mess name.
                    </p>
                  </div>

                  <input
                    type="text"
                    value={searchUserQuery}
                    onChange={(e) => setSearchUserQuery(e.target.value)}
                    placeholder="🔍 Filter users..."
                    style={{
                      padding: '8px 14px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      minWidth: '260px',
                    }}
                  />
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #334155', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px 14px' }}>User</th>
                        <th style={{ padding: '12px 14px' }}>Email</th>
                        <th style={{ padding: '12px 14px' }}>Phone</th>
                        <th style={{ padding: '12px 14px' }}>Current Mess</th>
                        <th style={{ padding: '12px 14px' }}>Role</th>
                        <th style={{ padding: '12px 14px' }}>Registered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                            No users matched your query.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => (
                          <tr key={u.id} style={{ borderBottom: '1px solid #334155' }}>
                            <td style={{ padding: '14px', fontWeight: '600', color: '#f8fafc' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>{u.name}</span>
                                {u.isSuperAdmin && (
                                  <span style={{ backgroundColor: '#78350f', color: '#fbbf24', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                                    👑 Super Admin
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '14px', color: '#94a3b8' }}>{u.email}</td>
                            <td style={{ padding: '14px', color: '#cbd5e1' }}>{u.phone || '—'}</td>
                            <td style={{ padding: '14px' }}>
                              {u.activeMess ? (
                                <span style={{ backgroundColor: '#1e1b4b', color: '#a5b4fc', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '600' }}>
                                  {u.activeMess.name} ({u.activeMess.inviteCode})
                                </span>
                              ) : (
                                <span style={{ color: '#64748b', fontSize: '12px' }}>No active mess</span>
                              )}
                            </td>
                            <td style={{ padding: '14px' }}>
                              {u.currentRole === 'MANAGER' ? (
                                <span style={{ backgroundColor: '#78350f', color: '#fde68a', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                                  MANAGER
                                </span>
                              ) : u.currentRole === 'MEMBER' ? (
                                <span style={{ backgroundColor: '#064e3b', color: '#a7f3d0', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                                  MEMBER
                                </span>
                              ) : (
                                <span style={{ color: '#64748b', fontSize: '12px' }}>NONE</span>
                              )}
                            </td>
                            <td style={{ padding: '14px', color: '#94a3b8', fontSize: '13px' }}>
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
