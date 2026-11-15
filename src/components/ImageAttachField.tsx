import { forwardRef } from "react";

export type ImageAttachFieldProps = {
  id: string;
  buttonLabel: string;
  hint?: string;
  hintId?: string;
  multiple?: boolean;
  disabled?: boolean;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
};

const btnClass =
  "inline-flex min-h-10 w-fit cursor-pointer items-center justify-center rounded-md border-2 border-[var(--accent)] px-4 py-2 text-center text-sm font-semibold text-[var(--accent)] no-underline transition-colors hover:border-[var(--accent-hover)] hover:bg-[var(--surface-hover)] hover:text-[var(--accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]";

export const ImageAttachField = forwardRef<
  HTMLInputElement,
  ImageAttachFieldProps
>(function ImageAttachField(
  {
    id,
    buttonLabel,
    hint,
    hintId,
    multiple,
    disabled,
    onChange,
  },
  ref,
) {
  return (
    <div className="flex flex-col gap-2">
      <input
        ref={ref}
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={onChange}
        aria-describedby={hintId}
      />
      <label htmlFor={id} className={btnClass}>
        {buttonLabel}
      </label>
      {hint ? (
        <p id={hintId} className="text-xs text-[var(--muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
