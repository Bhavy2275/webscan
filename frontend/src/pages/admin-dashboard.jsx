/**
 * @fileoverview Admin Dashboard and User Management panel (Minimalist theme).
 * @module pages/admin-dashboard
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/use-auth';
import { supabase } from '../utils/supabase';
import { api } from '../api/client';
import { 
  Shield, Users, FileText, Trash2, Download, Eye, 
  Plus, UserMinus, LogOut, ArrowLeft, RefreshCw, AlertTriangle, 
  CheckCircle2, Folder, ChevronDown, ChevronRight, KeyRound, Mail, UserPlus
} from 'lucide-react';

export function AdminDashboard({ onNavigate }) {
  const { signOut } = useAuth();
  
  // Tab routing: 'scans' or 'users'
  const [activeTab, setActiveTab] = useState('scans');
  
  // Data lists
  const [scans, setScans] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Expand/collapse folders
  const [expandedFolders, setExpandedFolders] = useState({});

  // User creation form
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  function showToast(message, type = 'success') {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  }

  // Fetch all scans with uploader profile emails
  const fetchAllScans = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('scans')
        .select(`
          id,
          cloudinary_url,
          public_id,
          uploaded_at,
          date_folder,
          user_id,
          uploader:profiles (
            email
          )
        `)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setScans(data || []);
      
      // Auto-expand the first date folder
      if (data && data.length > 0) {
        const firstFolder = data[0].date_folder;
        setExpandedFolders(prev => ({ ...prev, [firstFolder]: true }));
      }
    } catch (err) {
      console.error('Error fetching scans:', err);
      showToast('Failed to fetch scans history.', 'error');
    }
  }, []);

  // Fetch profiles from backend
  const fetchUserProfiles = useCallback(async () => {
    try {
      const result = await api.get('/admin/users');
      if (result.success) {
        setProfiles(result.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      showToast('Failed to load user directories.', 'error');
    }
  }, []);

  // Combined data fetcher
  const reloadDashboardData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchAllScans(), fetchUserProfiles()]);
    setLoading(false);
  }, [fetchAllScans, fetchUserProfiles]);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      await Promise.all([fetchAllScans(), fetchUserProfiles()]);
      if (isMounted) {
        setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [fetchAllScans, fetchUserProfiles]);

  // Toggle accordion folder
  function toggleFolder(folderName) {
    setExpandedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  }

  // VIEW SCAN: Fetch signed URL from Express, and open it
  async function handleViewScan(scanId) {
    try {
      showToast('Generating signed secure link...', 'success');
      const result = await api.get(`/scans/${scanId}/signed-url`);
      if (result.success && result.signedUrl) {
        window.open(result.signedUrl, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error('No signed URL returned.');
      }
    } catch (err) {
      console.error('Failed to view scan:', err);
      showToast('Error opening secure viewing url.', 'error');
    }
  }

  // DOWNLOAD SCAN: Retrieves signed URL and downloads asset
  async function handleDownloadScan(scanId, publicId) {
    try {
      showToast('Preparing secure download...', 'success');
      const result = await api.get(`/scans/${scanId}/signed-url`);
      if (result.success && result.signedUrl) {
        const response = await fetch(result.signedUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = publicId.split('/').pop() + '.jpg';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showToast('Download started.', 'success');
      }
    } catch (err) {
      console.error('Download error:', err);
      showToast('Failed to download document scan.', 'error');
    }
  }

  // DELETE SCAN: Call Express backend delete
  async function handleDeleteScan(scanId) {
    if (!window.confirm('Are you sure you want to permanently delete this document scan from both cloud storage and database records?')) {
      return;
    }

    try {
      const result = await api.delete(`/scans/${scanId}`);
      if (result.success) {
        showToast('Scan deleted successfully.', 'success');
        fetchAllScans();
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast(err.message || 'Failed to delete scan.', 'error');
    }
  }

  // CREATE USER: Call Express backend
  async function handleCreateUser(e) {
    e.preventDefault();
    if (!newUserEmail || !newUserPassword || !newUserRole) {
      showToast('All user details are required.', 'error');
      return;
    }

    setFormSubmitting(true);
    try {
      const result = await api.post('/admin/users', {
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole
      });

      if (result.success) {
        showToast('New user profile successfully provisioned.', 'success');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserRole('user');
        fetchUserProfiles();
      }
    } catch (err) {
      console.error('User creation error:', err);
      showToast(err.message || 'Failed to create new user profile.', 'error');
    } finally {
      setFormSubmitting(false);
    }
  }

  // DELETE USER: Call Express backend
  async function handleDeleteUser(userId, email) {
    if (!window.confirm(`Are you sure you want to delete user "${email}"? This will terminate their credentials and cascade delete all their uploaded document scans.`)) {
      return;
    }

    try {
      const result = await api.delete(`/admin/users/${userId}`);
      if (result.success) {
        showToast('User profile deleted successfully.', 'success');
        reloadDashboardData();
      }
    } catch (err) {
      console.error('User deletion error:', err);
      showToast(err.message || 'Failed to delete user profile.', 'error');
    }
  }

  // Group scans by YYYY-MM-DD folder
  const groupedScans = scans.reduce((acc, scan) => {
    const folder = scan.date_folder;
    if (!acc[folder]) acc[folder] = [];
    acc[folder].push(scan);
    return acc;
  }, {});

  // Sort folders descending
  const sortedFolders = Object.keys(groupedScans).sort((a, b) => new Date(b) - new Date(a));

  function formatTimestamp(timestampString) {
    const d = new Date(timestampString);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-6 right-6 z-50 flex items-center space-x-3 p-4 rounded-xl shadow-lg border animate-fade-in ${
          toast.type === 'error' 
            ? 'bg-red-950/90 border-red-500/30 text-red-200' 
            : 'bg-zinc-900/90 border-zinc-700/50 text-white font-mono'
        }`}>
          {toast.type === 'error' ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header bar */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 pb-6 border-b border-zinc-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-widest uppercase font-mono flex items-center gap-2">
            <Shield className="h-5 w-5 text-white" />
            <span>Admin Console</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">Manage corporate document scans and user directories</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onNavigate('/')}
            className="py-2 px-4 rounded-xl bg-black hover:bg-zinc-900 text-zinc-400 hover:text-white font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2 cursor-pointer border border-zinc-800"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Go to Upload console</span>
          </button>

          <button
            onClick={() => signOut()}
            className="py-2 px-4 rounded-xl bg-black hover:bg-zinc-900 text-zinc-400 hover:text-white font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2 cursor-pointer border border-zinc-800"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Switch Tab controls */}
      <div className="flex space-x-4 mb-8 border-b border-zinc-850 pb-px">
        <button
          onClick={() => setActiveTab('scans')}
          className={`pb-4 px-2 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 relative cursor-pointer font-mono ${
            activeTab === 'scans' ? 'text-white font-semibold' : 'text-zinc-500 hover:text-white'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Scans Directory ({scans.length})</span>
          {activeTab === 'scans' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
          )}
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`pb-4 px-2 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 relative cursor-pointer font-mono ${
            activeTab === 'users' ? 'text-white font-semibold' : 'text-zinc-500 hover:text-white'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>User Profiles ({profiles.length})</span>
          {activeTab === 'users' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
          )}
        </button>
      </div>

      {loading ? (
        /* Large Loading Shimmer */
        <div className="p-8 rounded-2xl glass-panel flex flex-col items-center justify-center space-y-4 min-h-[300px] border border-zinc-800">
          <RefreshCw className="h-6 w-6 text-white animate-spin" />
          <p className="text-xs text-zinc-400 font-mono uppercase tracking-widest">Loading directories...</p>
        </div>
      ) : activeTab === 'scans' ? (
        /* SCANS MANAGEMENT SECTION */
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">Date Folders</h2>
            <button 
              onClick={reloadDashboardData}
              className="p-2 rounded-lg bg-black hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {sortedFolders.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center flex flex-col items-center border border-zinc-800">
              <Folder className="h-10 w-10 text-zinc-700 mb-3" />
              <p className="text-sm font-medium text-zinc-400 font-mono">No scans archived yet</p>
              <p className="text-xs text-zinc-650 mt-1">Uploaded scans will group automatically by date.</p>
            </div>
          ) : (
            sortedFolders.map((folderDate) => (
              <div key={folderDate} className="glass-panel rounded-xl overflow-hidden border border-zinc-850">
                {/* Accordion Folder Header */}
                <button
                  onClick={() => toggleFolder(folderDate)}
                  className="w-full p-4 bg-zinc-950/60 hover:bg-zinc-900/40 flex items-center justify-between transition-colors text-left border-b border-zinc-850 cursor-pointer font-mono"
                >
                  <div className="flex items-center gap-3">
                    <Folder className="h-4.5 w-4.5 text-white fill-white/5" />
                    <div>
                      <span className="font-bold text-white text-sm">{folderDate}</span>
                      <span className="text-[10px] text-zinc-400 ml-3 bg-zinc-900 px-2.5 py-0.5 rounded-full border border-zinc-800">
                        {groupedScans[folderDate].length} file{groupedScans[folderDate].length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  {expandedFolders[folderDate] ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
                </button>

                {/* Accordion File List */}
                {expandedFolders[folderDate] && (
                  <div className="p-4 bg-black/20 divide-y divide-zinc-900">
                    {groupedScans[folderDate].map((scan) => (
                      <div key={scan.id} className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 first:pt-1 last:pb-1">
                        {/* File details */}
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                          <div className="h-12 w-12 rounded-lg border border-zinc-800 overflow-hidden bg-black flex-shrink-0">
                            <img 
                              src={scan.cloudinary_url} 
                              alt="Scan" 
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </div>

                          <div className="min-w-0 font-mono">
                            <p className="text-xs font-bold text-white truncate max-w-xs md:max-w-md" title={scan.public_id}>
                              {scan.public_id.split('/').pop()}
                            </p>
                            <p className="text-[10px] text-zinc-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="text-zinc-400 truncate max-w-[150px] md:max-w-[250px]">
                                {scan.uploader?.email || 'System Account'}
                              </span>
                              <span className="text-zinc-700">•</span>
                              <span>{formatTimestamp(scan.uploaded_at)}</span>
                            </p>
                          </div>
                        </div>

                        {/* File Action Controls */}
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <button
                            onClick={() => handleViewScan(scan.id)}
                            className="p-2 rounded-lg bg-black hover:bg-white hover:text-black border border-zinc-800 hover:border-white text-zinc-400 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer font-mono"
                            title="Open scan preview"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">View</span>
                          </button>

                          <button
                            onClick={() => handleDownloadScan(scan.id, scan.public_id)}
                            className="p-2 rounded-lg bg-black hover:bg-white hover:text-black border border-zinc-800 hover:border-white text-zinc-400 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer font-mono"
                            title="Download scan locally"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">Download</span>
                          </button>

                          <button
                            onClick={() => handleDeleteScan(scan.id)}
                            className="p-2 rounded-lg bg-black hover:bg-red-950/40 hover:text-red-400 border border-zinc-800 hover:border-red-900/35 text-zinc-500 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer font-mono"
                            title="Delete scan"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">Delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        /* USER DIRECTORY & MANAGEMENT SECTION */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create User Form Card */}
          <div className="glass-panel rounded-2xl p-6 h-fit border border-zinc-800 lg:col-span-1">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6 flex items-center gap-2 font-mono">
              <UserPlus className="h-4.5 w-4.5 text-white" />
              <span>Add User Profile</span>
            </h2>

            <form onSubmit={handleCreateUser} className="space-y-5">
              <div className="space-y-2 font-mono">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative font-sans">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 pointer-events-none">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="employee@company.com"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl glass-input text-xs font-mono"
                    disabled={formSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2 font-mono">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Credentials Password
                </label>
                <div className="relative font-sans">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 pointer-events-none">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl glass-input text-xs font-mono"
                    disabled={formSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2 font-mono">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Profile Role
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-xs cursor-pointer select-none font-mono"
                  disabled={formSubmitting}
                >
                  <option value="user" className="bg-black text-white">User (Upload scanner only)</option>
                  <option value="admin" className="bg-black text-white">Admin (Full access console)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={formSubmitting}
                className="w-full mt-4 py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 disabled:bg-zinc-800 text-black disabled:text-zinc-500 font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer font-mono"
              >
                {formSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                <span>Create Profile</span>
              </button>
            </form>
          </div>

          {/* User Directory Table Card */}
          <div className="glass-panel rounded-2xl p-6 border border-zinc-800 lg:col-span-2">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-6 font-mono">Directory Registry</h2>
            
            <div className="overflow-x-auto font-mono">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 font-bold uppercase tracking-wider">
                    <th className="pb-3 pr-4">User Profiles</th>
                    <th className="pb-3 px-4">Metadata ID</th>
                    <th className="pb-3 px-4">Role</th>
                    <th className="pb-3 pl-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 text-zinc-300">
                  {profiles.map((profile) => (
                    <tr key={profile.id} className="hover:bg-zinc-900/20 transition-colors group">
                      <td className="py-3.5 pr-4 font-bold text-white">
                        {profile.email}
                      </td>
                      <td className="py-3.5 px-4 text-[10px] text-zinc-500 font-mono truncate max-w-[120px]" title={profile.id}>
                        {profile.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase border ${
                          profile.role === 'admin' 
                            ? 'bg-zinc-900 text-white border-zinc-700' 
                            : 'bg-black text-zinc-500 border-zinc-850'
                        }`}>
                          {profile.role}
                        </span>
                      </td>
                      <td className="py-3.5 pl-4 text-right">
                        <button
                          onClick={() => handleDeleteUser(profile.id, profile.email)}
                          className="p-1.5 rounded bg-black border border-zinc-800 text-zinc-500 hover:text-red-400 hover:bg-red-950/20 hover:border-red-900/35 transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Delete User account"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
