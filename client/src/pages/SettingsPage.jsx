import { useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useRefresh } from "../contexts/RefreshContext";
import { Users, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Skeleton, { SkeletonCard } from "../components/Skeleton";

const API = import.meta.env.VITE_API_URL;

export default function SettingsPage() {
  const { orgId } = useOutletContext();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const { refreshKey } = useRefresh();

  const [memberFilter, setMemberFilter] = useState("");

  const { data: org, isLoading: loading } = useQuery({
    queryKey: ['orgSettings', orgId, refreshKey],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API}/api/organizations/${orgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        navigate("/");
        throw new Error("Failed to fetch org");
      }
      return res.json();
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000
  });

  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-fade-in">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <SkeletonCard className="h-64" />
          </div>
          <SkeletonCard className="h-64" />
        </div>
      </div>
    );
  }

  if (!org) return null;

  const members = org.members || [];
  const filteredMembers = members.filter(m =>
    m.name?.toLowerCase().includes(memberFilter.toLowerCase()) ||
    m.email?.toLowerCase().includes(memberFilter.toLowerCase())
  );

  const roleBadge = (role) => {
    const styles = {
      OWNER: { bg: 'var(--primary-container)', color: 'var(--on-primary-container)' },
      ADMIN: { bg: 'var(--secondary-container)', color: 'var(--on-secondary-container)' },
      MEMBER: { bg: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' },
      VIEWER: { bg: 'var(--surface-container)', color: 'var(--outline)' },
    };
    const s = styles[role] || styles.MEMBER;
    return (
      <span className="label-caps px-2 py-0.5 rounded" style={{ background: s.bg, color: s.color, fontSize: '0.625rem' }}>
        {role}
      </span>
    );
  };

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--on-surface)' }}>Workspace Directory</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--on-surface-variant)' }}>
          View the active members and governance policy for this organization.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ─── LEFT COLUMN ─── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Members List */}
          <div className="glass-card-elevated p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" style={{ color: 'var(--on-surface)' }} />
                <h2 className="font-bold text-base" style={{ color: 'var(--on-surface)' }}>Active Members</h2>
                <span className="chip-azure">{members.length}</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter..."
                  className="input-field py-1.5 pl-8 text-sm w-40"
                  value={memberFilter}
                  onChange={e => setMemberFilter(e.target.value)}
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--outline)' }}>🔍</span>
              </div>
            </div>

            <div className="space-y-1">
              {filteredMembers.map(member => (
                <div key={member.id} className="flex items-center justify-between px-4 py-3 rounded-lg transition-colors hover:bg-[var(--surface-container)]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{
                      background: 'var(--surface-container-high)',
                      color: 'var(--on-surface)',
                    }}>
                      {member.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>{member.name}</p>
                      <p className="text-xs" style={{ color: 'var(--outline)' }}>{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {roleBadge(member.role)}
                  </div>
                </div>
              ))}
              {filteredMembers.length === 0 && (
                <div className="px-4 py-8 text-center text-[var(--outline)] text-sm">
                  No members found matching your search.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── RIGHT COLUMN: Governance ─── */}
        <div className="space-y-6">
          <div className="glass-card-elevated p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5" style={{ color: 'var(--on-surface)' }} />
              <h3 className="font-bold text-sm label-caps" style={{ color: 'var(--on-surface)' }}>Governance Policy</h3>
            </div>

            <div className="space-y-5">
              <div className="border-b pb-4" style={{ borderColor: 'var(--surface-container-high)' }}>
                <p className="label-caps mb-1" style={{ color: 'var(--outline)', fontSize: '0.625rem' }}>ORGANIZATION</p>
                <p className="font-bold text-sm" style={{ color: 'var(--on-surface)' }}>{org.name}</p>
              </div>
              <div className="border-b pb-4" style={{ borderColor: 'var(--surface-container-high)' }}>
                <p className="label-caps mb-1" style={{ color: 'var(--outline)', fontSize: '0.625rem' }}>DEFAULT ROLE</p>
                <p className="font-bold text-sm" style={{ color: 'var(--on-surface)' }}>Member</p>
              </div>
              <div className="border-b pb-4" style={{ borderColor: 'var(--surface-container-high)' }}>
                <p className="label-caps mb-1" style={{ color: 'var(--outline)', fontSize: '0.625rem' }}>YOUR ROLE</p>
                {roleBadge(org.myRole)}
              </div>
              <div>
                <p className="label-caps mb-1" style={{ color: 'var(--outline)', fontSize: '0.625rem' }}>PROJECTS</p>
                <p className="font-bold text-sm" style={{ color: 'var(--on-surface)' }}>{org.projects?.length || 0} active</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
