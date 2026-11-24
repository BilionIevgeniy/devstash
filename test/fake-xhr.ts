import { vi } from "vitest";

// An XMLHttpRequest a test drives by hand: it records what was sent, and the
// test lets the progress and the answer through. After an abort nothing
// arrives any more, as in the browser.
export class FakeXhr {
  static requests: FakeXhr[] = [];

  static last(): FakeXhr {
    const request = FakeXhr.requests.at(-1);
    if (!request) throw new Error("No request was started");
    return request;
  }

  upload: { onprogress: ((event: object) => void) | null } = {
    onprogress: null,
  };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  timeout = 0;
  status = 0;
  method = "";
  url = "";
  headers: Record<string, string> = {};
  body: unknown = null;
  aborted = false;

  constructor() {
    FakeXhr.requests.push(this);
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }

  send(body: unknown) {
    this.body = body;
  }

  abort() {
    this.aborted = true;
  }

  progress(loaded: number, total: number, lengthComputable = true) {
    this.upload.onprogress?.({ loaded, total, lengthComputable });
  }

  answer(status: number) {
    if (this.aborted) return;
    this.status = status;
    this.onload?.();
  }

  expire() {
    if (!this.aborted) this.ontimeout?.();
  }

  fail() {
    if (!this.aborted) this.onerror?.();
  }
}

/** Replaces the browser's XMLHttpRequest; call it in `beforeEach`. */
export function installFakeXhr(): void {
  FakeXhr.requests = [];
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
}
