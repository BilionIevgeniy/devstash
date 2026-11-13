import { Component, type ReactNode } from "react";

// What Next's own boundary does with a redirect: the error leaves the
// component, and the test sees that it was caught. React offers error
// boundaries only as classes. A dom test that expects a thrown error also
// silences console.error, where React reports it.
export class CatchBoundary extends Component<
  { children: ReactNode },
  { caught: string | null }
> {
  state: { caught: string | null } = { caught: null };

  static getDerivedStateFromError(error: Error) {
    return { caught: error.message };
  }

  render() {
    return this.state.caught ? (
      <p>Caught: {this.state.caught}</p>
    ) : (
      this.props.children
    );
  }
}
