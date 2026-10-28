import { BrandLogo } from "@/components/brand-logo";
import { storedSystemText } from "@/lib/system-pages-i18n";
import {
  Component,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from 'react';

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  /** Changing this clears a caught error. Pass the route to recover on navigation. */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
}

function DefaultFallback({ error, resetError }: ErrorFallbackProps) {
  const { text, rtl } = storedSystemText();
  return (
    <div className="cv-page min-h-screen w-full flex items-center justify-center p-6" dir={rtl ? "rtl" : "ltr"} data-testid="error-fallback">
      <div className="max-w-lg w-full text-center rounded-3xl bg-white p-8 shadow-[0_18px_44px_-18px_rgba(10,31,77,0.25)] ring-1 ring-slate-200/70">
        <BrandLogo variant="logo-sin-lema" alt="Clinivista" className="mx-auto mb-5 h-8" />
        <h1 className="text-xl font-bold text-[#0A1F4D]">{text.errorTitle}</h1>
        <p className="mt-2 text-sm text-[#4A5F82]">{text.errorDesc}</p>
        {/* Dev only: messages can carry API responses and other internals. */}
        {import.meta.env.DEV ? (
          <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-100 p-3 text-left text-xs text-slate-800" dir="ltr">
            {error.message || String(error)}
          </pre>
        ) : null}
        <button
          type="button"
          onClick={resetError}
          className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#0B63E5] px-6 text-sm font-semibold text-white hover:bg-[#0A55C4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B63E5]"
        >
          {text.retry}
        </button>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: toError(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error(
      'ErrorBoundary caught an error:',
      toError(error),
      info.componentStack,
    );
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (
      this.state.error !== null &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.resetError();
    }
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error === null) {
      return this.props.children;
    }
    const Fallback = this.props.FallbackComponent ?? DefaultFallback;
    return <Fallback error={error} resetError={this.resetError} />;
  }
}
