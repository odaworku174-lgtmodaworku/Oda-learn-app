import React from 'react';
import { Download, Monitor, PlusSquare, Share, Smartphone, X } from 'lucide-react';
import type { DevicePlatform } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: DevicePlatform;
  canPromptNative: boolean;
  onTriggerNative: () => Promise<boolean>;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  platform,
  canPromptNative,
  onTriggerNative,
}) => {
  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    const accepted = await onTriggerNative();
    if (accepted) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src="/pwa-192x192.png"
              alt="Oda Learn app icon"
              referrerPolicy="no-referrer"
              className="h-14 w-14 rounded-2xl border border-slate-200 object-cover shadow-sm shrink-0"
            />
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Add Oda Learn to Home Screen
              </h2>
              <p className="text-xs text-slate-500">
                Launch directly as a full-screen study app
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close install instructions"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {canPromptNative ? (
          <div className="mt-5 space-y-4">
            <p className="text-sm leading-relaxed text-slate-600">
              Install Oda Learn onto your device for instant home-screen launch, distraction-free video lessons, and offline curriculum access.
            </p>
            <button
              type="button"
              onClick={handleNativeInstall}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800 transition-colors min-h-[44px]"
            >
              <Download className="h-4 w-4" />
              Install Oda Learn App
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {platform === 'ios' && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Smartphone className="h-4 w-4 text-teal-700" />
                  <span>iPhone &amp; iPad (Safari)</span>
                </div>
                <ol className="space-y-2.5 text-sm text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono text-xs font-semibold text-teal-700 mt-0.5">01</span>
                    <span>
                      Tap the <Share className="inline h-4 w-4 text-slate-700 mx-0.5" /> <strong>Share</strong> icon in Safari&apos;s toolbar.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono text-xs font-semibold text-teal-700 mt-0.5">02</span>
                    <span>
                      Scroll down and tap <PlusSquare className="inline h-4 w-4 text-slate-700 mx-0.5" /> <strong>Add to Home Screen</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono text-xs font-semibold text-teal-700 mt-0.5">03</span>
                    <span>
                      Tap <strong>Add</strong> in the top-right corner to place the Oda Learn icon on your home screen.
                    </span>
                  </li>
                </ol>
              </div>
            )}

            {platform === 'android' && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Smartphone className="h-4 w-4 text-teal-700" />
                  <span>Android (Chrome / Edge)</span>
                </div>
                <ol className="space-y-2.5 text-sm text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono text-xs font-semibold text-teal-700 mt-0.5">01</span>
                    <span>Tap the browser menu button (<strong>⋮</strong>) at the top-right.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono text-xs font-semibold text-teal-700 mt-0.5">02</span>
                    <span>Select <strong>Install app</strong> or <strong>Add to Home screen</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono text-xs font-semibold text-teal-700 mt-0.5">03</span>
                    <span>Confirm to add the Oda Learn app icon to your launcher.</span>
                  </li>
                </ol>
              </div>
            )}

            {platform === 'desktop' && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Monitor className="h-4 w-4 text-teal-700" />
                  <span>Desktop Browser (Chrome / Edge)</span>
                </div>
                <ol className="space-y-2.5 text-sm text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono text-xs font-semibold text-teal-700 mt-0.5">01</span>
                    <span>Open this site in its own browser tab if viewing inside an embedded frame.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono text-xs font-semibold text-teal-700 mt-0.5">02</span>
                    <span>Click the <strong>Install Oda Learn</strong> icon on the right side of the address bar, or open the browser menu and select <strong>Save and share → Install page as app</strong>.</span>
                  </li>
                </ol>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors min-h-[44px]"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
