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
  Compass,
  MapPin,
  Calendar,
  Plus,
  ArrowRight,
  Wallet,
  Receipt,
  UserCheck,
  UserPlus,
  ChevronRight,
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

interface TourSummary {
  id: string;
  name: string;
  description: string | null;
  destination: string | null;
  startDate: string | null;
  endDate: string | null;
  budget: number;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  inviteCode: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  totalDeposits: number;
  totalExpenses: number;
  balance: number;
  membersCount: number;
  leadName: string;
  accountantNames: string[];
  myRole?: string | null;
}

interface TourDetailedView {
  tour: {
    id: string;
    name: string;
    description: string | null;
    destination: string | null;
    startDate: string | null;
    endDate: string | null;
    budget: number;
    status: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    inviteCode: string;
    creatorId: string;
    createdAt: string;
  };
  summary: {
    budget: number;
    totalDeposits: number;
    totalExpenses: number;
    balance: number;
    budgetRemaining: number;
    perMemberShare: number;
    membersCount: number;
    categoryBreakdown: Record<string, number>;
  };
  members: Array<{
    id: string;
    userId: string | null;
    name: string;
    email: string | null;
    phone: string | null;
    role: 'LEAD' | 'ACCOUNTANT' | 'MEMBER';
    joinedAt: string;
    totalDeposited: number;
    totalSpent: number;
    shareCost: number;
    netBalance: number;
  }>;
  expenses: Array<{
    id: string;
    title: string;
    amount: number;
    category: string;
    date: string;
    notes: string | null;
    spentBy: string;
    memberId: string | null;
  }>;
  deposits: Array<{
    id: string;
    amount: number;
    date: string;
    notes: string | null;
    paidBy: string;
    memberId: string;
  }>;
  myRole?: string | null;
  isSuperAdmin?: boolean;
}

interface PlatformStats {
  totalUsers: number;
  totalMesses: number;
  totalMeals: number;
  totalBazarAmount: number;
  totalTours?: number;
  totalTourBudget?: number;
  totalTourExpenses?: number;
  totalTourDeposits?: number;
}

