import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function UnauthorizedPage() {
  const { user, role } = useAuth();

  return (
    <div className="min-h-screen bg-[#EBEBEA] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-[#111111] flex items-center justify-center text-[#5FB57A] shadow-md group-hover:scale-105 transition-transform">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <span className="font-display text-2xl tracking-tight text-[#111111]">
            CHURN<span className="text-[#5FB57A]">GUARD</span>
          </span>
        </Link>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white border border-[#D8D8D5] rounded-2xl shadow-xl overflow-hidden p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <Lock className="w-7 h-7" />
        </div>

        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F3F3F1] border border-[#D8D8D5] text-[#111111] uppercase tracking-wider mb-2">
          403 Access Denied
        </span>

        <h2 className="text-xl font-black text-[#111111] tracking-tight">
          Role Permission Required
        </h2>

        <p className="mt-2 text-xs text-[#656565] leading-relaxed">
          Your current account role (<strong className="text-[#111111]">{role}</strong>) does not have sufficient authorization to view or modify this resource.
        </p>

        <div className="mt-5 p-3 rounded-xl bg-[#F3F3F1] border border-[#D8D8D5] text-left text-xs text-[#656565] space-y-1">
          <div className="font-semibold text-[#111111]">Role Permissions Hierarchy:</div>
          <div>• <strong>Admin:</strong> Manage users, security, model activation & settings.</div>
          <div>• <strong>Manager:</strong> Approve interventions, launch campaigns & training.</div>
          <div>• <strong>Analyst / Member:</strong> Explore customers, predict & view analytics.</div>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            to="/dashboard"
            className="flex-1 btn-ink py-2.5 text-xs flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </Link>
          <Link
            to="/settings"
            className="flex-1 btn-secondary py-2.5 text-xs flex items-center justify-center gap-1.5"
          >
            <span>Request Access</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#5FB57A]" />
          </Link>
        </div>
      </div>
    </div>
  );
}
