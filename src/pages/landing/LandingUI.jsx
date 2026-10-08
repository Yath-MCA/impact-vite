import { useEffect } from 'react';
import { FiFileText } from 'react-icons/fi';
import { fireMaintenanceAlert, initMaintenance } from '../../shared/maintenanceGuard.js';

export default function LandingUI({ docData }) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initMaintenance({ init: true });
        if (!cancelled) fireMaintenanceAlert();
      } catch {
        // never block landing
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const title = docData?.title || 'Your document';
  const client = docData?.client || docData?.clientname || '';

  return (
    <div
      className="tw:min-h-screen tw:bg-gradient-to-br tw:from-slate-50 tw:via-white tw:to-orange-50 tw:px-4 tw:py-10"
      data-testid="landing-shell"
    >
      <div className="tw:mx-auto tw:w-full tw:max-w-2xl">
        <header className="tw:mb-8 tw:text-center">
          <div className="tw:mx-auto tw:mb-4 tw:flex tw:h-14 tw:w-14 tw:items-center tw:justify-center tw:rounded-2xl tw:bg-primary">
            <FiFileText className="tw:h-7 tw:w-7 tw:text-white" aria-hidden />
          </div>
          <h1 className="tw:text-2xl tw:font-bold tw:tracking-tight tw:text-slate-900">
            {title}
          </h1>
          {client ? (
            <p className="tw:mt-2 tw:text-slate-600">{client}</p>
          ) : (
            <p className="tw:mt-2 tw:text-slate-600">
              Access verified. Full client branding arrives in a later phase.
            </p>
          )}
        </header>
        <div className="tw:rounded-2xl tw:border tw:border-slate-200 tw:bg-white tw:p-6 tw:shadow-sm">
          <p className="tw:mb-4 tw:text-sm tw:text-slate-600">
            You can continue once session and branding hooks are enabled.
          </p>
          <button
            type="button"
            disabled
            className="tw:inline-flex tw:w-full tw:items-center tw:justify-center tw:rounded-md tw:bg-primary tw:px-5 tw:py-2.5 tw:font-semibold tw:text-white tw:opacity-70 tw:cursor-not-allowed"
          >
            Continue (soon)
          </button>
        </div>
      </div>
    </div>
  );
}
