import { Loader2, ShieldCheck } from 'lucide-react';

/** Shown while PLOS AuthenticationFlow (OTP / reCAPTCHA) runs via SweetAlert. */
export default function PlosAuthPanel({ status = 'idle' }) {
  if (status !== 'running') return null;

  return (
    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">
            Additional verification required
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-400 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Complete the verification prompts to continue.
          </p>
        </div>
      </div>
    </div>
  );
}
