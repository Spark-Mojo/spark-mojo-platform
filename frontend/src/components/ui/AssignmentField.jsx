/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

const API_BASE = (import.meta.env.VITE_FRAPPE_URL || 'http://localhost:8000') + '/api/modules/tasks';

const MODES = [
  { key: 'person', label: '\u{1F464} Assign to Person' },
  { key: 'role', label: '\u{1F465} Assign to Role Queue' },
  { key: 'unassigned', label: '\u2014 Leave Unassigned' },
];

function getInitialMode(assignedUser, assignedRole) {
  if (assignedUser) return 'person';
  if (assignedRole) return 'role';
  return 'unassigned';
}

export default function AssignmentField({
  assignedUser,
  assignedRole,
  onUserChange,
  onRoleChange,
}) {
  const [mode, setMode] = useState(() => getInitialMode(assignedUser, assignedRole));
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetch(`${API_BASE}/users`, { credentials: 'include', headers: { 'Content-Type': 'application/json' } })
      .then(r => r.ok ? r.json() : { users: [] })
      .then(d => setUsers(d.users || []))
      .catch(() => {});
    fetch(`${API_BASE}/roles`, { credentials: 'include', headers: { 'Content-Type': 'application/json' } })
      .then(r => r.ok ? r.json() : { roles: [] })
      .then(d => setRoles(d.roles || []))
      .catch(() => {});
  }, []);

  // Sync display text with assignedUser
  useEffect(() => {
    if (assignedUser) {
      const match = users.find(u => u.email === assignedUser);
      if (match) setSearchText(match.full_name);
      else setSearchText(assignedUser);
    } else {
      setSearchText('');
    }
  }, [assignedUser, users]);

  // Reset mode when props change externally
  useEffect(() => {
    setMode(getInitialMode(assignedUser, assignedRole));
  }, [assignedUser, assignedRole]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setValidationError(null);
    if (newMode === 'person') {
      onRoleChange(null);
    } else if (newMode === 'role') {
      onUserChange(null);
      setSearchText('');
    } else {
      onUserChange(null);
      onRoleChange(null);
      setSearchText('');
    }
  };

  const filteredUsers = users.filter(u => {
    const q = searchText.toLowerCase();
    return u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const handleSelectUser = (user) => {
    setSearchText(user.full_name);
    onUserChange(user.email);
    setDropdownOpen(false);
    setValidationError(null);
  };

  const handleClearUser = () => {
    setSearchText('');
    onUserChange(null);
    setDropdownOpen(false);
    setValidationError(null);
  };

  const handleInputBlur = () => {
    // Delay to allow click on dropdown item
    setTimeout(() => {
      setDropdownOpen(false);
      if (mode === 'person' && searchText && !users.find(u => u.full_name === searchText || u.email === searchText)) {
        setValidationError('Select a valid user from the list');
      }
    }, 200);
  };

  const handleRoleChange = (value) => {
    onRoleChange(value || null);
    setValidationError(null);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const sortedRoles = [...roles].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div data-testid="assignment-field" className="space-y-3">
      {/* Segmented toggle */}
      <div data-testid="assignment-mode-toggle" className="inline-flex rounded-full border border-[#006666] overflow-hidden" style={{ height: 32 }}>
        {MODES.map((m) => (
          <button
            key={m.key}
            data-testid={`assignment-mode-${m.key}`}
            type="button"
            onClick={() => handleModeChange(m.key)}
            className={cn(
              'px-3 text-[13px] font-medium transition-colors whitespace-nowrap',
              mode === m.key
                ? 'bg-[#006666] text-white'
                : 'bg-white text-[#34424A] hover:bg-[#f0f7f7]'
            )}
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Person mode — combobox */}
      {mode === 'person' && (
        <div className="relative">
          <div className="relative">
            <input
              ref={inputRef}
              data-testid="assignment-user-combobox"
              type="text"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setDropdownOpen(true);
                setValidationError(null);
                if (!e.target.value) onUserChange(null);
              }}
              onFocus={() => setDropdownOpen(true)}
              onBlur={handleInputBlur}
              placeholder="Search by name or email..."
              className={cn(
                'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400 pr-8',
                validationError ? 'border-red-400' : 'border-gray-200'
              )}
            />
            {searchText && (
              <button
                type="button"
                data-testid="assignment-user-clear"
                onClick={handleClearUser}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
              >
                &#10005;
              </button>
            )}
          </div>
          {validationError && (
            <p data-testid="assignment-user-error" className="text-red-500 text-xs mt-1">{validationError}</p>
          )}
          {dropdownOpen && (
            <div
              ref={dropdownRef}
              data-testid="assignment-user-dropdown"
              className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
            >
              {filteredUsers.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-400">No users found</div>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.email}
                    type="button"
                    data-testid="assignment-user-option"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectUser(u)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#f0f7f7] text-left"
                  >
                    <span className="flex items-center justify-center h-7 w-7 rounded-full bg-[#006666] text-white text-[10px] font-bold shrink-0">
                      {u.initials}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm text-[#34424A]" style={{ fontFamily: "'Nunito Sans', sans-serif" }}>{u.full_name}</div>
                      <div className="text-[12px] text-gray-400 truncate">{u.email}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Role mode — select dropdown */}
      {mode === 'role' && (
        <div>
          <select
            data-testid="assignment-role-select"
            value={assignedRole || ''}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
          >
            <option value="">-- Select a Role --</option>
            {sortedRoles.map((r) => (
              <option key={r.name} value={r.name}>{r.name}</option>
            ))}
          </select>
          <p className="text-[12px] text-gray-400 italic mt-1">
            Unassigned-to-person tasks show a Claim button to eligible staff
          </p>
        </div>
      )}
    </div>
  );
}
