"use client";

import { Component, ReactNode } from "react";

/** Catches runtime render errors and shows a readable message instead of a blank crash. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(err: any) {
    return { error: String(err?.message ?? err) };
  }
  componentDidCatch(err: any) {
    console.error("ETF app error:", err);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="py-20 text-center">
          <p className="text-sm text-zinc-500">Something went wrong loading the data.</p>
          <p className="mt-2 text-xs text-zinc-400">{this.state.error}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
