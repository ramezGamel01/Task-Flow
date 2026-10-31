// Modal pieces built on the native <dialog>, which handles focus trapping and Escape:
// a confirm dialog, the toasts, the quick add window and the keyboard shortcuts list.
import { useEffect, useId, useRef } from "react";
import { CircleCheck, X } from "lucide-react";
import QuickAdd from "./QuickAdd.jsx";
import { Kbd } from "./bits.jsx";
import { useApp } from "../state/app.jsx";
import { useI18n } from "../i18n/I18n.jsx";

export function useModal(open) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal?.();
    if (!open && el.open) el.close();
  }, [open]);
  return ref;
}

export function Dialog({ open, onClose, title, children, actions, className = "" }) {
  const ref = useModal(open);
  // Several dialogs can be on a page at once, so each title gets its own id
  const titleId = useId();
  return (
    <dialog ref={ref} className={`dialog ${className}`} aria-labelledby={titleId} onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      <div className="dialog-body">
        <h2 id={titleId}>{title}</h2>
        {children}
        {actions && <div className="dialog-actions">{actions}</div>}
      </div>
    </dialog>
  );
}

export function Confirm({ open, onClose, onConfirm, title, body, confirmLabel, danger = true }) {
  const { t } = useI18n();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      actions={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t("dialog.cancel")}
          </button>
          <button
            type="button"
            className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel ?? t("dialog.delete")}
          </button>
        </>
      }
    >
      <p className="dialog-text">{body}</p>
    </Dialog>
  );
}

export function Toasts() {
  const { toasts, dismiss } = useApp();
  const { t } = useI18n();
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast">
          <CircleCheck size={18} aria-hidden="true" />
          <span className="toast-text">{toast.text}</span>
          {toast.action && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                toast.action.run();
                dismiss(toast.id);
              }}
            >
              {toast.action.label}
            </button>
          )}
          <button type="button" className="toast-close" onClick={() => dismiss(toast.id)} aria-label={t("toast.dismiss")}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function QuickAddDialog({ defaults }) {
  const { overlay, setOverlay } = useApp();
  const { t } = useI18n();
  const open = overlay === "quickadd";
  const ref = useModal(open);
  return (
    <dialog ref={ref} className="dialog dialog-qa" aria-label={t("qa.label")} onClose={() => setOverlay(null)} onClick={(e) => e.target === ref.current && setOverlay(null)}>
      {open && (
        <div className="dialog-body">
          <h2 className="dialog-kicker">{t("qa.label")}</h2>
          <QuickAdd id="quick-add-dialog" autoFocus defaults={defaults} onAdded={() => setOverlay(null)} />
        </div>
      )}
    </dialog>
  );
}

export function ShortcutsDialog() {
  const { overlay, setOverlay } = useApp();
  const { t } = useI18n();
  const rows = [
    [["N"], t("keys.new")],
    [["Ctrl", "K"], t("keys.palette")],
    [["G", "T · B · L · C · I"], t("keys.goto"), true],
    [["Alt", "← → ↑ ↓"], t("keys.move")],
    [["?"], t("keys.help")],
    [["Esc"], t("keys.close")],
  ];
  return (
    <Dialog
      open={overlay === "shortcuts"}
      onClose={() => setOverlay(null)}
      title={t("keys.title")}
      className="dialog-keys"
      actions={
        <button type="button" className="btn btn-ghost" onClick={() => setOverlay(null)}>
          {t("drawer.close")}
        </button>
      }
    >
      <dl className="keys">
        {rows.map(([keys, label, sequence]) => (
          <div key={label}>
            <dt>
              {keys.map((k, i) => (
                <span key={k}>
                  {i > 0 && <span className="keys-join">{sequence ? t("keys.then") : "+"}</span>}
                  <Kbd>{k}</Kbd>
                </span>
              ))}
            </dt>
            <dd>{label}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  );
}
