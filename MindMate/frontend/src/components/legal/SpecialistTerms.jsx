import React from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../config/routes";

const SpecialistTerms = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100">
      <header className="bg-slate-900/80 backdrop-blur border-b border-slate-700">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-semibold text-indigo-300">
            MindMate Specialist Terms &amp; Conditions
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Effective as of November 13, 2025
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        <section>
          <h2 className="text-xl font-semibold text-slate-100">1. Professional Overview</h2>
          <p className="mt-3 text-slate-300 leading-relaxed">
            MindMate connects licensed professionals with patients seeking mental health
            support. These specialist terms outline your obligations when practicing
            through our platform, including compliance, documentation, and conduct
            standards.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-100">
            2. Credentialing &amp; Compliance
          </h2>
          <ul className="mt-3 space-y-2 text-slate-300 leading-relaxed list-disc list-inside">
            <li>Maintain accurate licensure, malpractice coverage, and identification.</li>
            <li>Provide documentation promptly when requested during audits.</li>
            <li>Comply with regional regulations, telehealth guidelines, and MindMate policies.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-100">
            3. Clinical Responsibilities
          </h2>
          <p className="mt-3 text-slate-300 leading-relaxed">
            You are accountable for the standard of care you deliver. Maintain thorough
            clinical records, follow evidence-based practices, and escalate crisis cases to
            emergency services when required. MindMate provides digital tools but does not
            replace clinical judgment.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-100">4. Appointment Management</h2>
          <p className="mt-3 text-slate-300 leading-relaxed">
            Set accurate availability, honour scheduled appointments, and communicate
            changes promptly. Repeated cancellations or no-shows may impact your status on
            the platform. MindMate reserves the right to reassign patients when required.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-100">5. Payments &amp; Fees</h2>
          <p className="mt-3 text-slate-300 leading-relaxed">
            Fees are disbursed according to your agreement with MindMate. Ensure payment
            details remain current. You are responsible for applicable taxes and must issue
            receipts when requested by patients.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-100">6. Confidentiality &amp; Data</h2>
          <p className="mt-3 text-slate-300 leading-relaxed">
            Protect patient privacy at all times. Use the secure MindMate workspace for
            communications and records, and follow HIPAA/GDPR-equivalent safeguards. Report
            privacy incidents to{" "}
            <a
              href="mailto:security@mindmate.com"
              className="text-indigo-300 font-medium underline hover:text-indigo-200"
            >
              security@mindmate.com
            </a>{" "}
            within 24 hours.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-100">7. Community Standards</h2>
          <ul className="mt-3 space-y-2 text-slate-300 leading-relaxed list-disc list-inside">
            <li>Treat all patients and colleagues with respect and cultural sensitivity.</li>
            <li>Do not solicit patients outside of MindMate without written consent.</li>
            <li>Avoid conflicts of interest and disclose relationships that may influence care.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-100">8. Suspension &amp; Termination</h2>
          <p className="mt-3 text-slate-300 leading-relaxed">
            MindMate may suspend or deactivate specialist accounts that breach these terms,
            endanger patient safety, or fail to meet professional standards. You may
            voluntarily deactivate your account with thirty (30) days notice.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-100">9. Contact</h2>
          <p className="mt-3 text-slate-300 leading-relaxed">
            For contract or compliance questions please contact{" "}
            <a
              href="mailto:partners@mindmate.com"
              className="text-indigo-300 font-medium underline hover:text-indigo-200"
            >
              partners@mindmate.com
            </a>
            .
          </p>
        </section>

        <div className="pt-6 border-t border-slate-700 flex justify-between text-sm text-slate-400">
          <Link to={ROUTES.SIGNUP} className="text-indigo-300 hover:text-indigo-200 font-medium">
            Return to Sign Up
          </Link>
          <span>Document version: 1.0</span>
        </div>
      </main>
    </div>
  );
};

export default SpecialistTerms;


