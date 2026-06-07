"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FileCheck, ShieldCheck, Landmark, Activity, Download } from 'lucide-react';
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
        .from('employees').select('*').eq('email', user.email?.toLowerCase().trim()).single();
      if (emp) {
        setEmployee(emp);
        setPayrollReceipts([
          { month: 'May 2026', ctc: emp.monthly_salary, status: 'disbursed', ref: `TXN-${emp.employee_code}-05` },
          { month: 'April 2026', ctc: emp.monthly_salary, status: 'disbursed', ref: `TXN-${emp.employee_code}-04` },
        ]);
      }
      setLoading(false);
    }
    loadIsolatedFinances();
  }, []);

  const generatePDFSlip = async (slip: any) => {
    if (!employee) return;
    setGeneratingId(slip.ref);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const baseSalary = Number(slip.ctc) || 0;
      const pfDeduction = Math.round(baseSalary * 0.12);
      const professionalTax = baseSalary > 50000 ? 200 : 150;
      const netTakeHome = baseSalary - pfDeduction - professionalTax;

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(55, 53, 47);
      doc.text("HRBharat", 20, 25);
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(155, 154, 151);
      doc.text("Payslip", 20, 30);
      doc.setDrawColor(233, 233, 231);
      doc.line(20, 35, 190, 35);

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(55, 53, 47);
      doc.text(`Payslip for ${slip.month}`, 20, 45);

      doc.setFontSize(10);
      doc.text("Employee", 20, 55);
      doc.text("Transaction", 110, 55);
      doc.setDrawColor(233, 233, 231);
      doc.line(20, 57, 95, 57);
      doc.line(110, 57, 190, 57);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(120, 119, 116);
      doc.text(`Name: ${employee.full_name}`, 20, 64);
      doc.text(`ID: ${employee.employee_code}`, 20, 70);
      doc.text(`Role: ${employee.designation || 'Specialist'}`, 20, 76);
      doc.text(`Dept: ${employee.department || 'Operations'}`, 20, 82);
      doc.text(`Ref: ${slip.ref}`, 110, 64);
      doc.text(`Status: Disbursed`, 110, 70);
      doc.text(`Account: ${employee.bank_account_number || 'N/A'}`, 110, 76);
      doc.text(`IFSC: ${employee.ifsc_code || 'N/A'}`, 110, 82);

      doc.setFillColor(247, 246, 243);
      doc.rect(20, 92, 170, 8, "F");
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(55, 53, 47);
      doc.text("Description", 22, 97);
      doc.text("Amount (INR)", 145, 97);

      doc.setFont("Helvetica", "normal");
      doc.setTextColor(120, 119, 116);
      doc.text("Basic Gross Salary", 22, 108);
      doc.text(`Rs. ${baseSalary.toLocaleString('en-IN')}.00`, 145, 108);
      doc.setDrawColor(233, 233, 231);
      doc.line(20, 112, 190, 112);
      doc.text("Provident Fund (12%)", 22, 120);
      doc.text(`- Rs. ${pfDeduction.toLocaleString('en-IN')}.00`, 145, 120);
      doc.line(20, 124, 190, 124);
      doc.text("Professional Tax", 22, 132);
      doc.text(`- Rs. ${professionalTax.toLocaleString('en-IN')}.00`, 145, 132);
      doc.line(20, 136, 190, 136);

      doc.setFillColor(233, 233, 231);
      doc.rect(20, 144, 170, 10, "F");
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(55, 53, 47);
      doc.setFontSize(10);
      doc.text("Net Take-Home", 22, 150);
      doc.text(`INR ${netTakeHome.toLocaleString('en-IN')}.00`, 145, 150);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(155, 154, 151);
      doc.text("System-generated document. No physical signature required.", 20, 175);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 180);

      doc.save(`Payslip_${employee.employee_code}_${slip.month.replace(' ', '_')}.pdf`);
    } catch (err) {
      alert("PDF error: " + err);
    } finally {
      setGeneratingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-[#9b9a97]">Loading…</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-[#9b9a97]">No payroll profile found.</p>
      </div>
    );
  }

  const baseSalary = Number(employee.monthly_salary || 0);
  const pfDeduction = Math.round(baseSalary * 0.12);
  const professionalTax = baseSalary > 50000 ? 200 : 150;
  const netTakeHome = baseSalary - pfDeduction - professionalTax;

  return (
    <div className="min-h-screen bg-white font-sans text-[#37352f]">

      {/* TOP BAR */}
      <header className="border-b border-[#e9e9e7] sticky top-0 z-40 bg-white">
        <div className="max-w-4xl mx-auto px-8 h-12 flex items-center gap-1.5 text-sm">
          <div className="w-5 h-5 rounded bg-[#37352f] flex items-center justify-center shrink-0">
            <span className="text-white text-[8px] font-bold">HB</span>
          </div>
          <span className="text-[#c1c0bb]">/</span>
          <span className="font-medium text-[#37352f]">Payroll</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-10 space-y-10">

        {/* PAGE TITLE */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payroll</h1>
          <p className="mt-1 text-sm text-[#9b9a97]">
            {employee.full_name} · {employee.employee_code}
          </p>
        </div>

        <hr className="border-[#e9e9e7]" />

        {/* SALARY CALLOUTS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#e9e9e7] rounded-lg overflow-hidden border border-[#e9e9e7]">
          {[
            { label: 'Gross Salary', value: `₹${baseSalary.toLocaleString('en-IN')}`, sub: 'per month' },
            { label: 'PF Deduction', value: `₹${pfDeduction.toLocaleString('en-IN')}`, sub: '12% of gross' },
            { label: 'Professional Tax', value: `₹${professionalTax.toLocaleString('en-IN')}`, sub: 'per month' },
            { label: 'Net Take-Home', value: `₹${netTakeHome.toLocaleString('en-IN')}`, sub: 'after deductions' },
          ].map((stat, i) => (
            <div key={i} className="bg-white px-5 py-4">
              <p className="text-xs text-[#9b9a97] mb-1">{stat.label}</p>
              <p className="text-lg font-semibold text-[#37352f]">{stat.value}</p>
              <p className="text-xs text-[#c1c0bb] mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>

        <hr className="border-[#e9e9e7]" />

        {/* PAYSLIPS */}
        <div>
          <p className="text-xs font-semibold text-[#9b9a97] uppercase tracking-widest flex items-center gap-2 mb-4">
            <FileCheck className="w-3.5 h-3.5" /> Pay Slips
          </p>

          <div className="divide-y divide-[#e9e9e7]">
            {payrollReceipts.map((slip, idx) => (
              <div key={idx} className="py-3.5 flex items-center justify-between gap-4 hover:bg-[#f7f6f3] px-2 -mx-2 rounded-md transition-colors">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-[#37352f]">{slip.month}</p>
                  <p className="text-xs text-[#9b9a97] font-mono">{slip.ref}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm font-medium text-[#37352f]">₹{Number(slip.ctc).toLocaleString('en-IN')}</p>
                    <span className="text-[10px] font-medium text-[#0f7b43] bg-[#edfbf3] border border-[#b7ebcf] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <ShieldCheck className="w-2.5 h-2.5" /> Settled
                    </span>
                  </div>
                  <button
                    onClick={() => generatePDFSlip(slip)}
                    disabled={generatingId === slip.ref}
                    className="flex items-center gap-1.5 text-xs font-medium text-[#787774] hover:text-[#37352f] hover:bg-[#f7f6f3] border border-[#e9e9e7] px-3 py-1.5 rounded-md transition-all cursor-pointer disabled:opacity-40"
                    title="Download payslip PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {generatingId === slip.ref ? 'Generating…' : 'Download'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BANK DETAILS */}
        {(employee.bank_account_number || employee.ifsc_code) && (
          <>
            <hr className="border-[#e9e9e7]" />
            <div>
              <p className="text-xs font-semibold text-[#9b9a97] uppercase tracking-widest flex items-center gap-2 mb-4">
                <Landmark className="w-3.5 h-3.5" /> Bank Details
              </p>
              <div className="flex flex-wrap gap-3">
                {employee.bank_account_number && (
                  <div className="bg-[#f7f6f3] border border-[#e9e9e7] rounded-md px-4 py-3">
                    <p className="text-xs text-[#9b9a97] mb-0.5">Account Number</p>
                    <p className="text-sm font-mono font-medium text-[#37352f]">{employee.bank_account_number}</p>
                  </div>
                )}
                {employee.ifsc_code && (
                  <div className="bg-[#f7f6f3] border border-[#e9e9e7] rounded-md px-4 py-3">
                    <p className="text-xs text-[#9b9a97] mb-0.5">IFSC Code</p>
                    <p className="text-sm font-mono font-medium text-[#37352f]">{employee.ifsc_code}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

      </main>
    </div>
  );
}