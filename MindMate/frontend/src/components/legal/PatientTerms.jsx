import React from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../config/routes";

const PatientTerms = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-white text-gray-900">
      <header className="bg-white/80 backdrop-blur border-b border-indigo-100">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-semibold text-indigo-600">
            MindMate Patient Terms &amp; Conditions
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Effective as of November 13, 2025
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        <section>
          <h2 className="text-xl font-semibold text-gray-800">1. Overview</h2>
          <p className="mt-3 text-gray-700 leading-relaxed">
            MindMate provides digital mental health tools, assessments, and access to
            licensed specialists. These patient terms govern your use of the platform
            and outline how we protect your wellbeing, privacy, and data. By creating a
            patient account you agree to these terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800">
            2. Eligibility &amp; Account Responsibilities
          </h2>
          <ul className="mt-3 space-y-2 text-gray-700 leading-relaxed list-disc list-inside">
            <li>You must be at least 18 years old or have guardian consent.</li>
            <li>
              Maintain accurate personal information and update it if it changes.
            </li>
            <li>
              Keep your login credentials secure and notify us immediately of any
              security concerns.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800">
            3. Care &amp; Content Disclaimer
          </h2>
          <p className="mt-3 text-gray-700 leading-relaxed">
            MindMate offers educational tools and facilitates access to certified
            mental health professionals. Unless specifically stated, content in the
            application is not a substitute for personalized medical advice. Always
            consult a qualified professional if you are in crisis or require urgent care.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800">
            4. Data &amp; Privacy
          </h2>
          <p className="mt-3 text-gray-700 leading-relaxed">
            We process your information in accordance with our Privacy Policy. By using
            MindMate you consent to our data practices, including the secure storage and
            sharing of information with your selected specialists. You may request data
            deletion by contacting support@mindmate.com.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800">
            5. Booking &amp; Payments
          </h2>
          <p className="mt-3 text-gray-700 leading-relaxed">
            When scheduling appointments you agree to honor the specialist’s cancellation
            policy, pay applicable fees, and provide accurate payment details. Repeated
            no-shows may lead to account review or suspension.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800">
            6. Acceptable Use
          </h2>
          <ul className="mt-3 space-y-2 text-gray-700 leading-relaxed list-disc list-inside">
            <li>Use the platform respectfully and refrain from offensive or harmful behaviour.</li>
            <li>
              Do not misuse the community features for spam, harassment, or misinformation.
            </li>
            <li>
              Report safety concerns or breaches to our support team immediately.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800">
            7. Termination
          </h2>
          <p className="mt-3 text-gray-700 leading-relaxed">
            You may close your account at any time. MindMate reserves the right to suspend
            or terminate accounts that violate these terms or pose safety risks to our
            community.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-800">8. Contact</h2>
          <p className="mt-3 text-gray-700 leading-relaxed">
            For questions about these terms please contact{" "}
            <a
              href="mailto:legal@mindmate.com"
              className="text-indigo-600 font-medium underline hover:text-indigo-500"
            >
              legal@mindmate.com
            </a>
            .
          </p>
        </section>

        <div className="pt-6 border-t border-indigo-100 flex justify-between text-sm text-gray-600">
          <Link to={ROUTES.SIGNUP} className="text-indigo-600 hover:text-indigo-500 font-medium">
            Return to Sign Up
          </Link>
          <span>Document version: 1.0</span>
        </div>
      </main>
    </div>
  );
};

export default PatientTerms;


