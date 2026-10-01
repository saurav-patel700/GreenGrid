import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Building2, UserX, UserCheck, AlertCircle, CheckCircle2, X } from 'lucide-react';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingState from '../../components/common/LoadingState';
import {
  fetchUsersApi, inviteUserApi, updateUserRoleApi, disableUserApi,
  enableUserApi, fetchFacilities, grantFacilityAccessApi, revokeFacilityAccessApi,
  fetchFacilityAccessApi
} from '../../services/api';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [roleModalUser, setRoleModalUser] = useState(null);
  const [facilityModalUser, setFacilityModalUser] = useState(null);
  const [confirmDisableUser, setConfirmDisableUser] = useState(null);

  // Invite Form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('facility_manager');
  const [selectedFacIds, setSelectedFacIds] = useState([]);
  const [inviteMsg, setInviteMsg] = useState('');
  const [inviteErr, setInviteErr] = useState('');
  const [submittingInvite, setSubmittingInvite] = useState(false);

  // Role Form
  const [newRole, setNewRole] = useState('facility_manager');
  const [newDept, setNewDept] = useState('');

  // Toast / Status Message
  const [actionNotice, setActionNotice] = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([fetchUsersApi(), fetchFacilities()])
      .then(([userData, facData]) => {
        if (Array.isArray(userData)) setUsers(userData);
        if (Array.isArray(facData)) setFacilities(facData);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSendInvite = async (e) => {
    e.preventDefault();
    setSubmittingInvite(true);
    setInviteMsg('');
    setInviteErr('');
    try {
      await inviteUserApi(inviteEmail, inviteRole, selectedFacIds);
      setInviteMsg(`Invitation dispatched to ${inviteEmail}.`);
      setInviteEmail('');
      setSelectedFacIds([]);
      loadData();
    } catch (err) {
      setInviteErr(err.message || 'Failed to send invitation.');
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleUpdateRoleSubmit = async (e) => {
    e.preventDefault();
    if (!roleModalUser) return;
    try {
      await updateUserRoleApi(roleModalUser.user_id, newRole, newDept);
      setActionNotice(`Updated privileges for ${roleModalUser.email}.`);
      setRoleModalUser(null);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to update role.');
    }
  };

  const handleToggleUserStatus = async (u) => {
    try {
      if (u.is_active) {
        await disableUserApi(u.user_id);
        setActionNotice(`Account for ${u.email} has been disabled.`);
      } else {
        await enableUserApi(u.user_id);
        setActionNotice(`Account for ${u.email} has been re-enabled.`);
      }
      setConfirmDisableUser(null);
      loadData();
    } catch (err) {
      alert(err.message || 'Operation failed.');
    }
  };

  const handleAssignFacility = async (userId, facId) => {
    try {
      await grantFacilityAccessApi(userId, facId);
      loadData();
    } catch (err) {
      alert(err.message || 'Facility assignment failed.');
    }
  };

  if (loading) {
    return <LoadingState message="Loading organization users and permission matrices..." />;
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Settings', path: '/app/settings' }, { label: 'User & Access Administration' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            User Administration & Role Permissions
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Manage organization members, invite new users, assign roles, and delegate facility access.
          </p>
        </div>

        <button onClick={() => setInviteModalOpen(true)} className="btn btn-primary">
          <UserPlus size={16} />
          Invite New Member
        </button>
      </div>

      {actionNotice && (
        <div style={{ background: 'var(--color-info-blue-bg)', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.8125rem', color: 'var(--color-info-blue)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-info-blue)' }}><X size={14} /></button>
        </div>
      )}

      {/* User Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Member Name</th>
              <th>Work Email</th>
              <th>Role Privilege</th>
              <th>Department</th>
              <th>Assigned Facilities</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                <td>{u.email}</td>
                <td>
                  <span className={`badge ${u.role === 'admin' ? 'badge-blue' : u.role === 'facility_manager' ? 'badge-green' : 'badge-gray'}`}>
                    <Shield size={12} />
                    {u.role.replace('_', ' ')}
                  </span>
                </td>
                <td style={{ color: 'var(--color-text-muted)' }}>{u.department || 'Operations'}</td>
                <td style={{ fontSize: '0.8125rem' }}>
                  {u.assigned_facilities && u.assigned_facilities.length > 0 ? (
                    u.assigned_facilities.map(f => f.name).join(', ')
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)', italic: 'true' }}>All Organization Sites</span>
                  )}
                </td>
                <td>
                  <StatusBadge status={u.is_active ? 'Active' : 'Disabled'} />
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => {
                        setRoleModalUser(u);
                        setNewRole(u.role);
                        setNewDept(u.department || '');
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      Edit Role
                    </button>
                    <button
                      onClick={() => setFacilityModalUser(u)}
                      className="btn btn-secondary btn-sm"
                    >
                      Facilities
                    </button>
                    {u.is_active ? (
                      <button
                        onClick={() => setConfirmDisableUser(u)}
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--color-danger-red)' }}
                      >
                        Disable
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleUserStatus(u)}
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--color-energy-green)' }}
                      >
                        Enable
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {inviteModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(2px)', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Invite Member to Organization</h3>
              <button onClick={() => setInviteModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {inviteMsg && (
              <div style={{ background: 'var(--color-energy-green-bg)', border: '1px solid rgba(5,150,105,0.2)', padding: '0.625rem', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--color-energy-green)', marginBottom: '1rem' }}>
                {inviteMsg}
              </div>
            )}
            {inviteErr && (
              <div style={{ background: 'var(--color-danger-red-bg)', border: '1px solid #fecaca', padding: '0.625rem', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--color-danger-red)', marginBottom: '1rem' }}>
                {inviteErr}
              </div>
            )}

            <form onSubmit={handleSendInvite} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Work Email Address *</label>
                <input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@organization.com" style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Assign Role Privilege</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', background: '#ffffff' }}>
                  <option value="admin">Organization Admin (Full Access)</option>
                  <option value="facility_manager">Facility Manager (Operational Control)</option>
                  <option value="analyst">Energy Analyst (Analytics & Reports)</option>
                  <option value="viewer">Viewer (Read-Only)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setInviteModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={submittingInvite} className="btn btn-primary">
                  {submittingInvite ? 'Dispatching Invite...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {roleModalUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(2px)', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Edit Member Role - {roleModalUser.full_name}</h3>
              <button onClick={() => setRoleModalUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleUpdateRoleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Role Privilege</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', background: '#ffffff' }}>
                  <option value="admin">Organization Admin</option>
                  <option value="facility_manager">Facility Manager</option>
                  <option value="analyst">Energy Analyst</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Department</label>
                <input type="text" value={newDept} onChange={(e) => setNewDept(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }} />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setRoleModalUser(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Privileges</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Disable Modal */}
      {confirmDisableUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(2px)', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-danger-red)', marginBottom: '1rem' }}>
              <AlertCircle size={24} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Disable User Account?</h3>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Are you sure you want to disable <strong>{confirmDisableUser.email}</strong>? They will be immediately blocked from signing into the organization.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDisableUser(null)} className="btn btn-secondary">Cancel</button>
              <button onClick={() => handleToggleUserStatus(confirmDisableUser)} className="btn btn-primary" style={{ background: 'var(--color-danger-red)' }}>
                Confirm Disable
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Facility Access Assignment Modal */}
      {facilityModalUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(2px)', padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Assign Facilities - {facilityModalUser.full_name}</h3>
              <button onClick={() => setFacilityModalUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              Select specific facilities to delegate explicit management access for this user.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {facilities.map((fac) => {
                const isAssigned = facilityModalUser.assigned_facilities?.some(af => af.id === fac.id);
                return (
                  <div key={fac.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0.875rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: '#ffffff' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{fac.name}</div>
                    <button
                      onClick={() => handleAssignFacility(facilityModalUser.user_id, fac.id)}
                      className={`btn ${isAssigned ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                    >
                      {isAssigned ? 'Access Granted' : 'Grant Access'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setFacilityModalUser(null)} className="btn btn-secondary">Done</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