export default function SuperAdminConsole() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'config' | 'analytics' | 'users' | 'tours'>('config');

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
  const [toursList, setToursList] = useState<TourSummary[]>([]);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false);
  const [deletingMessId, setDeletingMessId] = useState<string | null>(null);

  // Tour Management State
  const [selectedTourDetails, setSelectedTourDetails] = useState<TourDetailedView | null>(null);
  const [isLoadingTourDetails, setIsLoadingTourDetails] = useState(false);
  const [deletingTourId, setDeletingTourId] = useState<string | null>(null);
  const [tourSubTab, setTourSubTab] = useState<'overview' | 'members' | 'expenses' | 'deposits'>('overview');

  // Tour Modals
  const [isCreateTourOpen, setIsCreateTourOpen] = useState(false);
  const [createTourForm, setCreateTourForm] = useState({
    name: '',
    description: '',
    destination: '',
    startDate: '',
    endDate: '',
    budget: '',
  });
  const [isCreatingTour, setIsCreatingTour] = useState(false);

  const [isJoinTourOpen, setIsJoinTourOpen] = useState(false);
  const [joinTourCode, setJoinTourCode] = useState('');
  const [isJoiningTour, setIsJoiningTour] = useState(false);

  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [addExpenseForm, setAddExpenseForm] = useState({
    title: '',
    amount: '',
    category: 'Food',
    memberId: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  const [isAddDepositOpen, setIsAddDepositOpen] = useState(false);
  const [addDepositForm, setAddDepositForm] = useState({
    memberId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [isAddingDeposit, setIsAddingDeposit] = useState(false);

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [addMemberForm, setAddMemberForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'MEMBER',
  });
  const [isAddingMember, setIsAddingMember] = useState(false);

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
    const fetchConfig = async () => {
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
              creatorBio: data.config.creatorBio || '',
              broadcastNotice: data.config.broadcastNotice || '',
              noticeActive: Boolean(data.config.noticeActive),
            });
          }
        }
      } catch {
        // Fallback to initial values
      }
    };

    fetchConfig();

    // Check if token already exists in localStorage
    const savedToken = localStorage.getItem('mm_admin_token');
    const savedUser = localStorage.getItem('mm_admin_user');
    if (savedToken && savedUser) {
      try {
        setAuthToken(savedToken);
        setCurrentUser(JSON.parse(savedUser));
      } catch {
        // ignore parse error
      }
    }
  }, []);

  // Fetch Admin Stats & Tours whenever token is set
  const fetchAdminData = async (token: string) => {
    setIsLoadingAdmin(true);
    try {
      const res = await fetch('/api/admin', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setUsersList(data.users || []);
        setMessesList(data.messes || []);
        if (data.tours) {
          setToursList(data.tours);
        }
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to fetch admin stats', 'error');
      }
    } catch {
      showToast('Network error while fetching platform analytics', 'error');
    } finally {
      setIsLoadingAdmin(false);
    }
  };

  // Fetch Tours (either via user tours or admin)
  const fetchTours = async () => {
    if (!authToken) return;
    try {
      const res = await fetch(currentUser?.isSuperAdmin ? '/api/tours?all=true' : '/api/tours', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setToursList(data.tours || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (authToken) {
      fetchAdminData(authToken);
      fetchTours();
    }
  }, [authToken]);

  // Auth Handlers
  const handleLogin = async (e: React.FormEvent) => {
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
      if (res.ok && data.token) {
        setAuthToken(data.token);
        setCurrentUser(data.user);
        localStorage.setItem('mm_admin_token', data.token);
        localStorage.setItem('mm_admin_user', JSON.stringify(data.user));
        showToast(`Signed in as ${data.user.name} (${data.user.isSuperAdmin ? 'Super Admin' : 'User'})`, 'success');
        fetchAdminData(data.token);
      } else {
        showToast(data.error || 'Authentication failed. Check credentials.', 'error');
      }
    } catch {
      showToast('Failed to connect to authentication server.', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    localStorage.removeItem('mm_admin_token');
    localStorage.removeItem('mm_admin_user');
    setSelectedTourDetails(null);
    showToast('Signed out of admin session.', 'info');
  };

  // Save Config Handler
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) {
      showToast('Sign in as Super Admin to save configurations', 'error');
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
      if (res.ok) {
        showToast('App branding and announcement updated successfully!', 'success');
      } else {
        showToast(data.error || 'Failed to save configuration', 'error');
      }
    } catch {
      showToast('Error saving configuration.', 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Delete Mess Handler
  const handleDeleteMess = async (messId: string, messName: string) => {
    if (!authToken) return;
    if (!confirm(`Are you sure you want to permanently delete mess "${messName}"? This cannot be undone.`)) {
      return;
    }

    setDeletingMessId(messId);
    try {
      const res = await fetch(`/api/admin/messes/${messId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `Mess "${messName}" deleted successfully`, 'success');
        setMessesList((prev) => prev.filter((m) => m.id !== messId));
        if (stats) {
          setStats({ ...stats, totalMesses: Math.max(0, stats.totalMesses - 1) });
        }
      } else {
        showToast(data.error || 'Failed to delete mess', 'error');
      }
    } catch {
      showToast('Network error deleting mess.', 'error');
    } finally {
      setDeletingMessId(null);
    }
  };

  // User Edit & Password Reset Handlers
  const openEditUserModal = (user: UserSummary) => {
    setSelectedUserForEdit(user);
    setEditUserForm({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      newPassword: '',
      isSuperAdmin: user.isSuperAdmin,
    });
    setShowPassword(false);
  };

  const closeEditUserModal = () => {
    setSelectedUserForEdit(null);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setEditUserForm((prev) => ({ ...prev, newPassword: result }));
    setShowPassword(true);
  };

  const handleUpdateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit || !authToken) return;

    setIsUpdatingUser(true);
    try {
      const payload: Record<string, unknown> = {};
      if (editUserForm.name !== selectedUserForEdit.name) payload.name = editUserForm.name;
      if (editUserForm.email !== selectedUserForEdit.email) payload.email = editUserForm.email;
      if (editUserForm.phone !== (selectedUserForEdit.phone || '')) payload.phone = editUserForm.phone;
      if (editUserForm.isSuperAdmin !== selectedUserForEdit.isSuperAdmin) payload.isSuperAdmin = editUserForm.isSuperAdmin;
      if (editUserForm.newPassword.trim().length > 0) payload.newPassword = editUserForm.newPassword;

      const res = await fetch(`/api/admin/users/${selectedUserForEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`User ${editUserForm.name} updated successfully!`, 'success');
        setUsersList((prev) =>
          prev.map((u) =>
            u.id === selectedUserForEdit.id
              ? {
                  ...u,
                  name: editUserForm.name,
                  email: editUserForm.email,
                  phone: editUserForm.phone || null,
                  isSuperAdmin: editUserForm.isSuperAdmin,
                }
              : u
          )
        );
        closeEditUserModal();
      } else {
        showToast(data.error || 'Failed to update user', 'error');
      }
    } catch {
      showToast('Network error while updating user account.', 'error');
    } finally {
      setIsUpdatingUser(false);
    }
  };

  // Tour Handlers
  const fetchTourDetails = async (tourId: string) => {
    if (!authToken) return;
    setIsLoadingTourDetails(true);
    try {
      const res = await fetch(`/api/tours/${tourId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedTourDetails(data);
        setTourSubTab('overview');
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to fetch tour details', 'error');
      }
    } catch {
      showToast('Network error while fetching tour details', 'error');
    } finally {
      setIsLoadingTourDetails(false);
    }
  };

  const handleCreateTour = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) {
      showToast('You must be signed in to create a tour', 'error');
      return;
    }

    if (!createTourForm.name.trim()) {
      showToast('Tour name is required', 'error');
      return;
    }

    setIsCreatingTour(true);
    try {
      const res = await fetch('/api/tours', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(createTourForm),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Tour "${createTourForm.name}" created! You are the Tour Lead.`, 'success');
        setIsCreateTourOpen(false);
        setCreateTourForm({
          name: '',
          description: '',
          destination: '',
          startDate: '',
          endDate: '',
          budget: '',
        });
        fetchTours();
        if (data.tour?.id) {
          fetchTourDetails(data.tour.id);
        }
      } else {
        showToast(data.error || 'Failed to create tour', 'error');
      }
    } catch {
      showToast('Network error while creating tour', 'error');
    } finally {
      setIsCreatingTour(false);
    }
  };

  const handleJoinTour = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    if (!joinTourCode.trim()) {
      showToast('Please enter a tour invite code', 'error');
      return;
    }

    setIsJoiningTour(true);
    try {
      const res = await fetch('/api/tours/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ inviteCode: joinTourCode.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Joined tour "${data.tour.name}" successfully!`, 'success');
        setIsJoinTourOpen(false);
        setJoinTourCode('');
        fetchTours();
        if (data.tour?.id) {
          fetchTourDetails(data.tour.id);
        }
      } else {
        showToast(data.error || 'Failed to join tour', 'error');
      }
    } catch {
      showToast('Network error joining tour', 'error');
    } finally {
      setIsJoiningTour(false);
    }
  };

  const handleDeleteTour = async (tourId: string, tourName: string) => {
    if (!authToken) return;
    if (!confirm(`Are you sure you want to permanently delete tour "${tourName}"? All expenses, deposits, and member allocations will be deleted.`)) {
      return;
    }

    setDeletingTourId(tourId);
    try {
      const res = await fetch(`/api/tours/${tourId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `Tour "${tourName}" deleted successfully`, 'success');
        setToursList((prev) => prev.filter((t) => t.id !== tourId));
        if (selectedTourDetails?.tour.id === tourId) {
          setSelectedTourDetails(null);
        }
      } else {
        showToast(data.error || 'Failed to delete tour', 'error');
      }
    } catch {
      showToast('Network error deleting tour', 'error');
    } finally {
      setDeletingTourId(null);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken || !selectedTourDetails) return;

    if (!addExpenseForm.title.trim() || !addExpenseForm.amount) {
      showToast('Please enter expense title and positive amount', 'error');
      return;
    }

    setIsAddingExpense(true);
    try {
      const res = await fetch(`/api/tours/${selectedTourDetails.tour.id}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: addExpenseForm.title.trim(),
          amount: parseFloat(addExpenseForm.amount),
          category: addExpenseForm.category,
          memberId: addExpenseForm.memberId || null,
          date: addExpenseForm.date || new Date().toISOString(),
          notes: addExpenseForm.notes || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Expense recorded successfully!', 'success');
        setIsAddExpenseOpen(false);
        setAddExpenseForm({
          title: '',
          amount: '',
          category: 'Food',
          memberId: '',
          date: new Date().toISOString().split('T')[0],
          notes: '',
        });
        fetchTourDetails(selectedTourDetails.tour.id);
        fetchTours();
      } else {
        showToast(data.error || 'Failed to record expense', 'error');
      }
    } catch {
      showToast('Network error recording expense', 'error');
    } finally {
      setIsAddingExpense(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!authToken || !selectedTourDetails) return;
    if (!confirm('Are you sure you want to remove this expense?')) return;

    try {
      const res = await fetch(`/api/tours/${selectedTourDetails.tour.id}/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (res.ok) {
        showToast('Expense deleted', 'success');
        fetchTourDetails(selectedTourDetails.tour.id);
        fetchTours();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to delete expense', 'error');
      }
    } catch {
      showToast('Network error deleting expense', 'error');
    }
  };

  const handleAddDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken || !selectedTourDetails) return;

    if (!addDepositForm.memberId || !addDepositForm.amount) {
      showToast('Please select member and enter deposit amount', 'error');
      return;
    }

    setIsAddingDeposit(true);
    try {
      const res = await fetch(`/api/tours/${selectedTourDetails.tour.id}/deposits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          memberId: addDepositForm.memberId,
          amount: parseFloat(addDepositForm.amount),
          date: addDepositForm.date || new Date().toISOString(),
          notes: addDepositForm.notes || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Deposit recorded successfully!', 'success');
        setIsAddDepositOpen(false);
        setAddDepositForm({
          memberId: '',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          notes: '',
        });
        fetchTourDetails(selectedTourDetails.tour.id);
        fetchTours();
      } else {
        showToast(data.error || 'Failed to record deposit', 'error');
      }
    } catch {
      showToast('Network error recording deposit', 'error');
    } finally {
      setIsAddingDeposit(false);
    }
  };

  const handleDeleteDeposit = async (depositId: string) => {
    if (!authToken || !selectedTourDetails) return;
    if (!confirm('Are you sure you want to remove this deposit record?')) return;

    try {
      const res = await fetch(`/api/tours/${selectedTourDetails.tour.id}/deposits/${depositId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (res.ok) {
        showToast('Deposit record deleted', 'success');
        fetchTourDetails(selectedTourDetails.tour.id);
        fetchTours();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to delete deposit', 'error');
      }
    } catch {
      showToast('Network error deleting deposit', 'error');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken || !selectedTourDetails) return;

    if (!addMemberForm.name.trim()) {
      showToast('Member name is required', 'error');
      return;
    }

    setIsAddingMember(true);
    try {
      const res = await fetch(`/api/tours/${selectedTourDetails.tour.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(addMemberForm),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Added ${addMemberForm.name} to tour!`, 'success');
        setIsAddMemberOpen(false);
        setAddMemberForm({ name: '', email: '', phone: '', role: 'MEMBER' });
        fetchTourDetails(selectedTourDetails.tour.id);
      } else {
        showToast(data.error || 'Failed to add member', 'error');
      }
    } catch {
      showToast('Network error adding member', 'error');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    if (!authToken || !selectedTourDetails) return;

    try {
      const res = await fetch(`/api/tours/${selectedTourDetails.tour.id}/members/${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        showToast(`Role updated to ${newRole}`, 'success');
        fetchTourDetails(selectedTourDetails.tour.id);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to update member role', 'error');
      }
    } catch {
      showToast('Network error updating role', 'error');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!authToken || !selectedTourDetails) return;
    if (!confirm(`Remove ${memberName} from tour?`)) return;

    try {
      const res = await fetch(`/api/tours/${selectedTourDetails.tour.id}/members/${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (res.ok) {
        showToast(`Member ${memberName} removed`, 'success');
        fetchTourDetails(selectedTourDetails.tour.id);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to remove member', 'error');
      }
    } catch {
      showToast('Network error removing member', 'error');
    }
  };

  // Filtered Users
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

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#090d16',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{`
        /* Desktop: show table, hide mobile cards */
        .table-desktop-view {
          display: block;
        }
        .cards-mobile-view {
          display: none;
        }

        /* Mobile Responsive Adjustments */
        @media (max-width: 768px) {
          /* Tables switch completely to individual cards */
          .table-desktop-view {
            display: none !important;
          }
          .cards-mobile-view {
            display: flex !important;
            flex-direction: column;
            gap: 12px;
          }

          /* Header & Auth Bar */
          .header-container {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
            padding: 12px 16px !important;
          }
          .header-actions {
            width: 100% !important;
            justify-content: flex-start !important;
            gap: 8px !important;
          }
          .auth-bar {
            flex-direction: column !important;
            align-items: flex-start !important;
            padding: 12px 16px !important;
            gap: 10px !important;
          }
          .auth-form-flex {
            flex-direction: column !important;
            align-items: stretch !important;
            width: 100% !important;
          }
          .auth-form-flex input {
            width: 100% !important;
          }
          .auth-form-flex button {
            width: 100% !important;
            justify-content: center !important;
          }

          /* Tabs bar centered and wrapping */
          .tabs-scroll {
            justify-content: center !important;
            padding: 8px 12px !important;
            gap: 6px !important;
          }
          .tab-btn-text {
            padding: 8px 10px !important;
            font-size: 12px !important;
          }

          /* Main Content Container */
          .main-content-pad {
            padding: 14px !important;
          }

          /* Config Grid */
          .config-grid {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
          .phone-mockup-wrapper {
            margin: 0 auto;
            max-width: 320px !important;
          }

          /* KPI Stats Grid */
          .stats-grid-4col {
            grid-template-columns: 1fr 1fr !important;
            gap: 10px !important;
          }

          /* Modal Responsive */
          .modal-box-responsive {
            width: 95% !important;
            max-width: 95% !important;
            padding: 16px !important;
            margin: 10px !important;
          }
          .form-2col-responsive {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }

          /* Tour Detail Overview */
          .tour-summary-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 10px !important;
          }
        }

        @media (max-width: 480px) {
          .stats-grid-4col {
            grid-template-columns: 1fr !important;
          }
          .tour-summary-grid {
            grid-template-columns: 1fr !important;
          }
        }

        /* Subtle scrollbars */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #090d16;
        }
        ::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }

        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            backgroundColor:
              toast.type === 'success'
                ? '#065f46'
                : toast.type === 'error'
                ? '#991b1b'
                : '#1e3a8a',
            color: '#fff',
            padding: '10px 16px',
            borderRadius: '6px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
            fontSize: '13px',
            fontWeight: '600',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {toast.type === 'success' ? (
            <Check size={16} />
          ) : toast.type === 'error' ? (
            <X size={16} />
          ) : (
            <Info size={16} />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header
        className="header-container"
        style={{
          borderBottom: '1px solid #1e293b',
          backgroundColor: '#0f172a',
          padding: '14px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              backgroundColor: '#f59e0b',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0f172a',
            }}
          >
            <UtensilsCrossed size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ fontSize: '17px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em', color: '#f8fafc' }}>
              Mess & Tour Manager <span style={{ color: '#f59e0b' }}>Admin Console</span>
            </h1>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
              Super Admin, Mess Management & Tour Expense Tracking
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
        className="auth-bar"
        style={{
          backgroundColor: '#111827',
          borderBottom: '1px solid #1f2937',
          padding: '10px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', width: '100%' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                backgroundColor: currentUser.isSuperAdmin ? '#78350f' : '#1e293b',
                color: currentUser.isSuperAdmin ? '#fef3c7' : '#e2e8f0',
                border: currentUser.isSuperAdmin ? '1px solid #d97706' : '1px solid #334155',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
              }}
            >
              {currentUser.isSuperAdmin ? <Crown size={15} color="#fbbf24" /> : <ShieldCheck size={15} />}
              <span>
                {currentUser.isSuperAdmin ? 'Super Admin' : 'Logged In'}: {currentUser.name} ({currentUser.email})
              </span>
            </div>

            <button
              onClick={handleLogout}
              style={{
                marginLeft: 'auto',
                backgroundColor: '#1f2937',
                color: '#cbd5e1',
                border: '1px solid #374151',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
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

      {/* Navigation Tabs (Centered & Mobile Responsive) */}
      <div
        className="tabs-scroll"
        style={{
          borderBottom: '1px solid #1e293b',
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          backgroundColor: '#0b1120',
        }}
      >
        <button
          onClick={() => setActiveTab('config')}
          className="tab-btn-text"
          style={{
            padding: '8px 14px',
            backgroundColor: activeTab === 'config' ? '#1e293b' : 'transparent',
            border: activeTab === 'config' ? '1px solid #f59e0b' : '1px solid transparent',
            color: activeTab === 'config' ? '#fbbf24' : '#94a3b8',
            borderRadius: '6px',
            fontWeight: activeTab === 'config' ? '700' : '500',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <Palette size={15} /> App Config & Branding
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className="tab-btn-text"
          style={{
            padding: '8px 14px',
            backgroundColor: activeTab === 'analytics' ? '#1e293b' : 'transparent',
            border: activeTab === 'analytics' ? '1px solid #f59e0b' : '1px solid transparent',
            color: activeTab === 'analytics' ? '#fbbf24' : '#94a3b8',
            borderRadius: '6px',
            fontWeight: activeTab === 'analytics' ? '700' : '500',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <BarChart3 size={15} /> Messes & Analytics
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className="tab-btn-text"
          style={{
            padding: '8px 14px',
            backgroundColor: activeTab === 'users' ? '#1e293b' : 'transparent',
            border: activeTab === 'users' ? '1px solid #f59e0b' : '1px solid transparent',
            color: activeTab === 'users' ? '#fbbf24' : '#94a3b8',
            borderRadius: '6px',
            fontWeight: activeTab === 'users' ? '700' : '500',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <Users size={15} /> User Directory
        </button>
        <button
          onClick={() => setActiveTab('tours')}
          className="tab-btn-text"
          style={{
            padding: '8px 14px',
            backgroundColor: activeTab === 'tours' ? '#1e293b' : 'transparent',
            border: activeTab === 'tours' ? '1px solid #f59e0b' : '1px solid transparent',
            color: activeTab === 'tours' ? '#fbbf24' : '#94a3b8',
            borderRadius: '6px',
            fontWeight: activeTab === 'tours' ? '700' : '500',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <Compass size={15} /> Tour Expense Manager
        </button>
      </div>

      {/* Main Content Area */}
      <main className="main-content-pad" style={{ flex: 1, padding: '24px', maxWidth: '1280px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        
        {/* ================= TAB 1: App Config & Branding ================= */}
        {activeTab === 'config' && (
          <div className="config-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '28px', alignItems: 'start' }}>
            {/* Form Column */}
            <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '20px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Palette size={17} color="#fbbf24" /> CMS & Branding Configuration
                </h2>
                <div style={{ padding: '3px 8px', backgroundColor: '#0f172a', borderRadius: '4px', fontSize: '11px', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                  Singleton ID: global-config
                </div>
              </div>

              <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '500' }}>
                    App Header Title
                  </label>
                  <input
                    type="text"
                    value={config.appName}
                    onChange={(e) => setConfig({ ...config, appName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '500' }}>
                      Creator Full Name
                    </label>
                    <input
                      type="text"
                      value={config.creatorName}
                      onChange={(e) => setConfig({ ...config, creatorName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        backgroundColor: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '500' }}>
                      Creator Email
                    </label>
                    <input
                      type="email"
                      value={config.creatorEmail}
                      onChange={(e) => setConfig({ ...config, creatorEmail: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        backgroundColor: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '500' }}>
                    Creator Portfolio URL
                  </label>
                  <input
                    type="url"
                    value={config.creatorPortfolio}
                    onChange={(e) => setConfig({ ...config, creatorPortfolio: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '500' }}>
                    Creator Bio / Subtitle
                  </label>
                  <textarea
                    rows={2}
                    value={config.creatorBio}
                    onChange={(e) => setConfig({ ...config, creatorBio: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '500' }}>
                    Custom App Icon SVG (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="<svg ...>...</svg>"
                    value={config.appIconSvg}
                    onChange={(e) => setConfig({ ...config, appIconSvg: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div style={{ backgroundColor: '#090d16', padding: '14px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', color: '#f8fafc', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Megaphone size={14} color="#f59e0b" /> Broadcast Notice Banner
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#cbd5e1', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={config.noticeActive}
                        onChange={(e) => setConfig({ ...config, noticeActive: e.target.checked })}
                      />
                      Notice Active
                    </label>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Enter broadcast message shown to all app users..."
                    value={config.broadcastNotice}
                    onChange={(e) => setConfig({ ...config, broadcastNotice: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#fff',
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
                    padding: '10px 18px',
                    borderRadius: '6px',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginTop: '8px',
                  }}
                >
                  <Save size={16} /> {isSavingConfig ? 'Saving Changes...' : 'Save Configuration'}
                </button>
              </form>
            </div>

            {/* Live Phone Mockup */}
            <div className="phone-mockup-wrapper">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>
                <Smartphone size={14} /> Live Mobile View Preview
              </div>
              <div
                style={{
                  backgroundColor: '#030712',
                  border: '8px solid #1f2937',
                  borderRadius: '8px',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                  padding: '16px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  minHeight: '440px',
                  boxSizing: 'border-box',
                }}
              >
                {/* Phone Speaker Notch */}
                <div style={{ width: '40px', height: '4px', backgroundColor: '#374151', borderRadius: '2px', margin: '0 auto 4px auto' }} />

                {/* Mobile App Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1f2937', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {config.appIconSvg ? (
                      <div
                        style={{ width: '24px', height: '24px' }}
                        dangerouslySetInnerHTML={{ __html: config.appIconSvg }}
                      />
                    ) : (
                      <div style={{ width: '24px', height: '24px', backgroundColor: '#f59e0b', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
                        <UtensilsCrossed size={14} />
                      </div>
                    )}
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#f9fafb' }}>
                      {config.appName || 'Mess Meal Manager'}
                    </span>
                  </div>
                  <div style={{ width: '8px', height: '8px', borderRadius: '4px', backgroundColor: '#10b981' }} />
                </div>

                {/* Broadcast Banner */}
                {config.noticeActive && config.broadcastNotice && (
                  <div
                    style={{
                      backgroundColor: '#78350f',
                      border: '1px solid #d97706',
                      borderRadius: '4px',
                      padding: '8px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Zap size={14} color="#fde68a" />
                    <span style={{ fontSize: '11px', color: '#fef3c7', lineHeight: '1.3' }}>
                      {config.broadcastNotice}
                    </span>
                  </div>
                )}

                {/* Simulated Content */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ backgroundColor: '#0f172a', borderRadius: '6px', padding: '12px', border: '1px solid #1e293b', marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#38bdf8', marginBottom: '4px' }}>
                      Today&apos;s Meals
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Lunch: 1.0 | Dinner: 1.0</div>
                  </div>

                  {/* Creator Profile Card in Mobile */}
                  <div
                    style={{
                      backgroundColor: '#1e293b',
                      borderRadius: '6px',
                      padding: '12px',
                      border: '1px solid #334155',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '10px', color: '#fbbf24', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>
                      Designed & Developed by
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginTop: '2px' }}>
                      {config.creatorName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      {config.creatorBio}
                    </div>
                    {config.creatorPortfolio && (
                      <a
                        href={config.creatorPortfolio}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginTop: '8px',
                          fontSize: '11px',
                          color: '#38bdf8',
                          textDecoration: 'none',
                          backgroundColor: '#0f172a',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid #334155',
                        }}
                      >
                        Portfolio <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Phone Bottom Home Bar */}
                <div style={{ width: '70px', height: '3px', backgroundColor: '#475569', borderRadius: '2px', margin: '4px auto 0 auto' }} />
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: Platform Analytics & Messes ================= */}
        {activeTab === 'analytics' && (
          <div>
            {!currentUser?.isSuperAdmin ? (
              <div style={{ backgroundColor: '#1e293b', padding: '28px', borderRadius: '8px', textAlign: 'center', border: '1px solid #334155' }}>
                <Crown size={32} color="#f59e0b" style={{ margin: '0 auto 12px auto' }} />
                <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 6px 0', color: '#f8fafc' }}>
                  Super Admin Authentication Required
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px 0' }}>
                  Sign in above with credentials for <code>fardin1.codezzi@gmail.com</code> to view platform telemetry and manage messes.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* 4 KPI Cards */}
                <div className="stats-grid-4col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                  <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>
                      <span>Total Users</span>
                      <Users size={18} color="#38bdf8" />
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#f8fafc', marginTop: '6px' }}>
                      {stats ? stats.totalUsers : '—'}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>
                      <span>Total Messes</span>
                      <Home size={18} color="#10b981" />
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#f8fafc', marginTop: '6px' }}>
                      {stats ? stats.totalMesses : '—'}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>
                      <span>Total Meals</span>
                      <UtensilsCrossed size={18} color="#f59e0b" />
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#f8fafc', marginTop: '6px' }}>
                      {stats ? stats.totalMeals : '—'}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#94a3b8', fontSize: '12px', fontWeight: '600' }}>
                      <span>Total Bazar (৳)</span>
                      <Coins size={18} color="#ec4899" />
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#f8fafc', marginTop: '6px' }}>
                      ৳{stats ? stats.totalBazarAmount.toLocaleString() : '—'}
                    </div>
                  </div>
                </div>

                {/* Tour KPI Summary if available */}
                {stats && stats.totalTours !== undefined && (
                  <div style={{ backgroundColor: '#0f172a', borderRadius: '8px', padding: '14px 18px', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Compass size={20} color="#38bdf8" />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc' }}>
                          Tours Telemetry Overview
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {stats.totalTours} Active Tours | Budget: ৳{stats.totalTourBudget?.toLocaleString()} | Expenses: ৳{stats.totalTourExpenses?.toLocaleString()} | Deposits: ৳{stats.totalTourDeposits?.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('tours')}
                      style={{
                        backgroundColor: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      Manage Tours <ArrowRight size={13} />
                    </button>
                  </div>
                )}

                {/* Messes List */}
                <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '20px', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: '#f8fafc' }}>
                      Platform Messes Directory ({messesList.length})
                    </h3>
                    {authToken && (
                      <button
                        onClick={() => fetchAdminData(authToken)}
                        disabled={isLoadingAdmin}
                        style={{
                          backgroundColor: '#0f172a',
                          color: '#38bdf8',
                          border: '1px solid #334155',
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

                  {/* Desktop Table View */}
                  <div className="table-desktop-view" style={{ overflowX: 'auto' }}>
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

                  {/* Mobile Individual Cards View */}
                  <div className="cards-mobile-view">
                    {messesList.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                        No messes created yet.
                      </div>
                    ) : (
                      messesList.map((m) => (
                        <div
                          key={m.id}
                          style={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            padding: '14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontWeight: '700', fontSize: '14px', color: '#f8fafc' }}>{m.name}</div>
                            <span style={{ backgroundColor: '#064e3b', color: '#6ee7b7', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '600' }}>
                              {m.activeMembersCount} active
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Invite Code:</span>
                            <span style={{ backgroundColor: '#1e293b', border: '1px solid #475569', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', color: '#38bdf8', fontSize: '12px' }}>
                              {m.inviteCode}
                            </span>
                          </div>

                          <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                            <span style={{ color: '#94a3b8' }}>Manager:</span> {m.managerName} ({m.managerEmail})
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '8px', borderTop: '1px solid #1e293b' }}>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              Created: {new Date(m.createdAt).toLocaleDateString()}
                            </span>
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
                              <Trash2 size={12} /> {deletingMessId === m.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: User Directory ================= */}
        {activeTab === 'users' && (
          <div>
            {!currentUser?.isSuperAdmin ? (
              <div style={{ backgroundColor: '#1e293b', padding: '28px', borderRadius: '8px', textAlign: 'center', border: '1px solid #334155' }}>
                <Crown size={32} color="#f59e0b" style={{ margin: '0 auto 12px auto' }} />
                <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 6px 0', color: '#f8fafc' }}>
                  Super Admin Authentication Required
                </h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px 0' }}>
                  Sign in above with credentials for <code>fardin1.codezzi@gmail.com</code> to access user profiles and reset credentials.
                </p>
              </div>
            ) : (
              <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '20px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: '#f8fafc' }}>
                      Registered Users ({filteredUsers.length} of {usersList.length})
                    </h3>
                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                      Search users, view mess memberships, and reset lost passwords.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: '#64748b' }} />
                      <input
                        type="text"
                        placeholder="Search by name, email, mess..."
                        value={searchUserQuery}
                        onChange={(e) => setSearchUserQuery(e.target.value)}
                        style={{
                          padding: '7px 10px 7px 30px',
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '12px',
                          width: '220px',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Desktop Users Table */}
                <div className="table-desktop-view" style={{ overflowX: 'auto' }}>
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
                                <KeyRound size={12} /> Reset Credentials
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Individual Cards for Users */}
                <div className="cards-mobile-view">
                  {filteredUsers.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                      No users matched your query.
                    </div>
                  ) : (
                    filteredUsers.map((u) => (
                      <div
                        key={u.id}
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontWeight: '700', fontSize: '14px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{u.name}</span>
                            {u.isSuperAdmin && (
                              <span style={{ backgroundColor: '#78350f', color: '#fbbf24', padding: '2px 5px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <Crown size={10} /> Admin
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            {new Date(u.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                          <div><span style={{ color: '#64748b' }}>Email:</span> {u.email}</div>
                          <div><span style={{ color: '#64748b' }}>Phone:</span> {u.phone || 'None'}</div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {u.activeMess ? (
                            <span style={{ backgroundColor: '#1e1b4b', color: '#a5b4fc', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                              {u.activeMess.name} ({u.activeMess.inviteCode})
                            </span>
                          ) : (
                            <span style={{ color: '#64748b', fontSize: '11px' }}>No active mess</span>
                          )}

                          {u.currentRole === 'MANAGER' ? (
                            <span style={{ backgroundColor: '#78350f', color: '#fde68a', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>
                              MANAGER
                            </span>
                          ) : u.currentRole === 'MEMBER' ? (
                            <span style={{ backgroundColor: '#064e3b', color: '#a7f3d0', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>
                              MEMBER
                            </span>
                          ) : null}
                        </div>

                        <div style={{ marginTop: '4px', paddingTop: '8px', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => openEditUserModal(u)}
                            style={{
                              backgroundColor: '#2563eb',
                              color: '#fff',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <KeyRound size={12} /> Reset Credentials
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: Tour Expense Management ================= */}
        {activeTab === 'tours' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header & Quick Action Buttons */}
            <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '16px 20px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Compass size={18} color="#38bdf8" /> Tour Expense Management System
                </h2>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                  Manage tour budgets, deposits, shared expenses & member fair-share balances with Tour Lead & Accountant roles.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setIsCreateTourOpen(true)}
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    padding: '7px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Plus size={14} /> Create Tour
                </button>
                <button
                  onClick={() => setIsJoinTourOpen(true)}
                  style={{
                    backgroundColor: '#1e293b',
                    color: '#e2e8f0',
                    border: '1px solid #475569',
                    padding: '7px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <MapPin size={14} /> Join via Code
                </button>
                <button
                  onClick={fetchTours}
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#38bdf8',
                    border: '1px solid #334155',
                    padding: '7px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <RefreshCw size={12} />
                </button>
              </div>
            </div>

            {/* If a tour is currently inspected, show Detailed View */}
            {selectedTourDetails ? (
              <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '20px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Back button & Tour Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      onClick={() => setSelectedTourDetails(null)}
                      style={{
                        backgroundColor: '#0f172a',
                        color: '#94a3b8',
                        border: '1px solid #334155',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      ← Back to All Tours
                    </button>
                    <div>
                      <h3 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: '#f8fafc' }}>
                        {selectedTourDetails.tour.name}
                      </h3>
                      <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                        <span>📍 {selectedTourDetails.tour.destination || 'Unspecified Location'}</span>
                        <span>•</span>
                        <span>Invite Code: <strong style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{selectedTourDetails.tour.inviteCode}</strong></span>
                        <span>•</span>
                        <span style={{ backgroundColor: '#064e3b', color: '#6ee7b7', padding: '1px 5px', borderRadius: '4px', fontSize: '10px' }}>
                          {selectedTourDetails.tour.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setIsAddExpenseOpen(true)}
                      style={{
                        backgroundColor: '#b91c1c',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Receipt size={13} /> Add Expense
                    </button>
                    <button
                      onClick={() => setIsAddDepositOpen(true)}
                      style={{
                        backgroundColor: '#059669',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Wallet size={13} /> Add Deposit
                    </button>
                    <button
                      onClick={() => setIsAddMemberOpen(true)}
                      style={{
                        backgroundColor: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <UserPlus size={13} /> Add Member
                    </button>
                  </div>
                </div>

                {/* Tour KPI Summary Cards */}
                <div className="tour-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                  <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Total Budget</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', marginTop: '2px' }}>
                      ৳{selectedTourDetails.summary.budget.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Total Deposits</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#34d399', marginTop: '2px' }}>
                      ৳{selectedTourDetails.summary.totalDeposits.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Total Expenses</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#f87171', marginTop: '2px' }}>
                      ৳{selectedTourDetails.summary.totalExpenses.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Fund Balance</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: selectedTourDetails.summary.balance >= 0 ? '#38bdf8' : '#ef4444', marginTop: '2px' }}>
                      ৳{selectedTourDetails.summary.balance.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Per-Member Share</div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: '#fbbf24', marginTop: '2px' }}>
                      ৳{selectedTourDetails.summary.perMemberShare.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Sub Tab Navigation */}
                <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #334155', paddingBottom: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setTourSubTab('overview')}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: tourSubTab === 'overview' ? '#0284c7' : '#0f172a',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Members & Balances ({selectedTourDetails.members.length})
                  </button>
                  <button
                    onClick={() => setTourSubTab('expenses')}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: tourSubTab === 'expenses' ? '#0284c7' : '#0f172a',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Expenses List ({selectedTourDetails.expenses.length})
                  </button>
                  <button
                    onClick={() => setTourSubTab('deposits')}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: tourSubTab === 'deposits' ? '#0284c7' : '#0f172a',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Deposits / Payments ({selectedTourDetails.deposits.length})
                  </button>
                </div>

                {/* Sub Tab 1: Members & Balances */}
                {tourSubTab === 'overview' && (
                  <div>
                    {/* Desktop View */}
                    <div className="table-desktop-view" style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #334155', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase' }}>
                            <th style={{ padding: '8px 10px' }}>Member</th>
                            <th style={{ padding: '8px 10px' }}>Role</th>
                            <th style={{ padding: '8px 10px' }}>Paid / Deposited</th>
                            <th style={{ padding: '8px 10px' }}>Fair Share Cost</th>
                            <th style={{ padding: '8px 10px' }}>Net Balance</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Role / Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTourDetails.members.map((m) => (
                            <tr key={m.id} style={{ borderBottom: '1px solid #334155' }}>
                              <td style={{ padding: '10px', fontWeight: '600', color: '#f8fafc' }}>
                                <div>{m.name}</div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>{m.email || m.phone || 'No contact'}</div>
                              </td>
                              <td style={{ padding: '10px' }}>
                                <span
                                  style={{
                                    backgroundColor: m.role === 'LEAD' ? '#78350f' : m.role === 'ACCOUNTANT' ? '#1e1b4b' : '#064e3b',
                                    color: m.role === 'LEAD' ? '#fbbf24' : m.role === 'ACCOUNTANT' ? '#a5b4fc' : '#a7f3d0',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: '700',
                                  }}
                                >
                                  {m.role}
                                </span>
                              </td>
                              <td style={{ padding: '10px', color: '#34d399', fontWeight: '600' }}>
                                ৳{m.totalDeposited.toLocaleString()}
                              </td>
                              <td style={{ padding: '10px', color: '#94a3b8' }}>
                                ৳{m.shareCost.toLocaleString()}
                              </td>
                              <td style={{ padding: '10px' }}>
                                {m.netBalance >= 0 ? (
                                  <span style={{ color: '#38bdf8', fontWeight: '700', fontSize: '12px' }}>
                                    +৳{m.netBalance.toLocaleString()} (Refund Due)
                                  </span>
                                ) : (
                                  <span style={{ color: '#f87171', fontWeight: '700', fontSize: '12px' }}>
                                    -৳{Math.abs(m.netBalance).toLocaleString()} (Due to Pay)
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '10px', textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  <select
                                    value={m.role}
                                    onChange={(e) => handleUpdateMemberRole(m.id, e.target.value)}
                                    style={{
                                      backgroundColor: '#0f172a',
                                      color: '#cbd5e1',
                                      border: '1px solid #334155',
                                      padding: '3px 6px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                    }}
                                  >
                                    <option value="MEMBER">MEMBER</option>
                                    <option value="ACCOUNTANT">ACCOUNTANT</option>
                                    <option value="LEAD">LEAD</option>
                                  </select>
                                  <button
                                    onClick={() => handleRemoveMember(m.id, m.name)}
                                    style={{
                                      backgroundColor: '#7f1d1d',
                                      color: '#fca5a5',
                                      border: '1px solid #b91c1c',
                                      padding: '3px 6px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards for Members */}
                    <div className="cards-mobile-view">
                      {selectedTourDetails.members.map((m) => (
                        <div
                          key={m.id}
                          style={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: '700', fontSize: '14px', color: '#f8fafc' }}>{m.name}</div>
                            <span
                              style={{
                                backgroundColor: m.role === 'LEAD' ? '#78350f' : m.role === 'ACCOUNTANT' ? '#1e1b4b' : '#064e3b',
                                color: m.role === 'LEAD' ? '#fbbf24' : m.role === 'ACCOUNTANT' ? '#a5b4fc' : '#a7f3d0',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: '700',
                              }}
                            >
                              {m.role}
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', marginTop: '4px' }}>
                            <div>
                              <span style={{ color: '#94a3b8' }}>Deposited:</span>{' '}
                              <strong style={{ color: '#34d399' }}>৳{m.totalDeposited}</strong>
                            </div>
                            <div>
                              <span style={{ color: '#94a3b8' }}>Fair Share:</span>{' '}
                              <strong style={{ color: '#e2e8f0' }}>৳{m.shareCost}</strong>
                            </div>
                          </div>

                          <div style={{ fontSize: '12px', marginTop: '2px' }}>
                            <span style={{ color: '#94a3b8' }}>Status:</span>{' '}
                            {m.netBalance >= 0 ? (
                              <span style={{ color: '#38bdf8', fontWeight: '700' }}>
                                +৳{m.netBalance} (Refund Due)
                              </span>
                            ) : (
                              <span style={{ color: '#f87171', fontWeight: '700' }}>
                                -৳{Math.abs(m.netBalance)} (Due to Pay)
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '8px', borderTop: '1px solid #1e293b' }}>
                            <select
                              value={m.role}
                              onChange={(e) => handleUpdateMemberRole(m.id, e.target.value)}
                              style={{
                                backgroundColor: '#1e293b',
                                color: '#cbd5e1',
                                border: '1px solid #334155',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                              }}
                            >
                              <option value="MEMBER">Role: MEMBER</option>
                              <option value="ACCOUNTANT">Role: ACCOUNTANT</option>
                              <option value="LEAD">Role: LEAD</option>
                            </select>
                            <button
                              onClick={() => handleRemoveMember(m.id, m.name)}
                              style={{
                                backgroundColor: '#7f1d1d',
                                color: '#fca5a5',
                                border: '1px solid #b91c1c',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub Tab 2: Expenses List */}
                {tourSubTab === 'expenses' && (
                  <div>
                    {/* Desktop View */}
                    <div className="table-desktop-view" style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #334155', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase' }}>
                            <th style={{ padding: '8px 10px' }}>Expense Item</th>
                            <th style={{ padding: '8px 10px' }}>Category</th>
                            <th style={{ padding: '8px 10px' }}>Amount (৳)</th>
                            <th style={{ padding: '8px 10px' }}>Spent By</th>
                            <th style={{ padding: '8px 10px' }}>Date</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTourDetails.expenses.length === 0 ? (
                            <tr>
                              <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                                No expenses recorded yet. Click &quot;Add Expense&quot; above.
                              </td>
                            </tr>
                          ) : (
                            selectedTourDetails.expenses.map((exp) => (
                              <tr key={exp.id} style={{ borderBottom: '1px solid #334155' }}>
                                <td style={{ padding: '10px', fontWeight: '600', color: '#f8fafc' }}>
                                  <div>{exp.title}</div>
                                  {exp.notes && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{exp.notes}</div>}
                                </td>
                                <td style={{ padding: '10px' }}>
                                  <span style={{ backgroundColor: '#1e293b', border: '1px solid #475569', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', color: '#38bdf8' }}>
                                    {exp.category}
                                  </span>
                                </td>
                                <td style={{ padding: '10px', fontWeight: '700', color: '#f87171' }}>
                                  ৳{exp.amount.toLocaleString()}
                                </td>
                                <td style={{ padding: '10px', color: '#cbd5e1' }}>
                                  {exp.spentBy}
                                </td>
                                <td style={{ padding: '10px', color: '#94a3b8', fontSize: '12px' }}>
                                  {new Date(exp.date).toLocaleDateString()}
                                </td>
                                <td style={{ padding: '10px', textAlign: 'right' }}>
                                  <button
                                    onClick={() => handleDeleteExpense(exp.id)}
                                    style={{
                                      backgroundColor: '#7f1d1d',
                                      color: '#fca5a5',
                                      border: '1px solid #b91c1c',
                                      padding: '3px 8px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards for Expenses */}
                    <div className="cards-mobile-view">
                      {selectedTourDetails.expenses.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                          No expenses recorded yet.
                        </div>
                      ) : (
                        selectedTourDetails.expenses.map((exp) => (
                          <div
                            key={exp.id}
                            style={{
                              backgroundColor: '#0f172a',
                              border: '1px solid #334155',
                              borderRadius: '6px',
                              padding: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ fontWeight: '700', fontSize: '14px', color: '#f8fafc' }}>{exp.title}</div>
                              <span style={{ color: '#f87171', fontWeight: '800', fontSize: '14px' }}>
                                ৳{exp.amount}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                              <span style={{ backgroundColor: '#1e293b', border: '1px solid #475569', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', color: '#38bdf8' }}>
                                {exp.category}
                              </span>
                              <span style={{ color: '#94a3b8' }}>Spent by: {exp.spentBy}</span>
                            </div>

                            {exp.notes && (
                              <div style={{ fontSize: '11px', color: '#cbd5e1', fontStyle: 'italic' }}>
                                Note: {exp.notes}
                              </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '6px', borderTop: '1px solid #1e293b' }}>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>
                                {new Date(exp.date).toLocaleDateString()}
                              </span>
                              <button
                                onClick={() => handleDeleteExpense(exp.id)}
                                style={{
                                  backgroundColor: '#7f1d1d',
                                  color: '#fca5a5',
                                  border: '1px solid #b91c1c',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Sub Tab 3: Deposits List */}
                {tourSubTab === 'deposits' && (
                  <div>
                    {/* Desktop View */}
                    <div className="table-desktop-view" style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #334155', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase' }}>
                            <th style={{ padding: '8px 10px' }}>Member / Paid By</th>
                            <th style={{ padding: '8px 10px' }}>Amount (৳)</th>
                            <th style={{ padding: '8px 10px' }}>Date</th>
                            <th style={{ padding: '8px 10px' }}>Notes / Transaction</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTourDetails.deposits.length === 0 ? (
                            <tr>
                              <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                                No deposits recorded yet. Click &quot;Add Deposit&quot; above.
                              </td>
                            </tr>
                          ) : (
                            selectedTourDetails.deposits.map((dep) => (
                              <tr key={dep.id} style={{ borderBottom: '1px solid #334155' }}>
                                <td style={{ padding: '10px', fontWeight: '600', color: '#f8fafc' }}>
                                  {dep.paidBy}
                                </td>
                                <td style={{ padding: '10px', fontWeight: '700', color: '#34d399' }}>
                                  ৳{dep.amount.toLocaleString()}
                                </td>
                                <td style={{ padding: '10px', color: '#94a3b8', fontSize: '12px' }}>
                                  {new Date(dep.date).toLocaleDateString()}
                                </td>
                                <td style={{ padding: '10px', color: '#cbd5e1', fontSize: '12px' }}>
                                  {dep.notes || '—'}
                                </td>
                                <td style={{ padding: '10px', textAlign: 'right' }}>
                                  <button
                                    onClick={() => handleDeleteDeposit(dep.id)}
                                    style={{
                                      backgroundColor: '#7f1d1d',
                                      color: '#fca5a5',
                                      border: '1px solid #b91c1c',
                                      padding: '3px 8px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards for Deposits */}
                    <div className="cards-mobile-view">
                      {selectedTourDetails.deposits.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                          No deposits recorded yet.
                        </div>
                      ) : (
                        selectedTourDetails.deposits.map((dep) => (
                          <div
                            key={dep.id}
                            style={{
                              backgroundColor: '#0f172a',
                              border: '1px solid #334155',
                              borderRadius: '6px',
                              padding: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontWeight: '700', fontSize: '14px', color: '#f8fafc' }}>{dep.paidBy}</div>
                              <span style={{ color: '#34d399', fontWeight: '800', fontSize: '14px' }}>
                                +৳{dep.amount}
                              </span>
                            </div>

                            {dep.notes && (
                              <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                                Note: {dep.notes}
                              </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '6px', borderTop: '1px solid #1e293b' }}>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>
                                {new Date(dep.date).toLocaleDateString()}
                              </span>
                              <button
                                onClick={() => handleDeleteDeposit(dep.id)}
                                style={{
                                  backgroundColor: '#7f1d1d',
                                  color: '#fca5a5',
                                  border: '1px solid #b91c1c',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* All Tours List */
              <div style={{ backgroundColor: '#1e293b', borderRadius: '8px', padding: '20px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: '#f8fafc' }}>
                    Available Tours ({toursList.length})
                  </h3>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Click &quot;View & Manage&quot; to inspect budgets, expenses, and member balances.
                  </span>
                </div>

                {/* Desktop Tours Table */}
                <div className="table-desktop-view" style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #334155', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '10px 12px' }}>Tour Name</th>
                        <th style={{ padding: '10px 12px' }}>Destination</th>
                        <th style={{ padding: '10px 12px' }}>Invite Code</th>
                        <th style={{ padding: '10px 12px' }}>Budget (৳)</th>
                        <th style={{ padding: '10px 12px' }}>Deposits / Expenses</th>
                        <th style={{ padding: '10px 12px' }}>Members</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {toursList.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                            No tours found. Click &quot;Create Tour&quot; above to launch a new tour!
                          </td>
                        </tr>
                      ) : (
                        toursList.map((t) => (
                          <tr key={t.id} style={{ borderBottom: '1px solid #334155' }}>
                            <td style={{ padding: '12px', fontWeight: '600', color: '#f8fafc' }}>
                              <div>{t.name}</div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>Lead: {t.leadName}</div>
                            </td>
                            <td style={{ padding: '12px', color: '#cbd5e1' }}>
                              {t.destination || '—'}
                            </td>
                            <td style={{ padding: '12px' }}>
                              <span style={{ backgroundColor: '#0f172a', border: '1px solid #475569', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', color: '#38bdf8' }}>
                                {t.inviteCode}
                              </span>
                            </td>
                            <td style={{ padding: '12px', color: '#fbbf24', fontWeight: '600' }}>
                              ৳{t.budget.toLocaleString()}
                            </td>
                            <td style={{ padding: '12px' }}>
                              <div style={{ color: '#34d399', fontSize: '12px' }}>Deposits: ৳{t.totalDeposits.toLocaleString()}</div>
                              <div style={{ color: '#f87171', fontSize: '12px' }}>Expenses: ৳{t.totalExpenses.toLocaleString()}</div>
                            </td>
                            <td style={{ padding: '12px' }}>
                              <span style={{ backgroundColor: '#064e3b', color: '#6ee7b7', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                                {t.membersCount} participants
                              </span>
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                  onClick={() => fetchTourDetails(t.id)}
                                  disabled={isLoadingTourDetails}
                                  style={{
                                    backgroundColor: '#0284c7',
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
                                  View & Manage <ChevronRight size={12} />
                                </button>
                                {(t.myRole === 'LEAD' || currentUser?.isSuperAdmin) && (
                                  <button
                                    onClick={() => handleDeleteTour(t.id, t.name)}
                                    disabled={deletingTourId === t.id}
                                    style={{
                                      backgroundColor: '#7f1d1d',
                                      color: '#fca5a5',
                                      border: '1px solid #b91c1c',
                                      padding: '5px 8px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Individual Cards for Tours */}
                <div className="cards-mobile-view">
                  {toursList.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                      No tours found. Click &quot;Create Tour&quot; above to launch a new tour!
                    </div>
                  ) : (
                    toursList.map((t) => (
                      <div
                        key={t.id}
                        style={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '6px',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: '700', fontSize: '15px', color: '#f8fafc' }}>{t.name}</div>
                            <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '2px' }}>
                              📍 {t.destination || 'Unspecified location'}
                            </div>
                          </div>
                          <span style={{ backgroundColor: '#064e3b', color: '#6ee7b7', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '600' }}>
                            {t.status}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Invite Code:</span>
                          <span style={{ backgroundColor: '#1e293b', border: '1px solid #475569', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', color: '#38bdf8', fontSize: '12px' }}>
                            {t.inviteCode}
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', marginTop: '4px' }}>
                          <div>
                            <span style={{ color: '#94a3b8' }}>Budget:</span>{' '}
                            <strong style={{ color: '#fbbf24' }}>৳{t.budget}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#94a3b8' }}>Members:</span>{' '}
                            <strong style={{ color: '#f8fafc' }}>{t.membersCount}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#94a3b8' }}>Deposits:</span>{' '}
                            <strong style={{ color: '#34d399' }}>৳{t.totalDeposits}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#94a3b8' }}>Expenses:</span>{' '}
                            <strong style={{ color: '#f87171' }}>৳{t.totalExpenses}</strong>
                          </div>
                        </div>

                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          Lead: {t.leadName}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '8px', borderTop: '1px solid #1e293b' }}>
                          <button
                            onClick={() => fetchTourDetails(t.id)}
                            style={{
                              backgroundColor: '#0284c7',
                              color: '#fff',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            View & Manage <ChevronRight size={12} />
                          </button>
                          {(t.myRole === 'LEAD' || currentUser?.isSuperAdmin) && (
                            <button
                              onClick={() => handleDeleteTour(t.id, t.name)}
                              style={{
                                backgroundColor: '#7f1d1d',
                                color: '#fca5a5',
                                border: '1px solid #b91c1c',
                                padding: '6px 10px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ================= MODAL: Edit User & Reset Password ================= */}
      {selectedUserForEdit && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
            boxSizing: 'border-box',
          }}
        >
          <div
            className="modal-box-responsive"
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <KeyRound size={18} color="#f59e0b" /> User Account Management
                </h3>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                  Reset forgotten passwords or update user profile information.
                </p>
              </div>
              <button
                onClick={closeEditUserModal}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateUserSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-2col-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '500' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editUserForm.name}
                    onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '500' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={editUserForm.email}
                    onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '500' }}>
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+8801..."
                  value={editUserForm.phone}
                  onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Password Reset Section */}
              <div style={{ backgroundColor: '#090d16', padding: '14px', borderRadius: '6px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', color: '#f8fafc', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Lock size={13} color="#f59e0b" /> Set New Password
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    style={{
                      backgroundColor: '#1e293b',
                      color: '#38bdf8',
                      border: '1px solid #334155',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Dices size={12} /> Auto-Generate
                  </button>
                </div>

                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Leave blank to keep existing password"
                    value={editUserForm.newPassword}
                    onChange={(e) => setEditUserForm({ ...editUserForm, newPassword: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 75px 8px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '13px',
                      fontFamily: showPassword ? 'monospace' : 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ position: 'absolute', right: '6px', top: '5px', display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        backgroundColor: '#1e293b',
                        border: 'none',
                        color: '#94a3b8',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    {editUserForm.newPassword && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(editUserForm.newPassword);
                          showToast('Password copied to clipboard', 'info');
                        }}
                        style={{
                          backgroundColor: '#1e293b',
                          border: 'none',
                          color: '#38bdf8',
                          padding: '4px 6px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        <Copy size={13} />
                      </button>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0 0' }}>
                  Provide this password to the user once updated so they can sign back in.
                </p>
              </div>

              {/* Super Admin Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}>
                <input
                  type="checkbox"
                  id="modalSuperAdminToggle"
                  checked={editUserForm.isSuperAdmin}
                  onChange={(e) => setEditUserForm({ ...editUserForm, isSuperAdmin: e.target.checked })}
                />
                <label htmlFor="modalSuperAdminToggle" style={{ fontSize: '12px', color: '#e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Grant Super Admin Privileges <Crown size={12} color="#fbbf24" />
                </label>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={closeEditUserModal}
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#94a3b8',
                    border: '1px solid #334155',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingUser}
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Check size={14} /> {isUpdatingUser ? 'Saving...' : 'Save & Apply'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: Create Tour ================= */}
      {isCreateTourOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
            boxSizing: 'border-box',
          }}
        >
          <div
            className="modal-box-responsive"
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Compass size={18} color="#38bdf8" /> Create New Tour
                </h3>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                  You will automatically become the Tour Lead.
                </p>
              </div>
              <button
                onClick={() => setIsCreateTourOpen(false)}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTour} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '500' }}>
                  Tour Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sajek Valley Monsoon Tour 2026"
                  value={createTourForm.name}
                  onChange={(e) => setCreateTourForm({ ...createTourForm, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div className="form-2col-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '500' }}>
                    Destination
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sajek, Rangamati"
                    value={createTourForm.destination}
                    onChange={(e) => setCreateTourForm({ ...createTourForm, destination: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '500' }}>
                    Total Target Budget (৳)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 45000"
                    value={createTourForm.budget}
                    onChange={(e) => setCreateTourForm({ ...createTourForm, budget: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div className="form-2col-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '500' }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={createTourForm.startDate}
                    onChange={(e) => setCreateTourForm({ ...createTourForm, startDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '500' }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={createTourForm.endDate}
                    onChange={(e) => setCreateTourForm({ ...createTourForm, endDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '500' }}>
                  Tour Description / Plan Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Details regarding travel mode, itinerary, hotels..."
                  value={createTourForm.description}
                  onChange={(e) => setCreateTourForm({ ...createTourForm, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateTourOpen(false)}
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#94a3b8',
                    border: '1px solid #334155',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTour}
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Plus size={14} /> {isCreatingTour ? 'Creating...' : 'Create Tour'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: Join Tour ================= */}
      {isJoinTourOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
            boxSizing: 'border-box',
          }}
        >
          <div
            className="modal-box-responsive"
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '420px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={18} color="#38bdf8" /> Join Tour
              </h3>
              <button
                onClick={() => setIsJoinTourOpen(false)}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleJoinTour} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '500' }}>
                  Tour Invite Code (e.g. TOUR-XXXXX)
                </label>
                <input
                  type="text"
                  required
                  placeholder="TOUR-XXXXX"
                  value={joinTourCode}
                  onChange={(e) => setJoinTourCode(e.target.value.toUpperCase())}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#38bdf8',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    letterSpacing: '1px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsJoinTourOpen(false)}
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#94a3b8',
                    border: '1px solid #334155',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isJoiningTour}
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Check size={14} /> {isJoiningTour ? 'Joining...' : 'Join Tour'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: Record Expense ================= */}
      {isAddExpenseOpen && selectedTourDetails && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
            boxSizing: 'border-box',
          }}
        >
          <div
            className="modal-box-responsive"
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '480px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={18} color="#f87171" /> Record Tour Expense
              </h3>
              <button
                onClick={() => setIsAddExpenseOpen(false)}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '500' }}>
                  Expense Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scania AC Bus Tickets, Lunch at Dhanshiri"
                  value={addExpenseForm.title}
                  onChange={(e) => setAddExpenseForm({ ...addExpenseForm, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div className="form-2col-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '500' }}>
                    Amount (৳) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 3500"
                    value={addExpenseForm.amount}
                    onChange={(e) => setAddExpenseForm({ ...addExpenseForm, amount: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '500' }}>
                    Category
                  </label>
                  <select
                    value={addExpenseForm.category}
                    onChange={(e) => setAddExpenseForm({ ...addExpenseForm, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="Food">Food / Meals</option>
                    <option value="Transport">Transport / Tickets</option>
                    <option value="Hotel">Hotel / Resort</option>
                    <option value="Sightseeing">Sightseeing / Entry</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Misc">Miscellaneous</option>
                  </select>
                </div>
              </div>

              <div className="form-2col-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '500' }}>
                    Spent By (Payer)
                  </label>
                  <select
                    value={addExpenseForm.memberId}
                    onChange={(e) => setAddExpenseForm({ ...addExpenseForm, memberId: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="">Shared Tour Fund</option>
                    {selectedTourDetails.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '500' }}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={addExpenseForm.date}
                    onChange={(e) => setAddExpenseForm({ ...addExpenseForm, date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '500' }}>
                  Notes / Receipt Info
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid via Cash from fund"
                  value={addExpenseForm.notes}
                  onChange={(e) => setAddExpenseForm({ ...addExpenseForm, notes: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(false)}
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#94a3b8',
                    border: '1px solid #334155',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingExpense}
                  style={{
                    backgroundColor: '#b91c1c',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Receipt size={14} /> {isAddingExpense ? 'Saving...' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: Record Deposit ================= */}
      {isAddDepositOpen && selectedTourDetails && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
            boxSizing: 'border-box',
          }}
        >
          <div
            className="modal-box-responsive"
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '460px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet size={18} color="#34d399" /> Record Member Deposit
              </h3>
              <button
                onClick={() => setIsAddDepositOpen(false)}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddDeposit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '500' }}>
                  Member Depositing *
                </label>
                <select
                  required
                  value={addDepositForm.memberId}
                  onChange={(e) => setAddDepositForm({ ...addDepositForm, memberId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">Select Member</option>
                  {selectedTourDetails.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role}) — Already paid ৳{m.totalDeposited}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-2col-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '500' }}>
                    Amount (৳) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 5000"
                    value={addDepositForm.amount}
                    onChange={(e) => setAddDepositForm({ ...addDepositForm, amount: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '500' }}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={addDepositForm.date}
                    onChange={(e) => setAddDepositForm({ ...addDepositForm, date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '500' }}>
                  Notes / Payment Method
                </label>
                <input
                  type="text"
                  placeholder="e.g. bKash Trx 9AB12..., Cash to Accountant"
                  value={addDepositForm.notes}
                  onChange={(e) => setAddDepositForm({ ...addDepositForm, notes: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddDepositOpen(false)}
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#94a3b8',
                    border: '1px solid #334155',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingDeposit}
                  style={{
                    backgroundColor: '#059669',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Wallet size={14} /> {isAddingDeposit ? 'Recording...' : 'Record Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: Add Member ================= */}
      {isAddMemberOpen && selectedTourDetails && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
            boxSizing: 'border-box',
          }}
        >
          <div
            className="modal-box-responsive"
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '460px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={18} color="#38bdf8" /> Add Tour Participant
              </h3>
              <button
                onClick={() => setIsAddMemberOpen(false)}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '500' }}>
                  Member Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tanvir Hasan"
                  value={addMemberForm.name}
                  onChange={(e) => setAddMemberForm({ ...addMemberForm, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div className="form-2col-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '500' }}>
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="tanvir@example.com"
                    value={addMemberForm.email}
                    onChange={(e) => setAddMemberForm({ ...addMemberForm, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '500' }}>
                    Role
                  </label>
                  <select
                    value={addMemberForm.role}
                    onChange={(e) => setAddMemberForm({ ...addMemberForm, role: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="MEMBER">MEMBER (Participant)</option>
                    <option value="ACCOUNTANT">ACCOUNTANT (Manages Cash & Expenses)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '500' }}>
                  Phone Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="+8801..."
                  value={addMemberForm.phone}
                  onChange={(e) => setAddMemberForm({ ...addMemberForm, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#94a3b8',
                    border: '1px solid #334155',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingMember}
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <UserPlus size={14} /> {isAddingMember ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid #1e293b',
          backgroundColor: '#0b1120',
          padding: '16px 24px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#64748b',
          marginTop: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span>© {new Date().getFullYear()} {config.appName || 'Mess Meal Manager'}.</span>
          <span>•</span>
          <span>
            Created by{' '}
            <a
              href={config.creatorPortfolio || '#'}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#f59e0b', textDecoration: 'none', fontWeight: '600' }}
            >
              {config.creatorName}
            </a>
          </span>
          <span>•</span>
          <a href="/docs" target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'none' }}>
            API Docs
          </a>
        </div>
      </footer>
    </div>
  );
}
