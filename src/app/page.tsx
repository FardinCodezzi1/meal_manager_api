'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  UtensilsCrossed,
  BookOpen,
  FileCode2,
  Crown,
  Lock,
  Palette,
  BarChart3,
  Users,
  Megaphone,
  Save,
  Smartphone,
  Zap,
  Home,
  Coins,
  RefreshCw,
  Trash2,
  Search,
  KeyRound,
  Dices,
  Copy,
  Eye,
  EyeOff,
  Check,
  X,
  Info,
  LogOut,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

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

  // Edit User / Reset Password Modal State
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserSummary | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    newPassword: '',
    isSuperAdmin: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

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

    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('mmm_token') : null;
    if (storedToken) {
      setAuthToken(storedToken);
      fetchMe(storedToken);
    }
  }, []);

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

  function handleLogout() {
    localStorage.removeItem('mmm_token');
    setAuthToken(null);
    setCurrentUser(null);
    setStats(null);
    setUsersList([]);
    setMessesList([]);
    showToast('Logged out successfully', 'info');
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    if (!authToken) {
      showToast('Please sign in with admin credentials to save changes', 'error');
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

      showToast('App branding and broadcast notice saved successfully!', 'success');
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || 'Error saving config', 'error');
    } finally {
      setIsSavingConfig(false);
    }
  }

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

  function openEditUserModal(u: UserSummary) {
    setSelectedUserForEdit(u);
    setEditUserForm({
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      newPassword: '',
      isSuperAdmin: Boolean(u.isSuperAdmin),
    });
    setShowPassword(false);
  }

  function generateRandomPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setEditUserForm((prev) => ({ ...prev, newPassword: pass }));
    setShowPassword(true);
    showToast('Strong password generated!', 'info');
  }

  function copyCredentials() {
    if (!editUserForm.newPassword) {
      showToast('Enter or generate a new password first to copy credentials', 'error');
      return;
    }
    const text = `Mess Meal Manager Account Credentials:\nEmail: ${editUserForm.email}\nNew Password: ${editUserForm.newPassword}`;
    navigator.clipboard.writeText(text);
    showToast('Credentials copied to clipboard!', 'success');
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUserForEdit || !authToken) return;

    setIsUpdatingUser(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUserForEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(editUserForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      showToast(
        editUserForm.newPassword
          ? `User "${editUserForm.name}" updated & password reset successfully!`
          : `User "${editUserForm.name}" profile updated!`,
        'success'
      );
      setSelectedUserForEdit(null);
      fetchAdminData(authToken);
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || 'Error updating user', 'error');
    } finally {
      setIsUpdatingUser(false);
    }
  }

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
      
      {/* Mobile Responsive Helper CSS */}
      <style>{`
        @media (max-width: 768px) {
          .header-container {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
            padding: 12px 16px !important;
          }
          .header-actions {
            width: 100% !important;
            justify-content: flex-start !important;
          }
          .auth-bar-container {
            padding: 12px 16px !important;
          }
          .auth-form-flex {
            flex-direction: column !important;
            align-items: stretch !important;
            width: 100% !important;
          }
          .auth-form-flex input, .auth-form-flex button {
            width: 100% !important;
          }
          .tabs-scroll {
            padding: 0 12px !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .tab-btn-text {
            font-size: 13px !important;
            padding: 10px 12px !important;
            white-space: nowrap !important;
          }
          .main-layout {
            padding: 16px 12px !important;
          }
          .config-split-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
          .stats-kpi-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 12px !important;
          }
          .phone-mockup-outer {
            width: 100% !important;
            display: flex !important;
            justify-content: center !important;
          }
          .phone-mockup-frame {
            width: 100% !important;
            max-width: 310px !important;
            height: 560px !important;
          }
          .modal-window {
            padding: 18px !important;
            max-height: 92vh !important;
          }
          .form-2col-responsive {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
        }
      `}</style>

      {/* Floating Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '16px',
            right: '16px',
            zIndex: 9999,
            padding: '10px 16px',
            borderRadius: '6px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: '600',
            backgroundColor: toast.type === 'success' ? '#059669' : toast.type === 'error' ? '#dc2626' : '#2563eb',
            color: '#fff',
            transition: 'all 0.3s ease',
            maxWidth: '90vw',
          }}
        >
          {toast.type === 'success' ? <Check size={16} /> : toast.type === 'error' ? <X size={16} /> : <Info size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <header
        className="header-container"
        style={{
          borderBottom: '1px solid #1e293b',
          backgroundColor: '#090d16',
          padding: '14px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
              color: '#0f172a',
            }}
          >
            <UtensilsCrossed size={20} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#f8fafc', letterSpacing: '-0.01em' }}>
              Mess Meal Manager — Super Admin & CMS Console
            </h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
              Dynamic Branding • Mobile WebView CMS • Platform Statistics
            </p>
          </div>
        </div>

        {/* Action Links */}
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <a
            href="/docs"
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '7px 12px',
              backgroundColor: '#1e293b',
              color: '#38bdf8',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              textDecoration: 'none',
              border: '1px solid #334155',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <BookOpen size={14} /> Swagger UI
          </a>
          <a
            href="/api/openapi.json"
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '7px 12px',
              backgroundColor: '#1e293b',
              color: '#94a3b8',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              textDecoration: 'none',
              border: '1px solid #334155',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileCode2 size={14} /> OpenAPI Spec
          </a>
        </div>
      </header>

      {/* Auth Bar */}
      <section
        className="auth-bar-container"
        style={{
          backgroundColor: '#111827',
          borderBottom: '1px solid #1f2937',
          padding: '10px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', width: '100%', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {isSuperAdminUser ? (
                <div
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.5)',
                    color: '#fbbf24',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Crown size={15} color="#fbbf24" /> Super Admin: Fardin Abu Ubaid
                </div>
              ) : (
                <div style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: '600' }}>
                  Logged in: <span style={{ color: '#38bdf8' }}>{currentUser.email}</span>
                </div>
              )}
              <span style={{ color: '#64748b', fontSize: '12px' }}>({currentUser.name})</span>
            </div>

            <button
              onClick={handleLogout}
              style={{
                backgroundColor: '#374151',
                color: '#f9fafb',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="auth-form-flex" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Lock size={13} /> Admin Login:
            </span>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Admin Email"
              style={{
                padding: '7px 10px',
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '6px',
                color: '#f9fafb',
                fontSize: '13px',
                flex: '1 1 180px',
              }}
            />
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Password"
              style={{
                padding: '7px 10px',
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '6px',
                color: '#f9fafb',
                fontSize: '13px',
                flex: '1 1 140px',
              }}
            />
            <button
              type="submit"
              disabled={isLoggingIn}
              style={{
                backgroundColor: '#2563eb',
                color: '#fff',
                border: 'none',
                padding: '7px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Crown size={14} /> {isLoggingIn ? 'Authenticating...' : 'Sign In as Super Admin'}
            </button>
            <span style={{ fontSize: '11px', color: '#64748b', marginLeft: 'auto' }}>
              Default: <code style={{ color: '#fbbf24' }}>fardin1.codezzi@gmail.com</code>
            </span>
          </form>
        )}
      </section>

      {/* Navigation Tabs */}
      <div className="tabs-scroll" style={{ borderBottom: '1px solid #1e293b', padding: '0 20px', display: 'flex', gap: '4px', backgroundColor: '#0b1120' }}>
        <button
          onClick={() => setActiveTab('config')}
          className="tab-btn-text"
          style={{
            padding: '12px 16px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'config' ? '2px solid #f59e0b' : '2px solid transparent',
            color: activeTab === 'config' ? '#fbbf24' : '#94a3b8',
            fontWeight: activeTab === 'config' ? '700' : '500',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Palette size={15} /> Tab 1: App Config & Creator Branding
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className="tab-btn-text"
          style={{
            padding: '12px 16px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'analytics' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeTab === 'analytics' ? '#38bdf8' : '#94a3b8',
            fontWeight: activeTab === 'analytics' ? '700' : '500',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <BarChart3 size={15} /> Tab 2: Platform Analytics & Messes
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className="tab-btn-text"
          style={{
            padding: '12px 16px',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'users' ? '2px solid #10b981' : '2px solid transparent',
            color: activeTab === 'users' ? '#34d399' : '#94a3b8',
            fontWeight: activeTab === 'users' ? '700' : '500',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Users size={15} /> Tab 3: User Directory
        </button>
      </div>

      {/* Main Content Area */}
      <main className="main-layout" style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>

        {/* TAB 1: App Config & Live Phone Mockup */}
        {activeTab === 'config' && (
          <div className="config-split-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(300px, 0.8fr)', gap: '28px', alignItems: 'start' }}>
            
            {/* Form Column */}
            <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '20px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Palette size={18} color="#f59e0b" /> Branding & Announcement CMS
                  </h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                    Modifications synchronize instantly with Android WebViews and Web clients.
                  </p>
                </div>
                <div style={{ padding: '3px 8px', backgroundColor: '#0f172a', borderRadius: '4px', fontSize: '11px', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                  Singleton Config
                </div>
              </div>

              <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '5px' }}>
                    App Header Title
                  </label>
                  <input
                    type="text"
                    value={config.appName}
                    onChange={(e) => setConfig({ ...config, appName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                </div>

                <div className="form-2col-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '5px' }}>
                      Creator Name
                    </label>
                    <input
                      type="text"
                      value={config.creatorName}
                      onChange={(e) => setConfig({ ...config, creatorName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        backgroundColor: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        color: '#f8fafc',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '5px' }}>
                      Creator Email
                    </label>
                    <input
                      type="email"
                      value={config.creatorEmail}
                      onChange={(e) => setConfig({ ...config, creatorEmail: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        backgroundColor: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        color: '#f8fafc',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '5px' }}>
                    Creator Portfolio URL
                  </label>
                  <input
                    type="url"
                    value={config.creatorPortfolio}
                    onChange={(e) => setConfig({ ...config, creatorPortfolio: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '5px' }}>
                    Creator Bio
                  </label>
                  <textarea
                    rows={2}
                    value={config.creatorBio}
                    onChange={(e) => setConfig({ ...config, creatorBio: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1' }}>
                      Custom App Icon SVG (optional)
                    </label>
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, appIconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f59e0b" width="26" height="26"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/></svg>' })}
                      style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Insert Fork/Knife SVG
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="<svg ...>...</svg>"
                    value={config.appIconSvg}
                    onChange={(e) => setConfig({ ...config, appIconSvg: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#38bdf8',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Announcement Banner */}
                <div style={{ backgroundColor: '#090d16', padding: '14px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <Megaphone size={14} /> Announcement Banner
                    </span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: '#cbd5e1' }}>
                      <input
                        type="checkbox"
                        checked={config.noticeActive}
                        onChange={(e) => setConfig({ ...config, noticeActive: e.target.checked })}
                        style={{ width: '15px', height: '15px', cursor: 'pointer' }}
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
                      padding: '8px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '12px',
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
                    padding: '12px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Save size={16} /> {isSavingConfig ? 'Saving...' : 'Save Changes (PUT /api/config)'}
                </button>
              </form>
            </div>

            {/* Live Phone Mockup Column */}
            <div className="phone-mockup-outer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ marginBottom: '10px', fontSize: '12px', color: '#94a3b8', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Smartphone size={14} /> Real-Time Android WebView / Mobile Preview
              </div>

              {/* Phone Shell */}
              <div
                className="phone-mockup-frame"
                style={{
                  width: '310px',
                  height: '600px',
                  backgroundColor: '#000',
                  borderRadius: '8px',
                  border: '6px solid #334155',
                  boxShadow: '0 20px 45px rgba(0,0,0,0.7)',
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
                    width: '100px',
                    height: '18px',
                    backgroundColor: '#1e293b',
                    borderBottomLeftRadius: '6px',
                    borderBottomRightRadius: '6px',
                    zIndex: 50,
                  }}
                />

                {/* Status Bar */}
                <div
                  style={{
                    height: '32px',
                    padding: '0 16px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    fontSize: '10px',
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
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  {config.appIconSvg ? (
                    <div
                      style={{ width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      dangerouslySetInnerHTML={{ __html: config.appIconSvg }}
                    />
                  ) : (
                    <div style={{ color: '#f59e0b' }}>
                      <UtensilsCrossed size={22} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {config.appName || 'Mess Meal Manager'}
                    </div>
                  </div>
                  <div style={{ width: '8px', height: '8px', borderRadius: '4px', backgroundColor: '#10b981' }} />
                </div>

                {/* Mobile Broadcast Notice Banner */}
                {config.noticeActive && config.broadcastNotice && (
                  <div
                    style={{
                      backgroundColor: '#d97706',
                      color: '#ffffff',
                      padding: '7px 10px',
                      fontSize: '11px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      borderBottom: '1px solid #b45309',
                    }}
                  >
                    <Zap size={13} />
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {config.broadcastNotice}
                    </span>
                  </div>
                )}

                {/* Phone Inner Body */}
                <div style={{ flex: 1, padding: '14px', backgroundColor: '#020617', overflowY: 'auto' }}>
                  
                  {/* Mockup Meal Card */}
                  <div style={{ backgroundColor: '#0f172a', borderRadius: '6px', padding: '12px', border: '1px solid #1e293b', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Today's Meals</span>
                      <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: '600' }}>Active Month</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc' }}>1.0</div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>Lunch</div>
                      </div>
                      <div style={{ borderLeft: '1px solid #1e293b' }} />
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc' }}>1.0</div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>Dinner</div>
                      </div>
                      <div style={{ borderLeft: '1px solid #1e293b' }} />
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#10b981' }}>৳65</div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>Rate</div>
                      </div>
                    </div>
                  </div>

                  {/* Creator Profile Card */}
                  <div
                    style={{
                      background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
                      borderRadius: '6px',
                      padding: '14px',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '6px',
                          background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          fontWeight: '800',
                          color: '#fff',
                        }}
                      >
                        {config.creatorName ? config.creatorName.charAt(0) : 'F'}
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {config.creatorName} <Check size={12} color="#38bdf8" />
                        </div>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                          {config.creatorEmail}
                        </div>
                      </div>
                    </div>

                    <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.4' }}>
                      {config.creatorBio}
                    </p>

                    <a
                      href={config.creatorPortfolio}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        backgroundColor: '#f59e0b',
                        color: '#0f172a',
                        padding: '6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '700',
                        textDecoration: 'none',
                      }}
                    >
                      Visit Creator Portfolio <ExternalLink size={12} />
                    </a>
                  </div>

                </div>

                {/* Bottom Indicator */}
                <div style={{ height: '16px', backgroundColor: '#020617', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ width: '70px', height: '3px', backgroundColor: '#475569', borderRadius: '2px' }} />
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: Platform Analytics & Mess Management */}
        {activeTab === 'analytics' && (
          <div>
            {!isSuperAdminUser ? (
              <div style={{ backgroundColor: '#1e293b', padding: '28px', borderRadius: '8px', textAlign: 'center', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px', color: '#f59e0b' }}>
                  <Lock size={36} />
                </div>
                <h3 style={{ margin: '0 0 6px 0', color: '#f8fafc', fontSize: '16px' }}>Super Admin Authorization Required</h3>
                <p style={{ margin: '0 0 16px 0', color: '#94a3b8', fontSize: '13px' }}>
                  Please sign in with <code style={{ color: '#fbbf24' }}>fardin1.codezzi@gmail.com</code> above to view platform analytics and manage messes.
                </p>
              </div>
            ) : (
              <div>
                {/* 4 KPI Cards */}
                <div className="stats-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  
                  <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '4px' }}>
                      <Users size={14} color="#38bdf8" /> TOTAL USERS
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: '800', color: '#38bdf8' }}>
                      {stats ? stats.totalUsers : '...'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Registered database profiles</div>
                  </div>

                  <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '4px' }}>
                      <Home size={14} color="#f59e0b" /> TOTAL MESSES
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: '800', color: '#f59e0b' }}>
                      {stats ? stats.totalMesses : '...'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Managed room groups</div>
                  </div>

                  <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '4px' }}>
                      <UtensilsCrossed size={14} color="#10b981" /> TOTAL MEALS
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: '800', color: '#10b981' }}>
                      {stats ? stats.totalMeals : '...'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Recorded lunch & dinner count</div>
                  </div>

                  <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8', fontWeight: '700', marginBottom: '4px' }}>
                      <Coins size={14} color="#ec4899" /> APPROVED BAZAR
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: '800', color: '#ec4899' }}>
                      ৳{stats ? stats.totalBazarAmount.toLocaleString() : '...'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Approved grocery expenditures</div>
                  </div>

                </div>

                {/* Mess Management Table */}
                <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '20px', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Home size={16} color="#f59e0b" /> Messes Management ({messesList.length})
                    </h3>
                    {authToken && (
                      <button
                        onClick={() => fetchAdminData(authToken)}
                        disabled={isLoadingAdmin}
                        style={{
                          background: '#334155',
                          border: 'none',
                          color: '#cbd5e1',
                          padding: '5px 10px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <RefreshCw size={12} className={isLoadingAdmin ? 'spin' : ''} /> {isLoadingAdmin ? 'Refreshing...' : 'Refresh'}
                      </button>
                    )}
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #334155', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase' }}>
                          <th style={{ padding: '10px 12px' }}>Mess Name</th>
                          <th style={{ padding: '10px 12px' }}>Invite Code</th>
                          <th style={{ padding: '10px 12px' }}>Manager</th>
                          <th style={{ padding: '10px 12px' }}>Active Members</th>
                          <th style={{ padding: '10px 12px' }}>Created Date</th>
                          <th style={{ padding: '10px 12px', textAlign: 'right' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {messesList.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                              No messes created yet.
                            </td>
                          </tr>
                        ) : (
                          messesList.map((m) => (
                            <tr key={m.id} style={{ borderBottom: '1px solid #334155' }}>
                              <td style={{ padding: '12px', fontWeight: '600', color: '#f8fafc' }}>{m.name}</td>
                              <td style={{ padding: '12px' }}>
                                <span style={{ backgroundColor: '#0f172a', border: '1px solid #475569', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', color: '#38bdf8' }}>
                                  {m.inviteCode}
                                </span>
                              </td>
                              <td style={{ padding: '12px' }}>
                                <div style={{ color: '#e2e8f0', fontWeight: '500' }}>{m.managerName}</div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>{m.managerEmail}</div>
                              </td>
                              <td style={{ padding: '12px' }}>
                                <span style={{ backgroundColor: '#064e3b', color: '#6ee7b7', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                                  {m.activeMembersCount} active ({m.totalMembersCount} total)
                                </span>
                              </td>
                              <td style={{ padding: '12px', color: '#94a3b8', fontSize: '12px' }}>
                                {new Date(m.createdAt).toLocaleDateString()}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right' }}>
                                <button
                                  onClick={() => handleDeleteMess(m.id, m.name)}
                                  disabled={deletingMessId === m.id}
                                  style={{
                                    backgroundColor: '#7f1d1d',
                                    color: '#fca5a5',
                                    border: '1px solid #b91c1c',
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <Trash2 size={13} /> {deletingMessId === m.id ? 'Deleting...' : 'Delete Mess'}
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
              <div style={{ backgroundColor: '#1e293b', padding: '28px', borderRadius: '8px', textAlign: 'center', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px', color: '#f59e0b' }}>
                  <Lock size={36} />
                </div>
                <h3 style={{ margin: '0 0 6px 0', color: '#f8fafc', fontSize: '16px' }}>Super Admin Authorization Required</h3>
                <p style={{ margin: '0 0 16px 0', color: '#94a3b8', fontSize: '13px' }}>
                  Please sign in with <code style={{ color: '#fbbf24' }}>fardin1.codezzi@gmail.com</code> to browse, search, and reset user credentials.
                </p>
              </div>
            ) : (
              <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '20px', border: '1px solid #334155' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={16} color="#34d399" /> Registered User Directory ({filteredUsers.length} / {usersList.length})
                    </h3>
                    <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                      Search by user name, email, phone number, or mess name.
                    </p>
                  </div>

                  <div style={{ position: 'relative', minWidth: '240px' }}>
                    <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      value={searchUserQuery}
                      onChange={(e) => setSearchUserQuery(e.target.value)}
                      placeholder="Filter users..."
                      style={{
                        width: '100%',
                        padding: '7px 12px 7px 30px',
                        backgroundColor: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        color: '#f8fafc',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #334155', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '10px 12px' }}>User</th>
                        <th style={{ padding: '10px 12px' }}>Email</th>
                        <th style={{ padding: '10px 12px' }}>Phone</th>
                        <th style={{ padding: '10px 12px' }}>Current Mess</th>
                        <th style={{ padding: '10px 12px' }}>Role</th>
                        <th style={{ padding: '10px 12px' }}>Registered</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                            No users matched your query.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => (
                          <tr key={u.id} style={{ borderBottom: '1px solid #334155' }}>
                            <td style={{ padding: '12px', fontWeight: '600', color: '#f8fafc' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{u.name}</span>
                                {u.isSuperAdmin && (
                                  <span style={{ backgroundColor: '#78350f', color: '#fbbf24', padding: '2px 5px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                    <Crown size={10} /> Super Admin
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '12px', color: '#94a3b8' }}>{u.email}</td>
                            <td style={{ padding: '12px', color: '#cbd5e1' }}>{u.phone || '—'}</td>
                            <td style={{ padding: '12px' }}>
                              {u.activeMess ? (
                                <span style={{ backgroundColor: '#1e1b4b', color: '#a5b4fc', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                                  {u.activeMess.name} ({u.activeMess.inviteCode})
                                </span>
                              ) : (
                                <span style={{ color: '#64748b', fontSize: '11px' }}>No active mess</span>
                              )}
                            </td>
                            <td style={{ padding: '12px' }}>
                              {u.currentRole === 'MANAGER' ? (
                                <span style={{ backgroundColor: '#78350f', color: '#fde68a', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>
                                  MANAGER
                                </span>
                              ) : u.currentRole === 'MEMBER' ? (
                                <span style={{ backgroundColor: '#064e3b', color: '#a7f3d0', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>
                                  MEMBER
                                </span>
                              ) : (
                                <span style={{ color: '#64748b', fontSize: '11px' }}>NONE</span>
                              )}
                            </td>
                            <td style={{ padding: '12px', color: '#94a3b8', fontSize: '12px' }}>
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>
                              <button
                                onClick={() => openEditUserModal(u)}
                                style={{
                                  backgroundColor: '#2563eb',
                                  color: '#fff',
                                  border: 'none',
                                  padding: '5px 10px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <KeyRound size={12} /> Reset / Edit
                              </button>
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

        {/* Reset Password & Edit User Modal */}
        {selectedUserForEdit && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              padding: '16px',
            }}
          >
            <div
              className="modal-window"
              style={{
                backgroundColor: '#1e293b',
                borderRadius: '8px',
                border: '1px solid #475569',
                padding: '22px',
                width: '100%',
                maxWidth: '500px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7)',
                overflowY: 'auto',
                maxHeight: '90vh',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <KeyRound size={16} color="#fbbf24" /> Manage User & Reset Credentials
                  </h3>
                  <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                    User ID: <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{selectedUserForEdit.id}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedUserForEdit(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '2px',
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editUserForm.name}
                    onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div className="form-2col-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={editUserForm.email}
                      onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        backgroundColor: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        color: '#f8fafc',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '4px' }}>
                      Phone (optional)
                    </label>
                    <input
                      type="text"
                      value={editUserForm.phone}
                      onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                      placeholder="+880..."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        backgroundColor: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        color: '#f8fafc',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Password Reset Section */}
                <div style={{ backgroundColor: '#090d16', padding: '14px', borderRadius: '6px', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Lock size={13} /> Reset Password
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#38bdf8',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        textDecoration: 'underline',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <Dices size={12} /> Generate Strong Password
                    </button>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={editUserForm.newPassword}
                      onChange={(e) => setEditUserForm({ ...editUserForm, newPassword: e.target.value })}
                      placeholder="Leave blank to keep existing password"
                      style={{
                        width: '100%',
                        padding: '8px 36px 8px 12px',
                        backgroundColor: '#0f172a',
                        border: '1px solid #475569',
                        borderRadius: '6px',
                        color: '#f8fafc',
                        fontSize: '13px',
                        fontFamily: showPassword ? 'monospace' : 'inherit',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    Minimum 6 characters. If populated, replaces the user's password immediately.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                  <input
                    type="checkbox"
                    id="modalSuperAdminToggle"
                    checked={editUserForm.isSuperAdmin}
                    onChange={(e) => setEditUserForm({ ...editUserForm, isSuperAdmin: e.target.checked })}
                    style={{ width: '15px', height: '15px', cursor: 'pointer' }}
                  />
                  <label htmlFor="modalSuperAdminToggle" style={{ fontSize: '12px', color: '#fbbf24', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={14} /> Grant Super Admin Privileges
                  </label>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="submit"
                    disabled={isUpdatingUser}
                    style={{
                      flex: 1,
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                    }}
                  >
                    <Save size={14} /> {isUpdatingUser ? 'Saving...' : 'Save User Changes'}
                  </button>

                  {editUserForm.newPassword && (
                    <button
                      type="button"
                      onClick={copyCredentials}
                      style={{
                        backgroundColor: '#059669',
                        color: '#ffffff',
                        border: 'none',
                        padding: '10px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Copy size={13} /> Copy Credentials
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedUserForEdit(null)}
                    style={{
                      backgroundColor: '#334155',
                      color: '#cbd5e1',
                      border: 'none',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
