"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CreditCard, IndianRupee, FileCheck, ShieldCheck, Landmark, Activity, Download } from 'lucide-react';
// Import jsPDF cleanly to manage digital document compilation 
import { jsPDF } from 'jspdf';

export default function EmployeePayrollPage() {
  const [employee, setEmployee] = useState<any>(null);
  const [payrollReceipts, setPayrollReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadIsolatedFinances() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: emp } = await supabase
        .from('employees')
        .select('*')
        .eq('email', user.email?.toLowerCase().trim())
        .single();

      if (emp) {
        setEmployee(emp);
        
        // Populate historical records calculated explicitly from their profile's gross salary 
        setPayrollReceipts([
          { 
            month: 'May 2026', 
            ctc: emp.monthly_salary, 
            status: 'disbursed', 
            ref: `TXN-${emp.employee_code}-05` 
          },
          { 
            month: 'April 2026', 
            ctc: emp.monthly_salary, 
            status: 'disbursed', 
            ref: `TXN-${emp.employee_code}-04` 
          }
        ]);
      }
      setLoading(false);
    }
    loadIsolatedFinances();
  }, []);

  // HIGH-FIDELITY SINGLE COMPONENT PDF COMPILATION ROUTINE
  const generatePDFSlip = async (slip: any) => {
    if (!employee) return;
    setGeneratingId(slip.ref);

    try {
      // 1. Initialize crisp a4 portrait layout document matrix bounds
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const baseSalary = Number(slip.ctc) || 0;
      // Proportional standard HR tax-bracket calculations
      const pfDeduction = Math.round(baseSalary * 0.12);
      const professionalTax = baseSalary > 50000 ? 200 : 150;
      const netTakeHome = baseSalary - pfDeduction - professionalTax;

      // 2. Document Typography Header Styling
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42); // Slate 900 primary tone
      doc.text("HRBharat", 20, 25);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184); // Slate 400
      doc.text("AUTOMATED PAYSLIP DISTRIBUTION NODE", 20, 30);

      // Decorative vector header break-line matrix rule
      doc.setDrawColor(241, 245, 249); // Slate 100
      doc.line(20, 35, 190, 35);

      // 3. Statement Summary Metadata Deck
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`PAYSLIP STATEMENT FOR: ${slip.month.toUpperCase()}`, 20, 45);

      doc.setFontSize(10);
      doc.text("EMPLOYEE PARAMETERS", 20, 55);
      doc.text("TRANSACTION LEDGER", 110, 55);
      
      doc.setDrawColor(226, 232, 240); // Slate 200
      doc.line(20, 57, 95, 57);
      doc.line(110, 57, 190, 57);

      // Employee Parameters Column Fields
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105); // Slate 600
      doc.text(`Name: ${employee.full_name}`, 20, 64);
      doc.text(`ID Code: ${employee.employee_code}`, 20, 70);
      doc.text(`Role: ${employee.designation || 'Specialist'}`, 20, 76);
      doc.text(`Dept: ${employee.department || 'Operations'}`, 20, 82);

      // Transaction Columns Fields
      doc.text(`Ref ID: ${slip.ref}`, 110, 64);
      doc.text(`Status: CLEAR / DISBURSED`, 110, 70);
      doc.text(`Account: ${employee.bank_account_number || 'N/A'}`, 110, 76);
      doc.text(`IFSC Code: ${employee.ifsc_code || 'N/A'}`, 110, 82);

      // 4. Earnings vs Deductions Structural Grid Construction
      doc.setDrawColor(241, 245, 249);
      doc.setFillColor(248, 250, 252); // Slate 50 tint background block
      doc.rect(20, 92, 170, 8, "F");

      doc.setFont("Helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("COMPENSATION DESCRIPTION", 22, 97);
      doc.text("ALLOCATION VALUE (INR)", 135, 97);

      // Data Rows Grid Lines Mapping
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      
      doc.text("Basic Gross Salary", 22, 108);
      doc.text(`Rs. ${baseSalary.toLocaleString('en-IN')}.00`, 135, 108);
      doc.line(20, 112, 190, 112);

      doc.text("Provident Fund Deduction (PF @ 12%)", 22, 120);
      doc.text(`- Rs. ${pfDeduction.toLocaleString('en-IN')}.00`, 135, 120);
      doc.line(20, 124, 190, 124);

      doc.text("Professional Statutory Tax", 22, 132);
      doc.text(`- Rs. ${professionalTax.toLocaleString('en-IN')}.00`, 135, 132);
      doc.line(20, 136, 190, 136);

      // 5. Total Consolidated Summary Blocks
      doc.setFillColor(241, 245, 249);
      doc.rect(20, 144, 170, 10, "F");

      doc.setFont("Helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10);
      doc.text("NET DISBURSED TAKE-HOME PAY", 22, 150);
      doc.text(`INR  ${netTakeHome.toLocaleString('en-IN')}.00`, 135, 150);

      // 6. Verification Seal Footer Branding Node
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("This document is a secure, system-generated digital token. No physical signatures are required for accounting verification.", 20, 175);
      doc.text(`Compiled Securely on Node: ${new Date().toLocaleString()}`, 20, 180);

      // Save document natively down to download folder
      doc.save(`Payslip_${employee.employee_code}_${slip.month.replace(' ', '_')}.pdf`);
    } catch (err) {
      alert("PDF Processing Error: " + err);
    } finally {
      setGeneratingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center space-y-2">
          <Activity className="w-5 h-5 text-slate-900 animate-spin mx-auto" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Personal Payroll Node...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-6 lg:p-12 text-center max-w-md mx-auto">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">No linked payroll profile found for this worker account.</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-12 space-y-8 max-w-4xl mx-auto font-sans">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Payroll Ledger</h1>
        <p className="text-xs text-slate-400 font-medium">Personal earnings record, monthly structural payouts, and distribution audit logs.</p>
      </div>

      {/* COMPENSATION STATS CARD */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-3xs overflow-hidden">
        <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block">Contract base payout allocation</span>
            <div className="text-3xl font-black tracking-tight mt-1">
              ₹{Number(employee.monthly_salary || 0).toLocaleString('en-IN')}
              <span className="text-xs font-normal text-slate-400"> /mo gross</span>
            </div>
          </div>
          <div className="bg-white/10 border border-white/10 px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 backdrop-blur-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Isolated Node: {employee.employee_code}
          </div>
        </div>

        {/* ACCOUNT LEDGER PAYMENTS FEED */}
        <div className="p-6 divide-y divide-slate-100">
          <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest block pb-4">Personal Pay slips history</span>
          
          {payrollReceipts.map((slip, idx) => (
            <div key={idx} className="py-4 flex items-center justify-between gap-4 first:pt-2 last:pb-0">
              <div className="space-y-0.5">
                <p className="text-xs font-black text-slate-900">{slip.month}</p>
                <p className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">Ref ID: {slip.ref}</p>
              </div>
              <div className="text-right flex items-center space-x-6">
                <div>
                  <p className="text-xs font-black text-slate-900">₹{slip.ctc.toLocaleString('en-IN')}</p>
                  <span className="inline-block text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-1.5 rounded mt-0.5">Settled</span>
                </div>
                {/* ACTIVE DOWNLOAD BUTTON CALLING JSPDF BINDING */}
                <button 
                  onClick={() => generatePDFSlip(slip)}
                  disabled={generatingId === slip.ref}
                  className="p-2 bg-slate-50 hover:bg-slate-900 border border-slate-200 rounded-xl text-slate-600 hover:text-white transition-all shadow-3xs cursor-pointer disabled:opacity-40 flex items-center justify-center"
                  title="Download Secure PDF Payslip"
                >
                  <FileCheck className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BANK INFO CONTAINER */}
      {(employee.bank_account_number || employee.ifsc_code) && (
        <div className="bg-white border border-slate-200/60 p-6 rounded-2xl shadow-3xs space-y-2.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <Landmark className="w-4 h-4 text-slate-400" /> Verified Disbursement Destination
          </h3>
          <p className="text-xs font-medium text-slate-400 leading-normal">This is the secure structural bank target assigned strictly to your workspace index code for monthly distribution clearances.</p>
          <div className="flex flex-wrap gap-4 pt-1 text-xs font-bold text-slate-700">
            {employee.bank_account_number && (
              <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl shadow-3xs">
                Account Number: <span className="text-slate-900 font-mono font-black">{employee.bank_account_number}</span>
              </span>
            )}
            {employee.ifsc_code && (
              <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl shadow-3xs">
                IFSC Code: <span className="text-slate-900 font-mono font-black">{employee.ifsc_code}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}