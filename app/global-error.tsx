'use client';

import React from 'react';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-[#FAF8F4] p-6 text-[#1C242B]">
        <div className="max-w-md space-y-4 rounded-2xl border border-[#E5DFD3] bg-white p-8 text-center">
          <h1 className="text-xl font-bold">YojanaMitra encountered an unexpected error</h1>
          <p className="text-sm text-[#4A5560]">
            Please reload the page to continue. No personal data is stored on our servers.
          </p>
          <button
            type="button"
            onClick={reset}
            className="min-h-[48px] cursor-pointer rounded-xl bg-[#0F6B6E] px-5 py-2.5 text-sm font-semibold text-white"
          >
            Reload App
          </button>
        </div>
      </body>
    </html>
  );
}
